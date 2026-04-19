"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAbsterStore } from "../store/absterStore";

// ════════════════════════════════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════════════════════════════════
const ADJS  = ["GHOST","SHADOW","IRON","SILENT","CRIMSON","BLACK","SILVER","DARK","PHANTOM","RAVEN","STEEL","VOID","APEX","STORM","NOVA","ECHO","VIPER","FROST","ONYX","CIPHER"];
const NOUNS = ["WOLF","OWL","HAWK","BEAR","FOX","EAGLE","SHARK","LION","COBRA","TIGER","HYDRA","SPECTRE","VORTEX","NEXUS","ATLAS","HELIX","SIGMA","OMEGA","PRISM","LYNX"];
const uid   = () => Math.random().toString(36).slice(2,11);
const cname = () => `${ADJS[Math.floor(Math.random()*ADJS.length)]}-${NOUNS[Math.floor(Math.random()*NOUNS.length)]}-${Math.floor(Math.random()*9000)+1000}`;
const relTime = (d) => { 
  if (!d) return "--";
  const s=Math.floor((Date.now()-new Date(d).getTime())/1000); 
  if(s<60)return"just now"; 
  if(s<3600)return`${Math.floor(s/60)}m ago`; 
  if(s<86400)return`${Math.floor(s/3600)}h ago`; 
  return`${Math.floor(s/86400)}d ago`; 
};
const fmtDate = (d) => new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
const daysSince = (d) => Math.floor((Date.now()-new Date(d).getTime())/86400000);

// ════════════════════════════════════════════════════════════════
//  RISK SCORE ENGINE
// ════════════════════════════════════════════════════════════════
const calcRisk = (c, all) => {
  let s = 0;
  s += {critical:35,high:22,medium:12,low:4}[c.priority]??0;
  s += {top_secret:20,secret:14,confidential:8,public:2}[c.classification]??0;
  s += Math.min((c.stats.entityCount+c.stats.locationCount+c.stats.eventCount)*0.4,15);
  if(c.status==="active"){ const d=daysSince(c.updatedAt); if(d>7)s+=Math.min(d*0.5,15); }
  if(c.status==="active"&&daysSince(c.createdAt)<3)s+=5;
  s+=Math.min((all.filter(x=>x.id!==c.id&&(x.linkedCases||[]).includes(c.id))).length*3,10);
  s+=Math.min((c.hypotheses||[]).filter(h=>h.status==="active").length*2,5);
  return Math.min(Math.round(s),100);
};
const riskMeta = (sc) => { if(sc>=75)return{label:"CRITICAL RISK",color:"#DC2626"}; if(sc>=55)return{label:"HIGH RISK",color:"#EA580C"}; if(sc>=35)return{label:"MODERATE RISK",color:"#CA8A04"}; return{label:"LOW RISK",color:"#16A34A"}; };

// ════════════════════════════════════════════════════════════════
//  TEMPLATES
// ════════════════════════════════════════════════════════════════
const TEMPLATES = [
  { id:"financial_fraud",  label:"Financial Fraud",          icon:"◈", color:"#CA8A04", description:"Money laundering, tax evasion, shell companies",
    defaults:{priority:"high",classification:"secret",tags:["fraud","financial","aml"]},
    checklist:["Identify primary subjects and corporate entities","Map ownership structures and beneficial owners","Trace financial flows across jurisdictions","Cross-reference with sanctions lists (OFAC, UN, EU)","Identify intermediary accounts and shell vehicles","Document correspondent banking relationships","Establish timeline of suspicious transactions","Compile evidence package for legal referral"] },
  { id:"person_of_interest",label:"Person of Interest",      icon:"⬡", color:"#3B82F6", description:"Individual profiling and background investigation",
    defaults:{priority:"medium",classification:"confidential",tags:["profile","individual","poi"]},
    checklist:["Establish verified identity and aliases","Map digital footprint (social media, forums, dark web)","Identify professional history and affiliations","Document known associates and relationships","Geolocate known addresses and travel patterns","Cross-reference public records and court filings","Assess threat level and behavioral indicators","Compile comprehensive dossier"] },
  { id:"cyber_incident",    label:"Cyber Incident",           icon:"⚙", color:"#DC2626", description:"Ransomware, data breach, infrastructure attack",
    defaults:{priority:"critical",classification:"secret",tags:["cyber","incident","ioc"]},
    checklist:["Preserve and document initial indicators of compromise","Identify attacker TTPs (MITRE ATT&CK mapping)","Trace C2 infrastructure and domains","Map affected systems and lateral movement","Attribute to known threat actor groups","Collect and hash all digital evidence","Identify exfiltration vectors and data scope","Prepare technical incident report"] },
  { id:"disinformation",    label:"Disinformation Network",   icon:"◷", color:"#8B5CF6", description:"Coordinated inauthentic behavior, influence ops",
    defaults:{priority:"high",classification:"confidential",tags:["disinfo","sockpuppet","influence-op"]},
    checklist:["Identify seed accounts and initial content","Map amplification network and coordination patterns","Analyze linguistic and behavioral fingerprints","Trace infrastructure (domains, hosting, VPNs)","Identify funding sources and overlapping narratives","Document platform manipulation techniques","Archive all related content and metadata","Draft comprehensive impact assessment"] }
];

