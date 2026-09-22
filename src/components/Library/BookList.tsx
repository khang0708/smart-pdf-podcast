import React, { useState, useRef } from 'react';
import { Book } from '../../types';
import { DEFAULT_CURATED_BOOKS } from '../../App';
import { 
  Plus, 
  ExternalLink,
  BookOpen,
  Trash2,
  Heart,
  FileText,
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
  onOpenGoogleDrive?: () => void;
}

// Procedural Atelier Cover Palettes for books without image thumbnail
const ATELIER_PALETTES = [
  {
    // Terracotta Leather (The Silent Echo style)
    id: 'terracotta',
    bg: 'linear-gradient(145deg, #ad522a 0%, #b85930 45%, #9d4621 100%)',
    border: 'border-[#c76537]/50',
    titleColor: 'text-[#fbf0e6]',
    authorColor: 'text-[#fbf0e6]/90',
    divider: 'bg-[#fbf0e6]/40',
    spineGutter: 'from-black/45 via-black/15 to-transparent',
    spineHighlight: 'bg-white/25',
    type: 'terracotta'
  },
  {
    // Ivory Linen with Crimson Frame & Feather (Whispers in the Wind style)
    id: 'linen',
    bg: '#f1ede4',
    border: 'border-[#ded5c5]',
    titleColor: 'text-[#832626]',
    authorColor: 'text-stone-800',
    doubleFrame: 'border-[#832626]',
    innerFrame: 'border-[#832626]/60',
    spineGutter: 'from-stone-500/25 via-stone-400/10 to-transparent',
    spineHighlight: 'bg-white/40',
    hasFeather: true,
    type: 'linen'
  },
  {
    // Antique Forest Green Leather with Gold Foil Deboss (Chronicles of Ash style)
    id: 'forest',
    bg: 'linear-gradient(145deg, #183323 0%, #1e3d2b 50%, #142a1d 100%)',
    border: 'border-[#274632]',
    titleColor: 'text-[#d6c085]',
    authorColor: 'text-[#cbb37a]',
    doubleFrame: 'border-[#cbb37a]/70',
    innerFrame: 'border-[#cbb37a]/40',
    spineGutter: 'from-black/50 via-black/20 to-transparent',
    spineHighlight: 'bg-[#cbb37a]/30',
    type: 'forest'
  },
  {
    // Muted Sage Green Cloth with Nature Tree & Stag (The Quiet Woods style)
    id: 'sage',
    bg: '#839686',
    border: 'border-[#96a999]',
    titleColor: 'text-[#1c2820]',
    authorColor: 'text-[#1c2820]',
    spineGutter: 'from-black/25 via-black/10 to-transparent',
    spineHighlight: 'bg-white/20',
    hasTreeStag: true,
    type: 'sage'
  },
  {
    // Weathered Charcoal Leather (Lost Trails style)
    id: 'charcoal',
    bg: 'linear-gradient(145deg, #252b24 0%, #30372e 60%, #1e231d 100%)',
    border: 'border-[#30372f]',
    titleColor: 'text-[#c9cebe]',
    authorColor: 'text-stone-400',
    spineGutter: 'from-black/50 via-black/20 to-transparent',
    spineHighlight: 'bg-white/15',
    type: 'charcoal'
  },
  {
    // Warm Amber Saddle Leather
    id: 'saddle',
    bg: 'linear-gradient(145deg, #8c4c23 0%, #9e592c 50%, #7d3f1a 100%)',
    border: 'border-[#a85e33]',
    titleColor: 'text-[#fdefde]',
    authorColor: 'text-[#fdefde]/85',
    spineGutter: 'from-black/45 via-black/15 to-transparent',
    spineHighlight: 'bg-white/20',
    type: 'saddle'
  }
];

