import { useState, useEffect, useRef } from "react";

/* ─────────────────────────────────────────────
   UTILITIES
───────────────────────────────────────────── */
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

function useMounted(delay = 80) {
  const [m, setM] = useState(false);
  useEffect(() => { const t = setTimeout(() => setM(true), delay); return () => clearTimeout(t); }, [delay]);
  return m;
}

/* ─────────────────────────────────────────────
   ICONS
───────────────────────────────────────────── */
const Icon = ({ d, size = 20, stroke = "currentColor", fill = "none", sw = "1.5" }: { d: string | string[], size?: number, stroke?: string, fill?: string, sw?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const icons = {
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  globe: ["M12 2a10 10 0 100 20A10 10 0 0012 2z", "M2 12h20", "M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"],
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  network: ["M9 3H5a2 2 0 00-2 2v4","M9 21H5a2 2 0 01-2-2v-4","M15 3h4a2 2 0 012 2v4","M15 21h4a2 2 0 002-2v-4","M9 12h6","M12 9v6"],
  alert: ["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z","M12 9v4","M12 17h.01"],
  eye: ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 9a3 3 0 100 6 3 3 0 000-6z"],
  terminal: ["M4 17l6-6-6-6","M12 19h8"],
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  close: ["M18 6L6 18","M6 6l12 12"],
  play: "M5 3l14 9-14 9V3z",
  eyeOff: ["M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24","M1 1l22 22"],
  arrowRight: "M5 12h14M12 5l7 7-7 7",
};

/* ─────────────────────────────────────────────
   NETWORK GLOBE (canvas)
───────────────────────────────────────────── */
function NetworkGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    const H = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    canvas.style.width = canvas.offsetWidth + "px";
    canvas.style.height = canvas.offsetHeight + "px";
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const cW = canvas.offsetWidth, cH = canvas.offsetHeight;
    const cx = cW / 2, cy = cH / 2;
    const R = Math.min(cW, cH) * 0.36;

    const nodes = Array.from({ length: 32 }, () => ({
      theta: Math.random() * Math.PI * 2,
      phi: Math.acos(2 * Math.random() - 1),
      r: Math.random(),
    }));

    let angle = 0, animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, cW, cH);

      // Globe circle
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Lat lines
      for (let lat = -60; lat <= 60; lat += 30) {
        const y = cy + R * Math.sin(lat * Math.PI / 180);
        const rL = R * Math.cos(lat * Math.PI / 180);
        ctx.beginPath();
        ctx.ellipse(cx, y, rL, rL * 0.28, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.03)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      // Lon lines
      for (let lon = 0; lon < 180; lon += 30) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, R * Math.abs(Math.cos((lon + angle) * Math.PI / 180)), R, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.025)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      const proj = nodes.map(n => {
        const th = n.theta + angle * Math.PI / 180;
        return {
          x: cx + R * Math.sin(n.phi) * Math.cos(th),
          y: cy + R * Math.cos(n.phi),
          z: Math.sin(n.phi) * Math.sin(th),
          r: n.r,
          vis: Math.sin(n.phi) * Math.sin(th) > -0.15,
        };
      });

      // Edges
      proj.forEach((a, i) => proj.forEach((b, j) => {
        if (j <= i || !a.vis || !b.vis) return;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > R * 0.65) return;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(180,180,180,${0.08 * (1 - d / (R * 0.65))})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }));

      // Nodes
      proj.forEach(n => {
        if (!n.vis) return;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r > 0.8 ? 3 : 1.8, 0, Math.PI * 2);
        ctx.fillStyle = n.r > 0.8 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)";
        ctx.fill();
        if (n.r > 0.85) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, 8, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255,0.1)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      angle += 0.12;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} style={{ width:"100%", height:"100%", display:"block" }} />;
}

