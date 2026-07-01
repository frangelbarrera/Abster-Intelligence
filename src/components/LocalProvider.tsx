"use client";

import React, { useEffect, useState } from 'react';
import { useAbsterStore } from '../store/absterStore';
import AbsterLanding from './abster-landing';
import { LOCAL_USER, db } from '../lib/db';
import { getDemoCase } from '../lib/demo-cases';
import { decodeCaseFromSharing } from '../lib/case-sharing';

type LoadState = 'loading' | 'ready' | 'error';

export default function LocalProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const store = useAbsterStore();

  const seedDemoCaseIfNeeded = async () => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;
    const m = path.match(/^\/case\/demo\/([a-z0-9-]+)/i);
    if (!m) return;
    const slug = m[1];
    const demo = getDemoCase(slug);
    if (!demo) return;

    try {
      const existing = await db.cases.get(demo.caseData.id);
      if (existing) {
        store.setActiveCase(demo.caseData.id);
        const existingChat = await db.chats.get(demo.chat.id);
        if (existingChat) {
          const settings = (await db.settings.get('current_user_settings')) || { id: 'current_user_settings', providers: [], selectedProviderId: null, selectedModelId: null, activeChatId: null, apiKeys: {} } as any;
          settings.activeChatId = demo.chat.id;
          await db.settings.put(settings);
        }
        return;
      }
      await db.transaction('rw', [db.cases, db.entities, db.relations, db.chats, db.messages, db.settings], async () => {
        await db.cases.add(demo.caseData as any);
        await db.entities.bulkAdd(demo.entities as any);
        await db.relations.bulkAdd(demo.relations as any);
        const { messages: chatMessages, ...chatMeta } = demo.chat;
        await db.chats.add(chatMeta as any);
        if (chatMessages && chatMessages.length > 0) {
          await db.messages.bulkAdd(chatMessages.map(m => ({ ...m, chatId: demo.chat.id })) as any);
        }
        const settings = (await db.settings.get('current_user_settings')) || { id: 'current_user_settings', providers: [], selectedProviderId: null, selectedModelId: null, activeChatId: null, apiKeys: {} } as any;
        settings.activeChatId = demo.chat.id;
        await db.settings.put(settings);
      });
      await store.loadInitialData();
      store.setActiveCase(demo.caseData.id);
    } catch (err) {
      console.error('Failed to seed demo case', err);
    }
  };

  // Decode a shared case from the URL hash (e.g. /case/share#<compressed>)
  // and seed it into IndexedDB. The shared case becomes a regular case owned
  // by the local user — they can extend it, edit it, and re-share their
  // modified version. We bump the case id to avoid clobbering an existing
  // case with the same id (e.g. if the user already has a copy).
  const seedSharedCaseIfNeeded = async () => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;
    if (!/^\/case\/share\b/.test(path)) return;
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;

    const payload = decodeCaseFromSharing(hash);
    if (!payload) {
      console.warn('Failed to decode shared case from URL hash');
      return;
    }

    // Generate fresh IDs so the shared case doesn't collide with anything
    // already in the receiver's DB.
    const newCaseId = `shared-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const entityIdMap = new Map<string, string>();
    const chatIdMap = new Map<string, string>();

    const newCase = {
      ...payload.case,
      id: newCaseId,
      codeName: `${payload.case.codeName || 'SHARED'}-RECV`,
      title: `${payload.case.title} (shared copy)`,
      ownerId: LOCAL_USER.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activityLog: [
        ...(payload.case.activityLog || []),
        { id: `log-${Date.now()}`, type: 'INFO', message: 'Case imported from shared URL', timestamp: Date.now() },
      ],
    };

    const newEntities = payload.entities.map(e => {
      const newId = `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      entityIdMap.set(e.id, newId);
      return { ...e, id: newId, caseId: newCaseId, ownerId: LOCAL_USER.uid };
    });

    const newRelations = payload.relations.map(r => ({
      ...r,
      id: `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      caseId: newCaseId,
      source: entityIdMap.get(r.source) || r.source,
      target: entityIdMap.get(r.target) || r.target,
      ownerId: LOCAL_USER.uid,
    }));

    const newChats: any[] = [];
    const newMessages: any[] = [];
    for (const chat of payload.chats) {
      const newChatId = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      chatIdMap.set(chat.id, newChatId);
      const { messages, ...chatMeta } = chat;
      newChats.push({
        ...chatMeta,
        id: newChatId,
        caseId: newCaseId,
        ownerId: LOCAL_USER.uid,
        createdAt: chat.createdAt || new Date().toISOString(),
        updatedAt: chat.updatedAt || new Date().toISOString(),
      });
      if (messages && messages.length) {
        for (const m of messages) {
          newMessages.push({
            ...m,
            id: `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            chatId: newChatId,
          });
        }
      }
    }

    try {
      await db.transaction('rw', [db.cases, db.entities, db.relations, db.chats, db.messages, db.settings], async () => {
        await db.cases.add(newCase as any);
        if (newEntities.length) await db.entities.bulkAdd(newEntities as any);
        if (newRelations.length) await db.relations.bulkAdd(newRelations as any);
        if (newChats.length) {
          await db.chats.bulkAdd(newChats as any);
          if (newMessages.length) await db.messages.bulkAdd(newMessages as any);
        }
        const settings = (await db.settings.get('current_user_settings')) || { id: 'current_user_settings', providers: [], selectedProviderId: null, selectedModelId: null, activeChatId: null, apiKeys: {} } as any;
        settings.activeChatId = newChats[0]?.id || null;
        await db.settings.put(settings);
      });
      await store.loadInitialData();
      store.setActiveCase(newCaseId);
      // Clear the hash so a refresh doesn't re-import the same case.
      try { history.replaceState(null, '', path); } catch {}
    } catch (err) {
      console.error('Failed to seed shared case', err);
    }
  };

  const bootstrap = async (sessionUser: any, isDemoDeepLink: boolean) => {
    try {
      setUser(sessionUser);
      store.setCurrentUser(sessionUser);
      if (!isDemoDeepLink) {
        localStorage.setItem('abster_local_session', JSON.stringify(sessionUser));
      }
      await store.loadInitialData();
      await seedDemoCaseIfNeeded();
      await seedSharedCaseIfNeeded();
      setLoadState('ready');
    } catch (err: any) {
      console.error('Abster bootstrap failed', err);
      setLoadError(err?.message || 'Unknown error during local database initialization.');
      setLoadState('error');
    }
  };

  useEffect(() => {
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    const isDemoDeepLink = /^\/case\/demo\//i.test(path);
    const isShareDeepLink = /^\/case\/share\b/.test(path);

    const savedSession = localStorage.getItem('abster_local_session');
    if (savedSession || isDemoDeepLink || isShareDeepLink) {
      try {
        const sessionUser = savedSession ? JSON.parse(savedSession) : LOCAL_USER;
        bootstrap(sessionUser, isDemoDeepLink);
      } catch {
        localStorage.removeItem('abster_local_session');
        setLoadState('ready');
      }
    } else {
      setLoadState('ready');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (email?: string, password?: string) => {
    setLoadState('loading');
    let mockUser = LOCAL_USER;

    if (email === 'admin' && password === 'admin') {
      mockUser = { uid: 'local-admin-01', email: 'admin@localhost', displayName: 'Local Admin', role: 'admin' };
    } else if (email === 'guest' || (!email && !password)) {
      mockUser = { uid: 'local-guest-01', email: 'guest@localhost', displayName: 'Local Guest', role: 'guest' };
    }

    await bootstrap(mockUser, false);
  };

  const handleRetry = () => {
    setLoadState('loading');
    setLoadError(null);
    const savedSession = localStorage.getItem('abster_local_session');
    const sessionUser = savedSession ? JSON.parse(savedSession) : LOCAL_USER;
    bootstrap(sessionUser, /^\/case\/demo\//i.test(window.location.pathname));
  };

  if (loadState === 'loading') {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-white font-mono">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs tracking-widest text-green-500">INITIALIZING ABSTER OS (LOCAL)...</div>
        </div>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-white font-mono p-6">
        <div className="max-w-md w-full bg-zinc-950 border border-red-900/50 rounded-lg p-6 text-center">
          <div className="text-red-500 text-3xl mb-3">⚠</div>
          <div className="text-red-400 text-sm font-bold tracking-wider mb-2">LOCAL DATABASE INITIALIZATION FAILED</div>
          <div className="text-zinc-400 text-xs mb-4">
            Abster could not load your local IndexedDB store. This is usually caused by
            quota exhaustion, a corrupted database, or browser privacy mode blocking storage.
          </div>
          {loadError && (
            <div className="bg-zinc-900 border border-zinc-800 rounded p-2 mb-4 text-left">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Error detail</div>
              <code className="text-[10px] text-red-300 break-all">{loadError}</code>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleRetry}
              className="w-full px-4 py-2 bg-white text-black text-xs font-bold tracking-wider rounded hover:bg-zinc-200 transition-colors"
            >
              RETRY INITIALIZATION
            </button>
            <button
              onClick={async () => {
                try {
                  await db.delete();
                  localStorage.clear();
                  window.location.reload();
                } catch (err) {
                  console.error('Factory reset failed', err);
                  window.location.reload();
                }
              }}
              className="w-full px-4 py-2 bg-transparent border border-zinc-700 text-zinc-400 text-xs tracking-wider rounded hover:bg-zinc-900 transition-colors"
            >
              FACTORY RESET (DELETE LOCAL DB)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen w-full bg-black">
        <AbsterLanding onLogin={handleLogin} />
      </main>
    );
  }

  return <>{children}</>;
}

