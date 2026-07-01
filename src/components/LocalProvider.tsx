"use client";

import React, { useEffect, useState } from 'react';
import { useAbsterStore } from '../store/absterStore';
import AbsterLanding from './abster-landing';
import { LOCAL_USER, db } from '../lib/db';
import { getDemoCase } from '../lib/demo-cases';

export default function LocalProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const store = useAbsterStore();

  // Seed demo case if the URL is a /case/demo/[slug] deep-link.
  // We do this once per slug, idempotently — if the user deletes the demo case
  // we don't fight them, but on next cold load it will be re-seeded.
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
        // Already seeded — just activate the case and the chat.
        store.setActiveCase(demo.caseData.id);
        const existingChat = await db.chats.get(demo.chat.id);
        if (existingChat) {
          // Surface the chat as the active one so its messages render immediately.
          const settings = (await db.settings.get('current_user_settings')) || { id: 'current_user_settings', providers: [], selectedProviderId: null, selectedModelId: null, activeChatId: null, apiKeys: {} } as any;
          settings.activeChatId = demo.chat.id;
          await db.settings.put(settings);
        }
        return;
      }
      // Seed case + entities + relations + chat + messages in one transaction.
      await db.transaction('rw', [db.cases, db.entities, db.relations, db.chats, db.messages, db.settings], async () => {
        await db.cases.add(demo.caseData as any);
        await db.entities.bulkAdd(demo.entities as any);
        await db.relations.bulkAdd(demo.relations as any);
        const { messages: chatMessages, ...chatMeta } = demo.chat;
        await db.chats.add(chatMeta as any);
        if (chatMessages && chatMessages.length > 0) {
          await db.messages.bulkAdd(chatMessages.map(m => ({ ...m, chatId: demo.chat.id })) as any);
        }
        // Make the demo chat the active one.
        const settings = (await db.settings.get('current_user_settings')) || { id: 'current_user_settings', providers: [], selectedProviderId: null, selectedModelId: null, activeChatId: null, apiKeys: {} } as any;
        settings.activeChatId = demo.chat.id;
        await db.settings.put(settings);
      });
      // Refresh the store and activate the demo case.
      await store.loadInitialData();
      store.setActiveCase(demo.caseData.id);
    } catch (err) {
      console.error('Failed to seed demo case', err);
    }
  };

  useEffect(() => {
    // Demo deep-links should auto-login as LOCAL_USER without forcing the visitor
    // through the landing wall. They are read-only investigations meant to be
    // shared on HN/Reddit/Twitter — friction here costs us the click.
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    const isDemoDeepLink = /^\/case\/demo\//i.test(path);

    const savedSession = localStorage.getItem('abster_local_session');
    if (savedSession || isDemoDeepLink) {
      try {
        const sessionUser = savedSession ? JSON.parse(savedSession) : LOCAL_USER;
        setUser(sessionUser);
        store.setCurrentUser(sessionUser);
        if (isDemoDeepLink && !savedSession) {
          // Don't persist the demo auto-login — visitor may want to start fresh next time.
        } else if (savedSession) {
          localStorage.setItem('abster_local_session', JSON.stringify(sessionUser));
        }
        store.loadInitialData()
          .then(() => seedDemoCaseIfNeeded())
          .then(() => setLoading(false))
          .catch((err) => { console.error('loadInitialData failed', err); setLoading(false); });
      } catch {
        localStorage.removeItem('abster_local_session');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
    // store from useAbsterStore() is a reactive state snapshot, not a stable reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (email?: string, password?: string) => {
    setLoading(true);
    let mockUser = LOCAL_USER;

    if (email === 'admin' && password === 'admin') {
      mockUser = { uid: 'local-admin-01', email: 'admin@localhost', displayName: 'Local Admin', role: 'admin' };
    } else if (email === 'guest' || (!email && !password)) {
      mockUser = { uid: 'local-guest-01', email: 'guest@localhost', displayName: 'Local Guest', role: 'guest' };
    }

    setUser(mockUser);
    store.setCurrentUser(mockUser);
    localStorage.setItem('abster_local_session', JSON.stringify(mockUser));

    await store.loadInitialData();
    await seedDemoCaseIfNeeded();
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-white font-mono">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs tracking-widest text-green-500">INITIALIZING ABSTER OS (LOCAL)...</div>
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
