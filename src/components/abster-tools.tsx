"use client";

import { useEffect, useState } from "react";
import { TOOLS, CAT_LABELS, CAT_COLORS } from "../data/osint-tools";

/* ════════════════════════════════════════════════════
   STYLES — injected as <style> tag
════════════════════════════════════════════════════ */
const STYLES = `
  :root {
    --bg:#0A0A0A; --surface:#111111; --elevated:#1A1A1A;
    --border:#222222; --border-bright:#2e2e2e;
    --text:#E5E5E5; --text-secondary:#A0A0A0; --text-muted:#505050;
    --blue:#3B82F6; --violet:#8B5CF6; --amber:#F59E0B;
    --emerald:#10B981; --red:#EF4444; --pink:#EC4899;
    --orange:#F97316; --lime:#84CC16; --gray:#6B7280;
    --cyan:#06B6D4; --teal:#14B8A6;
  }
  .tools-container { background: var(--bg); color: var(--text); font-family:'Space Mono',monospace; min-height:100%; display:flex; flex-direction:column; }
  .tools-container * { box-sizing: border-box; }
  .tools-container ::-webkit-scrollbar{width:4px;} 
  .tools-container ::-webkit-scrollbar-track{background:var(--bg);} 
  .tools-container ::-webkit-scrollbar-thumb{background:var(--border-bright);border-radius:2px;}
  
  .app-shell{display:flex;flex-direction:column;height:100%;}

  /* HEADER */
  .tools-header{background:var(--surface);border-bottom:1px solid var(--border);padding:0 24px;height:52px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
  .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:16px;letter-spacing:.15em;display:flex;align-items:center;gap:10px;}
  .logo-mark{width:26px;height:26px;background:linear-gradient(135deg,var(--violet),var(--blue));clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);flex-shrink:0;animation:logoSpin 8s linear infinite;}
  @keyframes logoSpin{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(360deg)}}
  .logo-text span{color:var(--violet);}
  .header-actions{display:flex;align-items:center;gap:8px;}
  .kbd-hint{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-muted);background:var(--elevated);border:1px solid var(--border);padding:4px 10px;border-radius:4px;cursor:pointer;transition:all .15s;}
  .kbd-hint:hover{border-color:var(--violet);color:var(--violet);}
  .kbd{background:var(--border);padding:1px 5px;border-radius:3px;font-size:10px;}
  .header-stat{font-size:11px;color:var(--text-muted);border-left:1px solid var(--border);padding-left:12px;margin-left:4px;}
  .header-stat strong{color:var(--emerald);font-weight:700;}

  /* MAIN LAYOUT */
  .main-content-area{display:flex;flex:1;overflow:hidden;}

  /* SIDEBAR */
  .tools-sidebar{width:200px;flex-shrink:0;background:var(--surface);border-right:1px solid var(--border);overflow-y:auto;display:flex;flex-direction:column;}
  .sidebar-section{padding:16px 0 8px;}
  .sidebar-label{font-size:9px;letter-spacing:.2em;color:var(--text-muted);padding:0 16px 8px;text-transform:uppercase;}
  .cat-item{display:flex;align-items:center;gap:10px;padding:8px 16px;cursor:pointer;transition:all .12s;border-left:2px solid transparent;font-size:12px;color:var(--text-secondary);position:relative;}
  .cat-item:hover{background:var(--elevated);color:var(--text);}
  .cat-item.active{border-left-color:var(--violet);background:rgba(139,92,246,.08);color:var(--text);}
  .cat-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
  .cat-count{margin-left:auto;font-size:10px;color:var(--text-muted);background:var(--elevated);padding:1px 6px;border-radius:10px;}
  .cat-item.active .cat-count{background:rgba(139,92,246,.2);color:var(--violet);}
  .sidebar-divider{height:1px;background:var(--border);margin:8px 16px;}

  /* CONTENT */
  .scroll-content{flex:1;overflow-y:auto;display:flex;flex-direction:column;}

  /* SEARCH BAR */
  .search-area{padding:20px 24px 16px;border-bottom:1px solid var(--border);background:var(--bg);position:sticky;top:0;z-index:50;}
  .search-wrap{position:relative;max-width:700px;}
  .search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:14px;}
  .search-input{width:100%;background:var(--surface);border:1px solid var(--border-bright);color:var(--text);font-family:'Space Mono',monospace;font-size:13px;padding:10px 14px 10px 40px;border-radius:6px;outline:none;transition:all .2s;}
  .search-input:focus{border-color:var(--violet);box-shadow:0 0 0 3px rgba(139,92,246,.1);}
  .search-input::placeholder{color:var(--text-muted);}
  .search-tags{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;}
  .tag{font-size:10px;padding:3px 10px;border-radius:20px;border:1px solid var(--border);color:var(--text-muted);cursor:pointer;transition:all .15s;background:var(--surface);}
  .tag:hover{border-color:var(--violet);color:var(--violet);}
  .tag.active{background:rgba(139,92,246,.15);border-color:var(--violet);color:var(--violet);}

  /* NATIVE BAR */
  .native-bar{padding:16px 24px;border-bottom:1px solid var(--border);background:var(--bg);}
  .native-label{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--text-muted);margin-bottom:12px;display:flex;align-items:center;gap:8px;}
  .native-label::after{content:'';flex:1;height:1px;background:var(--border);}
  .native-tools-row{display:flex;gap:8px;flex-wrap:wrap;}
  .native-chip{display:flex;align-items:center;gap:7px;padding:7px 12px;background:var(--surface);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:11px;color:var(--text-secondary);transition:all .15s;}
  .native-chip:hover{color:var(--text);border-color:var(--border-bright);}
  .native-chip.active{border-color:var(--violet);color:var(--violet);background:rgba(139,92,246,.08);}
  .nc-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
  .native-badge{font-size:8px;padding:1px 5px;border-radius:3px;background:var(--violet);color:white;font-weight:700;letter-spacing:.05em;}
  .native-badge.api{background:var(--amber);color:#000;}
  .native-badge.free{background:var(--emerald);color:#000;}

  /* NATIVE PANEL */
  .native-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:499;display:none;backdrop-filter:blur(2px);}
  .native-overlay.visible{display:block;}
  .native-panel{position:fixed;top:0;right:0;bottom:0;width:700px;max-width:100vw;background:var(--surface);border-left:1px solid var(--border-bright);z-index:500;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);box-shadow:-20px 0 60px rgba(0,0,0,.7);}
  .native-panel.visible{transform:translateX(0);}
  .panel-header{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;background:var(--elevated);flex-shrink:0;}
  .panel-title{font-family:'Syne',sans-serif;font-size:14px;font-weight:700;}
  .panel-subtitle{font-size:11px;color:var(--text-muted);}
  .panel-close{background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px;margin-left:auto;transition:all .15s;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:6px;}
  .panel-close:hover{color:var(--red);background:rgba(239,68,68,.1);}
  .panel-body{padding:20px;overflow-y:auto;flex:1;}

  /* SHARED MODULE UI */
  .api-gate{background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.25);border-radius:8px;padding:16px;margin-bottom:16px;}
  .api-gate-title{font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:var(--amber);margin-bottom:6px;display:flex;align-items:center;gap:8px;}
  .api-gate-desc{font-size:11px;color:var(--text-muted);margin-bottom:12px;line-height:1.6;}
  .api-gate-link{color:var(--blue);font-size:11px;text-decoration:none;}
  .api-gate-link:hover{text-decoration:underline;}
  .api-input-row{display:flex;gap:8px;margin-top:8px;}
  .api-inp{flex:1;background:var(--elevated);border:1px solid var(--border);color:var(--text);font-family:'Space Mono',monospace;font-size:11px;padding:8px 12px;border-radius:5px;outline:none;transition:all .15s;}
  .api-inp:focus{border-color:var(--amber);}
  .api-inp::placeholder{color:var(--text-muted);}
  .btn-save-api{font-family:'Space Mono',monospace;font-size:10px;padding:8px 14px;background:var(--amber);color:#000;border:none;border-radius:5px;cursor:pointer;font-weight:700;transition:all .15s;white-space:nowrap;}
  .btn-save-api:hover{background:#d97706;}
  .api-saved-notice{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--emerald);padding:8px 12px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.2);border-radius:5px;}
  .btn-reset-api{background:none;border:none;color:var(--text-muted);font-size:10px;cursor:pointer;margin-left:auto;font-family:'Space Mono',monospace;text-decoration:underline;}
  .btn-reset-api:hover{color:var(--red);}

  .input-row{display:flex;gap:10px;margin-bottom:14px;}
  .inp{flex:1;background:var(--elevated);border:1px solid var(--border);color:var(--text);font-family:'Space Mono',monospace;font-size:12px;padding:9px 14px;border-radius:6px;outline:none;transition:all .15s;}
  .inp:focus{border-color:var(--violet);}
  .inp::placeholder{color:var(--text-muted);}
  .btn-run{font-family:'Space Mono',monospace;font-size:11px;padding:9px 18px;background:var(--violet);color:white;border:none;border-radius:6px;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:7px;white-space:nowrap;}
  .btn-run:hover{background:#7c3aed;}
  .btn-run:disabled{background:var(--text-muted);cursor:wait;}

  /* RESULTS UI */
  .results-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;}
  .result-item{background:var(--elevated);border:1px solid var(--border);border-radius:6px;padding:10px 12px;display:flex;align-items:center;gap:10px;animation:fadeUp .3s ease both;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  .result-status{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
  .status-found{background:var(--emerald);box-shadow:0 0 6px var(--emerald);}
  .status-not{background:var(--text-muted);}
  .status-checking{background:var(--amber);animation:pulse 1s infinite;}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  .result-platform{font-size:11px;color:var(--text);flex:1;}
  .result-link{font-size:10px;color:var(--blue);text-decoration:none;}
  .result-link:hover{text-decoration:underline;}
  .stats-row{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;}
  .stat-box{background:var(--elevated);border:1px solid var(--border);border-radius:6px;padding:12px 16px;flex:1;min-width:80px;}
  .stat-val{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;margin-bottom:2px;}
  .stat-label{font-size:10px;color:var(--text-muted);}
  .info-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin-top:8px;}
  .info-card{background:var(--elevated);border:1px solid var(--border);border-radius:6px;padding:12px;}
  .info-card-label{font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;}
  .info-card-value{font-size:13px;color:var(--text);font-family:'Syne',sans-serif;font-weight:700;}
  .info-card-sub{font-size:10px;color:var(--text-muted);margin-top:3px;}
  .breach-item{display:flex;gap:14px;padding:12px 0;border-bottom:1px solid var(--border);animation:fadeUp .3s ease both;}
  .breach-year{font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--orange);min-width:50px;}
  .breach-info{flex:1;}
  .breach-name{font-size:12px;font-weight:700;margin-bottom:3px;}
  .breach-detail{font-size:11px;color:var(--text-muted);}
  .breach-tags{display:flex;gap:5px;margin-top:5px;flex-wrap:wrap;}
  .breach-tag{font-size:9px;padding:2px 7px;border-radius:3px;background:rgba(239,68,68,.15);color:var(--red);border:1px solid rgba(239,68,68,.3);}
  .loading-bar{height:2px;background:var(--border);border-radius:1px;overflow:hidden;margin:8px 0;}
  .loading-fill{height:100%;background:linear-gradient(90deg,var(--violet),var(--blue));border-radius:1px;transition:width 1.5s ease;}
  .data-table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11px;}
  .data-table th{padding:8px 12px;text-align:left;font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border);}
  .data-table td{padding:8px 12px;border-bottom:1px solid var(--border);color:var(--text-secondary);}
  .data-table tr:hover td{background:var(--elevated);}
  .data-table td:first-child{color:var(--text);}
  .tag-pill{display:inline-block;font-size:9px;padding:2px 7px;border-radius:3px;margin:1px;}
  .error-box{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:6px;padding:12px 16px;font-size:11px;color:var(--red);}
  .success-box{background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.25);border-radius:6px;padding:12px 16px;font-size:11px;color:var(--emerald);}
  .warning-box{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:6px;padding:12px 16px;font-size:11px;color:var(--amber);}

  /* TOOL GRID */
  .tools-area-scroll{padding:20px 24px;flex:1;}
  .cat-section{margin-bottom:28px;}
  .cat-section-title{font-family:'Syne',sans-serif;font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.15em;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:10px;padding-bottom:8px;border-bottom:1px solid var(--border);}
  .cat-section-badge{font-size:9px;padding:2px 8px;border-radius:10px;font-weight:400;letter-spacing:0;}
  .tool-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;}
  .tool-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;display:flex;flex-direction:column;gap:8px;}
  .tool-card .card-accent{position:absolute;top:0;left:0;right:0;height:2px;opacity:0;transition:opacity .2s;}
  .tool-card:hover{border-color:var(--border-bright);transform:translateY(-1px);box-shadow:0 4px 20px rgba(0,0,0,.4);}
  .tool-card:hover .card-accent{opacity:1;}
  .tool-card.active{border-color:var(--violet);background:rgba(139,92,246,.06);}
  .tool-header{display:flex;align-items:flex-start;gap:10px;}
  .tool-icon{width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;}
  .tool-meta{flex:1;min-width:0;}
  .tool-name{font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .tool-cat{font-size:10px;color:var(--text-muted);margin-top:2px;}
  .tool-fav{background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:13px;transition:all .15s;padding:2px;flex-shrink:0;}
  .tool-fav:hover,.tool-fav.active{color:var(--amber);}
  .tool-desc{font-size:11px;color:var(--text-secondary);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
  .tool-footer{display:flex;align-items:center;gap:6px;margin-top:auto;padding-top:4px;}
  .tool-tag{font-size:9px;padding:2px 7px;border-radius:3px;border:1px solid var(--border);color:var(--text-muted);}
  .tool-actions{display:flex;gap:5px;margin-left:auto;}
  .btn-sm{font-family:'Space Mono',monospace;font-size:10px;padding:4px 10px;border-radius:4px;cursor:pointer;transition:all .15s;border:1px solid var(--border);background:var(--elevated);color:var(--text-secondary);}
  .btn-sm:hover{border-color:var(--violet);color:var(--violet);}
  .btn-primary{background:var(--violet);border-color:var(--violet);color:white;}
  .btn-primary:hover{background:#7c3aed;border-color:#7c3aed;color:white;}

  /* CMD PALETTE */
  .cmd-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:1000;display:none;align-items:flex-start;justify-content:center;padding-top:120px;backdrop-filter:blur(4px);}
  .cmd-overlay.open{display:flex;animation:fadeIn .15s ease;}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  .cmd-box{background:var(--elevated);border:1px solid var(--border-bright);border-radius:10px;width:600px;max-height:480px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 25px 80px rgba(0,0,0,.8);animation:slideDown .15s ease;}
  @keyframes slideDown{from{transform:translateY(-12px)}to{transform:translateY(0)}}
  .cmd-input-wrap{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border);}
  .cmd-input{flex:1;background:none;border:none;outline:none;font-family:'Space Mono',monospace;font-size:14px;color:var(--text);}
  .cmd-input::placeholder{color:var(--text-muted);}
  .cmd-results{overflow-y:auto;max-height:380px;}
  .cmd-group-label{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--text-muted);padding:10px 18px 4px;}
  .cmd-result-item{display:flex;align-items:center;gap:12px;padding:9px 18px;cursor:pointer;transition:background .1s;}
  .cmd-result-item:hover,.cmd-result-item.focused{background:rgba(139,92,246,.1);}
  .cmd-result-icon{width:28px;height:28px;border-radius:5px;background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;}
  .cmd-result-name{font-size:12px;font-weight:700;font-family:'Syne',sans-serif;}
  .cmd-result-cat{font-size:10px;color:var(--text-muted);}
  .cmd-result-shortcut{margin-left:auto;font-size:10px;color:var(--text-muted);}

  @media(max-width:900px){.tools-sidebar{display:none;}}
`;

