export interface Book {
  id: string;
  title: string;
  author?: string;
  fileSize: number;
  totalPages: number;
  currentPage: number;
  addedAt: number;
  lastReadAt: number;
  coverDataUrl?: string;
  isFavorite?: boolean;
  storagePath?: string; // Supabase Cloud storage path
  syncStatus?: 'local' | 'synced' | 'syncing' | 'cloud_only';
  source?: 'local' | 'google_drive' | 'cloud';
  driveFileId?: string;
}

export interface Bookmark {
  id: string;
  bookId: string;
  pageNumber: number;
  title?: string;
  snippet?: string;
  note?: string;
  createdAt: number;
  syncRoomId?: string;
}

export interface Annotation {
  id: string;
  bookId: string;
  pageNumber: number;
  quote?: string;
  content: string;
  tags?: string[];
  color?: 'terracotta' | 'amber' | 'sage' | 'blue' | 'purple';
  createdAt: number;
  updatedAt: number;
  syncRoomId?: string;
}

export type NavTab = 'bookshelf' | 'library' | 'bookmarks' | 'annotations' | 'settings' | 'podcasts';


export interface ReadingProgress {
  bookId: string;
  pageNumber: number;
  percentage: number;
  lastReadAt: number;
}

export interface PageTextData {
  pageNumber: number;
  fullText: string;
  sentences: string[];
  paragraphs: string[];
}

export interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  currentPage: number;
  totalPages: number;
  currentSentenceIndex: number;
  sentences: string[];
  rate: number; // 0.5 to 2.0
  pitch: number;
  voiceURI: string | null;
  engineMode: 'ai_natural' | 'system';
  continuousBookMode: boolean;
  sleepTimerMinutes: number | null;
  sleepTimerRemainingSeconds: number | null;
}

export type ThemeMode = 'dark' | 'light' | 'sepia';
export type ViewMode = 'single' | 'scroll';

// Cloud Sync & Google Drive Types
export interface SyncConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  syncRoomId?: string;
  googleClientId?: string;
  googleApiKey?: string;
  autoSync: boolean;
  syncPdfFiles: boolean;
}

export interface SyncStatus {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  error: string | null;
  userEmail: string | null;
  syncRoomId: string | null;
  provider?: 'cloudflare' | 'supabase' | 'local';
  edgePingMs?: number | null;
  isEdge?: boolean;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  modifiedTime?: string;
  iconUrl?: string;
}