// ════════════════════════════════════════════════════════════════
//  DEMO DATA
// ════════════════════════════════════════════════════════════════
const DEMO = [
  { id:"1", codeName:"GHOST-WOLF-7378", title:"Operation Red Ghost",
    description:"Investigation into asset laundering network with connections in Cyprus, Russia, and the UK. Primary target: Viktor Kozlov.",
    priority:"critical", status:"active", classification:"secret",
    createdAt:new Date("2024-01-15T14:30:00"), updatedAt:new Date("2024-01-20T16:45:00"),
    leadInvestigator:"Analyst Alpha", team:["Analyst Alpha","Analyst Beta","Field Op 1"],
    stats:{entityCount:12,locationCount:5,eventCount:8,toolResultsCount:23,evidenceCount:15},
    tags:["laundering","cyprus","russia","crypto","corporate"], findings:"", linkedCases:["3","7"],
    template:"financial_fraud", checklist:[false,true,false,false,false,false,false,false],
    hypotheses:[
      {id:"h1",title:"Kozlov is beneficial owner of offshore vehicle in BVI",status:"active",confidence:72,evidence:"Shell corp registry + 3 SWIFT traces",createdAt:new Date("2024-01-16T10:00:00")},
      {id:"h2",title:"Funds are being routed via non-KYC crypto exchange in Eastern Europe",status:"active",confidence:55,evidence:"Wallet clustering analysis",createdAt:new Date("2024-01-18T09:00:00")},
      {id:"h3",title:"Connection with Cyprus criminal network confirmed",status:"confirmed",confidence:91,evidence:"Intercept + corporate filings match",createdAt:new Date("2024-01-19T14:00:00")},
    ],
    activityLog:[
      {id:"a1",timestamp:new Date("2024-01-15T14:30:00"),type:"created",description:"Case created",user:"Analyst Alpha"},
      {id:"a2",timestamp:new Date("2024-01-16T09:45:00"),type:"entity_added",description:"Entity added: Viktor Kozlov (Person)",user:"Analyst Alpha"},
      {id:"a3",timestamp:new Date("2024-01-16T11:20:00"),type:"tool_executed",description:"Tool: Email Investigator on vkozlov@...",user:"Analyst Beta"},
      {id:"a4",timestamp:new Date("2024-01-17T16:00:00"),type:"location_added",description:"Location: Limassol, Cyprus",user:"Field Op 1"},
      {id:"a5",timestamp:new Date("2024-01-20T16:45:00"),type:"note_added",description:"Suspicious meeting near port documented",user:"Analyst Alpha"},
    ],
    settings:{autoSave:true,notifications:true,shareWithTeam:true} },
  { id:"2", codeName:"SILENT-OWL-4521", title:"Project Avalon",
    description:"Internal investigation regarding data leak. Closed with confirmed findings.",
    priority:"high", status:"closed", classification:"confidential",
    createdAt:new Date("2023-11-10T09:00:00"), updatedAt:new Date("2024-01-18T11:20:00"), closedAt:new Date("2024-01-18T11:20:00"),
    leadInvestigator:"Analyst Beta", team:["Analyst Beta","Legal Counsel"],
    stats:{entityCount:8,locationCount:3,eventCount:12,toolResultsCount:45,evidenceCount:8},
    findings:"Leak by insider confirmed. Employee identified and terminated. Security measures reinforced.",
    tags:["insider","leak","closed"], linkedCases:[],
    template:"person_of_interest", checklist:[true,true,true,true,false,true,true,false],
    hypotheses:[{id:"h4",title:"Leak was deliberate and financially motivated",status:"confirmed",confidence:96,evidence:"Communication intercepts + financial audit",createdAt:new Date("2023-12-01T10:00:00")}],
    activityLog:[
      {id:"b1",timestamp:new Date("2023-11-10T09:00:00"),type:"created",description:"Case created",user:"Analyst Beta"},
      {id:"b2",timestamp:new Date("2024-01-18T11:20:00"),type:"status_changed",description:"Case closed with findings",user:"Analyst Beta"},
    ],
    settings:{autoSave:true,notifications:false,shareWithTeam:true} },
  { id:"3", codeName:"PHANTOM-HAWK-2891", title:"Shadow Network",
    description:"Active investigation of coordinated disinformation network. Multiple sockpuppet accounts identified.",
    priority:"high", status:"active", classification:"confidential",
    createdAt:new Date("2024-01-10T08:00:00"), updatedAt:new Date("2024-01-21T10:00:00"),
    leadInvestigator:"Analyst Gamma", team:["Analyst Gamma","Analyst Alpha"],
    stats:{entityCount:34,locationCount:9,eventCount:21,toolResultsCount:67,evidenceCount:42},
    tags:["disinfo","sockpuppet","social-media"], findings:"", linkedCases:["1"],
    template:"disinformation", checklist:[true,true,false,false,false,false,false,false],
    hypotheses:[
      {id:"h5",title:"Coordinated operation from state infrastructure",status:"active",confidence:63,evidence:"Infrastructure clustering + timing patterns",createdAt:new Date("2024-01-12T09:00:00")},
      {id:"h6",title:"Main narrative: electoral destabilization",status:"active",confidence:78,evidence:"Content analysis of 1,200 posts",createdAt:new Date("2024-01-15T11:00:00")},
    ],
    activityLog:[
      {id:"c1",timestamp:new Date("2024-01-10T08:00:00"),type:"created",description:"Case created",user:"Analyst Gamma"},
      {id:"c2",timestamp:new Date("2024-01-21T10:00:00"),type:"entity_added",description:"34 entities mapped in coordination network",user:"Analyst Alpha"},
    ],
    settings:{autoSave:true,notifications:true,shareWithTeam:false} },
  { id:"4", codeName:"IRON-BEAR-5563", title:"Operation Cerberus",
    description:"Tracking crypto assets linked to ransomware. Focus on wallets in offshore exchanges.",
    priority:"medium", status:"active", classification:"secret",
    createdAt:new Date("2024-01-05T13:00:00"), updatedAt:new Date("2024-01-09T15:30:00"),
    leadInvestigator:"Analyst Delta", team:["Analyst Delta"],
    stats:{entityCount:7,locationCount:2,eventCount:5,toolResultsCount:18,evidenceCount:6},
    tags:["crypto","ransomware","offshore"], findings:"", linkedCases:[],
    template:"cyber_incident", checklist:[true,false,false,false,false,false,false,false],
    hypotheses:[{id:"h7",title:"RansomX group operates from Belarus",status:"active",confidence:41,evidence:"IP geolocation + language artifacts",createdAt:new Date("2024-01-07T14:00:00")}],
    activityLog:[{id:"d1",timestamp:new Date("2024-01-05T13:00:00"),type:"created",description:"Case created",user:"Analyst Delta"}],
    settings:{autoSave:true,notifications:true,shareWithTeam:false} },
  { id:"5", codeName:"RAVEN-COBRA-1122", title:"Project Nightfall",
    description:"Analysis of shell company in multiple jurisdictions. Possible tax evasion structure.",
    priority:"medium", status:"archived", classification:"confidential",
    createdAt:new Date("2023-09-20T10:00:00"), updatedAt:new Date("2023-12-15T09:00:00"),
    leadInvestigator:"Analyst Alpha", team:["Analyst Alpha","Financial Analyst"],
    stats:{entityCount:15,locationCount:7,eventCount:10,toolResultsCount:32,evidenceCount:20},
    findings:"Structure identified. Pending legal action.",
    tags:["shell-company","fiscal","multi-jurisdiction"], linkedCases:[],
    template:"financial_fraud", checklist:[true,true,true,true,true,true,false,false],
    hypotheses:[], activityLog:[],
    settings:{autoSave:false,notifications:false,shareWithTeam:true} },
  { id:"6", codeName:"VOID-TIGER-9034", title:"Target Echo",
    description:"Profile of high-profile individual. Preliminary investigation of corporate links.",
    priority:"low", status:"active", classification:"public",
    createdAt:new Date("2024-01-18T11:00:00"), updatedAt:new Date("2024-01-22T08:00:00"),
    leadInvestigator:"Analyst Beta", team:["Analyst Beta"],
    stats:{entityCount:4,locationCount:1,eventCount:2,toolResultsCount:5,evidenceCount:3},
    tags:["profile","corporate"], findings:"", linkedCases:[],
    template:"person_of_interest", checklist:[true,false,false,false,false,false,false,false],
    hypotheses:[],
    activityLog:[{id:"f1",timestamp:new Date("2024-01-18T11:00:00"),type:"created",description:"Case created",user:"Analyst Beta"}],
    settings:{autoSave:true,notifications:false,shareWithTeam:false} },
  { id:"7", codeName:"STEEL-EAGLE-3377", title:"Hydra Protocol",
    description:"Classified information trafficking network. Multiple exfiltration vectors identified.",
    priority:"critical", status:"active", classification:"top_secret",
    createdAt:new Date("2024-01-22T07:00:00"), updatedAt:new Date("2024-01-22T18:00:00"),
    leadInvestigator:"Director Omega", team:["Director Omega","Analyst Alpha","Analyst Gamma","Field Op 2"],
    stats:{entityCount:22,locationCount:11,eventCount:16,toolResultsCount:88,evidenceCount:37},
    tags:["classified","exfiltration","urgent"], findings:"", linkedCases:["1"],
    template:"cyber_incident", checklist:[true,true,false,false,false,false,false,false],
    hypotheses:[
      {id:"h8",title:"Exfiltration via supply chain compromise of tier-2 vendor",status:"active",confidence:67,evidence:"Log correlation + vendor access audit",createdAt:new Date("2024-01-22T12:00:00")},
      {id:"h9",title:"Insider with privileged access implicated",status:"active",confidence:50,evidence:"Anomalous access patterns pre-breach",createdAt:new Date("2024-01-22T15:00:00")},
    ],
    activityLog:[
      {id:"g1",timestamp:new Date("2024-01-22T07:00:00"),type:"created",description:"Case created — URGENT",user:"Director Omega"},
      {id:"g2",timestamp:new Date("2024-01-22T18:00:00"),type:"entity_added",description:"22 entities identified in exfil network",user:"Analyst Alpha"},
    ],
    settings:{autoSave:true,notifications:true,shareWithTeam:false} },
];

// ════════════════════════════════════════════════════════════════
//  DESIGN TOKENS
// ════════════════════════════════════════════════════════════════
const PC = { critical:{label:"CRITICAL",color:"#DC2626",bg:"rgba(220,38,38,0.1)",  border:"rgba(220,38,38,0.3)"},
             high:    {label:"HIGH",    color:"#EA580C",bg:"rgba(234,88,12,0.1)",  border:"rgba(234,88,12,0.3)"},
             medium:  {label:"MEDIUM",  color:"#CA8A04",bg:"rgba(202,138,4,0.1)",  border:"rgba(202,138,4,0.3)"},
             low:     {label:"LOW",     color:"#16A34A",bg:"rgba(22,163,74,0.1)",  border:"rgba(22,163,74,0.3)"} };
const SC = { active:  {label:"ACTIVE",  color:"#10B981",bg:"rgba(16,185,129,0.1)", border:"rgba(16,185,129,0.3)"},
             archived:{label:"ARCHIVED",color:"#6B7280",bg:"rgba(107,114,128,0.1)",border:"rgba(107,114,128,0.3)"},
             closed:  {label:"CLOSED",  color:"#4B5563",bg:"rgba(75,85,99,0.15)",  border:"rgba(75,85,99,0.4)"} };
const CC = { public:{label:"PUBLIC",color:"#3B82F6"}, confidential:{label:"CONFIDENTIAL",color:"#8B5CF6"},
             secret:{label:"SECRET",color:"#DC2626"}, top_secret:{label:"TOP SECRET",color:"#7F1D1D"} };
const HYPO_S = { active:{label:"ACTIVE",color:"#CA8A04"}, confirmed:{label:"CONFIRMED",color:"#10B981"}, discarded:{label:"DISCARDED",color:"#4B5563"} };
const ACT_ICONS = { created:"◈",updated:"✎",entity_added:"⬡",location_added:"◉",event_added:"◷",tool_executed:"⚙",note_added:"✦",status_changed:"⬕",hypothesis_added:"◆",link_added:"⇔",checklist_updated:"☑" };

