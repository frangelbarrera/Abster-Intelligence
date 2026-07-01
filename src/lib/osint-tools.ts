/**
 * Native OSINT tool integrations.
 *
 * Each tool returns structured results AND a list of suggested entities/relations
 * to merge into the active case graph. All requests go directly browser -> API
 * (no relay) to preserve the local-first security model.
 *
 * Tools:
 *   - shodan:  Shodan host lookup. Free tier requires API key (configure in
 *              Settings). Demo mode returns canned data for one well-known IP.
 *   - whois:   RDAP lookup via the official IANA bootstrap. Free, no key.
 *   - dns:     DNS-over-HTTPS via Google's public resolver. Free, no key.
 *   - wayback: Wayback Machine CDX API. Free, no key.
 *
 * Each tool returns:
 *   - summary:  a human-readable text block (markdown) for the chat
 *   - entities: array of entities to add to the graph
 *   - relations: array of relations to add to the graph
 */

import type { Entity, Relation } from "../store/absterStore";
import { generateId } from "./utils";

export interface ToolResult {
  summary: string;
  entities: Array<{ type: string; name: string; description?: string; confidence?: number; source?: string; startDate?: string; isVerified?: boolean }>;
  relations: Array<{ sourceName: string; targetName: string; type: string; label?: string }>;
}

// ─── Shodan ──────────────────────────────────────────────────────────
const SHODAN_DEMO_IPS: Record<string, any> = {
  "8.8.8.8": {
    ip: "8.8.8.8",
    org: "Google LLC",
    isp: "Google",
    asn: "AS15169",
    country: "United States",
    city: "Mountain View",
    region: "California",
    latitude: 37.4056,
    longitude: -122.0775,
    ports: [53, 443],
    hostnames: ["dns.google"],
    tags: ["dns", "google"],
    vulns: [],
  },
  "1.1.1.1": {
    ip: "1.1.1.1",
    org: "Cloudflare, Inc.",
    isp: "APNIC and Cloudflare DNS resolver",
    asn: "AS13335",
    country: "Australia",
    city: "Sydney",
    region: "New South Wales",
    latitude: -33.8688,
    longitude: 151.2093,
    ports: [53, 80, 443],
    hostnames: ["one.one.one.one"],
    tags: ["dns", "cloudflare"],
    vulns: [],
  },
};

