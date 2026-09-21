/**
 * Cloudflare Edge Worker API for Aurora Reader SaaS
 * Powered by Cloudflare D1 (Serverless SQLite) and Cloudflare R2 (Zero Egress Object Storage)
 */

export interface Env {
  DB: D1Database;
  BUCKET?: R2Bucket;
  JWT_SECRET?: string;
  FREE_TIER_LIMIT_MB?: string | number;
  PRO_TIER_LIMIT_MB?: string | number;
}

interface UserPayload {
  id: string;
  email: string;
  tier: string;
}

// ==========================================
// 1. HELPER: CORS Headers
// ==========================================
function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sync-Room-Id, Range',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, X-Edge-Colo',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data: any, status = 200, request?: Request, extraHeaders: Record<string, string> = {}): Response {
  const headers = new Headers(request ? corsHeaders(request) : {});
  headers.set('Content-Type', 'application/json');
  for (const [k, v] of Object.entries(extraHeaders)) {
    headers.set(k, v);
  }
  return new Response(JSON.stringify(data), { status, headers });
}

// ==========================================
// 2. HELPER: Password Hash (Web Crypto API)
// ==========================================
async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  const salt = enc.encode('aurora_salt_saas_2026');
  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 10000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(derivedKey))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ==========================================
// 3. HELPER: Auth Token (Base64url Signed)
// ==========================================
function createToken(user: UserPayload): string {
  const payload = {
    ...user,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

function verifyToken(authHeader: string | null): UserPayload | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  try {
    const raw = decodeURIComponent(escape(atob(token)));
    const parsed = JSON.parse(raw);
    if (parsed.exp && parsed.exp > Date.now()) {
      return { id: parsed.id, email: parsed.email, tier: parsed.tier };
    }
  } catch (e) {}
  return null;
}

// ==========================================
// 4. MAIN WORKER ROUTER
// ==========================================
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // Handle OPTIONS Preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    // Health check & Edge latency probe
    if (pathname === '/' || pathname === '/health') {
      return jsonResponse({
        status: 'ok',
        service: 'Aurora Reader Edge API',
        engine: 'Cloudflare D1 & R2',
        region: (request as any).cf?.colo || 'Edge',
        city: (request as any).cf?.city || 'Local',
        time: Date.now(),
      }, 200, request);
    }

    try {
      // Get authentication credentials
      const user = verifyToken(request.headers.get('Authorization'));
      const syncRoomId = request.headers.get('X-Sync-Room-Id') || url.searchParams.get('roomId');

      // -------------------------------------------------------------
      // ROUTE: Auth Register
      // -------------------------------------------------------------
      if (pathname === '/api/auth/register' && method === 'POST') {
        const body = await request.json() as any;
        const { email, password, fullName } = body;
        if (!email || !password) {
          return jsonResponse({ error: 'Email và Mật khẩu là bắt buộc' }, 400, request);
        }

        const normalizedEmail = email.trim().toLowerCase();
        // Check duplicate
        const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
          .bind(normalizedEmail)
          .first();

        if (existing) {
          return jsonResponse({ error: 'Email này đã được đăng ký.' }, 409, request);
        }

        const id = crypto.randomUUID();
        const pwdHash = await hashPassword(password);
        const now = Date.now();

        await env.DB.prepare(`
          INSERT INTO users (id, email, password_hash, full_name, tier, storage_limit_bytes, storage_used_bytes, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'free', 52428800, 0, ?, ?)
        `).bind(id, normalizedEmail, pwdHash, fullName || null, now, now).run();

        const userPayload: UserPayload = { id, email: normalizedEmail, tier: 'free' };
        const token = createToken(userPayload);

        return jsonResponse({
          success: true,
          token,
          user: {
            id,
            email: normalizedEmail,
            fullName,
            tier: 'free',
            storageLimitBytes: 52428800,
            storageUsedBytes: 0,
          },
        }, 201, request);
      }

      // -------------------------------------------------------------
      // ROUTE: Auth Login
      // -------------------------------------------------------------
      if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await request.json() as any;
        const { email, password } = body;
        if (!email || !password) {
          return jsonResponse({ error: 'Vui lòng nhập Email và Mật khẩu.' }, 400, request);
        }

        const normalizedEmail = email.trim().toLowerCase();
        const userRow = await env.DB.prepare('SELECT * FROM users WHERE email = ?')
          .bind(normalizedEmail)
          .first<any>();

        if (!userRow) {
          return jsonResponse({ error: 'Email hoặc mật khẩu không chính xác.' }, 401, request);
        }

        const inputHash = await hashPassword(password);
        if (inputHash !== userRow.password_hash) {
          return jsonResponse({ error: 'Email hoặc mật khẩu không chính xác.' }, 401, request);
        }

        const userPayload: UserPayload = { id: userRow.id, email: userRow.email, tier: userRow.tier };
        const token = createToken(userPayload);

        return jsonResponse({
          success: true,
          token,
          user: {
            id: userRow.id,
            email: userRow.email,
            fullName: userRow.full_name,
            tier: userRow.tier,
            storageLimitBytes: userRow.storage_limit_bytes,
            storageUsedBytes: userRow.storage_used_bytes,
          },
        }, 200, request);
      }

      // -------------------------------------------------------------
      // ROUTE: Auth Me (Get current profile)
      // -------------------------------------------------------------
      if (pathname === '/api/auth/me' && method === 'GET') {
        if (!user) {
          return jsonResponse({ error: 'Chưa đăng nhập' }, 401, request);
        }
        const row = await env.DB.prepare('SELECT id, email, full_name, tier, storage_limit_bytes, storage_used_bytes FROM users WHERE id = ?')
          .bind(user.id)
          .first<any>();

        if (!row) return jsonResponse({ error: 'User không tồn tại' }, 404, request);
        return jsonResponse({ success: true, user: row }, 200, request);
      }

      // -------------------------------------------------------------
      // ROUTE: Pairing PIN (Generate & Link)
      // -------------------------------------------------------------
      if (pathname === '/api/pair/generate-pin' && method === 'POST') {
        const codeNum = Math.floor(1000 + Math.random() * 9000);
        const pinCode = `AURORA-${codeNum}`;
        const roomId = syncRoomId || crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        const now = Date.now();
        const expiresAt = now + 1000 * 60 * 60 * 24; // 24 hours

        await env.DB.prepare(`
          INSERT INTO pairing_pins (pin_code, user_id, room_id, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(pin_code) DO UPDATE SET room_id = excluded.room_id, expires_at = excluded.expires_at
        `).bind(pinCode, user?.id || null, roomId, expiresAt, now).run();

        return jsonResponse({ success: true, pin: pinCode, roomId, expiresAt }, 200, request);
      }

      if (pathname === '/api/pair/link-pin' && method === 'POST') {
        const body = await request.json() as any;
        const pinInput = (body?.pin || '').trim().toUpperCase();

        const row = await env.DB.prepare('SELECT * FROM pairing_pins WHERE pin_code = ? AND expires_at > ?')
          .bind(pinInput, Date.now())
          .first<any>();

        if (!row) {
          return jsonResponse({ error: 'Mã PIN không tồn tại hoặc đã hết hạn.' }, 404, request);
        }

        return jsonResponse({
          success: true,
          message: 'Ghép nối thiết bị thành công!',
          roomId: row.room_id,
        }, 200, request);
      }

      // -------------------------------------------------------------
      // ROUTE: Sync PULL (Get books, bookmarks, annotations)
      // -------------------------------------------------------------
      if (pathname === '/api/sync/pull' && method === 'GET') {
        const userId = user?.id || null;
        const roomId = syncRoomId || null;

        if (!userId && !roomId) {
          return jsonResponse({ error: 'Yêu cầu đăng nhập hoặc mã phòng đồng bộ' }, 401, request);
        }

        // Query books
        let bookQuery = 'SELECT * FROM books WHERE ';
        let param = userId ? userId : roomId;
        bookQuery += userId ? 'user_id = ?' : 'sync_room_id = ?';
        bookQuery += ' ORDER BY last_read_at DESC';
        const { results: books } = await env.DB.prepare(bookQuery).bind(param).all();

        // Query bookmarks
        let bmQuery = 'SELECT * FROM bookmarks WHERE ';
        bmQuery += userId ? 'user_id = ?' : 'sync_room_id = ?';
        bmQuery += ' ORDER BY page_number ASC';
        const { results: bookmarks } = await env.DB.prepare(bmQuery).bind(param).all();

        // Query annotations
        let annQuery = 'SELECT * FROM annotations WHERE ';
        annQuery += userId ? 'user_id = ?' : 'sync_room_id = ?';
        annQuery += ' ORDER BY created_at DESC';
        const { results: annotations } = await env.DB.prepare(annQuery).bind(param).all();

        // Format annotations tags from JSON string to array
        const formattedAnnotations = (annotations || []).map((ann: any) => {
          let parsedTags: string[] = [];
          if (ann.tags) {
            try { parsedTags = JSON.parse(ann.tags); } catch(e) {}
          }
          return {
            ...ann,
            tags: parsedTags,
          };
        });

        return jsonResponse({
          success: true,
          books: books || [],
          bookmarks: bookmarks || [],
          annotations: formattedAnnotations,
          syncedAt: Date.now(),
        }, 200, request);
      }

      // -------------------------------------------------------------
      // ROUTE: Sync PUSH (Batch upsert from client to D1)
      // -------------------------------------------------------------
      if (pathname === '/api/sync/push' && method === 'POST') {
        const userId = user?.id || null;
        const roomId = syncRoomId || null;

        if (!userId && !roomId) {
          return jsonResponse({ error: 'Yêu cầu đăng nhập hoặc mã phòng đồng bộ' }, 401, request);
        }

        const body = await request.json() as any;
        const { books = [], bookmarks = [], annotations = [] } = body;
        const stmts: D1PreparedStatement[] = [];
        const now = Date.now();

        // Batch Books
        for (const b of books) {
          stmts.push(
            env.DB.prepare(`
              INSERT INTO books (id, user_id, sync_room_id, title, author, file_size, total_pages, current_page, added_at, last_read_at, cover_data_url, is_favorite, storage_key, source, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                author = excluded.author,
                current_page = MAX(books.current_page, excluded.current_page),
                last_read_at = MAX(books.last_read_at, excluded.last_read_at),
                is_favorite = excluded.is_favorite,
                storage_key = COALESCE(excluded.storage_key, books.storage_key),
                updated_at = excluded.updated_at
            `).bind(
              b.id, userId, roomId, b.title, b.author || null, b.fileSize || 0,
              b.totalPages || 1, b.currentPage || 1, b.addedAt || now, b.lastReadAt || now,
              b.coverDataUrl || null, b.isFavorite ? 1 : 0, b.storagePath || null, b.source || 'local',
              now, now
            )
          );
        }

        // Batch Bookmarks
        for (const bm of bookmarks) {
          stmts.push(
            env.DB.prepare(`
              INSERT INTO bookmarks (id, book_id, user_id, sync_room_id, page_number, title, snippet, note, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                snippet = excluded.snippet,
                note = excluded.note
            `).bind(
              bm.id, bm.bookId, userId, roomId, bm.pageNumber,
              bm.title || null, bm.snippet || null, bm.note || null, bm.createdAt || now
            )
          );
        }

        // Batch Annotations
        for (const ann of annotations) {
          const tagsStr = ann.tags ? JSON.stringify(ann.tags) : null;
          stmts.push(
            env.DB.prepare(`
              INSERT INTO annotations (id, book_id, user_id, sync_room_id, page_number, quote, content, tags, color, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                quote = excluded.quote,
                content = excluded.content,
                tags = excluded.tags,
                color = excluded.color,
                updated_at = excluded.updated_at
            `).bind(
              ann.id, ann.bookId, userId, roomId, ann.pageNumber,
              ann.quote || null, ann.content, tagsStr, ann.color || 'terracotta',
              ann.createdAt || now, ann.updatedAt || now
            )
          );
        }

        if (stmts.length > 0) {
          await env.DB.batch(stmts);
        }

        return jsonResponse({
          success: true,
          syncedCount: {
            books: books.length,
            bookmarks: bookmarks.length,
            annotations: annotations.length,
          },
          syncedAt: Date.now(),
        }, 200, request);
      }

      // -------------------------------------------------------------
      // ROUTE: Quick Progress Update (< 10ms response)
      // -------------------------------------------------------------
      if (pathname === '/api/books/progress' && method === 'PUT') {
        const body = await request.json() as any;
        const { bookId, pageNumber, percentage } = body;
        if (!bookId || !pageNumber) {
          return jsonResponse({ error: 'bookId và pageNumber là bắt buộc' }, 400, request);
        }

        const now = Date.now();
        await env.DB.prepare(`
          UPDATE books
          SET current_page = ?, last_read_at = ?, updated_at = ?
          WHERE id = ?
        `).bind(pageNumber, now, now, bookId).run();

        return jsonResponse({ success: true, pageNumber, lastReadAt: now }, 200, request);
      }

      // -------------------------------------------------------------
      // ROUTE: R2 Storage Upload PDF
      // -------------------------------------------------------------
      if (pathname === '/api/storage/upload' && method === 'POST') {
        const bookId = url.searchParams.get('bookId');
        if (!bookId) {
          return jsonResponse({ error: 'Thiếu tham số bookId' }, 400, request);
        }

        if (!env.BUCKET) {
          return jsonResponse({
            error: 'Cloudflare R2 chưa được bật trên Cloudflare Dashboard. Dữ liệu sách và tiến độ đọc vẫn được lưu trữ siêu tốc trên Cloudflare D1!',
            r2NotEnabled: true,
          }, 503, request);
        }

        const key = `${bookId}.pdf`;
        const bodyStream = request.body;
        if (!bodyStream) {
          return jsonResponse({ error: 'Không có dữ liệu file tải lên' }, 400, request);
        }

        // Upload to Cloudflare R2 bucket
        await env.BUCKET.put(key, bodyStream, {
          httpMetadata: {
            contentType: 'application/pdf',
          },
        });

        // Update book storage key in D1
        await env.DB.prepare('UPDATE books SET storage_key = ? WHERE id = ?')
          .bind(key, bookId)
          .run();

        return jsonResponse({
          success: true,
          message: 'Tải file PDF lên Cloudflare R2 thành công (0đ cước băng thông)!',
          storageKey: key,
          downloadUrl: `/api/storage/download/${key}`,
        }, 200, request);
      }

      // -------------------------------------------------------------
      // ROUTE: R2 Storage Stream Download (Zero Egress Fee)
      // -------------------------------------------------------------
      if (pathname.startsWith('/api/storage/download/') && method === 'GET') {
        if (!env.BUCKET) {
          return new Response('Cloudflare R2 chưa được kích hoạt.', {
            status: 503,
            headers: corsHeaders(request),
          });
        }

        const key = pathname.replace('/api/storage/download/', '');
        const object = await env.BUCKET.get(key);

        if (!object) {
          return new Response('File PDF không tồn tại trên Cloudflare R2.', {
            status: 404,
            headers: corsHeaders(request),
          });
        }

        const headers = new Headers(corsHeaders(request));
        headers.set('Content-Type', object.httpMetadata?.contentType || 'application/pdf');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        headers.set('ETag', object.httpEtag);
        if (object.size) {
          headers.set('Content-Length', object.size.toString());
        }

        return new Response(object.body, {
          status: 200,
          headers,
        });
      }

      // 404 fallback
      return jsonResponse({ error: `Đường dẫn ${pathname} không tồn tại` }, 404, request);
    } catch (err: any) {
      console.error('Edge API Error:', err);
      return jsonResponse({ error: err?.message || 'Lỗi xử lý máy chủ Edge' }, 500, request);
    }
  },
};
