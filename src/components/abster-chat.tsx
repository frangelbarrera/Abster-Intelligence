"use client";

import { useState, useRef, useEffect, useCallback, Suspense, useMemo } from "react";
import { GoogleGenAI, Type } from "@google/genai";
import dynamic from "next/dynamic";
import { 
  FileText, Image as ImageIcon, File, Download, Trash2, UploadCloud, 
  FileArchive, FileCode, Search, Filter, MoreVertical, X, CheckCircle2,
  AlertCircle, Shield, FolderOpen, HardDrive, Zap, Eye, Maximize2
} from "lucide-react";
import { ChatSidebar } from './chat/ChatSidebar';
import { ChatMessageList } from './chat/ChatMessageList';
import { ChatInput } from './chat/ChatInput';
import { formatTime } from '../lib/utils';
import AbsterGraph from "./abster-graph-v4";
import AbsterDashboard from "./abster-case-manager";
import AbsterTimeline from "./abster-timeline";
import AbsterTools from "./abster-tools";
import AbsterNotes from "./abster-notes";
import AbsterReports from "./abster-reports";
import { useAbsterStore } from "../store/absterStore";

const GeoIntMap = dynamic(() => import("./GeoIntMap"), { ssr: false });

// ─── UTILS ────────────────────────────────────────────────────────────────────
import { generateId } from "../lib/utils";
const maskKey = (key: string) => key ? `••••••${key.slice(-3)}` : "";
const btoa_safe = (str: string) => { try { return btoa(str); } catch { return str; } };
const atob_safe = (str: string) => { try { return atob(str); } catch { return str; } };

interface Model {
  id: string;
  name: string;
  badge?: string;
}

interface ProviderMeta {
  label: string;
  color: string;
  dot: string;
  keyLabel: string;
  accessType: 'free' | 'advanced';
  capabilities: string[];
  defaultModels: Model[];
  keyLabel2?: string;
}

interface AIProvider {
  id: string;
  type: string;
  name: string;
  apiKey?: string;
  baseUrl?: string;
  selectedModel?: string;
  models: Model[];
  isWorking?: boolean;
  testing?: boolean;
  testResult?: { ok: boolean; models?: Model[]; error?: string } | null;
}

