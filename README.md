# Abster Intelligence

![License](https://img.shields.io/badge/license-Apache--2.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

> Information wants to be free, but intelligence must remain private. 
> **Local-first OSINT workspace for investigators who can’t afford data leakage.**

![Abster Intelligence Graph Engine](public/images/1.png)

Abster Intelligence is a privacy-first investigation workspace for OSINT, GEOINT, and cyber research. Map entities in a live relationship graph, build timelines, analyze evidence, and query your case with your own LLM keys—without sending your investigations to a central database.

**Why it stands out:**
- **Local-first by default:** Cases, notes, evidence metadata, and provider settings stay in your browser via IndexedDB.
- **Zero-trust platform model:** Bring your own keys (BYOK). Your keys are not stored by us, and investigation data stays local unless you explicitly query a third-party provider.
- **Graph-native investigations:** Turn fragmented findings into connected entities, locations, and timelines using a dynamic D3.js engine.

---

## Security Model

Abster Intelligence operates under a strict data sovereignty paradigm:
* No Abster-hosted central case database is required or exists.
* Provider keys are configured directly by the user in the UI.
* The platform does not act as a mandatory data relay. When you use an external AI provider, your prompts go directly to them.

## Core Features

![OSINT Operations Dashboard](public/images/6.png)

* **Local-First Architecture:** Complete data sovereignty. All case work, chat history, and infrastructure evidence are stored safely in your browser using IndexedDB (Dexie.js). No middleman databases, no telemetry.

![Reports and Evidence Center](public/images/7.png)

* **Relational Graph Engine:** Interactive, physics-based network graphs powered by D3.js. Visualize interconnected nodes, geo-entities, and complex infrastructural relationships in real-time.

![Tactical GEOINT Map](public/images/3.png)

* **Multi-LLM Integration:** Query your OSINT findings using 10 providers (OpenAI, Anthropic, Gemini, DeepSeek, Groq, Mistral, Cohere, Azure OpenAI, OpenRouter, local Ollama) — bring your own keys, switch on the fly.

![Multi-LLM Chat Interface](public/images/2.png)

* **Automated Threat Timelines:** Auto-generation of events from investigative reports to track operations chronologically.

![Threat Timeline](public/images/4.png)

* **XSS-Shielded Interface:** Hardened UI with strict DOM sanitization (`isomorphic-dompurify`) ensuring protection against script injections in rendered markdown.

![OSINT Tools Grid](public/images/5.png)

## Security First: BYOK Model

![Security Configuration and BYOK](public/images/8.png)

**We do not possess or transmit your API keys.** Abster Intelligence operates on a strict **Bring Your Own Key (BYOK)** model to ensure absolute zero-trust operations.

* No sensitive keys are required or supported in public `.env` files.
* **UI Configuration:** You must configure your provider API credentials directly within the application's Setup/Settings UI.
* Keys are securely persisted in your local browser storage—they never leave your machine.

## Tech Stack

* **Core:** React 19 + Next.js 15 (App Router)
* **Styling:** Tailwind CSS
* **State Management:** Zustand
* **Database:** Dexie.js (IndexedDB wrapper)
* **Visualization:** D3.js

## Project Structure

Here is a high-level overview of the Abster Intelligence codebase architecture. The project follows a modular, feature-based approach within the Next.js App Router paradigm.

```text
abster-intelligence/
├── public/                 # Static assets and public resources
├── src/
│   ├── app/                # Next.js 15 App Router (Pages, Layouts, APIs)
│   ├── components/         # Core React Components
│   │   ├── chat/           # Modular Chat UI (ChatInput, ChatSidebar, ChatMessageList)
│   │   ├── ui/             # Reusable UI / Shadcn Elements
│   │   ├── abster-graph-v4.tsx # D3.js Relational Graph Engine
│   │   ├── abster-chat.tsx # Main Chat Orchestrator (Zustand/Dexie integration)
│   │   └── GeoIntMap.tsx   # Geospatial Intelligence Map Engine
│   ├── lib/                # Utilities (DOMPurify Security, Markdown parsing, Tools)
│   ├── store/              # Zustand global state definitions
│   └── data/               # Dexie.js (IndexedDB) Schema and DB connections
├── package.json            # Project dependencies and operational scripts
├── tailwind.config.ts      # Tailwind CSS configuration and theme
└── next.config.ts          # Next.js compiler and build configuration
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
Abster Intelligence works out-of-the-box for case management and graphing. To enable multi-LLM queries, you must configure your provider API keys (OpenAI, Anthropic, Gemini, DeepSeek, Local Ollama) directly within the application's Settings UI. No `.env` setup is required for core functionality.

---

## Testing

End-to-end tests are powered by [Playwright](https://playwright.dev/) and cover the landing page, cold-start login, and the three demo deep-links.

```bash
# Run the full E2E suite (builds + starts prod server automatically)
npm run test:e2e

# Interactive UI mode for local debugging
npm run test:e2e:ui
```

Continuous integration runs `lint`, `tsc --noEmit`, `next build`, and the Playwright suite on every push and pull request — see [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

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