/* ─────────────────────────────────────────────
   TERMINAL — Real product flow (no fake metrics)
───────────────────────────────────────────── */
const termLines = [
  { txt: "$ abster case new --name \"Acme breach investigation\"", col: "#888" },
  { txt: "> Case CASE-a1b2c3 created (local IndexedDB)", col: "#22c55e" },
  { txt: "$ abster entity add --type DOMAIN --value acme-corp.com", col: "#888" },
  { txt: "> Entity e-001 persisted to graph", col: "#555" },
  { txt: "$ abster ask \"Find breaches for emails at acme-corp.com\"", col: "#888" },
  { txt: "> Calling HaveIBeenPwned (sliding-window, demo key)...", col: "#555" },
  { txt: "> 2 breach records returned — adding as graph nodes", col: "#22c55e" },
  { txt: "> Auto-linking: acme-corp.com --(BREACHED_IN)--> LinkedIn 2021", col: "#594DFF" },
  { txt: "✓ Investigation saved — /case/CASE-a1b2c3", col: "#888" },
];

function Terminal() {
  const [lines, setLines] = useState<{txt: string, col: string}[]>([]);
  const [cursor, setCursor] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let i = 0;
    let timeoutId: NodeJS.Timeout;
    const add = () => {
      if (i < termLines.length) {
        const currentLine = termLines[i];
        i++;
        setLines(l => [...l, currentLine]);
        timeoutId = setTimeout(add, 550 + Math.random() * 380);
      } else {
        timeoutId = setTimeout(() => { 
          setLines([]); 
          i = 0; 
          timeoutId = setTimeout(add, 1000); 
        }, 4000);
      }
    };
    timeoutId = setTimeout(add, 1000);
    const c = setInterval(() => setCursor(v => !v), 530);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(c);
    };
  }, []);

  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [lines]);

  return (
    <div style={{ background:"#060606", border:"1px solid #111", borderRadius:12, overflow:"hidden", fontFamily:"'Space Mono',monospace", fontSize:"11px", boxShadow:"0 20px 60px rgba(0,0,0,0.7)" }}>
      <div style={{ background:"#090909", borderBottom:"1px solid #111", padding:"10px 16px", display:"flex", alignItems:"center", gap:"8px" }}>
        {["#3a3a3a","#2a2a2a","#222"].map((c,i) => <div key={i} style={{ width:10,height:10,borderRadius:"50%",background:c }} />)}
        <span style={{ color:"#2a2a2a", marginLeft:8, letterSpacing:"1.5px", fontSize:"9px", textTransform:"uppercase" }}>ABSTER — DEMO FLOW</span>
      </div>
      <div ref={ref} style={{ padding:"16px", height:"220px", overflowY:"auto", scrollbarWidth:"none" }}>
        {lines.map((l, i) => (
          <div key={i} style={{ color:l.col, marginBottom:"6px", animation:"fadeIn 0.3s ease forwards", lineHeight:1.7 }}>{l.txt}</div>
        ))}
        <span style={{ color:"#555", opacity: cursor?1:0 }}>▮</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SAMPLE FEED — Example investigation events
───────────────────────────────────────────── */
const threats = [
  { level:"HIGH", msg:"Email user@acme-corp.com found in 2 breaches", time:"sample", col:"#ef4444" },
  { level:"MED",  msg:"Domain acme-corp.com — 47 subdomains enumerated", time:"sample", col:"#f59e0b" },
  { level:"INFO", msg:"Entity #229 linked to organization via WHOIS", time:"sample", col:"#888" },
  { level:"INFO", msg:"Graph auto-layout: 12 nodes, 18 edges", time:"sample", col:"#888" },
  { level:"LOW",  msg:"Timeline entry added: 2024-03-15 (first breach)", time:"sample", col:"#555" },
  { level:"MED",  msg:"New note attached to case CASE-a1b2c3", time:"sample", col:"#f59e0b" },
];

function ThreatFeed() {
  const [items, setItems] = useState(threats);
  return (
    <div style={{ background:"#050505", border:"1px solid #111", borderRadius:12, overflow:"hidden" }}>
      <div style={{ padding:"13px 20px", borderBottom:"1px solid #0d0d0d", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:6,height:6,borderRadius:"50%",background:"#ef4444",boxShadow:"0 0 8px #ef4444",animation:"pulse 1.5s ease-in-out infinite" }} />
          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"10px", color:"#333", letterSpacing:2, textTransform:"uppercase" }}>Sample Investigation Events</span>
        </div>
        <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:"#1e1e1e", letterSpacing:1 }}>EXAMPLE</span>
      </div>
      {items.slice(0, 5).map((t, i) => (
        <div key={i} style={{ padding:"11px 20px", borderBottom:"1px solid #090909", display:"flex", alignItems:"center", gap:12, animation: i===0?"fadeIn 0.4s ease":"none" }}>
          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:t.col, background:`${t.col}12`, padding:"3px 7px", borderRadius:3, letterSpacing:1, minWidth:34, textAlign:"center", border:`1px solid ${t.col}20` }}>{t.level}</span>
          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"10px", color:"#444", flex:1, lineHeight:1.5 }}>{t.msg}</span>
          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:"#222", whiteSpace:"nowrap" }}>{t.time}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   COUNTER
