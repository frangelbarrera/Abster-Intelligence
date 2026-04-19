import { Dispatch, SetStateAction, RefObject, ReactNode } from 'react';

export interface ChatInputProps {
  pendingAttachments: any[];
  setPendingAttachments: Dispatch<SetStateAction<any[]>>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  getModelCapabilities: () => string[];
  deepSearch: boolean;
  setDeepSearch: Dispatch<SetStateAction<boolean>>;
  modelDropdownOpen: boolean;
  setModelDropdownOpen: Dispatch<SetStateAction<boolean>>;
  selectedModel: any;
  providers: any[];
  selectedProviderId: string;
  selectedModelId: string;
  setSelectedProviderId: Dispatch<SetStateAction<string>>;
  setSelectedModelId: Dispatch<SetStateAction<string>>;
  setAdvancedAddModal: Dispatch<SetStateAction<{open: boolean, type: string}>>;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  inputValue: string;
  setInputValue: Dispatch<SetStateAction<string>>;
  sendMessage: () => void;
  isStreaming: boolean;
  stopStream: () => void;
  renderModelDropdown: () => ReactNode;
}

export function ChatInput({
  pendingAttachments,
  setPendingAttachments,
  fileInputRef,
  getModelCapabilities,
  deepSearch,
  setDeepSearch,
  modelDropdownOpen,
  setModelDropdownOpen,
  selectedModel,
  providers,
  selectedProviderId,
  selectedModelId,
  setSelectedProviderId,
  setSelectedModelId,
  setAdvancedAddModal,
  inputRef,
  inputValue,
  setInputValue,
  sendMessage,
  isStreaming,
  stopStream,
  renderModelDropdown
}: ChatInputProps) {
  return (
    <>
      {pendingAttachments.length > 0 && (
        <div style={{ padding: "6px 20px 0", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {pendingAttachments.map((f: any, i: number) => {
            let icon = "📄";
            if (f.type?.startsWith("image")) icon = "🖼";
            if (f.type?.startsWith("video")) icon = "🎬";
            if (f.type?.startsWith("audio")) icon = "🎵";
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: "#111", border: "1px solid #1a1a1a", borderRadius: 6, padding: "3px 8px" }}>
                <span style={{ fontSize: 10 }}>{icon}</span>
                <span style={{ fontSize: 10, color: "#a0a0a0", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                <button onClick={() => setPendingAttachments((prev: any) => prev.filter((_: any, j: number) => j !== i))} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 10, padding: 0 }}>×</button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ padding: "10px 14px", borderTop: "1px solid #1a1a1a" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 10, padding: "7px 8px" }}>
          <button onClick={() => fileInputRef.current?.click()} title={`Attach file (${getModelCapabilities().join(', ')})`}
            style={{ background: "none", border: "none", color: getModelCapabilities().length > 1 ? "#10B981" : "#525252", cursor: "pointer", fontSize: 9, padding: "2px 3px", lineHeight: 1, flexShrink: 0, marginBottom: 1, transition: "color 0.1s", fontWeight: 600 }}>ATTACH</button>

          <button onClick={() => setDeepSearch((d: boolean) => !d)}
            style={{ background: deepSearch ? "rgba(59,130,246,0.15)" : "none", border: deepSearch ? "1px solid rgba(59,130,246,0.4)" : "1px solid transparent", color: deepSearch ? "#3B82F6" : "#525252", cursor: "pointer", fontSize: 9, padding: "3px 7px", borderRadius: 10, display: "flex", alignItems: "center", gap: 3, transition: "all 0.15s", fontFamily: "inherit", flexShrink: 0, marginBottom: 1, fontWeight: 600 }}>
            {deepSearch ? "DEEP ON" : "DEEP"}
          </button>

          <div style={{ position: "relative", flexShrink: 0, marginBottom: 1 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setModelDropdownOpen((o: boolean) => !o)}
              style={{ background: modelDropdownOpen ? "#111" : "none", border: `1px solid ${modelDropdownOpen ? "#333" : "transparent"}`, color: selectedModel ? "#a0a0a0" : "#F59E0B", cursor: "pointer", fontSize: 9, padding: "3px 7px", borderRadius: 10, display: "flex", alignItems: "center", gap: 3, transition: "all 0.15s", fontFamily: "inherit", maxWidth: 160, fontWeight: 600 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedModel ? selectedModel.name.toUpperCase() : "MODEL"}</span>
              <span style={{ fontSize: 8, flexShrink: 0 }}>▾</span>
            </button>
            {modelDropdownOpen && renderModelDropdown()}
          </div>

          <textarea ref={inputRef} value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={selectedModel ? `Message to ${selectedModel.name}...` : deepSearch ? "Deep search..." : "Type your intelligence query..."}
            rows={1}
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontSize: 12, fontFamily: "inherit", resize: "none", lineHeight: 1.5, padding: "2px 0", maxHeight: 120, overflowY: "auto" }} />

          {isStreaming ? (
            <button onClick={stopStream} style={{ background: "#1a1a1a", border: "1px solid #333", color: "#fff", cursor: "pointer", width: "auto", height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, flexShrink: 0, padding: "0 10px", fontWeight: 600 }} title="Stop">STOP</button>
          ) : (
            <button onClick={sendMessage} disabled={!inputValue.trim() && pendingAttachments.length === 0}
              style={{ background: (inputValue.trim() || pendingAttachments.length > 0) ? "#fff" : "#111", border: "none", color: (inputValue.trim() || pendingAttachments.length > 0) ? "#000" : "#333", cursor: (inputValue.trim() || pendingAttachments.length > 0) ? "pointer" : "not-allowed", width: "auto", height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, flexShrink: 0, padding: "0 10px", fontWeight: 600 }}>SEND</button>
          )}
        </div>
        <div style={{ marginTop: 4, fontSize: 9, color: "#252525", textAlign: "center" }}>
          Enter to send · {selectedModel ? selectedModel.name : "demo mode"}
        </div>
      </div>
    </>
  );
}
