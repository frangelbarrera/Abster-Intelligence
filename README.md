# Abster Intelligence

![License](https://img.shields.io/badge/license-Apache--2.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

> Information wants to be free, but intelligence must remain private.
> **Local-first OSINT workspace for investigators who can't afford data leakage.**

![Abster Intelligence Graph Engine](public/images/1.png)

Abster Intelligence is a privacy-first investigation workspace for OSINT, GEOINT, and cyber research. Map entities in a live relationship graph, build timelines, analyze evidence, query your case with your own LLM keys, run native OSINT tool lookups from the chat, generate shareable case URLs, and export Markdown / HTML / PDF reports — all without sending your investigations to a central database.

**Why it stands out:**
- **Local-first by default:** Cases, notes, evidence metadata, and provider settings stay in your browser via IndexedDB.
- **Zero-trust platform model:** Bring your own keys (BYOK). Your keys are not stored by us, and investigation data stays local unless you explicitly query a third-party provider.
- **Graph-native investigations:** Turn fragmented findings into connected entities, locations, and timelines using a dynamic D3.js engine. The LLM auto-extracts entities from chat responses and inserts them into the graph.
- **Backend-free collaboration:** Share a full investigation (graph + chat + entities) by sending a URL. The case data is compressed into the URL hash fragment, which is never sent to the server.

---

## Security Model

Abster Intelligence operates under a strict data sovereignty paradigm:
* No Abster-hosted central case database is required or exists.
* Provider keys are configured directly by the user in the UI.
* The platform does not act as a mandatory data relay. When you use an external AI provider, your prompts go directly to them.
* OSINT tool lookups (`/shodan`, `/whois`, `/dns`, `/wayback`, `/hibp`) hit the upstream API directly from your browser. Most are free and work without a key (`/whois`, `/dns`, `/wayback`); `/shodan` and `/hibp` work in demo mode without a key and hit the live API with one. Note: `/hibp` live mode and `/wayback` full-history queries are CORS-restricted by the upstream APIs — see the [Known CORS limitations](#known-cors-limitations) section.
* Shareable case URLs encode the case data in the URL hash fragment (`#...`) — browsers never send the hash to the server, so even Vercel's access logs cannot see your case data.

## Core Features

![OSINT Operations Dashboard](public/images/6.png)

* **Local-First Architecture:** Complete data sovereignty. All case work, chat history, and infrastructure evidence are stored safely in your browser using IndexedDB (Dexie.js). No middleman databases, no telemetry.

![Reports and Evidence Center](public/images/7.png)

* **Relational Graph Engine:** Interactive, physics-based network graphs powered by D3.js. Visualize interconnected nodes, geo-entities, and complex infrastructural relationships in real-time. Entities are auto-extracted from LLM responses and from OSINT tool results.

![Tactical GEOINT Map](public/images/3.png)

* **Multi-LLM Integration (BYOK):** Query your OSINT findings using 10 providers (OpenAI, Anthropic, Gemini, DeepSeek, Groq, Mistral, Cohere, Azure OpenAI, OpenRouter, local Ollama). Keys are stored locally in your browser and never transmitted through Abster.

![Multi-LLM Chat Interface](public/images/2.png)

* **Auto-Generated Timeline:** Timeline events are extracted automatically from entity dates, chat-message date mentions, activity log entries, and vault file uploads. Six event types are color-coded: communication, movement, transaction, publication, meeting, breach, mention, evidence, milestone, critical, warning, generic.

![Threat Timeline](public/images/4.png)

* **Investigation Report Generator:** Export the active case as Markdown, self-contained HTML, or print-to-PDF. Includes case metadata, entities table, relations table, chat history (capped at 200 messages), activity log, findings, and hypotheses. All generated client-side.

* **Shareable Case URLs:** Compress any case into a URL hash fragment and send it to a collaborator. They open the link, the case loads into their IndexedDB as a fresh copy. No backend, no account, no API keys. (Soft limit ~8 KB compressed.)

* **Native OSINT Tools:** Five slash commands (`/hibp`, `/shodan`, `/whois`, `/dns`, `/wayback`) call public OSINT APIs directly from the chat and auto-populate the graph with extracted entities + relations. `/whois`, `/dns`, and `/wayback` are free and keyless; `/shodan` and `/hibp` have demo modes that work without a key and live modes that accept one.

* **XSS-Shielded Interface:** Hardened UI with strict DOM sanitization (`isomorphic-dompurify`) ensuring protection against script injections in rendered markdown.

![OSINT Tools Grid](public/images/5.png)

## Security First: BYOK Model

![Security Configuration and BYOK](public/images/8.png)

**We do not possess or transmit your API keys.** Abster Intelligence operates on a strict **Bring Your Own Key (BYOK)** model to ensure absolute zero-trust operations.

* No sensitive keys are required or supported in public `.env` files.
* **UI Configuration:** You must configure your provider API credentials directly within the application's Setup/Settings UI.
* Keys are stored locally in your browser's IndexedDB (base64-encoded, not encrypted at rest). They never leave your machine except when you explicitly send a prompt to your chosen LLM provider. For higher-threat models, consider using a dedicated browser profile or rotating keys frequently.

## Tech Stack

* **Core:** React 19 + Next.js 15 (App Router)
* **Styling:** Tailwind CSS
* **State Management:** Zustand
* **Database:** Dexie.js (IndexedDB wrapper)
* **Visualization:** D3.js
* **Compression:** LZ-string (for shareable case URLs)
* **Testing:** Playwright E2E
* **CI:** GitHub Actions (lint + typecheck + build + e2e)

## Project Structure

```text
abster-intelligence/
├── public/                 # Static assets and public resources
├── src/
│   ├── app/                # Next.js 15 App Router (Pages, Layouts, APIs)
│   │   ├── case/[id]/      # Deep-link to a specific case
│   │   ├── case/demo/[slug]/ # Pre-built demo cases (breach, domain, person)
│   │   ├── case/share/     # Shared case receiver (reads URL hash)
│   │   └── api/flights/    # legacy helper endpoint
│   ├── components/         # Core React Components
│   │   ├── chat/           # Modular Chat UI (ChatInput, ChatSidebar, ChatMessageList)
│   │   ├── ui/             # Reusable UI / Shadcn Elements
│   │   ├── abster-graph-v4.tsx  # D3.js Relational Graph Engine
│   │   ├── abster-chat.tsx # Main Chat Orchestrator (slash commands + LLM)
│   │   ├── abster-timeline.tsx # Auto-generating timeline module
│   │   ├── abster-reports.tsx  # Evidence vault + report generator
│   │   └── GeoIntMap.tsx   # Geospatial Intelligence Map Engine
│   ├── lib/                # Utilities (security, markdown, tools, sharing)
│   │   ├── db.ts           # Dexie schema
│   │   ├── hibp.ts         # HaveIBeenPwned integration with demo fallback
│   │   ├── osint-tools.ts  # /shodan, /whois, /dns, /wayback native tools
│   │   ├── entity-extraction.ts # LLM chat → graph auto-population
│   │   ├── mcp-client.ts   # Generic MCP client (connect external MCP servers)
│   │   ├── case-sharing.ts # Compressed URL hash share/decode
│   │   ├── report-generator.ts # Markdown + HTML + PDF export
│   │   ├── timeline-autogen.ts # Auto-extract timeline events
│   │   ├── demo-cases.ts   # 3 pre-built investigation seeds
│   │   ├── security.ts     # DOMPurify sanitization
│   │   └── markdown.ts     # Markdown renderer
│   ├── store/              # Zustand global state definitions
│   └── data/               # Static data (OSINT tools catalog: 254 tools)
├── tests/e2e/              # Playwright E2E tests
├── .github/workflows/ci.yml # CI: lint + typecheck + build + e2e
├── package.json
├── tailwind.config.ts
├── next.config.ts
└── playwright.config.ts
```

## Quick Start

### Prerequisites
- Node.js 20+
- npm 10+
- A modern Chromium-based browser or Firefox

### Run Locally
```bash
git clone https://github.com/frangelbarrera/Abster-Intelligence.git
cd Abster-Intelligence
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

### Try the Demo Cases (no setup required)

Three pre-built investigations render on deep-linkable URLs — handy for sharing with collaborators or posting on HN/Reddit without making the audience configure an LLM key first:

| URL | What it shows |
|-----|---------------|
| `/case/demo/breach` | Email → HaveIBeenPwned breach graph (5 entities, 4 relations) |
| `/case/demo/domain` | Domain pivot — WHOIS, DNS, subdomains, infrastructure (7 entities, 6 relations) |
| `/case/demo/person` | Person-of-interest pivot across socials, employer, location (6 entities, 5 relations) |

These cases are read-only seeds; deleting one restores it on next page load. Your own cases live alongside them in the same IndexedDB store.

**Configuration Note:**
Abster Intelligence works out-of-the-box for case management, graphing, slash-command OSINT lookups, and report generation. To enable multi-LLM queries, configure your provider API keys (OpenAI, Anthropic, Gemini, DeepSeek, Local Ollama, etc.) directly within the application's Settings UI. No `.env` setup is required for core functionality.

---

## Slash Commands

When you don't want to burn an LLM token on a simple lookup, drive investigations directly from the chat input. All of these work without an LLM key:

### OSINT tools (auto-populate the graph)

| Command | Action |
|---------|--------|
| `/hibp user@example.com` | Query HaveIBeenPwned. Demo mode (no key) returns data for well-known sample emails; with a key, any email hits the live API. Breaches auto-populate the graph as `BREACHED_IN` events. |
| `/shodan 8.8.8.8` | Shodan host lookup. Demo mode (no key) returns canned data for `8.8.8.8` and `1.1.1.1`; with a key, any IP via the live API. Adds device, organization, and location entities + relations. |
| `/whois example.com` | RDAP lookup via `rdap.org` bootstrap. Free, no key. Returns registrar, registrant, registration date, expiration, nameservers, status. |
| `/dns example.com A` | DNS-over-HTTPS via Google's public resolver. Free, no key. Types: A, AAAA, MX, NS, TXT, CNAME, SOA. Default: A. |
| `/wayback https://example.com` | Wayback Machine availability API. Free, no key. Returns the closest archived snapshot. Adds an `ARCHIVED_AT` event with the snapshot URL. |

### Manual graph editing

| Command | Action |
|---------|--------|
| `/entity add DOMAIN acme-corp.com [description]` | Manually add a node to the active case. Types: PERSON, ORGANIZATION, DOMAIN, EMAIL, PHONE, DEVICE, LOCATION, EVENT, DOCUMENT, VEHICLE, CRYPTO, GENERIC. |
| `/case list` | List all investigation cases in your local DB. |

### MCP server bridge

| Command | Action |
|---------|--------|
| `/mcp list` | List configured MCP servers. |
| `/mcp tools <server-id>` | List tools exposed by a configured MCP server. |
| `/mcp call <server-id> <tool-name> {json-args}` | Invoke an MCP tool and surface its output in the chat. |

---

## Connecting an MCP Server (e.g. your `osint-agent-skills`)

Abster ships a minimal MCP (Model Context Protocol) client that speaks JSON-RPC 2.0 over HTTP. It supports the standard `tools/list` and `tools/call` methods. The `osint-agent-skills` repo is intentionally untouched — Abster consumes it as a generic MCP client.

Because Abster runs in the browser, it cannot spawn the stdio MCP server directly (browsers sandbox child-process spawning). You need a small HTTP bridge. The recommended bridge is [`mcp-proxy`](https://www.npmjs.com/package/mcp-proxy), which exposes any stdio MCP server over HTTP on a local port. The bridge also bypasses CORS restrictions for OSINT APIs that don't send `Access-Control-Allow-Origin` headers (HIBP, Shodan live, VirusTotal, etc.) — see [Known CORS limitations](#known-cors-limitations).

### One-time setup

```bash
# 1. Clone your osint-agent-skills repo (skip if you already have it)
git clone https://github.com/frangelbarrera/osint-agent-skills.git
cd osint-agent-skills

# 2. Install dependencies (if you haven't already)
npm install

# 3. Start the MCP server behind an HTTP bridge on port 3001
npx mcp-proxy --port 3001 -- node tools/mcp-server.js
```

Leave that terminal running. The MCP server is now reachable at `http://localhost:3001`.

### Wire it into Abster

Add a server entry to Abster's `mcpServers` IndexedDB settings (you can do this from the browser DevTools console, or by running `/mcp list` once and following the prompt):

```json
{
  "id": "agent-skills",
  "label": "OSINT Agent Skills",
  "url": "http://localhost:3001",
  "enabled": true
}
```

### Use it from the chat

```
/mcp list                          → verify the server is connected
/mcp tools agent-skills            → list the 23 tools it exposes (DNS, RDAP, crt.sh, Wayback, Shodan, HIBP, GitHub, urlscan, OTX, Gravatar, VirusTotal, SecurityTrails, Hunter, Nominatim, blockchain.info, Etherscan, Mastodon, ...)
/mcp call agent-skills dns_lookup {"domain":"example.com"}    → invoke a tool and surface its output in the chat
```

The MCP bridge pattern means Abster can consume any stdio MCP server in the ecosystem — not just `osint-agent-skills`. If you have other MCP servers (filesystem, database, custom agents), the same `mcp-proxy` bridge works for all of them.

---

## Sharing a Case (backend-free collaboration)

Click the **↗ SHARE** button in the active-case header (top of the chat). Abster will:

1. Serialize the case (metadata + entities + relations + chat messages) to JSON.
2. Compress it with LZ-string's `compressToEncodedURIComponent`.
3. Pack the compressed string into the URL hash fragment of `/case/share#<data>`.
4. Copy the URL to your clipboard.

Send that URL to a collaborator via DM, email, Slack — whatever. When they open it:
- They auto-login as LOCAL_USER (no setup wall).
- The case is decoded and seeded into their IndexedDB as a fresh copy with new IDs (so it won't clobber any existing case with the same id).
- The case appears in their sidebar as `ORIGINAL-CODENAME-RECV` with title `Original Title (shared copy)`.

**Size limit:** practical cross-browser URL length is ~8 KB compressed. Abster warns you if the case exceeds 7 KB and suggests using the Markdown / HTML export in the Reports module instead.

**Privacy:** the URL hash fragment (`#...`) is never sent to the server by the browser spec. Even if Vercel's access logs captured the full URL, they would not see the case data.

---

## Investigation Reports

Open the **REPORTS** module (sidebar) and switch to the **REPORT** tab. Three export formats are available:

| Format | What it produces |
|--------|------------------|
| **MARKDOWN** | Downloads a `.md` file. Pasteable into GitHub, Notion, Slack. |
| **HTML** | Downloads a self-contained `.html` file with inline CSS. Openable in any browser, shareable as a single file. |
| **PRINT / PDF** | Opens a new window with the HTML and triggers the browser print dialog. Pick "Save as PDF" for a printable artifact. |

The report includes:
- Case metadata (code name, status, priority, classification, lead investigator, dates, tags)
- Entities table (type, name, confidence, source, verified, description)
- Relations table (source, type, target, label, date)
- Chat history (capped at 200 messages)
- Activity log
- Findings and hypotheses

All generation happens client-side. No data leaves your browser.

---

## Timeline Auto-Generation

Open the **TIMELINE** module to see a chronological view of the active case. Events are auto-extracted from four sources:

1. **Entities** with `startDate` or `endDate` (manual or set via slash commands like `/wayback`).
2. **Relations** with a `date` field.
3. **Chat messages**: dates mentioned in user messages are extracted via regex (ISO 8601, US `MM/DD/YYYY`, EU `DD.MM.YYYY`, long form `March 15, 2024`, inverse long `15 March 2024`).
4. **Activity log** entries (each log has a timestamp).
5. **Vault file uploads** (using `uploadedAt`).
6. **Case creation** as a fallback milestone event so a fresh case isn't a blank timeline.

Twelve event types are color-coded: communication, movement, transaction, publication, meeting, breach, mention, evidence, milestone, critical, warning, generic.

The timeline supports timeline / list view modes, drag-to-scroll, zoom, play/pause animation, and pattern detection (gaps between events).

---

## Testing

End-to-end tests are powered by [Playwright](https://playwright.dev/) and cover the landing page, cold-start login, the three demo deep-links, and the shareable-case flow.

```bash
# Run the full E2E suite (builds + starts prod server automatically)
npm run test:e2e

# Interactive UI mode for local debugging
npm run test:e2e:ui
```

Continuous integration runs `lint`, `tsc --noEmit`, `next build`, and the Playwright suite on every push and pull request — see [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Known CORS limitations

Browser-based OSINT tools are constrained by the upstream API's CORS policy. Abster's slash commands behave as follows:

| Command | Without API key | With API key | CORS status |
|---------|-----------------|--------------|-------------|
| `/whois <domain>` | Works (free RDAP) | N/A | rdap.org sends `Access-Control-Allow-Origin: *` |
| `/dns <domain>` | Works (free Google DoH) | N/A | dns.google sends CORS headers |
| `/wayback <url>` | Works (closest snapshot) | N/A | archive.org/wayback/available sends CORS headers; the CDX API (full history) does NOT — we use the availability API instead |
| `/shodan <ip>` | Demo mode (canned data for 8.8.8.8 and 1.1.1.1) | Live mode blocked by CORS — api.shodan.io does not send `Access-Control-Allow-Origin` for browser requests. Use the [Shodan website](https://www.shodan.io/host/) directly, or route through the `osint-agent-skills` MCP server (which runs server-side and bypasses CORS). |
| `/hibp <email>` | Demo mode (3 sample emails) | Live mode blocked by CORS — haveibeenpwned.com does not send `Access-Control-Allow-Origin` for browser requests. Use the [HIBP website](https://haveibeenpwned.com/) directly, or route through the `osint-agent-skills` MCP server. |

The `/shodan` and `/hibp` live modes are the only commands that cannot run directly from the browser. The demo modes return realistic canned data so the UX is still functional; the limitation is documented here for transparency.

## Known Issues

- **`<img>` tags for blob URLs:** vault-file previews and entity avatars use raw `<img>` tags because `next/image` provides no optimization benefit for IndexedDB blob URLs. The `@next/next/no-img-element` rule is disabled for those three files via an ESLint override.
- **No user-facing error state for tool failures:** if a `/shodan` or `/whois` request fails (network error, CORS, invalid key), the error is shown in the chat as text but no retry button is offered. Use the slash command again to retry.

## 🤝 Contributing

Abster Intelligence is an open-source project and **contributions are welcome**. Whether it's a bug fix, a new provider integration, or a UI enhancement:

1. **Open an Issue:** Describe the feature or bug.
2. **Fork and Branch:** Create a branch for your fix.
3. **Submit a PR:** Ensure your code follows the strict typing rules (no `any`).

## 🛡️ Security Policy

As a tool built for investigators, we take security and privacy seriously.

* **Reporting Vulnerabilities:** If you discover a security vulnerability within Abster Intelligence, please **do not open a public issue**. Instead, report it via the Security tab or contact the maintainers directly.
* **Data Privacy:** Abster Intelligence does not collect telemetry. Your investigative data remains yours.

## 📜 License

This project is licensed under the **Apache License, Version 2.0** - see the [LICENSE](LICENSE) file for details.
