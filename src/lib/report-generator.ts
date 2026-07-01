/**
 * Investigation report generator.
 *
 * Produces three artifacts from a Case + its entities + relations + chat messages
 * + activity log:
 *   - markdown:  plain .md text (pasteable into GitHub, Notion, etc.)
 *   - html:      self-contained .html with inline CSS (openable in any browser)
 *   - printable: opens the browser print dialog (user picks "Save as PDF")
 *
 * All generation happens client-side. No data leaves the browser.
 */

import type { Case, Entity, Relation, Chat, ChatMessage } from "../store/absterStore";

export interface ReportInputs {
  caseData: Case;
  entities: Entity[];
  relations: Relation[];
  chats: Chat[];
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  PERSON: "Person",
  ORGANIZATION: "Organization",
  LOCATION: "Location",
  EVENT: "Event",
  DOCUMENT: "Document",
  DEVICE: "Device",
  EMAIL: "Email",
  PHONE: "Phone",
  DOMAIN: "Domain",
  VEHICLE: "Vehicle",
  CRYPTO: "Cryptocurrency",
  GENERIC: "Entity",
};

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtActivityTime(ts: number): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return String(ts);
  }
}

function confidenceLabel(c?: number): string {
  if (c == null) return "—";
  const pct = Math.round(c * 100);
  if (pct >= 90) return `${pct}% (high)`;
  if (pct >= 70) return `${pct}% (medium)`;
  if (pct >= 40) return `${pct}% (low)`;
  return `${pct}% (very low)`;
}

