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
}

export interface Bookmark {
  id: string;
  bookId: string;
  pageNumber: number;
  title?: string;
  createdAt: number;
}

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
