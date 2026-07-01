import type { Case, Entity, Relation, Chat } from "../store/absterStore";
import { generateId } from "./utils";

// Demo cases are deterministic so deep-links like /case/demo/breach always render the same graph.
// Seeded by AbsterChat on first load if the URL path matches one of these slugs.

export interface DemoCase {
  slug: string;
  caseData: Case;
  entities: Entity[];
  relations: Relation[];
  chat: Chat;
}

const now = () => new Date().toISOString();

function makeCase(partial: Partial<Case>): Case {
  return {
    id: partial.id || generateId(),
    codeName: partial.codeName || "DEMO",
    title: partial.title || "Demo Case",
    description: partial.description || "",
    priority: partial.priority || "MEDIUM",
    status: "ACTIVE",
    classification: "UNCLASSIFIED",
    createdAt: now(),
    updatedAt: now(),
    leadInvestigator: "Demo Operator",
    team: [],
    stats: { entityCount: 0, locationCount: 0, eventCount: 0, toolResultsCount: 0, evidenceCount: 0 },
    tags: partial.tags || ["demo"],
    findings: "",
    linkedCases: [],
    template: null,
    checklist: [],
    hypotheses: [],
    activityLog: [],
    settings: {},
    ownerId: "local-operator-001",
    ...partial,
  };
}

const DEMO_BREACH: DemoCase = {
  slug: "breach",
  caseData: makeCase({
    id: "demo-breach-case",
    codeName: "BREACH-DEMO",
    title: "Email Breach Investigation — Demo",
    description: "Pre-built demo showing how Abster links an email to its breach history via HaveIBeenPwned.",
    priority: "HIGH",
    tags: ["demo", "hibp", "breach", "email"],
  }),
  entities: [
    { id: "e-demo-001", caseId: "demo-breach-case", type: "EMAIL", name: "test@example.com", confidence: 0.95, source: "demo", isVerified: true, ownerId: "local-operator-001" } as Entity,
    { id: "e-demo-002", caseId: "demo-breach-case", type: "DOMAIN", name: "example.com", confidence: 0.92, source: "demo", isVerified: true, ownerId: "local-operator-001" } as Entity,
    { id: "e-demo-003", caseId: "demo-breach-case", type: "ORGANIZATION", name: "LinkedIn", confidence: 0.90, source: "HaveIBeenPwned (sample)", ownerId: "local-operator-001" } as Entity,
    { id: "e-demo-004", caseId: "demo-breach-case", type: "EVENT", name: "LinkedIn 2021 Breach", confidence: 0.98, source: "HaveIBeenPwned (sample)", startDate: "2021-06-22", ownerId: "local-operator-001" } as Entity,
    { id: "e-demo-005", caseId: "demo-breach-case", type: "EVENT", name: "Collection #1 Leak", confidence: 0.85, source: "HaveIBeenPwned (sample)", startDate: "2019-01-07", ownerId: "local-operator-001" } as Entity,
  ],
  relations: [
    { id: "r-demo-001", caseId: "demo-breach-case", source: "e-demo-001", target: "e-demo-002", type: "BELONGS_TO", ownerId: "local-operator-001" } as Relation,
    { id: "r-demo-002", caseId: "demo-breach-case", source: "e-demo-001", target: "e-demo-004", type: "BREACHED_IN", label: "2021", ownerId: "local-operator-001" } as Relation,
    { id: "r-demo-003", caseId: "demo-breach-case", source: "e-demo-001", target: "e-demo-005", type: "BREACHED_IN", label: "2019", ownerId: "local-operator-001" } as Relation,
    { id: "r-demo-004", caseId: "demo-breach-case", source: "e-demo-004", target: "e-demo-003", type: "AFFECTED_ORG", ownerId: "local-operator-001" } as Relation,
  ],
  chat: {
    id: "demo-breach-chat",
    title: "Email Breach Investigation — Demo",
    caseId: "demo-breach-case",
    ownerId: "local-operator-001",
    createdAt: now(),
    updatedAt: now(),
    messages: [
      { id: "m-demo-001", role: "user", content: "Find breaches for test@example.com", timestamp: Date.now() - 60000, provider: "demo-seed" as any },
      { id: "m-demo-002", role: "assistant", content: "Found 2 breach records for `test@example.com`:\n\n- **LinkedIn** (2021-06-22) — 700M accounts. Compromised: Emails, Phone numbers, Names\n- **Collection #1** (2019-01-07) — 772M accounts. Compromised: Emails, Passwords\n\nEntities auto-added to the graph: 5 nodes, 4 relations.", timestamp: Date.now() - 55000, provider: "demo-seed" as any },
    ],
  },
};

