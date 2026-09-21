import React, { useState, useMemo } from 'react';
import { Book } from '../../types';
import { 
  BookOpen, 
  Heart, 
  Trash2, 
  Search, 
  Plus, 
  Cloud, 
  HardDrive, 
  CheckCircle2, 
  Clock, 
  Grid, 
  List, 
  Sparkles,
  ArrowUpDown,
  Filter
} from 'lucide-react';

interface LibraryViewProps {
  books: Book[];
  onOpenBook: (book: Book) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onDeleteBook: (id: string, e: React.MouseEvent) => void;
  onUploadClick: () => void;
  onOpenDrive: () => void;
  onLoadSampleBook: () => void;
}

// Procedural Atelier Cover Palettes
const ATELIER_PALETTES = [
  {
    bg: 'linear-gradient(145deg, #ad522a 0%, #b85930 45%, #9d4621 100%)',
    border: 'border-[#c76537]/50',
    titleColor: 'text-[#fbf0e6]',
    authorColor: 'text-[#fbf0e6]/90',
  },
  {
    bg: '#f1ede4',
    border: 'border-[#ded5c5]',
    titleColor: 'text-[#832626]',
    authorColor: 'text-stone-800',
  },
  {
    bg: 'linear-gradient(145deg, #183323 0%, #1e3d2b 50%, #142a1d 100%)',
    border: 'border-[#274632]',
    titleColor: 'text-[#d6c085]',
    authorColor: 'text-[#cbb37a]',
  },
  {
    bg: 'linear-gradient(145deg, #2d3b32 0%, #3a4b40 50%, #222d26 100%)',
    border: 'border-[#3f5246]',
    titleColor: 'text-[#e2ebdf]',
    authorColor: 'text-stone-400',
  },
  {
    bg: 'linear-gradient(145deg, #252b24 0%, #30372e 60%, #1e231d 100%)',
    border: 'border-[#30372f]',
    titleColor: 'text-[#c9cebe]',
    authorColor: 'text-stone-400',
  },
  {
    bg: 'linear-gradient(145deg, #8c4c23 0%, #9e592c 50%, #7d3f1a 100%)',
    border: 'border-[#a85e33]',
    titleColor: 'text-[#fdefde]',
    authorColor: 'text-[#fdefde]/85',
  }
];

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  onOpenBook,
  onToggleFavorite,
  onDeleteBook,
  onUploadClick,
  onOpenDrive,
  onLoadSampleBook,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'reading' | 'favorites' | 'completed'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'local' | 'google_drive' | 'cloud'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'progress'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Stats calculation
  const totalBooks = books.length;
  const readingCount = books.filter(b => b.currentPage > 1 && b.currentPage < b.totalPages).length;
  const completedCount = books.filter(b => b.currentPage >= b.totalPages).length;
  const favoriteCount = books.filter(b => b.isFavorite).length;

  // Filter & Sort
  const filteredBooks = useMemo(() => {
    return books
      .filter(b => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = b.title.toLowerCase().includes(q);
          const matchAuthor = b.author?.toLowerCase().includes(q) || false;
          if (!matchTitle && !matchAuthor) return false;
        }
        // Status tab
        if (filterTab === 'reading') {
          return b.currentPage > 1 && b.currentPage < b.totalPages;
        }
        if (filterTab === 'favorites') {
          return !!b.isFavorite;
        }
        if (filterTab === 'completed') {
          return b.currentPage >= b.totalPages;
        }
        // Source
        if (sourceFilter !== 'all') {
          if (b.source !== sourceFilter) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'recent') return b.lastReadAt - a.lastReadAt;
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        if (sortBy === 'progress') {
          const progA = a.currentPage / Math.max(1, a.totalPages);
          const progB = b.currentPage / Math.max(1, b.totalPages);
          return progB - progA;
        }
        return 0;
      });
  }, [books, searchQuery, filterTab, sourceFilter, sortBy]);

  const getBookPalette = (book: Book, idx: number) => {
    const t = book.title.toLowerCase();
    if (t.includes('trail')) return ATELIER_PALETTES[4];
    if (t.includes('silent echo')) return ATELIER_PALETTES[0];
    if (t.includes('whisper')) return ATELIER_PALETTES[1];
    if (t.includes('ash')) return ATELIER_PALETTES[2];
    if (t.includes('quiet')) return ATELIER_PALETTES[3];
    return ATELIER_PALETTES[idx % ATELIER_PALETTES.length];
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 MB';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Chưa đọc';
    const d = new Date(timestamp);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  return (
    <div className="flex-1 w-full h-full bg-[#0c0d10] text-stone-200 overflow-y-auto px-4 sm:px-8 py-6 pb-24 md:pb-8 flex flex-col gap-6 select-none font-sans">
      {/* 1. Header & Quick Analytics Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b1e25] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#faf6ee] tracking-wide flex items-center gap-2.5">
            <span>Thư Viện Bộ Sưu Tập</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#181b22] text-[#c97a3e] border border-[#2b3040] font-sans font-medium">
              {totalBooks} cuốn sách
            </span>
          </h1>
          <p className="text-xs text-stone-400 mt-1 font-sans">
            Quản lý toàn diện tài liệu, phân loại nguồn đọc và theo dõi tiến độ tri thức
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onUploadClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#c97a3e] hover:bg-[#b56930] text-white text-xs font-semibold shadow-lg shadow-[#c97a3e]/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm PDF</span>
          </button>
          <button
            onClick={onOpenDrive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161820] hover:bg-[#202430] border border-[#262c3b] text-stone-200 text-xs font-medium transition-all cursor-pointer"
          >
            <Cloud className="w-3.5 h-3.5 text-[#4ade80]" />
            <span>Google Drive</span>
          </button>
        </div>
      </div>

      {/* 2. Reading Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#12141a] border border-[#1d212b] rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1d222e] text-[#c97a3e] flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-serif font-bold text-white">{totalBooks}</div>
            <div className="text-[11px] text-stone-400">Tổng số sách</div>
          </div>
        </div>

        <div className="bg-[#12141a] border border-[#1d212b] rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#262118] text-[#f59e0b] flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-serif font-bold text-white">{readingCount}</div>
            <div className="text-[11px] text-stone-400">Đang đọc dở</div>
          </div>
        </div>

        <div className="bg-[#12141a] border border-[#1d212b] rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#16271c] text-[#22c55e] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-serif font-bold text-white">{completedCount}</div>
            <div className="text-[11px] text-stone-400">Đã đọc xong</div>
          </div>
        </div>

        <div className="bg-[#12141a] border border-[#1d212b] rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#2b171c] text-[#f43f5e] flex items-center justify-center shrink-0">
            <Heart className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-serif font-bold text-white">{favoriteCount}</div>
            <div className="text-[11px] text-stone-400">Yêu thích</div>
          </div>
        </div>
      </div>

      {/* 3. Search, Filter Pills & View Mode Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#111318] border border-[#1c202a] rounded-2xl p-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề sách hoặc tác giả..."
            className="w-full bg-[#181b22] border border-[#262c3b] rounded-xl pl-9 pr-3 py-1.5 text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none focus:border-[#c97a3e] transition-colors"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              filterTab === 'all'
                ? 'bg-[#c97a3e] text-white shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-[#181a20]'
            }`}
          >
            Tất cả ({totalBooks})
          </button>
          <button
            onClick={() => setFilterTab('reading')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              filterTab === 'reading'
                ? 'bg-[#c97a3e] text-white shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-[#181a20]'
            }`}
          >
            Đang đọc ({readingCount})
          </button>
          <button
            onClick={() => setFilterTab('favorites')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              filterTab === 'favorites'
                ? 'bg-[#c97a3e] text-white shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-[#181a20]'
            }`}
          >
            Yêu thích ({favoriteCount})
          </button>
          <button
            onClick={() => setFilterTab('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              filterTab === 'completed'
                ? 'bg-[#c97a3e] text-white shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-[#181a20]'
            }`}
          >
            Đã xong ({completedCount})
          </button>
        </div>

        {/* Source, Sort & View Mode Toggles */}
        <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
          {/* Source Dropdown */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="bg-[#181b22] border border-[#262c3b] text-stone-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="all">Mọi nguồn</option>
            <option value="local">Thiết bị này</option>
            <option value="google_drive">Google Drive</option>
            <option value="cloud">Cloud Sync</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#181b22] border border-[#262c3b] text-stone-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="recent">Mới đọc gần đây</option>
            <option value="title">Tên sách A-Z</option>
            <option value="progress">Tiến độ đọc</option>
          </select>

          {/* Grid/List Toggle */}
          <div className="flex items-center bg-[#181b22] border border-[#262c3b] rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-[#282d3c] text-white' : 'text-stone-400 hover:text-stone-200'
              }`}
              title="Xem dạng Lưới"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-[#282d3c] text-white' : 'text-stone-400 hover:text-stone-200'
              }`}
              title="Xem dạng Bảng"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Books Display: Grid vs List */}
      {filteredBooks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center bg-[#111318] border border-dashed border-[#222734] rounded-3xl p-6">
          <div className="w-16 h-16 rounded-full bg-[#181b24] flex items-center justify-center text-[#c97a3e] mb-4">
            <BookOpen className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="text-base font-serif font-semibold text-[#faf6ee]">Không tìm thấy cuốn sách nào</h3>
          <p className="text-xs text-stone-400 max-w-sm mt-1.5 mb-5">
            Thử thay đổi từ khóa tìm kiếm, đặt lại bộ lọc hoặc tải thêm file PDF mới vào bộ sưu tập của bạn.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onUploadClick}
              className="px-4 py-2 rounded-xl bg-[#c97a3e] hover:bg-[#b56930] text-white text-xs font-semibold shadow-lg shadow-[#c97a3e]/20 transition-all cursor-pointer"
            >
              + Tải lên PDF
            </button>
            <button
              onClick={onLoadSampleBook}
              className="px-4 py-2 rounded-xl bg-[#181b22] hover:bg-[#222732] border border-[#2b3040] text-stone-200 text-xs font-medium transition-all cursor-pointer"
            >
              Đọc sách mẫu
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredBooks.map((book, idx) => {
            const palette = getBookPalette(book, idx);
            const progressPercent = Math.min(
              100, 
              Math.max(0, Math.round((book.currentPage / Math.max(1, book.totalPages)) * 100))
            );

            return (
              <div
                key={book.id}
                onClick={() => onOpenBook(book)}
                className="group relative bg-[#12141a] hover:bg-[#161922] border border-[#1e222d] hover:border-[#343b4f] rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 cursor-pointer"
              >
                {/* Book Cover Area */}
                <div 
                  className={`w-full aspect-[3/4] rounded-xl overflow-hidden relative shadow-md flex flex-col justify-between p-3 border ${palette.border}`}
                  style={{ background: book.coverDataUrl ? undefined : palette.bg }}
                >
                  {book.coverDataUrl ? (
                    <img 
                      src={book.coverDataUrl} 
                      alt={book.title} 
                      className="absolute inset-0 w-full h-full object-cover" 
                    />
                  ) : (
                    <>
                      {/* Spine Crease Effect */}
                      <div className="absolute left-0 top-0 bottom-0 w-3.5 bg-gradient-to-r from-black/40 to-transparent pointer-events-none" />
                      
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-white/60">
                          {book.totalPages} trang
                        </span>
                        {/* Source Tag */}
                        {book.source === 'google_drive' ? (
                          <span className="px-1.5 py-0.5 rounded bg-black/40 backdrop-blur-sm text-[8px] text-[#4ade80] font-mono">DRIVE</span>
                        ) : book.source === 'cloud' ? (
                          <span className="px-1.5 py-0.5 rounded bg-black/40 backdrop-blur-sm text-[8px] text-[#60a5fa] font-mono">CLOUD</span>
                        ) : null}
                      </div>

                      <div className="relative z-10 my-auto text-center px-2">
                        <h4 className={`font-serif font-bold text-sm line-clamp-2 leading-tight ${palette.titleColor}`}>
                          {book.title}
                        </h4>
                        {book.author && (
                          <p className={`text-[10px] mt-1 font-sans line-clamp-1 ${palette.authorColor}`}>
                            {book.author}
                          </p>
                        )}
                      </div>

                      {/* Bottom Book Mark line */}
                      <div className="relative z-10 flex items-center justify-center">
                        <div className="w-6 h-0.5 bg-white/30 rounded-full" />
                      </div>
                    </>
                  )}

                  {/* Favorite Button on Cover */}
                  <button
                    onClick={(e) => onToggleFavorite(book.id, e)}
                    className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-stone-300 hover:text-white transition-colors cursor-pointer"
                    title={book.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                  >
                    <Heart className={`w-3.5 h-3.5 ${book.isFavorite ? 'fill-[#f43f5e] text-[#f43f5e]' : ''}`} />
                  </button>
                </div>

                {/* Metadata & Progress */}
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="text-xs font-serif font-bold text-[#f7efe4] truncate group-hover:text-[#c97a3e] transition-colors">
                      {book.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between text-[10.5px] text-stone-400">
                    <span className="truncate">{book.author || 'Tác giả ẩn danh'}</span>
                    <span className="font-mono text-stone-500 shrink-0">{progressPercent}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-[#1e222b] overflow-hidden">
                    <div 
                      className="h-full bg-[#c97a3e] rounded-full transition-all duration-500" 
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Footer actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#1b1e26] text-[10px] text-stone-500">
                    <span>{formatFileSize(book.fileSize)}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => onDeleteBook(book.id, e)}
                        className="text-stone-500 hover:text-[#f43f5e] transition-colors p-1 cursor-pointer"
                        title="Xóa sách khỏi thư viện"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE / LIST VIEW */
        <div className="bg-[#12141a] border border-[#1e222d] rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1f232e] bg-[#161820] text-stone-400 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-medium">Bìa & Sách</th>
                  <th className="py-3 px-4 font-medium hidden sm:table-cell">Tác giả</th>
                  <th className="py-3 px-4 font-medium">Tiến độ</th>
                  <th className="py-3 px-4 font-medium hidden md:table-cell">Nguồn</th>
                  <th className="py-3 px-4 font-medium hidden lg:table-cell">Đọc gần nhất</th>
                  <th className="py-3 px-4 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1e26]">
                {filteredBooks.map((book, idx) => {
                  const palette = getBookPalette(book, idx);
                  const progressPercent = Math.min(
                    100, 
                    Math.max(0, Math.round((book.currentPage / Math.max(1, book.totalPages)) * 100))
                  );

                  return (
                    <tr 
                      key={book.id} 
                      onClick={() => onOpenBook(book)}
                      className="hover:bg-[#181b24] transition-colors cursor-pointer group"
                    >
                      {/* Book & Cover */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className={`w-9 h-12 rounded overflow-hidden relative shrink-0 border ${palette.border} flex items-center justify-center`}
                            style={{ background: book.coverDataUrl ? undefined : palette.bg }}
                          >
                            {book.coverDataUrl ? (
                              <img src={book.coverDataUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <BookOpen className="w-4 h-4 text-white/50" />
                            )}
                          </div>
                          <div>
                            <div className="font-serif font-bold text-[#faf6ee] text-xs group-hover:text-[#c97a3e] transition-colors">
                              {book.title}
                            </div>
                            <div className="text-[10.5px] text-stone-400 sm:hidden">
                              {book.author}
                            </div>
                            <div className="text-[10px] text-stone-500 font-mono">
                              {book.totalPages} trang • {formatFileSize(book.fileSize)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Author */}
                      <td className="py-3 px-4 text-stone-300 hidden sm:table-cell">
                        {book.author || 'Tác giả ẩn danh'}
                      </td>

                      {/* Progress */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 w-24 sm:w-32">
                          <div className="flex justify-between text-[10px] font-mono text-stone-400">
                            <span>{book.currentPage}/{book.totalPages}</span>
                            <span>{progressPercent}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#20242f] overflow-hidden">
                            <div 
                              className="h-full bg-[#c97a3e] rounded-full" 
                              style={{ width: `${progressPercent}%` }} 
                            />
                          </div>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3 px-4 hidden md:table-cell">
                        {book.source === 'google_drive' ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#16271c] text-[#4ade80] border border-[#233d2c] text-[10px] font-mono">
                            Drive
                          </span>
                        ) : book.source === 'cloud' ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#152336] text-[#60a5fa] border border-[#203450] text-[10px] font-mono">
                            Cloud
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-[#1e222b] text-stone-400 border border-[#292f3c] text-[10px] font-mono">
                            Máy này
                          </span>
                        )}
                      </td>

                      {/* Last Read */}
                      <td className="py-3 px-4 text-stone-400 font-mono text-[11px] hidden lg:table-cell">
                        {formatDate(book.lastReadAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => onToggleFavorite(book.id, e)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-[#202430] transition-colors cursor-pointer"
                            title={book.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                          >
                            <Heart className={`w-4 h-4 ${book.isFavorite ? 'fill-[#f43f5e] text-[#f43f5e]' : ''}`} />
                          </button>
                          <button
                            onClick={() => onOpenBook(book)}
                            className="px-2.5 py-1 rounded-lg bg-[#202532] hover:bg-[#c97a3e] text-stone-200 hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            Đọc
                          </button>
                          <button
                            onClick={(e) => onDeleteBook(book.id, e)}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-[#f43f5e] hover:bg-[#202430] transition-colors cursor-pointer"
                            title="Xóa sách"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default LibraryView;