export async function shodanLookup(ip: string, apiKey?: string): Promise<ToolResult> {
  const clean = ip.trim();
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(clean) && !/^[0-9a-f:]+$/i.test(clean)) {
    return { summary: `**Shodan**: \`${clean}\` is not a valid IPv4 or IPv6 address.`, entities: [], relations: [] };
  }

  // Demo mode: return canned data for well-known IPs without hitting the API.
  if (!apiKey || apiKey.trim().length < 10) {
    const demo = SHODAN_DEMO_IPS[clean];
    if (demo) {
      return {
        summary: `**Shodan (demo mode)** — \`${clean}\`
- **Org**: ${demo.org}
- **ISP**: ${demo.isp}
- **ASN**: ${demo.asn}
- **Location**: ${demo.city}, ${demo.region}, ${demo.country}
- **Open ports**: ${demo.ports.join(", ")}
- **Hostnames**: ${demo.hostnames.join(", ")}

_Add a Shodan API key in Settings to query arbitrary IPs._`,
        entities: [
          { type: "DEVICE", name: demo.ip, description: `Open ports: ${demo.ports.join(", ")}`, confidence: 1.0, source: "Shodan (demo)" },
          { type: "ORGANIZATION", name: demo.org, confidence: 0.95, source: "Shodan (demo)" },
          { type: "LOCATION", name: `${demo.city}, ${demo.country}`, confidence: 0.9, source: "Shodan (demo)" },
        ],
        relations: [
          { sourceName: demo.ip, targetName: demo.org, type: "OWNED_BY", label: demo.asn },
          { sourceName: demo.ip, targetName: `${demo.city}, ${demo.country}`, type: "LOCATED_IN" },
        ],
      };
    }
    return {
      summary: `**Shodan (demo mode)** — no demo data for \`${clean}\`. Try \`8.8.8.8\` or \`1.1.1.1\`, or add a Shodan API key in Settings to query any IP.`,
      entities: [{ type: "DEVICE", name: clean, confidence: 0.5, source: "User input" }],
      relations: [],
    };
  }

  // Live mode
  try {
    const resp = await fetch(`https://api.shodan.io/shodan/host/${clean}?key=${apiKey.trim()}`);
    if (!resp.ok) {
      const errText = await resp.text();
      return { summary: `**Shodan** lookup failed for \`${clean}\` (HTTP ${resp.status}): ${errText.slice(0, 200)}`, entities: [], relations: [] };
    }
    const data = await resp.json();
    const ports = (data.ports || []).join(", ");
    const hostnames = (data.hostnames || []).join(", ");
    return {
      summary: `**Shodan** — \`${clean}\`
- **Org**: ${data.org || "—"}
- **ISP**: ${data.isp || "—"}
- **ASN**: ${data.asn || "—"}
- **Location**: ${data.city || "—"}, ${data.region_code || ""} ${data.country_name || ""}
- **Open ports**: ${ports || "—"}
- **Hostnames**: ${hostnames || "—"}
- **Vulns**: ${(data.vulns || []).join(", ") || "none"}`,
      entities: [
        { type: "DEVICE", name: clean, description: `Open ports: ${ports}`, confidence: 1.0, source: "Shodan" },
        ...(data.org ? [{ type: "ORGANIZATION", name: data.org, confidence: 0.95, source: "Shodan" }] : []),
        ...(data.city ? [{ type: "LOCATION", name: `${data.city}, ${data.country_name}`, confidence: 0.9, source: "Shodan" }] : []),
      ],
      relations: [
        ...(data.org ? [{ sourceName: clean, targetName: data.org, type: "OWNED_BY", label: data.asn }] : []),
        ...(data.city ? [{ sourceName: clean, targetName: `${data.city}, ${data.country_name}`, type: "LOCATED_IN" }] : []),
      ],
    };
  } catch (err: any) {
    return { summary: `**Shodan** network error: ${err?.message || err}`, entities: [], relations: [] };
  }
}

// ─── WHOIS via RDAP (free, no key) ───────────────────────────────────
export async function whoisLookup(domain: string): Promise<ToolResult> {
  const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!clean.includes(".")) {
    return { summary: `**WHOIS**: \`${clean}\` doesn't look like a domain.`, entities: [], relations: [] };
  }
  try {
    // IANA RDAP bootstrap
    const resp = await fetch(`https://rdap.org/domain/${encodeURIComponent(clean)}`, {
      headers: { "Accept": "application/rdap+json" },
    });
    if (resp.status === 404) {
      return { summary: `**WHOIS** (RDAP): no record found for \`${clean}\`. The domain may be unregistered or the TLD has no RDAP server.`, entities: [{ type: "DOMAIN", name: clean, confidence: 0.5, source: "WHOIS (not found)" }], relations: [] };
    }
    if (!resp.ok) {
      return { summary: `**WHOIS** failed for \`${clean}\` (HTTP ${resp.status})`, entities: [], relations: [] };
    }
    const data = await resp.json();
    const events = data.events || [];
    const registration = events.find((e: any) => e.eventAction === "registration");
    const expiration = events.find((e: any) => e.eventAction === "expiration");
    const lastChanged = events.find((e: any) => e.eventAction === "last changed");

    // Find registrant / admin / tech contacts
    const entities = data.entities || [];
    const registrar = entities.find((e: any) => e.roles?.includes("registrar"));
    const registrant = entities.find((e: any) => e.roles?.includes("registrant"));

    const registrarName = registrar?.vcardArray?.[1]?.find((v: any) => v[0] === "fn")?.[3] || "—";
    const registrantName = registrant?.vcardArray?.[1]?.find((v: any) => v[0] === "fn")?.[3] || "REDACTED";

    const lines: string[] = [];
    lines.push(`**WHOIS (RDAP)** — \`${clean}\``);
    if (registration) lines.push(`- **Registered**: ${registration.eventDate}`);
    if (expiration) lines.push(`- **Expires**: ${expiration.eventDate}`);
    if (lastChanged) lines.push(`- **Last changed**: ${lastChanged.eventDate}`);
    lines.push(`- **Registrar**: ${registrarName}`);
    lines.push(`- **Registrant**: ${registrantName}`);
    if (data.status?.length) lines.push(`- **Status**: ${data.status.join(", ")}`);
    if (data.nameservers?.length) lines.push(`- **Nameservers**: ${data.nameservers.map((n: any) => n.ldhName).join(", ")}`);

    const entitiesOut: any[] = [{ type: "DOMAIN", name: clean, confidence: 1.0, source: "WHOIS (RDAP)", isVerified: true }];
    if (registrarName !== "—") entitiesOut.push({ type: "ORGANIZATION", name: registrarName, confidence: 0.9, source: "WHOIS (RDAP)" });
    if (registrantName !== "REDACTED" && registrantName !== "—") entitiesOut.push({ type: "PERSON", name: registrantName, confidence: 0.6, source: "WHOIS (RDAP)" });

    const relations: any[] = [];
    if (registrarName !== "—") relations.push({ sourceName: clean, targetName: registrarName, type: "REGISTERED_WITH", label: "registrar" });
    if (registrantName !== "REDACTED" && registrantName !== "—") relations.push({ sourceName: clean, targetName: registrantName, type: "REGISTERED_BY" });

    return { summary: lines.join("\n"), entities: entitiesOut, relations };
  } catch (err: any) {
    return { summary: `**WHOIS** network error: ${err?.message || err}`, entities: [], relations: [] };
  }
}

