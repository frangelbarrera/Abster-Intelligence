# Abster Intelligence

> **Advanced OSINT Suite & Relational Data Visualization Engine**

![Abster Intelligence Graph Engine](public/images/1.png)

Abster Intelligence is a professional-grade, privacy-centric open-source intelligence (OSINT) platform. Built for analysts, cybersecurity researchers, and red teams, it combines multi-LLM capabilities with a powerful relational graph engine to map, analyze, and investigate complex data networks.

## Core Features

![Intelligence Dashboard](public/images/6.png)

* **Local-First Architecture:** Complete data sovereignty. All case work, chat history, and infrastructure evidence are stored safely in your browser using IndexedDB (Dexie.js). No middleman databases, no telemetry.

![Reports and Evidence Center](public/images/7.jpg)

* **Relational Graph Engine:** Interactive, physics-based network graphs powered by D3.js. Visualize interconnected nodes, geo-entities, and complex infrastructural relationships in real-time.

![Tactical GEOINT Map](public/images/3.png)

* **Multi-LLM Integration:** Query your intelligence data using multiple providers (OpenAI, Anthropic, Gemini, DeepSeek, Local Ollama) simultaneously.

![Multi-LLM Chat Interface](public/images/2.png)

* **Automated Threat Timelines:** Auto-generation of events from intelligence reports to track operations chronologically.

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

## Quick Start

Get the intelligence dashboard up and running locally in seconds:

```bash
# Clone the repository
git clone [https://github.com/frangelbarrera/Abster-Intelligence.git](https://github.com/frangelbarrera/Abster-Intelligence.git)
cd Abster-Intelligence

# Install dependencies
npm install

# Start the development server
npm run dev
