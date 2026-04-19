import { renderMarkdown } from '../../lib/markdown';

export interface ChatMessageItemProps {
  msg: {
    role: string;
    content: string;
    provider?: string;
    modelId?: string | null;
  };
  getProviderBadge?: (provider: string, modelId?: string | null) => { label: string; color: string } | null;
}

export function ChatMessageItem({ msg, getProviderBadge }: ChatMessageItemProps) {
  const isUser = msg.role === "user";
  const badge = !isUser && msg.provider && getProviderBadge ? getProviderBadge(msg.provider, msg.modelId) : null;
  
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexDirection: isUser ? "row-reverse" : "row" }}>
      {!isUser && (
        <div style={{ width: 26, height: 26, borderRadius: 6, background: "#111", border: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>
          A
        </div>
      )}
      <div style={{ maxWidth: "80%", display: "flex", flexDirection: "column", gap: 3, alignItems: isUser ? "flex-end" : "flex-start" }}>
        <div style={{ background: isUser ? "#171717" : "transparent", border: isUser ? "none" : "1px solid #1a1a1a", borderRadius: isUser ? "10px 10px 2px 10px" : "2px 10px 10px 10px", padding: "9px 13px", fontSize: 12, color: "#e0e0e0" }}>
          {msg.content && <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />}
        </div>
        {badge && (
          <span style={{ fontSize: 8, color: badge.color, background: `${badge.color}12`, border: `1px solid ${badge.color}25`, padding: "1px 6px", borderRadius: 8 }}>
            {badge.label}
          </span>
        )}
      </div>
    </div>
  );
}