───────────────────────────────────────────── */
function Counter({ target, suffix = "", label }: { target: number, suffix?: string, label: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let s = 0; const step = target / 60;
        const id = setInterval(() => {
          s = Math.min(s + step, target);
          setVal(Math.floor(s));
          if (s >= target) clearInterval(id);
        }, 20);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return (
    <div ref={ref} style={{ textAlign:"center" }}>
      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"clamp(26px,3.5vw,40px)", color:"#fff" }}>
        {val.toLocaleString()}{suffix}
      </div>
      <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:"#333", letterSpacing:2, marginTop:6, textTransform:"uppercase" }}>{label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FEATURE CARD
───────────────────────────────────────────── */
function FeatureCard({ icon, title, desc, delay = 0 }: { icon: React.ReactNode, title: string, desc: string, delay?: number }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background: hov?"#0a0a0a":"#060606", border:`1px solid ${hov?"#1e1e1e":"#0f0f0f"}`, borderRadius:12, padding:"28px 24px",
        transition:"all 0.3s ease", cursor:"default", position:"relative", overflow:"hidden",
        boxShadow: hov?"0 20px 40px rgba(0,0,0,0.5)":"0 4px 20px rgba(0,0,0,0.3)",
        transform: hov?"translateY(-3px)":"translateY(0)",
        animation:`fadeInUp 0.6s ease ${delay}ms both`,
      }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background: hov?"linear-gradient(90deg,#333,transparent)":"transparent", transition:"all 0.3s" }} />
      <div style={{ width:40, height:40, background:"#0d0d0d", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18, color: hov?"#aaa":"#444", border:"1px solid #161616", transition:"all 0.3s" }}>
        {icon}
      </div>
      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:"14px", color: hov?"#fff":"#ccc", marginBottom:10, letterSpacing:"0.3px", transition:"color 0.3s" }}>{title}</div>
      <p style={{ fontFamily:"'Space Mono',monospace", fontSize:"10px", color:"#333", lineHeight:1.9 }}>{desc}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   GOOGLE ICON