export const BookList: React.FC<BookListProps> = ({
  books,
  isLoading,
  onOpenBook,
  onUploadPdf,
  onToggleFavorite,
  onDeleteBook,
  onOpenGoogleDrive
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Guarantee books are always present even before DB sync
  const displayBooks = books && books.length > 0 ? books : DEFAULT_CURATED_BOOKS;

  // Selected book state
  const [selectedBookId, setSelectedBookId] = useState<string>(
    displayBooks.find(b => b.title.toLowerCase().includes('quiet'))?.id || displayBooks[0]?.id || ''
  );

  const activeBook = displayBooks.find(b => b.id === selectedBookId) || displayBooks[0];

  // Calculate real reading progress
  const progressPercent = activeBook 
    ? Math.min(100, Math.max(0, Math.round((activeBook.currentPage / Math.max(1, activeBook.totalPages)) * 100)))
    : 0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      alert('Vui lòng chọn file định dạng PDF.');
      return;
    }
    try {
      await onUploadPdf(file);
    } catch (err: any) {
      alert('Lỗi tải file: ' + (err?.message || 'Không thể đọc file PDF.'));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getBookPalette = (book: Book, idx: number) => {
    const t = book.title.toLowerCase();
    if (t.includes('trail')) return ATELIER_PALETTES[4]; // Weathered Charcoal
    if (t.includes('silent echo')) return ATELIER_PALETTES[0]; // Terracotta
    if (t.includes('whisper')) return ATELIER_PALETTES[1]; // Ivory Linen
    if (t.includes('ash')) return ATELIER_PALETTES[2]; // Forest Green Gold
    if (t.includes('quiet')) return ATELIER_PALETTES[3]; // Sage Green Nature
    return ATELIER_PALETTES[idx % ATELIER_PALETTES.length];
  };

  return (
    <div className="flex-1 w-full h-full bg-[#e2e5e1] text-stone-900 overflow-y-auto px-4 sm:px-8 pt-4 pb-28 sm:pb-20 flex flex-col gap-6 sm:gap-8 select-none font-sans">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/pdf,.pdf"
        className="hidden"
      />

      {/* ================= SECTION 1: THE DYNAMIC BOOKSHELF GALLERY ================= */}
      <section className="shrink-0 relative overflow-x-auto pt-2 pb-6 -mx-4 sm:-mx-8 px-4 sm:px-8 scrollbar-none touch-pan-x">
        <div className="flex items-end gap-3.5 sm:gap-5 min-w-max pb-1 justify-start xl:justify-center">
          
          {displayBooks.map((book, idx) => {
            const palette = getBookPalette(book, idx);
            const isSelected = activeBook?.id === book.id;

            return (
              <div
                key={book.id}
                onClick={() => {
                  if (isSelected) {
                    onOpenBook(book);
                  } else {
                    setSelectedBookId(book.id);
                  }
                }}
                onDoubleClick={() => onOpenBook(book)}
                className={`group relative flex flex-col items-center cursor-pointer transition-all duration-300 shrink-0 ${
                  isSelected ? '-translate-y-2 sm:-translate-y-3 scale-[1.02]' : 'hover:-translate-y-1 sm:hover:-translate-y-2'
                }`}
                title={isSelected ? `${book.title} - Nhấp để mở đọc` : `${book.title} - Nhấp để chọn sách`}
              >
                {/* Upright Hardcover Book Box with 3D Depth */}
                <div
                  className={`relative w-[142px] h-[210px] sm:w-[175px] sm:h-[260px] rounded-r-lg rounded-l-sm p-3 sm:p-3.5 flex flex-col justify-between overflow-hidden shadow-xl sm:shadow-2xl border ${palette.border}`}
                  style={{
                    background: palette.bg,
                    boxShadow: isSelected
                      ? '0 20px 32px -4px rgba(0,0,0,0.5), inset 4px 0 8px rgba(0,0,0,0.4)'
                      : '0 14px 24px -4px rgba(0,0,0,0.35), inset 3px 0 6px rgba(0,0,0,0.25)'
                  }}
                >
                  {/* Left Spine 3D Curvature & Highlight */}
                  <div className={`absolute left-0 top-0 bottom-0 w-3 sm:w-3.5 bg-gradient-to-r ${palette.spineGutter} pointer-events-none`} />
                  <div className={`absolute left-1 top-0 bottom-0 w-[1px] ${palette.spineHighlight} pointer-events-none`} />

                  {/* Render Book Cover: Image Thumbnail OR Procedural Atelier Cover */}
                  {book.coverDataUrl ? (
                    <div className="relative w-full h-full rounded-r-md rounded-l-sm overflow-hidden flex flex-col justify-between">
                      <img 
                        src={book.coverDataUrl} 
                        alt={book.title} 
                        className="w-full h-full object-cover" 
                      />
                      {/* Subdued overlay with title */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2 sm:p-2.5 pt-6 sm:pt-8 text-center">
                        <h4 className="font-serif font-bold text-[11px] sm:text-xs uppercase tracking-wider text-white line-clamp-2 leading-snug">
                          {book.title}
                        </h4>
                        <p className="text-[9px] sm:text-[10px] font-sans text-stone-300 truncate mt-0.5">
                          {book.author || 'Tác giả'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Double Frame (if palette has one) */}
                      {palette.doubleFrame && (
                        <div className={`absolute inset-2 sm:inset-2.5 border ${palette.doubleFrame} pointer-events-none`}>
                          <div className={`absolute inset-[2px] sm:inset-[3px] border ${palette.innerFrame} pointer-events-none`} />
                        </div>
                      )}

                      {/* Title Section */}
                      <div className="text-center pt-2 sm:pt-3 relative z-10">
                        <h3 className={`font-serif font-bold text-xs sm:text-sm uppercase tracking-[0.14em] sm:tracking-[0.16em] ${palette.titleColor} line-clamp-3 leading-snug drop-shadow-sm`}>
                          {book.title}
                        </h3>
                        {/* Thin Divider for Terracotta theme */}
                        {palette.divider && (
                          <div className={`w-[1px] h-6 sm:h-8 ${palette.divider} mx-auto my-2 sm:my-2.5`} />
                        )}
                      </div>

                      {/* Center Emblem / Motif */}
                      <div className="flex justify-center my-auto relative z-10 opacity-90 scale-90 sm:scale-100">
                        {palette.hasFeather && (
                          <svg className="w-9 h-9 sm:w-11 sm:h-11 text-[#832626] fill-current" viewBox="0 0 100 100">
                            <path d="M78 12 C55 18 36 38 30 62 C29 65 31 66 33 64 C38 58 45 52 54 48 C49 53 45 60 42 68 C41 71 43 72 45 70 C51 63 60 57 70 53 C64 60 60 69 57 79 L48 94 C47 96 49 98 51 96 L61 80 C68 68 76 56 82 42 C87 31 87 20 78 12 Z" />
                            <path d="M48 94 Q62 55 78 12" stroke="#4a1515" strokeWidth="2.5" fill="none" />
                          </svg>
                        )}

                        {palette.hasTreeStag && (
                          <svg className="w-13 h-13 sm:w-16 sm:h-16 text-[#1c2820] stroke-current fill-none" viewBox="0 0 100 100">
                            <path strokeWidth="1.8" strokeLinecap="round" d="M36 84 L36 50 C36 40 31 32 22 22 M36 50 C40 38 46 30 52 18 M36 58 L20 42 M36 46 L44 34 M28 30 L16 28 M42 40 L50 46 M39 30 L45 23 M25 24 L20 18 M50 20 L54 14" />
                            <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" d="M60 84 L61 66 L64 60 L73 60 L76 66 L76 84 M64 60 L66 48 L70 43 L73 43 L71 50 L73 60" />
                            <path strokeWidth="1.3" strokeLinecap="round" d="M70 43 L68 32 L64 28 M68 36 L71 31 M72 43 L74 33 L78 29 M74 36 L77 32" />
                            <line x1="12" y1="84" x2="86" y2="84" strokeWidth="1.6" strokeLinecap="round" />
                          </svg>
                        )}

                        {!palette.hasFeather && !palette.hasTreeStag && (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-current/30 flex items-center justify-center font-serif text-[10px] sm:text-[11px]">
                            {book.title.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Author */}
                      <div className="text-center pb-1.5 sm:pb-2 relative z-10">
                        <span className={`text-[10px] sm:text-xs font-serif tracking-wider truncate block max-w-[110px] sm:max-w-[140px] mx-auto ${palette.authorColor}`}>
                          {book.author || 'Tác giả'}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Active Selected Glow Border */}
                  {isSelected && (
                    <div className="absolute inset-0 border-2 border-[#b2532a] rounded-r-lg rounded-l-sm pointer-events-none shadow-[inset_0_0_10px_rgba(178,83,42,0.35)]" />
                  )}
                </div>

                {/* Selected Status & Action Pill */}
                <div className="h-6 flex items-center justify-center gap-1.5 mt-1.5">
                  {isSelected && (
                    <>
                      <div className="px-2.5 py-0.5 rounded-full bg-[#b2532a] text-white text-[9px] font-mono font-semibold shadow-sm flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span>Đang chọn</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(book.id, e);
                        }}
                        className="p-1 rounded-full bg-[#181a24] hover:bg-[#252834] text-white border border-[#2b2f40] shadow-sm transition-colors cursor-pointer"
                        title={book.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                      >
                        <Heart className={`w-3 h-3 ${book.isFavorite ? 'fill-[#b2532a] text-[#b2532a]' : 'text-stone-300'}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteBook(book.id, e);
                        }}
                        className="p-1 rounded-full bg-[#181a24] hover:bg-red-600 text-white border border-[#2b2f40] shadow-sm transition-colors cursor-pointer"
                        title="Xóa sách"
                      >
                        <Trash2 className="w-3 h-3 text-stone-300 hover:text-white" />
                      </button>
                    </>
                  )}
                </div>

                {/* Ground Ellipse Shadow */}
                <div className="w-28 sm:w-36 h-2 sm:h-2.5 bg-black/25 rounded-full blur-[4px] mt-0.5" />
              </div>
            );
          })}

        </div>
      </section>

      {/* ================= SECTION 2: DYNAMIC CONTINUED READING & OPEN BOOK ================= */}
      <section className="shrink-0 grid grid-cols-1 lg:grid-cols-12 gap-6 items-end pb-8">
        
        {/* Left Column: Continued Reading with REAL Data */}
        <div className="lg:col-span-4 space-y-3 pb-3">
          <div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#15181c] tracking-tight leading-none">
              Continued<br />Reading
            </h2>
          </div>

          {/* Dynamic Terracotta / Stone Pill Progress Bar */}
          <div className="pt-2 space-y-1.5">
            <div className="w-48 h-2 bg-[#c8ceca] rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-[#b2532a] rounded-full transition-all duration-300"
                style={{ width: `${Math.max(4, progressPercent)}%` }}
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-stone-600">
              <span className="font-semibold text-[#b2532a]">{progressPercent}%</span>
              <span>•</span>
              <span>Trang {activeBook?.currentPage || 1} / {activeBook?.totalPages || 1}</span>
            </div>
          </div>

          {/* Book Title & Quick Action */}
          {activeBook && (
            <div className="pt-2">
              <p className="text-sm font-serif font-bold text-stone-900 truncate max-w-xs">
                {activeBook.title}
              </p>
              <p className="text-xs font-serif italic text-stone-600 truncate max-w-xs">
                {activeBook.author || 'Tác giả'}
              </p>

              <button
                onClick={() => onOpenBook(activeBook)}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#b2532a] hover:bg-[#9c441f] text-white text-xs font-semibold shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Mở đọc toàn màn hình</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Physical Open Hardcover Book Spread */}
        <div className="lg:col-span-8 flex justify-center">
          <div 
            onClick={() => activeBook && onOpenBook(activeBook)}
            className="w-full max-w-2xl bg-[#ad522a] p-2 sm:p-2.5 rounded-md shadow-2xl cursor-pointer hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.45)] transition-shadow relative group"
            title="Nhấp để mở chế độ đọc toàn màn hình"
          >
            {/* Dual Cream Paper Leaves Spread */}
            <div 
              className="w-full bg-[#fbf8f2] rounded-sm grid grid-cols-1 sm:grid-cols-2 p-6 sm:p-7 relative shadow-inner overflow-hidden min-h-[290px]"
              style={{
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.06)'
              }}
            >
              {/* Center Spine Gutter Crease Shadow */}
              <div 
                className="absolute left-1/2 top-0 bottom-0 w-12 -translate-x-1/2 pointer-events-none hidden sm:block"
                style={{
                  background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.04) 40%, rgba(0,0,0,0.18) 50%, rgba(0,0,0,0.04) 60%, transparent 100%)'
                }}
              />

              {/* LEFT PAGE */}
              <div className="space-y-4 sm:pr-6 sm:border-r sm:border-stone-200/60">
                {/* Header: Page & Real Book Title */}
                <div className="flex items-center justify-between text-xs font-serif text-[#5a625d]">
                  <span className="font-mono text-[11px]">{activeBook?.currentPage || 1}</span>
                  <span className="italic truncate max-w-[140px]">{activeBook?.title || 'Cuốn sách'}</span>
                </div>

                {/* Literary Body Text */}
                <div className="space-y-3 text-xs sm:text-[13px] font-serif leading-[1.75] text-[#2a2d2a] text-justify">
                  <p>
                    Không gian tĩnh tại và sự tập trung là chiếc chìa khóa mở ra cánh cửa tri thức sâu thẳm nhất của mỗi cuốn sách. Khi bạn lật từng trang, bạn đang bước vào cuộc trò chuyện không biên giới với tác giả qua thời gian.
                  </p>
                </div>

                {/* Section Title at Bottom */}
                <div className="pt-2">
                  <h4 className="font-serif font-bold text-xs sm:text-sm text-[#1b221d]">
                    Chương {Math.max(1, Math.ceil((activeBook?.currentPage || 1) / 10))}: Hành trình Tri thức
                  </h4>
                </div>
              </div>

              {/* RIGHT PAGE */}
              <div className="space-y-4 sm:pl-6 pt-4 sm:pt-0">
                {/* Header: Title & Next Page */}
                <div className="flex items-center justify-between text-xs font-serif text-[#5a625d]">
                  <span className="italic truncate max-w-[140px]">{activeBook?.title || 'Cuốn sách'}</span>
                  <span className="font-mono text-[11px]">{(activeBook?.currentPage || 1) + 1}</span>
                </div>

                {/* Literary Body Text */}
                <div className="space-y-3 text-xs sm:text-[13px] font-serif leading-[1.7] text-[#2a2d2a] text-justify">
                  <p>
                    Âm thanh của chữ viết vang lên qua từng câu văn, đồng điệu cùng giọng đọc podcast thông minh giúp bạn thẩm thấu sâu sắc và lưu giữ những giá trị vượt thời gian.
                  </p>
                  <p className="text-stone-600 italic text-[11px]">
                    "Tĩnh lặng không có nghĩa là không có âm thanh, mà là tâm trí bạn an trú hoàn toàn vào khoảnh khắc này."
                  </p>
                </div>

                <div className="pt-2 text-right">
                  <span className="text-[11px] font-mono text-[#b2532a] group-hover:underline">
                    Nhấp để đọc tiếp &rarr;
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </section>
    </div>
  );
};