// ══════════════════════════════════════════════════════
// DATABASE & STORAGE
// ══════════════════════════════════════════════════════

export default function AbsterTools({ onClose }: { onClose?: () => void }) {
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [activeCat, setActiveCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNative, setActiveNative] = useState<string | null>(null);
  const [showNativeModules, setShowNativeModules] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedFavs = localStorage.getItem('abs_favs');
    if (savedFavs) {
      try {
        setFavorites(new Set(JSON.parse(savedFavs)));
      } catch (e) {}
    }

    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Implement command palette logic if needed
      }
      if (e.key === 'Escape') {
        setActiveNative(null);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const toggleFav = (id: number) => {
    const newFavs = new Set(favorites);
    if (newFavs.has(id)) newFavs.delete(id);
    else newFavs.add(id);
    setFavorites(newFavs);
    localStorage.setItem('abs_favs', JSON.stringify([...newFavs]));
  };

  const filteredTools = TOOLS.filter(t => {
    const matchesCat = activeCat === 'all' || (activeCat === 'favorites' ? favorites.has(t.id) : t.cat === activeCat);
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.sub.toLowerCase().includes(q) || t.tags.some(g => g.includes(q));
    return matchesCat && matchesSearch;
  });

  const toolGroups: Record<string, typeof TOOLS> = {};
  filteredTools.forEach(t => {
    const group = (activeCat === 'all' || activeCat === 'favorites') ? t.cat : 'results';
    if (!toolGroups[group]) toolGroups[group] = [];
    toolGroups[group].push(t);
  });

  if (!isMounted) return null;

  return (
    <div className="tools-container h-full w-full overflow-hidden">
      <style>{STYLES}</style>
      
      <div className="app-shell">
        <header className="tools-header">
          <div className="logo flex items-center gap-3">
            {onClose && (
              <button onClick={onClose} className="flex items-center gap-1 px-2 py-1 bg-[#111] border border-[#333] text-[#A0A0A0] rounded cursor-pointer text-[9px] tracking-widest font-bold transition-all hover:bg-[#222]">
                <span>←</span> BACK
              </button>
            )}
            {!onClose && (
              <>
                <div className="logo-mark"></div>
                <div className="logo-text uppercase font-bold tracking-widest text-xs">ABSTER <span className="text-violet-500">TOOLS</span></div>
              </>
            )}
          </div>
          <div className="header-actions">
            <div className="header-stat text-[10px] uppercase tracking-tighter">tools indexed</div>
            <div className="header-stat text-[10px] uppercase tracking-tighter border-l border-white/10 pl-3"><strong>17</strong> native modules</div>
            <div className="kbd-hint ml-4 border border-white/5 bg-white/5 px-2 py-1 rounded text-[9px] uppercase font-bold text-white/40">Search <span className="kbd text-white/60">⌘K</span></div>
          </div>
        </header>

        <div className="main-content-area">
          <aside className="tools-sidebar">
            <div className="sidebar-section">
              <div className="sidebar-label px-4 text-[9px] uppercase font-bold text-white/20 mb-2">Categories</div>
              <div className={`cat-item ${activeCat === 'all' ? 'active' : ''}`} onClick={() => setActiveCat('all')}>
                <div className="cat-dot bg-violet-500"></div>
                All Tools
                <span className="cat-count ml-auto text-[9px] bg-white/5 px-1.5 rounded-full text-white/40">{TOOLS.length}</span>
              </div>
              {Object.entries(CAT_LABELS).filter(([k]) => k !== 'all').map(([k, label]) => (
                <div key={k} className={`cat-item ${activeCat === k ? 'active' : ''}`} onClick={() => setActiveCat(k)}>
                  <div className="cat-dot" style={{ background: (CAT_COLORS as any)[k] }}></div>
                  {label}
                  <span className="cat-count ml-auto text-[9px] bg-white/5 px-1.5 rounded-full text-white/40">{TOOLS.filter(t => t.cat === k).length}</span>
                </div>
              ))}
            </div>
            <div className="sidebar-divider border-t border-white/5 my-2 mx-4"></div>
            <div className="sidebar-section">
              <div className="sidebar-label px-4 text-[9px] uppercase font-bold text-white/20 mb-2">Saved</div>
              <div className={`cat-item ${activeCat === 'favorites' ? 'active' : ''}`} onClick={() => setActiveCat('favorites')}>
                <span>⭐</span> Favorites
                <span className="cat-count ml-auto text-[9px] bg-white/5 px-1.5 rounded-full text-white/40">{favorites.size}</span>
              </div>
            </div>
          </aside>

          <main className="scroll-content bg-black/20">
            <div className="search-area">
              <div className="search-wrap relative max-w-2xl">
                <span className="search-icon absolute left-3 top-1/2 -translate-y-1/2 text-white/20">🔍</span>
                <input 
                  className="search-input w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-violet-500/50 transition-colors" 
                  placeholder="Search tools by name, function, or target type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="search-tags flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-none">
                {['Username', 'Email', 'Domain', 'IP/Network', 'Image', 'Phone', 'Breach', 'Free', 'API'].map(tag => (
                  <div 
                    key={tag} 
                    className={`tag cursor-pointer whitespace-nowrap px-3 py-1 rounded-full text-[10px] border transition-all ${searchQuery.toLowerCase() === tag.toLowerCase() ? 'bg-violet-500/20 border-violet-500 text-violet-400' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'}`}
                    onClick={() => setSearchQuery(searchQuery.toLowerCase() === tag.toLowerCase() ? '' : tag)}
                  >
                    {tag}
                  </div>
                ))}
              </div>
            </div>

            <div className="native-bar px-6 py-4">
              <div className="native-label text-[9px] font-bold text-white/40 hover:text-white/80 uppercase tracking-widest flex items-center gap-3 mb-4 cursor-pointer transition-colors select-none" onClick={() => setShowNativeModules(!showNativeModules)}>
                ⚡ NATIVE MODULES (BETA)
                <span className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded ml-2 text-white/60">{showNativeModules ? 'HIDE' : 'SHOW'}</span>
                <div className="h-px bg-white/5 flex-1"></div>
              </div>
              {showNativeModules && (
              <div className="native-tools-row flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                {[
                  { id: 'username', label: 'Username Intel', color: 'var(--violet)', type: 'FREE' },
                  { id: 'phone', label: 'Phone Analyzer', color: 'var(--emerald)', type: 'FREE' },
                  { id: 'domain', label: 'Domain Recon', color: 'var(--blue)', type: 'FREE' },
                  { id: 'crypto', label: 'Crypto Tracer', color: 'var(--lime)', type: 'FREE' },
                  { id: 'breach', label: 'Breach Monitor', color: 'var(--orange)', type: 'API' },
                  { id: 'ip', label: 'IP Intelligence', color: 'var(--cyan)', type: 'API' },
                  { id: 'email', label: 'Email Investigator', color: 'var(--amber)', type: 'API' },
                  { id: 'dorks', label: 'Dorks Generator', color: 'var(--blue)', type: 'FREE' },
                  { id: 'metadata', label: 'Metadata Extractor', color: 'var(--pink)', type: 'FREE' },
                  { id: 'permutator', label: 'Email Permutator', color: 'var(--teal)', type: 'FREE' },
                  { id: 'decoder', label: 'Decoder / Analyst', color: 'var(--violet)', type: 'FREE' },
                  { id: 'wayback', label: 'Wayback Viewer', color: 'var(--cyan)', type: 'FREE' },
                  { id: 'reporter', label: 'Report Generator', color: 'var(--emerald)', type: 'FREE' },
                  { id: 'people', label: 'People Search', color: 'var(--pink)', type: 'FREE' },
                  { id: 'identity', label: 'Identity Correlator', color: 'var(--amber)', type: 'FREE' },
                  { id: 'darkweb', label: 'Dark Web Monitor', color: 'var(--gray)', type: 'FREE' },
                  { id: 'iot', label: 'IoT Device Finder', color: 'var(--red)', type: 'FREE' },
                ].map(mod => (
                  <div 
                    key={mod.id} 
                    className="native-chip flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all text-xs font-medium text-white/60"
                    onClick={() => setActiveNative(mod.id)}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: mod.color }}></div>
                    {mod.label}
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${mod.type === 'FREE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {mod.type}
                    </span>
                  </div>
                ))}
              </div>
              )}
            </div>

            <div className="tools-area-scroll px-6 py-4">
              {Object.entries(toolGroups).map(([cat, tools]) => (
                <div key={cat} className="cat-section mb-10">
                  <div className="cat-section-title flex items-center gap-3 mb-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                    <span style={{ color: (CAT_COLORS as any)[cat] || 'var(--violet)' }}>●</span>
                    {(CAT_LABELS as any)[cat] || 'Tools'}
                    <span className="bg-white/5 px-2 py-0.5 rounded-full text-[9px] text-white/40 border border-white/5">{tools.length} TOOLS</span>
                    <div className="h-px bg-white/5 flex-1"></div>
                  </div>
                  <div className="tool-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {tools.map(t => (
                      <div key={t.id} className="tool-card group relative bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all overflow-hidden flex flex-col gap-3">
                        <div className="absolute top-0 left-0 w-full h-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: t.color }}></div>
                        <div className="tool-header flex items-start gap-3">
                          <div className="tool-icon w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: `${t.color}20`, color: t.color }}>
                            {t.icon}
                          </div>
                          <div className="tool-meta flex-1 min-w-0">
                            <div className="tool-name font-bold text-sm text-white truncate">{t.name}</div>
                            <div className="tool-cat text-[10px] text-white/30 font-medium uppercase tracking-tighter">
                              {(CAT_LABELS as any)[t.cat] || t.cat} · {t.sub}
                            </div>
                          </div>
                          <button 
                            className={`text-lg transition-colors ${favorites.has(t.id) ? 'text-amber-400' : 'text-white/10 hover:text-white/40'}`}
                            onClick={() => toggleFav(t.id)}
                          >
                            {favorites.has(t.id) ? '★' : '☆'}
                          </button>
                        </div>
                        <div className="tool-desc text-[11px] leading-relaxed text-white/50 line-clamp-2 h-8">
                          {t.desc}
                        </div>
                        <div className="tool-footer mt-auto flex items-center gap-2 pt-2">
                          {t.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[9px] border border-white/10 px-2 py-0.5 rounded text-white/30 uppercase font-bold tracking-tighter">
                              {tag}
                            </span>
                          ))}
                          <div className="flex gap-2 ml-auto">
                            <button className="text-[10px] font-bold text-white/40 hover:text-white transition-colors" onClick={() => window.open(t.url, '_blank')}>
                              LAUNCH ↗
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>

      {activeNative && (
        <>
          <div className="native-overlay visible fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000]" onClick={() => setActiveNative(null)}></div>
          <div className="native-panel visible fixed top-0 right-0 h-full w-full max-w-2xl bg-[#111116] border-l border-white/10 z-[1001] flex flex-col shadow-2xl transition-transform">
            <div className="panel-header flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--violet)' }}></div>
                <div>
                  <div className="panel-title text-sm font-bold uppercase tracking-widest text-white">{activeNative.toUpperCase()} INVESTIGATION</div>
                  <div className="panel-subtitle text-[10px] text-white/40 font-medium">Abster Native Intelligence Module</div>
                </div>
              </div>
              <button className="text-white/40 hover:text-white transition-colors p-2" onClick={() => setActiveNative(null)}>
                ✕
              </button>
            </div>
            <div className="panel-body flex-1 overflow-y-auto p-8">
              <div className="text-center py-20 text-white/20">
                <div className="text-4xl mb-4">⚙️</div>
                <div className="text-sm font-bold uppercase tracking-widest">Module Interface Loaded</div>
                <div className="text-[10px] mt-2">Ready for parameters injection</div>
                <div className="mt-8 flex justify-center">
                   <button 
                    className="px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-lg transition-colors uppercase tracking-widest"
                    onClick={() => alert(`Launching ${activeNative} protocol...`)}
                   >
                    Initialize {activeNative}
                   </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