// ════════════════════════════════════════════════════════════════
//  PRIMITIVES
// ════════════════════════════════════════════════════════════════
const INPUT = { width:"100%",background:"#0A0A0A",border:"1px solid #222",borderRadius:4,color:"#E5E5E5",padding:"9px 12px",fontSize:13,fontFamily:"'Courier New',monospace",outline:"none",boxSizing:"border-box" as const };
const BTN = (bg,border,color,extra={}) => ({background:bg,border:`1px solid ${border}`,color,padding:"8px 16px",borderRadius:4,cursor:"pointer",fontSize:11,fontFamily:"'Courier New',monospace",letterSpacing:1,fontWeight:700,...extra});

// Button definitions used in JSX
const btnPri = { background: "#E5E5E5", border: "none", color: "#0A0A0A", padding: "8px 18px", borderRadius: 4, cursor: "pointer", fontSize: 11, fontFamily: "'Courier New',monospace", letterSpacing: 1, fontWeight: 700, whiteSpace: "nowrap" };
const btnSec = { background: "none", border: "none", color: "#505050", cursor: "pointer", fontSize: 11, fontFamily: "'Courier New',monospace", letterSpacing: 2 };

const Badge = ({cfg,sm}: any) => <span style={{display:"inline-flex",alignItems:"center",padding:sm?"1px 6px":"2px 8px",borderRadius:3,border:`1px solid ${cfg.border||cfg.color+"44"}`,background:cfg.bg||cfg.color+"15",color:cfg.color,fontSize:sm?9:10,fontFamily:"'Courier New',monospace",fontWeight:700,letterSpacing:1,whiteSpace:"nowrap"}}>{cfg.label}</span>;

const SLabel = ({children,right}: any) => <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:10,color:"#505050",fontFamily:"'Courier New',monospace",letterSpacing:2,fontWeight:700,marginBottom:12,paddingBottom:8,borderBottom:"1px solid #1A1A1A"}}><span>{children}</span>{right}</div>;

const IRow = ({label,value}: any) => <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:12}}><span style={{color:"#505050",fontFamily:"'Courier New',monospace"}}>{label}</span><span style={{color:"#A0A0A0"}}>{value}</span></div>;

const Field = ({label,value,onChange,ph,multi,rows=3}: any) => (
  <div style={{marginBottom:16}}>
    <div style={{fontSize:10,color:"#505050",fontFamily:"'Courier New',monospace",letterSpacing:2,marginBottom:6,fontWeight:700}}>{label}</div>
    {multi ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={ph} rows={rows} style={{...INPUT,resize:"vertical",minHeight:72}}/> : <input value={value} onChange={e=>onChange(e.target.value)} placeholder={ph} style={INPUT}/>}
  </div>
);

const SelField = ({label,value,onChange,opts}: any) => (
  <div style={{marginBottom:16}}>
    <div style={{fontSize:10,color:"#505050",fontFamily:"'Courier New',monospace",letterSpacing:2,marginBottom:6,fontWeight:700}}>{label}</div>
    <select value={value} onChange={e=>onChange(e.target.value)} style={INPUT}>{opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
  </div>
);

// ════════════════════════════════════════════════════════════════
//  RISK GAUGE
// ════════════════════════════════════════════════════════════════
const RiskGauge = ({score,sz=52}: any) => {
  const r=sz/2-5,cx=sz/2,cy=sz/2,circ=2*Math.PI*r,dash=(score/100)*circ,rl=riskMeta(score);
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <svg width={sz} height={sz} style={{flexShrink:0}}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1A1A1A" strokeWidth={6}/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={rl.color} strokeWidth={6} strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={circ/4} strokeLinecap="round" style={{transition:"stroke-dasharray 0.5s"}}/>
        <text x={cx} y={cy+4} textAnchor="middle" fill={rl.color} fontSize={sz<46?9:11} fontFamily="'Courier New',monospace" fontWeight="900">{score}</text>
      </svg>
      <div>
        <div style={{fontSize:9,color:rl.color,fontFamily:"'Courier New',monospace",letterSpacing:1,fontWeight:700}}>{rl.label}</div>
        <div style={{fontSize:9,color:"#404040",fontFamily:"'Courier New',monospace"}}>RISK INDEX</div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
//  AGE INDICATOR
// ════════════════════════════════════════════════════════════════
const AgeDot = ({c}: any) => {
  if(c.status!=="active")return null;
  const d=daysSince(c.updatedAt);
  if(d<3)return null;
  const col=d>14?"#DC2626":d>7?"#EA580C":"#CA8A04";
  return <span title={`No activity for ${d} days`} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:9,color:col,fontFamily:"'Courier New',monospace",padding:"1px 6px",borderRadius:3,border:`1px solid ${col}44`,background:`${col}12`}}><span style={{width:5,height:5,borderRadius:"50%",background:col,display:"inline-block"}}/>{d}D DORMANT</span>;
};

// ════════════════════════════════════════════════════════════════
//  CHARTS
// ════════════════════════════════════════════════════════════════
const Donut = ({data}: any) => {
  const total=data.reduce((s,d)=>s+d.value,0)||1;
  let off=0; const r=28,cx=35,cy=35,sw=10,circ=2*Math.PI*r;
  const segs=data.map(d=>{const dash=(d.value/total)*circ;const seg={...d,dash,off};off+=dash;return seg;});
  return <svg width="70" height="70"><circle cx={cx} cy={cy} r={r} fill="none" stroke="#1A1A1A" strokeWidth={sw}/>{segs.map((s,i)=><circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={sw} strokeDasharray={`${s.dash} ${circ-s.dash}`} strokeDashoffset={-s.off} transform={`rotate(-90 ${cx} ${cy})`}/>)}</svg>;
};

const Bars = ({data}: any) => {
  const max=Math.max(...data.map(d=>d.value),1);
  return <div style={{display:"flex",alignItems:"flex-end",gap:4,height:48}}>{data.map((d,i)=><div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}><div style={{width:"100%",background:d.color||"#333",height:`${(d.value/max)*44}px`,borderRadius:"2px 2px 0 0",minHeight:2,transition:"height 0.4s"}}/><div style={{fontSize:8,color:"#505050",fontFamily:"'Courier New',monospace",textAlign:"center"}}>{d.label}</div></div>)}</div>;
};

// ════════════════════════════════════════════════════════════════
//  TOAST
// ════════════════════════════════════════════════════════════════
const Toast = ({msg,onClose}: any) => {
  useEffect(()=>{const t=setTimeout(onClose,3200);return()=>clearTimeout(t);},[]);
  return <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:6,padding:"12px 18px",color:"#E5E5E5",fontSize:12,fontFamily:"'Courier New',monospace",boxShadow:"0 8px 32px rgba(0,0,0,0.6)",animation:"slideUp 0.2s ease",display:"flex",alignItems:"center",gap:10}}><span style={{color:"#10B981"}}>✦</span>{msg}<button onClick={onClose} style={{background:"none",border:"none",color:"#505050",cursor:"pointer",marginLeft:4}}>×</button></div>;
};

// ════════════════════════════════════════════════════════════════
//  CONFIRM
// ════════════════════════════════════════════════════════════════
const Confirm = ({msg,onOk,onCancel}: any) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{background:"#111",border:"1px solid #333",borderRadius:8,padding:28,width:380,boxShadow:"0 24px 64px rgba(0,0,0,0.8)"}}>
      <div style={{fontSize:13,color:"#A0A0A0",marginBottom:24,lineHeight:1.6}}>{msg}</div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button onClick={onCancel} style={BTN("#1A1A1A","#333","#A0A0A0")}>CANCEL</button>
        <button onClick={onOk} style={BTN("#DC2626","#DC2626","#fff")}>CONFIRM DELETE</button>
      </div>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════
//  SHORTCUTS HELP
// ════════════════════════════════════════════════════════════════
const ShortcutsHelp = ({onClose}: any) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{background:"#111",border:"1px solid #2A2A2A",borderRadius:8,padding:28,width:380,boxShadow:"0 24px 64px rgba(0,0,0,0.8)"}}>
      <div style={{fontFamily:"'Courier New',monospace",fontSize:12,letterSpacing:3,color:"#A0A0A0",fontWeight:700,marginBottom:20}}>KEYBOARD SHORTCUTS</div>
      {[["N","New case"],["/ or F","Focus search"],["B","Toggle bulk select"],["A","Toggle archived"],["G","Switch Grid / List"],["?","This help"],["Esc","Close panels"]].map(([k,l])=>(
        <div key={k} style={{display:"flex",alignItems:"center",gap:14,marginBottom:10}}>
          <kbd style={{background:"#1A1A1A",border:"1px solid #333",borderRadius:4,padding:"3px 10px",fontFamily:"'Courier New',monospace",fontSize:12,color:"#E5E5E5",minWidth:28,textAlign:"center"}}>{k}</kbd>
          <span style={{fontSize:12,color:"#A0A0A0"}}>{l}</span>
        </div>
      ))}
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:20}}>
        <button onClick={onClose} style={BTN("#1A1A1A","#333","#A0A0A0")}>CLOSE</button>
      </div>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════
