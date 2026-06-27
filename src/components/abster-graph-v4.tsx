"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useAbsterStore } from '../store/absterStore';
import { TRANSFORMS, runTransform } from '../lib/transforms';
import { TOOLS, CAT_LABELS } from '../data/osint-tools';
import { generateId } from '../lib/utils';
import { ExternalLink, X, Search, Info, Shield, Zap } from 'lucide-react';

// ============================================================
// CONSTANTS
// ============================================================
export interface GraphNode {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  properties?: Record<string, any>;
  confidence: number;
  source: string;
  isVerified: boolean;
  isSuspicious: boolean;
  notes?: string;
  avatar?: string | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
  strength: number;
  notes?: string;
  date?: string;
}

const NODE_COLORS: Record<string, string> = {
  person:"#3B82F6", company:"#10B981", email:"#F59E0B", phone:"#EF4444",
  location:"#8B5CF6", domain:"#6B7280", document:"#FFFFFF", vehicle:"#F97316",
  crypto:"#84CC16", event: "#EC4899", generic:"#9CA3AF",
};
const NODE_ICONS: Record<string, string> = {
  person:"👤", company:"🏢", email:"✉️", phone:"📱", location:"📍",
  domain:"🌐", document:"📄", vehicle:"🚗", crypto:"₿", event: "📅", generic:"◆",
};
const EDGE_LABELS: Record<string, string> = {
  knows:"KNOWS", works_at:"WORKS AT", family_of:"FAMILY OF", owns:"OWNS",
  communicates_with:"COMM.", located_at:"LOCATED AT", registered_to:"REG. TO",
  transaction_with:"TRANSACTION", related_to:"RELATED", custom:"CUSTOM",
};
const RISK_COLORS: Record<string, string> = { high:"#EF4444", medium:"#F59E0B", low:"#10B981", unknown:"#505050" };
const CLUSTER_COLORS = ["#3B82F6","#10B981","#F59E0B","#8B5CF6","#EF4444","#F97316","#84CC16","#06B6D4"];

