-- ==============================================================================
-- CLOUDFLARE D1 SQLITE SCHEMA CHO NỀN TẢNG SAAS AURORA READER
-- Chạy lệnh khởi tạo: npx wrangler d1 execute aurora-db --file=./schema.sql
-- ==============================================================================

-- 1. Bảng người dùng SaaS & Hạn mức gói cước (Users & Quotas)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    tier TEXT DEFAULT 'free', -- 'free' hoặc 'pro'
    storage_limit_bytes INTEGER DEFAULT 52428800, -- 50 MB Free tier
    storage_used_bytes INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Bảng mã PIN ghép nối thiết bị tức thì (Fast Device Pairing PINs)
CREATE TABLE IF NOT EXISTS pairing_pins (
    pin_code TEXT PRIMARY KEY, -- vd: AURORA-8899
    user_id TEXT,
    room_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pins_room_id ON pairing_pins(room_id);

-- 3. Bảng lưu trữ thông tin sách (Books Metadata)
CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    sync_room_id TEXT, -- Cho phép ghép nối thiết bị ẩn danh bằng mã PIN
    title TEXT NOT NULL,
    author TEXT,
    file_size INTEGER DEFAULT 0,
    total_pages INTEGER DEFAULT 1,
    current_page INTEGER DEFAULT 1,
    added_at INTEGER NOT NULL,
    last_read_at INTEGER NOT NULL,
    cover_data_url TEXT,
    is_favorite INTEGER DEFAULT 0, -- 0 hoặc 1 (boolean SQLite)
    storage_key TEXT, -- Khóa lưu trữ file PDF trong Cloudflare R2 Bucket
    source TEXT DEFAULT 'local',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_sync_room ON books(sync_room_id);
CREATE INDEX IF NOT EXISTS idx_books_last_read ON books(last_read_at DESC);

-- 4. Bảng lưu trữ đánh dấu trang (Bookmarks)
CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    user_id TEXT,
    sync_room_id TEXT,
    page_number INTEGER NOT NULL,
    title TEXT,
    snippet TEXT,
    note TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON bookmarks(book_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_sync_room ON bookmarks(sync_room_id);

-- 5. Bảng lưu trữ ghi chú & trích dẫn văn học (Annotations / Notes)
CREATE TABLE IF NOT EXISTS annotations (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    user_id TEXT,
    sync_room_id TEXT,
    page_number INTEGER NOT NULL,
    quote TEXT,
    content TEXT NOT NULL,
    tags TEXT, -- JSON chuỗi mảng thẻ nhãn: '["triết-lý","tâm-đắc"]'
    color TEXT DEFAULT 'terracotta',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_annotations_book_id ON annotations(book_id);
CREATE INDEX IF NOT EXISTS idx_annotations_user_id ON annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_annotations_sync_room ON annotations(sync_room_id);

-- 6. Bảng lưu lịch sử tiến độ đọc trang (Reading Progress)
CREATE TABLE IF NOT EXISTS reading_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    sync_room_id TEXT,
    book_id TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    percentage REAL DEFAULT 0,
    last_read_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_progress_lookup ON reading_progress(user_id, sync_room_id, book_id);