const DEMO_DOMAIN: DemoCase = {
  slug: "domain",
  caseData: makeCase({
    id: "demo-domain-case",
    codeName: "DOMAIN-DEMO",
    title: "Domain Reconnaissance — Demo",
    description: "Pre-built demo showing a domain pivot: WHOIS, DNS, subdomains and related infrastructure.",
    priority: "MEDIUM",
    tags: ["demo", "domain", "dns", "whois"],
  }),
  entities: [
    { id: "e-dom-001", caseId: "demo-domain-case", type: "DOMAIN", name: "acme-corp.com", confidence: 0.95, source: "demo", isVerified: true, ownerId: "local-operator-001" } as Entity,
    { id: "e-dom-002", caseId: "demo-domain-case", type: "PERSON", name: "REDACTED (Registrant)", confidence: 0.60, source: "WHOIS (sample)", ownerId: "local-operator-001" } as Entity,
    { id: "e-dom-003", caseId: "demo-domain-case", type: "ORGANIZATION", name: "Acme Corp LLC", confidence: 0.85, source: "WHOIS (sample)", ownerId: "local-operator-001" } as Entity,
    { id: "e-dom-004", caseId: "demo-domain-case", type: "DOMAIN", name: "www.acme-corp.com", confidence: 0.90, source: "DNS (sample)", ownerId: "local-operator-001" } as Entity,
    { id: "e-dom-005", caseId: "demo-domain-case", type: "DOMAIN", name: "mail.acme-corp.com", confidence: 0.88, source: "DNS (sample)", ownerId: "local-operator-001" } as Entity,
    { id: "e-dom-006", caseId: "demo-domain-case", type: "DEVICE", name: "203.0.113.10", confidence: 0.92, source: "DNS A record (sample)", ownerId: "local-operator-001" } as Entity,
    { id: "e-dom-007", caseId: "demo-domain-case", type: "DEVICE", name: "203.0.113.45", confidence: 0.88, source: "DNS A record (sample)", ownerId: "local-operator-001" } as Entity,
  ],
  relations: [
    { id: "r-dom-001", caseId: "demo-domain-case", source: "e-dom-001", target: "e-dom-002", type: "REGISTERED_BY", ownerId: "local-operator-001" } as Relation,
    { id: "r-dom-002", caseId: "demo-domain-case", source: "e-dom-001", target: "e-dom-003", type: "OWNED_BY", ownerId: "local-operator-001" } as Relation,
    { id: "r-dom-003", caseId: "demo-domain-case", source: "e-dom-004", target: "e-dom-001", type: "SUBDOMAIN_OF", ownerId: "local-operator-001" } as Relation,
    { id: "r-dom-004", caseId: "demo-domain-case", source: "e-dom-005", target: "e-dom-001", type: "SUBDOMAIN_OF", ownerId: "local-operator-001" } as Relation,
    { id: "r-dom-005", caseId: "demo-domain-case", source: "e-dom-004", target: "e-dom-006", type: "RESOLVES_TO", ownerId: "local-operator-001" } as Relation,
    { id: "r-dom-006", caseId: "demo-domain-case", source: "e-dom-005", target: "e-dom-007", type: "RESOLVES_TO", ownerId: "local-operator-001" } as Relation,
  ],
  chat: {
    id: "demo-domain-chat",
    title: "Domain Reconnaissance — Demo",
    caseId: "demo-domain-case",
    ownerId: "local-operator-001",
    createdAt: now(),
    updatedAt: now(),
    messages: [
      { id: "m-dom-001", role: "user", content: "Pivot on acme-corp.com — WHOIS, DNS, subdomains", timestamp: Date.now() - 60000, provider: "demo-seed" as any },
      { id: "m-dom-002", role: "assistant", content: "Pivoted on `acme-corp.com`:\n\n- WHOIS: registrant redacted, owned by Acme Corp LLC\n- DNS: 2 subdomains resolved (www, mail) -> 2 A records\n\n7 entities auto-added to the graph.", timestamp: Date.now() - 55000, provider: "demo-seed" as any },
    ],
  },
};

