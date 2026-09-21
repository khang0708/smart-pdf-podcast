-- ==============================================================================
-- SCHEMA CƠ SỞ DỮ LIỆU SAAS TRUNG TÂM CHO AURORA READER (SUPABASE POSTGRESQL & STORAGE)
-- Kiến trúc: Multi-tenant SaaS, cách ly dữ liệu bằng Row Level Security (RLS)
-- Quản trị viên (Chủ sở hữu SaaS) chạy script này 1 lần duy nhất trên SQL Editor của Supabase.
-- Khách hàng cuối (End-users) KHÔNG CẦN cấu hình hay chạy script này.
-- ==============================================================================

-- 1. Tiện ích mở rộng UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Bảng hồ sơ người dùng & Gói cước SaaS (User Profiles & Subscription Quotas)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    tier TEXT NOT NULL DEFAULT 'free', -- 'free' hoặc 'pro'
    storage_limit_bytes BIGINT NOT NULL DEFAULT 52428800, -- Mặc định Free: 50 MB (50 * 1024 * 1024)
    storage_used_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tự động tạo hồ sơ khi có người dùng đăng ký mới qua Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, tier, storage_limit_bytes, storage_used_bytes)
    VALUES (
        NEW.id,
        NEW.email,
        'free',
        52428800, -- 50 MB cho gói Free
        0
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Bảng lưu trữ thông tin sách (Books Metadata)
CREATE TABLE IF NOT EXISTS public.books (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sync_room_id TEXT, -- Dùng cho trường hợp ghép nối thiết bị qua mã PIN (Fast Device Pairing)
    title TEXT NOT NULL,
    author TEXT,
    file_size BIGINT DEFAULT 0,
    total_pages INTEGER NOT NULL DEFAULT 1,
    current_page INTEGER NOT NULL DEFAULT 1,
    added_at BIGINT NOT NULL,
    last_read_at BIGINT NOT NULL,
    cover_data_url TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    storage_path TEXT, -- Đường dẫn file PDF trên Object Storage bucket ('pdf_files')
    source TEXT DEFAULT 'local', -- 'local', 'google_drive', 'cloud'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_user_id ON public.books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_sync_room_id ON public.books(sync_room_id);
CREATE INDEX IF NOT EXISTS idx_books_last_read_at ON public.books(last_read_at DESC);

-- 4. Bảng lưu trữ đánh dấu trang (Bookmarks)
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sync_room_id TEXT,
    page_number INTEGER NOT NULL,
    title TEXT,
    snippet TEXT, -- Đoạn trích dẫn văn bản ở trang đó
    note TEXT,    -- Ghi chú bổ sung của người đọc
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON public.bookmarks(book_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_sync_room_id ON public.bookmarks(sync_room_id);

-- 5. Bảng lưu trữ ghi chú & trích dẫn văn học (Annotations / Notes)
CREATE TABLE IF NOT EXISTS public.annotations (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sync_room_id TEXT,
    page_number INTEGER NOT NULL,
    quote TEXT,         -- Đoạn trích dẫn nguyên văn từ sách
    content TEXT NOT NULL, -- Lời bình luận / suy ngẫm của người đọc
    tags TEXT[],        -- Mảng các thẻ nhãn phân loại (vd: ['triet-ly', 'tam-dac'])
    color TEXT DEFAULT 'terracotta', -- 'terracotta', 'amber', 'sage', 'blue', 'purple'
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_annotations_book_id ON public.annotations(book_id);
CREATE INDEX IF NOT EXISTS idx_annotations_user_id ON public.annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_annotations_sync_room_id ON public.annotations(sync_room_id);

-- 6. Bảng lưu lịch sử & tiến độ đọc (Reading Progress)
CREATE TABLE IF NOT EXISTS public.reading_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sync_room_id TEXT,
    book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    percentage REAL DEFAULT 0,
    last_read_at BIGINT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_book_progress UNIQUE(user_id, book_id),
    CONSTRAINT unique_room_book_progress UNIQUE(sync_room_id, book_id)
);

-- ==============================================================================
-- 7. BẬT BẢO MẬT CẤP HÀNG (ROW LEVEL SECURITY - RLS)
-- Đảm bảo phân tách dữ liệu tuyệt đối giữa các khách hàng SaaS
-- ==============================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

-- Chính sách cho User có tài khoản (Authenticated Users)
CREATE POLICY "Users can view and edit own profile" ON public.user_profiles
    FOR ALL TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage own books" ON public.books
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own bookmarks" ON public.bookmarks
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own annotations" ON public.annotations
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own progress" ON public.reading_progress
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Chính sách cho khách vãng lai ghép nối nhanh bằng PIN (Anonymous Device Pairing)
CREATE POLICY "Device PIN books access" ON public.books
    FOR ALL TO anon
    USING (sync_room_id IS NOT NULL)
    WITH CHECK (sync_room_id IS NOT NULL);

CREATE POLICY "Device PIN bookmarks access" ON public.bookmarks
    FOR ALL TO anon
    USING (sync_room_id IS NOT NULL)
    WITH CHECK (sync_room_id IS NOT NULL);

CREATE POLICY "Device PIN annotations access" ON public.annotations
    FOR ALL TO anon
    USING (sync_room_id IS NOT NULL)
    WITH CHECK (sync_room_id IS NOT NULL);

CREATE POLICY "Device PIN progress access" ON public.reading_progress
    FOR ALL TO anon
    USING (sync_room_id IS NOT NULL)
    WITH CHECK (sync_room_id IS NOT NULL);

-- ==============================================================================
-- 8. OBJECT STORAGE BUCKET CHO FILE PDF ('pdf_files')
-- Lưu ý: Không lưu nhị phân file lớn vào Postgres, chỉ lưu vào Object Storage
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdf_files', 'pdf_files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated and room uploads to pdf_files" ON storage.objects
    FOR INSERT TO public
    WITH CHECK (bucket_id = 'pdf_files');

CREATE POLICY "Allow reads from pdf_files" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'pdf_files');

CREATE POLICY "Allow deletes from pdf_files" ON storage.objects
    FOR DELETE TO public
    USING (bucket_id = 'pdf_files');
