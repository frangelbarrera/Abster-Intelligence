import { RefObject } from 'react';
import { ChatMessageItem } from './ChatMessageItem';
import { renderMarkdown } from '../../lib/markdown';

export interface ChatMessageListProps {
  messages: Array<{
    id: string;
    role: string;
    content: string;
    provider?: string;
    modelId?: string | null;
  }>;
  isStreaming: boolean;
  streamingText: string;
  streamError: string | null;
  suggestedPrompts: string[];
  hasProviders: boolean;
  setInputValue: (value: string) => void;
  setSettingsOpen: (open: boolean) => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  getProviderBadge: (provider: string, modelId?: string | null) => { label: string; color: string } | null;
  clearStreamError: () => void;
}

export function ChatMessageList({ 
  messages, 
  isStreaming, 
  streamingText, 
  streamError, 
  suggestedPrompts, 
  hasProviders, 
  setInputValue, 
  setSettingsOpen, 
  messagesEndRef, 
  getProviderBadge,
  clearStreamError
}: ChatMessageListProps) {
  return (
    <>
      {messages.length === 0 && !isStreaming && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, paddingTop: 60 }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.05em" }}>What are we investigating today?</div>
          {!hasProviders && (
            <div style={{ fontSize: 11, color: "#525252", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 8, padding: "8px 14px" }}>
              Demo mode active · <span style={{ color: "#F59E0B", cursor: "pointer" }} onClick={() => setSettingsOpen(true)}>Configure a provider</span> for real AI
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 480 }}>
            {suggestedPrompts.map((p: string) => (
              <button key={p} onClick={() => setInputValue(p)}
                style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 20, color: "#a0a0a0", fontSize: 11, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.1s" }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {messages.map((msg: any) => (
        <ChatMessageItem key={msg.id} msg={msg} getProviderBadge={getProviderBadge} />
      ))}

      {isStreaming && (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", animation: "fadeIn 0.2s ease" }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: "#111", border: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>A</div>
          <div style={{ background: "transparent", border: "1px solid #1a1a1a", borderRadius: "2px 10px 10px 10px", padding: "9px 13px", maxWidth: "80%", fontSize: 12, lineHeight: 1.6, color: "#e0e0e0" }}>
            {streamingText ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingText) }} /> : <span style={{ color: "#444" }}>Processing</span>}
            <span style={{ display: "inline-block", width: 5, height: 13, background: "#fff", marginLeft: 2, animation: "blink 1s infinite", verticalAlign: "bottom" }} />
          </div>
        </div>
      )}

      {streamError && (
        <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#EF4444", display: "flex", gap: 8, alignItems: "center" }}>
          <span>✗ {streamError}</span>
          <span style={{ cursor: "pointer", color: "#666", marginLeft: "auto" }} onClick={clearStreamError}>×</span>
        </div>
      )}
      <div ref={messagesEndRef} />
    </>
  );
}
