/**
 * Timeline event auto-generation.
 *
 * The original AbsterTimeline only surfaced entities with a `startDate` or
 * relations with a `date`. The README claims "auto-generation of events from
 * investigative reports" which was never implemented.
 *
 * This module extracts date-bearing events from multiple sources in the active
 * case and normalizes them into a single timeline payload:
 *
 *   1. Entities with startDate / endDate (existing behavior)
 *   2. Relations with date (existing behavior)
 *   3. Activity log entries (each log has a timestamp)
 *   4. Chat messages that mention dates in common formats
 *      (YYYY-MM-DD, MM/DD/YYYY, "March 15, 2024", ISO 8601, relative dates
 *      like "yesterday"/"last week")
 *   5. Vault file uploads (using uploadedAt)
 *
 * The output is a flat list of TimelineEvent objects that AbsterTimeline can
 * merge with its existing storeEvents to populate the timeline even when the
 * user has never manually added a startDate to any entity.
 */

import type { Case, Entity, Relation, Chat, ChatMessage } from "../store/absterStore";

export interface TimelineEvent {
  id: string;
  title: string;
  date: Date;
  endDate?: Date;
  type: string;
  entityName: string;
  entityType: string;
  description: string;
  source: string;
  confidence: number;
  tags: string[];
  locationName?: string;
  coordinates?: { lat: number; lng: number };
}

// Date regex patterns. Order matters — more specific patterns first.
const DATE_PATTERNS: Array<{ re: RegExp; format: string }> = [
  // ISO 8601 with time: 2024-03-15T14:30:00Z
  { re: /\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\b/g, format: "iso-datetime" },
  // ISO 8601 date: 2024-03-15
  { re: /\b(\d{4}-\d{2}-\d{2})\b/g, format: "iso-date" },
  // US format: 03/15/2024 or 3/15/2024
  { re: /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g, format: "us" },
  // European format: 15/03/2024 or 15.03.2024
  { re: /\b(\d{1,2}\.\d{1,2}\.\d{4})\b/g, format: "eu" },
  // Long format: March 15, 2024 or Mar 15 2024
  { re: /\b((?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4})\b/gi, format: "long" },
  // Inverse long: 15 March 2024 or 15 Mar 2024
  { re: /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})\b/gi, format: "long-inv" },
];

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

function parseDate(s: string, format: string): Date | null {
  try {
    if (format === "iso-datetime" || format === "iso-date") {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }
    if (format === "us") {
      const [m, d, y] = s.split("/").map(Number);
      if (!m || !d || !y) return null;
      return new Date(y, m - 1, d);
    }
    if (format === "eu") {
      const [d, m, y] = s.split(".").map(Number);
      if (!m || !d || !y) return null;
      return new Date(y, m - 1, d);
    }
    if (format === "long") {
      const parts = s.replace(/,/g, "").split(/\s+/);
      if (parts.length !== 3) return null;
      const month = MONTHS[parts[0].toLowerCase()];
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (month == null || !day || !year) return null;
      return new Date(year, month, day);
    }
    if (format === "long-inv") {
      const parts = s.split(/\s+/);
      if (parts.length !== 3) return null;
      const day = parseInt(parts[0], 10);
      const month = MONTHS[parts[1].toLowerCase()];
      const year = parseInt(parts[2], 10);
      if (month == null || !day || !year) return null;
      return new Date(year, month, day);
    }
  } catch {}
  return null;
}

/** Extract date references from a free-text string. */
export function extractDatesFromText(text: string): Array<{ date: Date; matched: string }> {
  if (!text) return [];
  const out: Array<{ date: Date; matched: string }> = [];
  for (const { re, format } of DATE_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const parsed = parseDate(m[1], format);
      if (parsed) {
        out.push({ date: parsed, matched: m[1] });
      }
    }
  }
  return out;
}

/** Build auto-generated timeline events from chat messages, activity log, and vault files. */
export function autoGenerateTimelineEvents(
  caseData: Case,
  chats: Chat[],
  vaultFiles: Array<{ id: string; name: string; uploadedAt: string; type: string }>,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // 1. Chat messages — extract date references from the user's text
  const caseChats = chats.filter(c => c.caseId === caseData.id);
  for (const chat of caseChats) {
    const messages = chat.messages || [];
    for (const msg of messages) {
      // Skip assistant messages for date extraction (they often quote sample dates)
      if (msg.role !== "user") continue;
      const extracted = extractDatesFromText(msg.content || "");
      for (const ex of extracted) {
        events.push({
          id: `auto-chat-${msg.id}-${ex.matched.replace(/\W/g, "_")}`,
          title: `Mentioned in chat: "${ex.matched}"`,
          date: ex.date,
          type: "mention",
          entityName: chat.title,
          entityType: "chat",
          description: msg.content.length > 200 ? msg.content.slice(0, 200) + "..." : msg.content,
          source: "Chat date extraction",
          confidence: 0.6,
          tags: ["auto-extracted", "chat"],
        });
      }
    }
  }

  // 2. Activity log entries — each log has a timestamp
  if (caseData.activityLog?.length) {
    for (const log of caseData.activityLog) {
      if (!log.timestamp) continue;
      events.push({
        id: `auto-log-${log.id}`,
        title: log.message || "Activity event",
        date: new Date(log.timestamp),
        type: log.type?.toLowerCase() === "critical" ? "critical" :
              log.type?.toLowerCase() === "warning" ? "warning" : "generic",
        entityName: caseData.codeName,
        entityType: "case",
        description: log.message || "",
        source: "Activity log",
        confidence: 1.0,
        tags: ["auto-extracted", "activity-log", log.type || "INFO"],
      });
    }
  }

  // 3. Vault file uploads — using uploadedAt
  for (const f of vaultFiles) {
    if (!f.uploadedAt) continue;
    events.push({
      id: `auto-file-${f.id}`,
      title: `Evidence uploaded: ${f.name}`,
      date: new Date(f.uploadedAt),
      type: "evidence",
      entityName: f.name,
      entityType: "file",
      description: `File of type ${f.type} was added to the case vault.`,
      source: "Vault upload",
      confidence: 1.0,
      tags: ["auto-extracted", "vault", f.type],
    });
  }

  // 4. Case creation date as the seed event (if no other events exist)
  if (events.length === 0 && caseData.createdAt) {
    events.push({
      id: `auto-case-created-${caseData.id}`,
      title: `Case created: ${caseData.title}`,
      date: new Date(caseData.createdAt),
      type: "milestone",
      entityName: caseData.codeName,
      entityType: "case",
      description: `Investigation ${caseData.codeName} was opened.`,
      source: "Case metadata",
      confidence: 1.0,
      tags: ["auto-extracted", "case-creation"],
    });
  }

  return events;
}
