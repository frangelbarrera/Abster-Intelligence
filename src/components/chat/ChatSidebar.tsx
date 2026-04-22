import { Dispatch, SetStateAction, RefObject } from 'react';
import { Chat, Case } from '../../store/absterStore';

export interface ContextMenuState {
  chatId: string;
  x: number;
  y: number;
}

export interface ChatSidebarProps {
  sidebarOpen: boolean;
  sidebarSearch: string;
  setSidebarSearch: Dispatch<SetStateAction<string>>;
  filteredChats: Chat[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  renaming: string | null;
  setRenaming: Dispatch<SetStateAction<string | null>>;
  renameInputRef: RefObject<HTMLInputElement | null>;
  renameValue: string;
  setRenameValue: Dispatch<SetStateAction<string>>;
  renameChatAction: (id: string, newTitle: string) => void;
  mounted: boolean;
  formatTime: (ts: string) => string;
  cases: Case[];
  setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
  setNewChatModal: Dispatch<SetStateAction<boolean>>;
  chats: Chat[];
}

export function ChatSidebar({
  sidebarOpen,
  sidebarSearch,
  setSidebarSearch,
  filteredChats,
  activeChatId,
  setActiveChatId,
  renaming,
  setRenaming,
  renameInputRef,
  renameValue,
  setRenameValue,
  renameChatAction,
  mounted,
  formatTime,
  cases,
  setContextMenu,
  setNewChatModal,
  chats
}: ChatSidebarProps) {
  return (
    <div style={{ width: sidebarOpen ? 240 : 0, overflow: "hidden", transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)", flexShrink: 0 }}>
      <div style={{ width: 240, background: "#000", borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ padding: "10px 12px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 6, padding: "5px 8px" }}>
            <span style={{ color: "#444", fontSize: 11 }}>⌕</span>
            <input value={sidebarSearch} onChange={(e) => setSidebarSearch(e.target.value)} placeholder="Search..."
              style={{ background: "none", border: "none", outline: "none", color: "#fff", fontSize: 11, flex: 1, fontFamily: "inherit" }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
          {filteredChats.length === 0 && <div style={{ padding: 16, color: "#444", fontSize: 11, textAlign: "center" }}>No investigations</div>}
          {filteredChats.map((chat: Chat) => (
            <div key={chat.id} onClick={() => setActiveChatId(chat.id)}
              style={{ padding: "8px 10px", borderRadius: 6, marginBottom: 2, cursor: "pointer", background: activeChatId === chat.id ? "#111" : "transparent", borderLeft: activeChatId === chat.id ? "2px solid #fff" : "2px solid transparent", transition: "all 0.1s", position: "relative" }}>
              {renaming === chat.id ? (
                <input ref={renameInputRef} value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => renameChatAction(chat.id, renameValue || chat.title)}
                  onKeyDown={(e) => { if (e.key === "Enter") renameChatAction(chat.id, renameValue || chat.title); if (e.key === "Escape") setRenaming(null); }}
                  style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 4, color: "#fff", fontSize: 11, width: "100%", padding: "2px 4px", fontFamily: "inherit", outline: "none" }}
                  onClick={(e) => e.stopPropagation()} />
              ) : (
                <>
                  <div style={{ fontSize: 11, color: "#fff", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 2 }}>{chat.title}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: "#444" }}>{mounted ? formatTime(chat.updatedAt) : "--"}</span>
                    {chat.caseId && <span style={{ fontSize: 8, color: "#525252", background: "#111", padding: "1px 4px", borderRadius: 3 }}>{cases.find((c: Case) => c.id === chat.caseId)?.codeName || chat.caseId}</span>}
                  </div>
                </>
              )}
              <div className="ctx-btn" style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#666", padding: "2px 4px", borderRadius: 4, opacity: 0, transition: "opacity 0.1s" }}
                onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setContextMenu({ chatId: chat.id, x: r.left, y: r.bottom }); }}>⋮</div>
            </div>
          ))}
        </div>
        <div style={{ padding: "8px 12px", borderTop: "1px solid #1a1a1a" }}>
          <button onClick={() => setNewChatModal(true)} style={{ width: "100%", background: "#111", border: "1px solid #1a1a1a", borderRadius: 6, color: "#fff", fontSize: 11, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, justifyContent: "center", fontFamily: "inherit", transition: "background 0.1s" }}>
            NEW INVESTIGATION
          </button>
          <div style={{ marginTop: 5, textAlign: "center", fontSize: 9, color: "#333" }}>{chats.length} investigations</div>
        </div>
      </div>
    </div>
  );
}
