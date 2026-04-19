"use client";

import React, { useEffect, useState } from 'react';
import { useAbsterStore } from '../store/absterStore';
import AbsterLanding from './abster-landing';
import { LOCAL_USER } from '../lib/db';

export default function LocalProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const store = useAbsterStore();

  useEffect(() => {
    // Check if there's a saved session in localStorage (optional, but good for persistence)
    const savedSession = localStorage.getItem('abster_local_session');
    if (savedSession) {
      const sessionUser = JSON.parse(savedSession);
      setUser(sessionUser);
      store.setCurrentUser(sessionUser);
      store.loadInitialData().then(() => setLoading(false));
    } else {
      setLoading(false);
    }
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