// ─── PROVIDER CONFIG ──────────────────────────────────────────────────────────
const PROVIDER_META: Record<string, ProviderMeta> = {
  gemini:     { label: "Gemini",     color: "#4285F4", dot: "", keyLabel: "API Key", accessType: "free", capabilities: ["vision", "document", "video", "audio"], defaultModels: [{ id: "gemini-1.5-flash", name: "gemini-1.5-flash" }, { id: "gemini-1.5-pro", name: "gemini-1.5-pro" }, { id: "gemini-2.0-flash", name: "gemini-2.0-flash" }] },
  deepseek:   { label: "DeepSeek",   color: "#FF6B35", dot: "", keyLabel: "API Key", accessType: "free", capabilities: ["text"], defaultModels: [{ id: "deepseek-chat", name: "deepseek-chat" }, { id: "deepseek-reasoner", name: "deepseek-reasoner" }] },
  groq:       { label: "Groq",       color: "#00C853", dot: "", keyLabel: "API Key", accessType: "free", capabilities: ["text"], defaultModels: [{ id: "llama-3.1-8b-instant", name: "llama-3.1-8b" }, { id: "llama-3.1-70b-versatile", name: "llama-3.1-70b" }, { id: "mixtral-8x7b-32768", name: "mixtral-8x7b" }, { id: "llama3-70b-8192", name: "llama3-70b" }] },
  ollama:     { label: "Ollama",     color: "#888888", dot: "", keyLabel: "Base URL", accessType: "free", capabilities: ["text"], defaultModels: [{ id: "llama3.2", name: "llama3.2" }, { id: "mistral", name: "mistral" }] },
  openrouter: { label: "OpenRouter", color: "#7C3AED", dot: "", keyLabel: "API Key", accessType: "free", capabilities: ["vision", "document"], defaultModels: [
    { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
    { id: "anthropic/claude-3-opus", name: "Claude 3 Opus" },
    { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku" },
    { id: "openai/gpt-4o", name: "GPT-4o" },
    { id: "openai/gpt-4o-mini", name: "GPT-4o mini" },
    { id: "openai/o1-preview", name: "o1-preview" },
    { id: "openai/o1-mini", name: "o1-mini" },
    { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash" },
    { id: "google/gemini-1.5-pro", name: "Gemini 1.5 Pro" },
    { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct" },
    { id: "meta-llama/llama-3.1-8b-instruct", name: "Llama 3.1 8B Instruct" },
    { id: "meta-llama/llama-3.1-405b-instruct", name: "Llama 3.1 405B Instruct" },
    { id: "mistralai/mixtral-8x7b-instruct", name: "Mixtral 8x7B Instruct" },
    { id: "mistralai/mistral-large-2407", name: "Mistral Large" },
    { id: "deepseek/deepseek-chat", name: "DeepSeek V3" },
    { id: "deepseek/deepseek-r1", name: "DeepSeek R1" },
    { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B Instruct" },
    { id: "qwen/qwq-32b-preview", name: "QwQ 32B Preview" },
    { id: "x-ai/grok-2-1212", name: "Grok 2" },
    { id: "liquid/lfm-40b", name: "Liquid LFM 40B" }
  ] },
  mistral:    { label: "Mistral",    color: "#FF7000", dot: "", keyLabel: "API Key", accessType: "free", capabilities: ["text"], defaultModels: [{ id: "mistral-small-latest", name: "mistral-small" }, { id: "mistral-medium-latest", name: "mistral-medium" }, { id: "open-mistral-nemo", name: "mistral-nemo" }] },
  openai:     { label: "OpenAI",     color: "#74AA9C", dot: "", keyLabel: "API Key", accessType: "advanced", capabilities: ["vision", "document"], defaultModels: [{ id: "gpt-4o", name: "GPT-4o" }, { id: "gpt-4-turbo", name: "GPT-4 Turbo" }, { id: "gpt-4o-mini", name: "GPT-4o mini" }, { id: "o1-preview", name: "o1-preview" }, { id: "o1-mini", name: "o1-mini" }] },
  anthropic:  { label: "Anthropic",  color: "#D97706", dot: "", keyLabel: "API Key", accessType: "advanced", capabilities: ["vision", "document"], defaultModels: [{ id: "claude-3-5-sonnet-20241022", name: "claude-3.5-sonnet" }, { id: "claude-3-5-haiku-20241022", name: "claude-3-5-haiku" }, { id: "claude-3-opus-20240229", name: "claude-3-opus" }, { id: "claude-3-sonnet-20240229", name: "claude-3-sonnet" }] },
  azure:      { label: "Azure OpenAI", color: "#0078D4", dot: "", keyLabel: "API Key", accessType: "advanced", keyLabel2: "Endpoint URL", capabilities: ["vision", "document"], defaultModels: [{ id: "gpt-4", name: "GPT-4" }, { id: "gpt-4-turbo", name: "GPT-4 Turbo" }, { id: "gpt-35-turbo", name: "GPT-3.5 Turbo" }] },
  cohere:     { label: "Cohere",     color: "#39594D", dot: "", keyLabel: "API Key", accessType: "advanced", capabilities: ["document"], defaultModels: [{ id: "command-r-plus", name: "Command R+" }, { id: "command-r", name: "Command R" }, { id: "command", name: "Command" }] },
};

const ADVANCED_CATALOG = [
  { type: "openai",    models: [{ id: "gpt-4o", name: "GPT-4o", badge: "Most capable" }, { id: "gpt-4-turbo", name: "GPT-4 Turbo" }, { id: "gpt-4o-mini", name: "GPT-4o mini", badge: "Fast" }, { id: "o1-preview", name: "o1-preview", badge: "Reasoning" }, { id: "o1-mini", name: "o1-mini" }] },
  { type: "anthropic", models: [{ id: "claude-3-5-sonnet-20241022", name: "claude-3.5-sonnet", badge: "Top" }, { id: "claude-3-5-haiku-20241022", name: "claude-3.5-haiku", badge: "Fast" }, { id: "claude-3-opus-20240229", name: "claude-3-opus", badge: "Most powerful" }] },
  { type: "azure",     models: [{ id: "gpt-4", name: "GPT-4" }, { id: "gpt-4-turbo", name: "GPT-4 Turbo" }, { id: "gpt-35-turbo", name: "GPT-3.5 Turbo" }] },
  { type: "cohere",    models: [{ id: "command-r-plus", name: "Command R+", badge: "RAG" }, { id: "command-r", name: "Command R" }] },
];

const createAdapter = (provider: AIProvider) => {
  const key = provider.apiKey ? atob_safe(provider.apiKey) : "";
  const streamText = async (
    messages: { role: string; content: string }[], 
    onChunk: (chunk: string) => void, 
    onDone: () => void, 
    onError: (err: string) => void, 
    contextData = ""
  ) => {
    const userMessages = messages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
    try {
      if (provider.type === "gemini") {
        const ai = new GoogleGenAI({ apiKey: key });
        const modelId = provider.selectedModel || provider.models[0]?.id || "gemini-2.0-flash";
        
        let systemInstruction = "You are Abster AI, an advanced intelligence assistant. Respond concisely and professionally.";
        if (contextData) {
          systemInstruction += `\n\nCurrent investigation context (Entities and Relationships):\n${contextData}`;
        }

        const contents = userMessages.map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        }));

        const responseStream = await ai.models.generateContentStream({
          model: modelId,
          contents: contents,
          config: { systemInstruction }
        });

        for await (const chunk of responseStream) {
          if (chunk.text) onChunk(chunk.text);
        }
        onDone();
        return;
      }

      let url, headers, body;
      if (provider.type === "groq") {
        url = "https://api.groq.com/openai/v1/chat/completions";
        headers = { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
        body = JSON.stringify({ model: provider.selectedModel || provider.models[0]?.id || "llama-3.1-8b-instant", messages: userMessages, stream: true });
      } else if (provider.type === "deepseek") {
        url = "https://api.deepseek.com/chat/completions";
        headers = { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
        body = JSON.stringify({ model: provider.selectedModel || "deepseek-chat", messages: userMessages, stream: true });
      } else if (provider.type === "ollama") {
        const base = (provider.baseUrl || "http://localhost:11434").replace(/\/$/, "");
        url = `${base}/api/chat`;
        headers = { "Content-Type": "application/json" };
        body = JSON.stringify({ model: provider.selectedModel || provider.models[0]?.id || "llama3.2", messages: userMessages, stream: true });
      } else if (provider.type === "openrouter") {
        url = "https://openrouter.ai/api/v1/chat/completions";
        headers = { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "HTTP-Referer": "https://abster.intel", "X-Title": "Abster Intelligence" };
        body = JSON.stringify({ model: provider.selectedModel || provider.models[0]?.id || "openai/gpt-4o-mini", messages: userMessages, stream: true });
      } else if (provider.type === "mistral") {
        url = "https://api.mistral.ai/v1/chat/completions";
        headers = { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
        body = JSON.stringify({ model: provider.selectedModel || "mistral-small-latest", messages: userMessages, stream: true });
      } else if (provider.type === "openai") {
        url = "https://api.openai.com/v1/chat/completions";
        headers = { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
        const model = provider.selectedModel || "gpt-4o";
        const isO1 = model.startsWith("o1");
        body = JSON.stringify({ model, messages: userMessages, ...(isO1 ? {} : { stream: true }) });
        if (isO1) {
          const resp2 = await fetch(url, { method: "POST", headers, body });
          if (!resp2.ok) { const err = await resp2.text(); onError(`Error ${resp2.status}: ${err.slice(0,200)}`); return; }
          const data = await resp2.json();
          const content = data.choices?.[0]?.message?.content || "";
          onChunk(content); onDone(); return;
        }
      } else if (provider.type === "anthropic") {
        url = "https://api.anthropic.com/v1/messages";
        headers = { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" };
        body = JSON.stringify({ model: provider.selectedModel || "claude-3-5-sonnet-20241022", max_tokens: 4096, messages: userMessages, stream: true });
      } else if (provider.type === "azure") {
        const azureUrl = provider.baseUrl || "";
        const modelDep = provider.selectedModel || "gpt-4";
        url = `${azureUrl}/openai/deployments/${modelDep}/chat/completions?api-version=2024-02-15-preview`;
        headers = { "Content-Type": "application/json", "api-key": key };
        body = JSON.stringify({ messages: userMessages, stream: true });
      } else if (provider.type === "cohere") {
        url = "https://api.cohere.com/v2/chat";
        headers = { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
        body = JSON.stringify({ model: provider.selectedModel || "command-r-plus", messages: userMessages, stream: true });
      }
      const resp = await fetch(url, { method: "POST", headers, body });
      if (!resp.ok) { const err = await resp.text(); onError(`Error ${resp.status}: ${err.slice(0,200)}`); return; }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          const jsonStr = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed;
          try {
            const parsed = JSON.parse(jsonStr);
            let chunk = "";
            if (provider.type === "gemini") chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
            else if (provider.type === "ollama") chunk = parsed.message?.content || "";
            else if (provider.type === "anthropic") chunk = parsed.delta?.text || parsed.content_block?.text || "";
            else if (provider.type === "cohere") chunk = parsed.delta?.message?.content?.text || "";
            else chunk = parsed.choices?.[0]?.delta?.content || "";
            if (chunk) onChunk(chunk);
          } catch {}
        }
      }
      onDone();
    } catch (err) { onError(err.message || "Connection error"); }
  };
  const testConnection = async () => {
    try {
      if (provider.type === "ollama") {
        const base = (provider.baseUrl || "http://localhost:11434").replace(/\/$/, "");
        const resp = await fetch(`${base}/api/tags`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        return { ok: true, models: (data.models || []).map(m => ({ id: m.name, name: m.name })) };
      }
      if (provider.type === "gemini") {
        try {
          const ai = new GoogleGenAI({ apiKey: key });
          await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: "test"
          });
          return { ok: true, models: PROVIDER_META.gemini.defaultModels };
        } catch (err) {
          throw new Error(err.message || "Error connecting to Gemini");
        }
      }
      if (provider.type === "groq") {
        const resp = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${key}` } });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        return { ok: true, models: data.data.map(m => ({ id: m.id, name: m.id })) };
      }
      if (provider.type === "openrouter") {
        const resp = await fetch("https://openrouter.ai/api/v1/models", { headers: { Authorization: `Bearer ${key}` } });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        return { ok: true, models: data.data.slice(0, 50).map(m => ({ id: m.id, name: m.name || m.id })) };
      }
      if (provider.type === "mistral") {
        const resp = await fetch("https://api.mistral.ai/v1/models", { headers: { Authorization: `Bearer ${key}` } });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        return { ok: true, models: data.data.map(m => ({ id: m.id, name: m.id })) };
      }
      if (provider.type === "deepseek") {
        const resp = await fetch("https://api.deepseek.com/models", { headers: { Authorization: `Bearer ${key}` } });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        return { ok: true, models: (data.data || []).map(m => ({ id: m.id, name: m.id })) };
      }
      if (provider.type === "openai") {
        const resp = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const wanted = ["gpt-4o", "gpt-4-turbo", "gpt-4o-mini", "gpt-4", "o1-preview", "o1-mini", "gpt-3.5-turbo"];
        const filtered = (data.data || []).filter(m => wanted.some(w => m.id.startsWith(w))).map(m => ({ id: m.id, name: m.id }));
        return { ok: true, models: filtered.length ? filtered : PROVIDER_META.openai.defaultModels };
      }
      if (provider.type === "anthropic") {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
          body: JSON.stringify({ model: "claude-3-5-haiku-20241022", max_tokens: 1, messages: [{ role: "user", content: "hi" }] })
        });
        if (resp.status === 401 || resp.status === 403) throw new Error(`Invalid API key (${resp.status})`);
        return { ok: true, models: PROVIDER_META.anthropic.defaultModels };
      }
      if (provider.type === "azure") {
        const azureUrl = provider.baseUrl || "";
        if (!azureUrl) throw new Error("Endpoint URL is required");
        return { ok: true, models: PROVIDER_META.azure.defaultModels };
      }
      if (provider.type === "cohere") {
        const resp = await fetch("https://api.cohere.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        return { ok: true, models: (data.models || []).map(m => ({ id: m.name, name: m.name })) };
      }
      return { ok: false, models: [] };
    } catch (err) { return { ok: false, error: err.message }; }
  };
  return { streamText, testConnection };
};

// Markdown rendering moved to src/lib/markdown.ts

const DEMO_CHATS = [
  {
    id: "c1", title: "Operation Red Ghost", createdAt: new Date("2024-01-15"), updatedAt: new Date("2024-01-15T12:00:00Z"), caseId: "1", metadata: { totalMessages: 4, fileCount: 3 },
    messages: [
      { id: "m1", role: "user", content: "I need to investigate Viktor Kozlov, suspected of money laundering. Email: vkozlov@protonmail.com", timestamp: new Date("2024-01-15T10:05:00").getTime(), attachments: [], provider: null },
      { id: "m2", role: "assistant", content: "# Initial Analysis: Viktor Kozlov\n\n**Indicators detected:**\n- ProtonMail frequently used in operations requiring anonymity\n- Handle pattern suggests real name (possible poor OPSEC)\n\n**Next steps:**\n1. Search in data breach databases\n2. OSINT on social media by full name\n3. Search for offshore corporate records\n\nDo you have a date of birth or nationality?", timestamp: new Date("2024-01-15T10:05:30").getTime(), attachments: [], provider: "demo" },
      { id: "m3", role: "user", content: "Here is a photo I found on LinkedIn", timestamp: new Date("2024-01-15T10:10:00").getTime(), attachments: [{ id: "a1", name: "kozlov_linkedin.jpg", type: "image", size: 245000 }], provider: null },
      { id: "m4", role: "assistant", content: "Image received. Running EXIF metadata analysis...\n\n**Analysis:**\n- Format: JPEG, 2.4MP\n- EXIF: No geolocation (metadata purged)\n\n**Recommendation:** Use the **GeoInt** module for background analysis and shadow patterns.", timestamp: new Date("2024-01-15T10:11:00").getTime(), attachments: [], provider: "demo" },
    ],
  },
  {
    id: "c2", title: "Domain Analysis darkweb-exchange.io", createdAt: new Date("2024-01-18"), updatedAt: new Date("2024-01-18T15:00:00Z"), caseId: "2", metadata: { totalMessages: 2, fileCount: 0 },
    messages: [
      { id: "m5", role: "user", content: "Analyze the domain darkweb-exchange.io for me", timestamp: new Date("2024-01-18T14:00:00").getTime(), attachments: [], provider: null },
      { id: "m6", role: "assistant", content: "# Report: darkweb-exchange.io\n\n**WHOIS:**\n```\nRegistrar: Namecheap (proxy)\nCreated: 2023-11-02\nNS: cloudflare.com\n```\n\n**Risk indicators:** 🔴 HIGH\n- Illicit market keywords\n- Registered with full privacy\n- No web history prior to registration", timestamp: new Date("2024-01-18T14:01:00").getTime(), attachments: [], provider: "demo" },
    ],
  },
  {
    id: "c3", title: "Social Network Infiltration @phantom_trader", createdAt: new Date("2024-01-20"), updatedAt: new Date("2024-01-20T10:00:00Z"), caseId: "3", metadata: { totalMessages: 2, fileCount: 1 },
    messages: [
      { id: "m9", role: "user", content: "Investigate the account @phantom_trader, seems to coordinate a pump & dump scheme", timestamp: new Date("2024-01-20T09:00:00").getTime(), attachments: [], provider: null },
      { id: "m10", role: "assistant", content: "**Analysis @phantom_trader:**\n- Account created: March 2022 | Followers: 12,400\n- Posts 02:00-04:00 UTC (suspicious)\n- Spikes before movements in $DOGE, $SHIB\n- Abnormally high engagement (likely bots)\n\n**Connections:** 3 accounts with similar patterns detected.", timestamp: new Date("2024-01-20T09:01:30").getTime(), attachments: [], provider: "demo" },
    ],
  },
];

const MODULES = [
  { id: "geoint", icon: "", name: "GeoInt", color: "#EF4444" },
  { id: "graph", icon: "", name: "Graph", color: "#3B82F6" },
  { id: "tools", icon: "", name: "Tools", color: "#F59E0B" },
  { id: "dashboard", icon: "", name: "Dashboard", color: "#10B981" },
  { id: "timeline", icon: "", name: "Timeline", color: "#8B5CF6" },
  { id: "notes", icon: "", name: "Notes", color: "#F87171" },
  { id: "vault", icon: "", name: "Reports", color: "#EC4899" },
];

const DEMO_RESPONSES = [
  "Analyzing the request with OSINT focus...\n\n**Identified vectors:**\n- Open sources: LinkedIn, Twitter/X, corporate records\n- Digital exposure level: **MEDIUM-HIGH**\n\n**Findings:**\n1. Presence on networks under name variants detected\n2. Corporate records in 2 jurisdictions\n3. Email in 1 known breach (2021)\n\n> Activate **Deep Research** to dive into specialized sources.",
  "Executing intelligence analysis...\n\n```json\n{\n  \"risk_score\": 7.4,\n  \"confidence\": 0.82,\n  \"sources_checked\": 14\n}\n```\n\n**Summary:** **High risk** patterns confirmed. Connections with 3 entities under regulatory scrutiny.\n\n**Next step:** Cross-reference with OFAC/international sanctions.",
  "Processing OSINT request...\n\nOperations network with at least **5 distinct entities** involved.\n\n**Connections map:**\n- Central node → 2 offshore companies\n- Flows to: Cyprus, Dubai, Singapore\n- Activity concentrated between 2020-2023\n\nUse the **Graph** module to visualize the relationships.",
];
let demoIdx = 0;

const btnPri = { background: "#fff", border: "none", borderRadius: 6, color: "#000", fontSize: 11, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 };
const btnSec = { background: "none", border: "1px solid #1a1a1a", borderRadius: 6, color: "#a0a0a0", fontSize: 11, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit" };

export default function AbsterChat() {
  const { 
    entities, 
    setActiveCase, 
    addCase, 
    cases, 
    chats, 
    vaultFiles, 
    addChat, 
    updateChat, 
    removeChat, 
    addVaultFile, 
    removeVaultFile,
    currentUser
  } = useAbsterStore();
  
  const [mounted, setMounted] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showGeoInt, setShowGeoInt] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showReports, setShowReports] = useState(false);
  
  const [activeChatId, setActiveChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [deepSearch, setDeepSearch] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamError, setStreamError] = useState(null);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [newChatModal, setNewChatModal] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [providers, setProviders] = useState([]);
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [advancedAddModal, setAdvancedAddModal] = useState(null);

  const stopStreamRef = useRef(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const renameInputRef = useRef(null);

  // Load from Dexie on mount
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (!currentUser) {
        setMounted(true);
        return;
      }
      try {
        const { db } = await import('../lib/db');
        const settings = await db.settings.get('current_user_settings');
        if (settings && isMounted) {
          if (settings.providers) setProviders(settings.providers);
          if (settings.selectedProviderId) setSelectedProviderId(settings.selectedProviderId);
          if (settings.selectedModelId) setSelectedModelId(settings.selectedModelId);
          if (settings.activeChatId) setActiveChatId(settings.activeChatId);
        }
      } catch (e) {
        console.error("Error loading from local DB", e);
      } finally {
        if (isMounted) setMounted(true);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [currentUser]);

  // Set initial active chat if none selected
  useEffect(() => {
    if (mounted && !activeChatId && chats.length > 0) {
      setActiveChatId(chats[0].id);
    }
  }, [mounted, activeChatId, chats]);

  // Save to Dexie on change
  useEffect(() => {
    if (mounted && currentUser) {
      import('../lib/db').then(({ db }) => {
        db.settings.put({
          id: 'current_user_settings',
          providers,
          selectedProviderId,
          selectedModelId,
          activeChatId,
          apiKeys: {} // Keep existing keys if any, though we might need to merge
        }).catch(e => console.error("Error saving to local DB", e));
      });
    }
  }, [providers, selectedProviderId, selectedModelId, activeChatId, mounted, currentUser]);

  useEffect(() => {
    if (!showDashboard) {
      const chat = chats.find(c => c.id === activeChatId);
      if (chat && chat.caseId) {
        setActiveCase(chat.caseId);
      }
    }
  }, [activeChatId, chats, setActiveCase, showDashboard]);

  const activeChat = chats.find((c) => c.id === activeChatId);
  const filteredChats = chats.filter((c) => c.title.toLowerCase().includes(sidebarSearch.toLowerCase()));
  const selectedProvider = providers.find((p) => p.id === selectedProviderId);
  const selectedModel = selectedProvider?.models?.find((m) => m.id === selectedModelId);
  const hasProviders = providers.length > 0;

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeChat?.messages, streamingText]);
  useEffect(() => { if (renaming && renameInputRef.current) renameInputRef.current.focus(); }, [renaming]);
  useEffect(() => {
    const close = (e) => { setModelDropdownOpen(false); setContextMenu(null); };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() && pendingAttachments.length === 0) return;
    if (isStreaming) return;
    const userMsg = {
      id: generateId(), role: "user", content: inputValue, timestamp: new Date().getTime(),
      attachments: pendingAttachments.map((f) => {
        let type = "document";
        if (f.type?.startsWith("image")) type = "image";
        if (f.type?.startsWith("video")) type = "video";
        if (f.type?.startsWith("audio")) type = "audio";
        return { id: generateId(), name: f.name, type, size: f.size };
      }),
      provider: null,
    };
    if (pendingAttachments.length > 0) {
      pendingAttachments.forEach(f => {
        let type = "document";
        if (f.type?.startsWith("image")) type = "image";
        if (f.type?.startsWith("video")) type = "video";
        if (f.type?.startsWith("audio")) type = "audio";
        addVaultFile({
          id: generateId(),
          name: f.name,
          type,
          size: f.size,
          uploadedAt: new Date().toISOString(),
          chatId: activeChatId!,
          ownerId: currentUser?.uid!,
          data: f // Store the actual File object
        });
      });
    }
    const updatedMessages = [...(activeChat?.messages || []), userMsg];
    updateChat(activeChatId!, { messages: updatedMessages });
    
    setInputValue("");
    setPendingAttachments([]);
    setStreamError(null);
    setIsStreaming(true);
    setStreamingText("");
    stopStreamRef.current = false;
    if (selectedProvider && selectedModelId) {
      const providerWithModel = { ...selectedProvider, selectedModel: selectedModelId };
      const adapter = createAdapter(providerWithModel);
      let fullText = "";
      
      const { entities, relations } = useAbsterStore.getState();
      const caseEntities = entities.filter(e => e.caseId === activeChat?.caseId);
      const caseRelations = relations.filter(r => r.caseId === activeChat?.caseId);
      const contextData = `Entities: ${JSON.stringify(caseEntities.map(e => ({ name: e.name, type: e.type, notes: e.notes })))}\nRelationships: ${JSON.stringify(caseRelations.map(r => ({ source: r.source, target: r.target, type: r.label })))}`;

      await adapter.streamText(
        updatedMessages.filter((m) => m.role !== "system"),
        (chunk) => { if (stopStreamRef.current) return; fullText += chunk; setStreamingText(fullText); },
        () => {
          setIsStreaming(false);
          const msg = { id: generateId(), role: "assistant", content: fullText, timestamp: new Date().getTime(), attachments: [], provider: selectedProviderId, modelId: selectedModelId };
          updateChat(activeChatId!, { 
            messages: [...updatedMessages, msg], 
            metadata: { ...activeChat?.metadata, totalMessages: (activeChat?.metadata?.totalMessages || 0) + 2 } 
          });
          setStreamingText("");
        },
        (err) => { setIsStreaming(false); setStreamError(err); setStreamingText(""); },
        contextData
      );
    } else {
      const text = DEMO_RESPONSES[demoIdx++ % DEMO_RESPONSES.length];
      let i = 0;
      const interval = setInterval(() => {
        if (stopStreamRef.current) { clearInterval(interval); setIsStreaming(false); setStreamingText(""); return; }
        if (i < text.length) { setStreamingText(text.slice(0, ++i)); }
        else {
          clearInterval(interval); setIsStreaming(false);
          const msg = { id: generateId(), role: "assistant", content: text, timestamp: new Date().getTime(), attachments: [], provider: "demo", modelId: null };
          updateChat(activeChatId!, { messages: [...updatedMessages, msg] });
          setStreamingText("");
        }
      }, 10);
    }
  }, [inputValue, pendingAttachments, isStreaming, activeChatId, activeChat, selectedProvider, selectedModelId, selectedProviderId, addVaultFile, updateChat, currentUser?.uid]);

  const stopStream = () => {
    stopStreamRef.current = true; setIsStreaming(false);
    if (streamingText) {
      const msg = { id: generateId(), role: "assistant", content: streamingText, timestamp: new Date().getTime(), attachments: [], provider: selectedProviderId };
      updateChat(activeChatId!, { messages: [...(activeChat?.messages || []), msg] });
    }
    setStreamingText("");
  };

  const createChat = () => {
    const title = newChatTitle.trim() || `Investigation ${chats.length + 1}`;
    const newCaseId = generateId();
    const newChatId = generateId();
    
    addCase({
      id: newCaseId,
      codeName: `CASE-${newCaseId.toUpperCase()}`,
      title: title,
      description: "Case generated automatically from chat.",
      priority: "medium",
      status: "active",
      classification: "confidential",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      leadInvestigator: "Current User",
      team: [],
      stats: { entityCount: 0, locationCount: 0, eventCount: 0, toolResultsCount: 0, evidenceCount: 0 },
      tags: [],
      findings: "",
      linkedCases: [],
      template: null,
      checklist: [],
      hypotheses: [],
      activityLog: [],
      settings: {}
    });

    addChat({ 
      id: newChatId, 
      title, 
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString(), 
      caseId: newCaseId, 
      ownerId: currentUser?.uid!,
      metadata: { totalMessages: 0, fileCount: 0 }, 
      messages: [] 
    });
    
    setActiveChatId(newChatId); 
    setNewChatModal(false); 
    setNewChatTitle("");
  };
  const deleteChatAction = (id: string) => { 
    removeChat(id); 
    if (activeChatId === id) setActiveChatId(chats.find((c) => c.id !== id)?.id || null); 
    setDeleteConfirm(null); 
  };
  const renameChatAction = (id: string, title: string) => { 
    updateChat(id, { title }); 
    setRenaming(null); 
  };
  const duplicateChatAction = (id: string) => { 
    const o = chats.find((c) => c.id === id); 
    if (!o) return; 
    const newId = generateId();
    addChat({ 
      ...o, 
      id: newId, 
      title: `${o.title} (copy)`, 
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString(),
      messages: o.messages.map(m => ({ ...m, id: generateId() }))
    }); 
    setContextMenu(null); 
  };
  const getModelCapabilities = () => {
    if (!selectedProviderId) return ["text"];
    const p = providers.find((x) => x.id === selectedProviderId);
    if (!p) return ["text"];
    return PROVIDER_META[p.type]?.capabilities || ["text"];
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const caps = getModelCapabilities();
    const validFiles = Array.from(files).filter((file) => {
      const type = file.type;
      if (type.startsWith('image/') && !caps.includes('vision')) {
        alert(`The current model does not support images. Switch to a vision-capable model (e.g., GPT-4o, Gemini).`);
        return false;
      }
      if (type.startsWith('video/') && !caps.includes('video')) {
        alert(`The current model does not support video. Switch to Gemini 1.5 Pro/Flash.`);
        return false;
      }
      if (type.startsWith('audio/') && !caps.includes('audio')) {
        alert(`The current model does not support audio. Switch to Gemini 1.5 Pro/Flash.`);
        return false;
      }
      if ((type === 'application/pdf' || type.startsWith('text/')) && !caps.includes('document')) {
        alert(`The current model does not support documents directly. Switch to a compatible model.`);
        return false;
      }
      return true;
    });
    
    if (validFiles.length > 0) {
      setPendingAttachments((prev) => [...prev, ...validFiles]);
    }
  };
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files); };
  const addProvider = (p: Partial<AIProvider>) => {
    const newP: AIProvider = { 
      ...p, 
      id: generateId(), 
      isWorking: false, 
      models: PROVIDER_META[p.type!]?.defaultModels || [],
      type: p.type!,
      name: p.name || PROVIDER_META[p.type!]?.label
    };
    setProviders((prev) => [...prev, newP]);
  };
  const updateProvider = (id: string, updates: Partial<AIProvider>) => setProviders((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } : p));
  const removeProvider = (id: string) => { setProviders((prev) => prev.filter((p) => p.id !== id)); if (selectedProviderId === id) { setSelectedProviderId(null); setSelectedModelId(null); } };
  const testProvider = async (id: string) => {
    const p = providers.find((x) => x.id === id);
    if (!p) return;
    updateProvider(id, { testing: true, testResult: null });
    const adapter = createAdapter(p);
    const result = await adapter.testConnection();
    updateProvider(id, { testing: false, isWorking: result.ok, testResult: result, models: result.ok && result.models?.length ? result.models : (p.models || PROVIDER_META[p.type]?.defaultModels || []) });
  };

  const handleDirectUpload = (files: FileList | null) => {
    if (!activeChatId || !currentUser || !files) return;
    Array.from(files).forEach((f) => {
      let type = "document";
      if (f.type?.startsWith("image")) type = "image";
      if (f.type?.startsWith("video")) type = "video";
      if (f.type?.startsWith("audio")) type = "audio";
      
      addVaultFile({
        id: generateId(),
        name: f.name,
        type,
        size: f.size,
        uploadedAt: new Date().toISOString(),
        chatId: activeChatId,
        ownerId: currentUser.uid,
        data: f // Store the actual File object (Blob)
      });
    });
  };

  const vaultFilesForChat = vaultFiles.filter((f) => f.chatId === activeChatId);
  const getProviderBadge = (providerId, modelId) => {
    if (providerId === "demo") return { label: "demo", color: "#525252" };
    const p = providers.find((x) => x.id === providerId);
    if (!p) return null;
    const meta = PROVIDER_META[p.type];
    const m = p.models?.find((x) => x.id === modelId);
    return { label: m?.name || p.name, color: meta?.color || "#666" };
  };

  const suggestedPrompts = ["Analyze this suspicious domain", "Investigate this person on social media", "Check if this email has breaches", "Extract metadata from this image"];

  return (
    <div style={{ fontFamily: "'JetBrains Mono','Fira Code',monospace", background: "#000", color: "#fff", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
      onClick={() => { setContextMenu(null); setModelDropdownOpen(false); }}>

      <div style={{ borderBottom: "1px solid #1a1a1a", padding: "0 14px", height: 44, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <button onClick={() => setSidebarOpen((s) => !s)}
          style={{ background: "none", border: "1px solid #1a1a1a", borderRadius: 6, color: "#a0a0a0", cursor: "pointer", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0, transition: "all 0.15s" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="4" height="12" rx="1" fill="currentColor" opacity={sidebarOpen ? "0.6" : "0.25"} />
            <rect x="7" y="3" width="6" height="1.5" rx="0.75" fill="currentColor" />
            <rect x="7" y="6.25" width="6" height="1.5" rx="0.75" fill="currentColor" />
            <rect x="7" y="9.5" width="6" height="1.5" rx="0.75" fill="currentColor" />
          </svg>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 22, height: 22, background: "#000", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: "bold", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6 }}>A</div>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em" }}>ABSTER</span>
          <span style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em" }}>INTELLIGENCE</span>
          <span style={{ marginLeft: 8, fontSize: 9, color: "#10B981", background: "rgba(16,185,129,0.1)", padding: "2px 6px", borderRadius: 4 }}>
            {entities.length} GLOBAL ENTITIES
          </span>
        </div>
        <div style={{ flex: 1 }} />
        {!hasProviders && (
          <button onClick={() => setSettingsOpen(true)} style={{ fontSize: 9, color: "#F59E0B", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit" }}>
            ⚠ Configure an AI provider
          </button>
        )}
        <div style={{ display: "flex", gap: 4, alignItems: "center", marginRight: 16 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: hasProviders ? "#10B981" : "#333" }} />
          <span style={{ fontSize: 9, color: "#525252" }}>{hasProviders ? `${providers.filter(p => p.isWorking).length} ACTIVE` : "DEMO MODE"}</span>
        </div>
        <button 
          onClick={() => {
            localStorage.removeItem('abster_local_session');
            window.location.reload();
          }} 
          style={{ 
            fontSize: 10, 
            color: "#a0a0a0", 
            background: "transparent", 
            border: "1px solid #333", 
            borderRadius: 6, 
            padding: "4px 10px", 
            cursor: "pointer", 
            fontFamily: "inherit",
            transition: "all 0.2s"
          }}
          onMouseOver={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#666"; }}
          onMouseOut={(e) => { e.currentTarget.style.color = "#a0a0a0"; e.currentTarget.style.borderColor = "#333"; }}
        >
          Logout
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <ChatSidebar 
          sidebarOpen={sidebarOpen}
          sidebarSearch={sidebarSearch}
          setSidebarSearch={setSidebarSearch}
          filteredChats={filteredChats}
          activeChatId={activeChatId}
          setActiveChatId={setActiveChatId}
          renaming={renaming}
          setRenaming={setRenaming}
          renameInputRef={renameInputRef}
          renameValue={renameValue}
          setRenameValue={setRenameValue}
          renameChatAction={renameChatAction}
          mounted={mounted}
          formatTime={formatTime}
          cases={cases}
          setContextMenu={setContextMenu}
          setNewChatModal={setNewChatModal}
          chats={chats}
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
          {dragOver && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(59,130,246,0.07)", border: "2px dashed #3B82F6", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <span style={{ fontSize: 13, color: "#3B82F6" }}>Drop files here</span>
            </div>
          )}

          {activeChat ? (
            <>
              <div style={{ padding: "0 16px", height: 44, display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
                {editingTitle ? (
                  <input value={editTitleValue} onChange={(e) => setEditTitleValue(e.target.value)}
                  onBlur={() => { renameChatAction(activeChat.id, editTitleValue || activeChat.title); setEditingTitle(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { renameChatAction(activeChat.id, editTitleValue); setEditingTitle(false); } if (e.key === "Escape") setEditingTitle(false); }}
                    style={{ background: "#111", border: "1px solid #333", borderRadius: 4, color: "#fff", fontSize: 12, padding: "3px 8px", fontFamily: "inherit", outline: "none" }} autoFocus />
                ) : (
                  <span onClick={() => { setEditTitleValue(activeChat.title); setEditingTitle(true); }} style={{ fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{activeChat.title}</span>
                )}
                {activeChat.caseId && <span style={{ fontSize: 9, color: "#525252", background: "#111", padding: "2px 6px", borderRadius: 10, border: "1px solid #1a1a1a" }}>{cases.find(c => c.id === activeChat.caseId)?.codeName || activeChat.caseId}</span>}
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 9, color: "#333" }}>{activeChat.metadata?.totalMessages || 0} msg</span>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                <ChatMessageList 
                  messages={activeChat.messages}
                  isStreaming={isStreaming}
                  streamingText={streamingText}
                  streamError={streamError}
                  suggestedPrompts={suggestedPrompts}
                  hasProviders={hasProviders}
                  setInputValue={setInputValue}
                  setSettingsOpen={setSettingsOpen}
                  messagesEndRef={messagesEndRef}
                  getProviderBadge={getProviderBadge}
                  clearStreamError={() => setStreamError(null)}
                />
              </div>

              <ChatInput 
                pendingAttachments={pendingAttachments}
                setPendingAttachments={setPendingAttachments}
                fileInputRef={fileInputRef}
                getModelCapabilities={getModelCapabilities}
                deepSearch={deepSearch}
                setDeepSearch={setDeepSearch}
                modelDropdownOpen={modelDropdownOpen}
                setModelDropdownOpen={setModelDropdownOpen}
                selectedModel={selectedModel}
                providers={providers}
                selectedProviderId={selectedProviderId}
                selectedModelId={selectedModelId}
                setSelectedProviderId={setSelectedProviderId}
                setSelectedModelId={setSelectedModelId}
                setAdvancedAddModal={setAdvancedAddModal}
                inputRef={inputRef}
                inputValue={inputValue}
                setInputValue={setInputValue}
                sendMessage={sendMessage}
                isStreaming={isStreaming}
                stopStream={stopStream}
                renderModelDropdown={() => (
                  <ModelDropdown
                    providers={providers}
                    selectedProviderId={selectedProviderId}
                    selectedModelId={selectedModelId}
                    onSelect={(pid: string, mid: string) => { setSelectedProviderId(pid); setSelectedModelId(mid); setModelDropdownOpen(false); }}
                    onAdvancedClick={(type: string, modelId: string, modelName: string) => { setModelDropdownOpen(false); setAdvancedAddModal({ type, modelId, modelName }); }}
                  />
                )}
              />
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 12 }}>Select an investigation</div>
          )}
        </div>

        <div style={{ width: 192, background: "#000", borderLeft: "1px solid #1a1a1a", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>
          {vaultOpen ? (
            <ReportsPanel 
              files={vaultFilesForChat} 
              onClose={() => setVaultOpen(false)} 
              onUpload={handleDirectUpload} 
              onDelete={removeVaultFile}
              onExpand={() => { setVaultOpen(false); setShowReports(true); }}
            />
          ) : (
            <>
              {activeChat?.caseId && (
                <div style={{ padding: "10px 12px", borderBottom: "1px solid #1a1a1a" }}>
                  <div style={{ fontSize: 8, color: "#444", letterSpacing: "0.12em", marginBottom: 3 }}>ACTIVE CASE</div>
                  <div style={{ fontSize: 11, color: "#fff", fontWeight: 600, marginBottom: 4 }}>{cases.find(c => c.id === activeChat.caseId)?.codeName || activeChat.caseId}</div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#10B981" }} />
                    <span style={{ fontSize: 9, color: "#525252" }}>Active · {vaultFilesForChat.length} files</span>
                  </div>
                </div>
              )}
              <div style={{ flex: 1, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
                <div style={{ fontSize: 8, color: "#333", letterSpacing: "0.1em", marginBottom: 4, padding: "0 2px" }}>MODULES</div>
                {MODULES.map((mod) => (
                  mod.id === "vault"
                    ? <ModuleBtn key={mod.id} mod={mod} badge={vaultFilesForChat.length} onClick={() => setVaultOpen(true)} />
                    : mod.id === "graph"
                    ? <ModuleBtn key={mod.id} mod={mod} onClick={() => setShowGraph(true)} />
                    : mod.id === "dashboard"
                    ? <ModuleBtn key={mod.id} mod={mod} onClick={() => setShowDashboard(true)} />
                    : mod.id === "timeline"
                    ? <ModuleBtn key={mod.id} mod={mod} onClick={() => setShowTimeline(true)} />
                    : mod.id === "tools"
                    ? <ModuleBtn key={mod.id} mod={mod} onClick={() => setShowTools(true)} />
                    : mod.id === "notes"
                    ? <ModuleBtn key={mod.id} mod={mod} onClick={() => setShowNotes(true)} />
                    : mod.id === "geoint"
                    ? <ModuleBtn key={mod.id} mod={mod} onClick={() => setShowGeoInt(true)} />
                    : <ModuleBtn key={mod.id} mod={mod} />
                ))}
              </div>
              <div style={{ padding: "8px 10px", borderTop: "1px solid #1a1a1a" }}>
                <button onClick={() => setSettingsOpen(true)}
                  style={{ width: "100%", background: "none", border: `1px solid ${!hasProviders ? "rgba(245,158,11,0.3)" : "#1a1a1a"}`, borderRadius: 6, color: !hasProviders ? "#F59E0B" : "#a0a0a0", fontSize: 9, padding: "6px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontWeight: 600 }}>
                  CONFIG {!hasProviders && "· ADD AI"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {settingsOpen && <SettingsModal providers={providers} onClose={() => setSettingsOpen(false)} onAdd={addProvider} onUpdate={updateProvider} onRemove={removeProvider} onTest={testProvider} />}
      {advancedAddModal && <AdvancedAddModal type={advancedAddModal.type} modelName={advancedAddModal.modelName} modelId={advancedAddModal.modelId} onClose={() => setAdvancedAddModal(null)} onAdd={(p) => { addProvider(p); setAdvancedAddModal(null); setTimeout(() => { setProviders(prev => { const newP = prev[prev.length - 1]; if (newP) { setSelectedProviderId(newP.id); setSelectedModelId(advancedAddModal.modelId); } return prev; }); }, 50); }} existingProvider={providers.find(p => p.type === advancedAddModal.type)} onUseExisting={(pid) => { setSelectedProviderId(pid); setSelectedModelId(advancedAddModal.modelId); setAdvancedAddModal(null); }} />}
      {newChatModal && (
        <Modal onClose={() => setNewChatModal(false)}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>New Investigation</div>
          <input value={newChatTitle} onChange={(e) => setNewChatTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") createChat(); if (e.key === "Escape") setNewChatModal(false); }} placeholder="Investigation name..." autoFocus style={{ width: "100%", background: "#111", border: "1px solid #333", borderRadius: 6, color: "#fff", fontSize: 12, padding: "8px 10px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
            <button onClick={() => setNewChatModal(false)} style={btnSec}>Cancel</button>
            <button onClick={createChat} style={btnPri}>Create</button>
          </div>
        </Modal>
      )}
      {deleteConfirm && (
        <Modal onClose={() => setDeleteConfirm(null)}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Delete investigation</div>
          <div style={{ fontSize: 11, color: "#a0a0a0", marginBottom: 16 }}>Permanently delete &ldquo;{chats.find((c) => c.id === deleteConfirm)?.title}&rdquo;?</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setDeleteConfirm(null)} style={btnSec}>Cancel</button>
            <button onClick={() => deleteChatAction(deleteConfirm)} style={{ ...btnPri, background: "#EF4444" }}>Delete</button>
          </div>
        </Modal>
      )}
      {contextMenu && (
        <div style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x, background: "#111", border: "1px solid #1a1a1a", borderRadius: 8, zIndex: 200, minWidth: 150, padding: 4, boxShadow: "0 8px 32px rgba(0,0,0,0.8)" }} onClick={(e) => e.stopPropagation()}>
          {[
            { label: "Rename", action: () => { setRenaming(contextMenu.chatId); setRenameValue(chats.find((c) => c.id === contextMenu.chatId)?.title || ""); setContextMenu(null); } },
            { label: "Duplicate", action: () => duplicateChatAction(contextMenu.chatId) },
            { label: "Delete", action: () => { setDeleteConfirm(contextMenu.chatId); setContextMenu(null); }, danger: true },
          ].map((item) => (
            <button key={item.label} onClick={item.action} style={{ display: "block", width: "100%", background: "none", border: "none", color: item.danger ? "#EF4444" : "#a0a0a0", fontSize: 11, padding: "6px 10px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", borderRadius: 5 }}>{item.label}</button>
          ))}
        </div>
      )}
      <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={(e) => handleFileSelect(e.target.files)} />

      {showTools && <div style={{ position: "fixed", inset: 0, zIndex: 500 }}><AbsterTools onClose={() => setShowTools(false)} /></div>}
      {showNotes && <div style={{ position: "fixed", inset: 0, zIndex: 500 }}><AbsterNotes onClose={() => setShowNotes(false)} /></div>}
      {showTimeline && <div style={{ position: "fixed", inset: 0, zIndex: 500 }}><AbsterTimeline onClose={() => setShowTimeline(false)} /></div>}
      {showDashboard && <div style={{ position: "fixed", inset: 0, zIndex: 500 }}><AbsterDashboard onClose={() => setShowDashboard(false)} /></div>}
      {showGraph && <div style={{ position: "fixed", inset: 0, zIndex: 500 }}><AbsterGraph onClose={() => setShowGraph(false)} /></div>}
      {showGeoInt && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500 }}>
          <GeoIntMap onClose={() => setShowGeoInt(false)} />
        </div>
      )}
      {showReports && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500 }}>
          <AbsterReports onClose={() => setShowReports(false)} />
        </div>
      )}

      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:#000}
        ::-webkit-scrollbar-thumb{background:#1a1a1a;border-radius:2px}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
        .ctx-btn{opacity:0!important}
        div:hover>.ctx-btn{opacity:1!important}
      `}</style>
    </div>
  );
}

function SettingsModal({ providers, onClose, onAdd, onUpdate, onRemove, onTest }) {
  const [addingType, setAddingType] = useState(null);
  const [formKey, setFormKey] = useState("");
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("http://localhost:11434");
  const [editingId, setEditingId] = useState(null);
  const [editKey, setEditKey] = useState("");
  const [confirmPurge, setConfirmPurge] = useState(false);
  const { exportData, importData, factoryReset } = useAbsterStore();

  const handleExport = async () => {
    try {
      const jsonStr = await exportData();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `abster_backup_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Failed to export data");
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        await importData(ev.target?.result as string);
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } catch (err) {
        alert("Failed to import data: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const executeReset = async () => {
    try {
      await factoryReset();
      window.location.reload();
    } catch (err) {
      alert("Factory reset failed.");
      setConfirmPurge(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      
      {confirmPurge && (
        <div style={{ position: "absolute", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)" }}>
          <div style={{ background: "#111", border: "1px solid #EF4444", borderRadius: 10, padding: 24, width: 400, textAlign: "center" }}>
            <div style={{ color: "#EF4444", fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>TOTAL PURGE INITIATED</div>
            <div style={{ color: "#ccc", fontSize: 12, marginBottom: 24 }}>This action will permanently delete ALL data, investigations, entities, evidence, and settings from your local drive. This CANNOT be undone.</div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={() => setConfirmPurge(false)} style={{ ...btnSec, flex: 1 }}>Abort</button>
              <button onClick={executeReset} style={{ background: "#EF4444", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", flex: 1 }}>Confirm Purge</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 14, width: 540, maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.95)", animation: "fadeIn 0.15s ease" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>⚙ Intelligence Configuration</div>
            <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>System Configuration & Storage</div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "16px 20px" }}>
          <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.1em", marginBottom: 12 }}>DATA PERSISTENCE</div>
          
          <div style={{ display: "flex", gap: 10, marginBottom: 24, background: "#111", padding: "12px", borderRadius: 8, border: "1px solid #1a1a1a" }}>
             <div style={{ flex: 1 }}>
               <div style={{ fontSize: 11, fontWeight: 600, color: "#fff", marginBottom: 4 }}>Global Backup & Restore</div>
               <div style={{ fontSize: 9, color: "#666", marginBottom: 12 }}>Export or import your entire investigation database to prevent data loss.</div>
               <div style={{ display: "flex", gap: 8 }}>
                 <button onClick={handleExport} style={{ ...btnSec, flex: 1, justifyContent: "center" }}>Export Backup</button>
                 <label style={{ ...btnSec, flex: 1, justifyContent: "center", cursor: "pointer" }}>
                   Import Backup
                   <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
                 </label>
               </div>
             </div>
          </div>

          <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.1em", marginBottom: 12 }}>SECURITY & PURGE</div>
          
          <div style={{ display: "flex", gap: 10, marginBottom: 24, background: "rgba(239,68,68,0.05)", padding: "12px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)" }}>
             <div style={{ flex: 1 }}>
               <div style={{ fontSize: 11, fontWeight: 600, color: "#EF4444", marginBottom: 4 }}>Factory Reset</div>
               <div style={{ fontSize: 9, color: "#EF4444", opacity: 0.8, marginBottom: 12 }}>Wipe all local data, demo investigations, and settings. This action is irreversible.</div>
               <button onClick={() => setConfirmPurge(true)} style={{ background: "#EF4444", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 10, fontWeight: 600, cursor: "pointer", width: "100%" }}>Execute Total Purge</button>
             </div>
          </div>

          <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.1em", marginBottom: 12 }}>AI PROVIDERS & KEYS</div>
          {providers.length === 0 && !addingType && (
            <div style={{ textAlign: "center", color: "#333", fontSize: 11, padding: "20px 0 16px", border: "1px dashed #1a1a1a", borderRadius: 10, marginBottom: 16 }}>
              No providers configured.<br /><span style={{ color: "#525252" }}>Add one to use real AI.</span>
            </div>
          )}
          {providers.map((p) => (
            <div key={p.id} style={{ background: "#111", border: `1px solid ${p.isWorking ? "rgba(16,185,129,0.2)" : "#1a1a1a"}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: `${PROVIDER_META[p.type]?.color}15`, border: `1px solid ${PROVIDER_META[p.type]?.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>{PROVIDER_META[p.type]?.dot}</div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: 9, color: "#525252" }}>{p.type === "ollama" ? p.baseUrl : (p.apiKey ? maskKey(atob_safe(p.apiKey)) : "")}</div></div>
                <div style={{ display: "flex", gap: 5 }}>
                  <button onClick={() => onTest(p.id)} style={{ ...btnSec, fontSize: 9, padding: "3px 8px" }}>Test</button>
                  <button onClick={() => onRemove(p.id)} style={{ ...btnSec, fontSize: 9, color: "#EF4444" }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
          {!addingType ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {Object.entries(PROVIDER_META).map(([type, meta]) => (
                <button key={type} onClick={() => { setAddingType(type); setFormName(meta.label); }} style={{ ...btnSec, background: "#111", fontSize: 10 }}>{meta.dot} {meta.label}</button>
              ))}
            </div>
          ) : (
            <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 10, padding: "16px", marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 14 }}>{PROVIDER_META[addingType]?.dot} Configure {PROVIDER_META[addingType]?.label}</div>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Name" style={{ width: "100%", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 6, color: "#fff", fontSize: 11, padding: "8px 10px", marginBottom: 10 }} />
              <input type="password" value={formKey} onChange={(e) => setFormKey(e.target.value)} placeholder={PROVIDER_META[addingType]?.keyLabel} style={{ width: "100%", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 6, color: "#fff", fontSize: 11, padding: "8px 10px", marginBottom: 10 }} />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setAddingType(null)} style={btnSec}>Cancel</button>
                <button onClick={() => { onAdd({ type: addingType, name: formName, apiKey: btoa_safe(formKey), baseUrl: formUrl, models: PROVIDER_META[addingType].defaultModels }); setAddingType(null); setFormKey(""); }} style={btnPri}>Add</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModelDropdown({ providers, selectedProviderId, selectedModelId, onSelect, onAdvancedClick }) {
  return (
    <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, background: "#111", border: "1px solid #1a1a1a", borderRadius: 10, zIndex: 100, minWidth: 230, maxHeight: 340, overflowY: "auto", padding: 6 }}>
      {providers.map((p) => (
        <div key={p.id}>
          <div style={{ fontSize: 8, color: "#444", padding: "5px 8px 2px" }}>{p.name.toUpperCase()}</div>
          {p.models?.map((m) => (
            <button key={m.id} onClick={() => onSelect(p.id, m.id)} style={{ display: "flex", width: "100%", background: "none", border: "none", color: "#a0a0a0", fontSize: 10, padding: "5px 10px", cursor: "pointer", textAlign: "left", borderRadius: 6, fontWeight: 500 }}>{m.name.toUpperCase()}</button>
          ))}
        </div>
      ))}
      <div style={{ height: 1, background: "#1a1a1a", margin: "6px 4px" }} />
      {ADVANCED_CATALOG.map(({ type, models }) => (
        <div key={type}>
          <div style={{ fontSize: 8, color: "#333", padding: "5px 8px 2px" }}>{PROVIDER_META[type]?.label.toUpperCase()}</div>
          {models.map((m) => (
            <button key={m.id} onClick={() => onAdvancedClick(type, m.id, m.name)} style={{ display: "flex", width: "100%", background: "none", border: "none", color: "#444", fontSize: 10, padding: "5px 10px", cursor: "pointer", textAlign: "left", fontWeight: 500 }}>{m.name.toUpperCase()} [LOCKED]</button>
          ))}
        </div>
      ))}
    </div>
  );
}

function AdvancedAddModal({ type, modelName, modelId, onClose, onAdd, existingProvider, onUseExisting }) {
  const [apiKey, setApiKey] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#0a0a0a", border: "1px solid #2a1f00", borderRadius: 14, width: 400, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Activate {PROVIDER_META[type]?.label}</div>
        <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API Key" style={{ width: "100%", background: "#111", border: "1px solid #1a1a1a", borderRadius: 6, color: "#fff", fontSize: 11, padding: "8px 10px", marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnSec}>Cancel</button>
          <button onClick={() => { onAdd({ type, name: PROVIDER_META[type].label, apiKey: btoa_safe(apiKey), models: PROVIDER_META[type].defaultModels }); }} style={btnPri}>Activate</button>
        </div>
      </div>
    </div>
  );
}

// MessageBubble has been extracted and moved to ChatMessageItem

function ModuleBtn({ mod, badge, onClick }: any) {
  const isActive = !!onClick;
  return (
    <div onClick={isActive ? onClick : undefined}
      onMouseOver={(e) => { if (isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; } }}
      onMouseOut={(e) => { if (isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; } }}
      style={{ width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "8px 12px", cursor: isActive ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 8, opacity: isActive ? 1 : 0.4, transition: "all 0.2s" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 10, color: isActive ? "#fff" : "#525252", fontWeight: 500, letterSpacing: "0.05em" }}>{mod.name.toUpperCase()}</div>
        {badge !== undefined && isActive && (
          <div style={{ fontSize: 9, color: "#888", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4 }}>{badge}</div>
        )}
      </div>
    </div>
  );
}

function ReportsPanel({ files, onClose, onUpload, onDelete, onExpand }: {
  files: any[];
  onClose: () => void;
  onUpload: (files: FileList) => void;
  onDelete: (id: string) => void;
  onExpand: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [search, setSearch] = useState("");

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  const getFileIcon = (type) => {
    if (type === 'image') return <ImageIcon size={18} className="text-pink-400" />;
    if (type === 'document') return <FileText size={18} className="text-blue-400" />;
    if (type === 'video') return <FileCode size={18} className="text-orange-400" />;
    return <File size={18} className="text-zinc-400" />;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div 
      className="flex flex-col h-full bg-zinc-950 text-zinc-100 relative"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/30">
        <div className="flex items-center gap-2">
          <FolderOpen size={16} className="text-pink-500" />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Reports Archive</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onExpand} className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-500 hover:text-zinc-100" title="Expand to full window">
            <Maximize2 size={14} />
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-500 hover:text-zinc-100">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Stats & Search */}
      <div className="p-4 space-y-4 shrink-0">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Total Files</div>
            <div className="text-xl font-bold">{files.length}</div>
          </div>
          <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Used Space</div>
            <div className="text-xl font-bold">{formatSize(files.reduce((acc, f) => acc + f.size, 0))}</div>
          </div>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search evidence..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-pink-500/50 transition-colors"
          />
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
        {dragOver && (
          <div className="mb-4 p-8 border-2 border-dashed border-pink-500/50 bg-pink-500/5 rounded-xl flex flex-col items-center justify-center gap-3 animate-pulse">
            <UploadCloud size={32} className="text-pink-500" />
            <span className="text-xs font-bold text-pink-400">Drop to upload</span>
          </div>
        )}

        <div className="space-y-2">
          {filteredFiles.map((f) => (
            <div key={f.id} className="group p-3 bg-zinc-900/30 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                {f.type === 'image' && f.url ? (
                  <img src={f.url} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : getFileIcon(f.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate text-zinc-200">{f.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] text-zinc-500 uppercase">{f.type}</span>
                  <span className="w-1 h-1 rounded-full bg-zinc-800" />
                  <span className="text-[9px] text-zinc-500 uppercase">{formatSize(f.size)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {f.url && (
                  <a href={f.url} download={f.name} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-blue-400 transition-colors">
                    <Download size={14} />
                  </a>
                )}
                <button 
                  onClick={() => onDelete(f.id)}
                  className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {filteredFiles.length === 0 && (
            <div className="text-center py-12 border border-dashed border-zinc-900 rounded-xl">
              <HardDrive size={24} className="mx-auto mb-3 text-zinc-800" />
              <p className="text-xs text-zinc-600">No reports or evidence found.</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 text-[10px] font-bold text-pink-500 hover:text-pink-400 uppercase tracking-widest"
              >
                Upload File
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Upload */}
      <div className="p-4 border-t border-zinc-900 bg-zinc-900/20 shrink-0">
        <input 
          ref={fileInputRef} 
          type="file" 
          multiple 
          className="hidden" 
          onChange={(e) => e.target.files && onUpload(e.target.files)} 
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
        >
          <UploadCloud size={14} />
          Import Evidence
        </button>
        <div className="mt-3 flex items-center justify-center gap-2 text-[9px] text-zinc-600">
          <Shield size={10} />
          <span>Encoded local storage (Base64)</span>
        </div>
      </div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 12, padding: 20, minWidth: 320 }} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
