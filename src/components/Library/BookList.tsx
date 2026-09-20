import React, { useState, useRef } from 'react';
import { Book } from '../../types';
import { BookCard } from './BookCard';
import { 
  UploadCloud, 
  Search, 
  Sparkles, 
  BookOpen, 
  Heart, 
  Compass, 
  Loader2,
  FilePlus,
  Play
} from 'lucide-react';

interface BookListProps {
  books: Book[];
  isLoading: boolean;
  onOpenBook: (book: Book) => void;
  onUploadPdf: (file: File) => Promise<void>;
  onLoadSampleBook: () => Promise<void>;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onDeleteBook: (id: string, e: React.MouseEvent) => void;
}

export const BookList: React.FC<BookListProps> = ({
  books,
  isLoading,
  onOpenBook,
  onUploadPdf,
  onLoadSampleBook,
  onToggleFavorite,
  onDeleteBook
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'reading' | 'favorite'>('all');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter books
  const filteredBooks = books.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterTab === 'reading') return b.currentPage > 1 && b.currentPage < b.totalPages;
    if (filterTab === 'favorite') return !!b.isFavorite;
    return true;
  });

  // Recent / Resume book
  const recentBook = books.length > 0 ? books[0] : null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      alert('Vui lòng chọn file định dạng PDF.');
      return;
    }
    setUploading(true);
    try {
      await onUploadPdf(file);
    } catch (err: any) {
      alert('Lỗi tải file: ' + (err?.message || 'Không thể đọc file PDF.'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      alert('Vui lòng chọn file định dạng PDF.');
      return;
    }
    setUploading(true);
    try {
      await onUploadPdf(file);
    } catch (err: any) {
      alert('Lỗi tải file: ' + (err?.message || 'Không thể đọc file PDF.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/pdf,.pdf"
        className="hidden"
      />

      {/* Hero / Quick Action Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Quick Upload Dropzone Card */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`md:col-span-2 relative overflow-hidden rounded-3xl p-6 sm:p-8 flex flex-col justify-between border-2 border-dashed transition-all cursor-pointer ${
            isDragging
              ? 'border-indigo-400 bg-indigo-950/40 scale-[0.99]'
              : 'border-slate-700/80 bg-gradient-to-br from-slate-800/80 via-slate-800/40 to-indigo-950/20 hover:border-indigo-500/60 hover:shadow-xl hover:shadow-indigo-500/5'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Thư viện Offline 100%</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Tải lên sách PDF của bạn
              </h2>
              <p className="text-sm text-slate-300 max-w-md">
                Kéo thả file PDF vào đây hoặc bấm để tải lên từ điện thoại / máy tính. Tự động lưu trang đã đọc để bạn tiếp tục đọc sách bất kỳ lúc nào!
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400 group-hover:scale-110 transition-transform">
              {uploading ? (
                <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
              ) : (
                <UploadCloud className="w-7 h-7" />
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <FilePlus className="w-4 h-4" />
              <span>{uploading ? 'Đang đọc PDF...' : 'Chọn file PDF'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadSampleBook();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Thêm sách mẫu đọc thử</span>
            </button>
          </div>
        </div>

        {/* Quick Resume Card (if books exist) */}
        {recentBook ? (
          <div
            onClick={() => onOpenBook(recentBook)}
            className="rounded-3xl p-6 bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-indigo-500/30 flex flex-col justify-between relative overflow-hidden group cursor-pointer shadow-lg hover:shadow-indigo-500/20 transition-all"
          >
            <div className="relative z-10">
              <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                Đang đọc dở gần nhất
              </span>
              <h3 className="text-base font-bold text-white line-clamp-2 mt-1 group-hover:text-indigo-200 transition-colors">
                {recentBook.title}
              </h3>
              <p className="text-xs text-slate-300 mt-2">
                Trang {recentBook.currentPage} / {recentBook.totalPages} ({Math.round((recentBook.currentPage / recentBook.totalPages) * 100)}%)
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-lg shadow-indigo-600/40 group-hover:bg-indigo-500 transition-all">
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Đọc tiếp ngay</span>
              </div>
              {recentBook.coverDataUrl && (
                <img
                  src={recentBook.coverDataUrl}
                  alt=""
                  className="w-12 h-16 object-cover rounded-lg shadow-md border border-white/10"
                />
              )}
            </div>

            {/* Background subtle glow */}
            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-indigo-600/20 rounded-full blur-2xl pointer-events-none" />
          </div>
        ) : (
          <div className="rounded-3xl p-6 bg-slate-800/40 border border-slate-800 flex flex-col items-center justify-center text-center">
            <BookOpen className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-xs text-slate-400 font-medium">Chưa có cuốn sách nào</p>
            <p className="text-[11px] text-slate-500 mt-1">Tải sách hoặc thêm sách mẫu để bắt đầu</p>
          </div>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        {/* Tabs */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 w-full sm:w-auto">
          <button
            onClick={() => setFilterTab('all')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              filterTab === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tất cả ({books.length})
          </button>
          <button
            onClick={() => setFilterTab('reading')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              filterTab === 'reading'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Đang đọc ({books.filter(b => b.currentPage > 1 && b.currentPage < b.totalPages).length})
          </button>
          <button
            onClick={() => setFilterTab('favorite')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              filterTab === 'favorite'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Yêu thích ({books.filter(b => b.isFavorite).length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm sách..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/70 rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Book Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
          <p className="text-sm">Đang tải thư viện sách...</p>
        </div>
      ) : filteredBooks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onOpenBook={onOpenBook}
              onToggleFavorite={onToggleFavorite}
              onDeleteBook={onDeleteBook}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center rounded-3xl bg-slate-800/30 border border-slate-800 p-8">
          <Compass className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">Không tìm thấy sách nào</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery ? 'Thử tìm kiếm với từ khoá khác hoặc xoá bộ lọc.' : 'Hãy tải lên cuốn sách PDF đầu tiên của bạn để bắt đầu đọc và nghe podcast!'}
          </p>
          {!searchQuery && (
            <button
              onClick={onLoadSampleBook}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Thêm sách mẫu</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