// ─── DNS over HTTPS via Google (free, no key) ────────────────────────
const DNS_RECORD_TYPES = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA"];

export async function dnsLookup(domain: string, recordType = "A"): Promise<ToolResult> {
  const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const type = recordType.toUpperCase();
  if (!DNS_RECORD_TYPES.includes(type)) {
    return { summary: `**DNS**: record type \`${type}\` not supported. Use one of: ${DNS_RECORD_TYPES.join(", ")}`, entities: [], relations: [] };
  }
  if (!clean.includes(".")) {
    return { summary: `**DNS**: \`${clean}\` doesn't look like a domain.`, entities: [], relations: [] };
  }
  try {
    const resp = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(clean)}&type=${type}`);
    if (!resp.ok) return { summary: `**DNS** failed for \`${clean}\` (HTTP ${resp.status})`, entities: [], relations: [] };
    const data = await resp.json();
    const answers = data.Answer || [];
    if (answers.length === 0) {
      return { summary: `**DNS** (\`${type}\`): no records found for \`${clean}\`.`, entities: [{ type: "DOMAIN", name: clean, confidence: 0.5, source: "DNS (no records)" }], relations: [] };
    }
    const lines = [`**DNS** (\`${type}\`) — \`${clean}\``];
    const entities: any[] = [{ type: "DOMAIN", name: clean, confidence: 1.0, source: "DNS", isVerified: true }];
    const relations: any[] = [];
    for (const a of answers) {
      const value = a.data;
      lines.push(`- \`${a.name}\` (${a.type} TTL ${a.TTL}s) → \`${value}\``);
      if (type === "A" || type === "AAAA") {
        entities.push({ type: "DEVICE", name: value, confidence: 0.9, source: `DNS ${type} record` });
        relations.push({ sourceName: clean, targetName: value, type: "RESOLVES_TO", label: type });
      } else if (type === "MX") {
        entities.push({ type: "DOMAIN", name: value.replace(/\.$/, ""), confidence: 0.85, source: "DNS MX" });
        relations.push({ sourceName: clean, targetName: value.replace(/\.$/, ""), type: "MX_RECORD", label: "mail" });
      } else if (type === "NS") {
        entities.push({ type: "DOMAIN", name: value.replace(/\.$/, ""), confidence: 0.85, source: "DNS NS" });
        relations.push({ sourceName: clean, targetName: value.replace(/\.$/, ""), type: "NS_RECORD", label: "nameserver" });
      }
    }
    return { summary: lines.join("\n"), entities, relations };
  } catch (err: any) {
    return { summary: `**DNS** network error: ${err?.message || err}`, entities: [], relations: [] };
  }
}

