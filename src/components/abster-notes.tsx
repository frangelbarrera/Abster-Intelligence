"use client";

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import { useAbsterStore } from '../store/absterStore';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

export default function AbsterNotes({ onClose }: { onClose?: () => void }) {
  const [value, setValue] = useState('');
  const [mounted, setMounted] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const activeCaseId = useAbsterStore(state => state.activeCaseId);
  const user = useAbsterStore(state => state.currentUser);
  const addCase = useAbsterStore(state => state.addCase);
  const setActiveCase = useAbsterStore(state => state.setActiveCase);
  
  // To prevent infinite loops between local changes and remote updates
  const isLocalUpdate = useRef(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastSavedValue = useRef('');

  useEffect(() => {
    setMounted(true);
    return () => {
      // Allow pending saves to complete even if unmounted
    };
  }, []);

  useEffect(() => {
    isLocalUpdate.current = false; // Reset on case change

    if (!activeCaseId || !user) {
      if (!isLocalUpdate.current) {
        setValue('');
        lastSavedValue.current = '';
      }
      return;
    }

    let isMounted = true;
    const loadNote = async () => {
      try {
        const { db } = await import('../lib/db');
        const note = await db.notes.get(activeCaseId);
        if (isMounted) {
          if (note) {
            setValue(note.content);
            lastSavedValue.current = note.content;
          } else {
            setValue('');
            lastSavedValue.current = '';
          }
        }
      } catch (e) {
        console.error("Error loading note from local DB", e);
      }
    };
    
    loadNote();
    
    return () => { isMounted = false; };
  }, [activeCaseId, user]);

  const saveNotes = async (content: string) => {
    if (!user) return;
    if (content === lastSavedValue.current) return;

    let currentCaseId = activeCaseId;

    if (!currentCaseId) {
      currentCaseId = crypto.randomUUID();
      await addCase({
        id: currentCaseId,
        codeName: "OP-NOTES",
        title: "Field Notes",
        description: "Auto-generated case for field notes.",
        status: "active",
        priority: "medium",
        classification: "CONFIDENTIAL",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        leadInvestigator: user.displayName || "OPERATIVE",
        team: [],
        stats: { entityCount: 0, locationCount: 0, eventCount: 0, toolResultsCount: 0, evidenceCount: 0 },
        tags: ["notes"],
        activityLog: [],
        ownerId: user.uid
      });
      setActiveCase(currentCaseId);
    }

    setSyncing(true);
    try {
      const { db } = await import('../lib/db');
      await db.notes.put({
        id: currentCaseId,
        caseId: currentCaseId,
        content: content,
        ownerId: user.uid,
        updatedAt: new Date().toISOString()
      });
      lastSavedValue.current = content;
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleChange = (content: string, delta: any, source: string) => {
    setValue(content);
    
    if (source !== 'user') return; // Ignore API/initialization changes for saving
    
    isLocalUpdate.current = true;
    
    if (!user) return;
    
    setSyncing(true);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    
    saveTimeout.current = setTimeout(() => {
      saveNotes(content);
    }, 1500); // 1.5 second debounce
  };

  const handleManualSave = () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveNotes(value);
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image', 'video'],
      ['clean']
    ],
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-full bg-[#000] text-gray-200 p-6 overflow-hidden" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onClose && (
            <button onClick={() => {
              if (saveTimeout.current) clearTimeout(saveTimeout.current);
              if (value !== lastSavedValue.current) {
                saveNotes(value);
              }
              onClose();
            }} className="flex items-center gap-1 px-2 py-1 bg-[#111] border border-[#333] text-[#A0A0A0] rounded cursor-pointer text-[9px] tracking-widest font-bold transition-all hover:bg-[#222]">
              <span>←</span> BACK
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-red-600 tracking-widest uppercase flex items-center gap-3">
              <span className="text-xl">📝</span> Field Notes
            </h2>
            <p className="text-xs text-gray-500 mt-1 tracking-wider uppercase">
              // Secure Cloud Storage Enabled. Auto-saving active.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleManualSave}
            disabled={syncing || value === lastSavedValue.current}
            className={`px-4 py-1.5 rounded text-[10px] uppercase tracking-widest transition-all duration-200 border ${
              syncing || value === lastSavedValue.current
                ? 'bg-transparent border-[#1a1a1a] text-gray-600 cursor-not-allowed'
                : 'bg-red-600/10 border-red-600/30 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-600'
            }`}
          >
            {syncing ? 'Saving...' : 'Manual Save'}
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${syncing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
            <span className={`text-xs uppercase tracking-widest ${syncing ? 'text-yellow-500' : 'text-green-500'}`}>
              {syncing ? 'Syncing...' : 'Synced'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg flex flex-col custom-quill-container shadow-2xl">
        <ReactQuill 
          theme="snow" 
          value={value} 
          onChange={handleChange} 
          modules={modules}
          className="h-full flex flex-col"
          placeholder="Inicia tu reporte de investigación aquí... (Soporta imágenes, enlaces y formato)"
        />
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-quill-container .ql-toolbar {
          background-color: #111;
          border-color: #1a1a1a;
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
        }
        .custom-quill-container .ql-toolbar button {
          color: #a0a0a0;
        }
        .custom-quill-container .ql-toolbar button:hover,
        .custom-quill-container .ql-toolbar button.ql-active {
          color: #fff;
        }
        .custom-quill-container .ql-toolbar .ql-stroke {
          stroke: #a0a0a0;
        }
        .custom-quill-container .ql-toolbar button:hover .ql-stroke,
        .custom-quill-container .ql-toolbar button.ql-active .ql-stroke {
          stroke: #fff;
        }
        .custom-quill-container .ql-toolbar .ql-fill {
          fill: #a0a0a0;
        }
        .custom-quill-container .ql-toolbar button:hover .ql-fill,
        .custom-quill-container .ql-toolbar button.ql-active .ql-fill {
          fill: #fff;
        }
        .custom-quill-container .ql-toolbar .ql-picker {
          color: #a0a0a0;
        }
        .custom-quill-container .ql-toolbar .ql-picker-options {
          background-color: #111;
          border-color: #1a1a1a;
        }
        .custom-quill-container .ql-container {
          border-color: #1a1a1a;
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
          flex: 1;
          overflow-y: auto;
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          color: #e0e0e0;
        }
        .custom-quill-container .ql-editor {
          min-height: 100%;
          padding: 24px;
        }
        .custom-quill-container .ql-editor.ql-blank::before {
          color: #555;
          font-style: italic;
        }
        .custom-quill-container .ql-editor h1,
        .custom-quill-container .ql-editor h2,
        .custom-quill-container .ql-editor h3 {
          color: #fff;
          font-family: 'JetBrains Mono', monospace;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        .custom-quill-container .ql-editor a {
          color: #3B82F6;
        }
      `}} />
    </div>
  );
}
