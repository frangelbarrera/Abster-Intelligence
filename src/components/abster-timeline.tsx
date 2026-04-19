"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

const EVENT_COLORS = {
  communication: { color: "#3B82F6", bg: "rgba(59,130,246,0.15)", label: "Communication" },
  movement: { color: "#EF4444", bg: "rgba(239,68,68,0.15)", label: "Movement" },
  transaction: { color: "#10B981", bg: "rgba(16,185,129,0.15)", label: "Transaction" },
  publication: { color: "#F59E0B", bg: "rgba(245,158,11,0.15)", label: "Publication" },
  meeting: { color: "#8B5CF6", bg: "rgba(139,92,246,0.15)", label: "Meeting" },
  breach: { color: "#F97316", bg: "rgba(249,115,22,0.15)", label: "Breach" },
  generic: { color: "#6B7280", bg: "rgba(107,114,128,0.15)", label: "Generic" },
};

const ENTITY_ICONS = {
  person: "👤", company: "🏢", location: "📍", email: "✉️", domain: "🌐", default: "●"
};

import { useAbsterStore } from '../store/absterStore';

function formatDate(date: Date, zoom = "months") {
  if (!date) return "";
  const d = new Date(date);
  if (zoom === "hours") return d.toLocaleString("en-US", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  if (zoom === "days") return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatDateFull(date: Date) {
  if (!date) return "";
  return new Date(date).toLocaleString("en-US", { weekday: "short", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function duration(start: Date, end: Date) {
  if (!end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  .mono { font-family: 'Space Mono', monospace; }

  .timeline-app {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #0A0A0A;
    overflow: hidden;
    color: #E5E5E5;
    font-family: 'DM Sans', sans-serif;
  }

  /* HEADER */
  .tl-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    height: 52px;
    border-bottom: 1px solid #222;
    background: #111;
    flex-shrink: 0;
    z-index: 10;
  }
  .tl-header-left { display: flex; align-items: center; gap: 16px; }
  .tl-logo {
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: #E5E5E5;
  }
  .tl-logo span { color: #6B7280; }
  .tl-op-badge {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.1em;
    color: #F97316;
    background: rgba(249,115,22,0.1);
    border: 1px solid rgba(249,115,22,0.3);
    padding: 3px 8px;
    border-radius: 3px;
  }
  .tl-header-right { display: flex; align-items: center; gap: 8px; }
  .tl-hbtn {
    width: 32px; height: 32px;
    background: #1A1A1A;
    border: 1px solid #222;
    border-radius: 6px;
    color: #A0A0A0;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
    transition: all 0.15s;
  }
  .tl-hbtn:hover { background: #222; color: #E5E5E5; }

  .tl-view-toggle {
    display: flex;
    background: #1A1A1A;
    border: 1px solid #222;
    border-radius: 6px;
    overflow: hidden;
  }
  .tl-vtbtn {
    padding: 5px 12px;
    font-size: 11px;
    font-family: 'Space Mono', monospace;
    background: transparent;
    border: none;
    color: #A0A0A0;
    cursor: pointer;
    transition: all 0.15s;
    letter-spacing: 0.05em;
  }
  .tl-vtbtn.active { background: rgba(229,229,229,0.08); color: #E5E5E5; }

  /* FILTERS */
  .tl-filters {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-bottom: 1px solid #222;
    background: #111;
    flex-shrink: 0;
    overflow-x: auto;
  }
  .tl-search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #1A1A1A;
    border: 1px solid #222;
    border-radius: 6px;
    padding: 6px 12px;
    min-width: 200px;
  }
  .tl-search-box input {
    background: transparent;
    border: none;
    outline: none;
    color: #E5E5E5;
    font-size: 12px;
    font-family: 'DM Sans', sans-serif;
    width: 150px;
  }
  .tl-search-box input::placeholder { color: #666; }

  .tl-type-toggle {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 5px;
    border-radius: 6px;
    background: #1A1A1A;
    border: 1px solid #222;
  }
  .tl-tt-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 8px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 11px;
    font-family: 'Space Mono', monospace;
    transition: all 0.15s;
    background: transparent;
    color: #A0A0A0;
    white-space: nowrap;
  }
  .tl-tt-btn.active { color: #E5E5E5; }
  .tl-tt-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

  .tl-filter-count {
    margin-left: auto;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: #666;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .tl-filter-count span { color: #A0A0A0; }

  /* MAIN AREA */
  .tl-main {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .tl-timeline-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }

  .tl-timeline-scroll {
    flex: 1;
    overflow: hidden;
    position: relative;
    cursor: grab;
    user-select: none;
  }
  .tl-timeline-scroll:active { cursor: grabbing; }
  .tl-timeline-scroll.list-mode { cursor: default; overflow-y: auto; }

  .tl-inner {
    position: relative;
    height: 100%;
    min-width: 100%;
  }

  .tl-axis {
    position: absolute;
    bottom: 100px;
    left: 0;
    right: 0;
    height: 1px;
    background: #2a2a2a;
  }

  .tl-axis-line {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #2a2a2a 10%, #2a2a2a 90%, transparent);
  }

  .tl-label {
    position: absolute;
    top: 12px;
    transform: translateX(-50%);
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: #666;
    white-space: nowrap;
    letter-spacing: 0.05em;
  }

  .tl-tick {
    position: absolute;
    top: -4px;
    width: 1px;
    height: 8px;
    background: #2a2a2a;
    transform: translateX(-50%);
  }

  .tl-event-dot {
    position: absolute;
    transform: translateX(-50%);
    cursor: pointer;
    transition: transform 0.15s, opacity 0.15s;
    z-index: 2;
  }
  .tl-event-dot.dimmed { opacity: 0.15; pointer-events: none; }
  .tl-event-dot:hover .tl-event-pip { transform: scale(1.3); }

  .tl-event-pip {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid;
    background: #0A0A0A;
    transition: transform 0.15s, box-shadow 0.15s;
    position: relative;
    z-index: 2;
  }
  .tl-event-pip.selected {
    width: 14px;
    height: 14px;
    box-shadow: 0 0 12px currentColor;
  }

  .tl-event-stem {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 1px;
    background: linear-gradient(to top, transparent, #2a2a2a);
    bottom: 10px;
  }

  .tl-event-label {
    position: absolute;
    transform: translateX(-50%);
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    white-space: nowrap;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #A0A0A0;
    transition: color 0.15s;
    text-align: center;
  }
  .tl-event-dot:hover .tl-event-label, .tl-event-dot.selected-ev .tl-event-label { color: #E5E5E5; }

  .tl-event-bar {
    position: absolute;
    height: 8px;
    border-radius: 4px;
    opacity: 0.8;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.15s;
    bottom: 100px;
    transform: translateY(50%);
  }
  .tl-event-bar:hover { opacity: 1; transform: translateY(50%) scaleY(1.4); }

  /* GAP INDICATOR */
  .tl-gap-indicator {
    position: absolute;
    bottom: 100px;
    height: 1px;
    border-top: 1px dashed rgba(107,114,128,0.3);
  }
  .tl-gap-label {
    position: absolute;
    top: -18px;
    left: 50%;
    transform: translateX(-50%);
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    color: rgba(107,114,128,0.5);
    white-space: nowrap;
    background: #0A0A0A;
    padding: 1px 4px;
    border-radius: 2px;
  }

  /* TODAY LINE */
  .tl-today-line {
    position: absolute;
    bottom: 60px;
    top: 20px;
    width: 1px;
    background: rgba(59,130,246,0.4);
    pointer-events: none;
  }
  .tl-today-badge {
    position: absolute;
    top: 16px;
    transform: translateX(-50%);
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    color: #3B82F6;
    background: rgba(59,130,246,0.1);
    border: 1px solid rgba(59,130,246,0.3);
    padding: 1px 5px;
    border-radius: 3px;
  }

  /* LIST MODE */
  .tl-list-view { padding: 20px; }
  .tl-list-group { margin-bottom: 32px; }
  .tl-list-group-header {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.1em;
    color: #666;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #222;
    text-transform: uppercase;
  }
  .tl-list-event {
    display: flex;
    gap: 12px;
    padding: 12px;
    background: #111;
    border: 1px solid #222;
    border-radius: 8px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.15s;
    border-left-width: 3px;
  }
  .tl-list-event:hover { background: #1A1A1A; }
  .tl-list-event.selected-ev { background: #1A1A1A; }
  .tl-list-event.dimmed { opacity: 0.2; }
  .tl-list-ev-time {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: #666;
    width: 80px;
    flex-shrink: 0;
    padding-top: 2px;
  }
  .tl-list-ev-title {
    font-size: 13px;
    font-weight: 500;
    color: #E5E5E5;
    margin-bottom: 3px;
  }
  .tl-list-ev-entity { font-size: 11px; color: #666; }
  .tl-list-ev-badge {
    margin-left: auto;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 3px;
    flex-shrink: 0;
    align-self: flex-start;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  /* DETAIL PANEL */
  .tl-detail-panel {
    width: 320px;
    background: #111;
    border-left: 1px solid #222;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
  }

  .tl-dp-header {
    padding: 16px;
    border-bottom: 1px solid #222;
    flex-shrink: 0;
  }
  .tl-dp-type-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }
  .tl-dp-type-dot { width: 8px; height: 8px; border-radius: 50%; }
  .tl-dp-type-label {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .tl-dp-title {
    font-size: 14px;
    font-weight: 600;
    color: #E5E5E5;
    line-height: 1.4;
    margin-bottom: 6px;
  }
  .tl-dp-date { font-family: 'Space Mono', monospace; font-size: 10px; color: #666; }

  .tl-dp-body { flex: 1; overflow-y: auto; padding: 16px; }
  .tl-dp-section { margin-bottom: 16px; }
  .tl-dp-label {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #666;
    margin-bottom: 6px;
  }
  .tl-dp-value { font-size: 12px; color: #A0A0A0; line-height: 1.5; }
  .tl-dp-value.highlight { color: #E5E5E5; }

  .tl-confidence-bar { height: 4px; background: #222; border-radius: 2px; overflow: hidden; margin-top: 6px; }
  .tl-confidence-fill { height: 100%; border-radius: 2px; transition: width 0.4s; }

  .tl-tag-list { display: flex; flex-wrap: wrap; gap: 4px; }
  .tl-tag {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    padding: 2px 7px;
    background: #1A1A1A;
    border: 1px solid #2a2a2a;
    border-radius: 3px;
    color: #666;
    letter-spacing: 0.05em;
  }

  .tl-source-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    padding: 2px 7px;
    border-radius: 3px;
    letter-spacing: 0.05em;
  }

  .tl-dp-actions { padding: 12px 16px; border-top: 1px solid #222; display: flex; gap: 8px; flex-shrink: 0; }
  .tl-dp-btn {
    flex: 1;
    padding: 7px;
    border-radius: 6px;
    border: 1px solid #222;
    background: #1A1A1A;
    color: #A0A0A0;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    cursor: pointer;
    transition: all 0.15s;
    letter-spacing: 0.05em;
  }
  .tl-dp-btn:hover { background: #222; color: #E5E5E5; }

  /* CONTROLS */
  .tl-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 20px;
    border-top: 1px solid #222;
    background: #111;
    flex-shrink: 0;
  }

  .tl-ctrl-group { display: flex; align-items: center; gap: 4px; }
  .tl-ctrl-sep { width: 1px; height: 20px; background: #222; }

  .tl-cbtn {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px;
    border-radius: 5px;
    border: 1px solid #222;
    background: #1A1A1A;
    color: #A0A0A0;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .tl-cbtn:hover { background: #2a2a2a; color: #E5E5E5; }
  .tl-cbtn.play { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.3); color: #3B82F6; }

  .tl-zoom-label { font-family: 'Space Mono', monospace; font-size: 10px; color: #666; min-width: 50px; text-align: center; }
  .tl-today-btn {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    padding: 5px 10px;
    border-radius: 5px;
    border: 1px solid rgba(59,130,246,0.3);
    background: rgba(59,130,246,0.08);
    color: #3B82F6;
    cursor: pointer;
    transition: all 0.15s;
    letter-spacing: 0.05em;
  }

  .tl-controls-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
  .tl-event-counter { font-family: 'Space Mono', monospace; font-size: 10px; color: #666; }
  .tl-add-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 14px;
    border-radius: 6px;
    border: 1px solid #2a2a2a;
    background: #1A1A1A;
    color: #E5E5E5;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    cursor: pointer;
    transition: all 0.15s;
    letter-spacing: 0.05em;
  }

  /* MINIMAP */
  .tl-minimap {
    position: absolute;
    bottom: 54px;
    left: 16px;
    width: 160px;
    height: 36px;
    background: #111;
    border: 1px solid #222;
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
  }
  .tl-minimap-inner { position: relative; width: 100%; height: 100%; }
  .tl-minimap-dot { position: absolute; width: 3px; height: 3px; border-radius: 50%; top: 50%; transform: translateY(-50%); }
  .tl-minimap-viewport {
    position: absolute;
    top: 0; bottom: 0;
    background: rgba(229,229,229,0.05);
    border: 1px solid rgba(229,229,229,0.15);
    border-radius: 2px;
  }

  /* MODAL */
  .tl-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    backdrop-filter: blur(4px);
  }
  .tl-modal {
    background: #111;
    border: 1px solid #2a2a2a;
    border-radius: 12px;
    width: 480px;
    max-height: 80vh;
    overflow-y: auto;
    padding: 24px;
  }
  .tl-modal-title {
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    letter-spacing: 0.1em;
    color: #E5E5E5;
    margin-bottom: 20px;
    text-transform: uppercase;
  }
  .tl-form-row { margin-bottom: 14px; }
  .tl-form-label {
    display: block;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.1em;
    color: #666;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .tl-form-input, .tl-form-select, .tl-form-textarea {
    width: 100%;
    padding: 8px 12px;
    background: #1A1A1A;
    border: 1px solid #222;
    border-radius: 6px;
    color: #E5E5E5;
    font-size: 12px;
    outline: none;
  }
  .tl-modal-actions { display: flex; gap: 8px; margin-top: 20px; justify-content: flex-end; }
  .tl-modal-btn {
    padding: 8px 20px;
    border-radius: 6px;
    border: 1px solid #222;
    background: #1A1A1A;
    color: #A0A0A0;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    cursor: pointer;
  }

  /* PATTERN ALERTS */
  .tl-pattern-bar {
    display: flex;
    gap: 8px;
    padding: 8px 20px;
    background: rgba(249,115,22,0.04);
    border-bottom: 1px solid rgba(249,115,22,0.1);
    overflow-x: auto;
    flex-shrink: 0;
  }
  .tl-pattern-alert {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 4px;
    background: rgba(249,115,22,0.08);
    border: 1px solid rgba(249,115,22,0.2);
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: #F97316;
    white-space: nowrap;
  }
  .tl-pattern-dot { width: 5px; height: 5px; border-radius: 50%; background: #F97316; }
`;

function AddEventModal({ onClose, onAdd, initialData, isEdit }: { onClose: () => void, onAdd: (data: any, id?: string) => void, initialData?: any, isEdit?: boolean }) {
  const [form, setForm] = useState({ 
    title: initialData?.title || "", 
    type: initialData?.type || "generic", 
    date: initialData?.date ? new Date(initialData.date.getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "", 
    description: initialData?.description || "", 
    entityName: initialData?.entityName || "", 
    entityType: initialData?.entityType || "person", 
    tags: initialData?.tags ? initialData.tags.join(", ") : "" 
  });
  const [error, setError] = useState("");
  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    if (error) setError("");
  };
  const handleSubmit = () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!form.date) {
      setError("Date is required.");
      return;
    }
    const parsedDate = new Date(form.date);
    if (isNaN(parsedDate.getTime())) {
      setError("Invalid date format.");
      return;
    }
    onAdd({ ...form, date: parsedDate, tags: form.tags.split(",").map((t: string) => t.trim()).filter(Boolean), source: initialData?.source || "manual", confidence: initialData?.confidence || 0.8 }, isEdit ? initialData?.id : undefined);
    onClose();
  };
  return (
    <div className="tl-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="tl-modal">
        <div className="tl-modal-title">// {isEdit ? 'EDIT EVENT' : 'ADD EVENT'}</div>
        {error && <div style={{ color: "#EF4444", fontSize: "12px", marginBottom: "10px", fontFamily: "monospace" }}>ERROR: {error}</div>}
        <div className="tl-form-row">
          <label className="tl-form-label">Title *</label>
          <input className="tl-form-input" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Event title..." />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div className="tl-form-row">
            <label className="tl-form-label">Date & Time *</label>
            <input className="tl-form-input" type="datetime-local" value={form.date} onChange={e => set("date", e.target.value)} />
          </div>
          <div className="tl-form-row">
            <label className="tl-form-label">Type</label>
            <select className="tl-form-select" value={form.type} onChange={e => set("type", e.target.value)}>
              {Object.entries(EVENT_COLORS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
        <div className="tl-form-row">
          <label className="tl-form-label">Description</label>
          <textarea className="tl-form-textarea" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Event details..." style={{ minHeight: "70px" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div className="tl-form-row">
            <label className="tl-form-label">Entity Name</label>
            <input className="tl-form-input" value={form.entityName} onChange={e => set("entityName", e.target.value)} placeholder="Viktor Kozlov" />
          </div>
          <div className="tl-form-row">
            <label className="tl-form-label">Entity Type</label>
            <select className="tl-form-select" value={form.entityType} onChange={e => set("entityType", e.target.value)}>
              {Object.entries(ENTITY_ICONS).filter(([k])=>k!=='default').map(([k])=><option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>
        <div className="tl-form-row">
          <label className="tl-form-label">Tags (comma separated)</label>
          <input className="tl-form-input" value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="tag1, tag2, tag3" />
        </div>
        <div className="tl-modal-actions">
          <button className="tl-modal-btn" onClick={onClose}>Cancel</button>
          <button className="tl-modal-btn" style={{ background: "rgba(229,229,229,0.08)", borderColor: "rgba(229,229,229,0.2)", color: "#E5E5E5" }} onClick={handleSubmit}>{isEdit ? 'Save Changes' : '+ Add Event'}</button>
        </div>
      </div>
    </div>
  );
}

function DetailPanel({ event, onClose, onDelete, onEdit, onDuplicate }: { event: any, onClose: () => void, onDelete: (id: string) => void, onEdit: () => void, onDuplicate: () => void }) {
  if (!event) return null;
  const col = (EVENT_COLORS as any)[event.type];
  const dur = event.endDate ? duration(event.date, event.endDate) : null;
  const conf = event.confidence ?? 0.5;
  const confColor = conf >= 0.8 ? "#10B981" : conf >= 0.5 ? "#F59E0B" : "#EF4444";
  const sourceColors: any = { manual: "#6B7280", imported: "#3B82F6", api: "#8B5CF6", exif: "#F59E0B" };
  return (
    <div className="tl-detail-panel">
      <div className="tl-dp-header">
        <div className="tl-dp-type-row">
          <div className="tl-dp-type-dot" style={{ background: col.color }} />
          <span className="tl-dp-type-label mono" style={{ color: col.color }}>{col.label}</span>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>
        <div className="tl-dp-title">{event.title}</div>
        <div className="tl-dp-date mono">{formatDateFull(event.date)}</div>
        {dur && <div className="tl-dp-date mono" style={{ marginTop: 3 }}>⏱ {dur}</div>}
      </div>
      <div className="tl-dp-body">
        {event.description && (
          <div className="tl-dp-section">
            <div className="tl-dp-label">Description</div>
            <div className="tl-dp-value">{event.description}</div>
          </div>
        )}
        {event.entityName && (
          <div className="tl-dp-section">
            <div className="tl-dp-label">Entity</div>
            <div className="tl-dp-value highlight">
              {(ENTITY_ICONS as any)[event.entityType] || "●"} {event.entityName}
              {event.entityType && <span style={{ color: "#666", marginLeft: 6, fontSize: 11 }}>• {event.entityType}</span>}
            </div>
          </div>
        )}
        {event.locationName && (
          <div className="tl-dp-section">
            <div className="tl-dp-label">Location</div>
            <div className="tl-dp-value highlight">📍 {event.locationName}</div>
            {event.coordinates && <div className="tl-dp-value mono" style={{ marginTop: 4, fontSize: 10 }}>{event.coordinates.lat.toFixed(4)}, {event.coordinates.lng.toFixed(4)}</div>}
          </div>
        )}
        {event.tags?.length > 0 && (
          <div className="tl-dp-section">
            <div className="tl-dp-label">Tags</div>
            <div className="tl-tag-list">{event.tags.map((t: string) => <span key={t} className="tl-tag">{t}</span>)}</div>
          </div>
        )}
        <div className="tl-dp-section">
          <div className="tl-dp-label">Confidence — {Math.round(conf * 100)}%</div>
          <div className="tl-confidence-bar">
            <div className="tl-confidence-fill" style={{ width: `${conf * 100}%`, background: confColor }} />
          </div>
        </div>
        <div className="tl-dp-section">
          <div className="tl-dp-label">Source</div>
          <span className="tl-source-badge" style={{ background: `${sourceColors[event.source]}20`, border: `1px solid ${sourceColors[event.source]}40`, color: sourceColors[event.source] }}>
            ◆ {event.source}
          </span>
        </div>
        <div className="tl-dp-section">
          <div className="tl-dp-label">Event ID</div>
          <div className="tl-dp-value mono" style={{ fontSize: 10 }}>EVT-{event.id.padStart(4, "0")}</div>
        </div>
      </div>
      <div className="tl-dp-actions">
        <button className="tl-dp-btn" onClick={onEdit}>Edit</button>
        <button className="tl-dp-btn" onClick={onDuplicate}>Dupe</button>
        <button className="tl-dp-btn" style={{ color: "#EF4444" }} onClick={() => onDelete(event.id)}>Delete</button>
      </div>
    </div>
  );
}

export default function AbsterTimeline({ onClose }: { onClose?: () => void }) {
  const { entities: allEntities, relations: allRelations, activeCaseId, addEntity, removeEntity, removeRelation, updateEntity } = useAbsterStore();
  const entities = useMemo(() => allEntities.filter(e => e.caseId === activeCaseId), [allEntities, activeCaseId]);
  const relations = useMemo(() => allRelations.filter(r => r.caseId === activeCaseId), [allRelations, activeCaseId]);
  
  // Map global entities and relations with dates to timeline events
  const storeEvents = useMemo(() => {
    const entityEvents = entities
      .filter(e => e.startDate || e.type === 'EVENT')
      .map(e => ({
        id: e.id,
        title: e.name,
        date: e.startDate ? new Date(e.startDate) : new Date(),
        endDate: e.endDate ? new Date(e.endDate) : undefined,
        type: e.metadata?.eventType || "generic",
        entityName: e.name,
        entityType: e.type.toLowerCase(),
        description: e.notes || "",
        source: e.source || "manual",
        confidence: e.confidence ?? 1,
        tags: e.metadata?.tags || [],
        locationName: e.metadata?.locationName,
        coordinates: e.metadata?.lat && e.metadata?.lng ? { lat: e.metadata.lat, lng: e.metadata.lng } : undefined,
      }));

    const relationEvents = relations
      .filter(r => r.date)
      .map(r => {
        const source = entities.find(e => e.id === r.source);
        const target = entities.find(e => e.id === r.target);
        return {
          id: r.id,
          title: r.label || `${source?.name || 'Unknown'} - ${r.type} - ${target?.name || 'Unknown'}`,
          date: new Date(r.date!),
          type: "transaction",
          entityName: `${source?.name || 'Unknown'} → ${target?.name || 'Unknown'}`,
          entityType: "generic",
          description: `Relation: ${r.type}. Strength: ${r.strength || 5}`,
          source: "manual",
          confidence: r.strength ? r.strength / 10 : 0.5,
          tags: [r.type],
        };
      });

    const all = [...entityEvents, ...relationEvents];
    return all;
  }, [entities, relations, activeCaseId]);

  if (!activeCaseId) {
    return (
      <div className="tl-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280", fontFamily: "monospace", height: "100%" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "10px" }}>⚠️ NO ACTIVE CASE</div>
          <div>Please select a case from the dashboard to view the timeline.</div>
        </div>
      </div>
    );
  }

  const allEvents = storeEvents;

  const [events, setEvents] = useState(allEvents);

  useEffect(() => {
    setEvents(allEvents);
  }, [allEvents]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"timeline" | "list">("timeline");
  const [modalState, setModalState] = useState<{isOpen: boolean, initialData: any, isEdit: boolean}>({ isOpen: false, initialData: null, isEdit: false });
  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState(Object.keys(EVENT_COLORS));
  const [offset, setOffset] = useState(0);
  const [scale, setScale] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, startOffset: 0 });
  const playRef = useRef<any>(null);

  const sorted = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
  const minDate = sorted.length ? sorted[0].date.getTime() : Date.now() - 1e11;
  const maxDate = sorted.length ? sorted[sorted.length - 1].date.getTime() : Date.now();
  const totalMs = Math.max(maxDate - minDate, 1e10);
  const today = Date.now();

  const filtered = events.filter(e => {
    const typeOk = activeTypes.includes(e.type);
    const searchOk = !search || e.title.toLowerCase().includes(search.toLowerCase()) || (e.description || "").toLowerCase().includes(search.toLowerCase()) || (e.entityName || "").toLowerCase().includes(search.toLowerCase());
    return typeOk && searchOk;
  });

  const filteredIds = new Set(filtered.map(e => e.id));
  const selectedEvent = events.find(e => e.id === selectedId);

  const canvasWidth = () => canvasRef.current?.offsetWidth || 900;
  const px = useCallback((date: Date | number) => {
    const ms = new Date(date).getTime();
    const ratio = (ms - minDate) / totalMs;
    const w = canvasWidth();
    const scaledW = w * scale;
    const visibleStart = -offset;
    return ratio * scaledW - visibleStart + 60;
  }, [minDate, totalMs, offset, scale]);

  const getTicks = () => {
    const ticks: any[] = [];
    const start = new Date(minDate);
    const end = new Date(maxDate);
    const y1 = start.getFullYear(), y2 = end.getFullYear();
    for (let y = y1; y <= y2 + 1; y++) {
      const d = new Date(y, 0, 1);
      ticks.push({ date: d, label: String(y), major: true });
      for (let m = 1; m < 12; m++) {
        const md = new Date(y, m, 1);
        if (scale > 1.5) ticks.push({ date: md, label: md.toLocaleString("en-US", { month: "short" }), major: false });
      }
    }
    return ticks;
  };

  const handleMouseDown = (e: any) => {
    if (viewMode !== "timeline") return;
    dragRef.current = { active: true, startX: e.clientX, startOffset: offset };
  };
  const handleMouseMove = (e: any) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    setOffset(Math.max(0, dragRef.current.startOffset - dx));
  };
  const handleMouseUp = () => { dragRef.current.active = false; };

  const handleWheel = (e: any) => {
    if (viewMode !== "timeline") return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale(s => Math.max(0.5, Math.min(8, s + delta)));
  };

  const fitAll = () => { setScale(1); setOffset(0); };
  const goToday = () => {
    const ratio = (today - minDate) / totalMs;
    const w = canvasWidth();
    setOffset(Math.max(0, ratio * w * scale - w / 2));
  };
  const zoomIn = () => setScale(s => Math.min(8, s * 1.3));
  const zoomOut = () => setScale(s => Math.max(0.5, s / 1.3));

  useEffect(() => {
    if (isPlaying) {
      let idx = 0;
      const sortedFiltered = [...filtered].sort((a, b) => a.date.getTime() - b.date.getTime());
      if (selectedId) idx = sortedFiltered.findIndex(e => e.id === selectedId);
      playRef.current = setInterval(() => {
        idx = (idx + 1) % sortedFiltered.length;
        const ev = sortedFiltered[idx];
        if (ev) {
          setSelectedId(ev.id);
          const ratio = (ev.date.getTime() - minDate) / totalMs;
          const w = canvasWidth();
          setOffset(Math.max(0, ratio * w * scale - w / 2));
        }
      }, 1500);
    } else { clearInterval(playRef.current); }
    return () => clearInterval(playRef.current);
  }, [isPlaying, scale, filtered, selectedId, minDate, totalMs]);

  const toggleType = (type: string) => {
    setActiveTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const handleSaveEvent = (data: any, editId?: string) => {
    if (editId && modalState.isEdit) {
      updateEntity(editId, {
        name: data.title,
        description: data.description,
        startDate: data.date.toISOString(),
        metadata: {
          eventType: data.type,
          tags: data.tags,
          entityName: data.entityName,
          entityType: data.entityType
        }
      });
      // Force selectedId refresh implicitly by state update
    } else {
      const newId = String(Date.now());
      addEntity({
        id: newId,
        caseId: activeCaseId!,
        type: 'EVENT',
        name: data.title,
        description: data.description,
        startDate: data.date.toISOString(),
        source: data.source,
        confidence: data.confidence,
        metadata: {
          eventType: data.type,
          tags: data.tags,
          entityName: data.entityName,
          entityType: data.entityType
        }
      });
      setSelectedId(newId);
    }
    setModalState({ isOpen: false, initialData: null, isEdit: false });
  };

  const deleteEvent = (id: string) => {
    if (entities.some(e => e.id === id)) {
      removeEntity(id);
    } else if (relations.some(r => r.id === id)) {
      removeRelation(id);
    }
    setSelectedId(null);
  };

  const gaps: any[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i].date.getTime();
    const b = sorted[i + 1].date.getTime();
    const days = (b - a) / 86400000;
    if (days > 90) gaps.push({ start: sorted[i].date, end: sorted[i + 1].date, days: Math.round(days) });
  }

  const groupedByYear = filtered.reduce((acc: any, ev) => {
    const y = ev.date.getFullYear();
    if (!acc[y]) acc[y] = [];
    acc[y].push(ev);
    return acc;
  }, {});

  const ticks = getTicks();
  const todayPx = px(today);
  const AXIS_Y = 220;

  const zoomLabel = scale < 0.8 ? "DECADES" : scale < 1.2 ? "YEARS" : scale < 2.5 ? "MONTHS" : scale < 5 ? "WEEKS" : "DAYS";

  return (
    <>
      <style>{styles}</style>
      <div className="timeline-app">
        {/* HEADER */}
        <div className="tl-header">
          <div className="tl-header-left">
            {onClose && (
              <button onClick={onClose} className="flex items-center gap-1 px-2 py-1 bg-[#111] border border-[#333] text-[#A0A0A0] rounded cursor-pointer text-[9px] tracking-widest font-bold transition-all hover:bg-[#222] mr-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <span>←</span> BACK
              </button>
            )}
            {!onClose && <div className="tl-logo mono">ABSTER<span>/</span>TIMELINE</div>}
            <div className="tl-op-badge">OP: RED GHOST</div>
          </div>
          <div className="tl-header-right">
            <div className="tl-view-toggle">
              <button className={`tl-vtbtn mono ${viewMode === "timeline" ? "active" : ""}`} onClick={() => setViewMode("timeline")}>TIMELINE</button>
              <button className={`tl-vtbtn mono ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")}>LIST</button>
            </div>
            <button className="tl-hbtn" title="Export JSON" onClick={() => { const blob = new Blob([JSON.stringify(events, null, 2)], {type:"application/json"}); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "abster-events.json"; a.click(); }}>⬇</button>
            <button className="tl-hbtn" title="Settings">⚙</button>
          </div>
        </div>

        {/* PATTERN ALERTS */}
        {gaps.length > 0 && (
          <div className="tl-pattern-bar scrollbar-custom">
            <span style={{ fontFamily: "Space Mono", fontSize: 9, color: "#666", letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0 }}>PATTERNS</span>
            {gaps.map((g, i) => (
              <div key={i} className="tl-pattern-alert">
                <div className="tl-pattern-dot" />
                GAP: {g.days} days without activity ({new Date(g.start).toLocaleDateString("en-US", { month: "short", year: "numeric" })} → {new Date(g.end).toLocaleDateString("en-US", { month: "short", year: "numeric" })})
              </div>
            ))}
          </div>
        )}

        {/* FILTERS */}
        <div className="tl-filters scrollbar-custom">
          <div className="tl-search-box">
            <span style={{ color: "#666", fontSize: 12 }}>🔍</span>
            <input placeholder="Search events, entities..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 12 }}>✕</button>}
          </div>
          <div className="tl-type-toggle">
            {Object.entries(EVENT_COLORS).map(([k, v]) => (
              <button key={k} className={`tl-tt-btn ${activeTypes.includes(k) ? "active" : ""}`} onClick={() => toggleType(k)} style={{ opacity: activeTypes.includes(k) ? 1 : 0.4 }}>
                <div className="tl-tt-dot" style={{ background: v.color }} />
                {v.label}
              </button>
            ))}
          </div>
          <div className="tl-filter-count mono">
            Showing <span>{filtered.length}</span> of <span>{events.length}</span> events
          </div>
        </div>

        {/* MAIN AREA */}
        <div className="tl-main">
          <div className="tl-timeline-area">
            <div
              ref={canvasRef}
              className={`tl-timeline-scroll ${viewMode === "list" ? "list-mode" : ""}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              {viewMode === "timeline" ? (
                <div className="tl-inner" style={{ height: "100%" }}>
                  {/* Today line */}
                  <div className="tl-today-line" style={{ left: todayPx }}>
                    <div className="tl-today-badge">TODAY</div>
                  </div>

                  {/* Gaps */}
                  {gaps.map((g, i) => {
                    const x1 = px(g.start), x2 = px(g.end);
                    return (
                      <div key={i} className="tl-gap-indicator" style={{ left: x1, width: x2 - x1 }}>
                        <div className="tl-gap-label">{g.days}d gap</div>
                      </div>
                    );
                  })}

                  {/* Axis */}
                  <div className="tl-axis" style={{ bottom: AXIS_Y - 200 + "px" }}>
                    <div className="tl-axis-line" />
                    {ticks.map((t, i) => {
                      const x = px(t.date);
                      const currentWidth = canvasWidth();
                      if (x < -60 || x > currentWidth + 60) return null;
                      return (
                        <div key={i}>
                          <div className="tl-tick" style={{ left: x, height: t.major ? 10 : 6 }} />
                          {t.major && <div className="tl-label mono" style={{ left: x }}>{t.label}</div>}
                          {!t.major && scale > 2 && <div className="tl-label mono" style={{ left: x, fontSize: 9, opacity: 0.6 }}>{t.label}</div>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Events */}
                  {events.map((ev, i) => {
                    const x = px(ev.date);
                    const col = (EVENT_COLORS as any)[ev.type];
                    const isSelected = selectedId === ev.id;
                    const isDimmed = !filteredIds.has(ev.id);
                    const row = i % 3;
                    const yOffset = [80, 140, 180][row];
                    const axisY = 200;

                    if ((ev as any).endDate) {
                      const x2 = px((ev as any).endDate);
                      return (
                        <div
                          key={ev.id}
                          className={`tl-event-bar ${isDimmed ? "dimmed" : ""} ${isSelected ? "selected-ev" : ""}`}
                          style={{ left: x, width: Math.max(x2 - x, 4), background: col.color, bottom: axisY - 4, opacity: isDimmed ? 0.15 : (isSelected ? 1 : 0.7) }}
                          onClick={() => !isDimmed && setSelectedId(isSelected ? null : ev.id)}
                          title={ev.title}
                        />
                      );
                    }

                    return (
                      <div
                        key={ev.id}
                        className={`tl-event-dot ${isDimmed ? "dimmed" : ""} ${isSelected ? "selected-ev" : ""}`}
                        style={{ left: x, bottom: yOffset }}
                        onClick={() => !isDimmed && setSelectedId(isSelected ? null : ev.id)}
                      >
                        <div className="tl-event-label" style={{ bottom: "100%", marginBottom: 4, left: "50%" }}>{ev.title}</div>
                        <div className="tl-event-stem" style={{ height: yOffset - (200) + 20 }} />
                        <div
                          className={`tl-event-pip ${isSelected ? "selected" : ""}`}
                          style={{ borderColor: col.color, color: col.color, background: isSelected ? col.bg : "#0A0A0A", boxShadow: isSelected ? `0 0 12px ${col.color}` : "none" }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="tl-list-view">
                  {Object.entries(groupedByYear).sort(([a]: any, [b]: any) => a - b).map(([year, evs]: any) => (
                    <div key={year} className="tl-list-group">
                      <div className="tl-list-group-header mono">{year} — {evs.length} events</div>
                      {evs.sort((a: any, b: any) => a.date.getTime() - b.date.getTime()).map((ev: any) => {
                        const col = (EVENT_COLORS as any)[ev.type];
                        const isDimmed = !filteredIds.has(ev.id);
                        return (
                          <div
                            key={ev.id}
                            className={`tl-list-event ${selectedId === ev.id ? "selected-ev" : ""} ${isDimmed ? "dimmed" : ""}`}
                            style={{ borderLeftColor: col.color }}
                            onClick={() => !isDimmed && setSelectedId(selectedId === ev.id ? null : ev.id)}
                          >
                            <div className="tl-list-ev-time mono">{formatDate(ev.date, "days")}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="tl-list-ev-title">{ev.title}</div>
                              {ev.entityName && <div className="tl-list-ev-entity">{(ENTITY_ICONS as any)[ev.entityType] || "●"} {ev.entityName}</div>}
                            </div>
                            <span className="tl-list-ev-badge" style={{ background: col.bg, color: col.color, border: `1px solid ${col.color}40` }}>{ev.type}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* MINIMAP */}
              {viewMode === "timeline" && (
                <div className="tl-minimap" onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  const w = canvasWidth();
                  setOffset(Math.max(0, ratio * w * scale - w / 2));
                }}>
                  <div className="tl-minimap-inner">
                    {events.map(ev => {
                      const ratio = (ev.date.getTime() - minDate) / totalMs;
                      const col = (EVENT_COLORS as any)[ev.type];
                      return <div key={ev.id} className="tl-minimap-dot" style={{ left: `${ratio * 100}%`, background: col.color }} />;
                    })}
                    <div className="tl-minimap-viewport" style={{ left: `${(offset / (canvasWidth() * scale)) * 100}%`, width: `${(1 / scale) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* CONTROLS */}
            <div className="tl-controls">
              <div className="tl-ctrl-group">
                <button className="tl-cbtn" title="First event" onClick={() => { fitAll(); const first = sorted[0]; if (first) setSelectedId(first.id); }}>⏮</button>
                <button className={`tl-cbtn play ${isPlaying ? "active" : ""}`} title="Play" onClick={() => setIsPlaying(p => !p)}>{isPlaying ? "⏸" : "▶"}</button>
                <button className="tl-cbtn" title="Last event" onClick={() => { const last = sorted[sorted.length - 1]; if (last) { setSelectedId(last.id); const ratio = (last.date.getTime() - minDate) / totalMs; const w = canvasWidth(); setOffset(Math.max(0, ratio * w * scale - w / 2)); } }}>⏭</button>
              </div>
              <div className="tl-ctrl-sep" />
              {viewMode === "timeline" && (
                <>
                  <div className="tl-ctrl-group">
                    <button className="tl-cbtn" onClick={zoomOut}>−</button>
                    <span className="tl-zoom-label mono">{zoomLabel}</span>
                    <button className="tl-cbtn" onClick={zoomIn}>+</button>
                    <button className="tl-cbtn" title="Fit all" onClick={fitAll}>⊡</button>
                  </div>
                  <div className="tl-ctrl-sep" />
                  <button className="tl-today-btn mono" onClick={goToday}>TODAY</button>
                </>
              )}
              <div className="tl-controls-right">
                <span className="tl-event-counter mono">{sorted.length} events · {new Date(minDate).getFullYear()}–{new Date(maxDate).getFullYear()}</span>
                <button className="tl-add-btn mono" onClick={() => setModalState({ isOpen: true, initialData: null, isEdit: false })}>+ EVENT</button>
              </div>
            </div>
          </div>

          {/* DETAIL PANEL */}
          {selectedEvent ? (
            <DetailPanel 
              event={selectedEvent} 
              onClose={() => setSelectedId(null)} 
              onDelete={deleteEvent}
              onEdit={() => setModalState({ isOpen: true, initialData: selectedEvent, isEdit: true })}
              onDuplicate={() => setModalState({ isOpen: true, initialData: {...selectedEvent, title: `${selectedEvent.title} (Copy)`}, isEdit: false })}
            />
          ) : (
            <div className="tl-detail-panel" style={{ display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "1px solid #222" }}>
              <div style={{ textAlign: "center", color: "#666" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
                <div style={{ fontFamily: "Space Mono", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>Select an event</div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL */}
        {modalState.isOpen && <AddEventModal onClose={() => setModalState({ isOpen: false, initialData: null, isEdit: false })} onAdd={handleSaveEvent} initialData={modalState.initialData} isEdit={modalState.isEdit} />}
      </div>
    </>
  );
}
