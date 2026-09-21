import { Book, Bookmark, Annotation } from '../types';

const EDGE_TOKEN_KEY = 'aurora_edge_jwt_token';
const EDGE_URL_KEY = 'aurora_edge_worker_url';

export const edgeApiService = {
  /**
   * Get the Cloudflare Worker URL from env or localStorage
   */
  getEdgeUrl(): string {
    const fromStorage = localStorage.getItem(EDGE_URL_KEY);
    if (fromStorage && fromStorage.trim()) return fromStorage.trim().replace(/\/+$/, '');
    
    const fromEnv = (import.meta.env.VITE_CLOUDFLARE_WORKER_URL || import.meta.env.VITE_API_URL) as string;
    if (fromEnv && fromEnv.trim()) return fromEnv.trim().replace(/\/+$/, '');

    return '';
  },

  setEdgeUrl(url: string): void {
    if (url) {
      localStorage.setItem(EDGE_URL_KEY, url.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem(EDGE_URL_KEY);
    }
  },

  isEdgeConfigured(): boolean {
    return !!this.getEdgeUrl();
  },

  getToken(): string | null {
    return localStorage.getItem(EDGE_TOKEN_KEY);
  },

  setToken(token: string | null): void {
    if (token) {
      localStorage.setItem(EDGE_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(EDGE_TOKEN_KEY);
    }
  },

  /**
   * Ping Cloudflare Edge endpoint and measure real-time latency (ms)
   */
  async checkLatency(): Promise<{ ok: boolean; latencyMs: number; region?: string; city?: string }> {
    const baseUrl = this.getEdgeUrl();
    if (!baseUrl) return { ok: false, latencyMs: 0 };

    const start = performance.now();
    try {
      const res = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const latencyMs = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json() as any;
        return {
          ok: true,
          latencyMs,
          region: data?.region || 'Edge',
          city: data?.city || 'Hanoi/HCMC',
        };
      }
      return { ok: false, latencyMs };
    } catch (err) {
      return { ok: false, latencyMs: Math.round(performance.now() - start) };
    }
  },

  /**
   * Auth: Register
   */
  async register(email: string, password: string, fullName?: string): Promise<{ success: boolean; token?: string; user?: any; error?: string }> {
    const baseUrl = this.getEdgeUrl();
    if (!baseUrl) return { success: false, error: 'Chưa cấu hình Cloudflare Worker URL' };

    try {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      });
      const data = await res.json() as any;
      if (res.ok && data.token) {
        this.setToken(data.token);
        return { success: true, token: data.token, user: data.user };
      }
      return { success: false, error: data.error || 'Lỗi đăng ký tài khoản' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Không thể kết nối máy chủ Edge' };
    }
  },

  /**
   * Auth: Login
   */
  async login(email: string, password: string): Promise<{ success: boolean; token?: string; user?: any; error?: string }> {
    const baseUrl = this.getEdgeUrl();
    if (!baseUrl) return { success: false, error: 'Chưa cấu hình Cloudflare Worker URL' };

    try {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as any;
      if (res.ok && data.token) {
        this.setToken(data.token);
        return { success: true, token: data.token, user: data.user };
      }
      return { success: false, error: data.error || 'Sai thông tin đăng nhập' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Không thể kết nối máy chủ Edge' };
    }
  },

  /**
   * Fast Device Pairing: Generate PIN (e.g. AURORA-8899)
   */
  async generatePin(roomId?: string): Promise<{ success: boolean; pin?: string; roomId?: string; error?: string }> {
    const baseUrl = this.getEdgeUrl();
    if (!baseUrl) return { success: false, error: 'Chưa cấu hình Cloudflare Worker URL' };

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = this.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (roomId) headers['X-Sync-Room-Id'] = roomId;

      const res = await fetch(`${baseUrl}/api/pair/generate-pin`, {
        method: 'POST',
        headers,
      });
      const data = await res.json() as any;
      if (res.ok && data.pin) {
        return { success: true, pin: data.pin, roomId: data.roomId };
      }
      return { success: false, error: data.error || 'Không thể tạo mã PIN' };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  },

  /**
   * Fast Device Pairing: Link with PIN
   */
  async linkPin(pin: string): Promise<{ success: boolean; roomId?: string; error?: string }> {
    const baseUrl = this.getEdgeUrl();
    if (!baseUrl) return { success: false, error: 'Chưa cấu hình Cloudflare Worker URL' };

    try {
      const res = await fetch(`${baseUrl}/api/pair/link-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json() as any;
      if (res.ok && data.roomId) {
        return { success: true, roomId: data.roomId };
      }
      return { success: false, error: data.error || 'Mã PIN không hợp lệ' };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  },

  /**
   * Sync PULL: Retrieve books, bookmarks, annotations in 1 request (< 15ms)
   */
  async pullSync(roomId?: string | null): Promise<{ success: boolean; books?: Book[]; bookmarks?: Bookmark[]; annotations?: Annotation[]; error?: string }> {
    const baseUrl = this.getEdgeUrl();
    if (!baseUrl) return { success: false, error: 'Chưa cấu hình Cloudflare Worker URL' };

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = this.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (roomId) headers['X-Sync-Room-Id'] = roomId;

      const res = await fetch(`${baseUrl}/api/sync/pull`, {
        method: 'GET',
        headers,
      });

      const data = await res.json() as any;
      if (res.ok && data.success) {
        const books: Book[] = (data.books || []).map((row: any) => ({
          id: row.id,
          title: row.title,
          author: row.author || undefined,
          fileSize: Number(row.file_size) || 0,
          totalPages: Number(row.total_pages) || 1,
          currentPage: Number(row.current_page) || 1,
          addedAt: Number(row.added_at) || Date.now(),
          lastReadAt: Number(row.last_read_at) || Date.now(),
          coverDataUrl: row.cover_data_url || undefined,
          isFavorite: !!row.is_favorite,
          storagePath: row.storage_key || undefined,
          source: row.source || 'cloud',
          syncStatus: 'synced',
        }));

        const bookmarks: Bookmark[] = (data.bookmarks || []).map((row: any) => ({
          id: row.id,
          bookId: row.book_id,
          pageNumber: row.page_number,
          title: row.title || undefined,
          snippet: row.snippet || undefined,
          note: row.note || undefined,
          createdAt: Number(row.created_at) || Date.now(),
          syncRoomId: row.sync_room_id || undefined,
        }));

        const annotations: Annotation[] = (data.annotations || []).map((row: any) => ({
          id: row.id,
          bookId: row.book_id,
          pageNumber: row.page_number,
          quote: row.quote || undefined,
          content: row.content,
          tags: row.tags || undefined,
          color: row.color || 'terracotta',
          createdAt: Number(row.created_at) || Date.now(),
          updatedAt: Number(row.updated_at) || Date.now(),
          syncRoomId: row.sync_room_id || undefined,
        }));

        return { success: true, books, bookmarks, annotations };
      }
      return { success: false, error: data.error || 'Lỗi tải dữ liệu từ Cloudflare D1' };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  },

  /**
   * Sync PUSH: Batch upsert to D1
   */
  async pushSync(payload: { books?: Book[]; bookmarks?: Bookmark[]; annotations?: Annotation[] }, roomId?: string | null): Promise<{ success: boolean; error?: string }> {
    const baseUrl = this.getEdgeUrl();
    if (!baseUrl) return { success: false, error: 'Chưa cấu hình Cloudflare Worker URL' };

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = this.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (roomId) headers['X-Sync-Room-Id'] = roomId;

      const res = await fetch(`${baseUrl}/api/sync/push`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json() as any;
      if (res.ok && data.success) {
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  },

  /**
   * Fast Progress Update (< 10ms)
   */
  async updateProgress(bookId: string, pageNumber: number): Promise<boolean> {
    const baseUrl = this.getEdgeUrl();
    if (!baseUrl) return false;

    try {
      const res = await fetch(`${baseUrl}/api/books/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, pageNumber }),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  /**
   * Cloudflare R2: Upload PDF Binary (Zero Egress Fee)
   */
  async uploadPdfToR2(bookId: string, arrayBuffer: ArrayBuffer): Promise<string | null> {
    const baseUrl = this.getEdgeUrl();
    if (!baseUrl) return null;

    try {
      const res = await fetch(`${baseUrl}/api/storage/upload?bookId=${encodeURIComponent(bookId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/pdf' },
        body: arrayBuffer,
      });

      const data = await res.json() as any;
      if (res.ok && data.storageKey) {
        return data.storageKey;
      }
      return null;
    } catch (e) {
      console.warn('R2 upload failed:', e);
      return null;
    }
  },

  /**
   * Cloudflare R2: Download PDF Binary (Zero Egress Fee)
   */
  async downloadPdfFromR2(storageKey: string): Promise<ArrayBuffer | null> {
    const baseUrl = this.getEdgeUrl();
    if (!baseUrl) return null;

    try {
      const res = await fetch(`${baseUrl}/api/storage/download/${encodeURIComponent(storageKey)}`);
      if (res.ok) {
        return await res.arrayBuffer();
      }
      return null;
    } catch (e) {
      console.warn('R2 download failed:', e);
      return null;
    }
  }
};
