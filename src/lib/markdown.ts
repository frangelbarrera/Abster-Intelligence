import { sanitizeMarkdown } from './security';

export const renderMarkdown = (text: string) => {
  if (!text) return "";
  let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Handle <think> / </think> blocks
  html = html.replace(/&lt;think&gt;([\s\S]*?)&lt;\/think&gt;/gi, (_, thought) => {
    return `<details style="margin:8px 0;background:#0A0A0A;border:1px solid #1A1A1A;border-radius:6px;overflow:hidden;">
      <summary style="padding:6px 10px;cursor:pointer;font-size:10px;color:#888;letter-spacing:0.05em;user-select:none;outline:none;">
        <span style="opacity:0.7">🧠 MODEL INTERNAL REASONING PROCESS</span>
      </summary>
      <div style="padding:10px;color:#666;font-size:11px;border-top:1px solid #1A1A1A;font-family:monospace;white-space:pre-wrap;background:#050505;">${thought.trim().replace(/\n/g, '<br/>')}</div>
    </details>`;
  });
  
  // If the model streams and hasn't closed the think tag yet
  html = html.replace(/&lt;think&gt;([\s\S]*?)$/gi, (_, thought) => {
    return `<details open style="margin:8px 0;background:#0A0A0A;border:1px dotted #333;border-radius:6px;overflow:hidden;">
      <summary style="padding:6px 10px;cursor:pointer;font-size:10px;color:#888;letter-spacing:0.05em;user-select:none;outline:none;">
        <span style="color:#10B981;animation:pulse 1.5s infinite">🧠 REASONING IN PROGRESS...</span>
      </summary>
      <div style="padding:10px;color:#666;font-size:11px;border-top:1px solid #1A1A1A;font-family:monospace;white-space:pre-wrap;background:#050505;">${thought.trim().replace(/\n/g, '<br/>')}</div>
    </details>`;
  });

  const parsed = html
    .replace(/^# (.+)$/gm, '<h1 style="font-size:13px;font-weight:700;color:#fff;margin:12px 0 6px">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:12px;font-weight:600;color:#e0e0e0;margin:10px 0 4px">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:11px;font-weight:600;color:#c0c0c0;margin:8px 0 3px">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff;font-weight:600">$1</strong>')
    .replace(/`([^`\n]+)`/g, '<code style="background:rgba(255,255,255,0.08);color:#34d399;padding:1px 5px;border-radius:3px;font-size:11px;font-family:monospace">$1</code>')
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre style="background:#000;border:1px solid #1a1a1a;border-radius:6px;padding:10px;margin:6px 0;overflow-x:auto"><code style="font-size:11px;color:#34d399;font-family:monospace;white-space:pre">$1</code></pre>')
    .replace(/^> (.+)$/gm, '<blockquote style="border-left:2px solid #3B82F6;padding-left:10px;margin:6px 0;color:#a0a0a0;font-style:italic;font-size:11px">$1</blockquote>')
    .replace(/^[-•] (.+)$/gm, '<div style="display:flex;gap:6px;margin:2px 0;font-size:12px"><span style="color:#525252;margin-top:1px">▸</span><span>$1</span></div>')
    .replace(/^\d+\. (.+)$/gm, '<div style="display:flex;gap:6px;margin:2px 0;font-size:12px;padding-left:4px"><span>$1</span></div>')
    .replace(/\n\n/g, '<div style="height:8px"></div>')
    .replace(/\n/g, "<br/>");
    
  return sanitizeMarkdown(parsed);
};
