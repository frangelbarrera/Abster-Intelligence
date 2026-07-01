"use client";

import React, { useMemo } from 'react';
import Image from 'next/image';
import { useAbsterStore } from '../store/absterStore';

export default function GlobalSearch() {
  const { entities, relations, vaultFiles, cases, activeCaseId } = useAbsterStore();
  
  const activeCase = useMemo(() => cases.find(c => c.id === activeCaseId), [cases, activeCaseId]);
  const caseEntities = useMemo(() => entities.filter(e => e.caseId === activeCaseId), [entities, activeCaseId]);
  
  // Stats Calculation
  const stats = useMemo(() => {
    const total = caseEntities.length;
    const suspicious = caseEntities.filter(e => e.isSuspicious).length;
    const normal = total - suspicious;
    
    // Mocking some distribution for the bar
    const critical = Math.ceil(suspicious * 0.4);
    const elevated = suspicious - critical;
    
    return {
      total,
      critical,
      elevated,
      normal,
      criticalPerc: total ? (critical / total) * 100 : 0,
      elevatedPerc: total ? (elevated / total) * 100 : 0,
      normalPerc: total ? (normal / total) * 100 : 0,
    };
  }, [caseEntities]);

  // Filter Counts
  const typeCounts = useMemo(() => {
    return caseEntities.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [caseEntities]);

  // Event Stream
  const events = useMemo(() => {
    if (activeCase?.activityLog && activeCase.activityLog.length > 0) {
      return [...activeCase.activityLog].reverse();
    }
    
    // Fallback events if log is empty
    const fallback = [];
    if (caseEntities.length > 0) {
      fallback.push({
        id: 'e1',
        type: 'ENTITY_DETECTION',
        message: `${caseEntities.length} entities identified in current sector.`,
        timestamp: new Date().toISOString(),
        severity: 'info'
      });
    }
    if (vaultFiles.filter(f => f.chatId).length > 0) {
      fallback.push({
        id: 'e2',
        type: 'DATA_INGESTION',
        message: `Secure vault synchronization complete. New evidence packets decrypted.`,
        timestamp: new Date().toISOString(),
        severity: 'success'
      });
    }
    return fallback;
  }, [activeCase, caseEntities, vaultFiles]);

  const [aiReport, setAiReport] = React.useState<string>("Initializing Sentinel AI analysis...");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [filterType, setFilterType] = React.useState<string | null>(null);
  const [isScanning, setIsScanning] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [intelFilters, setIntelFilters] = React.useState<string[]>(['MILITARY_MOVEMENTS', 'GEOPOLITICAL_SHIFT', 'ENVIRONMENTAL_HAZARD', 'CYBER_ANOMALY']);

  // Listen for global scan trigger
  React.useEffect(() => {
    const handleGlobalScan = () => handleManualScan();
    window.addEventListener('abster:initiate_scan', handleGlobalScan);
    return () => window.removeEventListener('abster:initiate_scan', handleGlobalScan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // AI Report Generation
  const generateReport = React.useCallback(async () => {
    if (!activeCase) return;
    setIsGenerating(true);
    try {
      const { GoogleGenAI } = await import("@google/genai");
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
      
      const prompt = `
        You are the Abster Sentinel AI. Analyze the following investigation data and provide a concise, tactical "Sentinel Report" (max 60 words).
        Focus on patterns, risks, and immediate tactical recommendations.
        
        CASE: ${activeCase.codeName}
        FINDINGS: ${activeCase.findings}
        ENTITIES: ${caseEntities.map(e => `${e.name} (${e.type}, Suspicious: ${e.isSuspicious})`).join(', ')}
        
        Format: Direct, professional, high-security clearance tone.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });

      setAiReport(response.text || "Analysis failed. Manual review required.");
    } catch (error) {
      console.error("AI Report Error:", error);
      setAiReport("Error connecting to Sentinel Uplink. Check credentials.");
    } finally {
      setIsGenerating(false);
    }
  }, [activeCase, caseEntities]);

  React.useEffect(() => {
    generateReport();
  }, [activeCaseId, caseEntities.length, generateReport]);

  const handleManualScan = () => {
    setIsScanning(true);
    // Simulate satellite sync
    setTimeout(() => {
      setIsScanning(false);
      generateReport();
    }, 2000);
  };

  const downloadIntelPacket = () => {
    if (!activeCase) return;
    const content = `
ABSTER SENTINEL INTELLIGENCE PACKET
====================================
CASE: ${activeCase.codeName}
TITLE: ${activeCase.title}
STATUS: ${activeCase.status.toUpperCase()}
DATE: ${new Date().toISOString()}

SENTINEL AI REPORT:
------------------
${aiReport}

ENTITIES IDENTIFIED:
-------------------
${caseEntities.map(e => `- ${e.name} [${e.type}] (Suspicious: ${e.isSuspicious})`).join('\n')}

LATEST ACTIVITY:
---------------
${events.slice(0, 10).map(e => `[${new Date(e.timestamp).toLocaleString()}] ${e.message}`).join('\n')}

END OF PACKET
    `;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `INTEL_PACKET_${activeCase.codeName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleIntelFilter = (type: string) => {
    setIntelFilters(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      // Type filter (Entity Classification)
      const matchesType = !filterType || e.type?.includes(filterType) || e.message?.toUpperCase().includes(filterType.toUpperCase());
      
      // Search query filter
      const matchesSearch = !searchQuery || e.message.toLowerCase().includes(searchQuery.toLowerCase()) || e.type?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Intel category filter (simulated mapping for demo purposes)
      // In a real app, events would have a category field.
      let category = 'GEOPOLITICAL_SHIFT';
      if (e.type?.includes('ENTITY')) category = 'GEOPOLITICAL_SHIFT';
      if (e.type?.includes('DATA')) category = 'CYBER_ANOMALY';
      if (e.message?.toLowerCase().includes('military') || e.message?.toLowerCase().includes('sector')) category = 'MILITARY_MOVEMENTS';
      
      const matchesIntel = intelFilters.includes(category);

      return matchesType && matchesSearch && matchesIntel;
    });
  }, [events, filterType, searchQuery, intelFilters]);

  return (
    <div className="p-6 h-full w-full overflow-y-auto bg-[#0e0e0e] custom-scrollbar">
      <div className="grid grid-cols-12 gap-6 min-h-full w-full">
        {/* Left Sidebar: Filters & Stats */}
      <section className="col-span-12 lg:col-span-3 flex flex-col gap-6">
        <div className="bg-[#131313] p-4 border-l border-[#81ecff]/20">
          <h2 className="font-headline text-xs font-bold text-[#adaaaa] tracking-[0.2em] mb-4 flex items-center gap-2">
            <span className={`w-1.5 h-1.5 bg-[#81ecff] ${isScanning ? 'animate-ping' : 'animate-pulse'}`}></span>
            FILTER_OPERATIONS
          </h2>
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-headline text-[#81ecff]/60 block mb-2 tracking-widest uppercase">Entity Classification</label>
              <div className="space-y-1">
                <button 
                  onClick={() => setFilterType(null)}
                  className={`w-full flex justify-between items-center px-3 py-2 text-xs font-headline transition-colors ${!filterType ? 'bg-[#81ecff]/10 text-[#81ecff] border-r-2 border-[#81ecff]' : 'bg-[#201f1f] text-white hover:bg-[#262626]'}`}
                >
                  <span>ALL_ENTITIES</span>
                  <span className="text-[#81ecff]/40 font-mono">[{caseEntities.length.toString().padStart(2, '0')}]</span>
                </button>
                {Object.entries(typeCounts).map(([type, count]) => (
                  <button 
                    key={type} 
                    onClick={() => setFilterType(type)}
                    className={`w-full flex justify-between items-center px-3 py-2 text-xs font-headline transition-colors ${filterType === type ? 'bg-[#81ecff]/10 text-[#81ecff] border-r-2 border-[#81ecff]' : 'bg-[#201f1f] text-white hover:bg-[#262626]'}`}
                  >
                    <span>{type}</span>
                    <span className="text-[#81ecff]/40 font-mono">[{count.toString().padStart(2, '0')}]</span>
                  </button>
                ))}
                {Object.keys(typeCounts).length === 0 && (
                  <p className="text-[10px] text-[#525252] italic px-3">No data available</p>
                )}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-headline text-[#81ecff]/60 block mb-2 tracking-widest uppercase">Intelligence Type</label>
              <div className="grid grid-cols-1 gap-2">
                {['MILITARY_MOVEMENTS', 'GEOPOLITICAL_SHIFT', 'ENVIRONMENTAL_HAZARD', 'CYBER_ANOMALY'].map(type => (
                  <label key={type} className="flex items-center gap-3 p-2 cursor-pointer hover:bg-white/5 transition-colors">
                    <input 
                      type="checkbox"
                      checked={intelFilters.includes(type)}
                      onChange={() => toggleIntelFilter(type)}
                      className="form-checkbox bg-[#000000] border-[#494847] text-[#81ecff] focus:ring-0 rounded-none" 
                    />
                    <span className={`text-xs font-headline transition-colors ${intelFilters.includes(type) ? 'text-white' : 'text-[#adaaaa]/40'}`}>{type}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Risk Distribution */}
        <div className="bg-[#131313] p-4">
          <h2 className="font-headline text-[10px] font-bold text-[#adaaaa] tracking-[0.2em] mb-4 uppercase">Risk_Profile</h2>
          <div className="flex h-1 bg-[#262626] overflow-hidden">
            <div style={{ width: `${stats.criticalPerc}%` }} className="bg-[#ff716c] shadow-[0_0_8px_rgba(255,113,108,0.5)] transition-all duration-500"></div>
            <div style={{ width: `${stats.elevatedPerc}%` }} className="bg-[#ffd16c] shadow-[0_0_8px_rgba(255,209,108,0.5)] transition-all duration-500"></div>
            <div style={{ width: `${stats.normalPerc}%` }} className="bg-[#81ecff] shadow-[0_0_8px_rgba(129,236,255,0.5)] transition-all duration-500"></div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-[#ff716c]">CRITICAL_THREAT</span>
              <span className="text-white">{stats.critical.toString().padStart(2, '0')}</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-[#ffd16c]">ELEVATED_RISK</span>
              <span className="text-white">{stats.elevated.toString().padStart(2, '0')}</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-[#81ecff]">STANDARD_LOG</span>
              <span className="text-white">{stats.normal.toString().padStart(2, '0')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Feed */}
      <section className="col-span-12 lg:col-span-6 flex flex-col gap-4">
        {/* Feed Header */}
        <div className="flex justify-between items-end border-b border-[#494847]/30 pb-4">
          <div className="flex-1">
            <h1 className="font-headline text-2xl font-bold tracking-tight text-white">GLOBAL_EVENT_STREAM</h1>
            <div className="mt-2 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#81ecff]/40 text-sm">search</span>
              <input 
                type="text" 
                placeholder="SEARCH_STREAM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#131313] border border-[#494847]/30 pl-10 pr-4 py-2 text-xs font-mono text-white focus:border-[#81ecff]/50 outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex gap-2 ml-4 mb-1">
            <span className={`px-2 py-1 bg-[#262626] text-[10px] font-mono text-[#81ecff] border border-[#81ecff]/20 ${isScanning ? 'animate-pulse' : ''}`}>
              {isScanning ? 'SYNCING...' : 'LIVE_SYNC'}
            </span>
          </div>
        </div>
        {/* News Cards */}
        <div className="space-y-4 pr-2 custom-scrollbar">
          {filteredEvents.map((event: any, idx) => {
            const isCritical = event.severity === 'error' || event.type?.includes('CRITICAL');
            const isElevated = event.severity === 'warning' || event.type?.includes('ELEVATED');
            
            return (
              <article key={event.id || idx} className={`bg-[#131313] border-l-4 ${isCritical ? 'border-[#ff716c]' : isElevated ? 'border-[#ffd16c]' : 'border-[#81ecff]'} group relative overflow-hidden transition-all duration-300`}>
                <div className={`absolute inset-0 ${isCritical ? 'bg-[#ff716c]/5' : isElevated ? 'bg-[#ffd16c]/5' : 'bg-[#81ecff]/5'} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                <div className="p-4 relative">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`${isCritical ? 'bg-[#ff716c]/20 text-[#ff716c]' : isElevated ? 'bg-[#ffd16c]/20 text-[#ffd16c]' : 'bg-[#81ecff]/20 text-[#81ecff]'} text-[10px] font-bold px-2 py-0.5 font-headline tracking-widest`}>
                        {isCritical ? 'CRITICAL' : isElevated ? 'ELEVATED' : 'STANDARD'}
                      </span>
                      <span className="text-[10px] font-mono text-[#adaaaa]">TYPE: {event.type || 'LOG'}</span>
                    </div>
                    <span className={`text-[10px] font-mono ${isCritical ? 'text-[#ff716c]' : 'text-[#adaaaa]'}`}>
                      {new Date(event.timestamp).toLocaleTimeString()} UTC
                    </span>
                  </div>
                  <h3 className={`font-headline text-lg font-bold mb-2 group-hover:${isCritical ? 'text-[#ff716c]' : isElevated ? 'text-[#ffd16c]' : 'text-[#81ecff]'} transition-colors text-white uppercase`}>
                    {event.message.split(':')[0]}
                  </h3>
                  <p className="text-[#adaaaa] text-sm mb-4 leading-relaxed font-body">
                    {event.message}
                  </p>
                  <div className="flex flex-wrap gap-4 text-[10px] font-mono text-[#adaaaa]">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">id_card</span>
                      ID: {event.id?.slice(0, 8) || 'AUTO-GEN'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">rss_feed</span>
                      SOURCE: ABSTER_INTERNAL
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
          
          {filteredEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-[#525252]">
              <span className="material-symbols-outlined text-4xl mb-4">filter_list_off</span>
              <p className="font-headline text-xs tracking-widest uppercase">No events match current filters</p>
            </div>
          )}
        </div>
      </section>

      {/* Right Sidebar: Spatial Visualizer */}
      <section className="col-span-12 lg:col-span-3 flex flex-col gap-6">
        {/* Map Viewport Mini */}
        <div 
          onClick={() => window.dispatchEvent(new CustomEvent('switchView', { detail: 'map' }))}
          className="bg-[#131313] border border-[#494847]/30 aspect-square relative group overflow-hidden cursor-pointer"
        >
          <div className={`scanline-overlay absolute inset-0 z-10 opacity-20 pointer-events-none ${isScanning ? 'animate-pulse' : ''}`}></div>
          <Image
            alt="World Map with Data Overlays"
            className={`w-full h-full object-cover grayscale opacity-60 group-hover:scale-110 transition-transform duration-700 ${isScanning ? 'brightness-150' : ''}`}
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBoVqtsgafPe10jKhK0A-_Tbl0lLRRfYdbYotbGZbobT8zsoGKB2p4r25thEtGSt0jbp1WvxDgijZBPdl9fnd-ISlSz-qLVADcsSqqwaBlCt_DRSSJUWK3aNAAgxc1GomLbGjmS9mUBYmzNp2CtfS51y9u7oj247VNtv1qh8K4hAdAPyE0MsgE-Q4agcD4ivHs7hf3pGipOM5WmQfb4c6v-a3wRZpy0fql0qOQoPxRvTrmPtrQhQSLWpGH999soPt0gTI0iCwIvAU"
            fill
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] to-transparent"></div>
          <div className="absolute top-4 left-4 z-20">
            <div className="flex items-center gap-2 px-2 py-1 bg-[#262626]/80 backdrop-blur-md border border-[#81ecff]/30">
              <span className={`w-2 h-2 bg-[#81ecff] rounded-full ${isScanning ? 'animate-ping' : ''}`}></span>
              <span className="text-[10px] font-headline font-bold text-[#81ecff]">{isScanning ? 'SCANNING...' : 'LIVE_TRACKING'}</span>
            </div>
          </div>
          <div className="absolute bottom-4 left-4 z-20">
            <p className="text-[10px] font-mono text-[#adaaaa] uppercase">Spatial_Context</p>
            <p className="text-xs font-headline font-bold text-white uppercase">{activeCase?.codeName || 'GLOBAL_GRID'}</p>
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm z-30">
             <span className="text-[10px] font-headline text-[#81ecff] font-bold tracking-widest">RETURN_TO_TACTICAL_MAP</span>
          </div>
          {/* Tactical Overlays */}
          {caseEntities.filter(e => e.lat && e.lng).slice(0, 5).map((e, i) => (
            <div 
              key={e.id} 
              className={`absolute w-2 h-2 ${e.isSuspicious ? 'bg-[#ff716c]' : 'bg-[#81ecff]'} rounded-full animate-pulse z-20`}
              style={{ 
                top: `${20 + (i * 15)}%`, 
                left: `${30 + (i * 10)}%` 
              }}
            ></div>
          ))}
        </div>
        {/* AI Insight Panel */}
        <div className="bg-[#131313] p-4 flex-grow border-t-2 border-[#81ecff]">
          <div className="flex items-center gap-2 mb-4">
            <span className={`material-symbols-outlined text-[#81ecff] text-sm ${isGenerating || isScanning ? 'animate-spin' : ''}`}>psychology</span>
            <h2 className="font-headline text-[10px] font-bold text-[#81ecff] tracking-[0.2em] uppercase">AI_SENTINEL_REPORT</h2>
          </div>
          <div className="space-y-4">
            <div className="p-3 bg-[#000000] border border-[#494847]/30 min-h-[100px] relative">
              {(isGenerating || isScanning) && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                  <div className="w-4 h-4 border-2 border-[#81ecff] border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <p className="text-[10px] font-mono text-[#ffd16c] mb-1 uppercase">Case_Status</p>
              <p className="text-xs text-[#adaaaa] leading-relaxed italic">
                {aiReport}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-headline">
                <span className="text-[#adaaaa] uppercase">Case_Confidence</span>
                <span className="text-[#81ecff] font-mono">0.89</span>
              </div>
              <div className="h-1 bg-[#262626]">
                <div className="h-full bg-[#81ecff] w-[89%]"></div>
              </div>
            </div>
            <div className="pt-2">
              <button 
                onClick={downloadIntelPacket}
                className="w-full py-2 border border-[#81ecff]/30 text-[#81ecff] text-[10px] font-headline font-bold tracking-widest uppercase hover:bg-[#81ecff]/10 transition-colors"
              >
                DOWNLOAD_INTEL_PACKET
              </button>
            </div>
          </div>
        </div>
        {/* System Health */}
        <div className="bg-[#131313] p-3 flex justify-between items-center border border-[#494847]/20">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-[#81ecff] rounded-full"></div>
            <span className="text-[10px] font-headline text-[#adaaaa] uppercase">System_Active</span>
          </div>
          <span className="text-[10px] font-mono text-[#81ecff]/40 uppercase">Local_Storage</span>
        </div>
      </section>
      </div>
      
      {/* FAB: Manual Satellite Sync */}
      <button 
        onClick={handleManualScan}
        disabled={isScanning}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-[#81ecff] text-[#003840] shadow-[0_0_30px_rgba(129,236,255,0.3)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center z-50 ${isScanning ? 'opacity-50 cursor-not-allowed animate-pulse' : ''}`}
      >
        <span className={`material-symbols-outlined ${isScanning ? 'animate-spin' : ''}`}>
          {isScanning ? 'sync' : 'add_alert'}
        </span>
      </button>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0e0e0e;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #262626;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #81ecff;
        }
        .scanline-overlay {
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.02), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.02));
          background-size: 100% 2px, 3px 100%;
        }
      `}</style>
    </div>
  );
}