// PHASE 5 — favicon cache for domain nodes
const FAVICON_CACHE: Record<string, string> = {};
function getFavicon(label: string) {
  if(!label) return null;
  const domain = label.includes("@") ? label.split("@")[1] : label;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

const INITIAL_NODES: GraphNode[] = [
  { id:"1", type:"person",   label:"Viktor Kozlov",          x:400,y:300, properties:{nationality:"Russian",age:"42"},                   confidence:0.9,  source:"manual",       isVerified:false, isSuspicious:true,  notes:"Primary subject. Financial crimes investigation.", avatar:null },
  { id:"2", type:"company",  label:"Novatech Solutions",     x:650,y:200, properties:{industry:"IT Consulting",registration:"CY123456"},  confidence:0.85, source:"ai_extraction",isVerified:false, isSuspicious:false, notes:"", avatar:null },
  { id:"3", type:"email",    label:"vkozlov@protonmail.com", x:200,y:200, properties:{domain:"protonmail.com"},                           confidence:0.95, source:"manual",       isVerified:true,  isSuspicious:false, notes:"", avatar:null },
  { id:"4", type:"location", label:"Limassol, Cyprus",       x:550,y:450, properties:{lat:"34.7071",lng:"33.0226"},                       confidence:0.8,  source:"enrichment",   isVerified:false, isSuspicious:false, notes:"", avatar:null },
  { id:"5", type:"phone",    label:"+357 99 123456",         x:200,y:420, properties:{country:"Cyprus"},                                 confidence:0.75, source:"ai_extraction",isVerified:false, isSuspicious:false, notes:"", avatar:null },
  { id:"6", type:"person",   label:"Elena Volkov",           x:120,y:300, properties:{nationality:"Russian",age:"38"},                   confidence:0.7,  source:"ai_extraction",isVerified:false, isSuspicious:false, notes:"Possible associate.", avatar:null },
  { id:"7", type:"company",  label:"Amber Holdings",         x:80, y:480, properties:{industry:"Real Estate"},                           confidence:0.6,  source:"ai_extraction",isVerified:false, isSuspicious:false, notes:"", avatar:null },
  { id:"8", type:"domain",   label:"novatech-cy.com",        x:750,y:350, properties:{registrar:"Namecheap"},                            confidence:0.9,  source:"enrichment",   isVerified:false, isSuspicious:false, notes:"", avatar:null },
];
const INITIAL_EDGES: GraphEdge[] = [
  { id:"e1", source:"1", target:"2", type:"works_at",      label:"CEO",          strength:10, notes:"Confirmed via company register.", date:"2019-03-15" },
  { id:"e2", source:"1", target:"3", type:"owns",          label:"personal",     strength:10, notes:"",                                date:"2018-07-01" },
  { id:"e3", source:"1", target:"4", type:"located_at",    label:"residence",    strength:8,  notes:"",                                date:"2020-01-10" },
  { id:"e4", source:"2", target:"4", type:"registered_to", label:"headquarters", strength:9,  notes:"",                                date:"2019-03-20" },
  { id:"e5", source:"1", target:"5", type:"owns",          label:"mobile",       strength:7,  notes:"",                                date:"2021-05-22" },
  { id:"e6", source:"1", target:"6", type:"family_of",     label:"spouse",       strength:9,  notes:"Marriage record Cyprus 2009.",    date:"2009-06-14" },
  { id:"e7", source:"6", target:"7", type:"works_at",      label:"CFO",          strength:8,  notes:"",                                date:"2020-09-01" },
  { id:"e8", source:"2", target:"8", type:"registered_to", label:"website",      strength:10, notes:"",                                date:"2019-04-05" },
  { id:"e9", source:"3", target:"8", type:"related_to",    label:"same domain",  strength:6,  notes:"",                                date:"2022-11-30" },
];

// ============================================================
// UTILITIES
// ============================================================
// generateId imported from ../lib/utils
function getNodeRadius(nodeId: string, edges: GraphEdge[]) {
  const c = edges.filter(e=>e.source===nodeId||e.target===nodeId).length;
  return Math.max(28, Math.min(90, 24+c*6));
}
function getEdgeThickness(s: number) { return s<=3?1:s<=6?2:3; }
function parseDate(d: string) { return d ? new Date(d).getTime() : null; }
function formatDate(ts: number) { return new Date(ts).toISOString().split("T")[0]; }

// ============================================================
// ANALYSIS
// ============================================================
function computeCentrality(nodes: GraphNode[], edges: GraphEdge[]) {
  const degree: Record<string, number> = {}, betweenness: Record<string, number> = {};
  nodes.forEach(n=>{degree[n.id]=0;betweenness[n.id]=0;});
  edges.forEach(e=>{degree[e.source]=(degree[e.source]||0)+1;degree[e.target]=(degree[e.target]||0)+1;});
  const maxDeg=Math.max(1,...Object.values(degree).map(v => typeof v === 'number' ? v : 0));
  nodes.forEach(n=>{
    const nb=edges.filter(e=>e.source===n.id||e.target===n.id).map(e=>e.source===n.id?e.target:e.source);
    if(nb.length>=2) for(let i=0;i<nb.length;i++) for(let j=i+1;j<nb.length;j++)
      if(!edges.some(e=>(e.source===nb[i]&&e.target===nb[j])||(e.source===nb[j]&&e.target===nb[i]))) betweenness[n.id]++;
  });
  const maxBet=Math.max(1,...Object.values(betweenness).map(v => typeof v === 'number' ? v : 0));
  const result: Record<string, { degree: number; degreeNorm: number; betweenness: number; betweennessNorm: number; score: number }> = {};
  nodes.forEach(n=>{result[n.id]={degree:degree[n.id]||0,degreeNorm:(degree[n.id]||0)/maxDeg,betweenness:betweenness[n.id]||0,betweennessNorm:(betweenness[n.id]||0)/maxBet,score:((degree[n.id]||0)/maxDeg)*0.5+((betweenness[n.id]||0)/maxBet)*0.5};});
  return result;
}
function detectCommunities(nodes: GraphNode[], edges: GraphEdge[]) {
  const label: Record<string, string> = {};
  nodes.forEach(n=>{label[n.id]=n.id;});
  for(let i=0;i<20;i++){
    let changed=false;
    nodes.forEach(n=>{
      const nb=edges.filter(e=>e.source===n.id||e.target===n.id).map(e=>e.source===n.id?e.target:e.source);
      if(!nb.length) return;
      const freq: Record<string, number> = {};
      nb.forEach(x=>{freq[label[x]]=(freq[label[x]]||0)+1;});
      const best=Object.entries(freq).sort((a: [string, number], b: [string, number])=>b[1]-a[1])[0][0];
      if(best!==label[n.id]){label[n.id]=best;changed=true;}
    });
    if(!changed) break;
  }
  const ul=[...new Set(Object.values(label))];
  const cm: Record<string, number> = {};
  nodes.forEach(n=>{cm[n.id]=ul.indexOf(label[n.id]);});
  return cm;
}
function findShortestPath(startId: string, endId: string, edges: GraphEdge[]) {
  if(startId===endId) return [startId];
  const q: string[][]=[[startId]], vis=new Set([startId]);
  while(q.length){
    const path=q.shift()!, cur=path[path.length-1];
    const nb=edges.filter(e=>e.source===cur||e.target===cur).map(e=>e.source===cur?e.target:e.source);
    for(const n of nb){if(n===endId) return [...path,n]; if(!vis.has(n)){vis.add(n);q.push([...path,n]);}}
  }
  return null;
}
function computeRiskScore(node: GraphNode, edges: GraphEdge[], centrality: Record<string, { score: number }>) {
  let s=0;
  if(node.isSuspicious) s+=40; if(!node.isVerified) s+=10;
  if(node.confidence<0.7) s+=15; if(node.source==="ai_extraction") s+=5;
  const c=centrality[node.id]; if(c) s+=c.score*20;
  if(edges.filter(e=>e.source===node.id||e.target===node.id).length>4) s+=10;
  if(s>=50) return "high"; if(s>=25) return "medium"; if(s>0) return "low"; return "unknown";
}
function generateInsights(nodes: GraphNode[], edges: GraphEdge[], centrality: Record<string, { degree: number; betweenness: number }>, communities: Record<string, number>) {
  const ins: any[]=[];
  if(!nodes.length) return ins;
  const topNode=nodes.reduce((a,b)=>(centrality[a.id]?.degree||0)>=(centrality[b.id]?.degree||0)?a:b,nodes[0]);
  if(topNode) ins.push({type:"info",icon:"⭐",title:"Key Actor",text:`${topNode.label} is most connected (${centrality[topNode.id]?.degree||0} links).`,nodeId:topNode.id});
  nodes.filter(n=>(centrality[n.id]?.betweenness||0)>0).forEach(n=>ins.push({type:"warning",icon:"🌉",title:"Network Bridge",text:`${n.label} connects isolated parts. Critical dependency.`,nodeId:n.id}));
  const susp=nodes.filter(n=>n.isSuspicious);
  if(susp.length) ins.push({type:"danger",icon:"🚨",title:"Suspicious Entities",text:`${susp.map(n=>n.label).join(", ")} require immediate verification.`,nodeIds:susp.map(n=>n.id)});
  const unvHigh=nodes.filter(n=>!n.isVerified&&(centrality[n.id]?.degree||0)>=3);
  if(unvHigh.length) ins.push({type:"warning",icon:"🔍",title:"Unverified Key Nodes",text:`${unvHigh.map(n=>n.label).join(", ")} are highly connected but unverified.`});
  const orphans=nodes.filter(n=>edges.every(e=>e.source!==n.id&&e.target!==n.id));
  if(orphans.length) ins.push({type:"info",icon:"🔗",title:"Isolated Entities",text:`${orphans.map(n=>n.label).join(", ")} have no connections.`});
  const numC=new Set(Object.values(communities)).size;
  if(numC>1) ins.push({type:"info",icon:"👥",title:`${numC} Clusters Detected`,text:`Network split into ${numC} communities — possible separate cells.`});
  edges.filter(e=>e.strength>=9).forEach(e=>{
    const s=nodes.find(n=>n.id===e.source),t=nodes.find(n=>n.id===e.target);
    if(s?.isSuspicious||t?.isSuspicious) ins.push({type:"danger",icon:"🔴",title:"Critical Link",text:`Max-strength link: ${s?.label} → ${t?.label} ("${e.label}")`});
  });
  const natGroups: Record<string, string[]> = {};
  nodes.filter(n=>n.properties?.nationality).forEach(n=>{const nat=n.properties!.nationality;natGroups[nat]=(natGroups[nat]||[]).concat(n.label);});
  Object.entries(natGroups).filter(([,v])=>v.length>=2).forEach(([nat,names])=>ins.push({type:"info",icon:"🌍",title:"Nationality Cluster",text:`${names.length} entities share ${nat} nationality: ${names.join(", ")}.`}));
  return ins;
}
const OSINT_SUGGESTIONS: any = {
  person:["Search full name on LinkedIn","Check social media (FB, Twitter, Instagram)","Search leaked databases (HIBP, Snusbase)","Court & criminal records","Property ownership records","Run reverse image search"],
  company:["Check OpenCorporates","Search beneficial owners (UBO registry)","Verify registration number","Check sanctions (OFAC, EU)","Search litigation history"],
  email:["Check Have I Been Pwned","Verify domain registration (WHOIS)","Search in paste sites","Check EmailRep.io reputation","Analyze email headers"],
  phone:["Reverse phone lookup (Truecaller)","Check carrier & country","Verify if VOIP or burner","Check telecom fraud databases"],
  location:["Verify in Google Maps","Check property records","Review satellite imagery (Google Earth)","Cross-reference with IP geolocation"],
  domain:["Run WHOIS (who.is)","Check DNS records (MXToolbox)","SSL certificate history (crt.sh)","Check VirusTotal reputation","Wayback Machine archives"],
  crypto:["Check blockchain explorer","Trace transaction history","Check AMLBot reputation","Look for mixer usage"],
  generic:["Search in Maltego","Cross-reference with databases","Verify all provided information"],
};

// ============================================================
// LAYOUTS
// ============================================================
function applyForceLayout(nodes: GraphNode[], edges: GraphEdge[]) {
  const pos: Record<string, { x: number; y: number }> = {};
  nodes.forEach(n=>{pos[n.id]={x:n.x,y:n.y};});
  for(let iter=0;iter<120;iter++){
    const f: Record<string, { x: number; y: number }> = {};nodes.forEach(n=>{f[n.id]={x:0,y:0};});
    for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++){
      const a=pos[nodes[i].id],b=pos[nodes[j].id];
      const dx=b.x-a.x,dy=b.y-a.y,dist=Math.max(Math.sqrt(dx*dx+dy*dy),1),force=9000/(dist*dist);
      f[nodes[i].id].x-=(dx/dist)*force;f[nodes[i].id].y-=(dy/dist)*force;
      f[nodes[j].id].x+=(dx/dist)*force;f[nodes[j].id].y+=(dy/dist)*force;
    }
    edges.forEach(e=>{
      const a=pos[e.source],b=pos[e.target];if(!a||!b) return;
      const dx=b.x-a.x,dy=b.y-a.y,dist=Math.max(Math.sqrt(dx*dx+dy*dy),1),force=(dist-180)*0.05;
      f[e.source].x+=(dx/dist)*force;f[e.source].y+=(dy/dist)*force;
      f[e.target].x-=(dx/dist)*force;f[e.target].y-=(dy/dist)*force;
    });
    nodes.forEach(n=>{f[n.id].x+=(450-pos[n.id].x)*0.01;f[n.id].y+=(320-pos[n.id].y)*0.01;});
    nodes.forEach(n=>{pos[n.id].x+=Math.max(-20,Math.min(20,f[n.id].x));pos[n.id].y+=Math.max(-20,Math.min(20,f[n.id].y));});
  }
  return nodes.map(n=>({...n,x:pos[n.id].x,y:pos[n.id].y}));
}
function applyHierarchicalLayout(nodes: GraphNode[], edges: GraphEdge[]) {
  const levels: Record<number, string[]> = {}, visited = new Set<string>(), adj: Record<string, string[]> = {};
  nodes.forEach(n=>{adj[n.id]=[];});edges.forEach(e=>{adj[e.source]?.push(e.target);});
  const bfs=(id: string,lv: number)=>{if(visited.has(id)) return;visited.add(id);if(!levels[lv]) levels[lv]=[];levels[lv].push(id);(adj[id]||[]).forEach((t: string)=>bfs(t,lv+1));};
  if(nodes[0]) bfs(nodes[0].id,0);
  nodes.filter(n=>!visited.has(n.id)).forEach(n=>bfs(n.id,0));
  const la=Object.keys(levels).map(Number).sort((a,b)=>a-b);
  return nodes.map(n=>{const lv=la.findIndex(l=>levels[l].includes(n.id));const idx=levels[la[lv]]?.indexOf(n.id)??0;const tot=levels[la[lv]]?.length??1;return{...n,x:100+idx*(800/Math.max(tot,1)),y:80+lv*160};});
}
function applyCircularLayout(nodes: GraphNode[]) {
  const cx=450,cy=320,r=Math.min(280,60+nodes.length*22);
  return nodes.map((n,i)=>{const a=(i/nodes.length)*2*Math.PI-Math.PI/2;return{...n,x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)};});
}
function applyTargetCentricLayout(nodes: GraphNode[], edges: GraphEdge[], targetId: string) {
  if (!targetId) return applyCircularLayout(nodes);
  const cx = 450, cy = 320;
  const distances: Record<string, number> = { [targetId]: 0 };
  const queue = [targetId];
  while(queue.length > 0) {
    const curr = queue.shift()!;
    const d = distances[curr];
    edges.forEach(e => {
      if (e.source === curr && distances[e.target] === undefined) { distances[e.target] = d + 1; queue.push(e.target); }
      if (e.target === curr && distances[e.source] === undefined) { distances[e.source] = d + 1; queue.push(e.source); }
    });
  }
  const rings: Record<number, GraphNode[]> = {};
  nodes.forEach(n => {
    const d = distances[n.id] === undefined ? -1 : distances[n.id];
    if (!rings[d]) rings[d] = [];
    rings[d].push(n);
  });
  return nodes.map(n => {
    const d = distances[n.id];
    if (d === 0) return { ...n, x: cx, y: cy };
    if (d === undefined || d === -1) {
      const ringNodes = rings[-1]; const i = ringNodes.findIndex((x) => x.id === n.id);
      const r = 400; const a = (i / ringNodes.length) * 2 * Math.PI;
      return { ...n, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    }
    const ringNodes = rings[d]; const i = ringNodes.findIndex((x) => x.id === n.id);
    const r = d * 140; const a = (i / ringNodes.length) * 2 * Math.PI;
    return { ...n, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
}
function applyGridLayout(nodes: GraphNode[]) {
  const cols=Math.ceil(Math.sqrt(nodes.length));
  return nodes.map((n,i)=>({...n,x:120+(i%cols)*160,y:100+Math.floor(i/cols)*160}));
}

// ============================================================
// PHASE 6 — IMPORT / EXPORT UTILITIES
// ============================================================

// Export graph as structured JSON
function exportJSON(nodes: any[], edges: any[], caseName="Operation Red Ghost") {
  const data = {
    meta: { caseName, exportedAt: new Date().toISOString(), version:"abster-graph-v4", nodeCount:nodes.length, edgeCount:edges.length },
    nodes: nodes.map(n=>({...n})),
    edges: edges.map(e=>({...e})),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=`abster-graph-${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
}

// Export as CSV (two files: nodes + edges — merged into one download as combined CSV)
function exportCSV(nodes: any[], edges: any[]) {
  const nodeHeaders = ["id","type","label","confidence","source","isVerified","isSuspicious","notes"];
  const edgeHeaders = ["id","source","target","type","label","strength","date","notes"];
  const nodeRows = nodes.map(n=>[n.id,n.type,`"${n.label||""}"`,n.confidence,n.source,n.isVerified,n.isSuspicious,`"${(n.notes||"").replace(/"/g,"'")}"`]);
  const edgeRows = edges.map(e=>[e.id,e.source,e.target,e.type,`"${e.label}"`,e.strength,e.date||"",`"${(e.notes||"").replace(/"/g,"'")}"`]);
  const csv = [
    "# ABSTER GRAPH EXPORT — NODES",
    nodeHeaders.join(","),
    ...nodeRows.map(r=>r.join(",")),
    "","# EDGES",
    edgeHeaders.join(","),
    ...edgeRows.map(r=>r.join(","))
  ].join("\n");
  const blob = new Blob([csv], {type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=`abster-graph-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// Export SVG with watermark
function exportSVG(svgElement: any, caseName="Operation Red Ghost") {
  if(!svgElement) return;
  const clone = svgElement.cloneNode(true);
  const ts = new Date().toLocaleString();
  // Add watermark
  const wm = document.createElementNS("http://www.w3.org/2000/svg","text");
  wm.setAttribute("x","10"); wm.setAttribute("y","20");
  wm.setAttribute("fill","#333333"); wm.setAttribute("font-size","10");
  wm.setAttribute("font-family","monospace");
  wm.textContent = `ABSTER INTELLIGENCE | ${caseName} | ${ts}`;
  clone.appendChild(wm);
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(clone);
  const blob = new Blob([svgStr], {type:"image/svg+xml"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=`abster-graph-${Date.now()}.svg`; a.click();
  URL.revokeObjectURL(url);
}

// Export as PNG via canvas
function exportPNG(svgElement: any, caseName="Operation Red Ghost") {
  if(!svgElement) return;
  const rect = svgElement.getBoundingClientRect();
  const w = Math.round(rect.width)||1200, h = Math.round(rect.height)||800;
  const clone = svgElement.cloneNode(true);
  clone.setAttribute("width", String(w)); clone.setAttribute("height", String(h));
  // Watermark
  const wm = document.createElementNS("http://www.w3.org/2000/svg","text");
  wm.setAttribute("x","12"); wm.setAttribute("y","22");
  wm.setAttribute("fill","#444444"); wm.setAttribute("font-size","11"); wm.setAttribute("font-family","monospace");
  wm.textContent = `ABSTER INTELLIGENCE | ${caseName} | ${new Date().toLocaleString()}`;
  clone.appendChild(wm);
  // Background
  const bg = document.createElementNS("http://www.w3.org/2000/svg","rect");
  bg.setAttribute("x","0"); bg.setAttribute("y","0");
  bg.setAttribute("width", String(w)); bg.setAttribute("height", String(h));
  bg.setAttribute("fill","#0A0A0A");
  clone.insertBefore(bg, clone.firstChild);
  const svgStr = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgStr], {type:"image/svg+xml;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width=w; canvas.height=h;
    const ctx = canvas.getContext("2d");
    if(ctx){
      ctx.fillStyle="#0A0A0A"; ctx.fillRect(0,0,w,h);
      ctx.drawImage(img,0,0,w,h);
      canvas.toBlob(pngBlob=>{
        if(pngBlob){
          const pngUrl = URL.createObjectURL(pngBlob);
          const a = document.createElement("a"); a.href=pngUrl; a.download=`abster-graph-${Date.now()}.png`; a.click();
          URL.revokeObjectURL(pngUrl); URL.revokeObjectURL(url);
        }
      },"image/png");
    }
  };
  img.src = url;
}

// Import JSON
function importJSON(text: string) {
  try {
    const data = JSON.parse(text);
    if(data.nodes && data.edges) return { nodes: data.nodes, edges: data.edges };
    // Try plain array
    if(Array.isArray(data)) return null;
    return null;
  } catch { return null; }
}

// Import CSV (nodes section only — edges optional)
function importCSV(text: string) {
  const lines = text.split("\n").map(l=>l.trim()).filter(Boolean);
  const nodes: any[]=[], edges: any[]=[];
  let mode="nodes";
  let headers: string[]|null=null;
  for(const line of lines) {
    if(line.startsWith("#")) { if(line.includes("EDGE")) { mode="edges"; headers=null; } continue; }
    const cols = line.split(",").map(c=>c.replace(/^"|"$/g,"").trim());
    if(!headers) { headers=cols; continue; }
    const row: any={};
    headers.forEach((h,i)=>{ row[h]=cols[i]||""; });
    if(mode==="nodes") {
      nodes.push({
        id: row.id||generateId(), type: row.type||"generic", label: row.label||"Unknown",
        x: parseFloat(row.x)||Math.random()*700+100, y: parseFloat(row.y)||Math.random()*500+80,
        properties: {}, confidence: parseFloat(row.confidence)||0.7,
        source: row.source||"manual", isVerified: row.isVerified==="true",
        isSuspicious: row.isSuspicious==="true", notes: row.notes||"", avatar: null,
      });
    } else {
      if(row.source && row.target) edges.push({
        id: row.id||generateId(), source: row.source, target: row.target,
        type: row.type||"related_to", label: row.label||"related",
        strength: parseInt(row.strength)||5, notes: row.notes||"", date: row.date||"",
      });
    }
  }
  if(!nodes.length) return null;
  return { nodes, edges };
}

// ============================================================
// PHASE 6 — IMPORT/EXPORT MODAL
// ============================================================
function ImportExportModal({ nodes, edges, svgRef, onImport, onClose }: any) {
  const [activeTab, setActiveTab] = useState("export");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => { setImportText(e.target.result); setImportError(""); setImportSuccess(""); };
    reader.readAsText(file);
  };

  const handleImportSubmit = () => {
    const text = importText.trim();
    if(!text) { setImportError("Paste or upload a file first."); return; }
    let result = null;
    if(text.startsWith("{") || text.startsWith("[")) result = importJSON(text);
    else result = importCSV(text);
    if(!result) { setImportError("Could not parse file. Check the format and try again."); return; }
    setImportSuccess(`Imported ${result.nodes.length} entities and ${result.edges.length} relations successfully.`);
    setTimeout(()=>{ onImport(result); onClose(); }, 1200);
  };

  const tabBtn = (id: string): any => ({
    flex:1, padding:"9px", fontSize:"10px", letterSpacing:"0.08em",
    background:activeTab===id?"#1A1A1A":"transparent",
    color:activeTab===id?"#E5E5E5":"#505050",
    border:"none", borderBottom:activeTab===id?"2px solid #E5E5E5":"2px solid transparent",
    cursor:"pointer", fontFamily:"'Courier New',monospace",
  });

  const CSV_TEMPLATE = `# ABSTER GRAPH EXPORT — NODES\nid,type,label,confidence,source,isVerified,isSuspicious,notes\nnode1,person,"John Doe",0.9,manual,false,false,"Sample person"\nnode2,company,"ACME Corp",0.8,manual,false,false,""\n\n# EDGES\nid,source,target,type,label,strength,date,notes\nedge1,node1,node2,works_at,"CEO",9,2020-01-01,""\n`;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#111",border:"1px solid #252525",borderRadius:"8px",width:"520px",maxHeight:"88vh",display:"flex",flexDirection:"column",fontFamily:"'Courier New',monospace",boxShadow:"0 20px 60px rgba(0,0,0,0.8)"}}>

        {/* Header */}
        <div style={{padding:"16px 18px",borderBottom:"1px solid #1A1A1A",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:"11px",color:"#A0A0A0",letterSpacing:"0.12em"}}>📦 IMPORT / EXPORT</div>
            <div style={{fontSize:"8px",color:"#505050",marginTop:"2px"}}>Current: {nodes.length} entities · {edges.length} relations</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#505050",cursor:"pointer",fontSize:"18px"}}>×</button>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",borderBottom:"1px solid #1A1A1A"}}>
          <button style={tabBtn("export")} onClick={()=>setActiveTab("export")}>EXPORT</button>
          <button style={tabBtn("import")} onClick={()=>setActiveTab("import")}>IMPORT</button>
          <button style={tabBtn("template")} onClick={()=>setActiveTab("template")}>TEMPLATE</button>
        </div>

        <div style={{overflowY:"auto",flex:1,padding:"16px"}}>

          {/* EXPORT TAB */}
          {activeTab==="export" && (
            <div>
              <div style={{fontSize:"9px",color:"#505050",letterSpacing:"0.1em",marginBottom:"14px"}}>DOWNLOAD FORMATS</div>

              {[
                { icon:"📄", label:"JSON — Full Graph Data", desc:"Complete nodes, edges, properties, metadata. Use for backup or importing into other Abster modules.", action:()=>exportJSON(nodes,edges), color:"#F59E0B" },
                { icon:"📊", label:"CSV — Spreadsheet Format", desc:"Two-section CSV with nodes and edges. Compatible with Excel, Google Sheets, Maltego.", action:()=>exportCSV(nodes,edges), color:"#10B981" },
                { icon:"🖼️", label:"SVG — Vector Graphic", desc:"Scalable vector export with watermark. Best for reports and presentations.", action:()=>exportSVG(svgRef?.current,"Operation Red Ghost"), color:"#3B82F6" },
                { icon:"📸", label:"PNG — Raster Image", desc:"High-resolution screenshot with watermark. Use for attaching to reports.", action:()=>exportPNG(svgRef?.current,"Operation Red Ghost"), color:"#8B5CF6" },
              ].map(({icon,label,desc,action,color}: any)=>(
                <div key={label} onClick={action}
                  style={{display:"flex",alignItems:"center",gap:"12px",padding:"13px",background:"#0A0A0A",borderRadius:"6px",marginBottom:"8px",cursor:"pointer",border:"1px solid #1A1A1A",transition:"border-color 0.2s"}}
                  onMouseEnter={(e: any)=>e.currentTarget.style.borderColor=color+"55"}
                  onMouseLeave={(e: any)=>e.currentTarget.style.borderColor="#1A1A1A"}>
                  <span style={{fontSize:"24px",flexShrink:0}}>{icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"11px",color:"#E5E5E5",marginBottom:"3px"}}>{label}</div>
                    <div style={{fontSize:"9px",color:"#505050",lineHeight:"1.4"}}>{desc}</div>
                  </div>
                  <div style={{padding:"5px 10px",background:color+"22",border:`1px solid ${color}44`,borderRadius:"4px",fontSize:"9px",color,letterSpacing:"0.06em",flexShrink:0}}>↓ SAVE</div>
                </div>
              ))}

              <div style={{marginTop:"14px",padding:"10px",background:"#0A0A0A",borderRadius:"4px",border:"1px solid #1A1A1A"}}>
                <div style={{fontSize:"8px",color:"#505050",letterSpacing:"0.08em",marginBottom:"4px"}}>ℹ️ NOTE ON PNG EXPORT</div>
                <div style={{fontSize:"9px",color:"#505050",lineHeight:"1.5"}}>PNG export renders the current canvas view. Zoom and pan to frame the graph exactly as you want before exporting. SVG export captures the full graph regardless of viewport.</div>
              </div>
            </div>
          )}

          {/* IMPORT TAB */}
          {activeTab==="import" && (
            <div>
              <div style={{fontSize:"9px",color:"#505050",letterSpacing:"0.1em",marginBottom:"12px"}}>SUPPORTED FORMATS: JSON · CSV</div>

              {/* Drop zone */}
              <div
                onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                onDragLeave={()=>setDragOver(false)}
                onDrop={e=>{e.preventDefault();setDragOver(false);if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);}}
                onClick={()=>fileRef.current?.click()}
                style={{border:`2px dashed ${dragOver?"#E5E5E5":"#333"}`,borderRadius:"6px",padding:"22px",textAlign:"center",cursor:"pointer",marginBottom:"12px",background:dragOver?"#1A1A1A":"transparent",transition:"all 0.2s"}}>
                <div style={{fontSize:"24px",marginBottom:"8px"}}>📂</div>
                <div style={{fontSize:"10px",color:"#A0A0A0",marginBottom:"4px"}}>{dragOver?"Drop file here":"Drag & drop file here"}</div>
                <div style={{fontSize:"8px",color:"#505050"}}>or click to browse · .json · .csv · .txt</div>
                <input ref={fileRef} type="file" accept=".json,.csv,.txt" style={{display:"none"}} onChange={(e: any)=>handleFile(e.target.files[0])}/>
              </div>

              <div style={{fontSize:"9px",color:"#505050",marginBottom:"6px",letterSpacing:"0.06em"}}>OR PASTE RAW DATA</div>
              <textarea value={importText} onChange={e=>{setImportText(e.target.value);setImportError("");setImportSuccess("");}}
                placeholder="Paste JSON or CSV data here..."
                style={{width:"100%",height:"140px",background:"#0A0A0A",border:"1px solid #222",color:"#A0A0A0",borderRadius:"4px",padding:"10px",fontSize:"10px",fontFamily:"'Courier New',monospace",resize:"vertical",outline:"none",boxSizing:"border-box"}}/>

              {importError&&<div style={{fontSize:"9px",color:"#EF4444",padding:"6px 8px",background:"#1A0A0A",borderRadius:"3px",marginTop:"8px",border:"1px solid #EF444433"}}>{importError}</div>}
              {importSuccess&&<div style={{fontSize:"9px",color:"#10B981",padding:"6px 8px",background:"#0A1A0A",borderRadius:"3px",marginTop:"8px",border:"1px solid #10B98133"}}>{importSuccess}</div>}

              <div style={{marginTop:"12px",padding:"10px",background:"#0A0A0A",borderRadius:"4px",border:"1px solid #1A1A1A",marginBottom:"14px"}}>
                <div style={{fontSize:"8px",color:"#505050",letterSpacing:"0.08em",marginBottom:"4px"}}>⚠️ IMPORT BEHAVIOUR</div>
                <div style={{fontSize:"9px",color:"#505050",lineHeight:"1.5"}}>Import will <span style={{color:"#F59E0B"}}>replace</span> the current graph. The current state will be saved to undo history automatically before import.</div>
              </div>

              <button onClick={handleImportSubmit}
                style={{width:"100%",padding:"10px",background:"#E5E5E5",border:"none",color:"#0A0A0A",borderRadius:"4px",cursor:"pointer",fontSize:"10px",letterSpacing:"0.1em",fontWeight:"bold"}}>
                IMPORT DATA
              </button>
            </div>
          )}

          {/* TEMPLATE TAB */}
          {activeTab==="template" && (
            <div>
              <div style={{fontSize:"9px",color:"#505050",letterSpacing:"0.1em",marginBottom:"12px"}}>CSV FORMAT REFERENCE</div>
              <div style={{fontSize:"9px",color:"#A0A0A0",lineHeight:"1.6",marginBottom:"12px"}}>
                Use this template to create your own data for import. The CSV uses a two-section format: first nodes, then edges (separated by a comment line).
              </div>

              <pre style={{background:"#0A0A0A",border:"1px solid #1A1A1A",borderRadius:"4px",padding:"12px",fontSize:"9px",color:"#10B981",overflowX:"auto",fontFamily:"'Courier New',monospace",lineHeight:"1.6",whiteSpace:"pre-wrap",marginBottom:"12px"}}>
{CSV_TEMPLATE}
              </pre>

              <button onClick={()=>{
                const blob=new Blob([CSV_TEMPLATE],{type:"text/csv"});
                const url=URL.createObjectURL(blob);
                const a=document.createElement("a");a.href=url;a.download="abster-template.csv";a.click();
                URL.revokeObjectURL(url);
              }} style={{width:"100%",padding:"8px",background:"#1A1A1A",border:"1px solid #333",color:"#A0A0A0",borderRadius:"4px",cursor:"pointer",fontSize:"10px",letterSpacing:"0.08em",marginBottom:"12px"}}>
                ↓ DOWNLOAD CSV TEMPLATE
              </button>

              <div style={{fontSize:"9px",color:"#505050",letterSpacing:"0.1em",marginBottom:"8px",borderTop:"1px solid #1A1A1A",paddingTop:"12px"}}>VALID NODE TYPES</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
                {Object.entries(NODE_COLORS).map(([t,c])=>(
                  <span key={t} style={{padding:"2px 8px",borderRadius:"3px",fontSize:"8px",background:c+"22",border:`1px solid ${c}44`,color:c,letterSpacing:"0.06em"}}>{t}</span>
                ))}
              </div>
              <div style={{fontSize:"9px",color:"#505050",letterSpacing:"0.1em",marginBottom:"8px",marginTop:"12px"}}>VALID EDGE TYPES</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
                {Object.keys(EDGE_LABELS).map(t=>(
                  <span key={t} style={{padding:"2px 8px",borderRadius:"3px",fontSize:"8px",background:"#1A1A1A",border:"1px solid #333",color:"#A0A0A0",letterSpacing:"0.06em"}}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PHASE 5 — AVATAR / IMAGE NODE
// ============================================================
// Renders a node with avatar image if available, fallback to emoji
function NodeWithAvatar({ node, r, fillColor, dimmed, useAvatar }: any) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const avatarUrl = useAvatar && (node.avatar || (["domain","email"].includes(node.type) ? getFavicon(node.label) : null));

  if(avatarUrl && !imgError) {
    return (
      <>
        <defs>
          <clipPath id={`clip-${node.id}`}>
            <circle r={r-2} />
          </clipPath>
        </defs>
        <image
          href={avatarUrl}
          x={-(r-2)} y={-(r-2)}
          width={(r-2)*2} height={(r-2)*2}
          clipPath={`url(#clip-${node.id})`}
          onLoad={()=>setImgLoaded(true)}
          onError={()=>setImgError(true)}
          style={{opacity:imgLoaded?1:0,transition:"opacity 0.3s"}}
        />
        {!imgLoaded&&<text y={3} textAnchor="middle" style={{fontSize:`${Math.min(r*0.7,22)}px`,userSelect:"none",pointerEvents:"none"}} opacity={dimmed?0.1:1}>{(NODE_ICONS as any)[node.type]}</text>}
      </>
    );
  }
  return <text y={3} textAnchor="middle" style={{fontSize:`${Math.min(r*0.7,22)}px`,userSelect:"none",pointerEvents:"none"}} opacity={dimmed?0.1:1}>{(NODE_ICONS as any)[node.type]}</text>;
}

// ============================================================
// PHASE 5 — CLUSTER BUBBLE BACKGROUND
// ============================================================
function ClusterBubbles({ nodes, communities }: any) {
  const groups = useMemo(()=>{
    const g: any={};
    nodes.forEach((n: any)=>{
      const ci=communities[n.id]??-1;
      if(!g[ci]) g[ci]=[];
      g[ci].push(n);
    });
    return g;
  },[nodes,communities]);

  return (
    <>
      {Object.entries(groups).map(([ci,ns]: any)=>{
        if(ns.length < 2) return null;
        const cx=ns.reduce((s: number,n: any)=>s+n.x,0)/ns.length;
        const cy=ns.reduce((s: number,n: any)=>s+n.y,0)/ns.length;
        const maxDist=Math.max(...ns.map((n: any)=>Math.sqrt((n.x-cx)**2+(n.y-cy)**2)))+55;
        const color=CLUSTER_COLORS[Number(ci)%8];
        return (
          <ellipse key={ci}
            cx={cx} cy={cy}
            rx={maxDist} ry={maxDist*0.8}
            fill={color+"08"} stroke={color+"22"} strokeWidth={1.5}
            strokeDasharray="4,4"
          />
        );
      })}
    </>
  );
}

// ============================================================
// INSIGHTS PANEL
// ============================================================
function InsightsPanel({ insights, nodes, onClose, onSelectNode, riskScores, centrality }: any) {
  const [activeTab, setActiveTab] = useState("auto");
  const [filterSev, setFilterSev] = useState("all");
  const typeStyle: any = {
    info:{bg:"#0A1520",border:"#1A3A50",dot:"#3B82F6",lbl:"INFO"},
    warning:{bg:"#1A1200",border:"#3A2A00",dot:"#F59E0B",lbl:"WARN"},
    danger:{bg:"#1A0A0A",border:"#3A1010",dot:"#EF4444",lbl:"CRIT"},
  };
  const filtered = insights.filter((i: any)=>filterSev==="all"||i.type===filterSev);
  const topRisk = [...nodes].sort((a,b)=>{const o: any={high:3,medium:2,low:1,unknown:0};return(o[riskScores[b.id]]||0)-(o[riskScores[a.id]]||0);}).slice(0,5);
  const topCentral = [...nodes].sort((a,b)=>(centrality[b.id]?.score||0)-(centrality[a.id]?.score||0)).slice(0,5);
  const tb=(id: string): any =>({padding:"5px 9px",fontSize:"9px",letterSpacing:"0.06em",background:activeTab===id?"#1A1A1A":"transparent",color:activeTab===id?"#E5E5E5":"#505050",border:"none",borderBottom:activeTab===id?"2px solid #3B82F6":"2px solid transparent",cursor:"pointer",fontFamily:"'Courier New',monospace",whiteSpace:"nowrap"});
  return (
    <div style={{position:"absolute",top:"10px",left:"10px",width:"310px",background:"#0D0D0D",border:"1px solid #252525",borderRadius:"6px",zIndex:50,fontFamily:"'Courier New',monospace",boxShadow:"0 12px 40px rgba(0,0,0,0.7)",display:"flex",flexDirection:"column",maxHeight:"calc(100% - 24px)"}}>
      <div style={{padding:"9px 12px",borderBottom:"1px solid #1A1A1A",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:"7px"}}>
          <span>⚡</span><span style={{fontSize:"9px",color:"#A0A0A0",letterSpacing:"0.12em"}}>INTELLIGENCE PANEL</span>
        </div>
        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
          {insights.filter((i: any)=>i.type==="danger").length>0&&<span style={{padding:"1px 5px",borderRadius:"3px",fontSize:"7px",background:"#EF444422",border:"1px solid #EF4444",color:"#EF4444"}}>{insights.filter((i: any)=>i.type==="danger").length} CRIT</span>}
          <button onClick={onClose} style={{background:"none",border:"none",color:"#505050",cursor:"pointer",fontSize:"16px",lineHeight:1}}>×</button>
        </div>
      </div>
      <div style={{display:"flex",borderBottom:"1px solid #1A1A1A",flexShrink:0,overflowX:"auto"}}>
        {[["auto","AUTO"],["risk","RISK"],["central","CENTRAL"],["suggest","NEXT"]].map(([id,lbl])=>(
          <button key={id} style={tb(id)} onClick={()=>setActiveTab(id)}>{lbl}</button>
        ))}
      </div>
      <div style={{overflowY:"auto",flex:1}}>
        {activeTab==="auto"&&(
          <div style={{padding:"8px"}}>
            <div style={{display:"flex",gap:"3px",marginBottom:"8px"}}>
              {[["all","ALL"],["danger","CRIT"],["warning","WARN"],["info","INFO"]].map(([v,l])=>(
                <button key={v} onClick={()=>setFilterSev(v)} style={{flex:1,padding:"3px 0",fontSize:"8px",letterSpacing:"0.05em",background:filterSev===v?"#1A1A1A":"transparent",color:filterSev===v?"#E5E5E5":"#505050",border:`1px solid ${filterSev===v?"#333":"transparent"}`,borderRadius:"3px",cursor:"pointer"}}>{l}</button>
              ))}
            </div>
            {filtered.map((ins: any,i: number)=>{
              const s=typeStyle[ins.type]||typeStyle.info;
              return (
                <div key={i} style={{background:s.bg,border:`1px solid ${s.border}`,borderRadius:"5px",padding:"9px",marginBottom:"5px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"5px",marginBottom:"4px"}}>
                    <span style={{fontSize:"13px"}}>{ins.icon}</span>
                    <span style={{fontSize:"9px",color:s.dot,letterSpacing:"0.06em",fontWeight:"bold",flex:1}}>{ins.title}</span>
                    <span style={{fontSize:"7px",color:s.dot,border:`1px solid ${s.dot}44`,borderRadius:"2px",padding:"1px 4px"}}>{s.lbl}</span>
                  </div>
                  <p style={{fontSize:"9px",color:"#A0A0A0",margin:0,lineHeight:"1.5"}}>{ins.text}</p>
                  {ins.nodeId&&<button onClick={()=>onSelectNode(ins.nodeId)} style={{marginTop:"6px",padding:"2px 7px",fontSize:"8px",background:"transparent",border:`1px solid ${s.border}`,color:s.dot,borderRadius:"3px",cursor:"pointer",letterSpacing:"0.04em"}}>→ VIEW</button>}
                </div>
              );
            })}
          </div>
        )}
        {activeTab==="risk"&&(
          <div style={{padding:"8px"}}>
            <div style={{fontSize:"8px",color:"#505050",letterSpacing:"0.1em",padding:"4px 4px 8px"}}>ENTITIES BY RISK SCORE</div>
            {topRisk.map((n: any,i: number)=>{
              const risk=riskScores[n.id]||"unknown",rc=(RISK_COLORS as any)[risk];
              return (
                <div key={n.id} onClick={()=>onSelectNode(n.id)} style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px",background:"#0A0A0A",borderRadius:"4px",marginBottom:"4px",cursor:"pointer",border:"1px solid #1A1A1A"}}
                  onMouseEnter={(e: any)=>e.currentTarget.style.borderColor="#333"} onMouseLeave={(e: any)=>e.currentTarget.style.borderColor="#1A1A1A"}>
                  <span style={{fontSize:"8px",color:"#333",width:"12px",textAlign:"right"}}>{i+1}</span>
                  <span style={{fontSize:"16px"}}>{(NODE_ICONS as any)[n.type]}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"10px",color:"#E5E5E5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.label}</div>
                    <div style={{fontSize:"8px",color:"#505050"}}>{n.type} · {n.source.replace("_"," ")}</div>
                  </div>
                  <span style={{fontSize:"8px",color:rc,letterSpacing:"0.06em",fontWeight:"bold"}}>{risk.toUpperCase()}</span>
                </div>
              );
            })}
          </div>
        )}
        {activeTab==="central"&&(
          <div style={{padding:"8px"}}>
            <div style={{fontSize:"8px",color:"#505050",letterSpacing:"0.1em",padding:"4px 4px 8px"}}>TOP BY NETWORK IMPORTANCE</div>
            {topCentral.map((n: any,i: number)=>{
              const c=centrality[n.id]||{degreeNorm:0,betweennessNorm:0,score:0},color=(NODE_COLORS as any)[n.type];
              return (
                <div key={n.id} onClick={()=>onSelectNode(n.id)} style={{padding:"8px",background:"#0A0A0A",borderRadius:"4px",marginBottom:"4px",cursor:"pointer",border:"1px solid #1A1A1A"}}
                  onMouseEnter={(e: any)=>e.currentTarget.style.borderColor="#333"} onMouseLeave={(e: any)=>e.currentTarget.style.borderColor="#1A1A1A"}>
                  <div style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"6px"}}>
                    <span style={{fontSize:"8px",color:"#333",width:"12px",textAlign:"right"}}>{i+1}</span>
                    <span style={{fontSize:"15px"}}>{(NODE_ICONS as any)[n.type]}</span>
                    <span style={{fontSize:"10px",color:"#E5E5E5",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.label}</span>
                    <span style={{fontSize:"8px",color}}>{Math.round(c.score*100)}%</span>
                  </div>
                  {[["Degree",c.degreeNorm],["Betweenness",c.betweennessNorm]].map(([lbl,val]: any)=>(
                    <div key={lbl} style={{marginBottom:"3px",paddingLeft:"20px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"1px"}}>
                        <span style={{fontSize:"7px",color:"#505050"}}>{lbl}</span>
                        <span style={{fontSize:"7px",color:"#505050"}}>{Math.round(val*100)}%</span>
                      </div>
                      <div style={{height:"3px",background:"#1A1A1A",borderRadius:"2px"}}><div style={{height:"3px",background:color,borderRadius:"2px",width:`${Math.round(val*100)}%`}}/></div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
        {activeTab==="suggest"&&(
          <div style={{padding:"8px"}}>
            <div style={{fontSize:"8px",color:"#505050",letterSpacing:"0.1em",padding:"4px 4px 8px"}}>INVESTIGATION PRIORITIES</div>
            {[
              ...nodes.filter(n=>n.isSuspicious&&!n.isVerified).map(n=>({p:"CRITICAL",c:"#EF4444",icon:"🚨",a:`VERIFY ${(n.label||"").toUpperCase()}`,d:"Suspicious & unverified. Check sanctions and court records immediately.",id:n.id})),
              ...nodes.filter(n=>!n.isVerified&&(centrality[n.id]?.degree||0)>=3).map(n=>({p:"HIGH",c:"#F59E0B",icon:"🔍",a:`INVESTIGATE ${(n.label||"").toUpperCase()}`,d:`High-degree node (${centrality[n.id]?.degree} links) but unverified.`,id:n.id})),
              ...nodes.filter(n=>n.type==="email").map(n=>({p:"MEDIUM",c:"#3B82F6",icon:"📧",a:`CHECK ${n.label||""}`,d:"Run against HIBP, Snusbase, paste sites.",id:n.id})),
              ...nodes.filter(n=>n.type==="domain").map(n=>({p:"MEDIUM",c:"#6B7280",icon:"🌐",a:`ENUMERATE ${n.label||""}`,d:"WHOIS, DNS enum, SSL cert history, subdomain scan.",id:n.id})),
            ].slice(0,8).map((item,i)=>(
              <div key={i} onClick={()=>item.id&&onSelectNode(item.id)} style={{padding:"8px",background:"#0A0A0A",borderRadius:"4px",marginBottom:"4px",cursor:"pointer",border:`1px solid ${item.c}22`}}>
                <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"3px"}}>
                  <span style={{fontSize:"12px"}}>{item.icon}</span>
                  <span style={{fontSize:"7px",color:item.c,letterSpacing:"0.08em",fontWeight:"bold"}}>{item.p}</span>
                  <span style={{fontSize:"9px",color:"#E5E5E5",fontWeight:"bold",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.a}</span>
                </div>
                <p style={{fontSize:"8px",color:"#505050",margin:0,lineHeight:"1.4",paddingLeft:"18px"}}>{item.d}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{padding:"7px 12px",borderTop:"1px solid #1A1A1A",display:"flex",gap:"10px",flexShrink:0}}>
        {[["CRIT","danger","#EF4444"],["WARN","warning","#F59E0B"],["INFO","info","#3B82F6"]].map(([lbl,type,color]: any)=>(
          <div key={lbl} style={{flex:1,textAlign:"center"}}>
            <div style={{fontSize:"15px",color,fontWeight:"bold"}}>{insights.filter((i: any)=>i.type===type).length}</div>
            <div style={{fontSize:"7px",color:"#505050",letterSpacing:"0.06em"}}>{lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// TIMELINE SLIDER
// ============================================================
function TimelineSlider({ edges, timelineDate, onDateChange, isPlaying, onTogglePlay, onReset }: any) {
  const bounds = useMemo(()=>{
    const dates=edges.map((e: any)=>e.date).filter(Boolean).map((d: any)=>parseDate(d)).filter(Boolean);
    if(!dates.length) return null;
    return{min:Math.min(...(dates as any)),max:Math.max(...(dates as any))};
  },[edges]);
  useEffect(()=>{
    if(!isPlaying||!bounds) return;
    const iv=setInterval(()=>{
      onDateChange((prev: number)=>{
        const next=prev+(bounds.max-bounds.min)/100;
        if(next>=bounds.max){onTogglePlay();return bounds.max;}
        return next;
      });
    },80);
    return()=>clearInterval(iv);
  },[isPlaying,bounds,onDateChange,onTogglePlay]);
  if(!bounds) return null;
  const ticks=[...new Set(edges.map((e: any)=>e.date).filter(Boolean) as string[])].sort();
  const vis=edges.filter((e: any)=>e.date&&parseDate(e.date)! <= timelineDate).length;
  return (
    <div style={{background:"#0D0D0D",borderTop:"1px solid #222",padding:"7px 14px",fontFamily:"'Courier New',monospace",flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
        <span style={{fontSize:"9px",color:"#8B5CF6",letterSpacing:"0.1em",flexShrink:0}}>⏱ TIMELINE</span>
        <button onClick={onTogglePlay} style={{background:isPlaying?"#1A1A2A":"#111",border:`1px solid ${isPlaying?"#8B5CF6":"#333"}`,color:isPlaying?"#8B5CF6":"#A0A0A0",borderRadius:"4px",padding:"2px 9px",cursor:"pointer",fontSize:"11px",flexShrink:0}}>{isPlaying?"⏸":"▶"}</button>
        <button onClick={onReset} style={{background:"#111",border:"1px solid #333",color:"#505050",borderRadius:"4px",padding:"2px 7px",cursor:"pointer",fontSize:"11px",flexShrink:0}}>↩</button>
        <div style={{flex:1,position:"relative",padding:"10px 0"}}>
          <div style={{position:"absolute",top:"0px",left:0,right:0}}>
            {ticks.map((date,i)=>{
              const dTs = parseDate(date)!;
              const tp=((dTs-bounds.min)/(bounds.max-bounds.min))*100;
              return <div key={i} title={date} onClick={()=>onDateChange(dTs)} style={{position:"absolute",left:`${tp}%`,width:"2px",height:"7px",background:dTs<=timelineDate?"#8B5CF6":"#333",borderRadius:"1px",transform:"translateX(-50%)",cursor:"pointer",top:"-1px"}}/>;
            })}
          </div>
          <input type="range" min={bounds.min} max={bounds.max} value={timelineDate} onChange={e=>onDateChange(+e.target.value)} style={{width:"100%",accentColor:"#8B5CF6",cursor:"pointer"}}/>
        </div>
        <div style={{flexShrink:0,textAlign:"right",minWidth:"100px"}}>
          <div style={{fontSize:"10px",color:"#E5E5E5"}}>{formatDate(timelineDate)}</div>
          <div style={{fontSize:"7px",color:"#505050"}}>{vis}/{edges.filter((e: any)=>e.date).length} relations</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SNAPSHOT PANEL
// ============================================================
function SnapshotPanel({ snapshots, onSave, onRestore, onDelete, onClose, nodes, edges }: any) {
  const [name,setName]=useState("");
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#111",border:"1px solid #222",borderRadius:"8px",width:"420px",maxHeight:"80vh",display:"flex",flexDirection:"column",fontFamily:"'Courier New',monospace"}}>
        <div style={{padding:"15px 18px",borderBottom:"1px solid #222",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:"10px",color:"#A0A0A0",letterSpacing:"0.12em"}}>📸 INVESTIGATION SNAPSHOTS</div><div style={{fontSize:"8px",color:"#505050",marginTop:"2px"}}>Save versions at key investigation points</div></div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#505050",cursor:"pointer",fontSize:"18px"}}>×</button>
        </div>
        <div style={{padding:"12px 16px",borderBottom:"1px solid #1A1A1A",display:"flex",gap:"7px"}}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Snapshot name..."
            onKeyDown={e=>e.key==="Enter"&&name.trim()&&(onSave(name),setName(""))}
            style={{flex:1,background:"#0A0A0A",border:"1px solid #222",color:"#E5E5E5",borderRadius:"4px",padding:"6px 9px",fontSize:"10px",outline:"none",fontFamily:"'Courier New',monospace"}}/>
          <button onClick={()=>{if(!name.trim()) return;onSave(name);setName("");}}
            style={{padding:"6px 12px",background:"#E5E5E5",border:"none",color:"#0A0A0A",borderRadius:"4px",cursor:"pointer",fontSize:"9px",letterSpacing:"0.08em",fontWeight:"bold",flexShrink:0}}>SAVE</button>
        </div>
        <div style={{padding:"6px 16px",borderBottom:"1px solid #1A1A1A",fontSize:"8px",color:"#505050"}}>CURRENT: {nodes.length} entities · {edges.length} relations</div>
        <div style={{overflowY:"auto",flex:1,padding:"7px"}}>
          {snapshots.length===0&&<div style={{fontSize:"10px",color:"#505050",padding:"20px",textAlign:"center"}}>No snapshots yet.</div>}
          {[...snapshots].reverse().map(snap=>(
            <div key={snap.id} style={{padding:"9px 11px",background:"#0A0A0A",borderRadius:"4px",marginBottom:"5px",border:"1px solid #1A1A1A"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"4px"}}>
                <div>
                  <div style={{fontSize:"11px",color:"#E5E5E5"}}>{snap.name}</div>
                  <div style={{fontSize:"7px",color:"#505050",marginTop:"1px"}}>{snap.timestamp} · {snap.nodes.length}N · {snap.edges.length}E</div>
                </div>
                <div style={{display:"flex",gap:"4px",flexShrink:0}}>
                  <button onClick={()=>onRestore(snap)} style={{padding:"2px 7px",fontSize:"8px",background:"#1A2A1A",border:"1px solid #1A4A1A",color:"#10B981",borderRadius:"3px",cursor:"pointer"}}>RESTORE</button>
                  <button onClick={()=>onDelete(snap.id)} style={{padding:"2px 7px",fontSize:"8px",background:"transparent",border:"1px solid #3B0000",color:"#EF4444",borderRadius:"3px",cursor:"pointer"}}>✕</button>
                </div>
              </div>
              <div style={{fontSize:"7px",color:"#505050"}}>
                {snap.nodes.length!==nodes.length&&<span style={{color:snap.nodes.length>nodes.length?"#10B981":"#EF4444",marginRight:"8px"}}>{snap.nodes.length>nodes.length?"+":"-"}{Math.abs(snap.nodes.length-nodes.length)} entities vs now</span>}
                {snap.edges.length!==edges.length&&<span style={{color:snap.edges.length>edges.length?"#10B981":"#EF4444"}}>{snap.edges.length>edges.length?"+":"-"}{Math.abs(snap.edges.length-edges.length)} relations vs now</span>}
                {snap.nodes.length===nodes.length&&snap.edges.length===edges.length&&<span>Same as current</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EDGE DETAIL PANEL
// ============================================================
function EdgeDetailPanel({ edge, nodes, onClose, onUpdate, onDelete }: any) {
  const [editLabel,setEditLabel]=useState(edge.label);
  const [editNotes,setEditNotes]=useState(edge.notes||"");
  const [editStrength,setEditStrength]=useState(edge.strength);
  const [editDate,setEditDate]=useState(edge.date||"");
  const [confirmDelete,setConfirmDelete]=useState(false);
  const src=nodes.find((n: any)=>n.id===edge.source),tgt=nodes.find((n: any)=>n.id===edge.target);
  const inp: any={background:"#0A0A0A",border:"1px solid #222",color:"#E5E5E5",borderRadius:"4px",padding:"6px 9px",fontSize:"11px",width:"100%",outline:"none",fontFamily:"'Courier New',monospace",boxSizing:"border-box"};
  const save=()=>onUpdate(edge.id,{label:editLabel,notes:editNotes,strength:editStrength,date:editDate});
  return (
    <div style={{width:"290px",height:"100%",background:"#111",borderLeft:"1px solid #222",display:"flex",flexDirection:"column",fontFamily:"'Courier New',monospace",flexShrink:0}}>
      <div style={{padding:"12px",borderBottom:"1px solid #222",background:"#0D0D0D"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"9px"}}><div style={{fontSize:"8px",color:"#505050",letterSpacing:"0.1em"}}>RELATION DETAILS</div><button onClick={onClose} style={{background:"none",border:"none",color:"#505050",cursor:"pointer",fontSize:"18px"}}>×</button></div>
        <div style={{display:"flex",alignItems:"center",gap:"7px",padding:"9px",background:"#0A0A0A",borderRadius:"4px",border:"1px solid #1A1A1A",marginBottom:"6px"}}>
          <span style={{fontSize:"17px"}}>{(NODE_ICONS as any)[src?.type]}</span>
          <div style={{flex:1,height:"1px",background:"#444",position:"relative"}}><span style={{position:"absolute",top:"-7px",left:"50%",transform:"translateX(-50%)",fontSize:"7px",color:"#F59E0B",background:"#0A0A0A",padding:"0 3px",whiteSpace:"nowrap"}}>{(EDGE_LABELS as any)[edge.type]}</span></div>
          <span style={{fontSize:"17px"}}>{(NODE_ICONS as any)[tgt?.type]}</span>
        </div>
        <div style={{display:"flex",gap:"10px",fontSize:"8px",color:"#505050",textAlign:"center"}}>
          <div style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{src?.label}</div>
          <div style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tgt?.label}</div>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"11px"}}>
        <div style={{marginBottom:"9px"}}><div style={{fontSize:"8px",color:"#505050",marginBottom:"3px",letterSpacing:"0.07em"}}>LABEL</div><input value={editLabel} onChange={e=>setEditLabel(e.target.value)} onBlur={save} style={inp}/></div>
        <div style={{marginBottom:"9px"}}><div style={{fontSize:"8px",color:"#505050",marginBottom:"3px",letterSpacing:"0.07em"}}>DATE ESTABLISHED</div><input type="date" value={editDate} onChange={e=>{setEditDate(e.target.value);onUpdate(edge.id,{date:e.target.value});}} style={{...inp,colorScheme:"dark"}}/><div style={{fontSize:"7px",color:"#505050",marginTop:"2px"}}>Used by timeline slider</div></div>
        <div style={{marginBottom:"12px"}}><div style={{fontSize:"8px",color:"#505050",marginBottom:"3px",letterSpacing:"0.07em"}}>STRENGTH: {editStrength}/10</div><input type="range" min={1} max={10} value={editStrength} onChange={e=>{setEditStrength(+e.target.value);onUpdate(edge.id,{strength:+e.target.value});}} style={{width:"100%",accentColor:"#E5E5E5"}}/></div>
        <div><div style={{fontSize:"8px",color:"#505050",marginBottom:"3px",letterSpacing:"0.07em"}}>EVIDENCE / NOTES</div><textarea value={editNotes} onChange={e=>setEditNotes(e.target.value)} onBlur={save} placeholder="Add evidence notes..." style={{...inp,height:"90px",resize:"vertical",display:"block"}}/></div>
      </div>
      <div style={{padding:"10px 11px",borderTop:"1px solid #1A1A1A"}}>
        {!confirmDelete?<button onClick={()=>setConfirmDelete(true)} style={{width:"100%",padding:"6px",background:"transparent",border:"1px solid #3B0000",color:"#EF4444",borderRadius:"4px",fontSize:"9px",cursor:"pointer",letterSpacing:"0.07em"}}>DELETE RELATION</button>:(
          <div><div style={{fontSize:"9px",color:"#A0A0A0",marginBottom:"6px",textAlign:"center"}}>Delete this relation?</div><div style={{display:"flex",gap:"5px"}}><button onClick={()=>setConfirmDelete(false)} style={{flex:1,padding:"6px",background:"#1A1A1A",border:"1px solid #222",color:"#A0A0A0",borderRadius:"4px",fontSize:"9px",cursor:"pointer"}}>CANCEL</button><button onClick={()=>onDelete(edge.id)} style={{flex:1,padding:"6px",background:"#3B0000",border:"1px solid #EF4444",color:"#EF4444",borderRadius:"4px",fontSize:"9px",cursor:"pointer",fontWeight:"bold"}}>CONFIRM</button></div></div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// NODE DETAIL PANEL
// ============================================================
function NodeDetailPanel({ node, edges, nodes, onClose, onUpdate, onDelete, onSelectNode, centrality, riskScore, communityId, onFocusNode, onFindPath }: any) {
  const [editLabel,setEditLabel]=useState(node.label);
  const [editNotes,setEditNotes]=useState(node.notes||"");
  const [newPropKey,setNewPropKey]=useState("");
  const [newPropVal,setNewPropVal]=useState("");
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [activeTab,setActiveTab]=useState("details");
  const [pathTarget,setPathTarget]=useState("");
  const [avatarUrl,setAvatarUrl]=useState(node.avatar||"");
  const incoming=edges.filter((e: any)=>e.target===node.id);
  const outgoing=edges.filter((e: any)=>e.source===node.id);
  const color=(NODE_COLORS as any)[node.type];
  const c=centrality[node.id]||{degree:0,betweenness:0,score:0,degreeNorm:0,betweennessNorm:0};
  const suggestions=OSINT_SUGGESTIONS[node.type]||OSINT_SUGGESTIONS.generic;
  const inp: any={background:"#0A0A0A",border:"1px solid #222",color:"#E5E5E5",borderRadius:"4px",padding:"6px 9px",fontSize:"10px",width:"100%",outline:"none",fontFamily:"'Courier New',monospace",boxSizing:"border-box"};
  const tb=(id: string): any =>({padding:"4px 8px",fontSize:"8px",letterSpacing:"0.06em",background:activeTab===id?"#1A1A1A":"transparent",color:activeTab===id?"#E5E5E5":"#505050",border:"none",borderBottom:activeTab===id?`2px solid ${color}`:"2px solid transparent",cursor:"pointer",fontFamily:"'Courier New',monospace",whiteSpace:"nowrap"});
  const save=()=>onUpdate(node.id,{label:editLabel,notes:editNotes});

  const handleFileUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev: any) => {
      const img = new Image();
      img.onload = () => {
        const size = 128;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const base64 = canvas.toDataURL("image/jpeg", 0.85);
        setAvatarUrl(base64);
        onUpdate(node.id, { avatar: base64 });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{width:"320px",height:"100%",background:"#111",borderLeft:"1px solid #222",display:"flex",flexDirection:"column",fontFamily:"'Courier New',monospace",overflow:"hidden",flexShrink:0}}>
      <div style={{padding:"11px",borderBottom:"1px solid #222",background:"#0D0D0D"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            {/* PHASE 5: Avatar display in panel */}
            <div style={{width:"36px",height:"36px",borderRadius:"50%",background:"#111",border:`2px solid ${color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"17px",flexShrink:0,overflow:"hidden",position:"relative"}}>
              {node.avatar ? <img src={node.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}} onError={(e: any)=>e.target.style.display="none"}/> : (NODE_ICONS as any)[node.type]}
            </div>
            <div>
              <div style={{fontSize:"7px",color:"#505050",letterSpacing:"0.1em",marginBottom:"1px"}}>{node.type.toUpperCase()} · {node.source.replace("_"," ").toUpperCase()}</div>
              <div style={{fontSize:"8px",color:color}}>{Math.round(node.confidence*100)}% CONFIDENCE</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#505050",cursor:"pointer",fontSize:"17px",marginTop:"-2px"}}>×</button>
        </div>
        <input value={editLabel} onChange={e=>setEditLabel(e.target.value)} onBlur={save} style={{...inp,fontSize:"12px",fontWeight:"bold",color:"#E5E5E5",marginBottom:"6px"}}/>
        <div style={{display:"flex",gap:"4px",marginBottom:"6px",flexWrap:"wrap"}}>
          <span style={{padding:"2px 6px",borderRadius:"3px",fontSize:"7px",letterSpacing:"0.06em",background:(RISK_COLORS as any)[riskScore]+"22",border:`1px solid ${(RISK_COLORS as any)[riskScore]}`,color:(RISK_COLORS as any)[riskScore]}}>{riskScore.toUpperCase()} RISK</span>
          {communityId!==undefined&&<span style={{padding:"2px 6px",borderRadius:"3px",fontSize:"7px",background:CLUSTER_COLORS[communityId%8]+"22",border:`1px solid ${CLUSTER_COLORS[communityId%8]}55`,color:CLUSTER_COLORS[communityId%8]}}>CLUSTER {communityId+1}</span>}
          <span style={{padding:"2px 6px",borderRadius:"3px",fontSize:"7px",background:"#1A1A1A",border:"1px solid #222",color:"#505050"}}>DEG {c.degree} · BTW {c.betweenness}</span>
        </div>
        <div style={{display:"flex",gap:"4px"}}>
          {[["isVerified","✓ VERIFIED","#10B981"],["isSuspicious","⚠ SUSPECT","#EF4444"]].map(([key,lbl,clr]: any)=>(
            <button key={key} onClick={()=>onUpdate(node.id,{[key]:!node[key]})} style={{padding:"2px 7px",borderRadius:"3px",fontSize:"8px",letterSpacing:"0.05em",border:"1px solid",cursor:"pointer",background:node[key]?clr:"transparent",borderColor:node[key]?clr:"#333",color:node[key]?"white":"#505050"}}>{lbl}</button>
          ))}
        </div>
      </div>
      <div style={{display:"flex",borderBottom:"1px solid #222",overflowX:"auto",flexShrink:0}}>
        {[["details","INFO"],["connections",`CONN(${incoming.length+outgoing.length})`],["analysis","ANALY"],["osint","OSINT"],["avatar","AVATAR"],["notes","NOTES"]].map(([id,lbl])=>(
          <button key={id} style={tb(id)} onClick={()=>setActiveTab(id)}>{lbl}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"11px"}}>
        {activeTab==="details"&&(
          <div>
            <div style={{fontSize:"8px",color:"#505050",letterSpacing:"0.1em",marginBottom:"8px"}}>PROPERTIES</div>
            {Object.entries(node.properties||{}).map(([k,v]: any)=>(
              <div key={k} style={{marginBottom:"6px"}}>
                <div style={{fontSize:"7px",color:"#505050",marginBottom:"2px",letterSpacing:"0.05em"}}>{k.toUpperCase()}</div>
                <div style={{fontSize:"10px",color:"#A0A0A0",padding:"4px 7px",background:"#0A0A0A",borderRadius:"3px",border:"1px solid #1A1A1A",wordBreak:"break-all"}}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</div>
              </div>
            ))}
            <div style={{marginTop:"11px",fontSize:"8px",color:"#505050",letterSpacing:"0.1em",marginBottom:"5px"}}>ADD PROPERTY</div>
            <div style={{display:"flex",gap:"4px",marginBottom:"4px"}}>
              <input value={newPropKey} onChange={e=>setNewPropKey(e.target.value)} placeholder="KEY" style={{...inp,flex:1}}/>
              <input value={newPropVal} onChange={e=>setNewPropVal(e.target.value)} placeholder="VALUE" style={{...inp,flex:2}}/>
            </div>
            <button onClick={()=>{if(!newPropKey.trim()) return;onUpdate(node.id,{properties:{...node.properties,[newPropKey]:newPropVal}});setNewPropKey("");setNewPropVal("");}} style={{background:"#1A1A1A",color:"#A0A0A0",border:"1px solid #222",borderRadius:"4px",padding:"3px 9px",fontSize:"8px",cursor:"pointer",letterSpacing:"0.07em"}}>+ ADD</button>
          </div>
        )}
        {activeTab==="connections"&&(
          <div>
            {[["INCOMING",incoming,"target"],["OUTGOING",outgoing,"source"]].map(([title,list,sk]: any)=>(
              list.length>0&&<div key={title} style={{marginBottom:"11px"}}>
                <div style={{fontSize:"8px",color:"#505050",letterSpacing:"0.1em",marginBottom:"5px"}}>{title} ({list.length})</div>
                {list.map((e: any)=>{
                  const other=nodes.find((n: any)=>n.id===(sk==="target"?e.source:e.target));
                  if(!other) return null;
                  return <div key={e.id} onClick={()=>onSelectNode(other.id)} style={{display:"flex",alignItems:"center",gap:"6px",padding:"6px",background:"#0D0D0D",borderRadius:"3px",marginBottom:"3px",cursor:"pointer",border:"1px solid #1A1A1A"}}>
                    <span style={{fontSize:"14px"}}>{(NODE_ICONS as any)[other.type]}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:"10px",color:"#E5E5E5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{other.label}</div>
                      <div style={{fontSize:"7px",color:"#505050"}}>{(EDGE_LABELS as any)[e.type]} · {e.label}{e.date?` · ${e.date}`:""}</div>
                    </div>
                  </div>;
                })}
              </div>
            ))}
            {!incoming.length&&!outgoing.length&&<div style={{fontSize:"10px",color:"#505050",textAlign:"center",padding:"16px 0"}}>No connections</div>}
          </div>
        )}
        {activeTab==="analysis"&&(
          <div>
            <div style={{fontSize:"8px",color:"#505050",letterSpacing:"0.1em",marginBottom:"9px"}}>CENTRALITY METRICS</div>
            {[["Degree","Direct connections",c.degreeNorm,c.degree+" conns"],["Betweenness","Bridge score",c.betweennessNorm,c.betweenness+" paths"],["Overall","Combined",c.score,Math.round(c.score*100)+"%"]].map(([name,desc,val,label]: any)=>(
              <div key={name} style={{marginBottom:"9px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"2px"}}><div style={{fontSize:"9px",color:"#A0A0A0"}}>{name}</div><div style={{fontSize:"9px",color}}>{label}</div></div>
                <div style={{fontSize:"7px",color:"#505050",marginBottom:"2px"}}>{desc}</div>
                <div style={{height:"3px",background:"#1A1A1A",borderRadius:"2px"}}><div style={{height:"3px",background:color,borderRadius:"2px",width:`${Math.round((val||0)*100)}%`,transition:"width 0.5s"}}/></div>
              </div>
            ))}
            <div style={{borderTop:"1px solid #1A1A1A",paddingTop:"9px",marginTop:"4px"}}>
              <div style={{fontSize:"8px",color:"#505050",letterSpacing:"0.1em",marginBottom:"7px"}}>SHORTEST PATH TO</div>
              <select value={pathTarget} onChange={e=>setPathTarget(e.target.value)} style={{...inp,marginBottom:"6px",cursor:"pointer"}}>
                <option value="">Select target...</option>
                {nodes.filter((n: any)=>n.id!==node.id).map((n: any)=><option key={n.id} value={n.id}>{n.label}</option>)}
              </select>
              <button onClick={()=>{if(pathTarget) onFindPath(node.id,pathTarget);}} disabled={!pathTarget}
                style={{width:"100%",padding:"5px",background:pathTarget?"#1A2A1A":"#111",border:`1px solid ${pathTarget?"#10B981":"#222"}`,color:pathTarget?"#10B981":"#333",borderRadius:"4px",fontSize:"8px",cursor:pathTarget?"pointer":"default",letterSpacing:"0.07em"}}>FIND PATH →</button>
            </div>
            <div style={{borderTop:"1px solid #1A1A1A",paddingTop:"9px",marginTop:"9px"}}>
              <button onClick={()=>onFocusNode(node.id)} style={{width:"100%",padding:"5px",background:"#111",border:"1px solid #222",color:"#A0A0A0",borderRadius:"4px",fontSize:"8px",cursor:"pointer",letterSpacing:"0.07em"}}>🔍 FOCUS VIEW</button>
            </div>
          </div>
        )}
        {activeTab==="osint"&&(
          <div>
            <div style={{fontSize:"8px",color:"#505050",letterSpacing:"0.1em",marginBottom:"9px"}}>INVESTIGATION CHECKLIST</div>
            {suggestions.map((s: any,i: number)=>(
              <div key={i} style={{display:"flex",gap:"6px",padding:"6px",background:"#0D0D0D",borderRadius:"3px",marginBottom:"3px",border:"1px solid #1A1A1A"}}>
                <span style={{color:"#505050",fontSize:"8px",marginTop:"1px",flexShrink:0}}>{i+1}.</span>
                <span style={{fontSize:"9px",color:"#A0A0A0",lineHeight:"1.4"}}>{s}</span>
              </div>
            ))}
            <div style={{marginTop:"11px",borderTop:"1px solid #1A1A1A",paddingTop:"9px"}}>
              <div style={{fontSize:"8px",color:"#505050",letterSpacing:"0.1em",marginBottom:"5px"}}>EXTERNAL TOOLS</div>
              {node.type==="person"&&[["LinkedIn","https://linkedin.com/search/results/all/?keywords="+encodeURIComponent(node.label),"🔵"],["Google","https://google.com/search?q="+encodeURIComponent('"'+node.label+'"'),"🔴"]].map(([name,url,icon])=>(
                <a key={name} href={url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:"6px",padding:"5px 8px",background:"#0A0A0A",borderRadius:"3px",marginBottom:"3px",border:"1px solid #1A1A1A",textDecoration:"none",color:"#A0A0A0",fontSize:"9px"}}>{icon} {name}</a>
              ))}
              {node.type==="email"&&[["HaveIBeenPwned","https://haveibeenpwned.com/account/"+encodeURIComponent(node.label),"🔴"],["Hunter.io","https://hunter.io/email-verifier/"+encodeURIComponent(node.label),"🟠"]].map(([name,url,icon])=>(
                <a key={name} href={url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:"6px",padding:"5px 8px",background:"#0A0A0A",borderRadius:"3px",marginBottom:"3px",border:"1px solid #1A1A1A",textDecoration:"none",color:"#A0A0A0",fontSize:"9px"}}>{icon} {name}</a>
              ))}
              {node.type==="domain"&&[["Whois","https://who.is/whois/"+node.label,"🌐"],["VirusTotal","https://virustotal.com/gui/domain/"+node.label,"🔴"],["crt.sh","https://crt.sh/?q="+node.label,"🔒"]].map(([name,url,icon])=>(
                <a key={name} href={url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:"6px",padding:"5px 8px",background:"#0A0A0A",borderRadius:"3px",marginBottom:"3px",border:"1px solid #1A1A1A",textDecoration:"none",color:"#A0A0A0",fontSize:"9px"}}>{icon} {name}</a>
              ))}
            </div>
          </div>
        )}
        {/* PHASE 5 — AVATAR TAB */}
        {activeTab==="avatar"&&(
          <div>
            <div style={{fontSize:"8px",color:"#505050",letterSpacing:"0.1em",marginBottom:"10px"}}>ENTITY IMAGE / AVATAR</div>
            <div style={{display:"flex",justifyContent:"center",marginBottom:"14px"}}>
              <div style={{width:"80px",height:"80px",borderRadius:"50%",background:"#111",border:`2px solid ${color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"32px",overflow:"hidden",flexShrink:0}}>
                {node.avatar?<img src={node.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={(e: any)=>e.target.style.display="none"}/>:(NODE_ICONS as any)[node.type]}
              </div>
            </div>
            <label style={{display:"block",marginBottom:"10px",width:"100%"}}>
              <div style={{width:"100%",padding:"6px",background:"#1A2A1A",border:"1px solid #10B981",color:"#10B981",borderRadius:"4px",fontSize:"9px",fontWeight:"bold",cursor:"pointer",letterSpacing:"0.07em",textAlign:"center",boxSizing:"border-box"}}>
                ↑ UPLOAD LOCAL IMAGE
              </div>
              <input type="file" accept="image/*" style={{display:"none"}} onChange={handleFileUpload} />
            </label>
            <div style={{fontSize:"8px",color:"#505050",marginBottom:"4px",letterSpacing:"0.07em",textAlign:"center"}}>— OR SET IMAGE URL —</div>
            <input value={avatarUrl} onChange={e=>setAvatarUrl(e.target.value)} placeholder="https://example.com/image.jpg"
              style={{...inp,marginBottom:"8px"}}/>
            <button onClick={()=>onUpdate(node.id,{avatar:avatarUrl||null})}
              style={{width:"100%",padding:"6px",background:"#1A1A1A",border:"1px solid #333",color:"#A0A0A0",borderRadius:"4px",fontSize:"9px",cursor:"pointer",letterSpacing:"0.07em",marginBottom:"10px"}}>
              SET AVATAR IMAGE
            </button>
            {node.avatar&&(
              <button onClick={()=>{setAvatarUrl("");onUpdate(node.id,{avatar:null});}}
                style={{width:"100%",padding:"6px",background:"transparent",border:"1px solid #3B0000",color:"#EF4444",borderRadius:"4px",fontSize:"9px",cursor:"pointer",letterSpacing:"0.07em"}}>
                REMOVE AVATAR
              </button>
            )}
            {(node.type==="domain"||node.type==="email")&&(
              <div style={{marginTop:"12px",borderTop:"1px solid #1A1A1A",paddingTop:"10px"}}>
                <div style={{fontSize:"8px",color:"#505050",marginBottom:"6px",letterSpacing:"0.07em"}}>AUTO-FAVICON</div>
                <div style={{fontSize:"9px",color:"#A0A0A0",marginBottom:"8px",lineHeight:"1.4"}}>Domain and email nodes can auto-load the favicon from their domain.</div>
                <button onClick={()=>{const url=getFavicon(node.label)!;setAvatarUrl(url);onUpdate(node.id,{avatar:url});}}
                  style={{width:"100%",padding:"6px",background:"#1A1A2A",border:"1px solid #2A2A4A",color:"#8B5CF6",borderRadius:"4px",fontSize:"9px",cursor:"pointer",letterSpacing:"0.07em"}}>
                  🌐 LOAD FAVICON
                </button>
              </div>
            )}
          </div>
        )}
        {activeTab==="notes"&&(
          <div>
            <div style={{fontSize:"8px",color:"#505050",letterSpacing:"0.1em",marginBottom:"5px"}}>ANALYST NOTES</div>
            <textarea value={editNotes} onChange={e=>setEditNotes(e.target.value)} onBlur={save} placeholder="Add investigation notes..." style={{...inp,height:"190px",resize:"vertical",display:"block"}}/>
          </div>
        )}
      </div>
      <div style={{padding:"9px 11px",borderTop:"1px solid #1A1A1A"}}>
        {!confirmDelete?<button onClick={()=>setConfirmDelete(true)} style={{width:"100%",padding:"6px",background:"transparent",border:"1px solid #3B0000",color:"#EF4444",borderRadius:"4px",fontSize:"9px",cursor:"pointer",letterSpacing:"0.07em"}}>DELETE ENTITY</button>:(
          <div><div style={{fontSize:"9px",color:"#A0A0A0",marginBottom:"6px",textAlign:"center"}}>Delete <span style={{color:"#EF4444"}}>{node.label}</span>?</div><div style={{display:"flex",gap:"5px"}}><button onClick={()=>setConfirmDelete(false)} style={{flex:1,padding:"5px",background:"#1A1A1A",border:"1px solid #222",color:"#A0A0A0",borderRadius:"4px",fontSize:"9px",cursor:"pointer"}}>CANCEL</button><button onClick={()=>onDelete(node.id)} style={{flex:1,padding:"5px",background:"#3B0000",border:"1px solid #EF4444",color:"#EF4444",borderRadius:"4px",fontSize:"9px",cursor:"pointer",fontWeight:"bold"}}>CONFIRM</button></div></div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// GRAPH CANVAS
// ============================================================
function GraphCanvas({ nodes, edges, selectedNode, selectedEdge, connectMode, connectSource,
  searchQuery, filterTypes, minStrength, focusNodeId, shortestPath, showLabels, viewMode, centrality, communities,
  timelineDate, showAvatars, showClusterBubbles, runningTransformId, onSelectNode, onSelectEdge,
  onSetConnectSource, onDragNode, onDoubleClickCanvas, onRunTransform, svgRef: externalSvgRef }: any) {

  const internalSvgRef = useRef(null);
  const svgRef = externalSvgRef || internalSvgRef;
  const [hoveredNode,setHoveredNode]=useState(null);
  const [hoveredEdge,setHoveredEdge]=useState(null);
  const [viewBox,setViewBox]=useState({x:-50,y:-50,w:1000,h:700});
  const [panning,setPanning]=useState(false);
  const [panStart,setPanStart]=useState<any>(null);
  const [dragging,setDragging]=useState(null);
  const [dragOffset,setDragOffset]=useState({x:0,y:0});
  const [mousePos,setMousePos]=useState({x:0,y:0});
  const [contextMenu,setContextMenu]=useState<any>(null);

  const svgPoint=useCallback((cx: number,cy: number)=>{
    const svg=svgRef.current;if(!svg) return{x:0,y:0};
    const rect=svg.getBoundingClientRect();
    return{x:(cx-rect.left)*(viewBox.w/rect.width)+viewBox.x,y:(cy-rect.top)*(viewBox.h/rect.height)+viewBox.y};
  },[viewBox, svgRef]);
  const handleMouseDown=useCallback((e: any)=>{
    if(contextMenu){setContextMenu(null);return;}
    if(e.button!==0||connectMode) return;
    if(e.target===svgRef.current||e.target.tagName==="rect"||e.target.tagName==="ellipse"){setPanning(true);setPanStart({x:e.clientX,y:e.clientY,vb:{...viewBox}});}
  },[viewBox,connectMode,contextMenu,svgRef]);
  const handleMouseMove=useCallback((e: any)=>{
    const pt=svgPoint(e.clientX,e.clientY);setMousePos(pt);
    if(dragging){onDragNode(dragging,pt.x-dragOffset.x,pt.y-dragOffset.y);return;}
    if(panning&&panStart){
      const rect=svgRef.current.getBoundingClientRect();
      const dx=(e.clientX-panStart.x)*(panStart.vb.w/rect.width),dy=(e.clientY-panStart.y)*(panStart.vb.h/rect.height);
      setViewBox({...panStart.vb,x:panStart.vb.x-dx,y:panStart.vb.y-dy});
    }
  },[dragging,dragOffset,panning,panStart,svgPoint,onDragNode,svgRef]);
  const handleMouseUp=useCallback(()=>{setPanning(false);setDragging(null);setPanStart(null);},[]);
  const handleWheel=useCallback((e: any)=>{
    e.preventDefault();
    const factor=e.deltaY>0?1.12:0.88;
    const pt=svgPoint(e.clientX,e.clientY);
    setViewBox(vb=>({x:pt.x-(pt.x-vb.x)*factor,y:pt.y-(pt.y-vb.y)*factor,w:Math.max(200,Math.min(3000,vb.w*factor)),h:Math.max(150,Math.min(2000,vb.h*factor))}));
  },[svgPoint]);
  const handleDragStart=useCallback((e: any,nodeId: string)=>{
    if(connectMode) return;
    const node=nodes.find((n: any)=>n.id===nodeId);if(!node) return;
    const pt=svgPoint(e.clientX,e.clientY);
    setDragging(nodeId as any);setDragOffset({x:pt.x-node.x,y:pt.y-node.y});
  },[nodes,svgPoint,connectMode]);
  useEffect(()=>{
    const svg=svgRef.current;if(!svg) return;
    svg.addEventListener("wheel",handleWheel,{passive:false});
    return()=>svg.removeEventListener("wheel",handleWheel);
  },[handleWheel,svgRef]);
  const fitToScreen=useCallback(()=>{
    if(!nodes.length) return;
    const xs=nodes.map((n: any)=>n.x),ys=nodes.map((n: any)=>n.y);
    setViewBox({x:Math.min(...xs)-80,y:Math.min(...ys)-80,w:Math.max(...xs)-Math.min(...xs)+160,h:Math.max(...ys)-Math.min(...ys)+160});
  },[nodes]);

  const visibleNodeIds=useMemo(()=>{
    let ids=new Set(nodes.map((n: any)=>n.id));
    if(focusNodeId){const conn=new Set([focusNodeId]);edges.forEach((e: any)=>{if(e.source===focusNodeId) conn.add(e.target);if(e.target===focusNodeId) conn.add(e.source);});ids=new Set([...ids].filter(id=>conn.has(id)));}
    if(filterTypes.length>0) ids=new Set([...ids].filter(id=>{const n=nodes.find((x: any)=>x.id===id);return n&&filterTypes.includes(n.type);}));
    if(searchQuery.trim()){const q=searchQuery.toLowerCase();ids=new Set([...ids].filter(id=>{const n=nodes.find((x: any)=>x.id===id);if(!n) return false;if((n.label||"").toLowerCase().includes(q)) return true;return Object.values(n.properties||{}).some(v=>String(v).toLowerCase().includes(q));}));}
    return ids;
  },[nodes,edges,focusNodeId,filterTypes,searchQuery]);

  const visibleEdgeIds: any=useMemo(()=>{
    if(!timelineDate) return null;
    return new Set(edges.filter((e: any)=>!e.date||parseDate(e.date)! <= timelineDate).map((e: any)=>e.id));
  },[edges,timelineDate]);

  const hiddenEdgeIds = useMemo(() => {
    if (!minStrength || minStrength <= 1) return new Set();
    return new Set(edges.filter((e: any) => (e.strength || 1) < minStrength).map((e: any) => e.id));
  }, [edges, minStrength]);

  const hiddenNodeIds = useMemo(() => {
    if (!minStrength || minStrength <= 1) return new Set();
    const validEdges = edges.filter((e: any) => (e.strength || 1) >= minStrength);
    const connectedNodes = new Set();
    validEdges.forEach((e: any) => {
      connectedNodes.add(e.source);
      connectedNodes.add(e.target);
    });
    return new Set(nodes.filter((n: any) => !connectedNodes.has(n.id)).map((n: any) => n.id));
  }, [nodes, edges, minStrength]);

  const activeEdges = useMemo(() => edges.filter((e: any) => (e.strength || 1) >= (minStrength || 1)), [edges, minStrength]);

  const getNodeFill=(node: any)=>{
    if(viewMode==="heatmap"){const c=centrality[node.id];if(!c) return RISK_COLORS.unknown;if(c.score>0.7) return"#EF4444";if(c.score>0.4) return"#F59E0B";if(c.score>0.1) return"#10B981";return"#505050";}
    if(viewMode==="cluster"){const ci=communities[node.id];return ci!==undefined?CLUSTER_COLORS[ci%8]:"#505050";}
    return (NODE_COLORS as any)[node.type]||NODE_COLORS.generic;
  };
  const pathEdgeIds=useMemo(()=>{
    if(!shortestPath||shortestPath.length<2) return new Set();
    const ids=new Set();
    for(let i=0;i<shortestPath.length-1;i++){const a=shortestPath[i],b=shortestPath[i+1];const e=edges.find((e: any)=>(e.source===a&&e.target===b)||(e.source===b&&e.target===a));if(e) ids.add(e.id);}
    return ids;
  },[shortestPath,edges]);

  return (
    <div style={{flex:1,position:"relative",overflow:"hidden",background:"#0A0A0A"}}>
      <svg ref={svgRef} width="100%" height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        style={{cursor:connectMode?"crosshair":panning?"grabbing":"grab",display:"block"}}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        onDoubleClick={(e: any)=>{if(e.target===svgRef.current||e.target.tagName==="rect"){const pt=svgPoint(e.clientX,e.clientY);onDoubleClickCanvas(pt.x,pt.y);}}}
        onClick={()=>contextMenu&&setContextMenu(null)}
      >
        <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1A1A1A" strokeWidth="0.5"/></pattern></defs>
        <rect x={viewBox.x-2000} y={viewBox.y-2000} width={viewBox.w+4000} height={viewBox.h+4000} fill="url(#grid)"/>

        {/* PHASE 5 — Cluster bubble backgrounds */}
        {showClusterBubbles && viewMode==="cluster" && <ClusterBubbles nodes={nodes} communities={communities}/>}

        {/* Edges */}
        {edges.filter((e: any) => !hiddenEdgeIds.has(e.id)).map((e: any)=>{
          const src=nodes.find((n: any)=>n.id===e.source),tgt=nodes.find((n: any)=>n.id===e.target);
          if(!src||!tgt) return null;
          const tlDim=visibleEdgeIds&&!visibleEdgeIds.has(e.id);
          const isPath=pathEdgeIds.has(e.id),isSel=selectedEdge===e.id,isHov=hoveredEdge===e.id;
          const dx=tgt.x-src.x,dy=tgt.y-src.y,dist=Math.sqrt(dx*dx+dy*dy);if(dist<1) return null;
          const sr=getNodeRadius(src.id,activeEdges),tr=getNodeRadius(tgt.id,activeEdges);
          const ux=dx/dist,uy=dy/dist;
          const x1=src.x+ux*sr,y1=src.y+uy*sr,x2=tgt.x-ux*tr,y2=tgt.y-uy*tr;
          const mx=(x1+x2)/2-dy*0.2,my=(y1+y2)/2+dx*0.2;
          const path=`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
          const lx=(x1+mx*2+x2)/4,ly=(y1+my*2+y2)/4;
          const color=isPath?"#10B981":isSel||isHov?"#E5E5E5":"#444";
          const mid=`ar-${e.id}`;
          const nodeDim=visibleNodeIds.size>0&&(!visibleNodeIds.has(e.source)||!visibleNodeIds.has(e.target));
          const opacity=tlDim?0.04:nodeDim?0.05:isSel||isHov||isPath?1:0.5;
          return (
            <g key={e.id} style={{cursor:"pointer"}} onClick={(ev: any)=>{ev.stopPropagation();onSelectEdge(e.id);}} onMouseEnter={()=>setHoveredEdge(e.id)} onMouseLeave={()=>setHoveredEdge(null)}>
              <defs><marker id={mid} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill={color}/></marker></defs>
              <path d={path} fill="none" stroke="transparent" strokeWidth={12}/>
              <path d={path} fill="none" stroke={color} strokeWidth={isPath?3:getEdgeThickness(e.strength)} markerEnd={`url(#${mid})`} strokeOpacity={opacity} strokeDasharray={isPath?"8,3":tlDim?"3,5":"none"} style={{transition:"stroke-opacity 0.3s"}}/>
              {(isSel||isHov||showLabels||isPath)&&!tlDim&&(
                <g>
                  <rect x={lx-28} y={ly-8} width={56} height={16} rx={3} fill="#0A0A0A" stroke={isPath?"#10B98133":"#333"} strokeWidth={1}/>
                  <text x={lx} y={ly+4} textAnchor="middle" style={{fontSize:"8px",fill:isPath?"#10B981":"#A0A0A0",fontFamily:"monospace",letterSpacing:"0.03em"}}>{(EDGE_LABELS as any)[e.type]}</text>
                </g>
              )}
            </g>
          );
        })}

        {connectMode&&connectSource&&(()=>{const s=nodes.find((n: any)=>n.id===connectSource);if(!s) return null;return<line x1={s.x} y1={s.y} x2={mousePos.x} y2={mousePos.y} stroke="#E5E5E5" strokeWidth={1.5} strokeDasharray="6,4" strokeOpacity={0.5}/>;})()}

        {/* Nodes */}
        {nodes.filter((n: any) => !hiddenNodeIds.has(n.id)).map((n: any)=>{
          const r=getNodeRadius(n.id,activeEdges),fillColor=getNodeFill(n);
          const conns=activeEdges.filter((e: any)=>e.source===n.id||e.target===n.id).length;
          const isSel=selectedNode===n.id,isHov=hoveredNode===n.id;
          const dimmed=visibleNodeIds.size>0&&!visibleNodeIds.has(n.id);
          const inPath=shortestPath?.includes(n.id);
          const tlGray=visibleEdgeIds&&edges.filter((e: any)=>(e.source===n.id||e.target===n.id)&&visibleEdgeIds.has(e.id)).length===0&&conns>0;
          const c=centrality[n.id];
          // PHASE 5: heatmap pulse ring size proportional to score
          const heatRingR = viewMode==="heatmap" && c ? r + 4 + c.score*16 : 0;

          return (
            <g key={n.id} transform={`translate(${n.x},${n.y})`} style={{cursor:connectMode?"crosshair":"pointer"}}
              onClick={()=>onSelectNode(n.id)}
              onMouseEnter={()=>setHoveredNode(n.id as any)} onMouseLeave={()=>setHoveredNode(null)}
              onMouseDown={(e)=>{if(connectMode){if(connectSource&&connectSource!==n.id){onSetConnectSource(n.id,connectSource);}else if(!connectSource){onSetConnectSource(n.id,null);}return;}e.stopPropagation();handleDragStart(e,n.id);}}
              onContextMenu={(e: any)=>{e.preventDefault();e.stopPropagation();setContextMenu({x:e.clientX,y:e.clientY,nodeId:n.id});}}
            >
              {/* PHASE 5: Heatmap intensity ring */}
              {heatRingR>0&&!dimmed&&(
                <circle r={heatRingR} fill={fillColor+"10"} stroke={fillColor} strokeWidth={1} strokeOpacity={0.2}/>
              )}
              {isHov&&!dimmed&&<circle r={r+10} fill="none" stroke={fillColor} strokeWidth={8} strokeOpacity={0.1}/>}
              {isSel&&<><circle r={r+6} fill="none" stroke="white" strokeWidth={2} strokeOpacity={0.3}/><circle r={r+12} fill="none" stroke="white" strokeWidth={1} strokeOpacity={0.1}/></>}
              {inPath&&<circle r={r+8} fill="none" stroke="#10B981" strokeWidth={3} strokeOpacity={0.6}/>}
              {runningTransformId===n.id&&<circle r={r+10} fill="none" stroke="#3B82F6" strokeWidth={2} strokeOpacity={0.8} style={{animation:"pulse 1s infinite"}}/>}
              {n.isSuspicious&&<circle r={r+4} fill="none" stroke="#EF4444" strokeWidth={1.5} strokeOpacity={0.5} style={{animation:"pulse 2s infinite"}}/>}
              <circle r={r} fill="#111" stroke={tlGray?"#2A2A2A":fillColor} strokeWidth={isSel?3:n.isSuspicious?2:1.5} opacity={dimmed?0.08:tlGray?0.3:1} style={{transition:"opacity 0.3s,stroke 0.3s"}}/>
              {/* PHASE 5: Avatar image or emoji icon */}
              <NodeWithAvatar node={n} r={r} fillColor={fillColor} dimmed={dimmed} useAvatar={showAvatars&&!dimmed&&!tlGray}/>
              {(!dimmed&&!tlGray&&(showLabels||isSel||isHov))&&(
                <text y={r+15} textAnchor="middle" style={{fontSize:"10px",fill:isSel?"#FFF":"#A0A0A0",fontFamily:"'Courier New',monospace",userSelect:"none",pointerEvents:"none"}}>
                  {(n.label || "").length>14?(n.label || "").slice(0,14)+"…":(n.label || "")}
                </text>
              )}
              {conns>0&&!dimmed&&!tlGray&&(
                <g transform={`translate(${r-8},${-r+8})`}><circle r={9} fill="#1A1A1A" stroke="#333" strokeWidth={1}/><text textAnchor="middle" y={4} style={{fontSize:"9px",fill:fillColor,fontFamily:"monospace",fontWeight:"bold"}}>{conns}</text></g>
              )}
              {n.isVerified&&!dimmed&&<g transform={`translate(${-r+8},${-r+8})`}><circle r={7} fill="#10B981"/><text textAnchor="middle" y={4} style={{fontSize:"9px",fill:"white"}}>✓</text></g>}
            </g>
          );
        })}
        <style>{`@keyframes pulse{0%,100%{opacity:0.3}50%{opacity:0.9}}`}</style>
      </svg>

      {contextMenu&&(()=>{
        const n=nodes.find((x: any)=>x.id===contextMenu.nodeId);if(!n) return null;
        const availableTransforms = (TRANSFORMS as any)[n.type] || [];
        return (
          <div style={{position:"fixed",left:contextMenu.x,top:contextMenu.y,background:"#111",border:"1px solid #333",borderRadius:"5px",zIndex:200,minWidth:"170px",fontFamily:"'Courier New',monospace",boxShadow:"0 8px 24px rgba(0,0,0,0.7)"}}>
            <div style={{padding:"5px 10px",fontSize:"8px",color:"#505050",borderBottom:"1px solid #1A1A1A",letterSpacing:"0.07em"}}>{n.label}</div>
            {[["🔍 Focus connections",()=>{onSelectNode(n.id);setContextMenu(null);},"#A0A0A0"],["⭐ Open details",()=>{onSelectNode(n.id);setContextMenu(null);},"#A0A0A0"],["🔗 Connect from here",()=>{onSetConnectSource(n.id,null);setContextMenu(null);},"#10B981"]].map(([lbl,fn,clr]: any)=>(
              <div key={lbl} onClick={fn} style={{padding:"7px 11px",fontSize:"10px",color:clr,cursor:"pointer",borderBottom:"1px solid #1A1A1A"}}
                onMouseEnter={(e: any)=>e.currentTarget.style.background="#1A1A1A"} onMouseLeave={(e: any)=>e.currentTarget.style.background="transparent"}>{lbl}</div>
            ))}
            {availableTransforms.length > 0 && (
              <>
                <div style={{padding:"5px 10px",fontSize:"8px",color:"#3B82F6",borderBottom:"1px solid #1A1A1A",letterSpacing:"0.07em",marginTop:"5px"}}>TRANSFORMS (MALTEGO)</div>
                {availableTransforms.map((t: any) => (
                  <div key={t.id} onClick={() => { onRunTransform(n.id, t.id); setContextMenu(null); }} style={{padding:"7px 11px",fontSize:"10px",color:"#3B82F6",cursor:"pointer",borderBottom:"1px solid #1A1A1A",display:"flex",alignItems:"center",gap:"6px"}}
                    onMouseEnter={(e: any)=>e.currentTarget.style.background="#1A1A1A"} onMouseLeave={(e: any)=>e.currentTarget.style.background="transparent"}>
                    <span>{t.icon}</span>
                    <span style={{flex:1}}>{t.label}</span>
                    {t.toolCategory && <ExternalLink size={8} style={{opacity:0.5}} />}
                  </div>
                ))}
              </>
            )}
          </div>
        );
      })()}

      <div style={{position:"absolute",bottom:"16px",right:"16px",display:"flex",flexDirection:"column",gap:"3px"}}>
        {[["FIT",fitToScreen],["+",()=>setViewBox(v=>({...v,w:v.w*0.8,h:v.h*0.8}))],["-",()=>setViewBox(v=>({...v,w:v.w*1.2,h:v.h*1.2}))]].map(([lbl,fn]: any)=>(
          <button key={lbl} onClick={fn} style={{background:"#111",border:"1px solid #222",color:"#A0A0A0",borderRadius:"4px",padding:"4px 9px",cursor:"pointer",fontSize:"9px",fontFamily:"monospace"}}>{lbl}</button>
        ))}
      </div>

      <div style={{position:"absolute",bottom:"16px",left:"16px",width:"130px",height:"80px",background:"#111",border:"1px solid #222",borderRadius:"4px",overflow:"hidden"}}>
        <svg width="100%" height="100%">{(()=>{
          if(!nodes.length) return null;
          const xs=nodes.filter((n: any) => !hiddenNodeIds.has(n.id)).map((n: any)=>n.x),ys=nodes.filter((n: any) => !hiddenNodeIds.has(n.id)).map((n: any)=>n.y);
          const mnX=Math.min(...xs)-50,mxX=Math.max(...xs)+50,mnY=Math.min(...ys)-50,mxY=Math.max(...ys)+50;
          const sc=Math.min(130/(mxX-mnX),80/(mxY-mnY))*0.85;
          const ox=(130-(mxX-mnX)*sc)/2,oy=(80-(mxY-mnY)*sc)/2;
          return nodes.filter((n: any) => !hiddenNodeIds.has(n.id)).map((n: any)=>(
            <circle key={n.id} cx={(n.x-mnX)*sc+ox} cy={(n.y-mnY)*sc+oy} r={selectedNode===n.id?5:3}
              fill={getNodeFill(n)} opacity={visibleNodeIds.has(n.id)?0.9:0.15}/>
          ));
        })()}</svg>
        <div style={{position:"absolute",top:"3px",left:"4px",fontSize:"7px",color:"#505050",letterSpacing:"0.04em"}}>OVERVIEW</div>
      </div>
    </div>
  );
}

// ============================================================
// TOP BAR
// ============================================================
function TopBar({ nodes, edges, layout, onLayoutChange, minStrength, onMinStrengthChange, searchQuery, onSearchChange,
  filterTypes, onFilterType, onAddNode, connectMode, onToggleConnect,
  showLabels, onToggleLabels, viewMode, onViewModeChange,
  focusNodeId, onClearFocus, shortestPath, onClearPath,
  showInsights, onToggleInsights, showTimeline, onToggleTimeline,
  onOpenSnapshots, onOpenImportExport,
  showAvatars, onToggleAvatars, showClusterBubbles, onToggleClusterBubbles, onClose }: any) {

  const [showFilters,setShowFilters]=useState(false);
  const [showVisual,setShowVisual]=useState(false);

  return (
    <div style={{height:"52px",background:"#0D0D0D",borderBottom:"1px solid #222",display:"flex",alignItems:"center",padding:"0 10px",gap:"7px",fontFamily:"'Courier New',monospace",flexShrink:0,overflow:"visible",position:"relative",zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:"6px",flexShrink:0}}>
        {onClose && (
          <button onClick={onClose} style={{display:"flex",alignItems:"center",gap:"4px",padding:"4px 8px",background:"#111",border:"1px solid #333",color:"#A0A0A0",borderRadius:"4px",cursor:"pointer",fontSize:"9px",letterSpacing:"0.07em",fontWeight:"bold",transition:"all 0.2s"}}>
            <span>←</span> BACK
          </button>
        )}
        {!onClose && (
          <>
            <div style={{width:"20px",height:"20px",background:"#E5E5E5",borderRadius:"3px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px"}}>◈</div>
            <div style={{flexShrink:0}}>
              <div style={{fontSize:"9px",fontWeight:"bold",color:"#E5E5E5",letterSpacing:"0.08em",lineHeight:1}}>ABSTER</div>
              <div style={{fontSize:"7px",color:"#505050",letterSpacing:"0.12em"}}>GRAPH v4</div>
            </div>
          </>
        )}
      </div>

      {/* Layouts */}
      <div style={{display:"flex",gap:"2px",flexShrink:0}}>
        {["force","hierarchical","circular","target","grid"].map(l=>(
          <button key={l} onClick={()=>onLayoutChange(l)} style={{padding:"2px 6px",fontSize:"7px",letterSpacing:"0.05em",background:layout===l?"#1A1A1A":"transparent",color:layout===l?"#E5E5E5":"#505050",border:layout===l?"1px solid #333":"1px solid transparent",borderRadius:"3px",cursor:"pointer"}}>{l.slice(0,4).toUpperCase()}</button>
        ))}
      </div>

      {/* Edge Strength Filter */}
      <div style={{display:"flex",alignItems:"center",gap:"4px",flexShrink:0,marginLeft:"5px"}}>
        <span style={{fontSize:"7px",color:"#A0A0A0"}}>MIN STRENGTH:</span>
        <input type="range" min="1" max="10" value={minStrength} onChange={(e)=>onMinStrengthChange(Number(e.target.value))} style={{width:"50px", accentColor: "#10B981"}}/>
        <span style={{fontSize:"7px",color:"#E5E5E5",width:"10px"}}>{minStrength}</span>
      </div>

      {/* View modes */}
      <div style={{display:"flex",gap:"2px",flexShrink:0}}>
        {[["type","TYPE"],["heatmap","HEAT"],["cluster","CLUST"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>onViewModeChange(id)} style={{padding:"2px 6px",fontSize:"7px",letterSpacing:"0.05em",background:viewMode===id?"#1A2A1A":"transparent",color:viewMode===id?"#10B981":"#505050",border:viewMode===id?"1px solid #1A4A1A":"1px solid transparent",borderRadius:"3px",cursor:"pointer"}}>{lbl}</button>
        ))}
      </div>

      {/* Search */}
      <div style={{position:"relative",flex:1,maxWidth:"170px",flexShrink:0}}>
        <span style={{position:"absolute",left:"6px",top:"50%",transform:"translateY(-50%)",color:"#505050",fontSize:"10px"}}>⌕</span>
        <input value={searchQuery} onChange={e=>onSearchChange(e.target.value)} placeholder="Search..."
          style={{width:"100%",background:"#0A0A0A",border:"1px solid #222",color:"#E5E5E5",borderRadius:"4px",padding:"3px 6px 3px 20px",fontSize:"9px",outline:"none",fontFamily:"'Courier New',monospace",boxSizing:"border-box"}}/>
      </div>

      {/* Filter */}
      <div style={{position:"relative",flexShrink:0}}>
        <button onClick={()=>{setShowFilters(s=>!s);setShowVisual(false);}} style={{padding:"2px 7px",fontSize:"7px",letterSpacing:"0.05em",background:filterTypes.length?"#1A1A1A":"transparent",color:filterTypes.length?"#E5E5E5":"#505050",border:"1px solid #222",borderRadius:"3px",cursor:"pointer"}}>
          FILTER{filterTypes.length?` (${filterTypes.length})`:""}
        </button>
        {showFilters&&(
          <div style={{position:"absolute",top:"26px",left:0,background:"#111",border:"1px solid #222",borderRadius:"4px",padding:"4px",zIndex:100,minWidth:"135px"}}>
            {Object.keys(NODE_COLORS).map(t=>(
              <div key={t} onClick={()=>onFilterType(t)} style={{display:"flex",alignItems:"center",gap:"5px",padding:"3px 5px",cursor:"pointer",borderRadius:"3px",background:filterTypes.includes(t)?"#1A1A1A":"transparent"}}>
                <span style={{fontSize:"10px"}}>{(NODE_ICONS as any)[t]}</span>
                <span style={{fontSize:"8px",color:filterTypes.includes(t)?(NODE_COLORS as any)[t]:"#A0A0A0"}}>{t.toUpperCase()}</span>
              </div>
            ))}
            {filterTypes.length>0&&<div onClick={()=>onFilterType(null)} style={{borderTop:"1px solid #222",marginTop:"2px",padding:"3px 5px",cursor:"pointer",fontSize:"7px",color:"#505050"}}>CLEAR ALL</div>}
          </div>
        )}
      </div>

      {/* PHASE 5 — Visual options dropdown */}
      <div style={{position:"relative",flexShrink:0}}>
        <button onClick={()=>{setShowVisual(s=>!s);setShowFilters(false);}} style={{padding:"2px 7px",fontSize:"7px",letterSpacing:"0.05em",background:showVisual?"#1A1A1A":"transparent",color:"#505050",border:"1px solid #222",borderRadius:"3px",cursor:"pointer"}}>VISUAL ▾</button>
        {showVisual&&(
          <div style={{position:"absolute",top:"26px",left:0,background:"#111",border:"1px solid #222",borderRadius:"4px",padding:"6px 8px",zIndex:100,minWidth:"160px",display:"flex",flexDirection:"column",gap:"5px"}}>
            {[
              [showLabels,"LABELS","Show edge & node labels",onToggleLabels],
              [showAvatars,"AVATARS","Show images on nodes",onToggleAvatars],
              [showClusterBubbles,"CLUSTER BUBBLES","Draw cluster backgrounds",onToggleClusterBubbles],
            ].map(([active,label,desc,fn]: any)=>(
              <div key={label} onClick={fn} style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",padding:"3px 0"}}>
                <div style={{width:"14px",height:"14px",borderRadius:"3px",background:active?"#E5E5E5":"transparent",border:`1px solid ${active?"#E5E5E5":"#444"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {active&&<span style={{fontSize:"9px",color:"#0A0A0A"}}>✓</span>}
                </div>
                <div>
                  <div style={{fontSize:"9px",color:active?"#E5E5E5":"#A0A0A0"}}>{label}</div>
                  <div style={{fontSize:"7px",color:"#505050"}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={onToggleInsights} style={{padding:"2px 7px",fontSize:"7px",letterSpacing:"0.06em",background:showInsights?"#1A2A1A":"transparent",color:showInsights?"#10B981":"#505050",border:`1px solid ${showInsights?"#1A4A1A":"#222"}`,borderRadius:"3px",cursor:"pointer",flexShrink:0}}>⚡ INTEL</button>
      <button onClick={onToggleTimeline} style={{padding:"2px 7px",fontSize:"7px",letterSpacing:"0.06em",background:showTimeline?"#1A1A2A":"transparent",color:showTimeline?"#8B5CF6":"#505050",border:`1px solid ${showTimeline?"#2A1A4A":"#222"}`,borderRadius:"3px",cursor:"pointer",flexShrink:0}}>⏱ TIME</button>
      <button onClick={onOpenSnapshots} style={{padding:"2px 7px",fontSize:"7px",background:"transparent",color:"#505050",border:"1px solid #222",borderRadius:"3px",cursor:"pointer",flexShrink:0}}>📸 SNAP</button>
      {/* PHASE 6 */}
      <button onClick={onOpenImportExport} style={{padding:"2px 7px",fontSize:"7px",background:"transparent",color:"#505050",border:"1px solid #222",borderRadius:"3px",cursor:"pointer",flexShrink:0}}>📦 I/O</button>

      {focusNodeId&&<button onClick={onClearFocus} style={{padding:"2px 7px",fontSize:"7px",background:"#1A1A00",border:"1px solid #3A3A00",color:"#F59E0B",borderRadius:"3px",cursor:"pointer",flexShrink:0}}>FOCUS ×</button>}
      {shortestPath&&<button onClick={onClearPath} style={{padding:"2px 7px",fontSize:"7px",background:"#0A1A0A",border:"1px solid #1A4A1A",color:"#10B981",borderRadius:"3px",cursor:"pointer",flexShrink:0}}>PATH ×</button>}

      <div style={{flex:1}}/>
      <button onClick={onToggleConnect} style={{padding:"3px 10px",fontSize:"8px",letterSpacing:"0.07em",background:connectMode?"#1A2A1A":"#1A1A1A",border:connectMode?"1px solid #10B981":"1px solid #222",color:connectMode?"#10B981":"#A0A0A0",borderRadius:"4px",cursor:"pointer",flexShrink:0}}>
        {connectMode?"● CONN":"CONNECT"}
      </button>
      <button onClick={onAddNode} style={{padding:"3px 10px",fontSize:"8px",letterSpacing:"0.07em",background:"#E5E5E5",border:"none",color:"#0A0A0A",borderRadius:"4px",cursor:"pointer",fontWeight:"bold",flexShrink:0}}>+ ENTITY</button>
    </div>
  );
}

// ============================================================
// MODALS (add node / add edge)
// ============================================================
function AddNodeModal({ onAdd, onClose }: any) {
  const [label,setLabel]=useState(""),[type,setType]=useState("person");
  const inp: any={background:"#0A0A0A",border:"1px solid #222",color:"#E5E5E5",borderRadius:"4px",padding:"6px 10px",fontSize:"12px",width:"100%",outline:"none",fontFamily:"'Courier New',monospace",boxSizing:"border-box"};
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#111",border:"1px solid #222",borderRadius:"8px",padding:"20px",width:"340px",fontFamily:"'Courier New',monospace"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"14px"}}><div style={{fontSize:"10px",letterSpacing:"0.12em",color:"#A0A0A0"}}>NEW ENTITY</div><button onClick={onClose} style={{background:"none",border:"none",color:"#505050",cursor:"pointer",fontSize:"18px"}}>×</button></div>
        <div style={{display:"flex",justifyContent:"center",marginBottom:"14px"}}>
          <div style={{width:"56px",height:"56px",borderRadius:"50%",background:"#111",border:`2px solid ${(NODE_COLORS as any)[type]}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px",boxShadow:`0 0 18px ${(NODE_COLORS as any)[type]}33`}}>{(NODE_ICONS as any)[type]}</div>
        </div>
        <div style={{marginBottom:"9px"}}><div style={{fontSize:"8px",color:"#505050",marginBottom:"3px",letterSpacing:"0.07em"}}>LABEL *</div><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Entity name..." style={inp} autoFocus onKeyDown={e=>e.key==="Enter"&&label.trim()&&(onAdd({id:generateId(),label:label.trim(),type,properties:{},confidence:0.8,source:"manual",isVerified:false,isSuspicious:false,notes:"",avatar:null}),onClose())}/></div>
        <div style={{marginBottom:"16px"}}><div style={{fontSize:"8px",color:"#505050",marginBottom:"3px",letterSpacing:"0.07em"}}>TYPE</div><select value={type} onChange={e=>setType(e.target.value)} style={{...inp,cursor:"pointer"}}>{Object.keys(NODE_COLORS).map(t=><option key={t} value={t}>{t.toUpperCase()}</option>)}</select></div>
        <div style={{display:"flex",gap:"6px"}}>
          <button onClick={onClose} style={{flex:1,padding:"7px",background:"#0A0A0A",border:"1px solid #222",color:"#A0A0A0",borderRadius:"4px",cursor:"pointer",fontSize:"9px",letterSpacing:"0.07em"}}>CANCEL</button>
          <button onClick={()=>{if(!label.trim()) return;onAdd({id:generateId(),label:label.trim(),type,properties:{},confidence:0.8,source:"manual",isVerified:false,isSuspicious:false,notes:"",avatar:null});onClose();}} style={{flex:1,padding:"7px",background:"#E5E5E5",border:"none",color:"#0A0A0A",borderRadius:"4px",cursor:"pointer",fontSize:"9px",letterSpacing:"0.07em",fontWeight:"bold"}}>CREATE</button>
        </div>
      </div>
    </div>
  );
}
function AddEdgeModal({ sourceId, targetId, nodes, onAdd, onClose }: any) {
  const [type,setType]=useState("related_to"),[label,setLabel]=useState(""),[strength,setStrength]=useState(5),[date,setDate]=useState("");
  const src=nodes.find((n: any)=>n.id===sourceId),tgt=nodes.find((n: any)=>n.id===targetId);
  const inp: any={background:"#0A0A0A",border:"1px solid #222",color:"#E5E5E5",borderRadius:"4px",padding:"6px 10px",fontSize:"11px",width:"100%",outline:"none",fontFamily:"'Courier New',monospace",boxSizing:"border-box"};
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#111",border:"1px solid #222",borderRadius:"8px",padding:"20px",width:"340px",fontFamily:"'Courier New',monospace"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"14px"}}><div style={{fontSize:"10px",letterSpacing:"0.12em",color:"#A0A0A0"}}>NEW RELATION</div><button onClick={onClose} style={{background:"none",border:"none",color:"#505050",cursor:"pointer",fontSize:"18px"}}>×</button></div>
        <div style={{display:"flex",alignItems:"center",gap:"9px",marginBottom:"12px",padding:"9px",background:"#0A0A0A",borderRadius:"4px",border:"1px solid #1A1A1A"}}>
          <span style={{fontSize:"17px"}}>{(NODE_ICONS as any)[src?.type]}</span>
          <div style={{flex:1,height:"1px",background:"#444",position:"relative"}}><span style={{position:"absolute",top:"-7px",left:"50%",transform:"translateX(-50%)",fontSize:"7px",color:"#F59E0B",background:"#0A0A0A",padding:"0 3px",whiteSpace:"nowrap"}}>{(EDGE_LABELS as any)[type]}</span></div>
          <span style={{fontSize:"17px"}}>{(NODE_ICONS as any)[tgt?.type]}</span>
        </div>
        <div style={{marginBottom:"9px"}}><div style={{fontSize:"8px",color:"#505050",marginBottom:"3px",letterSpacing:"0.07em"}}>TYPE</div><select value={type} onChange={e=>setType(e.target.value)} style={{...inp,cursor:"pointer"}}>{Object.entries(EDGE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
        <div style={{marginBottom:"9px"}}><div style={{fontSize:"8px",color:"#505050",marginBottom:"3px",letterSpacing:"0.07em"}}>LABEL</div><input value={label} onChange={e=>setLabel(e.target.value)} placeholder={(EDGE_LABELS as any)[type]} style={inp}/></div>
        <div style={{marginBottom:"9px"}}><div style={{fontSize:"8px",color:"#505050",marginBottom:"3px",letterSpacing:"0.07em"}}>DATE</div><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...inp,colorScheme:"dark"}}/></div>
        <div style={{marginBottom:"14px"}}><div style={{fontSize:"8px",color:"#505050",marginBottom:"3px",letterSpacing:"0.07em"}}>STRENGTH: {strength}/10</div><input type="range" min={1} max={10} value={strength} onChange={e=>setStrength(+e.target.value)} style={{width:"100%",accentColor:"#E5E5E5"}}/></div>
        <div style={{display:"flex",gap:"6px"}}>
          <button onClick={onClose} style={{flex:1,padding:"7px",background:"#0A0A0A",border:"1px solid #222",color:"#A0A0A0",borderRadius:"4px",cursor:"pointer",fontSize:"9px",letterSpacing:"0.07em"}}>CANCEL</button>
          <button onClick={()=>{onAdd({id:generateId(),source:sourceId,target:targetId,type,label:label||(EDGE_LABELS as any)[type],strength,notes:"",date});onClose();}} style={{flex:1,padding:"7px",background:"#E5E5E5",border:"none",color:"#0A0A0A",borderRadius:"4px",cursor:"pointer",fontSize:"9px",letterSpacing:"0.07em",fontWeight:"bold"}}>CREATE</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
// ============================================================
// MALTEGO SIDEBAR
// ============================================================
function MaltegoSidebar({ nodeId, transformId, category, nodes, onClose }: { 
  nodeId: string, 
  transformId: string, 
  category: string, 
  nodes: any[],
  onClose: () => void 
}) {
  const node = nodes.find(n => n.id === nodeId);
  const transform = Object.values(TRANSFORMS).flat().find(t => t.id === transformId);
  const relevantTools = TOOLS.filter(t => t.cat === category);

  return (
    <div className="absolute right-4 top-4 bottom-4 w-80 bg-zinc-950/95 border border-zinc-800 rounded-xl shadow-2xl z-[100] flex flex-col overflow-hidden backdrop-blur-xl animate-in slide-in-from-right-8 duration-300">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80 shrink-0">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-violet-400 fill-violet-400/20" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-100">MALTEGO CONCEPT</span>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-500 hover:text-zinc-100">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        <div className="p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-lg">
          <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-2">Target Entity</div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xl border border-zinc-700">
              {NODE_ICONS[node?.type as keyof typeof NODE_ICONS] || '◆'}
            </div>
            <div>
              <div className="font-bold text-sm text-zinc-100">{node?.label}</div>
              <div className="text-[10px] text-zinc-500 uppercase">{node?.type}</div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-violet-500/5 border border-violet-500/20 rounded-lg">
          <div className="text-[9px] text-violet-400/70 uppercase tracking-widest mb-2">Selected Transform</div>
          <div className="flex items-center gap-2 text-violet-400">
            <span className="text-lg">{transform?.icon}</span>
            <span className="font-bold text-sm">{transform?.label}</span>
          </div>
          <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">{transform?.description}</p>
        </div>

        <div>
          <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Search size={10} />
            <span>Recommended Tools ({CAT_LABELS[category as keyof typeof CAT_LABELS]})</span>
          </div>
          
          <div className="space-y-2">
            {relevantTools.map(tool => (
              <a 
                key={tool.id} 
                href={tool.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block p-3 bg-zinc-900/50 border border-zinc-800 hover:border-violet-500/50 hover:bg-zinc-800/50 transition-all group rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-zinc-950 flex items-center justify-center text-sm border border-zinc-800 group-hover:border-violet-500/30" style={{ color: tool.color }}>
                    {tool.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-100 truncate">{tool.name}</span>
                      <ExternalLink size={10} className="text-zinc-600 group-hover:text-violet-400 transition-colors" />
                    </div>
                    <p className="text-[9px] text-zinc-500 truncate mt-0.5">{tool.desc}</p>
                  </div>
                </div>
              </a>
            ))}
            {relevantTools.length === 0 && (
              <div className="text-center py-12 border border-dashed border-zinc-800 rounded-lg">
                <Info size={20} className="mx-auto mb-2 text-zinc-700" />
                <p className="text-[10px] text-zinc-600">No tools indexed for this category.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-center gap-2 text-[9px] text-zinc-500">
        <Shield size={10} />
        <span>External tool will open in a new browser tab</span>
      </div>
    </div>
  );
}

export default function AbsterGraph({ onClose }: { onClose?: () => void }) {
  const { entities: allEntities, relations: allRelations, activeCaseId, addEntity, updateEntity, removeEntity, addRelation, removeRelation, updateRelation, clearCaseData } = useAbsterStore();
  const entities = useMemo(() => allEntities.filter(e => e.caseId === activeCaseId), [allEntities, activeCaseId]);
  const relations = useMemo(() => allRelations.filter(r => r.caseId === activeCaseId), [allRelations, activeCaseId]);
  const svgRef = useRef(null);
  
  const [nodes,setNodes]=useState<any[]>([]);
  const [edges,setEdges]=useState<any[]>([]);
  
  const lastStoreNodeIds = useRef(new Set<string>());
  const lastStoreEdgeIds = useRef(new Set<string>());

  // Sync from store
  useEffect(() => {
    const currentStoreNodeIds = new Set(entities.map(e => e.id));
    const currentStoreEdgeIds = new Set(relations.map(r => r.id));

    setNodes(prev => {
      let changed = false;
      
      // 1. Filter out nodes that were in the store but are now gone (DELETED)
      // 2. Keep nodes that are NOT in the store yet (NEW/LOCAL)
      let next = prev.filter(n => {
        const wasInStore = lastStoreNodeIds.current.has(n.id);
        const isInStore = currentStoreNodeIds.has(n.id);
        
        if (wasInStore && !isInStore) {
          changed = true;
          return false; // Explicitly deleted from store
        }
        return true; // Keep local or existing store nodes
      }).map(n => {
        const e = entities.find(ent => ent.id === n.id);
        if (!e) return n;
        
        // Check if data actually changed to avoid unnecessary state updates
        const hasChanged = 
          n.label !== e.name || 
          n.type !== e.type.toLowerCase() ||
          n.notes !== e.notes ||
          n.isVerified !== e.isVerified ||
          n.isSuspicious !== e.isSuspicious ||
          n.avatar !== e.avatar ||
          Math.abs((n.x || 0) - (e.x || 0)) > 0.5 ||
          Math.abs((n.y || 0) - (e.y || 0)) > 0.5;

        if (!hasChanged) return n;
        changed = true;

        return {
          ...n,
          type: e.type.toLowerCase(),
          label: e.name,
          notes: e.notes,
          x: e.x ?? n.x,
          y: e.y ?? n.y,
          confidence: e.confidence ?? n.confidence,
          source: e.source ?? n.source,
          isVerified: e.isVerified ?? n.isVerified,
          isSuspicious: e.isSuspicious ?? n.isSuspicious,
          avatar: e.avatar ?? n.avatar,
          properties: e.metadata ?? n.properties
        };
      });

      // 3. Add nodes that are in the store but NOT in our local state
      const localIds = new Set(next.map(n => n.id));
      entities.forEach(e => {
        if (!localIds.has(e.id)) {
          changed = true;
          next.push({
            id: e.id,
            type: e.type.toLowerCase(),
            label: e.name || "Unknown",
            notes: e.notes,
            x: e.x || 400 + Math.random() * 100,
            y: e.y || 300 + Math.random() * 100,
            confidence: e.confidence || 1,
            source: e.source || 'manual',
            isVerified: e.isVerified || false,
            isSuspicious: e.isSuspicious || false,
            avatar: e.avatar || null,
            properties: e.metadata || {}
          });
        }
      });

      if (changed || next.length !== prev.length) {
        lastStoreNodeIds.current = currentStoreNodeIds;
        return next;
      }
      return prev;
    });

    setEdges(prev => {
      let changed = false;
      
      let next = prev.filter(e => {
        const wasInStore = lastStoreEdgeIds.current.has(e.id);
        const isInStore = currentStoreEdgeIds.has(e.id);
        
        if (wasInStore && !isInStore) {
          changed = true;
          return false;
        }
        return true;
      }).map(e => {
        const r = relations.find(rel => rel.id === e.id);
        if (!r) return e;
        
        const hasChanged = e.label !== r.label || e.strength !== r.strength || e.date !== r.date;
        if (!hasChanged) return e;
        changed = true;

        return {
          ...e,
          source: r.source,
          target: r.target,
          type: r.type,
          label: r.label,
          strength: r.strength ?? e.strength,
          date: r.date ?? e.date
        };
      });

      const localIds = new Set(next.map(e => e.id));
      relations.forEach(r => {
        if (!localIds.has(r.id)) {
          changed = true;
          next.push({
            id: r.id,
            source: r.source,
            target: r.target,
            type: r.type,
            label: r.label,
            strength: r.strength || 5,
            date: r.date || ''
          });
        }
      });

      if (changed || next.length !== prev.length) {
        lastStoreEdgeIds.current = currentStoreEdgeIds;
        return next;
      }
      return prev;
    });
  }, [entities, relations]);

  const [selectedNode,setSelectedNode]=useState<string|null>(null);
  const [selectedEdge,setSelectedEdge]=useState<string|null>(null);
  const [layout,setLayout]=useState("force");
  const [minStrength,setMinStrength]=useState(1);
  const [searchQuery,setSearchQuery]=useState("");
  const [filterTypes,setFilterTypes]=useState<string[]>([]);
  const [showAddNode,setShowAddNode]=useState(false);
  const [addNodePos,setAddNodePos]=useState<any>(null);
  const [connectMode,setConnectMode]=useState(false);
  const [connectSource,setConnectSource]=useState<string|null>(null);
  const [runningTransformId, setRunningTransformId] = useState<string | null>(null);
  const [maltegoTools, setMaltegoTools] = useState<{ nodeId: string, transformId: string, category: string } | null>(null);
  const [edgeModal,setEdgeModal]=useState<any>(null);
  const [history,setHistory]=useState<any[]>([]);
  const [future,setFuture]=useState<any[]>([]);
  const [showLabels,setShowLabels]=useState(false);
  const [viewMode,setViewMode]=useState("type");
  const [focusNodeId,setFocusNodeId]=useState<string|null>(null);
  const [shortestPath,setShortestPath]=useState<string[]|null>(null);
  const [showInsights,setShowInsights]=useState(false);
  const [showTimeline,setShowTimeline]=useState(false);
  const [isPlaying,setIsPlaying]=useState(false);
  const [showSnapshots,setShowSnapshots]=useState(false);
  const [snapshots,setSnapshots]=useState<any[]>([{id:"snap0",name:"Initial State — Day 0",timestamp:"2024-01-01 09:00",nodes:INITIAL_NODES,edges:INITIAL_EDGES}]);
  // Phase 5 state
  const [showAvatars,setShowAvatars]=useState(true);
  const [showClusterBubbles,setShowClusterBubbles]=useState(false);
  // Phase 6 state
  const [showImportExport,setShowImportExport]=useState(false);

  const timelineBounds: any =useMemo(()=>{
    const dates=edges.map(e=>e.date).filter(Boolean).map(d=>parseDate(d)).filter(Boolean);
    if(!dates.length) return null;
    return{min:Math.min(...(dates as any)),max:Math.max(...(dates as any))};
  },[edges]);
  const [timelineDate,setTimelineDate]=useState(()=>{
    const dates=INITIAL_EDGES.map(e=>parseDate(e.date)).filter(Boolean);
    return dates.length?Math.max(...(dates as any)):Date.now();
  });

  const centrality=useMemo(()=>computeCentrality(nodes,edges),[nodes,edges]);
  const communities=useMemo(()=>detectCommunities(nodes,edges),[nodes,edges]);
  const riskScores=useMemo(()=>{const r: any={};nodes.forEach(n=>{r[n.id]=computeRiskScore(n,edges,centrality);});return r;},[nodes,edges,centrality]);
  const insights=useMemo(()=>generateInsights(nodes,edges,centrality,communities),[nodes,edges,centrality,communities]);

  const pushHistory=useCallback(()=>{setHistory(h=>[...h.slice(-20),{nodes,edges}]);setFuture([]);},[nodes,edges]);
  const undo=useCallback(()=>{if(!history.length) return;const p=history[history.length-1];setFuture(f=>[{nodes,edges},...f]);setNodes(p.nodes);setEdges(p.edges);setHistory(h=>h.slice(0,-1));},[history,nodes,edges]);
  const redo=useCallback(()=>{if(!future.length) return;const n=future[0];setHistory(h=>[...h,{nodes,edges}]);setNodes(n.nodes);setEdges(n.edges);setFuture(f=>f.slice(1));},[future,nodes,edges]);

  useEffect(()=>{
    const h=(e: any)=>{
      if(e.key==="Escape"){setConnectMode(false);setConnectSource(null);setSelectedNode(null);setSelectedEdge(null);setFocusNodeId(null);setShortestPath(null);}
      if((e.ctrlKey||e.metaKey)&&e.key==="z"&&!e.shiftKey){e.preventDefault();undo();}
      if((e.ctrlKey||e.metaKey)&&(e.key==="y"||(e.shiftKey&&e.key==="z"))){e.preventDefault();redo();}
      const tag=e.target.tagName;
      if(["INPUT","TEXTAREA","SELECT"].includes(tag)) return;
      if(e.key==="a"&&!e.ctrlKey&&!e.metaKey) setShowAddNode(true);
      if(e.key==="c"&&!e.ctrlKey&&!e.metaKey) setConnectMode(m=>!m);
      if(e.key==="f"&&!e.ctrlKey&&!e.metaKey) setShowLabels(m=>!m);
      if(e.key==="t"&&!e.ctrlKey&&!e.metaKey) setShowTimeline(m=>!m);
      if(e.key==="i"&&!e.ctrlKey&&!e.metaKey) setShowImportExport(m=>!m);
    };
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[undo,redo]);

  const handleLayoutChange=useCallback((type: string)=>{
    setLayout(type);
    let nn;
    if(type==="force") nn=applyForceLayout(nodes,edges);
    else if(type==="hierarchical") nn=applyHierarchicalLayout(nodes,edges);
    else if(type==="circular") nn=applyCircularLayout(nodes);
    else if(type==="target") nn=applyTargetCentricLayout(nodes,edges,selectedNode || nodes[0]?.id);
    else nn=applyGridLayout(nodes);
    setNodes(nn);
  },[nodes,edges,selectedNode]);

  const handleAddNode=useCallback((data: any)=>{
    if (!activeCaseId) {
      alert("Please select or create a case before adding nodes to the graph.");
      return;
    }
    pushHistory();
    const pos=addNodePos||{x:450,y:320};
    const newNode = {...data,x:pos.x,y:pos.y};
    setNodes(ns=>[...ns,newNode]);
    setAddNodePos(null);
    addEntity({
      id: newNode.id,
      caseId: activeCaseId!,
      type: (newNode.type || 'GENERIC').toUpperCase() as any,
      name: newNode.label,
      notes: newNode.notes,
      x: newNode.x,
      y: newNode.y,
      confidence: newNode.confidence,
      source: newNode.source,
      isVerified: newNode.isVerified,
      isSuspicious: newNode.isSuspicious,
      avatar: newNode.avatar,
      metadata: newNode.properties
    });
  },[pushHistory,addNodePos,addEntity,activeCaseId]);

  const handleRunTransform = useCallback(async (nodeId: string, transformId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !activeCaseId) return;

    // Find transform to see if it has a tool category
    const transform = Object.values(TRANSFORMS).flat().find(t => t.id === transformId);
    
    if (transform?.toolCategory) {
      setMaltegoTools({ nodeId, transformId, category: transform.toolCategory });
      return;
    }

    setRunningTransformId(nodeId);
    try {
      const result = await runTransform(node, transformId);
      
      // Add new nodes
      for (const n of result.nodes) {
        await addEntity({
          id: n.id,
          type: n.type.toUpperCase() as any,
          name: n.label,
          notes: n.notes || "",
          x: node.x + (Math.random() - 0.5) * 200,
          y: node.y + (Math.random() - 0.5) * 200,
          confidence: 0.8,
          source: "ai_transform",
          isVerified: false,
          isSuspicious: false,
          avatar: null,
          metadata: n.properties || {},
          caseId: activeCaseId
        });
      }

      // Add new edges
      for (const e of result.edges) {
        await addRelation({
          id: generateId(),
          source: e.source,
          target: e.target,
          type: e.label,
          label: e.label.toUpperCase().replace(/_/g, " "),
          strength: e.strength || 5,
          notes: "Generated by AI Transform",
          date: new Date().toISOString().split('T')[0],
          caseId: activeCaseId
        });
      }
    } catch (error) {
      console.error("Transform failed:", error);
      alert("Error al ejecutar el transform. Revisa la consola.");
    } finally {
      setRunningTransformId(null);
    }
  }, [nodes, activeCaseId, addEntity, addRelation]);

  const handleNodeUpdate=useCallback((id: string,data: any)=>{
    setNodes(ns=>ns.map(n=>n.id===id?{...n,...data,properties:data.properties!==undefined?data.properties:n.properties}:n));
    updateEntity(id, {
      name: data.label,
      notes: data.notes,
      confidence: data.confidence,
      source: data.source,
      isVerified: data.isVerified,
      isSuspicious: data.isSuspicious,
      avatar: data.avatar,
      metadata: data.properties
    });
  },[updateEntity]);

  const handleNodeDelete=useCallback((id: string)=>{
    pushHistory();
    setNodes(ns=>ns.filter(n=>n.id!==id));
    setEdges(es=>es.filter(e=>e.source!==id&&e.target!==id));
    setSelectedNode(null);
    setFocusNodeId(f=>f===id?null:f);
    removeEntity(id);
  },[pushHistory,removeEntity]);

  const handleDragNode=useCallback((id: string,x: number,y: number)=>{
    setNodes(ns=>ns.map(n=>n.id===id?{...n,x,y}:n));
    updateEntity(id, { x, y });
  },[updateEntity]);

  const handleEdgeUpdate=useCallback((id: string,data: any)=>{
    setEdges(es=>es.map(e=>e.id===id?{...e,...data}:e));
    updateRelation(id, data);
  },[updateRelation]);

  const handleEdgeDelete=useCallback((id: string)=>{
    pushHistory();
    setEdges(es=>es.filter(e=>e.id!==id));
    setSelectedEdge(null);
    removeRelation(id);
  },[pushHistory,removeRelation]);
  const handleAddEdge=useCallback((data: any)=>{
    if (!activeCaseId) {
      alert("Please select or create a case before adding relationships to the graph.");
      return;
    }
    pushHistory();
    setEdges(es=>[...es,data]);
    setEdgeModal(null);
    addRelation({
      id: data.id,
      caseId: activeCaseId!,
      source: data.source,
      target: data.target,
      type: data.type,
      label: data.label,
      strength: data.strength,
      date: data.date
    });
  },[pushHistory,addRelation,activeCaseId]);
  const handleSelectNode=useCallback((id: string)=>{
    if(connectMode){if(!connectSource){setConnectSource(id);}else if(connectSource!==id){setEdgeModal({source:connectSource,target:id});setConnectMode(false);setConnectSource(null);}return;}
    setSelectedNode(p=>p===id?null:id);setSelectedEdge(null);
  },[connectMode,connectSource]);
  const handleSetConnectSource=useCallback((targetId: string|null,sourceId: string|null)=>{
    if(sourceId===null&&targetId===null){setConnectMode(m=>!m);setConnectSource(null);return;}
    if(!sourceId){setConnectMode(true);setConnectSource(targetId);return;}
    setEdgeModal({source:sourceId,target:targetId});setConnectMode(false);setConnectSource(null);
  },[]);
  const handleFindPath=useCallback((fromId: string,toId: string)=>{setShortestPath(findShortestPath(fromId,toId,edges)||[]);},[edges]);
  const handleFocusNode=useCallback((id: string)=>{setFocusNodeId(f=>f===id?null:id);},[]);
  const handleFilterType=useCallback((t: string|null)=>{if(t===null){setFilterTypes([]);return;}setFilterTypes(fs=>fs.includes(t)?fs.filter(f=>f!==t):[...fs,t]);},[]);
  const handleSaveSnapshot=useCallback((name: string)=>{setSnapshots(ss=>[...ss,{id:generateId(),name,timestamp:new Date().toISOString().replace("T"," ").slice(0,16),nodes:JSON.parse(JSON.stringify(nodes)),edges:JSON.parse(JSON.stringify(edges))}]);},[nodes,edges]);
  const handleRestoreSnapshot=useCallback(async (snap: any)=>{
    if (!activeCaseId) return;
    pushHistory();
    await clearCaseData(activeCaseId);
    
    // Add nodes to store
    for (const n of snap.nodes) {
      await addEntity({
        id: n.id,
        type: (n.type || 'GENERIC').toUpperCase() as any,
        name: n.label,
        notes: n.notes,
        x: n.x,
        y: n.y,
        confidence: n.confidence,
        source: n.source,
        isVerified: n.isVerified,
        isSuspicious: n.isSuspicious,
        avatar: n.avatar,
        metadata: n.properties,
        caseId: activeCaseId
      });
    }
    
    // Add edges to store
    for (const e of snap.edges) {
      await addRelation({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        label: e.label,
        strength: e.strength,
        date: e.date,
        caseId: activeCaseId
      });
    }
    
    setNodes(JSON.parse(JSON.stringify(snap.nodes)));
    setEdges(JSON.parse(JSON.stringify(snap.edges)));
    setShowSnapshots(false);
  },[pushHistory, activeCaseId, clearCaseData, addEntity, addRelation]);
  const handleDeleteSnapshot=useCallback((id: string)=>{setSnapshots(ss=>ss.filter(s=>s.id!==id));},[]);

  // Phase 6 — import handler
  const handleImport=useCallback(async (data: any)=>{
    if (!activeCaseId) {
      alert("Please select a case before importing.");
      return;
    }
    pushHistory();
    const positioned=applyForceLayout(data.nodes.map((n: any)=>({...n,x:n.x||Math.random()*700+100,y:n.y||Math.random()*500+80})),data.edges);
    
    // Persist to store
    for (const n of positioned) {
      await addEntity({
        id: n.id,
        type: (n.type || 'GENERIC').toUpperCase() as any,
        name: n.label,
        notes: n.notes,
        x: n.x,
        y: n.y,
        confidence: n.confidence || 0.8,
        source: n.source || 'import',
        isVerified: n.isVerified || false,
        isSuspicious: n.isSuspicious || false,
        avatar: n.avatar || null,
        metadata: n.properties || {},
        caseId: activeCaseId
      });
    }
    
    for (const e of data.edges) {
      await addRelation({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        label: e.label,
        strength: e.strength || 5,
        date: e.date || '',
        caseId: activeCaseId
      });
    }

    setNodes(positioned);
    setEdges(data.edges);
    setSelectedNode(null);setSelectedEdge(null);setFocusNodeId(null);setShortestPath(null);
  },[pushHistory, activeCaseId, addEntity, addRelation]);

  const selectedNodeData=nodes.find(n=>n.id===selectedNode);
  const selectedEdgeData=edges.find(e=>e.id===selectedEdge);
  const timelineActive=showTimeline&&timelineBounds;

  return (
    <div style={{width:"100%",height:"100vh",background:"#0A0A0A",display:"flex",flexDirection:"column",fontFamily:"'Courier New',monospace",overflow:"hidden"}}>
      <TopBar
        nodes={nodes} edges={edges} layout={layout} onLayoutChange={handleLayoutChange}
        minStrength={minStrength} onMinStrengthChange={setMinStrength}
        searchQuery={searchQuery} onSearchChange={setSearchQuery}
        filterTypes={filterTypes} onFilterType={handleFilterType}
        onAddNode={()=>setShowAddNode(true)}
        connectMode={connectMode} onToggleConnect={()=>{setConnectMode(m=>!m);setConnectSource(null);}}
        showLabels={showLabels} onToggleLabels={()=>setShowLabels(m=>!m)}
        viewMode={viewMode} onViewModeChange={setViewMode}
        focusNodeId={focusNodeId} onClearFocus={()=>setFocusNodeId(null)}
        shortestPath={shortestPath} onClearPath={()=>setShortestPath(null)}
        showInsights={showInsights} onToggleInsights={()=>setShowInsights(m=>!m)}
        showTimeline={showTimeline} onToggleTimeline={()=>{setShowTimeline(m=>!m);setIsPlaying(false);}}
        onOpenSnapshots={()=>setShowSnapshots(true)}
        onOpenImportExport={()=>setShowImportExport(true)}
        showAvatars={showAvatars} onToggleAvatars={()=>setShowAvatars(m=>!m)}
        showClusterBubbles={showClusterBubbles} onToggleClusterBubbles={()=>setShowClusterBubbles(m=>!m)}
        onClose={onClose}
      />

      {connectMode&&(
        <div style={{background:"#0D1A0D",borderBottom:"1px solid #1A3A1A",padding:"3px 14px",fontSize:"8px",color:"#10B981",letterSpacing:"0.08em",flexShrink:0}}>
          {connectSource?`SOURCE: ${nodes.find(n=>n.id===connectSource)?.label} — click target entity | ESC to cancel`:"CONNECT MODE — click source entity | ESC to cancel"}
        </div>
      )}
      {shortestPath!==null&&(
        <div style={{background:"#0A1A0A",borderBottom:"1px solid #1A3A1A",padding:"3px 14px",fontSize:"8px",color:"#10B981",letterSpacing:"0.08em",flexShrink:0}}>
          {shortestPath.length===0?"No path found.":`PATH (${shortestPath.length} nodes): ${shortestPath.map(id=>nodes.find(n=>n.id===id)?.label||id).join(" → ")}`}
        </div>
      )}

      <div style={{flex:1,display:"flex",overflow:"hidden",position:"relative"}}>
        <GraphCanvas
          nodes={nodes} edges={edges}
          selectedNode={selectedNode} selectedEdge={selectedEdge}
          connectMode={connectMode} connectSource={connectSource}
          searchQuery={searchQuery} filterTypes={filterTypes}
          minStrength={minStrength}
          focusNodeId={focusNodeId} shortestPath={shortestPath}
          showLabels={showLabels} viewMode={viewMode}
          centrality={centrality} communities={communities}
          timelineDate={timelineActive?timelineDate:null}
          showAvatars={showAvatars}
          showClusterBubbles={showClusterBubbles}
          runningTransformId={runningTransformId}
          collapsedClusters={{}}
          onSelectNode={handleSelectNode}
          onSelectEdge={(id: string)=>{setSelectedEdge(id);setSelectedNode(null);}}
          onSetConnectSource={handleSetConnectSource}
          onDragNode={handleDragNode}
          onDoubleClickCanvas={(x: number,y: number)=>{setAddNodePos({x,y});setShowAddNode(true);}}
          onRunTransform={handleRunTransform}
          svgRef={svgRef}
        />

        {maltegoTools && (
          <MaltegoSidebar 
            {...maltegoTools} 
            nodes={nodes} 
            onClose={() => setMaltegoTools(null)} 
          />
        )}

        {showInsights&&(
          <InsightsPanel insights={insights} nodes={nodes} onClose={()=>setShowInsights(false)}
            onSelectNode={handleSelectNode} riskScores={riskScores} centrality={centrality}/>
        )}

        {selectedNodeData&&!selectedEdgeData&&(
          <NodeDetailPanel
            key={selectedNodeData.id}
            node={selectedNodeData} edges={edges} nodes={nodes}
            onClose={()=>setSelectedNode(null)}
            onUpdate={handleNodeUpdate} onDelete={handleNodeDelete}
            onSelectNode={handleSelectNode} centrality={centrality}
            riskScore={riskScores[selectedNodeData.id]||"unknown"}
            communityId={communities[selectedNodeData.id]}
            onFocusNode={handleFocusNode} onFindPath={handleFindPath}
          />
        )}
        {selectedEdgeData&&!selectedNodeData&&(
          <EdgeDetailPanel key={selectedEdgeData.id} edge={selectedEdgeData} nodes={nodes}
            onClose={()=>setSelectedEdge(null)}
            onUpdate={handleEdgeUpdate} onDelete={handleEdgeDelete}/>
        )}
      </div>

      {showTimeline&&timelineBounds&&(
        <TimelineSlider edges={edges} timelineDate={timelineDate} onDateChange={setTimelineDate}
          isPlaying={isPlaying} onTogglePlay={()=>setIsPlaying(m=>!m)}
          onReset={()=>{setTimelineDate(timelineBounds.min);setIsPlaying(false);}}/>
      )}
      {showTimeline&&!timelineBounds&&(
        <div style={{background:"#0D0D0D",borderTop:"1px solid #222",padding:"6px 14px",fontSize:"8px",color:"#505050",fontFamily:"monospace",flexShrink:0}}>
          ⏱ TIMELINE — No edge dates found. Click a relation to edit and set a date.
        </div>
      )}

      {/* Legend */}
      <div style={{height:"26px",background:"#0D0D0D",borderTop:"1px solid #1A1A1A",display:"flex",alignItems:"center",padding:"0 10px",gap:"10px",overflowX:"auto",flexShrink:0}}>
        {viewMode==="type"&&Object.entries(NODE_COLORS).slice(0,8).map(([t,c])=>(
          <div key={t} style={{display:"flex",alignItems:"center",gap:"3px",flexShrink:0}}>
            <div style={{width:"5px",height:"5px",borderRadius:"50%",background:c}}/>
            <span style={{fontSize:"7px",color:"#505050",letterSpacing:"0.04em"}}>{t.toUpperCase()}</span>
          </div>
        ))}
        {viewMode==="heatmap"&&[["HIGH","#EF4444"],["MED","#F59E0B"],["LOW","#10B981"],["?","#505050"]].map(([l,c]: any)=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:"3px",flexShrink:0}}>
            <div style={{width:"5px",height:"5px",borderRadius:"50%",background:c}}/>
            <span style={{fontSize:"7px",color:"#505050",letterSpacing:"0.04em"}}>{l} RISK</span>
          </div>
        ))}
        {viewMode==="cluster"&&[...new Set(Object.values(communities) as number[])].map(ci=>(
          <div key={ci} style={{display:"flex",alignItems:"center",gap:"3px",flexShrink:0}}>
            <div style={{width:"5px",height:"5px",borderRadius:"50%",background:CLUSTER_COLORS[ci%8]}}/>
            <span style={{fontSize:"7px",color:"#505050",letterSpacing:"0.04em"}}>CLUSTER {ci+1}</span>
          </div>
        ))}
        <div style={{marginLeft:"auto",fontSize:"7px",color:"#222",letterSpacing:"0.03em",flexShrink:0}}>
          A:ADD · C:CONNECT · F:LABELS · T:TIMELINE · I:IMPORT/EXPORT · ESC:CANCEL · CTRL+Z:UNDO
        </div>
      </div>

      {showAddNode&&<AddNodeModal onAdd={handleAddNode} onClose={()=>{setShowAddNode(false);setAddNodePos(null);}}/>}
      {edgeModal&&<AddEdgeModal sourceId={edgeModal.source} targetId={edgeModal.target} nodes={nodes} onAdd={handleAddEdge} onClose={()=>setEdgeModal(null)}/>}
      {showSnapshots&&<SnapshotPanel snapshots={snapshots} nodes={nodes} edges={edges} onSave={handleSaveSnapshot} onRestore={handleRestoreSnapshot} onDelete={handleDeleteSnapshot} onClose={()=>setShowSnapshots(false)}/>}
      {showImportExport&&<ImportExportModal nodes={nodes} edges={edges} svgRef={svgRef} onImport={handleImport} onClose={()=>setShowImportExport(false)}/>}
    </div>
  );
}
