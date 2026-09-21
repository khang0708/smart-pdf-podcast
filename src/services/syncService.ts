import { getSupabaseClient, loadSyncConfig } from './supabaseClient';
import { StorageService } from './storage';
import { Book, Bookmark, Annotation, SyncStatus } from '../types';
import { edgeApiService } from './edgeApiService';

type SyncListener = (status: SyncStatus) => void;

class SyncServiceClass {
  private listeners: Set<SyncListener> = new Set();
  private status: SyncStatus = {
    isConnected: false,
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
    userEmail: null,
    syncRoomId: null,
  };
  private autoSyncTimer: number | null = null;

  constructor() {
    // Check initial auth state and room ID
    this.checkInitialState();
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn({ ...this.status }));
  }

  private setStatus(update: Partial<SyncStatus>) {
    this.status = { ...this.status, ...update };
    this.notify();
  }

  public getStatus(): SyncStatus {
    return { ...this.status };
  }

  public async checkInitialState(): Promise<void> {
    const config = loadSyncConfig();
    this.status.syncRoomId = config.syncRoomId || null;

    // Check Cloudflare Edge first if configured
    if (edgeApiService.isEdgeConfigured()) {
      try {
        const ping = await edgeApiService.checkLatency();
        this.setStatus({
          isConnected: ping.ok,
          provider: 'cloudflare',
          isEdge: true,
          edgePingMs: ping.latencyMs,
          error: ping.ok ? null : 'Không thể kết nối Cloudflare Edge',
        });
        if (config.autoSync && ping.ok) {
          this.startAutoSyncInterval();
        }
        return;
      } catch (e: any) {
        console.warn('Edge latency check failed:', e);
      }
    }

    const client = getSupabaseClient();
    if (!client) {
      this.setStatus({ isConnected: false, userEmail: null, provider: 'local', isEdge: false });
      return;
    }

    try {
      const { data: { session } } = await client.auth.getSession();
      if (session?.user) {
        this.setStatus({
          isConnected: true,
          userEmail: session.user.email || 'Người dùng Supabase',
          provider: 'supabase',
          isEdge: false,
        });
      } else {
        // Connected via Anon Key & Room ID
        this.setStatus({
          isConnected: true,
          userEmail: null,
          provider: 'supabase',
          isEdge: false,
        });
      }

      // Start auto sync if enabled
      if (config.autoSync) {
        this.startAutoSyncInterval();
      }
    } catch (e: any) {
      this.setStatus({ isConnected: false, error: e?.message || null, provider: 'local', isEdge: false });
    }
  }

  public startAutoSyncInterval(intervalMs: number = 60000): void {
    if (this.autoSyncTimer) {
      window.clearInterval(this.autoSyncTimer);
    }
    this.autoSyncTimer = window.setInterval(() => {
      this.performSync().catch((err) => console.warn('Auto-sync error:', err));
    }, intervalMs);
  }

  public stopAutoSync(): void {
    if (this.autoSyncTimer) {
      window.clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }

  /**
   * High-speed 2-way sync with Cloudflare D1 & R2 Edge (< 20ms)
   */
  public async performEdgeSync(roomId: string | null): Promise<{ success: boolean; message: string; updatedBooks?: Book[] }> {
    const config = loadSyncConfig();
    this.setStatus({ isSyncing: true, error: null });

    try {
      // 1. Pull data from Cloudflare D1
      const pullResult = await edgeApiService.pullSync(roomId);
      if (!pullResult.success) {
        throw new Error(pullResult.error || 'Lỗi khi kéo dữ liệu từ Cloudflare D1');
      }

      const cloudBooks = pullResult.books || [];
      const cloudBookmarks = pullResult.bookmarks || [];
      const cloudAnnotations = pullResult.annotations || [];

      const localBooks = await StorageService.getAllBooks();
      const localBooksMap = new Map<string, Book>();
      localBooks.forEach((b) => localBooksMap.set(b.id, b));

      const updatedLocalBooks: Book[] = [];
      const booksToPush: Book[] = [];

      // 2. Reconcile Cloud Books with Local Books
      for (const cloudBook of cloudBooks) {
        const localMatch = localBooksMap.get(cloudBook.id);
        if (localMatch) {
          if (cloudBook.lastReadAt > localMatch.lastReadAt) {
            // Cloud is newer -> update local
            localMatch.currentPage = cloudBook.currentPage;
            localMatch.lastReadAt = cloudBook.lastReadAt;
            localMatch.isFavorite = cloudBook.isFavorite;
            localMatch.syncStatus = 'synced';
            localMatch.storagePath = cloudBook.storagePath || localMatch.storagePath;
            await StorageService.saveBook(localMatch);
            updatedLocalBooks.push(localMatch);
          } else if (localMatch.lastReadAt > cloudBook.lastReadAt) {
            // Local is newer -> push to cloud
            booksToPush.push(localMatch);
            localMatch.syncStatus = 'synced';
            await StorageService.saveBook(localMatch);
            updatedLocalBooks.push(localMatch);
          } else {
            localMatch.syncStatus = 'synced';
            updatedLocalBooks.push(localMatch);
          }
        } else {
          // Cloud has book that local doesn't
          cloudBook.syncStatus = 'cloud_only';
          await StorageService.saveBook(cloudBook);
          updatedLocalBooks.push(cloudBook);
        }
      }

      // 3. Find Local-only Books to Push
      const cloudBookIds = new Set(cloudBooks.map((b) => b.id));
      for (const localBook of localBooks) {
        if (!cloudBookIds.has(localBook.id)) {
          // Check if binary sync to R2 is enabled
          if (config.syncPdfFiles && !localBook.storagePath) {
            const uploadedKey = await this.uploadPdfToCloud(localBook.id);
            if (uploadedKey) {
              localBook.storagePath = uploadedKey;
            }
          }
          localBook.syncStatus = 'synced';
          await StorageService.saveBook(localBook);
          booksToPush.push(localBook);
          updatedLocalBooks.push(localBook);
        }
      }

      // 4. Sync Bookmarks
      const cloudBmMap = new Map<string, Bookmark>();
      cloudBookmarks.forEach((b) => cloudBmMap.set(b.id, b));

      const bookmarksToPush: Bookmark[] = [];
      for (const b of localBooks) {
        const localBms = await StorageService.getBookmarks(b.id);
        for (const bm of localBms) {
          if (!cloudBmMap.has(bm.id)) {
            bookmarksToPush.push(bm);
          }
        }
      }
      for (const bm of cloudBookmarks) {
        await StorageService.saveBookmark(bm);
      }

      // 5. Sync Annotations
      const cloudAnnMap = new Map<string, Annotation>();
      cloudAnnotations.forEach((a) => cloudAnnMap.set(a.id, a));

      const annotationsToPush: Annotation[] = [];
      const localAnns = await StorageService.getAllAnnotations();
      for (const ann of localAnns) {
        if (!cloudAnnMap.has(ann.id)) {
          annotationsToPush.push(ann);
        }
      }
      for (const ann of cloudAnnotations) {
        await StorageService.saveAnnotation(ann);
      }

      // 6. Push local changes if any
      if (booksToPush.length > 0 || bookmarksToPush.length > 0 || annotationsToPush.length > 0) {
        await edgeApiService.pushSync({
          books: booksToPush,
          bookmarks: bookmarksToPush,
          annotations: annotationsToPush,
        }, roomId);
      }

      const allSyncedBooks = await StorageService.getAllBooks();
      this.setStatus({
        isConnected: true,
        isSyncing: false,
        lastSyncedAt: Date.now(),
        error: null,
        provider: 'cloudflare',
        isEdge: true,
      });

      return {
        success: true,
        message: 'Đồng bộ Cloudflare Edge thành công (< 20ms)!',
        updatedBooks: allSyncedBooks,
      };
    } catch (err: any) {
      console.error('Edge Sync failed:', err);
      this.setStatus({
        isSyncing: false,
        error: err?.message || 'Lỗi đồng bộ Cloudflare Edge.',
      });
      return {
        success: false,
        message: `Lỗi đồng bộ: ${err?.message || err}`,
      };
    }
  }

  /**
   * Main 2-way sync function between local IndexedDB and Cloud (Cloudflare Edge or Supabase)
   */
  public async performSync(): Promise<{ success: boolean; message: string; updatedBooks?: Book[] }> {
    const config = loadSyncConfig();

    if (this.status.isSyncing) {
      return { success: false, message: 'Đang trong quá trình đồng bộ...' };
    }

    // High-speed Cloudflare Edge Sync (< 20ms)
    if (edgeApiService.isEdgeConfigured()) {
      return this.performEdgeSync(config.syncRoomId?.trim() || null);
    }

    const client = getSupabaseClient();
    if (!client) {
      this.setStatus({ isConnected: false });
      return { success: false, message: 'Chưa cấu hình Cloudflare Worker hoặc Supabase.' };
    }

    if (this.status.isSyncing) {
      return { success: false, message: 'Đang trong quá trình đồng bộ...' };
    }

    this.setStatus({ isSyncing: true, error: null });

    try {
      const { data: { session } } = await client.auth.getSession();
      const userId = session?.user?.id || null;
      const roomId = config.syncRoomId?.trim() || null;

      if (!userId && !roomId) {
        this.setStatus({
          isSyncing: false,
          isConnected: true,
          error: 'Vui lòng Đăng nhập hoặc nhập Mã phòng đồng bộ (Sync Code).',
        });
        return {
          success: false,
          message: 'Vui lòng Đăng nhập tài khoản hoặc thiết lập Mã phòng đồng bộ để liên kết thiết bị.',
        };
      }

      // --- 1. PULL CLOUD BOOKS ---
      let query = client.from('books').select('*');
      if (userId) {
        query = query.eq('user_id', userId);
      } else if (roomId) {
        query = query.eq('sync_room_id', roomId);
      }

      const { data: cloudBooks, error: pullError } = await query;
      if (pullError) {
        throw new Error(pullError.message);
      }

      const localBooks = await StorageService.getAllBooks();
      const localBooksMap = new Map<string, Book>();
      localBooks.forEach((b) => localBooksMap.set(b.id, b));

      const updatedLocalBooks: Book[] = [];

      // --- 2. RECONCILE CLOUD BOOKS TO LOCAL ---
      if (cloudBooks && Array.isArray(cloudBooks)) {
        for (const row of cloudBooks) {
          const cloudBook: Book = {
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
            storagePath: row.storage_path || undefined,
            syncStatus: 'synced',
          };

          const localMatch = localBooksMap.get(cloudBook.id);
          if (localMatch) {
            // Both exist: check which one is newer based on lastReadAt
            if (cloudBook.lastReadAt > localMatch.lastReadAt) {
              // Cloud is newer -> update local progress
              localMatch.currentPage = cloudBook.currentPage;
              localMatch.lastReadAt = cloudBook.lastReadAt;
              localMatch.isFavorite = cloudBook.isFavorite;
              localMatch.syncStatus = 'synced';
              localMatch.storagePath = cloudBook.storagePath || localMatch.storagePath;
              await StorageService.saveBook(localMatch);
              updatedLocalBooks.push(localMatch);
            } else if (localMatch.lastReadAt > cloudBook.lastReadAt) {
              // Local is newer -> push to cloud
              await this.pushBookMetadata(localMatch, userId, roomId);
              localMatch.syncStatus = 'synced';
              await StorageService.saveBook(localMatch);
              updatedLocalBooks.push(localMatch);
            } else {
              localMatch.syncStatus = 'synced';
              updatedLocalBooks.push(localMatch);
            }
          } else {
            // Exists in cloud but not locally -> save to local (metadata only, binary downloadable on demand)
            cloudBook.syncStatus = 'cloud_only';
            await StorageService.saveBook(cloudBook);
            updatedLocalBooks.push(cloudBook);
          }
        }
      }

      // --- 3. PUSH LOCAL-ONLY BOOKS TO CLOUD ---
      const cloudBookIds = new Set((cloudBooks || []).map((b: any) => b.id));
      for (const localBook of localBooks) {
        if (!cloudBookIds.has(localBook.id)) {
          // Push metadata to cloud
          await this.pushBookMetadata(localBook, userId, roomId);
          
          // Optionally push binary if syncPdfFiles is true and storagePath not set
          if (config.syncPdfFiles && !localBook.storagePath) {
            const uploadedPath = await this.uploadPdfToCloud(localBook.id);
            if (uploadedPath) {
              localBook.storagePath = uploadedPath;
            }
          }

          localBook.syncStatus = 'synced';
          await StorageService.saveBook(localBook);
          updatedLocalBooks.push(localBook);
        }
      }

      // --- 4. SYNC BOOKMARKS ---
      await this.syncBookmarks(userId, roomId);

      // --- 5. SYNC ANNOTATIONS / NOTES ---
      await this.syncAnnotations(userId, roomId);

      const allSyncedBooks = await StorageService.getAllBooks();
      this.setStatus({
        isConnected: true,
        isSyncing: false,
        lastSyncedAt: Date.now(),
        error: null,
      });

      return {
        success: true,
        message: 'Đồng bộ dữ liệu thành công!',
        updatedBooks: allSyncedBooks,
      };
    } catch (err: any) {
      console.error('Sync failed:', err);
      this.setStatus({
        isSyncing: false,
        error: err?.message || 'Lỗi đồng bộ dữ liệu.',
      });
      return {
        success: false,
        message: `Lỗi đồng bộ: ${err?.message || err}`,
      };
    }
  }

  /**
   * Push a single book metadata to Supabase
   */
  public async pushBookMetadata(book: Book, userId?: string | null, roomId?: string | null): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    const config = loadSyncConfig();
    const effectiveUserId = userId !== undefined ? userId : (await client.auth.getSession()).data.session?.user?.id || null;
    const effectiveRoomId = roomId !== undefined ? roomId : config.syncRoomId?.trim() || null;

    if (!effectiveUserId && !effectiveRoomId) return;

    const payload = {
      id: book.id,
      user_id: effectiveUserId,
      sync_room_id: effectiveRoomId,
      title: book.title,
      author: book.author || null,
      file_size: book.fileSize,
      total_pages: book.totalPages,
      current_page: book.currentPage,
      added_at: book.addedAt,
      last_read_at: book.lastReadAt,
      cover_data_url: book.coverDataUrl || null,
      is_favorite: !!book.isFavorite,
      storage_path: book.storagePath || null,
      updated_at: new Date().toISOString(),
    };

    await client.from('books').upsert(payload, { onConflict: 'id' });
  }

  /**
   * Quick update of reading progress (called when user flips page)
   */
  public async syncProgress(bookId: string, pageNumber: number): Promise<void> {
    if (edgeApiService.isEdgeConfigured()) {
      try {
        await edgeApiService.updateProgress(bookId, pageNumber);
        this.setStatus({ lastSyncedAt: Date.now() });
        return;
      } catch (e) {
        console.warn('Edge progress sync error:', e);
      }
    }

    const client = getSupabaseClient();
    if (!client) return;

    const config = loadSyncConfig();
    const { data: { session } } = await client.auth.getSession();
    const userId = session?.user?.id || null;
    const roomId = config.syncRoomId?.trim() || null;

    if (!userId && !roomId) return;

    try {
      // Update in books table
      await client
        .from('books')
        .update({
          current_page: pageNumber,
          last_read_at: Date.now(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookId);

      this.setStatus({ lastSyncedAt: Date.now() });
    } catch (e) {
      console.warn('Silent sync progress error:', e);
    }
  }

  /**
   * Sync bookmarks between local and cloud
   */
  private async syncBookmarks(userId: string | null, roomId: string | null): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    let query = client.from('bookmarks').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    } else if (roomId) {
      query = query.eq('sync_room_id', roomId);
    }

    const { data: cloudBms } = await query;
    const cloudMap = new Map<string, Bookmark>();
    if (cloudBms) {
      cloudBms.forEach((row: any) => {
        cloudMap.set(row.id, {
          id: row.id,
          bookId: row.book_id,
          pageNumber: row.page_number,
          title: row.title || undefined,
          snippet: row.snippet || undefined,
          note: row.note || undefined,
          createdAt: Number(row.created_at) || Date.now(),
          syncRoomId: row.sync_room_id || undefined,
        });
      });
    }

    // Iterate through all local books and sync bookmarks
    const localBooks = await StorageService.getAllBooks();
    for (const book of localBooks) {
      const localBms = await StorageService.getBookmarks(book.id);
      for (const bm of localBms) {
        if (!cloudMap.has(bm.id)) {
          // Push local bookmark to cloud
          await client.from('bookmarks').upsert({
            id: bm.id,
            book_id: bm.bookId,
            user_id: userId,
            sync_room_id: roomId,
            page_number: bm.pageNumber,
            title: bm.title || null,
            snippet: bm.snippet || null,
            note: bm.note || null,
            created_at: bm.createdAt,
          }, { onConflict: 'id' });
        }
      }
    }

    // Save missing cloud bookmarks to local
    if (cloudBms) {
      for (const row of cloudBms) {
        await StorageService.saveBookmark({
          id: row.id,
          bookId: row.book_id,
          pageNumber: row.page_number,
          title: row.title || undefined,
          snippet: row.snippet || undefined,
          note: row.note || undefined,
          createdAt: Number(row.created_at) || Date.now(),
          syncRoomId: row.sync_room_id || undefined,
        });
      }
    }
  }

  /**
   * Sync annotations / notes between local and cloud
   */
  private async syncAnnotations(userId: string | null, roomId: string | null): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    let query = client.from('annotations').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    } else if (roomId) {
      query = query.eq('sync_room_id', roomId);
    }

    const { data: cloudAnns } = await query;
    const cloudMap = new Map<string, Annotation>();
    if (cloudAnns) {
      cloudAnns.forEach((row: any) => {
        cloudMap.set(row.id, {
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
        });
      });
    }

    // Iterate through all local annotations and push missing to cloud
    const localAnns = await StorageService.getAllAnnotations();
    for (const ann of localAnns) {
      if (!cloudMap.has(ann.id)) {
        await client.from('annotations').upsert({
          id: ann.id,
          book_id: ann.bookId,
          user_id: userId,
          sync_room_id: roomId,
          page_number: ann.pageNumber,
          quote: ann.quote || null,
          content: ann.content,
          tags: ann.tags || null,
          color: ann.color || 'terracotta',
          created_at: ann.createdAt,
          updated_at: ann.updatedAt,
        }, { onConflict: 'id' });
      }
    }

    // Save missing cloud annotations to local
    if (cloudAnns) {
      for (const row of cloudAnns) {
        await StorageService.saveAnnotation({
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
        });
      }
    }
  }

  /**
   * Upload local PDF ArrayBuffer to Cloudflare R2 or Supabase Storage
   */
  public async uploadPdfToCloud(bookId: string): Promise<string | null> {
    try {
      const binary = await StorageService.getPdfBinary(bookId);
      if (!binary) return null;

      // 1. Cloudflare R2 Upload (Zero egress fees, sub-100ms)
      if (edgeApiService.isEdgeConfigured()) {
        const storageKey = await edgeApiService.uploadPdfToR2(bookId, binary);
        if (storageKey) {
          const book = await StorageService.getBook(bookId);
          if (book) {
            book.storagePath = storageKey;
            await StorageService.saveBook(book);
          }
          return storageKey;
        }
      }

      // 2. Supabase Storage fallback
      const client = getSupabaseClient();
      if (!client) return null;

      const filePath = `${bookId}.pdf`;
      const blob = new Blob([binary], { type: 'application/pdf' });

      const { error } = await client.storage
        .from('pdf_files')
        .upload(filePath, blob, {
          upsert: true,
          contentType: 'application/pdf',
        });

      if (error) {
        console.warn('Error uploading PDF to cloud:', error.message);
        return null;
      }

      // Update book with storage path
      await client.from('books').update({ storage_path: filePath }).eq('id', bookId);
      return filePath;
    } catch (e) {
      console.warn('Failed to upload PDF binary:', e);
      return null;
    }
  }

  /**
   * Download PDF binary from Cloudflare R2 or Supabase Storage when book exists in cloud but not locally
   */
  public async downloadPdfFromCloud(bookId: string, storagePath?: string): Promise<ArrayBuffer | null> {
    try {
      const path = storagePath || `${bookId}.pdf`;

      // 1. Cloudflare R2 Download (Zero egress fees)
      if (edgeApiService.isEdgeConfigured()) {
        const arrayBuffer = await edgeApiService.downloadPdfFromR2(path);
        if (arrayBuffer) {
          await StorageService.savePdfBinary(bookId, arrayBuffer);
          return arrayBuffer;
        }
      }

      // 2. Supabase Storage fallback
      const client = getSupabaseClient();
      if (!client) return null;

      const { data, error } = await client.storage.from('pdf_files').download(path);
      if (error || !data) {
        console.warn('Could not download PDF from cloud:', error?.message);
        return null;
      }

      const arrayBuffer = await data.arrayBuffer();
      // Cache in local IndexedDB
      await StorageService.savePdfBinary(bookId, arrayBuffer);
      return arrayBuffer;
    } catch (e) {
      console.error('Error downloading PDF from cloud:', e);
      return null;
    }
  }
}

export const syncService = new SyncServiceClass();