// ─── Markdown ─────────────────────────────────────────────────────────
export function generateMarkdownReport(input: ReportInputs): string {
  const { caseData, entities, relations, chats } = input;
  const caseEntities = entities.filter(e => e.caseId === caseData.id);
  const caseRelations = relations.filter(r => r.caseId === caseData.id);
  const caseChats = chats.filter(c => c.caseId === caseData.id);
  const allMessages: ChatMessage[] = caseChats.flatMap(c => c.messages || []);

  const L: string[] = [];
  L.push(`# ${caseData.title}`);
  L.push("");
  L.push(`**Code name:** ${caseData.codeName}  `);
  L.push(`**Status:** ${caseData.status}  `);
  L.push(`**Priority:** ${caseData.priority}  `);
  L.push(`**Classification:** ${caseData.classification}  `);
  L.push(`**Lead investigator:** ${caseData.leadInvestigator}  `);
  L.push(`**Created:** ${fmtDate(caseData.createdAt)}  `);
  L.push(`**Last updated:** ${fmtDate(caseData.updatedAt)}  `);
  if (caseData.closedAt) L.push(`**Closed:** ${fmtDate(caseData.closedAt)}  `);
  if (caseData.tags?.length) L.push(`**Tags:** ${caseData.tags.join(", ")}  `);
  L.push("");

  if (caseData.description) {
    L.push("## Description");
    L.push("");
    L.push(caseData.description);
    L.push("");
  }

  L.push("## Entities");
  L.push("");
  L.push(`Total: **${caseEntities.length}**`);
  L.push("");
  if (caseEntities.length > 0) {
    L.push("| Type | Name | Confidence | Source | Verified | Description |");
    L.push("|------|------|-----------|--------|----------|-------------|");
    for (const e of caseEntities) {
      const t = ENTITY_TYPE_LABELS[e.type] || e.type;
      const n = (e.name || "").replace(/\|/g, "\\|");
      const c = confidenceLabel(e.confidence);
      const s = (e.source || "—").replace(/\|/g, "\\|");
      const v = e.isVerified ? "yes" : "no";
      const d = (e.description || "—").replace(/\|/g, "\\|").replace(/\n/g, " ");
      L.push(`| ${t} | ${n} | ${c} | ${s} | ${v} | ${d} |`);
    }
  } else {
    L.push("_No entities recorded._");
  }
  L.push("");

  L.push("## Relations");
  L.push("");
  L.push(`Total: **${caseRelations.length}**`);
  L.push("");
  if (caseRelations.length > 0) {
    const nameById = new Map(caseEntities.map(e => [e.id, e.name]));
    L.push("| Source | Relation | Target | Label | Date |");
    L.push("|--------|----------|--------|-------|------|");
    for (const r of caseRelations) {
      const src = (nameById.get(r.source) || r.source).replace(/\|/g, "\\|");
      const tgt = (nameById.get(r.target) || r.target).replace(/\|/g, "\\|");
      const type = (r.type || "—").replace(/\|/g, "\\|");
      const label = (r.label || "—").replace(/\|/g, "\\|");
      const date = r.date ? fmtDate(r.date) : "—";
      L.push(`| ${src} | ${type} | ${tgt} | ${label} | ${date} |`);
    }
  } else {
    L.push("_No relations recorded._");
  }
  L.push("");

  if (allMessages.length > 0) {
    L.push("## Chat History");
    L.push("");
    L.push(`_${caseChats.length} chat(s), ${allMessages.length} message(s)_`);
    L.push("");
    for (const m of allMessages.slice(0, 200)) {
      const role = m.role === "user" ? "Investigator" : m.role === "assistant" ? "Assistant" : m.role;
      const ts = fmtActivityTime(m.timestamp);
      L.push(`### ${role} — ${ts}`);
      L.push("");
      L.push(m.content || "_(empty)_");
      L.push("");
    }
    if (allMessages.length > 200) {
      L.push(`_... and ${allMessages.length - 200} more messages truncated_`);
      L.push("");
    }
  }

  if (caseData.activityLog?.length) {
    L.push("## Activity Log");
    L.push("");
    L.push("| Time | Type | Message |");
    L.push("|------|------|---------|");
    for (const log of caseData.activityLog) {
      const t = fmtActivityTime(log.timestamp);
      const ty = (log.type || "INFO").replace(/\|/g, "\\|");
      const msg = (log.message || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
      L.push(`| ${t} | ${ty} | ${msg} |`);
    }
    L.push("");
  }

  if (caseData.findings) {
    L.push("## Findings");
    L.push("");
    L.push(caseData.findings);
    L.push("");
  }

  if (caseData.hypotheses?.length) {
    L.push("## Hypotheses");
    L.push("");
    for (const h of caseData.hypotheses) {
      L.push(`- **${h.title}** — status: ${h.status}, confidence: ${confidenceLabel(h.confidence)}`);
      if (h.evidence) L.push(`  - Evidence: ${h.evidence}`);
    }
    L.push("");
  }

  L.push("---");
  L.push("");
  L.push(`_Report generated by Abster Intelligence on ${fmtDate(new Date().toISOString())}._`);
  L.push(`_Local-first: all data stayed in your browser._`);

  return L.join("\n");
}

// ─── HTML ────────────────────────────────────────────────────────────
const HTML_STYLE = `
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #0a0a0a; color: #e0e0e0; max-width: 960px; margin: 0 auto; padding: 32px; line-height: 1.55; }
  h1 { font-size: 28px; color: #fff; border-bottom: 2px solid #594DFF; padding-bottom: 8px; margin-bottom: 4px; }
  h2 { font-size: 20px; color: #fff; margin-top: 32px; margin-bottom: 8px; border-left: 3px solid #594DFF; padding-left: 10px; }
  h3 { font-size: 14px; color: #c0c0c0; margin-top: 18px; margin-bottom: 4px; font-weight: 600; }
  .meta { color: #888; font-size: 13px; margin: 8px 0 16px 0; }
  .meta div { margin: 2px 0; }
  .meta strong { color: #c0c0c0; min-width: 140px; display: inline-block; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
  th { background: #18181F; color: #fff; text-align: left; padding: 8px 10px; border-bottom: 1px solid #2a2a2a; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
  td { padding: 8px 10px; border-bottom: 1px solid #1a1a1a; vertical-align: top; }
  tr:hover td { background: #111; }
  code { background: #1a1a1a; padding: 1px 6px; border-radius: 3px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #34d399; }
  pre { background: #050505; border: 1px solid #1a1a1a; padding: 12px; border-radius: 6px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 3px solid #594DFF; margin: 12px 0; padding: 8px 16px; color: #a0a0a0; background: #111; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #2a2a2a; color: #555; font-size: 11px; }
  .tags span { display: inline-block; background: #1a1a1a; color: #594DFF; padding: 2px 8px; border-radius: 3px; margin-right: 4px; font-size: 11px; }
  .verified { color: #22c55e; }
  .suspicious { color: #f59e0b; }
  .role-user { color: #594DFF; font-weight: 600; }
  .role-assistant { color: #34d399; font-weight: 600; }
`;

function escapeHtml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function generateHtmlReport(input: ReportInputs): string {
  const { caseData, entities, relations, chats } = input;
  const caseEntities = entities.filter(e => e.caseId === caseData.id);
  const caseRelations = relations.filter(r => r.caseId === caseData.id);
  const caseChats = chats.filter(c => c.caseId === caseData.id);
  const allMessages: ChatMessage[] = caseChats.flatMap(c => c.messages || []);

  const nameById = new Map(caseEntities.map(e => [e.id, e.name]));

  const entityRows = caseEntities.length
    ? caseEntities.map(e => `
      <tr>
        <td>${escapeHtml(ENTITY_TYPE_LABELS[e.type] || e.type)}</td>
        <td><strong>${escapeHtml(e.name || "")}</strong></td>
        <td>${escapeHtml(confidenceLabel(e.confidence))}</td>
        <td>${escapeHtml(e.source || "—")}</td>
        <td class="${e.isVerified ? "verified" : ""}">${e.isVerified ? "✓" : "—"}</td>
        <td>${escapeHtml(e.description || "—")}</td>
      </tr>`).join("")
    : `<tr><td colspan="6" style="text-align:center;color:#555">No entities recorded.</td></tr>`;

  const relationRows = caseRelations.length
    ? caseRelations.map(r => `
      <tr>
        <td>${escapeHtml(nameById.get(r.source) || r.source)}</td>
        <td>${escapeHtml(r.type || "—")}</td>
        <td>${escapeHtml(nameById.get(r.target) || r.target)}</td>
        <td>${escapeHtml(r.label || "—")}</td>
        <td>${r.date ? escapeHtml(fmtDate(r.date)) : "—"}</td>
      </tr>`).join("")
    : `<tr><td colspan="5" style="text-align:center;color:#555">No relations recorded.</td></tr>`;

  const messageBlocks = allMessages.slice(0, 200).map(m => {
    const role = m.role === "user" ? "Investigator" : m.role === "assistant" ? "Assistant" : m.role;
    const cls = m.role === "user" ? "role-user" : "role-assistant";
    return `<h3><span class="${cls}">${escapeHtml(role)}</span> — ${escapeHtml(fmtActivityTime(m.timestamp))}</h3>
      <div>${escapeHtml(m.content || "_(empty)_").replace(/\n/g, "<br/>")}</div>`;
  }).join("\n");

  const activityRows = caseData.activityLog?.length
    ? caseData.activityLog.map(log => `
      <tr>
        <td>${escapeHtml(fmtActivityTime(log.timestamp))}</td>
        <td>${escapeHtml(log.type || "INFO")}</td>
        <td>${escapeHtml(log.message || "")}</td>
      </tr>`).join("")
    : `<tr><td colspan="3" style="text-align:center;color:#555">No activity recorded.</td></tr>`;

  const tags = caseData.tags?.length
    ? `<div class="tags">${caseData.tags.map(t => `<span>${escapeHtml(t)}</span>`).join("")}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(caseData.title)} — Abster Intelligence Report</title>
  <style>${HTML_STYLE}</style>
</head>
<body>
  <h1>${escapeHtml(caseData.title)}</h1>
  <div class="meta">
    <div><strong>Code name:</strong> ${escapeHtml(caseData.codeName)}</div>
    <div><strong>Status:</strong> ${escapeHtml(caseData.status)}</div>
    <div><strong>Priority:</strong> ${escapeHtml(caseData.priority)}</div>
    <div><strong>Classification:</strong> ${escapeHtml(caseData.classification)}</div>
    <div><strong>Lead investigator:</strong> ${escapeHtml(caseData.leadInvestigator)}</div>
    <div><strong>Created:</strong> ${escapeHtml(fmtDate(caseData.createdAt))}</div>
    <div><strong>Last updated:</strong> ${escapeHtml(fmtDate(caseData.updatedAt))}</div>
    ${caseData.closedAt ? `<div><strong>Closed:</strong> ${escapeHtml(fmtDate(caseData.closedAt))}</div>` : ""}
  </div>
  ${tags}

  ${caseData.description ? `<h2>Description</h2><p>${escapeHtml(caseData.description).replace(/\n/g, "<br/>")}</p>` : ""}

  <h2>Entities <span style="color:#555;font-size:12px;font-weight:normal">(${caseEntities.length})</span></h2>
  <table>
    <thead><tr><th>Type</th><th>Name</th><th>Confidence</th><th>Source</th><th>Verified</th><th>Description</th></tr></thead>
    <tbody>${entityRows}</tbody>
  </table>

  <h2>Relations <span style="color:#555;font-size:12px;font-weight:normal">(${caseRelations.length})</span></h2>
  <table>
    <thead><tr><th>Source</th><th>Relation</th><th>Target</th><th>Label</th><th>Date</th></tr></thead>
    <tbody>${relationRows}</tbody>
  </table>

  ${allMessages.length > 0 ? `
  <h2>Chat History <span style="color:#555;font-size:12px;font-weight:normal">(${caseChats.length} chats, ${allMessages.length} messages)</span></h2>
  ${messageBlocks}
  ${allMessages.length > 200 ? `<blockquote>... and ${allMessages.length - 200} more messages truncated</blockquote>` : ""}
  ` : ""}

  ${caseData.activityLog?.length ? `
  <h2>Activity Log</h2>
  <table>
    <thead><tr><th>Time</th><th>Type</th><th>Message</th></tr></thead>
    <tbody>${activityRows}</tbody>
  </table>
  ` : ""}

  ${caseData.findings ? `<h2>Findings</h2><p>${escapeHtml(caseData.findings).replace(/\n/g, "<br/>")}</p>` : ""}

  ${caseData.hypotheses?.length ? `
  <h2>Hypotheses</h2>
  <ul>
    ${caseData.hypotheses.map(h => `<li><strong>${escapeHtml(h.title)}</strong> — status: ${escapeHtml(h.status)}, confidence: ${escapeHtml(confidenceLabel(h.confidence))}${h.evidence ? `<br/><em>Evidence:</em> ${escapeHtml(h.evidence)}` : ""}</li>`).join("")}
  </ul>
  ` : ""}

  <div class="footer">
    Report generated by <strong>Abster Intelligence</strong> on ${escapeHtml(fmtDate(new Date().toISOString()))}.<br/>
    Local-first: all data stayed in your browser. No telemetry, no central database.
  </div>
</body>
</html>`;
}

// ─── File download helpers ───────────────────────────────────────────
export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a tick so the click handler has time to fire.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function printHtml(html: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) {
    alert("Pop-up blocked. Please allow pop-ups for abster.intel to use the Print/PDF export.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Give the new window a beat to lay out before triggering print.
  setTimeout(() => {
    w.focus();
    w.print();
  }, 400);
}

export function slugify(s: string): string {
  return (s || "case")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
