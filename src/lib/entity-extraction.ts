/**
 * Chat -> Graph entity extraction.
 *
 * The killer feature of Abster: when the user asks the LLM a question about
 * their investigation, the LLM also returns a structured entity list that we
 * auto-insert into the D3 graph — no manual node creation required.
 *
 * Strategy:
 * 1. Wrap every user message with a system instruction asking for a trailing
 *    ```abster-entities
 *    {entities:[...], relations:[...]}
 *    ``` block at the end of the response.
 * 2. After streaming completes, parse the trailing block (if present) and
 *    insert entities + relations into the active case via the store.
 *
 * Failure modes:
 * - LLM ignores the instruction -> we silently skip (chat still works as text).
 * - LLM produces malformed JSON -> we silently skip and log a warning.
 * - Duplicate entities (same name+type) -> we dedupe by checking the active case.
 */

import type { Entity, Relation, EntityType } from "../store/absterStore";
import { generateId } from "./utils";

const ENTITY_TYPES: EntityType[] = [
  "PERSON", "ORGANIZATION", "LOCATION", "EVENT", "DOCUMENT",
  "DEVICE", "EMAIL", "PHONE", "DOMAIN", "VEHICLE", "CRYPTO", "GENERIC",
];

export interface ExtractedGraph {
  entities: Array<{ type: string; name: string; description?: string; confidence?: number; source?: string }>;
  relations: Array<{ source: string; target: string; type: string; label?: string }>;
}

export const EXTRACTION_SYSTEM_PROMPT = `You are Abster AI, an OSINT analyst assistant embedded in a graph-native investigation workspace.

When the user asks you about an investigation target (a person, email, domain, IP, organization, or event), do TWO things in your reply:

1. Provide your normal analyst response — concise, professional, evidence-aware.
2. At the very end of your reply, append a fenced code block tagged \`abster-entities\` containing a strict JSON object with the entities and relations you extracted from the conversation. The block MUST follow this exact shape:

\`\`\`abster-entities
{
  "entities": [
    {"type": "EMAIL", "name": "user@example.com", "description": "Primary contact email for the target", "confidence": 0.92, "source": "User input"}
  ],
  "relations": [
    {"source": "user@example.com", "target": "example.com", "type": "BELONGS_TO", "label": "domain"}
  ]
}
\`\`\`

Rules:
- Entity types MUST be one of: ${ENTITY_TYPES.join(", ")}.
- Use the EXACT name strings (case-sensitive) from the conversation so relations can match.
- Confidence is a float 0..1. Use 0.5 if unsure.
- Only include entities you actually have evidence for. Do not invent.
- If you have no entities to report, still emit an empty \`{"entities":[],"relations":[]}\` block.
- Do not put any text after the \`abster-entities\` block.`;

const FENCE_OPEN = "```abster-entities";
const FENCE_CLOSE = "```";

export interface ExtractionResult {
  /** The chat-visible text with the entities block stripped out. */
  cleanedText: string;
  /** The parsed graph payload, or null if no block was found. */
  graph: ExtractedGraph | null;
  /** True if a block was present but unparseable. */
  malformed: boolean;
}

export function extractGraphFromResponse(raw: string): ExtractionResult {
  const startIdx = raw.lastIndexOf(FENCE_OPEN);
  if (startIdx === -1) {
    return { cleanedText: raw, graph: null, malformed: false };
  }
  const closeIdx = raw.indexOf(FENCE_CLOSE, startIdx + FENCE_OPEN.length);
  if (closeIdx === -1) {
    // Block was opened but never closed — strip the dangling opener and bail.
    return { cleanedText: raw.slice(0, startIdx).trimEnd(), graph: null, malformed: true };
  }
  const jsonText = raw.slice(startIdx + FENCE_OPEN.length, closeIdx).trim();
  const cleanedText = (raw.slice(0, startIdx) + raw.slice(closeIdx + FENCE_CLOSE.length)).trimEnd();
  try {
    const parsed = JSON.parse(jsonText) as ExtractedGraph;
    if (!parsed || !Array.isArray(parsed.entities) || !Array.isArray(parsed.relations)) {
      return { cleanedText, graph: null, malformed: true };
    }
    // Normalize: drop entities with no name, cap relations to ones whose endpoints exist.
    const entities = parsed.entities
      .filter(e => e && typeof e.name === "string" && e.name.trim().length > 0)
      .map(e => ({
        type: (typeof e.type === "string" && ENTITY_TYPES.includes(e.type.toUpperCase() as EntityType))
          ? e.type.toUpperCase() as EntityType
          : "GENERIC",
        name: e.name.trim(),
        description: typeof e.description === "string" ? e.description : undefined,
        confidence: typeof e.confidence === "number" ? Math.max(0, Math.min(1, e.confidence)) : 0.5,
        source: typeof e.source === "string" ? e.source : "LLM extraction",
      }));
    const names = new Set(entities.map(e => e.name));
    const relations = parsed.relations
      .filter(r => r && typeof r.source === "string" && typeof r.target === "string" && typeof r.type === "string")
      .filter(r => names.has(r.source) && names.has(r.target))
      .map(r => ({
        source: r.source,
        target: r.target,
        type: r.type.trim().toUpperCase().replace(/\s+/g, "_"),
        label: typeof r.label === "string" ? r.label : undefined,
      }));
    return { cleanedText, graph: { entities, relations }, malformed: false };
  } catch {
    return { cleanedText, graph: null, malformed: true };
  }
}

/** Insert extracted graph into the active case via the store. Dedupes by name+type. */
export async function mergeGraphIntoActiveCase(
  graph: ExtractedGraph,
  ctx: {
    caseId: string;
    ownerId: string;
    existingEntities: Entity[];
    addEntity: (e: Entity) => Promise<void>;
    addRelation: (r: Relation) => Promise<void>;
  },
): Promise<{ addedEntities: number; addedRelations: number }> {
  if (!graph.entities.length) return { addedEntities: 0, addedRelations: 0 };

  // Map name -> entity id (existing + new) so we can resolve relations.
  const nameToId = new Map<string, string>();
  for (const e of ctx.existingEntities) {
    nameToId.set(e.name, e.id);
  }

  let addedEntities = 0;
  for (const ext of graph.entities) {
    if (nameToId.has(ext.name)) continue;
    const id = `e-${generateId()}`;
    const newEntity: Entity = {
      id,
      caseId: ctx.caseId,
      type: ext.type,
      name: ext.name,
      description: ext.description,
      confidence: ext.confidence,
      source: ext.source,
      isVerified: false,
      ownerId: ctx.ownerId,
    };
    nameToId.set(ext.name, id);
    try {
      await ctx.addEntity(newEntity);
      addedEntities++;
    } catch (err) {
      console.error("Failed to add extracted entity", err);
    }
  }

  let addedRelations = 0;
  for (const rel of graph.relations) {
    const sourceId = nameToId.get(rel.source);
    const targetId = nameToId.get(rel.target);
    if (!sourceId || !targetId) continue;
    const newRel: Relation = {
      id: `r-${generateId()}`,
      caseId: ctx.caseId,
      source: sourceId,
      target: targetId,
      type: rel.type,
      label: rel.label,
      ownerId: ctx.ownerId,
    };
    try {
      await ctx.addRelation(newRel);
      addedRelations++;
    } catch (err) {
      console.error("Failed to add extracted relation", err);
    }
  }

  return { addedEntities, addedRelations };
}