// ─── Wayback Machine (free, no key) ──────────────────────────────────
export async function waybackLookup(url: string): Promise<ToolResult> {
  const clean = url.trim();
  if (!clean.startsWith("http://") && !clean.startsWith("https://") && !clean.includes(".")) {
    return { summary: `**Wayback**: \`${clean}\` is not a valid URL.`, entities: [], relations: [] };
  }
  const target = clean.startsWith("http") ? clean : `https://${clean}`;
  try {
    // The CDX API doesn't send CORS headers, so browser fetches fail.
    // Use the official "available" API which is CORS-friendly and tells us
    // the closest snapshot. Then build a small CDX-style summary from it.
    const availResp = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(target)}`);
    if (!availResp.ok) return { summary: `**Wayback** failed for \`${target}\` (HTTP ${availResp.status})`, entities: [], relations: [] };
    const availData = await availResp.json();
    const closest = availData?.archived_snapshots?.closest;
    if (!closest || !closest.available) {
      return {
        summary: `**Wayback Machine**: no snapshots found for \`${target}\`.`,
        entities: [{ type: "DOMAIN", name: target, confidence: 0.5, source: "Wayback (no snapshots)" }],
        relations: [],
      };
    }
    const snapshotUrl = closest.url;
    const ts = closest.timestamp;
    const year = ts.slice(0, 4);
    const month = ts.slice(4, 6);
    const day = ts.slice(6, 8);
    const status = closest.status || "—";
    const evName = `Wayback snapshot ${year}-${month}-${day}`;
    return {
      summary: `**Wayback Machine** — \`${target}\`

Closest archived snapshot:
- **Date**: ${year}-${month}-${day}
- **HTTP status**: ${status}
- **Snapshot URL**: ${snapshotUrl}

_The CDX API (full snapshot history) does not expose CORS headers, so
this command uses the availability API. For the full list of snapshots,
open \`https://web.archive.org/web/*/${target}\` in a new tab._`,
      entities: [
        { type: "DOMAIN", name: target, confidence: 1.0, source: "Wayback" },
        { type: "EVENT", name: evName, description: snapshotUrl, confidence: 0.95, source: "Wayback Machine", startDate: `${year}-${month}-${day}` },
      ],
      relations: [
        { sourceName: target, targetName: evName, type: "ARCHIVED_AT", label: year },
      ],
    };
  } catch (err: any) {
    return { summary: `**Wayback** network error: ${err?.message || err}`, entities: [], relations: [] };
  }
}

/** Merge a ToolResult's suggested entities/relations into the active case via the store. */
export async function mergeToolResultIntoCase(
  result: ToolResult,
  ctx: {
    caseId: string;
    ownerId: string;
    existingEntities: Entity[];
    addEntity: (e: Entity) => Promise<void>;
    addRelation: (r: Relation) => Promise<void>;
  },
): Promise<{ addedEntities: number; addedRelations: number }> {
  if (!result.entities.length) return { addedEntities: 0, addedRelations: 0 };

  const nameToId = new Map<string, string>();
  for (const e of ctx.existingEntities) nameToId.set(e.name, e.id);

  let addedEntities = 0;
  for (const ext of result.entities) {
    if (nameToId.has(ext.name)) continue;
    const id = `e-${generateId()}`;
    const newEntity: Entity = {
      id,
      caseId: ctx.caseId,
      type: ext.type,
      name: ext.name,
      description: ext.description,
      confidence: ext.confidence ?? 0.7,
      source: ext.source || "OSINT tool",
      isVerified: ext.isVerified ?? false,
      startDate: ext.startDate,
      ownerId: ctx.ownerId,
    };
    nameToId.set(ext.name, id);
    try {
      await ctx.addEntity(newEntity);
      addedEntities++;
    } catch (err) {
      console.error("Failed to add tool entity", err);
    }
  }

  let addedRelations = 0;
  for (const rel of result.relations) {
    const sourceId = nameToId.get(rel.sourceName);
    const targetId = nameToId.get(rel.targetName);
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
      console.error("Failed to add tool relation", err);
    }
  }

  return { addedEntities, addedRelations };
}
