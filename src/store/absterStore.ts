import { create } from 'zustand';
import { db, LOCAL_USER, type Attachment, type AIProvider } from '../lib/db';

export type EntityType = 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'EVENT' | 'DOCUMENT' | 'DEVICE' | 'EMAIL' | 'PHONE' | 'DOMAIN' | 'VEHICLE' | 'CRYPTO' | 'GENERIC';

export interface Entity {
  id: string;
  caseId: string;
  type: EntityType | string;
  name: string;
  description?: string;
  lat?: number;
  lng?: number;
  polygon?: { lat: number; lng: number }[];
  color?: string;
  startDate?: string;
  endDate?: string;
  x?: number;
  y?: number;
  confidence?: number;
  source?: string;
  isVerified?: boolean;
  isSuspicious?: boolean;
  avatar?: string | null;
  metadata?: Record<string, any>;
  ownerId?: string;
  notes?: string;
}

export interface Relation {
  id: string;
  caseId: string;
  source: string;
  target: string;
  type: string;
  label?: string;
  strength?: number;
  date?: string;
  ownerId?: string;
  notes?: string;
}

export interface Case {
  id: string;
  codeName: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  classification: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  leadInvestigator: string;
  team: string[];
  stats: {
    entityCount: number;
    locationCount: number;
    eventCount: number;
    toolResultsCount: number;
    evidenceCount: number;
  };
  tags: string[];
  findings?: string;
  linkedCases?: string[];
  template?: string | null;
  checklist?: boolean[];
  hypotheses?: { id: string; title: string; status: string; confidence: number; evidence: string; createdAt: number }[];
  activityLog?: { id: string; type: string; message: string; timestamp: number; user?: string }[];
  settings?: Record<string, any>;
  ownerId?: string;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | string;
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  provider?: string;
  modelId?: string | null;
}

export interface Chat {
  id: string;
  title: string;
  caseId: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  metadata?: Record<string, any>;
}

export interface VaultFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  chatId: string;
  ownerId: string;
  url?: string;
  data?: Blob;
}

interface AbsterState {
  entities: Entity[];
  relations: Relation[];
  cases: Case[];
  chats: Chat[];
  vaultFiles: VaultFile[];
  activeCaseId: string | null;
  currentUser: { uid: string; email: string; displayName: string } | null;
  setCurrentUser: (user: { uid: string; email: string; displayName: string } | null) => void;
  loadInitialData: () => Promise<void>;
  addEntity: (entity: Entity) => Promise<void>;
  removeEntity: (id: string) => Promise<void>;
  updateEntity: (id: string, updates: Partial<Entity>) => Promise<void>;
  addRelation: (relation: Relation) => Promise<void>;
  removeRelation: (id: string) => Promise<void>;
  updateRelation: (id: string, updates: Partial<Relation>) => Promise<void>;
  addCase: (c: Case) => Promise<void>;
  removeCase: (id: string) => Promise<void>;
  updateCase: (id: string, updates: Partial<Case>) => Promise<void>;
  addChat: (chat: Chat) => Promise<void>;
  updateChat: (id: string, updates: Partial<Chat>) => Promise<void>;
  removeChat: (id: string) => Promise<void>;
  addVaultFile: (file: VaultFile) => Promise<void>;
  removeVaultFile: (id: string) => Promise<void>;
  setActiveCase: (id: string | null) => void;
  logActivity: (caseId: string, type: 'INFO' | 'WARNING' | 'CRITICAL', message: string) => Promise<void>;
  clearCaseData: (caseId: string) => Promise<void>;
  clearAll: () => void;
  exportData: () => Promise<string>;
  importData: (dataStr: string) => Promise<void>;
  factoryReset: () => Promise<void>;
}