const DEMO_PERSON: DemoCase = {
  slug: "person",
  caseData: makeCase({
    id: "demo-person-case",
    codeName: "PERSON-DEMO",
    title: "Person-of-Interest Investigation — Demo",
    description: "Pre-built demo showing a multi-platform pivot across socials, employer, and known email.",
    priority: "MEDIUM",
    tags: ["demo", "person", "social", "pivot"],
  }),
  entities: [
    { id: "e-per-001", caseId: "demo-person-case", type: "PERSON", name: "Jane Doe (Public Figure)", confidence: 0.95, source: "demo", isVerified: true, ownerId: "local-operator-001" } as Entity,
    { id: "e-per-002", caseId: "demo-person-case", type: "EMAIL", name: "jane.doe@example.com", confidence: 0.85, source: "Public profile (sample)", ownerId: "local-operator-001" } as Entity,
    { id: "e-per-003", caseId: "demo-person-case", type: "ORGANIZATION", name: "Example Inc.", confidence: 0.88, source: "LinkedIn (sample)", ownerId: "local-operator-001" } as Entity,
    { id: "e-per-004", caseId: "demo-person-case", type: "DOMAIN", name: "linkedin.com/in/jane-doe", confidence: 0.92, source: "Public profile (sample)", ownerId: "local-operator-001" } as Entity,
    { id: "e-per-005", caseId: "demo-person-case", type: "DOMAIN", name: "@janedoe (Twitter/X handle)", confidence: 0.90, source: "Public profile (sample)", ownerId: "local-operator-001" } as Entity,
    { id: "e-per-006", caseId: "demo-person-case", type: "LOCATION", name: "San Francisco, CA", confidence: 0.75, source: "Public profile (sample)", lat: 37.7749, lng: -122.4194, ownerId: "local-operator-001" } as Entity,
  ],
  relations: [
    { id: "r-per-001", caseId: "demo-person-case", source: "e-per-001", target: "e-per-002", type: "OWNS_EMAIL", ownerId: "local-operator-001" } as Relation,
    { id: "r-per-002", caseId: "demo-person-case", source: "e-per-001", target: "e-per-003", type: "WORKS_AT", ownerId: "local-operator-001" } as Relation,
    { id: "r-per-003", caseId: "demo-person-case", source: "e-per-001", target: "e-per-004", type: "HAS_PROFILE", label: "LinkedIn", ownerId: "local-operator-001" } as Relation,
    { id: "r-per-004", caseId: "demo-person-case", source: "e-per-001", target: "e-per-005", type: "HAS_PROFILE", label: "Twitter/X", ownerId: "local-operator-001" } as Relation,
    { id: "r-per-005", caseId: "demo-person-case", source: "e-per-001", target: "e-per-006", type: "LOCATED_IN", ownerId: "local-operator-001" } as Relation,
  ],
  chat: {
    id: "demo-person-chat",
    title: "Person-of-Interest Investigation — Demo",
    caseId: "demo-person-case",
    ownerId: "local-operator-001",
    createdAt: now(),
    updatedAt: now(),
    messages: [
      { id: "m-per-001", role: "user", content: "Pivot on Jane Doe across socials, employer, location", timestamp: Date.now() - 60000, provider: "demo-seed" as any },
      { id: "m-per-002", role: "assistant", content: "Pivoted on Jane Doe (public figure):\n\n- LinkedIn: linkedin.com/in/jane-doe\n- Twitter/X: @janedoe\n- Employer: Example Inc.\n- Email: jane.doe@example.com\n- Location: San Francisco, CA\n\n6 entities auto-added to the graph.", timestamp: Date.now() - 55000, provider: "demo-seed" as any },
    ],
  },
};

export const DEMO_CASES: Record<string, DemoCase> = {
  breach: DEMO_BREACH,
  domain: DEMO_DOMAIN,
  person: DEMO_PERSON,
};

export function getDemoCase(slug: string): DemoCase | null {
  return DEMO_CASES[slug] || null;
}

export function getDemoCaseByCaseId(caseId: string): DemoCase | null {
  for (const slug of Object.keys(DEMO_CASES)) {
    if (DEMO_CASES[slug].caseData.id === caseId) return DEMO_CASES[slug];
  }
  return null;
}
