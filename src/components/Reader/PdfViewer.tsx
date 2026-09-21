import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PDFDocumentProxy } from 'pdfjs-dist';
import { Book, Bookmark, ThemeMode, PageTextData } from '../../types';
import { PdfService, OutlineItem } from '../../services/pdfService';
import { StorageService } from '../../services/storage';
import { syncService } from '../../services/syncService';
import { 
  ArrowLeft,
  ChevronLeft, 
  ChevronRight, 
  Bookmark as BookmarkIcon, 
  BookmarkCheck, 
  ListOrdered, 
  X,
  Loader2,
  EyeOff,
  BookOpen,
  FileText,
  Sliders,
  Sun,
  Moon,
  Coffee,
  Volume2
} from 'lucide-react';

interface PdfViewerProps {
  book: Book;
  pdfDoc: PDFDocumentProxy;
  theme: ThemeMode;
  onThemeChange?: (newTheme: ThemeMode) => void;
  onBackToLibrary?: () => void;
  onPageChange: (newPage: number) => void;
  activeSentence?: string;
  isTTSPlaying?: boolean;
  showControls?: boolean;
  onToggleControls?: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  book,
  pdfDoc,
  theme,
  onThemeChange,
  onBackToLibrary,
  onPageChange,
  showControls = true,
  onToggleControls
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // View Mode: 'reflow' (chữ to rõ, tự động co dòng) vs 'canvas' (trang PDF gốc)
  const [viewMode, setViewMode] = useState<'reflow' | 'canvas'>('reflow');
  const [fontSize, setFontSize] = useState<number>(18);
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('serif');

  const [pageTextData, setPageTextData] = useState<PageTextData | null>(null);
  const [isLoadingText, setIsLoadingText] = useState<boolean>(false);
  const [isRenderingCanvas, setIsRenderingCanvas] = useState<boolean>(false);