export const useAbsterStore = create<AbsterState>((set, get) => ({
  entities: [],
  relations: [],
  cases: [],
  chats: [],
  vaultFiles: [],
  activeCaseId: null,
  currentUser: LOCAL_USER, // Default to local user for local-first
  
  setCurrentUser: (user) => set({ currentUser: user }),
  
  loadInitialData: async () => {
    const user = get().currentUser;
    if (!user) return;
    
    try {
      const dbCases = await db.cases.where('ownerId').equals(user.uid).toArray();
      const dbEntities = await db.entities.where('ownerId').equals(user.uid).toArray();
      const dbRelations = await db.relations.where('ownerId').equals(user.uid).toArray();
      const dbChats = await db.chats.where('ownerId').equals(user.uid).toArray();
      const dbVaultFiles = await db.vaultFiles.where('ownerId').equals(user.uid).toArray();
      
      // Generate temporary URLs for blobs
      const vaultFilesWithUrls = dbVaultFiles.map(f => {
        if (f.data) {
          return { ...f, url: URL.createObjectURL(f.data) };
        }
        return f;
      });
      
      // Load messages for chats
      const fullChats = await Promise.all(dbChats.map(async (chat) => {
        const messages = await db.messages.where('chatId').equals(chat.id).toArray();
        return { ...chat, messages: messages.sort((a, b) => a.timestamp - b.timestamp) };
      }));
      
      set({
        cases: dbCases as any[],
        entities: dbEntities as any[],
        relations: dbRelations as any[],
        chats: fullChats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) as any[],
        vaultFiles: vaultFilesWithUrls as any[]
      });
    } catch (e) {
      console.error("Error loading local data", e);
    }
  },
  
  addEntity: async (entity) => {
    const user = get().currentUser;
    if (!user) return;
    const state = get();
    if (!state.activeCaseId) return;
    
    const now = new Date().toISOString();
    const newEntity = { 
      ...entity, 
      caseId: state.activeCaseId, 
      ownerId: user.uid,
      createdAt: now,
      updatedAt: now
    };
    
    set(s => ({ entities: [...s.entities, newEntity] }));
    
    try {
      await db.entities.add(newEntity as any);
      await get().logActivity(state.activeCaseId, 'INFO', `New Entity Added: ${newEntity.name} (${newEntity.type})`);
    } catch (error) {
      console.error("Error adding entity:", error);
      set(s => ({ entities: s.entities.filter(e => e.id !== newEntity.id) }));
    }
  },
  
  removeEntity: async (id) => {
    const user = get().currentUser;
    if (!user) return;
    
    const state = get();
    const originalEntities = [...state.entities];
    const originalRelations = [...state.relations];
    
    set(s => ({
      entities: s.entities.filter(e => e.id !== id),
      relations: s.relations.filter(r => r.source !== id && r.target !== id)
    }));
    
    try {
      await db.entities.delete(id);
      const relationsToDelete = originalRelations.filter(r => r.source === id || r.target === id);
      for (const r of relationsToDelete) {
        await db.relations.delete(r.id);
      }
    } catch (error) {
      console.error("Error removing entity:", error);
      set({ entities: originalEntities, relations: originalRelations });
    }
  },
  
  updateEntity: async (id, updates) => {
    const user = get().currentUser;
    if (!user) return;
    
    const state = get();
    const originalEntities = [...state.entities];
    
    const now = new Date().toISOString();
    const finalUpdates = { ...updates, updatedAt: now };
    
    set(s => ({
      entities: s.entities.map(e => e.id === id ? { ...e, ...finalUpdates } : e)
    }));
    
    try {
      await db.entities.update(id, finalUpdates);
    } catch (error) {
      console.error("Error updating entity:", error);
      set({ entities: originalEntities });
    }
  },
  
  addRelation: async (relation) => {
    const user = get().currentUser;
    if (!user) return;
    const state = get();
    if (!state.activeCaseId) return;
    
    const now = new Date().toISOString();
    const newRelation = { 
      ...relation, 
      caseId: state.activeCaseId, 
      ownerId: user.uid,
      createdAt: now,
      updatedAt: now
    };
    
    set(s => ({ relations: [...s.relations, newRelation] }));
    
    try {
      await db.relations.add(newRelation as any);
    } catch (error) {
      console.error("Error adding relation:", error);
      set(s => ({ relations: s.relations.filter(r => r.id !== newRelation.id) }));
    }
  },
  
  removeRelation: async (id) => {
    const user = get().currentUser;
    if (!user) return;
    
    const state = get();
    const originalRelations = [...state.relations];
    
    set(s => ({ relations: s.relations.filter(r => r.id !== id) }));
    
    try {
      await db.relations.delete(id);
    } catch (error) {
      console.error("Error removing relation:", error);
      set({ relations: originalRelations });
    }
  },
  
  updateRelation: async (id, updates) => {
    const user = get().currentUser;
    if (!user) return;
    
    const state = get();
    const originalRelations = [...state.relations];
    
    const now = new Date().toISOString();
    const finalUpdates = { ...updates, updatedAt: now };
    
    set(s => ({
      relations: s.relations.map(r => r.id === id ? { ...r, ...finalUpdates } : r)
    }));
    
    try {
      await db.relations.update(id, finalUpdates);
    } catch (error) {
      console.error("Error updating relation:", error);
      set({ relations: originalRelations });
    }
  },
  
  addCase: async (c) => {
    const user = get().currentUser;
    if (!user) return;
    
    const newCase = { ...c, ownerId: user.uid };
    set(s => ({ cases: [...s.cases, newCase] }));
    try {
      await db.cases.add(newCase as any);
    } catch (e) {
      console.error("Error adding case:", e);
      set(s => ({ cases: s.cases.filter(caseItem => caseItem.id !== newCase.id) }));
    }
  },
  
  removeCase: async (id) => {
    const user = get().currentUser;
    if (!user) return;
    set(s => ({ cases: s.cases.filter(c => c.id !== id) }));
    try {
      await db.cases.delete(id);
      await get().clearCaseData(id);
    } catch (e) {
      console.error("Error removing case:", e);
    }
  },
  
  updateCase: async (id, updates) => {
    const user = get().currentUser;
    if (!user) return;
    set(s => ({ cases: s.cases.map(c => c.id === id ? { ...c, ...updates } : c) }));
    try {
      await db.cases.update(id, updates);
    } catch (e) {
      console.error("Error updating case:", e);
    }
  },
  
  addChat: async (chat) => {
    const user = get().currentUser;
    if (!user) return;
    const newChat = { ...chat, ownerId: user.uid };
    set(s => ({ chats: [newChat, ...s.chats] }));
    try {
      const { messages, ...chatData } = newChat;
      await db.chats.add(chatData as any);
      if (messages && messages.length > 0) {
        await db.messages.bulkAdd(messages.map(m => ({ ...m, chatId: newChat.id })) as any);
      }
    } catch (error) {
      console.error("Error adding chat:", error);
      set(s => ({ chats: s.chats.filter(c => c.id !== newChat.id) }));
    }
  },

  updateChat: async (id, updates) => {
    const user = get().currentUser;
    if (!user) return;
    const now = new Date().toISOString();
    const finalUpdates = { ...updates, updatedAt: now };
    set(s => ({ chats: s.chats.map(c => c.id === id ? { ...c, ...finalUpdates } : c) }));
    try {
      const { messages, ...chatData } = finalUpdates;
      await db.chats.update(id, chatData);
      
      // If messages are updated, we need to sync them
      if (messages) {
        // Simple approach: delete old, insert new
        await db.messages.where('chatId').equals(id).delete();
        await db.messages.bulkAdd(messages.map(m => ({ ...m, chatId: id })) as any);
      }
    } catch (error) {
      console.error("Error updating chat:", error);
    }
  },

  removeChat: async (id) => {
    const user = get().currentUser;
    if (!user) return;
    set(s => ({ chats: s.chats.filter(c => c.id !== id) }));
    try {
      await db.chats.delete(id);
      await db.messages.where('chatId').equals(id).delete();
    } catch (error) {
      console.error("Error removing chat:", error);
    }
  },

  addVaultFile: async (file) => {
    const user = get().currentUser;
    if (!user) return;
    
    let url = file.url;
    if (file.data && !url) {
      url = URL.createObjectURL(file.data);
    }
    
    const newFile = { ...file, url, ownerId: user.uid };
    set(s => ({ vaultFiles: [...s.vaultFiles, newFile] }));
    try {
      await db.vaultFiles.add(newFile as any);
      const state = get();
      if (state.activeCaseId) {
        await state.logActivity(state.activeCaseId, 'INFO', `New Evidence Uploaded: ${newFile.name}`);
      }
    } catch (error) {
      console.error("Error adding vault file:", error);
      set(s => ({ vaultFiles: s.vaultFiles.filter(f => f.id !== newFile.id) }));
    }
  },

  removeVaultFile: async (id) => {
    const user = get().currentUser;
    if (!user) return;
    set(s => ({ vaultFiles: s.vaultFiles.filter(f => f.id !== id) }));
    try {
      await db.vaultFiles.delete(id);
    } catch (error) {
      console.error("Error removing vault file:", error);
    }
  },
  
  setActiveCase: (id) => set({ activeCaseId: id }),

  logActivity: async (caseId, type, message) => {
    const state = get();
    const caseToUpdate = state.cases.find(c => c.id === caseId);
    if (!caseToUpdate) return;

    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: Date.now()
    };

    const updatedLog = [...(caseToUpdate.activityLog || []), newLog];
    
    set(s => ({
      cases: s.cases.map(c => c.id === caseId ? { ...c, activityLog: updatedLog } : c)
    }));

    try {
      await db.cases.update(caseId, { activityLog: updatedLog });
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  },
  
  clearCaseData: async (caseId) => {
    const user = get().currentUser;
    if (!user) return;
    const state = get();
    const entitiesToDelete = state.entities.filter(e => e.caseId === caseId);
    const relationsToDelete = state.relations.filter(r => r.caseId === caseId);
    
    set(s => ({
      entities: s.entities.filter(e => e.caseId !== caseId),
      relations: s.relations.filter(r => r.caseId !== caseId)
    }));
    
    try {
      const entityIds = entitiesToDelete.map(e => e.id);
      const relationIds = relationsToDelete.map(r => r.id);
      await db.entities.bulkDelete(entityIds);
      await db.relations.bulkDelete(relationIds);
    } catch (error) {
      console.error("Error clearing case data:", error);
    }
  },
  
  clearAll: () => set({ entities: [], relations: [], cases: [], chats: [], vaultFiles: [], activeCaseId: null }),

  exportData: async () => {
    try {
      const data = {
        entities: await db.entities.toArray(),
        relations: await db.relations.toArray(),
        cases: await db.cases.toArray(),
        chats: await db.chats.toArray(),
        messages: await db.messages.toArray(),
        notes: await db.notes.toArray(),
        settings: await db.settings.toArray(),
        // Cannot easily export blobs in a simple JSON string predictably, skip vault files blobs or just meta
        vaultFiles: (await db.vaultFiles.toArray()).map(f => ({ ...f, data: null, url: null }))
      };
      return JSON.stringify(data);
    } catch (error) {
      console.error("Export failed:", error);
      throw error;
    }
  },

  importData: async (dataStr: string) => {
    try {
      const data = JSON.parse(dataStr);
      await db.transaction('rw', [db.entities, db.relations, db.cases, db.chats, db.messages, db.notes, db.settings, db.vaultFiles], async () => {
        await db.entities.clear();
        await db.relations.clear();
        await db.cases.clear();
        await db.chats.clear();
        await db.messages.clear();
        await db.notes.clear();
        await db.settings.clear();
        await db.vaultFiles.clear();

        if (data.entities) await db.entities.bulkAdd(data.entities);
        if (data.relations) await db.relations.bulkAdd(data.relations);
        if (data.cases) await db.cases.bulkAdd(data.cases);
        if (data.chats) await db.chats.bulkAdd(data.chats);
        if (data.messages) await db.messages.bulkAdd(data.messages);
        if (data.notes) await db.notes.bulkAdd(data.notes);
        if (data.settings) await db.settings.bulkAdd(data.settings);
        if (data.vaultFiles) await db.vaultFiles.bulkAdd(data.vaultFiles);
      });
      // reload UI
      await get().loadInitialData();
    } catch (error) {
      console.error("Import failed:", error);
      throw error;
    }
  },

  factoryReset: async () => {
    try {
      await db.transaction('rw', [db.entities, db.relations, db.cases, db.chats, db.messages, db.notes, db.settings, db.vaultFiles], async () => {
        await db.entities.clear();
        await db.relations.clear();
        await db.cases.clear();
        await db.chats.clear();
        await db.messages.clear();
        await db.notes.clear();
        await db.settings.clear();
        await db.vaultFiles.clear();
      });
      localStorage.clear();
      set({ entities: [], relations: [], cases: [], chats: [], vaultFiles: [], activeCaseId: null });
    } catch (error) {
      console.error("Factory Reset failed:", error);
      throw error;
    }
  }
}));