//  TEMPLATE PICKER
// ════════════════════════════════════════════════════════════════
const TemplatePicker = ({onSelect,onSkip}: any) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{background:"#111",border:"1px solid #2A2A2A",borderRadius:10,width:"100%",maxWidth:640,boxShadow:"0 32px 80px rgba(0,0,0,0.9)"}}>
      <div style={{padding:"20px 24px",borderBottom:"1px solid #1A1A1A"}}>
        <div style={{fontFamily:"'Courier New',monospace",fontSize:12,letterSpacing:3,color:"#A0A0A0",fontWeight:700}}>SELECT INVESTIGATION TEMPLATE</div>
        <div style={{fontSize:12,color:"#505050",marginTop:4}}>Templates pre-configure checklist, tags and default settings</div>
      </div>
      <div style={{padding:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {TEMPLATES.map(t=>(
          <button key={t.id} onClick={()=>onSelect(t)} style={{background:"#0A0A0A",border:"1px solid #2A2A2A",borderRadius:6,padding:"14px 16px",cursor:"pointer",textAlign:"left",transition:"border-color 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=t.color}
            onMouseLeave={e=>e.currentTarget.style.borderColor="#2A2A2A"}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <span style={{fontSize:18,color:t.color}}>{t.icon}</span>
              <span style={{fontFamily:"'Courier New',monospace",fontSize:11,color:t.color,fontWeight:700,letterSpacing:1}}>{t.label.toUpperCase()}</span>
            </div>
            <div style={{fontSize:11,color:"#505050",lineHeight:1.4}}>{t.description}</div>
            <div style={{fontSize:9,color:"#404040",fontFamily:"'Courier New',monospace",marginTop:6}}>{t.checklist.length} INVESTIGATION STEPS</div>
          </button>
        ))}
      </div>
      <div style={{padding:"12px 24px",borderTop:"1px solid #1A1A1A",display:"flex",justifyContent:"flex-end"}}>
        <button onClick={onSkip} style={BTN("#1A1A1A","#333","#505050")}>SKIP — BLANK CASE</button>
      </div>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════
//  CREATE/EDIT MODAL
// ════════════════════════════════════════════════════════════════
const CaseModal = ({init,tpl,allCases,onSave,onClose}: any) => {
  const [f,setF]=useState({ title:init?.title||"", description:init?.description||"", priority:init?.priority||tpl?.defaults?.priority||"medium", classification:init?.classification||tpl?.defaults?.classification||"confidential", leadInvestigator:init?.leadInvestigator||"", tags:(init?.tags||tpl?.defaults?.tags||[]).join(", "), linkedCases:init?.linkedCases||[] });
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const toggleLink=(id)=>set("linkedCases",f.linkedCases.includes(id)?f.linkedCases.filter(x=>x!==id):[...f.linkedCases,id]);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#111",border:"1px solid #2A2A2A",borderRadius:8,width:"100%",maxWidth:540,boxShadow:"0 32px 80px rgba(0,0,0,0.9)",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{padding:"18px 24px",borderBottom:"1px solid #1A1A1A",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#111",zIndex:1}}>
          <div style={{fontFamily:"'Courier New',monospace",fontSize:12,letterSpacing:3,color:"#A0A0A0",fontWeight:700}}>{init?"EDIT INVESTIGATION":"CREATE NEW INVESTIGATION"}</div>
          {tpl&&<div style={{fontSize:10,color:tpl.color,fontFamily:"'Courier New',monospace"}}>{tpl.icon} {tpl.label.toUpperCase()}</div>}
          <button onClick={onClose} style={{background:"none",border:"none",color:"#505050",cursor:"pointer",fontSize:18}}>×</button>
        </div>
        <div style={{padding:24}}>
          <Field label="CASE TITLE *" value={f.title} onChange={v=>set("title",v)} ph="Operation codename or subject..."/>
          <Field label="DESCRIPTION" value={f.description} onChange={v=>set("description",v)} ph="Investigation overview and objectives..." multi/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <SelField label="PRIORITY *" value={f.priority} onChange={v=>set("priority",v)} opts={[["critical","CRITICAL"],["high","HIGH"],["medium","MEDIUM"],["low","LOW"]]}/>
            <SelField label="CLASSIFICATION *" value={f.classification} onChange={v=>set("classification",v)} opts={[["public","PUBLIC"],["confidential","CONFIDENTIAL"],["secret","SECRET"],["top_secret","TOP SECRET"]]}/>
          </div>
          <Field label="LEAD INVESTIGATOR" value={f.leadInvestigator} onChange={v=>set("leadInvestigator",v)} ph="Analyst name or handle..."/>
          <Field label="TAGS" value={f.tags} onChange={v=>set("tags",v)} ph="fraud, cyber, corporate — comma separated"/>
          {allCases.length>0&&(
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,color:"#505050",fontFamily:"'Courier New',monospace",letterSpacing:2,marginBottom:8,fontWeight:700}}>LINK TO EXISTING CASES</div>
              <div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:130,overflowY:"auto"}}>
                {allCases.map(c=>(
                  <label key={c.id} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"6px 10px",borderRadius:4,background:f.linkedCases.includes(c.id)?"#1A1A1A":"transparent",border:`1px solid ${f.linkedCases.includes(c.id)?"#2A2A2A":"transparent"}`}}>
                    <input type="checkbox" checked={f.linkedCases.includes(c.id)} onChange={()=>toggleLink(c.id)} style={{accentColor:PC[c.priority].color}}/>
                    <span style={{fontFamily:"'Courier New',monospace",fontSize:10,color:PC[c.priority].color}}>{c.codeName}</span>
                    <span style={{fontSize:11,color:"#A0A0A0",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:12,justifyContent:"flex-end",marginTop:8}}>
            <button onClick={onClose} style={BTN("#1A1A1A","#333","#A0A0A0")}>CANCEL</button>
            <button onClick={()=>{if(!f.title.trim())return;onSave({...f,tags:f.tags?f.tags.split(",").map(t=>t.trim()).filter(Boolean):[]});}} style={BTN("#E5E5E5","#E5E5E5","#0A0A0A")}>{init?"SAVE CHANGES":"CREATE CASE"}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
//  QUICK PREVIEW PANEL
// ════════════════════════════════════════════════════════════════
const Preview = ({c,all,onOpen,onClose}: any) => {
  if(!c)return null;
  const p=PC[c.priority],s=SC[c.status],cl=CC[c.classification];
  const score=calcRisk(c,all);
  const linked=all.filter(x=>x.id!==c.id&&(c.linkedCases||[]).includes(x.id));
  const tpl=TEMPLATES.find(t=>t.id===c.template);
  const chkDone=(c.checklist||[]).filter(Boolean).length, chkTotal=(c.checklist||[]).length;

  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:400}}/>
      <div style={{position:"fixed",right:0,top:0,bottom:0,width:380,zIndex:401,background:"#111",borderLeft:"1px solid #1E1E1E",overflowY:"auto",boxShadow:"-16px 0 48px rgba(0,0,0,0.6)",animation:"slideInRight 0.2s ease"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #1A1A1A",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontFamily:"'Courier New',monospace",fontSize:11,color:p.color,letterSpacing:1,fontWeight:700,marginBottom:4}}>{c.codeName}</div>
            <div style={{fontSize:15,fontWeight:700,color:"#E5E5E5",marginBottom:8,lineHeight:1.3}}>{c.title}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}><Badge cfg={p} sm/><Badge cfg={s} sm/><span style={{fontSize:9,color:cl.color,fontFamily:"'Courier New',monospace",padding:"1px 6px",border:`1px solid ${cl.color}44`,borderRadius:3}}>{cl.label}</span><AgeDot c={c}/></div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#505050",cursor:"pointer",fontSize:18}}>×</button>
        </div>
        <div style={{padding:"16px 20px"}}>
          <div style={{background:"#0A0A0A",border:"1px solid #1A1A1A",borderRadius:6,padding:14,marginBottom:12}}>
            <RiskGauge score={score} sz={52}/>
          </div>
          <div style={{background:"#0A0A0A",border:"1px solid #1A1A1A",borderRadius:6,padding:14,marginBottom:12}}>
            <SLabel>METRICS</SLabel>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
              {[["⬡",c.stats.entityCount,"Entities"],["◉",c.stats.locationCount,"Locs"],["◷",c.stats.eventCount,"Events"],["⚙",c.stats.toolResultsCount,"Tools"],["▤",c.stats.evidenceCount,"Evidence"],["◆",(c.hypotheses||[]).length,"Hypo"]].map(([ic,v,l])=>(
                <div key={l} style={{textAlign:"center",padding:"7px 4px",background:"#111",borderRadius:4}}>
                  <div style={{fontSize:10,color:"#505050"}}>{ic}</div>
                  <div style={{fontSize:17,fontWeight:900,color:"#E5E5E5",fontFamily:"'Courier New',monospace"}}>{v}</div>
                  <div style={{fontSize:8,color:"#404040",fontFamily:"'Courier New',monospace"}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          {tpl&&chkTotal>0&&(
            <div style={{background:"#0A0A0A",border:"1px solid #1A1A1A",borderRadius:6,padding:14,marginBottom:12}}>
              <SLabel>PROGRESS</SLabel>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                <div style={{flex:1,height:4,background:"#1A1A1A",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",background:tpl.color,width:`${(chkDone/chkTotal)*100}%`,transition:"width 0.4s"}}/></div>
                <span style={{fontSize:10,color:"#505050",fontFamily:"'Courier New',monospace"}}>{chkDone}/{chkTotal}</span>
              </div>
              <div style={{fontSize:10,color:tpl.color,fontFamily:"'Courier New',monospace"}}>{tpl.icon} {tpl.label}</div>
            </div>
          )}
          {linked.length>0&&(
            <div style={{background:"#0A0A0A",border:"1px solid #1A1A1A",borderRadius:6,padding:14,marginBottom:12}}>
              <SLabel>LINKED CASES</SLabel>
              {linked.map(lc=>(
                <div key={lc.id} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid #111"}}>
                  <span style={{color:PC[lc.priority].color,fontSize:10}}>⇔</span>
                  <div><div style={{fontSize:10,color:PC[lc.priority].color,fontFamily:"'Courier New',monospace"}}>{lc.codeName}</div><div style={{fontSize:11,color:"#A0A0A0"}}>{lc.title}</div></div>
                </div>
              ))}
            </div>
          )}
          {(c.hypotheses||[]).filter(h=>h.status==="active").length>0&&(
            <div style={{background:"#0A0A0A",border:"1px solid #1A1A1A",borderRadius:6,padding:14,marginBottom:12}}>
              <SLabel>OPEN HYPOTHESES</SLabel>
              {c.hypotheses.filter(h=>h.status==="active").map(h=>(
                <div key={h.id} style={{padding:"8px 0",borderBottom:"1px solid #111"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <div style={{fontSize:11,color:"#E5E5E5",flex:1,paddingRight:8}}>{h.title}</div>
                    <span style={{fontSize:10,color:"#CA8A04",fontFamily:"'Courier New',monospace",fontWeight:700}}>{h.confidence}%</span>
                  </div>
                  <div style={{height:2,background:"#1A1A1A",borderRadius:1,overflow:"hidden"}}><div style={{height:"100%",background:"#CA8A04",width:`${h.confidence}%`}}/></div>
                </div>
              ))}
            </div>
          )}
          <div style={{fontSize:12,color:"#A0A0A0",lineHeight:1.6,marginBottom:16}}>{c.description||"No description."}</div>
          <button onClick={()=>onOpen(c.id)} style={{...BTN("#E5E5E5","#E5E5E5","#0A0A0A"),width:"100%",textAlign:"center"}}>OPEN FULL INVESTIGATION →</button>
        </div>
      </div>
    </>
  );
};

// ════════════════════════════════════════════════════════════════
//  CASE CARD
// ════════════════════════════════════════════════════════════════
const Card = ({c,all,sel,bulk,onToggle,onPreview,onOpen,onEdit,onDup,onArchive,onClose,onReopen,onDel, mounted}: any) => {
  const [menu,setMenu]=useState(false);
  const p=PC[c.priority],s=SC[c.status],cl=CC[c.classification];
  const score=calcRisk(c,all), tpl=TEMPLATES.find(t=>t.id===c.template);
  const chkDone=(c.checklist||[]).filter(Boolean).length, chkTotal=(c.checklist||[]).length;
  const linkedN=(c.linkedCases||[]).length;

  return (
    <div style={{background:"#111",border:`1px solid ${sel?"#2A2A2A":"#1A1A1A"}`,borderLeft:`3px solid ${p.color}`,borderRadius:6,padding:"16px 18px",position:"relative",transition:"box-shadow 0.15s",boxShadow:sel?"0 0 0 1px #333":"none"}}>
      {bulk&&<div style={{position:"absolute",top:12,left:-14,zIndex:10}}><input type="checkbox" checked={sel} onChange={()=>onToggle(c.id)} style={{width:16,height:16,accentColor:p.color,cursor:"pointer"}}/></div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div style={{fontFamily:"'Courier New',monospace",fontSize:11,color:p.color,letterSpacing:1,fontWeight:700}}>{c.codeName}</div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <RiskGauge score={score} sz={38}/>
          <button onClick={e=>{e.stopPropagation();setMenu(m=>!m);}} style={{background:"none",border:"none",color:"#505050",cursor:"pointer",fontSize:16,padding:"0 2px",lineHeight:1}}>⋮</button>
        </div>
      </div>
      <div onClick={()=>onPreview(c)} style={{cursor:"pointer"}}>
        <div style={{fontSize:14,color:"#E5E5E5",fontWeight:600,marginBottom:8,lineHeight:1.3}}>{c.title}</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
          <Badge cfg={p} sm/><Badge cfg={s} sm/>
          <span style={{fontSize:9,color:cl.color,fontFamily:"'Courier New',monospace",padding:"1px 6px",border:`1px solid ${cl.color}44`,borderRadius:3}}>{cl.label}</span>
          <AgeDot c={c}/>
        </div>
        {tpl&&chkTotal>0&&(
          <div style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <div style={{fontSize:9,color:tpl.color,fontFamily:"'Courier New',monospace"}}>{tpl.icon} {tpl.label.toUpperCase()}</div>
              <div style={{fontSize:9,color:"#505050",fontFamily:"'Courier New',monospace"}}>{chkDone}/{chkTotal}</div>
            </div>
            <div style={{height:2,background:"#1A1A1A",borderRadius:1,overflow:"hidden"}}><div style={{height:"100%",background:p.color,width:`${(chkDone/chkTotal)*100}%`,transition:"width 0.4s"}}/></div>
          </div>
        )}
        <div style={{display:"flex",gap:12,fontSize:10,color:"#505050",fontFamily:"'Courier New',monospace",marginBottom:6}}>
          <span>ENTITIES {c.stats.entityCount}</span><span>LOCATIONS {c.stats.locationCount}</span><span>EVENTS {c.stats.eventCount}</span><span>EVIDENCE {c.stats.evidenceCount}</span>
          {(c.hypotheses||[]).length>0&&<span style={{color:"#CA8A04"}}>HYPOTHESES {c.hypotheses.length}</span>}
          {linkedN>0&&<span style={{color:"#8B5CF6"}}>LINKED {linkedN}</span>}
        </div>
        <div style={{fontSize:10,color:"#404040",fontFamily:"'Courier New',monospace"}}>Updated {mounted ? relTime(c.updatedAt) : "--"}</div>
      </div>
      {menu&&(
        <div onClick={e=>e.stopPropagation()} style={{position:"absolute",right:8,top:40,zIndex:100,background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:6,overflow:"hidden",width:168,boxShadow:"0 8px 32px rgba(0,0,0,0.7)"}}>
          {[["Open Investigation",()=>{onOpen(c.id);setMenu(false);}],["Quick Preview",()=>{onPreview(c);setMenu(false);}],["Edit",()=>{onEdit(c);setMenu(false);}],["Duplicate",()=>{onDup(c.id);setMenu(false);}],
            c.status==="active"?["Archive",()=>{onArchive(c.id);setMenu(false);}]:null,
            c.status!=="active"?["Reopen",()=>{onReopen(c.id);setMenu(false);}]:null,
            c.status==="active"?["Close Case",()=>{onClose(c.id);setMenu(false);}]:null,
            ["Delete",()=>{onDel(c.id);setMenu(false);},"#DC2626"],
          ].filter(Boolean).map(([label,action,color]: any)=>(
            <button key={label} onClick={action} style={{display:"block",width:"100%",padding:"9px 14px",textAlign:"left",background:"none",border:"none",color:color||"#A0A0A0",cursor:"pointer",fontSize:11,fontFamily:"'Courier New',monospace",letterSpacing:1,fontWeight:600}}>{label}</button>
          ))}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
//  CASE DETAIL
// ════════════════════════════════════════════════════════════════
const Detail = ({c,all,onBack,onEdit,onUpdate}: any) => {
  const [tab,setTab]=useState("overview");
  const [findings,setFindings]=useState(c.findings||"");
  const [newH,setNewH]=useState({title:"",confidence:50,evidence:""});
  const [showNewH,setShowNewH]=useState(false);
  const p=PC[c.priority],s=SC[c.status],cl=CC[c.classification];
  const score=calcRisk(c,all), rl=riskMeta(score);
  const tpl=TEMPLATES.find(t=>t.id===c.template);
  const linked=all.filter(x=>x.id!==c.id&&(c.linkedCases||[]).includes(x.id));
  const TABS=["overview","hypotheses","checklist","linked","activity"];

  const addLog=(id,e)=>onUpdate(id,{activityLog:[...c.activityLog,{id:uid(),timestamp:new Date(),...e}]});
  const saveFindings=()=>{onUpdate(c.id,{findings});addLog(c.id,{type:"updated",description:"Findings updated"});};
  const toggleCheck=(i)=>{const cl=[...(c.checklist||[])];cl[i]=!cl[i];onUpdate(c.id,{checklist:cl});addLog(c.id,{type:"checklist_updated",description:`Checklist step ${i+1} ${cl[i]?"completed":"unchecked"}`});};
  const addHyp=()=>{if(!newH.title.trim())return;const h={id:uid(),createdAt:new Date(),status:"active",...newH};onUpdate(c.id,{hypotheses:[...(c.hypotheses||[]),h]});addLog(c.id,{type:"hypothesis_added",description:`Hypothesis added: "${h.title}"`});setNewH({title:"",confidence:50,evidence:""});setShowNewH(false);};
  const setHypStatus=(hid,st)=>{const hs=(c.hypotheses||[]).map(h=>h.id===hid?{...h,status:st}:h);onUpdate(c.id,{hypotheses:hs});addLog(c.id,{type:"updated",description:`Hypothesis ${st}`});};

  return (
    <div style={{height:"100%",background:"#0A0A0A", overflowY: "auto"}}>
      <div style={{background:"#111",borderBottom:"1px solid #1A1A1A",padding:"16px 24px",position:"sticky",top:0,zIndex:50}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16}}>
            <div>
              <div style={{fontFamily:"'Courier New',monospace",fontSize:13,color:p.color,letterSpacing:2,fontWeight:700,marginBottom:4}}>{c.codeName}</div>
              <div style={{fontSize:22,fontWeight:800,color:"#E5E5E5",marginBottom:10}}>{c.title}</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}><Badge cfg={p}/><Badge cfg={s}/><span style={{fontSize:10,color:cl.color,fontFamily:"'Courier New',monospace",padding:"2px 8px",border:`1px solid ${cl.color}44`,borderRadius:3}}>{cl.label}</span><AgeDot c={c}/></div>
            </div>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <RiskGauge score={score} sz={60}/>
              <button onClick={()=>onEdit(c)} style={BTN("#1A1A1A","#333","#A0A0A0")}>EDIT CASE</button>
              <button onClick={onBack} style={BTN("#1A1A1A","#333","#A0A0A0")}>← BACK TO DASHBOARD</button>
            </div>
          </div>
        </div>
      </div>
      <div style={{borderBottom:"1px solid #1A1A1A",background:"#111"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",padding:"0 24px",overflowX:"auto"}}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{background:"none",border:"none",borderBottom:`2px solid ${tab===t?"#E5E5E5":"transparent"}`,color:tab===t?"#E5E5E5":"#505050",cursor:"pointer",padding:"12px 18px",fontSize:10,fontFamily:"'Courier New',monospace",letterSpacing:2,fontWeight:700,whiteSpace:"nowrap",transition:"color 0.15s"}}>
              {t.toUpperCase()}{t==="hypotheses"&&(c.hypotheses||[]).length>0&&<span style={{color:"#CA8A04",marginLeft:4}}>({(c.hypotheses||[]).filter(h=>h.status==="active").length})</span>}
            </button>
          ))}
        </div>
      </div>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"28px 24px"}}>
        {tab==="overview"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <div>
              <div style={{background:"#111",border:"1px solid #1A1A1A",borderRadius:6,padding:20,marginBottom:16}}>
                <SLabel>CASE INFO</SLabel>
                <IRow label="Created" value={fmtDate(c.createdAt)}/><IRow label="Updated" value={relTime(c.updatedAt)}/><IRow label="Lead" value={c.leadInvestigator||"—"}/><IRow label="Team" value={(c.team||[]).join(", ")||"—"}/>{c.closedAt&&<IRow label="Closed" value={fmtDate(c.closedAt)}/>}{tpl&&<IRow label="Template" value={`${tpl.icon} ${tpl.label}`}/>}
                <div style={{marginTop:12}}><SLabel>DESCRIPTION</SLabel><div style={{fontSize:13,color:"#A0A0A0",lineHeight:1.7}}>{c.description||"No description."}</div></div>
              </div>
              <div style={{background:"#111",border:"1px solid #1A1A1A",borderRadius:6,padding:20}}>
                <SLabel>FINDINGS</SLabel>
                <textarea value={findings} onChange={e=>setFindings(e.target.value)} placeholder="Document investigation conclusions..." rows={6} style={{...INPUT,resize:"vertical"}}/>
                <button onClick={saveFindings} style={{...BTN("#E5E5E5","#E5E5E5","#0A0A0A"),marginTop:10,fontSize:10}}>SAVE FINDINGS</button>
              </div>
            </div>
            <div>
              <div style={{background:"#111",border:"1px solid #1A1A1A",borderRadius:6,padding:20,marginBottom:16}}>
                <SLabel>RISK ASSESSMENT</SLabel>
                <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:14}}><RiskGauge score={score} sz={72}/><div style={{fontSize:11,color:"#A0A0A0",lineHeight:1.7,flex:1}}>Score calculated from priority, classification, intelligence volume, case dormancy, linked cases, and open hypotheses.</div></div>
                <div style={{height:6,background:"#1A1A1A",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:rl.color,width:`${score}%`,transition:"width(0.6s ease)",borderRadius:3}}/></div>
              </div>
              <div style={{background:"#111",border:"1px solid #1A1A1A",borderRadius:6,padding:20,marginBottom:16}}>
                <SLabel>INTELLIGENCE METRICS</SLabel>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[["Entities",c.stats.entityCount],["Locations",c.stats.locationCount],["Events",c.stats.eventCount],["Tool Results",c.stats.toolResultsCount],["Evidence",c.stats.evidenceCount],["Hypotheses",(c.hypotheses||[]).length]].map(([l,v])=>(
                    <div key={l} style={{background:"#0A0A0A",border:"1px solid #1A1A1A",borderRadius:4,padding:"10px 14px"}}>
                      <div style={{fontSize:10,color:"#505050",fontFamily:"'Courier New',monospace",marginBottom:4}}>{l}</div>
                      <div style={{fontSize:22,fontWeight:800,color:"#E5E5E5",fontFamily:"'Courier New',monospace"}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {tab==="activity"&&(
          <div style={{maxWidth:700}}>
            <SLabel>FULL ACTIVITY LOG ({c.activityLog.length} entries)</SLabel>
            {c.activityLog.length===0 ? <div style={{color:"#505050",fontSize:12,fontFamily:"'Courier New',monospace"}}>No activity recorded.</div>
            : [...c.activityLog].reverse().map(e=>(
              <div key={e.id} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:"1px solid #1A1A1A"}}>
                <div style={{fontSize:14,color:"#505050",minWidth:20,marginTop:1}}>{ACT_ICONS[e.type]||"·"}</div>
                <div style={{flex:1}}><div style={{fontSize:12,color:"#A0A0A0",lineHeight:1.5}}>{e.description}</div><div style={{fontSize:10,color:"#404040",fontFamily:"'Courier New',monospace",marginTop:3}}>{e.user&&<span style={{color:"#505050",marginRight:8}}>{e.user}</span>}{fmtDate(e.timestamp)} · {relTime(e.timestamp)}</div></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
//  BULK ACTION BAR
// ════════════════════════════════════════════════════════════════
const BulkBar = ({n,onArchive,onClose,onExport,onDelete,onClear}: any) => (
  <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:8,padding:"12px 20px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 8px 32px rgba(0,0,0,0.7)",zIndex:500,animation:"slideUp 0.2s ease"}}>
    <div style={{fontSize:12,color:"#E5E5E5",fontFamily:"'Courier New',monospace",fontWeight:700,marginRight:8}}>{n} SELECTED</div>
    <button onClick={onArchive} style={BTN("#1A1A1A","#333","#6B7280",{padding:"6px 12px",fontSize:10})}>ARCHIVE</button>
    <button onClick={onClose}   style={BTN("#1A1A1A","#333","#4B5563",{padding:"6px 12px",fontSize:10})}>CLOSE ALL</button>
    <button onClick={onDelete}  style={BTN("#DC262620","#DC2626","#DC2626",{padding:"6px 12px",fontSize:10})}>DELETE</button>
    <button onClick={onClear}   style={{background:"none",border:"none",color:"#505050",cursor:"pointer",fontSize:18,padding:"0 4px"}}>×</button>
  </div>
);

const Divider = () => <div style={{width:1,height:16,background:"#2A2A2A",flexShrink:0}}/>;
const FChip = ({label,color,active,onClick}: any) => <button onClick={onClick} style={{background:active?color+"1A":"transparent",border:`1px solid ${active?color:"#2A2A2A"}`,color:active?color:"#505050",padding:"3px 8px",borderRadius:3,cursor:"pointer",fontSize:9,fontFamily:"'Courier New',monospace",fontWeight:700,letterSpacing:1,transition:"all 0.15s"}}>{label}</button>;

// ════════════════════════════════════════════════════════════════
//  MAIN APP
// ════════════════════════════════════════════════════════════════
export default function AbsterDashboard({ onClose }: { onClose?: () => void }) {
  const { cases, activeCaseId, addCase, updateCase, removeCase, setActiveCase, entities, relations } = useAbsterStore();
  const [mounted, setMounted] = useState(false);
  const [preview,setPreview]=useState(null);
  const [view,setView]=useState("grid");
  const [sort,setSort]=useState("updated");
  const [search,setSearch]=useState("");
  const [filters,setFilters]=useState({priorities:[],statuses:[],classifications:[]});
  const [showArchived,setShowArchived]=useState(false);
  const [modal,setModal]=useState(null);
  const [editCase,setEditCase]=useState(null);
  const [tpl,setTpl]=useState(null);
  const [confirm,setConfirm]=useState(null);
  const [toast,setToast]=useState(null);
  const [bulk,setBulk]=useState(false);
  const [sel,setSel]=useState(new Set());
  const [shortcuts,setShortcuts]=useState(false);
  const searchRef=useRef(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (activeCaseId) {
      const c = cases.find(c => c.id === activeCaseId);
      if (c) {
        const newStats = {
          entityCount: entities.length,
          locationCount: entities.filter(e => e.type === 'LOCATION').length,
          eventCount: entities.filter(e => e.type === 'EVENT').length,
          toolResultsCount: c.stats?.toolResultsCount || 0,
          evidenceCount: relations.length
        };
        if (
          c.stats?.entityCount !== newStats.entityCount ||
          c.stats?.locationCount !== newStats.locationCount ||
          c.stats?.eventCount !== newStats.eventCount ||
          c.stats?.evidenceCount !== newStats.evidenceCount
        ) {
          updateCase(activeCaseId, { stats: newStats });
        }
      }
    }
  }, [activeCaseId, entities, relations, cases, updateCase]);

  const showToast=(m)=>setToast(m);
  const upd=(id,patch)=>updateCase(id, {...patch, updatedAt: new Date().toISOString()});
  const log=(id,e)=>{
    const c = cases.find(c => c.id === id);
    if (!c) return;
    updateCase(id, {
      updatedAt: new Date().toISOString(),
      activityLog: [...c.activityLog, {id:uid(),timestamp:new Date().toISOString(),...e}]
    });
  };

  const handleCreate=(data)=>{
    const nc={id:uid(),codeName:cname(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),status:"active",findings:"",linkedCases:data.linkedCases||[],template:tpl?.id||null,checklist:tpl?tpl.checklist.map(()=>false):[],hypotheses:[],activityLog:[{id:uid(),timestamp:new Date().toISOString(),type:"created",description:`Case created${tpl?` from ${tpl.label} template`:""}`,user:data.leadInvestigator||"Analyst"}],stats:{entityCount:0,locationCount:0,eventCount:0,toolResultsCount:0,evidenceCount:0},settings:{autoSave:true,notifications:true,shareWithTeam:false},team:data.leadInvestigator?[data.leadInvestigator]:[],...data};
    addCase(nc);setModal(null);setTpl(null);showToast(`Case created: ${nc.codeName}`);
  };

  const handleEdit=(data)=>{if(!editCase) return; upd(editCase.id,data);log(editCase.id,{type:"updated",description:"Case metadata updated"});setEditCase(null);showToast("Case updated");};
  const handleDup=(id)=>{const o=cases.find(c=>c.id===id);if(!o)return;const d={...o,id:uid(),codeName:cname(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),status:"active",title:o.title+" (Copy)",activityLog:[{id:uid(),timestamp:new Date().toISOString(),type:"created",description:`Duplicated from ${o.codeName}`}],hypotheses:[],checklist:(o.checklist||[]).map(()=>false)};addCase(d);showToast(`Duplicated as ${d.codeName}`);};
  const handleArchive=(id)=>{upd(id,{status:"archived"});log(id,{type:"status_changed",description:"Case archived"});showToast("Case archived");};
  const handleClose=(id)=>{upd(id,{status:"closed",closedAt:new Date().toISOString()});log(id,{type:"status_changed",description:"Case closed"});showToast("Case closed");};
  const handleReopen=(id)=>{upd(id,{status:"active",closedAt:undefined});log(id,{type:"status_changed",description:"Case reopened"});showToast("Case reopened");};
  const handleDel=(id)=>setConfirm({msg:"Permanently delete this case? All data will be lost.",onOk:()=>{removeCase(id);setConfirm(null);showToast("Case deleted");}});

  const togSel=(id: string)=>setSel(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});
  const bulkArchive=()=>{sel.forEach((id: any)=>handleArchive(id));setSel(new Set());showToast(`▤ ${sel.size} cases archived`);};
  const bulkClose=()=>{sel.forEach((id: any)=>handleClose(id));setSel(new Set());showToast(`◈ ${sel.size} cases closed`);};
  const bulkDel=()=>setConfirm({msg:`Permanently delete ${sel.size} selected cases?`,onOk:()=>{sel.forEach((id: any)=>removeCase(id));setSel(new Set());setBulk(false);setConfirm(null);showToast(`✗ ${sel.size} cases deleted`);}});

  const filtered=useMemo(()=>{
    let cs=cases;
    if(!showArchived)cs=cs.filter(c=>c.status!=="archived");
    if(filters.priorities.length)cs=cs.filter(c=>filters.priorities.includes(c.priority));
    if(filters.statuses.length)cs=cs.filter(c=>filters.statuses.includes(c.status));
    if(filters.classifications.length)cs=cs.filter(c=>filters.classifications.includes(c.classification));
    if(search.trim()){const q=search.toLowerCase();cs=cs.filter(c=>c.codeName.toLowerCase().includes(q)||c.title.toLowerCase().includes(q)||(c.description||"").toLowerCase().includes(q));}
    return [...cs].sort((a,b)=>{if(sort==="updated")return new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime();if(sort==="created")return new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime();if(sort==="risk")return calcRisk(b,cases)-calcRisk(a,cases);return 0;});
  },[cases,filters,search,sort,showArchived]);

  const stats=useMemo(()=>{
    const active=cases.filter(c=>c.status==="active");
    const activeCnt=active.length;
    return {
      total:cases.length,
      active:activeCnt,
      closed:cases.filter(c=>c.status==="closed").length,
      archived:cases.filter(c=>c.status==="archived").length,
      critical:cases.filter(c=>c.priority==="critical"&&c.status==="active").length,
      week:cases.filter(c=>daysSince(c.createdAt)<7).length,
      dormant:cases.filter(c=>c.status==="active"&&daysSince(c.updatedAt)>7).length,
      avgRisk:activeCnt===0 ? 0 : Math.round(active.reduce((s,c)=>s+calcRisk(c,cases),0)/activeCnt),
    };
  },[cases]);

  const recentAct=useMemo(()=>cases.flatMap(c=>c.activityLog.map(a=>({...a,caseName:c.codeName,caseId:c.id}))).sort((a,b)=>new Date(b.timestamp).getTime()-new Date(a.timestamp).getTime()).slice(0,10),[cases]);
  const priData=useMemo(()=>[{label:"CRIT",value:cases.filter(c=>c.priority==="critical").length,color:"#DC2626"},{label:"HIGH",value:cases.filter(c=>c.priority==="high").length,color:"#EA580C"},{label:"MED",value:cases.filter(c=>c.priority==="medium").length,color:"#CA8A04"},{label:"LOW",value:cases.filter(c=>c.priority==="low").length,color:"#16A34A"}],[cases]);

  const detailCase=cases.find(c=>c.id===activeCaseId);
  if(detailCase){
    return(<div style={{height: "100%", overflow: "hidden"}}><style>{CSS}</style><Detail c={detailCase} all={cases} onBack={()=>setActiveCase(null)} onEdit={c=>setEditCase(c)} onUpdate={(id,p)=>upd(id,p)}/>{editCase&&<CaseModal init={editCase} allCases={cases.filter(c=>c.id!==editCase.id)} onSave={handleEdit} onClose={()=>setEditCase(null)}/>} {toast&&<Toast msg={toast} onClose={()=>setToast(null)}/>}</div>);
  }

  const togF=(type,val)=>setFilters(f=>({...f,[type]:f[type].includes(val)?f[type].filter(x=>x!==val):[...f[type],val]}));

  return (
    <div style={{height: "100%", overflow: "hidden"}}>
      <style>{CSS}</style>
      <div style={{height: "100%", background: "#0A0A0A", color: "#E5E5E5", overflowY: "auto"}}>
        {/* TOP BAR */}
        <div style={{background:"#111",borderBottom:"1px solid #1A1A1A",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap",position:"sticky",top:0,zIndex:50}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            {onClose && (
              <button onClick={onClose} className="flex items-center gap-1 px-2 py-1 bg-[#111] border border-[#333] text-[#A0A0A0] rounded cursor-pointer text-[9px] tracking-widest font-bold transition-all hover:bg-[#222]">
                <span>←</span> BACK
              </button>
            )}
            {!onClose && <div style={{fontFamily:"'Courier New',monospace",fontSize:13,letterSpacing:4,fontWeight:900}}><span style={{color:"#DC2626"}}>ABSTER OSINT</span><span style={{color:"#333",margin:"0 8px"}}>|</span><span style={{color:"#A0A0A0"}}>CASE MANAGER</span></div>}
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flex:1,justifyContent:"flex-end",maxWidth:580}}>
            <input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search cases..." style={{...INPUT,flex:1,maxWidth:320,padding:"7px 12px",fontSize:12}}/>
            <button onClick={()=>setModal("tpl")} style={btnPri}>+ NEW CASE</button>
          </div>
        </div>

        <div style={{maxWidth:1220,margin:"0 auto",padding:"24px"}}>
          {/* STAT CARDS */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:22}}>
            {[["TOTAL CASES",stats.total,`${stats.archived} archived`,"#333"],["ACTIVE",stats.active,"in progress","#10B981"],["CLOSED",stats.closed,"resolved","#374151"],["AVG RISK",stats.avgRisk,stats.active===0?"no active cases":"active cases","#8B5CF6"]].map(([l,v,s,a])=>(
              <div key={l} style={{background:"#111",border:"1px solid #1E1E1E",borderRadius:6,padding:"14px 16px",borderTop:`2px solid ${a}`}}>
                <div style={{fontSize:9,color:"#505050",letterSpacing:2,fontFamily:"'Courier New',monospace",marginBottom:5}}>{l}</div>
                <div style={{fontSize:26,fontWeight:900,color:"#E5E5E5",fontFamily:"'Courier New',monospace",lineHeight:1}}>{v}</div>
                <div style={{fontSize:9,color:"#404040",marginTop:3,fontFamily:"'Courier New',monospace"}}>{s}</div>
              </div>
            ))}
          </div>

          {/* ACTIVITY */}
          <div style={{background:"#111",border:"1px solid #1A1A1A",borderRadius:6,padding:18,marginBottom:20}}>
            <SLabel>RECENT ACTIVITY</SLabel>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"2px 24px"}}>
              {recentAct.map(a=>(
                <div key={a.id} onClick={()=>setActiveCase(a.caseId)} style={{display:"flex",gap:10,padding:"6px 0",borderBottom:"1px solid #0F0F0F",cursor:"pointer"}}>
                  <span style={{color:"#505050",fontSize:12,minWidth:16,marginTop:1}}>{ACT_ICONS[a.type]||"·"}</span>
                  <div style={{flex:1,overflow:"hidden"}}><span style={{fontSize:10,color:"#DC2626",fontFamily:"'Courier New',monospace",marginRight:8}}>{a.caseName}</span><span style={{fontSize:11,color:"#A0A0A0"}}>{a.description}</span></div>
                  <span style={{fontSize:9,color:"#404040",fontFamily:"'Courier New',monospace",whiteSpace:"nowrap"}}>{relTime(a.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CASES */}
          <div style={{background:"#111",border:"1px solid #1A1A1A",borderRadius:6,padding:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
              <div style={{fontFamily:"'Courier New',monospace",fontSize:10,letterSpacing:2,color:"#505050",fontWeight:700}}>CASES — {filtered.length} RESULTS</div>
              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                <FChip label="ARCHIVED" color="#6B7280" active={showArchived} onClick={()=>setShowArchived(v=>!v)}/>
                <FChip label="BULK" color="#8B5CF6" active={bulk} onClick={()=>{setBulk(v=>!v);setSel(new Set());}}/>
                <select value={sort} onChange={e=>setSort(e.target.value)} style={{...INPUT,width:"auto",padding:"4px 8px",fontSize:10}}>
                  <option value="updated">↓ UPDATED</option><option value="created">↓ CREATED</option><option value="risk">↓ RISK SCORE</option>
                </select>
                <button onClick={()=>setView(v=>v==="grid"?"list":"grid")} style={BTN("#1A1A1A","#333","#505050",{padding:"4px 10px"})}>{view==="grid"?"LIST":"GRID"}</button>
              </div>
            </div>

            {filtered.length===0 ? (
              <div style={{textAlign:"center",padding:"48px 0",color:"#404040",fontFamily:"'Courier New',monospace",fontSize:12,letterSpacing:2}}>NO CASES MATCH CURRENT FILTERS</div>
            ) : view==="grid" ? (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:12,paddingLeft:bulk?16:0}}>
                {filtered.map(c=><Card key={c.id} c={c} all={cases} sel={sel.has(c.id)} bulk={bulk} onToggle={togSel} onPreview={setPreview} onOpen={setActiveCase} onEdit={setEditCase} onDup={handleDup} onArchive={handleArchive} onClose={handleClose} onReopen={handleReopen} onDel={handleDel} mounted={mounted}/>)}
              </div>
            ) : (
              <div>
                {filtered.map(c=>{const p=PC[c.priority],s=SC[c.status],score=calcRisk(c,cases),rl=riskMeta(score);return(
                  <div key={c.id} style={{display:"flex",alignItems:"center",gap:14,padding:"10px 14px",borderLeft:`2px solid ${p.color}`,marginBottom:2,background:sel.has(c.id)?"#141414":"#0A0A0A",borderRadius:3,cursor:"pointer",transition:"background 0.1s"}}
                    onClick={()=>bulk?togSel(c.id):setPreview(c)}>
                    {bulk&&<input type="checkbox" checked={sel.has(c.id)} onChange={()=>togSel(c.id)} style={{accentColor:p.color}}/>}
                    <div style={{fontFamily:"'Courier New',monospace",fontSize:10,color:p.color,minWidth:140}}>{c.codeName}</div>
                    <div style={{flex:1,fontSize:13,color:"#E5E5E5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div>
                    <AgeDot c={c}/>
                    <Badge cfg={p} sm/><Badge cfg={s} sm/>
                    <div style={{fontSize:10,color:rl.color,fontFamily:"'Courier New',monospace",minWidth:30,textAlign:"right",fontWeight:700}}>{score}</div>
                    <div style={{fontSize:10,color:"#505050",fontFamily:"'Courier New',monospace",minWidth:70,textAlign:"right"}}>{mounted ? relTime(c.updatedAt) : "--"}</div>
                    <button onClick={e=>{e.stopPropagation();setActiveCase(c.id);}} style={BTN("#1A1A1A","#333","#505050",{padding:"4px 8px",fontSize:9})}>OPEN →</button>
                  </div>
                );})}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OVERLAYS */}
      {modal==="tpl"&&<TemplatePicker onSelect={t=>{setTpl(t);setModal("create");}} onSkip={()=>{setTpl(null);setModal("create");}}/>}
      {modal==="create"&&<CaseModal tpl={tpl} allCases={cases} onSave={handleCreate} onClose={()=>{setModal(null);setTpl(null);}}/>}
      {editCase&&<CaseModal init={editCase} allCases={cases.filter(c=>c.id!==editCase?.id)} onSave={handleEdit} onClose={()=>setEditCase(null)}/>}
      {preview&&<Preview c={cases.find(c=>c.id===preview.id)||preview} all={cases} onOpen={id=>{setPreview(null);setActiveCase(id);}} onClose={()=>setPreview(null)}/>}
      {bulk&&sel.size>0&&<BulkBar n={sel.size} onArchive={bulkArchive} onClose={bulkClose} onDelete={bulkDel} onClear={()=>setSel(new Set())}/>}
      {shortcuts&&<ShortcutsHelp onClose={()=>setShortcuts(false)}/>}
      {confirm&&<Confirm msg={confirm.msg} onOk={confirm.onOk} onCancel={()=>setConfirm(null)}/>}
      {toast&&<Toast msg={toast} onClose={()=>setToast(null)}/>}
    </div>
  );
}

const CSS=`
  *{box-sizing:border-box;margin:0;padding:0}
  input::placeholder,textarea::placeholder{color:#404040}
  input:focus,textarea:focus,select:focus{border-color:#444!important;outline:none}
  ::-webkit-scrollbar{width:5px;height:5px}
  ::-webkit-scrollbar-track{background:#0A0A0A}
  ::-webkit-scrollbar-thumb{background:#222;border-radius:3px}
  @keyframes slideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes slideInRight{from{transform:translateX(24px);opacity:0}to{transform:translateX(0);opacity:1}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
`;