"use client";

import { useState, useEffect, useMemo } from "react";
import { useAbsterStore } from "../store/absterStore";
import dynamic from "next/dynamic";
import { GoogleGenAI } from "@google/genai";

const IntelMap = dynamic(() => import("./intel-map"), { 
  ssr: false,
  loading: () => <div style={{ color: "#444", fontSize: 10 }}>INITIALIZING_MAP_ENGINE...</div>
});

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&><|/\\";

function useGlitch(text: string, interval = 9000) {
  const [display, setDisplay] = useState(text);
  useEffect(() => {
    const run = () => {
      let iter = 0;
      const id = setInterval(() => {
        setDisplay(text.split("").map((c, i) => {
          if (c === " ") return " ";
          if (i < iter) return text[i];
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }).join(""));
        if (iter++ >= text.length) { clearInterval(id); setDisplay(text); }
      }, 35);
    };
    run();
    const loop = setInterval(run, interval);
    return () => clearInterval(loop);
  }, [text, interval]);
  return display;
}

export default function AbsterIntelligence() {
  const title = useGlitch("ABSTER INTELLIGENCE MODULE", 12000);
  const { entities, relations, cases, activeCaseId, vaultFiles, chats } = useAbsterStore();
  
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const activeCase = useMemo(() => cases.find(c => c.id === activeCaseId), [cases, activeCaseId]);
  
  const caseEntities = useMemo(() => entities.filter(e => e.caseId === activeCaseId), [entities, activeCaseId]);
  const caseRelations = useMemo(() => relations.filter(r => r.caseId === activeCaseId), [relations, activeCaseId]);
  
  const caseChats = useMemo(() => chats.filter(c => c.caseId === activeCaseId), [chats, activeCaseId]);
  const caseFiles = useMemo(() => {
    const chatIds = new Set(caseChats.map(c => c.id));
    return vaultFiles.filter(f => chatIds.has(f.chatId));
  }, [vaultFiles, caseChats]);

  const totalIntelVolume = caseEntities.length + caseRelations.length + caseFiles.length;

  const generateAIAnalysis = async () => {
    if (!activeCase || isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      let apiKey: string | undefined = undefined;
      try {
        const { db } = await import('../lib/db');
        const settings = await db.settings.get('current_user_settings');
        if (settings?.providers) {
          const geminiProvider = settings.providers.find((p: any) => p.type === 'gemini');
          if (geminiProvider?.apiKey) {
            try { apiKey = atob(geminiProvider.apiKey); } catch { apiKey = geminiProvider.apiKey; }
          }
        }
      } catch (err) {}
      if (!apiKey) throw new Error("API Key not configured");
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-2.0-flash";
      
      const prompt = `
        You are an Abster Intelligence Analyst. Analyze the following investigation data and provide a professional, concise, and actionable summary.
        
        CASE DATA:
        - Title: ${activeCase.title}
        - Code Name: ${activeCase.codeName}
        - Priority: ${activeCase.priority}
        - Status: ${activeCase.status}
        
        ENTITIES (${caseEntities.length}):
        ${caseEntities.map(e => `- [${e.type}] ${e.name}: ${e.description || "No description"}`).join('\n')}
        
        RELATIONS (${caseRelations.length}):
        ${caseRelations.map(r => {
          const source = caseEntities.find(e => e.id === r.source)?.name || "Unknown";
          const target = caseEntities.find(e => e.id === r.target)?.name || "Unknown";
          return `- ${source} --(${r.type})--> ${target}`;
        }).join('\n')}
        
        EVIDENCE FILES (${caseFiles.length}):
        ${caseFiles.map(f => `- ${f.name} (${f.type})`).join('\n')}
        
        CURRENT FINDINGS:
        ${activeCase.findings || "No findings recorded yet."}
        
        TASK:
        Identify hidden patterns, potential risks, and recommended next steps for the field agents. 
        Keep the tone technical, cold, and professional (Abster style). 
        Format the output in a few short paragraphs.
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      setAiAnalysis(response.text || "Analysis failed to generate.");
    } catch (error) {
      console.error("AI Analysis Error:", error);
      setAiAnalysis("ERROR: FAILED_TO_CONNECT_TO_COGNITIVE_ENGINE");
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Phase 3: Map Normalization & Hotspots
  const mapPoints = useMemo(() => {
    const points = caseEntities.filter(e => e.lat !== undefined && e.lng !== undefined);
    if (points.length === 0) return [];

    // Find bounds
    let minLat = Math.min(...points.map(p => p.lat!));
    let maxLat = Math.max(...points.map(p => p.lat!));
    let minLng = Math.min(...points.map(p => p.lng!));
    let maxLng = Math.max(...points.map(p => p.lng!));

    // Add padding to avoid points hitting the edges
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const padding = 0.15; // 15% padding

    const latRange = latDiff === 0 ? 0.01 : latDiff;
    const lngRange = lngDiff === 0 ? 0.01 : lngDiff;

    const finalMinLat = minLat - latRange * padding;
    const finalMaxLat = maxLat + latRange * padding;
    const finalMinLng = minLng - lngRange * padding;
    const finalMaxLng = maxLng + lngRange * padding;

    return points.map(p => ({
      ...p,
      x: ((p.lng! - finalMinLng) / (finalMaxLng - finalMinLng)) * 100,
      y: (1 - (p.lat! - finalMinLat) / (finalMaxLat - finalMinLat)) * 100, // Invert Y for screen
    }));
  }, [caseEntities]);

  // Phase 2: Activity Feed
  const activityFeed = useMemo(() => {
    if (activeCase?.activityLog && activeCase.activityLog.length > 0) {
      return activeCase.activityLog.slice(-5).reverse().map((log: any) => ({
        type: log.type || "INFO",
        msg: log.message || log.action || "System event",
        time: log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "Recent",
        color: log.type === "CRITICAL" ? "#EF4444" : log.type === "WARNING" ? "#F59E0B" : "#594DFF"
      }));
    }
    
    // Fallback to recent entities/files if log is empty
    const recentEvents = [
      ...caseEntities.slice(-2).map(e => ({ type: "INFO", msg: `New Entity: ${e.name}`, time: "Recent", color: "#594DFF" })),
      ...caseFiles.slice(-2).map(f => ({ type: "DOCUMENT", msg: `File Uploaded: ${f.name}`, time: "Recent", color: "#10B981" }))
    ];
    
    return recentEvents.length > 0 ? recentEvents : [
      { type: "SYSTEM", msg: "Awaiting operational data...", time: "Now", color: "#444" }
    ];
  }, [activeCase, caseEntities, caseFiles]);

  return (
    <div className="intelligence-grid" style={{ 
      width: "100%", 
      height: "100%", 
      background: "#050505", 
      color: "#fff", 
      fontFamily: "'Source Code Pro', monospace",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      position: "relative"
    }}>
      {/* Header */}
      <div style={{ 
        padding: "20px 30px", 
        borderBottom: "1px solid #1a1a1a", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        background: "rgba(5,5,5,0.8)",
        backdropFilter: "blur(10px)",
        zIndex: 10
      }}>
        <div>
          <div style={{ fontSize: 10, color: "#594DFF", letterSpacing: "0.2em", marginBottom: 4 }}>OPERATIONAL INTELLIGENCE: {activeCase?.codeName || "NO_ACTIVE_CASE"}</div>
          <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.05em" }}>{title}</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, color: "#444" }}>STATUS: <span style={{ color: activeCase ? "#10B981" : "#EF4444" }}>{activeCase ? "ACTIVE" : "STANDBY"}</span></div>
          <div style={{ fontSize: 9, color: "#444" }}>STORAGE: <span style={{ color: "#70C8FF" }}>Base64 (local only)</span></div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 30, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 20 }}>
        
        {/* Left Column - Stats & Feeds */}
        <div style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 10, color: "#444", marginBottom: 15, letterSpacing: "0.1em" }}>INTELLIGENCE VOLUME</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 32, fontWeight: 800 }}>{totalIntelVolume}</div>
              <div style={{ fontSize: 10, color: "#10B981", marginBottom: 6 }}>DATA_POINTS</div>
            </div>
            <div style={{ height: 40, display: "flex", alignItems: "flex-end", gap: 2 }}>
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} style={{ flex: 1, background: "#594DFF", opacity: 0.2 + (Math.random() * 0.8), height: `${20 + Math.random() * 80}%` }} />
              ))}
            </div>
          </div>

          <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 12, padding: 20, flex: 1 }}>
            <div style={{ fontSize: 10, color: "#444", marginBottom: 15, letterSpacing: "0.1em" }}>LIVE THREAT FEED</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activityFeed.map((item, i) => (
                <div key={i} style={{ fontSize: 10, borderBottom: "1px solid #111", paddingBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: item.color, fontWeight: 700 }}>{item.type}</span>
                    <span style={{ color: "#333" }}>{item.time}</span>
                  </div>
                  <div style={{ color: "#a0a0a0" }}>{item.msg}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Column - Map or Main Analysis */}
        <div style={{ gridColumn: "span 8", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 12, padding: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, opacity: 0.1, pointerEvents: "none" }}>
            <div style={{ width: "100%", height: "100%", backgroundImage: "radial-gradient(circle at center, #594DFF 0%, transparent 70%)" }} />
          </div>
          
          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={{ fontSize: 10, color: "#444", marginBottom: 20, letterSpacing: "0.1em" }}>GEOSPATIAL INTELLIGENCE OVERLAY</div>
            
            <div style={{ height: 400, border: "1px solid #1a1a1a", borderRadius: 8, background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
               {/* Real Leaflet Map (Phase 3 Fix) */}
               <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
                 <IntelMap points={caseEntities.filter(e => e.lat !== undefined && e.lng !== undefined)} />
               </div>

               {/* Tactical Grid Overlay (Semi-transparent) */}
               <div style={{ position: "absolute", inset: 0, opacity: 0.1, backgroundImage: "linear-gradient(#594DFF 1px, transparent 1px), linear-gradient(90deg, #594DFF 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none", zIndex: 2 }} />
               
               {/* Scanning Line Effect */}
               <div style={{ 
                 position: "absolute", 
                 top: 0, 
                 left: 0, 
                 width: "100%", 
                 height: "2px", 
                 background: "linear-gradient(to bottom, transparent, #594DFF, transparent)", 
                 boxShadow: "0 0 15px #594DFF",
                 animation: "scanLine 4s linear infinite",
                 zIndex: 5,
                 pointerEvents: "none"
               }} />
               <style>{`
                 @keyframes scanLine {
                   0% { top: -2%; }
                   100% { top: 102%; }
                 }
                 @keyframes pulsePoint {
                   0% { transform: scale(1); opacity: 1; }
                   50% { transform: scale(1.5); opacity: 0.5; }
                   100% { transform: scale(1); opacity: 1; }
                 }
               `}</style>
               
               {/* Hotspot Indicators (if many points) */}
               {caseEntities.filter(e => e.lat !== undefined && e.lng !== undefined).length > 5 && (
                 <div style={{ 
                   position: "absolute", 
                   bottom: 20, 
                   right: 20, 
                   fontSize: 10, 
                   color: "#EF4444", 
                   fontWeight: 700,
                   background: "rgba(239, 68, 68, 0.1)",
                   padding: "4px 8px",
                   border: "1px solid #EF4444",
                   borderRadius: 4,
                   animation: "pulsePoint 1s infinite",
                   zIndex: 6
                 }}>
                   HIGH_DENSITY_HOTSPOT_DETECTED
                 </div>
               )}
               
               <div style={{ 
                 position: "absolute", 
                 bottom: 10, 
                 left: 10, 
                 fontSize: 10, 
                 color: "#444", 
                 zIndex: 6 
               }}>
                 {caseEntities.filter(e => e.lat !== undefined && e.lng !== undefined).length > 0 ? "TACTICAL_OVERLAY_ACTIVE" : "MAP_ENGINE_OFFLINE"}
               </div>
            </div>

            <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <div style={{ fontSize: 10, color: "#444", marginBottom: 10 }}>ACTIVE TARGETS</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{caseEntities.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#444", marginBottom: 10 }}>THREAT LEVEL</div>
                <div style={{ 
                  fontSize: 24, 
                  fontWeight: 800, 
                  color: activeCase?.priority === 'CRITICAL' ? "#EF4444" : activeCase?.priority === 'HIGH' ? "#F59E0B" : "#10B981" 
                }}>
                  {activeCase?.priority || "NORMAL"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row - Detailed Analysis */}
        <div style={{ gridColumn: "span 12", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
            <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.1em" }}>CONTEXTUAL ANALYSIS SUMMARY</div>
            <button 
              onClick={generateAIAnalysis}
              disabled={isAnalyzing || !activeCase}
              style={{
                background: "transparent",
                border: "1px solid #594DFF",
                color: "#594DFF",
                fontSize: 9,
                padding: "4px 12px",
                borderRadius: 4,
                cursor: "pointer",
                opacity: isAnalyzing || !activeCase ? 0.5 : 1,
                transition: "all 0.2s ease"
              }}
            >
              {isAnalyzing ? "ANALYZING..." : "GENERATE AI SUMMARY"}
            </button>
          </div>
          <div style={{ fontSize: 12, color: "#a0a0a0", lineHeight: 1.8, minHeight: 60 }}>
            {aiAnalysis ? (
              <div style={{ whiteSpace: "pre-wrap" }}>{aiAnalysis}</div>
            ) : (
              activeCase?.findings || `Investigation into ${activeCase?.title || "current case"} is ongoing. 
              The intelligence module has identified ${caseEntities.length} entities and ${caseRelations.length} active relationships. 
              ${caseFiles.length > 0 ? `Analysis of ${caseFiles.length} evidence files is currently in progress.` : "No evidence files have been linked to this case yet."}
              Recommend further geospatial correlation to identify potential hotspots.`
            )}
          </div>
        </div>

      </div>

      {/* Footer / Status Bar */}
      <div style={{ 
        padding: "10px 30px", 
        borderTop: "1px solid #1a1a1a", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        fontSize: 9,
        color: "#333",
        background: "#050505"
      }}>
        <div>SYSTEM_TIME: {new Date().toISOString()}</div>
        <div>OPERATOR: {activeCase?.leadInvestigator || "[REDACTED]"}</div>
        <div>VERSION: 1.0.0</div>
      </div>
    </div>
  );
}
