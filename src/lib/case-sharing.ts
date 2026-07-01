/**
 * Shareable case URLs — local-first alternative to backend sync.
 *
 * Compresses a case (metadata + entities + relations + chat messages) into a
 * URL-safe string using LZ-string, then packs it into the hash fragment of a
 * `/case/share#<data>` URL. The receiver's browser decompresses and seeds the
 * case as read-only into their IndexedDB.
 *
 * Why URL hash (not query string)?
 *   - Hash fragments are never sent to the server, so the case data stays
 *     client-side only. This preserves the local-first security model: even
 *     if Vercel's logs captured URLs, they would not see the case data.
 *
 * Why LZ-string?
 *   - It's the smallest pure-JS compressor that runs in the browser without
 *     WebAssembly. A typical 50-entity case compresses to ~3-8 KB which fits
 *     comfortably under the practical URL length limit (~32 KB in modern
 *     browsers, ~8 KB safe across all).
 */

import LZString from "lz-string";
import type { Case, Entity, Relation, Chat, ChatMessage } from "../store/absterStore";

export interface ShareableCasePayload {
  v: 1; // schema version for forward compatibility
  case: Case;
  entities: Entity[];
  relations: Relation[];
  chats: Chat[];
}

/**
 * Serialize + compress a case into a URL-safe string.
 * Returns null if the case is empty or compression fails.
 */
export function encodeCaseForSharing(
  caseData: Case,
  entities: Entity[],
  relations: Relation[],
  chats: Chat[],
): string | null {
  try {
    // Strip vault file Blobs from chat messages (they can't be serialized anyway).
    const safeChats: Chat[] = chats.map(c => ({
      ...c,
      messages: (c.messages || []).map((m: ChatMessage) => ({
        ...m,
        attachments: (m.attachments || []).map(a => ({
          id: a.id, name: a.name, type: a.type, size: a.size,
          // Omit url (it's a blob URL that won't survive a page reload)
        })),
      })),
    }));

    const payload: ShareableCasePayload = {
      v: 1,
      case: { ...caseData, activityLog: caseData.activityLog || [] },
      entities: entities.filter(e => e.caseId === caseData.id),
      relations: relations.filter(r => r.caseId === caseData.id),
      chats: safeChats.filter(c => c.caseId === caseData.id),
    };

    const json = JSON.stringify(payload);
    const compressed = LZString.compressToEncodedURIComponent(json);
    return compressed;
  } catch (err) {
    console.error("encodeCaseForSharing failed", err);
    return null;
  }
}

/**
 * Decompress + deserialize a case payload from a URL hash.
 * Returns null if the input is malformed or the schema version is unsupported.
 */
export function decodeCaseFromSharing(compressed: string): ShareableCasePayload | null {
  try {
    if (!compressed || compressed.length < 10) {
      console.warn("decodeCaseFromSharing: empty or too-short input");
      return null;
    }
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) {
      console.warn("decodeCaseFromSharing: LZString.decompress returned null", { inputLen: compressed.length, inputHead: compressed.slice(0, 50) });
      return null;
    }
    let payload: ShareableCasePayload;
    try {
      payload = JSON.parse(json) as ShareableCasePayload;
    } catch (parseErr) {
      console.warn("decodeCaseFromSharing: JSON.parse failed", parseErr, { jsonHead: json.slice(0, 200) });
      return null;
    }
    if (!payload || payload.v !== 1) {
      console.warn("Unknown shareable case schema version", payload?.v);
      return null;
    }
    if (!payload.case || !Array.isArray(payload.entities) || !Array.isArray(payload.relations)) {
      console.warn("decodeCaseFromSharing: missing required fields", { hasCase: !!payload.case, entitiesIsArray: Array.isArray(payload.entities), relationsIsArray: Array.isArray(payload.relations) });
      return null;
    }
    return payload;
  } catch (err) {
    console.error("decodeCaseFromSharing failed", err);
    return null;
  }
}

/**
 * Build the full shareable URL for the given case.
 * Returns a URL like `https://abster-intelligence.vercel.app/case/share#<data>`.
 */
export function buildShareableUrl(
  caseData: Case,
  entities: Entity[],
  relations: Relation[],
  chats: Chat[],
): string | null {
  const compressed = encodeCaseForSharing(caseData, entities, relations, chats);
  if (!compressed) return null;
  if (typeof window === "undefined") return `/case/share#${compressed}`;
  const origin = window.location.origin;
  return `${origin}/case/share#${compressed}`;
}

/**
 * Approximate size estimate for the shareable URL, in KB.
 * Useful for warning the user when the case is too large to share via URL
 * (the practical limit is ~8 KB across all browsers).
 */
export function estimateShareableSize(compressed: string | null): number {
  if (!compressed) return 0;
  return Math.round(compressed.length / 1024 * 10) / 10;
}

/** Copy text to clipboard with a graceful fallback for non-secure contexts. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback: use a temporary textarea + execCommand
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (err) {
    console.error("copyToClipboard failed", err);
    return false;
  }
}