  // Modals & Drawers
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showDrawer, setShowDrawer] = useState<'none' | 'outline' | 'bookmarks'>('none');
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  // Mobile Touch Tap & Swipe tracking
  const touchStartTime = useRef<number>(0);
  const touchStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Load Bookmarks and Outline once
  useEffect(() => {
    let mounted = true;
    const loadMetadata = async () => {
      try {
        const out = await PdfService.extractOutline(pdfDoc);
        if (mounted) setOutline(out);

        const bms = await StorageService.getBookmarks(book.id);
        if (mounted) setBookmarks(bms);
      } catch (err) {
        console.warn('Could not load outline/bookmarks:', err);
      }
    };
    loadMetadata();
    return () => { mounted = false; };
  }, [book.id, pdfDoc]);

  // Extract page text whenever current page changes
  useEffect(() => {
    let mounted = true;
    const fetchText = async () => {
      setIsLoadingText(true);
      try {
        const data = await PdfService.extractPageText(pdfDoc, book.currentPage);
        if (mounted) setPageTextData(data);
      } catch (e) {
        console.warn('Error extracting text:', e);
      } finally {
        if (mounted) setIsLoadingText(false);
      }
    };
    fetchText();
    return () => { mounted = false; };
  }, [pdfDoc, book.currentPage]);

  // Render Canvas for 'canvas' mode
  const renderCanvas = useCallback(async () => {
    if (!canvasRef.current || viewMode !== 'canvas') return;
    setIsRenderingCanvas(true);
    try {
      const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
      const targetWidth = Math.min(containerWidth - 32, 900);
      await PdfService.renderPageToCanvas(
        pdfDoc,
        book.currentPage,
        canvasRef.current,
        targetWidth,
        1.0
      );
    } catch (err) {
      console.warn('Canvas render error:', err);
    } finally {
      setIsRenderingCanvas(false);
    }
  }, [pdfDoc, book.currentPage, viewMode]);

  useEffect(() => {
    if (viewMode === 'canvas') {
      renderCanvas();
    }
    const handleResize = () => {
      if (viewMode === 'canvas') renderCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCanvas, viewMode]);

  // Floating page badge auto-hide timer
  const [showPageBadge, setShowPageBadge] = useState<boolean>(true);
  const badgeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerPageBadge = useCallback(() => {
    setShowPageBadge(true);
    if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
    badgeTimerRef.current = setTimeout(() => {
      setShowPageBadge(false);
    }, 2600);
  }, []);

  // Scroll to top
  const scrollToTop = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    scrollToTop();
    triggerPageBadge();
    return () => {
      if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
    };
  }, [book.currentPage, scrollToTop, triggerPageBadge]);

  useEffect(() => {
    if (pageTextData) scrollToTop();
  }, [pageTextData, scrollToTop]);

  useEffect(() => {
    scrollToTop();
  }, [viewMode, scrollToTop]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        goToNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToPrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [book.currentPage, book.totalPages]);

  const goToPrevPage = () => {
    if (book.currentPage > 1) {
      onPageChange(book.currentPage - 1);
      scrollToTop();
    }
  };

  const goToNextPage = () => {
    if (book.currentPage < book.totalPages) {
      onPageChange(book.currentPage + 1);
      scrollToTop();
    }
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartTime.current = Date.now();
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const duration = Date.now() - touchStartTime.current;
    const deltaX = e.changedTouches[0].clientX - touchStartPos.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartPos.current.y;

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) goToNextPage();
      else goToPrevPage();
      return;
    }

    if (duration < 250 && Math.abs(deltaX) < 15 && Math.abs(deltaY) < 15) {
      if ((e.target as HTMLElement).closest('button, input, form, a, [role="dialog"]')) return;
      const width = window.innerWidth;
      const x = e.changedTouches[0].clientX;
      if (x < width * 0.22) goToPrevPage();
      else if (x > width * 0.78) goToNextPage();
      else onToggleControls?.();
    }
  };

  const handleViewportClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ('ontouchstart' in window) return;
    if ((e.target as HTMLElement).closest('button, input, form, a, [role="dialog"]')) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    if (clickX < width * 0.22) goToPrevPage();
    else if (clickX > width * 0.78) goToNextPage();
    else onToggleControls?.();
  };

  // Bookmarks
  const isCurrentPageBookmarked = bookmarks.some(b => b.pageNumber === book.currentPage);

  const toggleBookmark = async () => {
    if (isCurrentPageBookmarked) {
      const existing = bookmarks.find(b => b.pageNumber === book.currentPage);
      if (existing) {
        await StorageService.deleteBookmark(existing.id);
        setBookmarks(prev => prev.filter(b => b.id !== existing.id));
        syncService.performSync().catch(e => console.warn('Silent sync bm error:', e));
      }
    } else {
      const newBm: Bookmark = {
        id: `bm_${Date.now()}`,
        bookId: book.id,
        pageNumber: book.currentPage,
        createdAt: Date.now(),
        title: `Trang ${book.currentPage}`
      };
      await StorageService.saveBookmark(newBm);
      setBookmarks(prev => [...prev, newBm]);
      syncService.performSync().catch(e => console.warn('Silent sync bm error:', e));
    }
  };

  // Theme styling in Atelier Hybrid design language
  const getThemeClass = () => {
    if (theme === 'sepia') return 'bg-[#f5efe6] text-[#2c241c]';
    if (theme === 'light') return 'bg-[#faf8f3] text-[#1e2022]';
    return 'bg-[#0e1116] text-[#ded8ce]';
  };

  const getThemeCardClass = () => {
    if (theme === 'sepia') return 'bg-[#fdfaf3] text-[#2c241c] border-[#e6decb] shadow-[0_12px_32px_rgba(44,36,28,0.06)]';
    if (theme === 'light') return 'bg-white text-[#1e2022] border-[#eae4d8] shadow-[0_12px_32px_rgba(0,0,0,0.05)]';
    return 'bg-[#14161f] text-[#ded8ce] border-[#222534] shadow-[0_16px_36px_rgba(0,0,0,0.6)]';
  };

  return (
    <div 
      className={`fixed inset-0 flex flex-col ${getThemeClass()} transition-colors duration-300 select-none overflow-hidden font-sans`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleViewportClick}
    >
      {/* ================= ULTRA-SLIM TOP ATELIER OBSIDIAN BAR ================= */}
      <div className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        showControls 
          ? 'translate-y-0 opacity-100 pointer-events-auto' 
          : '-translate-y-full opacity-0 pointer-events-none'
      }`}>
        <div className="bg-[#0e1116]/95 backdrop-blur-md border-b border-[#1b1e25] px-2.5 sm:px-5 h-13 sm:h-14 flex items-center justify-between gap-1.5 sm:gap-3 shadow-2xl">
          
          {/* Left: Back Button & Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
            <button
              onClick={onBackToLibrary}
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-[#161820] hover:bg-[#222632] text-stone-200 text-xs font-semibold shrink-0 transition-colors border border-[#242734] cursor-pointer"
              title="Quay lại thư viện"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#c97a3e]" />
              <span className="hidden sm:inline">Thư viện</span>
            </button>

            <span className="hidden md:inline text-xs sm:text-sm font-serif italic text-stone-200 truncate max-w-[120px] lg:max-w-xs">
              {book.title}
            </span>
          </div>

          {/* Center: Chế độ đọc (Reflow vs Canvas) & Cỡ chữ (A- / A+) */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            {/* 1. Toggle Chế độ đọc */}
            <div className="flex items-center bg-[#151720] p-0.5 sm:p-1 rounded-xl border border-[#232734] shrink-0">
              <button
                onClick={() => setViewMode('reflow')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'reflow'
                    ? 'bg-[#b2532a] text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Chế độ Chữ to E-Book (Tự co dòng theo màn hình, tùy chỉnh cỡ chữ)"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Chữ to</span>
              </button>
              <button
                onClick={() => setViewMode('canvas')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'canvas'
                    ? 'bg-[#b2532a] text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Chế độ Trang PDF gốc (Bản in scan/PDF chuẩn gốc)"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">PDF gốc</span>
              </button>
            </div>

            {/* 2. Điều chỉnh Cỡ chữ (khi ở chế độ Chữ to E-Book) */}
            {viewMode === 'reflow' && (
              <div className="flex items-center bg-[#151720] rounded-xl border border-[#232734] px-1 py-0.5 shrink-0">
                <button
                  onClick={() => setFontSize(s => Math.max(12, s - 2))}
                  className="px-1.5 sm:px-2.5 py-0.5 rounded-lg text-stone-300 hover:text-white hover:bg-[#222632] text-xs font-bold transition-all cursor-pointer active:scale-95"
                  title="Giảm cỡ chữ (A-)"
                >
                  A-
                </button>
                <span className="px-1 sm:px-2 text-[11px] font-mono font-bold text-[#c97a3e]">
                  {fontSize}px
                </span>
                <button
                  onClick={() => setFontSize(s => Math.min(36, s + 2))}
                  className="px-1.5 sm:px-2.5 py-0.5 rounded-lg text-stone-300 hover:text-white hover:bg-[#222632] text-xs font-bold transition-all cursor-pointer active:scale-95"
                  title="Tăng cỡ chữ (A+)"
                >
                  A+
                </button>
              </div>
            )}
          </div>

          {/* Right: Actions (Theme, Page Pill, Aa, Outline, Bookmark, Hide) */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Page Counter */}
            <div className="hidden sm:flex px-3 py-1 rounded-full bg-[#151720] border border-[#232734] font-mono text-[11px] font-bold text-[#c97a3e] shrink-0">
              {book.currentPage} / {book.totalPages}
            </div>

            {/* Quick Theme Switcher */}
            {onThemeChange && (
              <div className="hidden lg:flex items-center bg-[#151720] rounded-xl border border-[#232734] p-0.5">
                <button
                  onClick={() => onThemeChange('dark')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    theme === 'dark' ? 'bg-[#252834] text-white shadow-xs' : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title="Giao diện Tối (Obsidian)"
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onThemeChange('sepia')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    theme === 'sepia' ? 'bg-[#c97a3e] text-white shadow-xs' : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title="Giao diện Giấy ấm (Warm Sepia)"
                >
                  <Coffee className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onThemeChange('light')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    theme === 'light' ? 'bg-[#c97a3e] text-white shadow-xs' : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title="Giao diện Sáng (Gallery Light)"
                >
                  <Sun className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Reading Settings Trigger Button (Aa) */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-[#161820] hover:bg-[#222632] text-stone-200 text-xs font-bold transition-all cursor-pointer border border-[#242734]"
              title="Cài đặt hiển thị nâng cao (Cỡ chữ, Font chữ, Màu nền)"
            >
              <span className="text-xs font-serif font-bold">Aa</span>
            </button>

            {/* Outline Drawer Toggle */}
            <button
              onClick={() => setShowDrawer(showDrawer === 'outline' ? 'none' : 'outline')}
              className={`p-1.5 sm:p-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                showDrawer !== 'none' 
                  ? 'bg-[#b2532a] text-white shadow-md' 
                  : 'text-stone-400 hover:text-stone-200 hover:bg-[#161820]'
              }`}
              title="Mục lục sách & Bookmark"
            >
              <ListOrdered className="w-4 h-4" />
            </button>

            {/* Quick Bookmark Toggle */}
            <button
              onClick={toggleBookmark}
              className={`p-1.5 sm:p-2 rounded-lg text-xs transition-all cursor-pointer ${
                isCurrentPageBookmarked
                  ? 'text-[#c97a3e] bg-[#c97a3e]/15'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-[#161820]'
              }`}
              title={isCurrentPageBookmarked ? 'Bỏ lưu trang này' : 'Lưu bookmark trang này'}
            >
              {isCurrentPageBookmarked ? <BookmarkCheck className="w-4 h-4 fill-current" /> : <BookmarkIcon className="w-4 h-4" />}
            </button>

            {/* Hide Controls Button */}
            <button
              onClick={() => onToggleControls?.()}
              className="hidden sm:block p-2 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-[#161820] transition-colors cursor-pointer"
              title="Ẩn thanh công cụ để đọc toàn màn hình"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= MAIN READING VIEWPORT ================= */}
      <div 
        ref={containerRef}
        onScroll={triggerPageBadge}
        className={`flex-1 flex flex-col items-center justify-start overflow-y-auto overflow-x-hidden relative transition-all duration-300 ${
          showControls ? 'pt-16 pb-56 sm:pb-36 px-2 sm:px-6' : 'pt-4 pb-32 px-2 sm:px-6'
        }`}
      >
        {/* Loading Indicator */}
        {(isLoadingText || isRenderingCanvas) && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-20 pointer-events-none">
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#14161f]/95 border border-[#2a2e40] text-xs text-[#c97a3e] shadow-2xl">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="font-mono">Đang tải trang {book.currentPage}...</span>
            </div>
          </div>
        )}

        {/* 1. REFLOW MODE: Chữ to rõ, tự động co dòng, chuẩn Typography văn học */}
        {viewMode === 'reflow' ? (
          <div className="w-full max-w-2xl mx-auto">
            <div className={`p-4 sm:p-10 rounded-2xl border transition-all ${getThemeCardClass()}`}>
              
              {/* Header indicator inside card */}
              <div className="flex items-center justify-between pb-3 mb-5 border-b border-inherit/15 text-[11px] font-serif italic opacity-60">
                <span className="truncate max-w-[200px]">{book.title}</span>
                <span className="font-mono not-italic">Trang {book.currentPage} / {book.totalPages}</span>
              </div>

              {/* Reflow Text Content */}
              {pageTextData && ((pageTextData.paragraphs && pageTextData.paragraphs.length > 0) || pageTextData.sentences.length > 0) ? (
                <div 
                  className={`space-y-4 leading-relaxed break-words text-justify transition-all ${
                    fontFamily === 'serif' ? 'font-serif' : 'font-sans'
                  }`}
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.88 }}
                >
                  {(pageTextData.paragraphs && pageTextData.paragraphs.length > 0 
                    ? pageTextData.paragraphs 
                    : pageTextData.sentences
                  ).map((para, idx) => {
                    const isHeading = /^(chương|phần|bài|chapter|part)\s+\d+/i.test(para) || 
                                      (para.length < 65 && para === para.toUpperCase() && !para.endsWith('.'));
                    const isListItem = /^(\d+[\.\)]|[-•*])\s+/.test(para);

                    if (isHeading) {
                      return (
                        <h4 
                          key={idx} 
                          className="font-serif font-bold text-center pt-4 pb-2 text-[#b2532a] tracking-wide text-[1.15em]"
                        >
                          {para}
                        </h4>
                      );
                    }

                    if (isListItem) {
                      return (
                        <p key={idx} className="pl-4 sm:pl-6 my-2 text-left">
                          {para}
                        </p>
                      );
                    }

                    return (
                      <p key={idx} className="indent-6 sm:indent-8">
                        {para}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center opacity-60 text-xs font-serif italic">
                  Trang này không có văn bản hoặc là hình ảnh scan. Nhấp vào "Aa" để chuyển sang chế độ "Trang PDF gốc".
                </div>
              )}

              {/* Bottom Card Footer */}
              <div className="pt-5 mt-10 border-t border-inherit/15 flex items-center justify-between text-[11px] opacity-60">
                <span className="font-mono">
                  Trang {book.currentPage} / {book.totalPages}
                </span>
                <span className="font-serif italic">
                  Chạm 2 bên màn hình để chuyển trang
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* 2. CANVAS MODE: Trang PDF gốc */
          <div className="w-full flex justify-center overflow-x-hidden">
            <div className={`relative shadow-2xl transition-all rounded-md max-w-full ${
              theme === 'sepia' 
                ? 'border border-[#dfceaa] shadow-amber-950/20' 
                : 'border border-[#252834] shadow-black/80'
            }`}>
              <canvas ref={canvasRef} className="block mx-auto max-w-full h-auto" />
            </div>
          </div>
        )}
      </div>

      {/* ================= FLOATING BOTTOM ATELIER BAR ================= */}
      <div className={`fixed bottom-3 sm:bottom-4 left-0 right-0 z-30 transition-all duration-300 pointer-events-none ${
        showControls 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-16 opacity-0'
      }`}>
        <div className="max-w-md mx-auto px-3 sm:px-4 pointer-events-auto">
          
          {/* Mobile View: High-Functionality Ergonomic Reading Dock */}
          <div className="sm:hidden bg-[#0e1116]/95 border border-[#232734] rounded-2xl p-2.5 shadow-[0_16px_36px_rgba(0,0,0,0.7)] backdrop-blur-xl flex flex-col gap-2 pointer-events-auto">
            {/* Row 1: Page Navigation Scrubber */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={goToPrevPage}
                disabled={book.currentPage <= 1}
                className="w-8 h-8 rounded-xl bg-[#161820] hover:bg-[#222632] disabled:opacity-25 disabled:pointer-events-none text-stone-200 flex items-center justify-center transition-colors cursor-pointer border border-[#202430] active:scale-95 shrink-0"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex-1 flex items-center gap-2 px-1">
                <input
                  type="range"
                  min={1}
                  max={book.totalPages}
                  value={book.currentPage}
                  onChange={(e) => onPageChange(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-[#1e222e] rounded-lg appearance-none cursor-pointer accent-[#b2532a]"
                />
              </div>

              <span className="font-mono text-[11px] font-bold text-[#c97a3e] px-1 shrink-0">
                {book.currentPage}/{book.totalPages}
              </span>

              <button
                onClick={goToNextPage}
                disabled={book.currentPage >= book.totalPages}
                className="w-8 h-8 rounded-xl bg-[#b2532a] hover:bg-[#9c441f] disabled:opacity-25 disabled:pointer-events-none text-white flex items-center justify-center transition-colors cursor-pointer shadow-sm active:scale-95 shrink-0"
                title="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Row 2: Mobile Quick Functions Row */}
            <div className="flex items-center justify-between gap-1 border-t border-[#1a1d26] pt-2">
              {/* Quick Mode Toggle */}
              <div className="flex items-center bg-[#14161f] p-0.5 rounded-lg border border-[#222532] shrink-0">
                <button
                  onClick={() => setViewMode('reflow')}
                  className={`px-2 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-all ${
                    viewMode === 'reflow' ? 'bg-[#b2532a] text-white shadow-xs' : 'text-stone-400'
                  }`}
                  title="Chế độ Chữ to"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Chữ to</span>
                </button>
                <button
                  onClick={() => setViewMode('canvas')}
                  className={`px-2 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-all ${
                    viewMode === 'canvas' ? 'bg-[#b2532a] text-white shadow-xs' : 'text-stone-400'
                  }`}
                  title="Trang PDF gốc"
                >
                  <FileText className="w-3 h-3" />
                  <span>Gốc</span>
                </button>
              </div>

              {/* Quick Font Size */}
              {viewMode === 'reflow' && (
                <div className="flex items-center bg-[#14161f] px-1 py-0.5 rounded-lg border border-[#222532] shrink-0">
                  <button
                    onClick={() => setFontSize(s => Math.max(12, s - 2))}
                    className="px-1.5 py-0.5 text-stone-300 active:scale-95 text-[10px] font-bold"
                    title="Giảm cỡ chữ"
                  >
                    A-
                  </button>
                  <span className="text-[10px] font-mono text-[#c97a3e] font-bold px-1">
                    {fontSize}px
                  </span>
                  <button
                    onClick={() => setFontSize(s => Math.min(36, s + 2))}
                    className="px-1.5 py-0.5 text-stone-300 active:scale-95 text-[10px] font-bold"
                    title="Tăng cỡ chữ"
                  >
                    A+
                  </button>
                </div>
              )}

              {/* Quick 3-Theme Switcher */}
              {onThemeChange && (
                <div className="flex items-center bg-[#14161f] p-0.5 rounded-lg border border-[#222532] shrink-0">
                  <button
                    onClick={() => onThemeChange('dark')}
                    className={`p-1.5 rounded-md transition-colors ${theme === 'dark' ? 'bg-[#252834] text-white' : 'text-stone-400'}`}
                    title="Giao diện Tối"
                  >
                    <Moon className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onThemeChange('sepia')}
                    className={`p-1.5 rounded-md transition-colors ${theme === 'sepia' ? 'bg-[#b2532a] text-white' : 'text-stone-400'}`}
                    title="Giấy ấm Sepia"
                  >
                    <Coffee className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onThemeChange('light')}
                    className={`p-1.5 rounded-md transition-colors ${theme === 'light' ? 'bg-stone-300 text-stone-900' : 'text-stone-400'}`}
                    title="Giao diện Sáng"
                  >
                    <Sun className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Drawer Outline & Bookmark */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setShowDrawer(showDrawer === 'outline' ? 'none' : 'outline')}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    showDrawer !== 'none'
                      ? 'bg-[#b2532a] border-[#c76537] text-white'
                      : 'bg-[#14161f] border-[#222532] text-stone-300'
                  }`}
                  title="Mục lục"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={toggleBookmark}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    isCurrentPageBookmarked
                      ? 'bg-[#c97a3e]/20 border-[#c97a3e] text-[#c97a3e]'
                      : 'bg-[#14161f] border-[#222532] text-stone-300'
                  }`}
                  title="Bookmark"
                >
                  <BookmarkIcon className={`w-3.5 h-3.5 ${isCurrentPageBookmarked ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Desktop / Tablet View: Full Two-Row Expanded Card */}
          <div className="hidden sm:flex bg-[#12151c]/95 border border-[#252834] rounded-2xl p-3 shadow-[0_16px_36px_rgba(0,0,0,0.5)] backdrop-blur-xl flex-col gap-2">
            {/* Page Slider */}
            <div className="flex items-center gap-3 px-2 pt-1">
              <span className="text-[11px] font-mono text-stone-400 min-w-6 text-right">
                {book.currentPage}
              </span>
              <input
                type="range"
                min={1}
                max={book.totalPages}
                value={book.currentPage}
                onChange={(e) => onPageChange(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-[#1e222e] rounded-lg appearance-none cursor-pointer accent-[#b2532a]"
              />
              <span className="text-[11px] font-mono text-stone-400 min-w-6">
                {book.totalPages}
              </span>
            </div>

            {/* Quick Navigation Row */}
            <div className="flex items-center justify-between gap-2 border-t border-[#1e222e] pt-1.5">
              <button
                onClick={goToPrevPage}
                disabled={book.currentPage <= 1}
                className="flex-1 py-2 rounded-xl bg-[#181b24] hover:bg-[#222633] disabled:opacity-30 disabled:pointer-events-none text-stone-200 text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Trang trước</span>
              </button>

              <div className="px-3 py-1.5 rounded-xl bg-[#0e1014] border border-[#20232e] text-xs font-mono font-bold text-[#c97a3e] shrink-0">
                {book.currentPage} / {book.totalPages}
              </div>

              <button
                onClick={goToNextPage}
                disabled={book.currentPage >= book.totalPages}
                className="flex-1 py-2 rounded-xl bg-[#b2532a] hover:bg-[#9c441f] disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-md"
              >
                <span>Trang sau</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating page indicator chip when controls are hidden */}
      {!showControls && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onToggleControls?.();
          }}
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 pointer-events-auto cursor-pointer ${
            showPageBadge 
              ? 'opacity-90 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
          }`}
        >
          <div className="px-4 py-1.5 rounded-full bg-[#12151c]/90 hover:bg-[#181b24] backdrop-blur-md border border-[#252834] text-[11px] font-medium text-stone-200 shadow-2xl flex items-center gap-2">
            <span className="text-[#c97a3e] font-mono font-bold">Trang {book.currentPage}/{book.totalPages}</span>
            <span className="text-stone-600">•</span>
            <span className="text-stone-400 font-serif italic">Chạm mở menu</span>
          </div>
        </div>
      )}

      {/* ================= READING SETTINGS (Aa MODAL) ================= */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div 
            onClick={() => setShowSettingsModal(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          <div className="relative w-full max-w-md bg-[#12151c] border border-[#252834] rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 shadow-2xl z-10 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-200">
            {/* Mobile Sheet Drag Handle */}
            <div className="sm:hidden pt-0 pb-2.5 flex justify-center">
              <div className="w-10 h-1 bg-stone-700/60 rounded-full" />
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-[#20232e]">
              <h3 className="font-serif font-bold text-stone-100 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#c97a3e]" />
                <span>Cài đặt hiển thị đọc sách</span>
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-[#1c202a] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-5">
              {/* 1. View Mode */}
              <div>
                <label className="text-[11px] font-mono font-semibold text-stone-400 uppercase tracking-wider block mb-2">
                  Chế độ hiển thị
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setViewMode('reflow')}
                    className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      viewMode === 'reflow'
                        ? 'bg-[#b2532a] border-[#c76537] text-white shadow-md'
                        : 'bg-[#181a22] border-[#252834] text-stone-300 hover:bg-[#20242e]'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Chữ to E-Book</span>
                  </button>

                  <button
                    onClick={() => setViewMode('canvas')}
                    className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      viewMode === 'canvas'
                        ? 'bg-[#b2532a] border-[#c76537] text-white shadow-md'
                        : 'bg-[#181a22] border-[#252834] text-stone-300 hover:bg-[#20242e]'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Trang PDF gốc</span>
                  </button>
                </div>
              </div>

              {/* 2. Font Size (Reflow mode) */}
              {viewMode === 'reflow' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-mono font-semibold text-stone-400 uppercase tracking-wider">
                      Cỡ chữ
                    </label>
                    <span className="text-xs font-mono font-bold text-[#c97a3e]">{fontSize}px</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setFontSize(s => Math.max(14, s - 2))}
                      className="flex-1 py-2 rounded-xl bg-[#181a22] hover:bg-[#222632] text-stone-200 font-bold text-sm border border-[#252834] transition-all cursor-pointer active:scale-95"
                    >
                      A-
                    </button>
                    <button
                      onClick={() => setFontSize(s => Math.min(32, s + 2))}
                      className="flex-1 py-2 rounded-xl bg-[#181a22] hover:bg-[#222632] text-stone-200 font-bold text-sm border border-[#252834] transition-all cursor-pointer active:scale-95"
                    >
                      A+
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Font Family */}
              {viewMode === 'reflow' && (
                <div>
                  <label className="text-[11px] font-mono font-semibold text-stone-400 uppercase tracking-wider block mb-2">
                    Kiểu chữ
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFontFamily('serif')}
                      className={`p-2 rounded-xl text-xs font-serif font-bold border transition-all cursor-pointer ${
                        fontFamily === 'serif'
                          ? 'bg-[#b2532a] border-[#c76537] text-white shadow-sm'
                          : 'bg-[#181a22] border-[#252834] text-stone-300'
                      }`}
                    >
                      Newsreader (Sách giấy)
                    </button>
                    <button
                      onClick={() => setFontFamily('sans')}
                      className={`p-2 rounded-xl text-xs font-sans font-semibold border transition-all cursor-pointer ${
                        fontFamily === 'sans'
                          ? 'bg-[#b2532a] border-[#c76537] text-white shadow-sm'
                          : 'bg-[#181a22] border-[#252834] text-stone-300'
                      }`}
                    >
                      Plus Jakarta (Hiện đại)
                    </button>
                  </div>
                </div>
              )}

              {/* 4. Reading Theme */}
              {onThemeChange && (
                <div>
                  <label className="text-[11px] font-mono font-semibold text-stone-400 uppercase tracking-wider block mb-2">
                    Màu nền đọc sách
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => onThemeChange('dark')}
                      className={`py-2 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-[#b2532a] border-[#c76537] text-white shadow-sm'
                          : 'bg-[#181a22] border-[#252834] text-stone-300 hover:bg-[#20242e]'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>Tối</span>
                    </button>

                    <button
                      onClick={() => onThemeChange('sepia')}
                      className={`py-2 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        theme === 'sepia'
                          ? 'bg-[#b2532a] border-[#c76537] text-white shadow-sm'
                          : 'bg-[#f4eee2] border-[#e2d8c3] text-[#2c241c]'
                      }`}
                    >
                      <Coffee className="w-3.5 h-3.5" />
                      <span>Giấy ấm</span>
                    </button>

                    <button
                      onClick={() => onThemeChange('light')}
                      className={`py-2 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        theme === 'light'
                          ? 'bg-[#b2532a] border-[#c76537] text-white shadow-sm'
                          : 'bg-stone-200 border-white text-stone-900'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>Sáng</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full mt-2 py-2.5 rounded-xl bg-[#b2532a] hover:bg-[#9c441f] text-white text-xs font-bold transition-colors cursor-pointer shadow-md"
            >
              Áp dụng & Đọc tiếp
            </button>
          </div>
        </div>
      )}

      {/* ================= DRAWER FOR OUTLINE & BOOKMARKS ================= */}
      {showDrawer !== 'none' && (
        <div className="fixed inset-0 z-50 flex">
          <div 
            onClick={() => setShowDrawer('none')}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          <div className="relative w-80 max-w-[85vw] h-full bg-[#0e1116] border-r border-[#1b1e25] p-5 flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#1f222c]">
              <h3 className="font-serif font-bold text-stone-100 text-sm flex items-center gap-2">
                {showDrawer === 'outline' ? (
                  <>
                    <ListOrdered className="w-4 h-4 text-[#c97a3e]" />
                    <span>Mục lục cuốn sách</span>
                  </>
                ) : (
                  <>
                    <BookmarkIcon className="w-4 h-4 text-[#c97a3e]" />
                    <span>Trang đã lưu (Bookmark)</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => setShowDrawer('none')}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-[#1c202a] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-1">
              {showDrawer === 'outline' ? (
                outline.length > 0 ? (
                  outline.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (item.pageNumber) {
                          onPageChange(item.pageNumber);
                          setShowDrawer('none');
                        }
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#181b24] transition-colors text-xs text-stone-300 hover:text-[#c97a3e] flex items-center justify-between group cursor-pointer"
                    >
                      <span className="truncate pr-2 font-serif">{item.title}</span>
                      {item.pageNumber && (
                        <span className="text-[11px] font-mono text-stone-500 group-hover:text-stone-300 shrink-0">
                          Tr. {item.pageNumber}
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="text-center py-12 text-stone-500 text-xs font-serif italic">
                    File PDF này không có danh mục mục lục có sẵn.
                  </div>
                )
              ) : (
                bookmarks.length > 0 ? (
                  bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      onClick={() => {
                        onPageChange(bm.pageNumber);
                        setShowDrawer('none');
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#14161f] hover:bg-[#1c202a] border border-[#222533] transition-colors text-xs flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <BookmarkIcon className="w-3.5 h-3.5 text-[#c97a3e] fill-current" />
                        <span className="font-serif font-medium text-stone-200">{bm.title || `Trang ${bm.pageNumber}`}</span>
                      </div>
                      <span className="text-[11px] font-mono text-[#c97a3e] group-hover:underline">
                        Đến trang &rarr;
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-stone-500 text-xs font-serif italic">
                    Chưa có trang nào được lưu. Bấm vào biểu tượng bookmark trên thanh công cụ để lưu trang hiện tại.
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
