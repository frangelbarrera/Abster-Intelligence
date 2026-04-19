import Dexie, { type Table } from 'dexie';

export interface LocalEntity {
  id: string;
  caseId: string;
  type: string;
  name: string;
  description?: string;
  lat?: number;
  lng?: number;
  polygon?: any;
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
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalRelation {
  id: string;
  caseId: string;
  source: string;
  target: string;
  type: string;
  label?: string;
  strength?: number;
  date?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalCase {
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
  findings: string;
  linkedCases: string[];
  template: string | null;
  checklist: boolean[];
  hypotheses: any[];
  activityLog: any[];
  settings: any;
  ownerId: string;
}

export interface LocalChatMessage {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachments?: any[];
  provider?: string;
  modelId?: string | null;
}

export interface LocalChat {
  id: string;
  title: string;
  caseId: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface LocalVaultFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  chatId: string;
  ownerId: string;
  url?: string;
  data?: Blob; // Actual file content stored in IndexedDB
}

export interface LocalNote {
  id: string; // usually caseId
  caseId: string;
  content: string;
  ownerId: string;
  updatedAt: string;
}

export interface LocalSettings {
  id: string; // 'current_user_settings'
  providers: any[];
  selectedProviderId: string | null;
  selectedModelId: string | null;
  activeChatId: string | null;
  apiKeys: Record<string, string>; // Local storage for API keys
}

export class AbsterDatabase extends Dexie {
  entities!: Table<LocalEntity>;
  relations!: Table<LocalRelation>;
  cases!: Table<LocalCase>;
  chats!: Table<LocalChat>;
  messages!: Table<LocalChatMessage>;
  vaultFiles!: Table<LocalVaultFile>;
  notes!: Table<LocalNote>;
  settings!: Table<LocalSettings>;

  constructor() {
    super('AbsterDB');
    this.version(1).stores({
      entities: 'id, caseId, type, name, ownerId',
      relations: 'id, caseId, source, target, ownerId',
      cases: 'id, codeName, title, status, ownerId',
      chats: 'id, caseId, ownerId',
      messages: 'id, chatId',
      vaultFiles: 'id, chatId, ownerId',
      notes: 'id, caseId, ownerId',
      settings: 'id'
    });
  }
}

export const db = new AbsterDatabase();

// Mock User for Local-First Experience
export const LOCAL_USER = {
  uid: 'local-operator-001',
  email: 'operator@abster.local',
  displayName: 'Local Operator',
  role: 'admin'
};