───────────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   AUTH MODAL
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   MAIN
───────────────────────────────────────────── */
export default function AbsterLanding({ onLogin }: { onLogin: (email?: string, password?: string) => Promise<void> | void }) {
  const mounted = useMounted();
  const heroTitle = useGlitch("MASTER THE DIGITAL CHAOS", 9000);

  const navLinks = ["Docs"];
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const features = [
    { icon:<Icon d={icons.search} size={18} />, title:"Deep Search", desc:"Index social networks, domains, IPs, leaked databases, and the deep web in seconds with zero exposure." },
    { icon:<Icon d={icons.network} size={18} />, title:"Relationship Graphs", desc:"Visualize connections between entities, individuals, organizations, and digital assets with precision." },
    { icon:<Icon d={icons.alert} size={18} />, title:"Real-Time Alerts", desc:"Continuous monitoring with instant notifications upon detection of high-risk intelligence events." },
    { icon:<Icon d={icons.shield} size={18} />, title:"Threat Analysis", desc:"AI engine that correlates data to identify threat actors, behavioral patterns, and attack vectors." },
    { icon:<Icon d={icons.globe} size={18} />, title:"Global Coverage", desc:"Sources across 47 languages. Darkweb, clearnet, social networks and public records fully integrated." },
    { icon:<Icon d={icons.eye} size={18} />, title:"Passive Surveillance", desc:"Full OSINT operations without leaving a trace. Complete operator anonymity guaranteed on all queries." },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #000; color: #fff; font-family: 'Syne', sans-serif; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 2px; }
        @keyframes fadeIn { from{opacity:0}to{opacity:1} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(30px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.35} }
        @keyframes drift { 0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)} }
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:0} }
        @keyframes statusScroll { 0%{background-position:0% 0%}100%{background-position:200% 0%} }

        .nav-btn {
          background:none; border:none;
          font-family:'Space Mono',monospace; font-size:10px;
          color:#2a2a2a; letter-spacing:1.5px; text-transform:uppercase;
          cursor:pointer; transition:color 0.2s; padding:0;
        }
        .nav-btn:hover { color:#777; }

        .cta-white {
          display:inline-flex; align-items:center; gap:8px;
          padding:12px 24px;
          background:#fff; border:none; border-radius:8px;
          color:#000; font-family:'Syne',sans-serif; font-weight:700;
          font-size:11px; letter-spacing:2px; text-transform:uppercase;
          cursor:pointer; transition:all 0.2s ease;
        }
        .cta-white:hover { background:#e8e8e8; transform:translateY(-1px); }

        .cta-outline {
          display:inline-flex; align-items:center; gap:8px;
          padding:11px 22px;
          background:transparent; border:1px solid #1e1e1e; border-radius:8px;
          color:#444; font-family:'Syne',sans-serif; font-weight:600;
          font-size:11px; letter-spacing:2px; text-transform:uppercase;
          cursor:pointer; transition:all 0.2s ease;
        }
        .cta-outline:hover { border-color:#333; color:#888; background:#0a0a0a; }

        .access-btn {
          display:inline-flex; align-items:center; gap:7px;
          padding:8px 16px;
          background:#0a0a0a; border:1px solid #161616; border-radius:6px;
          color:#444; font-family:'Space Mono',monospace; font-size:10px;
          letter-spacing:1.5px; text-transform:uppercase;
          cursor:pointer; transition:all 0.2s;
        }
        .access-btn:hover { background:#111; border-color:#222; color:#aaa; }

        .section-label {
          display:inline-flex; align-items:center; gap:8px;
          font-family:'Space Mono',monospace; font-size:9px;
          color:#333; letter-spacing:3px; text-transform:uppercase;
          margin-bottom:18px;
        }
        .section-label::before {
          content:''; display:block; width:20px; height:1px; background:#222;
        }
      `}</style>

      {/* Top status line */}
      <div style={{ position:"fixed",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,#333,transparent)",zIndex:999 }} />

      {/* Scanlines */}
      <div style={{ position:"fixed",inset:0,pointerEvents:"none",zIndex:998,background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.02) 2px,rgba(0,0,0,0.02) 4px)" }} />

      {/* Fine grid */}
      <div style={{ position:"fixed",inset:0,pointerEvents:"none",opacity:0.018,backgroundImage:"linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",backgroundSize:"80px 80px" }} />

      {/* Very subtle ambient */}
      <div style={{ position:"fixed",width:900,height:900,top:-400,left:-300,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,255,255,0.012) 0%,transparent 65%)",pointerEvents:"none",filter:"blur(60px)" }} />
      <div style={{ position:"fixed",width:700,height:700,bottom:-300,right:-200,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,255,255,0.008) 0%,transparent 65%)",pointerEvents:"none",filter:"blur(60px)" }} />

      {/* ── NAVBAR ── */}
      <nav style={{ position:"fixed",top:1,left:0,right:0,zIndex:100,padding:"0 clamp(24px,5vw,72px)",height:60,display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(0,0,0,0.75)",backdropFilter:"blur(24px)",borderBottom:"1px solid #0a0a0a",opacity:mounted?1:0,transition:"opacity 0.8s ease" }}>
        {/* Logo */}
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:30,height:30,background:"#000",border:"1px solid #1e1e1e",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:"#fff",lineHeight:1,userSelect:"none" }}>A</span>
          </div>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:13,letterSpacing:5,color:"#fff",textTransform:"uppercase" }}>Abster</div>
            <div style={{ fontFamily:"'Space Mono',monospace",fontSize:7,color:"#222",letterSpacing:2,textTransform:"uppercase" }}>Open Source Intelligence Platform</div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ display:"flex",alignItems:"center",gap:36 }}>
          {navLinks.map(l => (
            <button key={l} className="nav-btn" onClick={() => setActiveModal(l)}>
              {l}
            </button>
          ))}
        </div>

        {/* Access */}
        <button className="access-btn" onClick={()=>onLogin()}>
          <Icon d={icons.eye[0]} size={13} />
          Access
        </button>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight:"100vh",display:"flex",alignItems:"center",padding:"80px clamp(24px,5vw,72px) 60px",position:"relative" }}>
        {/* Background Video */}
        <div style={{ position:"absolute",inset:0,zIndex:0,overflow:"hidden" }}>
          <video autoPlay loop muted playsInline style={{ width:"100%",height:"100%",objectFit:"cover",opacity:0.3,filter:"grayscale(100%) contrast(1.2)" }}>
            <source src="/video.mp4" type="video/mp4" />
          </video>
          <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.9) 100%)" }} />
          <div style={{ position:"absolute",inset:0,background:"radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.8) 100%)" }} />
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"72px",maxWidth:1200,margin:"0 auto",width:"100%",alignItems:"center",position:"relative",zIndex:10 }}>

          {/* Left */}
          <div style={{ opacity:mounted?1:0,transform:mounted?"translateY(0)":"translateY(30px)",transition:"all 1s cubic-bezier(0.22,1,0.36,1) 0.15s" }}>
            <div className="section-label">Open Source Intelligence System</div>

            <h1 style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"clamp(30px,4vw,52px)",lineHeight:1.08,letterSpacing:"-1px",marginBottom:24,color:"#fff" }}>
              {heroTitle}<span style={{ animation:"blink 1.1s step-end infinite",color:"#333" }}>_</span>
            </h1>

            <p style={{ fontFamily:"'Space Mono',monospace",fontSize:"clamp(10px,1.1vw,12px)",color:"#333",lineHeight:2,marginBottom:36,maxWidth:440 }}>
              Transform massive datasets into actionable intelligence within seconds. Track threat actors, map digital relationships, and monitor exposure — with surgical precision.
            </p>

            <div style={{ display:"flex",gap:12,flexWrap:"wrap" }}>
              <button className="cta-white" onClick={()=>onLogin()}>
                Start Investigation
                <Icon d={icons.arrowRight} size={14} />
              </button>
            </div>

            {/* Stats row removed */}
          </div>

          {/* Right */}
          <div style={{ opacity:mounted?1:0,transform:mounted?"translateY(0)":"translateY(30px)",transition:"all 1s cubic-bezier(0.22,1,0.36,1) 0.35s",display:"flex",flexDirection:"column",gap:18 }}>
            <div style={{ height:260,background:"#050505",border:"1px solid #0f0f0f",borderRadius:14,overflow:"hidden",position:"relative",boxShadow:"0 20px 60px rgba(0,0,0,0.7)",animation:"drift 7s ease-in-out infinite" }}>
              <div style={{ position:"absolute",top:12,left:16,fontFamily:"'Space Mono',monospace",fontSize:9,color:"#1e1e1e",letterSpacing:2,zIndex:2,textTransform:"uppercase" }}>Network Topology — Live</div>
              <div style={{ position:"absolute",top:10,right:14,display:"flex",gap:6,alignItems:"center",zIndex:2 }}>
                <div style={{ width:5,height:5,borderRadius:"50%",background:"#22c55e",animation:"pulse 2s ease-in-out infinite" }} />
                <span style={{ fontFamily:"'Space Mono',monospace",fontSize:8,color:"#22c55e",letterSpacing:1 }}>ONLINE</span>
              </div>
              <NetworkGlobe />
            </div>
            <Terminal />
          </div>
        </div>
      </section>

      {/* ── STATS BAR REMOVED ── */}

      {/* ── FEATURES ── */}
      <section style={{ padding:"100px clamp(24px,5vw,72px)" }}>
        <div style={{ maxWidth:1200,margin:"0 auto" }}>
          <div style={{ marginBottom:60 }}>
            <div className="section-label">Platform Capabilities</div>
            <h2 style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"clamp(24px,3vw,40px)",color:"#fff",letterSpacing:-0.5,maxWidth:480,lineHeight:1.1 }}>
              Intelligence without compromise
            </h2>
            <p style={{ fontFamily:"'Space Mono',monospace",fontSize:"11px",color:"#2a2a2a",marginTop:14,maxWidth:400,lineHeight:1.9 }}>
              Every module engineered for high-precision operations. No noise. No distractions.
            </p>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14 }}>
            {features.map((f,i) => <FeatureCard key={f.title} {...f} delay={i*70} />)}
          </div>
        </div>
      </section>

      {/* ── INFO MODAL ── */}
      {activeModal && (
        <div style={{ position:"fixed",inset:0,zIndex:9999,background:"#000",display:"flex",flexDirection:"column",animation:"fadeIn 0.3s ease" }}>
          <div style={{ padding:"20px 32px",borderBottom:"1px solid #111",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#050505" }}>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:30,height:30,background:"#000",border:"1px solid #1e1e1e",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center" }}>
                <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:"#fff",lineHeight:1,userSelect:"none" }}>A</span>
              </div>
              <div style={{ fontFamily:"'Space Mono',monospace",fontSize:12,color:"#fff",letterSpacing:2,textTransform:"uppercase" }}>
                {activeModal === 'Docs' ? 'Documentation' : activeModal}
              </div>
            </div>
            <button onClick={()=>setActiveModal(null)} style={{ background:"none",border:"1px solid #222",borderRadius:6,padding:"8px 16px",color:"#aaa",fontFamily:"'Space Mono',monospace",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"all 0.2s" }} onMouseEnter={e=>{e.currentTarget.style.color="#fff";e.currentTarget.style.borderColor="#444";}} onMouseLeave={e=>{e.currentTarget.style.color="#aaa";e.currentTarget.style.borderColor="#222";}}>
              <Icon d={icons.arrowRight} size={12} /> Back to Home
            </button>
          </div>
          <div style={{ flex:1,overflowY:"auto",padding:"60px 24px" }}>
            <div style={{ maxWidth:800,margin:"0 auto",fontFamily:"'Space Mono',monospace",color:"#aaa",lineHeight:1.8,fontSize:13 }}>
              
              {activeModal === 'Docs' && (
                <>
                  <h1 style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:42,color:"#fff",marginBottom:24,letterSpacing:-1 }}>Abster OSINT Platform</h1>
                  <p style={{ marginBottom:40,fontSize:14,color:"#ccc" }}>A comprehensive Open Source Intelligence (OSINT) tool designed for investigators, security analysts, and journalists. Abster unifies data collection, graph analysis, and report generation in a secure, local environment.</p>

                  <h2 style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:24,color:"#fff",marginBottom:16,marginTop:48,borderBottom:"1px solid #111",paddingBottom:8 }}>Realistic Capabilities</h2>
                  <ul style={{ listStyle:"none",padding:0,display:"flex",flexDirection:"column",gap:16 }}>
                    <li style={{ display:"flex",gap:12 }}><span style={{ color:"#10B981" }}>■</span> <strong>AI-Assisted Analysis:</strong> Integration with multiple AI providers (Gemini, DeepSeek, Groq, OpenAI, etc.) to analyze texts, extract entities (people, organizations, locations), and summarize complex information.</li>
                    <li style={{ display:"flex",gap:12 }}><span style={{ color:"#10B981" }}>■</span> <strong>Relationship Mapping (Graphs):</strong> Interactive visualization of nodes and connections. Allows discovering criminal networks, corporate structures, or links between individuals visually.</li>
                    <li style={{ display:"flex",gap:12 }}><span style={{ color:"#10B981" }}>■</span> <strong>Evidence Management:</strong> Secure local storage of images, PDFs, videos, and text documents. Includes a built-in native viewer to preview evidence without leaving the platform.</li>
                    <li style={{ display:"flex",gap:12 }}><span style={{ color:"#10B981" }}>■</span> <strong>Timeline:</strong> Automatic chronological organization of events extracted during the investigation to reconstruct facts step by step.</li>
                    <li style={{ display:"flex",gap:12 }}><span style={{ color:"#10B981" }}>■</span> <strong>Local-First Privacy:</strong> All data, evidence, and graphs are stored locally in the user&rsquo;s browser via IndexedDB. There are no central servers storing case information.</li>
                  </ul>

                  <h2 style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:24,color:"#fff",marginBottom:16,marginTop:48,borderBottom:"1px solid #111",paddingBottom:8 }}>Technical Limitations</h2>
                  <ul style={{ listStyle:"none",padding:0,display:"flex",flexDirection:"column",gap:16 }}>
                    <li style={{ display:"flex",gap:12 }}><span style={{ color:"#ef4444" }}>■</span> <strong>Browser Storage:</strong> By using IndexedDB, the maximum capacity depends on the user&rsquo;s free hard drive space and browser quotas (usually several Gigabytes, but not unlimited).</li>
                    <li style={{ display:"flex",gap:12 }}><span style={{ color:"#ef4444" }}>■</span> <strong>Proprietary Formats:</strong> The native viewer does not support complex files like .docx or .xlsx to maintain performance and fidelity. These must be downloaded to be viewed.</li>
                    <li style={{ display:"flex",gap:12 }}><span style={{ color:"#ef4444" }}>■</span> <strong>External API Dependency:</strong> Automated analysis capability depends on the availability and quotas of the AI APIs configured by the user.</li>
                    <li style={{ display:"flex",gap:12 }}><span style={{ color:"#ef4444" }}>■</span> <strong>Data Volatility:</strong> If the user clears browser data (cache/cookies/local storage), all saved cases and evidence will be lost.</li>
                  </ul>

                  <h2 style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:24,color:"#fff",marginBottom:16,marginTop:48,borderBottom:"1px solid #111",paddingBottom:8 }}>Workflow</h2>
                  <div style={{ background:"#0a0a0a",border:"1px solid #111",borderRadius:8,padding:24 }}>
                    <p style={{ marginBottom:12 }}>1. <strong>Case Creation:</strong> Start a new investigation by assigning a codename.</p>
                    <p style={{ marginBottom:12 }}>2. <strong>Collection:</strong> Use the AI chat to dump information, upload documents, and extract key data.</p>
                    <p style={{ marginBottom:12 }}>3. <strong>Structuring:</strong> The AI will automatically extract entities and relationships, populating the Graph and Timeline.</p>
                    <p style={{ marginBottom:0 }}>4. <strong>Analysis:</strong> Review the Graph to find hidden connections and check the Reports Archive to verify original evidence.</p>
                  </div>
                </>
              )}

              {activeModal === 'Terms' && (
                <>
                  <h1 style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:42,color:"#fff",marginBottom:24,letterSpacing:-1 }}>Terms of Use</h1>
                  <p style={{ marginBottom:20 }}>Abster OSINT Platform is provided &ldquo;as is&rdquo;, without warranty of any kind, express or implied. By using this platform, you agree that you are solely responsible for your use of the tool and the information collected.</p>
                  <p style={{ marginBottom:20 }}>This is an open-source tool designed for research, journalism, and security analysis purposes. Using this platform for illegal activities, harassment, or violating third-party privacy is strictly prohibited by the project&rsquo;s ethics, although there are no technical controls to prevent it due to its decentralized and local nature.</p>
                </>
              )}

              {activeModal === 'Privacy' && (
                <>
                  <h1 style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:42,color:"#fff",marginBottom:24,letterSpacing:-1 }}>Privacy Policy</h1>
                  <p style={{ marginBottom:20 }}><strong>Absolute Privacy (Local-First).</strong> Abster is designed with privacy as a fundamental pillar.</p>
                  <ul style={{ listStyle:"none",padding:0,display:"flex",flexDirection:"column",gap:16 }}>
                    <li style={{ display:"flex",gap:12 }}><span style={{ color:"#10B981" }}>■</span> <strong>Zero Central Servers:</strong> We do not collect, transmit, or store your investigation data, cases, evidence, or graphs on any external server.</li>
                    <li style={{ display:"flex",gap:12 }}><span style={{ color:"#10B981" }}>■</span> <strong>Local Storage:</strong> All your information resides exclusively on your device&rsquo;s hard drive, managed by the browser through IndexedDB.</li>
                    <li style={{ display:"flex",gap:12 }}><span style={{ color:"#10B981" }}>■</span> <strong>Total Control:</strong> You own your data. If you clear your browser&rsquo;s cache or data, your information will be permanently deleted.</li>
                  </ul>
                </>
              )}

              {activeModal === 'Security' && (
                <>
                  <h1 style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:42,color:"#fff",marginBottom:24,letterSpacing:-1 }}>Security</h1>
                  <p style={{ marginBottom:20 }}>Abster&rsquo;s architecture minimizes attack vectors by not relying on cloud databases.</p>
                  <ul style={{ listStyle:"none",padding:0,display:"flex",flexDirection:"column",gap:16 }}>
                    <li style={{ display:"flex",gap:12 }}><span style={{ color:"#10B981" }}>■</span> <strong>API Key Management:</strong> Access keys for AI providers (OpenAI, Gemini, Groq, etc.) are saved locally and sent directly from your browser to the official APIs. They never pass through Abster servers.</li>
                    <li style={{ display:"flex",gap:12 }}><span style={{ color:"#10B981" }}>■</span> <strong>Evidence Isolation:</strong> Files uploaded to the Reports Archive are not uploaded to the internet; they are processed and stored as binary Blobs in your local environment.</li>
                  </ul>
                </>
              )}

              {activeModal === 'Contact' && (
                <>
                  <h1 style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:42,color:"#fff",marginBottom:24,letterSpacing:-1 }}>Contact & Author</h1>
                  <div style={{ display:"flex",gap:24,alignItems:"center",marginBottom:32,background:"#0a0a0a",padding:24,borderRadius:12,border:"1px solid #111" }}>
                    <div style={{ width:80,height:80,borderRadius:"50%",background:"#1e1e1e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:800,flexShrink:0 }}>FB</div>
                    <div>
                      <h2 style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:24,color:"#fff",marginBottom:8 }}>Frangel Barrera</h2>
                      <p style={{ fontSize:14,color:"#aaa",marginBottom:16 }}>Developer and researcher passionate about cybersecurity, OSINT, and artificial intelligence. Creator and lead maintainer of Abster OSINT Platform.</p>
                      <div style={{ display:"flex",gap:16,flexWrap:"wrap" }}>
                        <a href="https://github.com/frangelbarrera" target="_blank" rel="noreferrer" style={{ color:"#10B981",textDecoration:"none",display:"flex",alignItems:"center",gap:6,background:"#111",padding:"6px 12px",borderRadius:6,border:"1px solid #222" }}>
                          <Icon d={icons.terminal} size={14} /> GitHub: @frangelbarrera
                        </a>
                        <a href="https://x.com/frangelbarrera" target="_blank" rel="noreferrer" style={{ color:"#10B981",textDecoration:"none",display:"flex",alignItems:"center",gap:6,background:"#111",padding:"6px 12px",borderRadius:6,border:"1px solid #222" }}>
                          <Icon d={icons.globe} size={14} /> X (Twitter): @frangelbarrera
                        </a>
                      </div>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ borderTop:"1px solid #0a0a0a",padding:"28px clamp(24px,5vw,72px)",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:20,height:20,background:"#000",border:"1px solid #161616",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:11,color:"#fff",lineHeight:1 }}>A</span>
          </div>
          <span style={{ fontFamily:"'Space Mono',monospace",fontSize:"9px",color:"#1e1e1e",letterSpacing:2,textTransform:"uppercase" }}>© 2026 Abster OSINT Project</span>
        </div>
        <div style={{ display:"flex",gap:24 }}>
          {["Terms","Privacy","Security","Contact"].map(l => (
            <button key={l} onClick={() => setActiveModal(l)} style={{ background:"none",border:"none",fontFamily:"'Space Mono',monospace",fontSize:"9px",color:"#1e1e1e",letterSpacing:1,cursor:"pointer",transition:"color 0.2s",textTransform:"uppercase" }}
              onMouseEnter={e=>e.currentTarget.style.color="#444"} onMouseLeave={e=>e.currentTarget.style.color="#1e1e1e"}>
              {l}
            </button>
          ))}
        </div>
      </footer>
    </>
  );
}
