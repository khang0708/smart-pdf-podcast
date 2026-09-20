import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PDFDocumentProxy } from 'pdfjs-dist';
import { Book, Bookmark, ThemeMode, PageTextData } from '../../types';
import { PdfService, OutlineItem } from '../../services/pdfService';
import { StorageService } from '../../services/storage';
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
  Check
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

  // View Mode: 'reflow' (chữ tự động co dòng theo màn hình, không tràn) vs 'canvas' (trang PDF gốc)
  const [viewMode, setViewMode] = useState<'reflow' | 'canvas'>('reflow');
  const [fontSize, setFontSize] = useState<number>(18);
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('sans');

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

  // Render canvas when in 'canvas' mode (Fit-to-Width strictly without horizontal overflow)
  const renderCanvas = useCallback(async () => {
    if (viewMode !== 'canvas' || !canvasRef.current || !containerRef.current || isRenderingCanvas) return;
    setIsRenderingCanvas(true);

    try {
      const containerWidth = containerRef.current.clientWidth || window.innerWidth;
      const targetWidth = Math.max(280, containerWidth - 16);

      await PdfService.renderPageToCanvas(
        pdfDoc,
        book.currentPage,
        canvasRef.current,
        targetWidth,
        1.0 // 100% Fit to Width
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

  // Floating page badge auto-hide timer when controls are hidden
  const [showPageBadge, setShowPageBadge] = useState<boolean>(true);
  const badgeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerPageBadge = useCallback(() => {
    setShowPageBadge(true);
    if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
    badgeTimerRef.current = setTimeout(() => {
      setShowPageBadge(false);
    }, 2600);
  }, []);

  // Reliable scroll-to-top handler for all devices/browsers
  const scrollToTop = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }
  }, []);

  // Auto-scroll to top and trigger badge when current page changes
  useEffect(() => {
    scrollToTop();
    triggerPageBadge();
    return () => {
      if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
    };
  }, [book.currentPage, scrollToTop, triggerPageBadge]);

  // Also ensure scroll is reset once text for the page is loaded into DOM
  useEffect(() => {
    if (pageTextData) {
      scrollToTop();
    }
  }, [pageTextData, scrollToTop]);

  // Scroll to top on view mode change
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

  // Touch handlers for swipe & tap on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartTime.current = Date.now();
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dt = Date.now() - touchStartTime.current;
    const dx = e.changedTouches[0].clientX - touchStartPos.current.x;
    const dy = e.changedTouches[0].clientY - touchStartPos.current.y;

    // Swipe gesture (horizontal > 45px)
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      if (dx < 0) {
        goToNextPage();
      } else {
        goToPrevPage();
      }
      return;
    }

    // Quick Tap gesture (< 300ms and little movement)
    if (dt < 300 && Math.hypot(dx, dy) < 15) {
      // Ignore if tapped on a button or modal
      if ((e.target as HTMLElement).closest('button, input, form, a, [role="dialog"]')) {
        return;
      }
      const width = window.innerWidth;
      const x = e.changedTouches[0].clientX;
      if (x < width * 0.22) {
        goToPrevPage();
      } else if (x > width * 0.78) {
        goToNextPage();
      } else {
        onToggleControls?.();
      }
    }
  };

  // Mouse Click handler for desktop
  const handleViewportClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only for desktop mouse clicks (touch is handled in onTouchEnd)
    if ('ontouchstart' in window) return;

    if ((e.target as HTMLElement).closest('button, input, form, a, [role="dialog"]')) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    if (clickX < width * 0.22) {
      goToPrevPage();
    } else if (clickX > width * 0.78) {
      goToNextPage();
    } else {
      onToggleControls?.();
    }
  };

  // Toggle Bookmark for current page
  const isCurrentPageBookmarked = bookmarks.some(b => b.pageNumber === book.currentPage);

  const toggleBookmark = async () => {
    if (isCurrentPageBookmarked) {
      const existing = bookmarks.find(b => b.pageNumber === book.currentPage);
      if (existing) {
        await StorageService.deleteBookmark(existing.id);
        setBookmarks(prev => prev.filter(b => b.id !== existing.id));
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
    }
  };

  // Theme styling for reader container
  const getThemeClass = () => {
    if (theme === 'sepia') return 'bg-[#f4ebd0] text-[#3b2d1d]';
    if (theme === 'light') return 'bg-white text-slate-900';
    return 'bg-slate-950 text-slate-100';
  };

  const getThemeCardClass = () => {
    if (theme === 'sepia') return 'bg-[#fdf7ea] text-[#3b2d1d] border-[#e8dcb8] shadow-amber-950/10';
    if (theme === 'light') return 'bg-white text-slate-800 border-slate-200 shadow-slate-200';
    return 'bg-slate-900/90 text-slate-100 border-slate-800/80 shadow-black/60';
  };

  return (
    <div 
      className={`fixed inset-0 flex flex-col ${getThemeClass()} transition-colors duration-300 select-none overflow-hidden`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleViewportClick}
    >
      {/* ================= ONE UNIFIED ULTRA-SLIM TOP BAR (Slides out completely when reading) ================= */}
      <div className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        showControls 
          ? 'translate-y-0 opacity-100 pointer-events-auto' 
          : '-translate-y-full opacity-0 pointer-events-none'
      }`}>
        <div className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 h-14 flex items-center justify-between gap-2 shadow-xl">
          
          {/* Left: Back Button & Title */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onBackToLibrary}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold shrink-0 transition-colors cursor-pointer"
              title="Quay lại thư viện"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Thư viện</span>
            </button>

            <span className="text-xs font-bold text-slate-200 truncate max-w-[120px] sm:max-w-xs">
              {book.title}
            </span>
          </div>

          {/* Center: Page Pill */}
          <div className="px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700/60 text-[11px] font-bold text-indigo-400 shrink-0">
            {book.currentPage} / {book.totalPages}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Reading Settings Trigger Button (Aa) */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-700/60"
              title="Cài đặt hiển thị (Cỡ chữ, Font, Chế độ đọc)"
            >
              <span className="text-sm font-serif">Aa</span>
            </button>

            {/* Outline & Bookmarks Drawer Toggle */}
            <button
              onClick={() => setShowDrawer(showDrawer === 'outline' ? 'none' : 'outline')}
              className={`p-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                showDrawer !== 'none' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Mục lục sách & Bookmark"
            >
              <ListOrdered className="w-4 h-4" />
            </button>

            {/* Quick Bookmark Toggle */}
            <button
              onClick={toggleBookmark}
              className={`p-2 rounded-xl text-xs transition-all cursor-pointer ${
                isCurrentPageBookmarked
                  ? 'text-amber-400 hover:text-amber-300 bg-amber-400/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={isCurrentPageBookmarked ? 'Bỏ lưu trang này' : 'Lưu bookmark trang này'}
            >
              {isCurrentPageBookmarked ? <BookmarkCheck className="w-4 h-4 fill-current" /> : <BookmarkIcon className="w-4 h-4" />}
            </button>

            {/* Dedicated Hide Controls Button (1 chạm ẩn ngay) */}
            <button
              onClick={() => onToggleControls?.()}
              className="p-2 rounded-xl text-indigo-400 hover:bg-slate-800 transition-colors cursor-pointer"
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
          showControls ? 'pt-16 pb-36 px-3 sm:px-6' : 'pt-3 pb-32 px-3 sm:px-6'
        }`}
      >
        {/* Loading Indicator */}
        {(isLoadingText || isRenderingCanvas) && (
          <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-[1px] flex items-center justify-center z-20 pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/95 border border-slate-700 text-xs text-indigo-400 shadow-xl">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang tải trang {book.currentPage}...</span>
            </div>
          </div>
        )}

        {/* 1. REFLOW MODE: Chữ to rõ, tự động co dòng, KHÔNG BAO GIỜ TRÀN CONTAINER */}
        {viewMode === 'reflow' ? (
          <div className="w-full max-w-2xl mx-auto">
            <div className={`p-5 sm:p-8 rounded-3xl border shadow-xl transition-all ${getThemeCardClass()}`}>
              
              {/* Header indicator inside card */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-inherit/15 text-[11px] opacity-60">
                <span className="font-semibold uppercase tracking-wider">
                  Trang {book.currentPage} / {book.totalPages}
                </span>
                <span>Chế độ đọc chữ co dòng</span>
              </div>

              {/* Reflow Text Content: Trọn vẹn 100% nội dung đoạn văn, không ngắt vụn */}
              {pageTextData && ((pageTextData.paragraphs && pageTextData.paragraphs.length > 0) || pageTextData.sentences.length > 0) ? (
                <div 
                  className={`space-y-4 leading-relaxed break-words text-justify transition-all ${
                    fontFamily === 'serif' ? 'font-serif' : 'font-sans'
                  }`}
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.85 }}
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
                          className="font-bold text-center pt-3 pb-1 text-indigo-400 tracking-wide text-[1.12em]"
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
                <div className="py-16 text-center opacity-60 text-sm">
                  Trang này không có văn bản hoặc là hình ảnh scan. Bấm nút "Aa" để chuyển sang xem "Trang PDF".
                </div>
              )}

              {/* Bottom Card Footer with page number & navigation hint */}
              <div className="pt-4 mt-8 border-t border-inherit/15 flex items-center justify-between text-[11px] opacity-60">
                <span className="font-semibold tracking-wide">
                  Trang {book.currentPage} / {book.totalPages}
                </span>
                <span className="opacity-80">
                  Chạm 2 bên hoặc vuốt để đổi trang
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* 2. CANVAS MODE: Trang PDF gốc 100% Fit-to-Width */
          <div className="w-full flex justify-center overflow-x-hidden">
            <div className={`relative shadow-2xl transition-all rounded-sm max-w-full ${
              theme === 'sepia' 
                ? 'border border-[#dfceaa] shadow-amber-950/20' 
                : 'border border-slate-800/60 shadow-black/80'
            }`}>
              <canvas ref={canvasRef} className="block mx-auto max-w-full h-auto" />
            </div>
          </div>
        )}
      </div>

      {/* ================= FLOATING BOTTOM THUMB NAVIGATION BAR ================= */}
      <div className={`fixed bottom-3 left-0 right-0 z-30 transition-all duration-300 pointer-events-none ${
        showControls 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-16 opacity-0'
      }`}>
        <div className="max-w-md mx-auto px-3 pointer-events-auto">
          <div className="bg-slate-900/95 border border-slate-700/80 rounded-3xl p-2 sm:p-3 shadow-2xl backdrop-blur-xl flex flex-col gap-2">
            
            {/* Page Slider */}
            <div className="flex items-center gap-3 px-2 pt-1">
              <span className="text-[11px] font-semibold text-slate-400 min-w-5 text-right">
                {book.currentPage}
              </span>
              <input
                type="range"
                min={1}
                max={book.totalPages}
                value={book.currentPage}
                onChange={(e) => onPageChange(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="text-[11px] font-semibold text-slate-400 min-w-5">
                {book.totalPages}
              </span>
            </div>

            {/* Quick Actions Row */}
            <div className="flex items-center justify-between gap-2 border-t border-slate-800/80 pt-1.5">
              {/* Prev Page Button */}
              <button
                onClick={goToPrevPage}
                disabled={book.currentPage <= 1}
                className="flex-1 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Trang trước</span>
              </button>

              {/* Center Page Indicator Pill */}
              <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-bold text-indigo-400 shrink-0">
                {book.currentPage} / {book.totalPages}
              </div>

              {/* Next Page Button */}
              <button
                onClick={goToNextPage}
                disabled={book.currentPage >= book.totalPages}
                className="flex-1 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-md shadow-indigo-600/30"
              >
                <span>Trang sau</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating page indicator chip when controls are hidden - Auto-fades after 2.6s */}
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
          <div className="px-4 py-1.5 rounded-full bg-slate-950/90 hover:bg-slate-900 backdrop-blur-md border border-slate-700/80 text-[11px] font-medium text-slate-200 shadow-2xl flex items-center gap-2">
            <span className="text-indigo-400 font-bold">Trang {book.currentPage}/{book.totalPages}</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Chạm mở menu</span>
          </div>
        </div>
      )}

      {/* ================= READING SETTINGS BOTTOM SHEET (Aa MODAL) ================= */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div 
            onClick={() => setShowSettingsModal(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl z-10 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Cài đặt hiển thị đọc sách</span>
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-5">
              {/* 1. View Mode Switcher */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Chế độ hiển thị
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setViewMode('reflow')}
                    className={`p-2.5 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      viewMode === 'reflow'
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Chữ to E-Book (Tự co dòng)</span>
                  </button>

                  <button
                    onClick={() => setViewMode('canvas')}
                    className={`p-2.5 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      viewMode === 'canvas'
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Trang PDF gốc</span>
                  </button>
                </div>
              </div>

              {/* 2. Font Size (in reflow mode) */}
              {viewMode === 'reflow' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Cỡ chữ
                    </label>
                    <span className="text-xs font-bold text-indigo-400">{fontSize}px</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setFontSize(s => Math.max(14, s - 2))}
                      className="flex-1 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 transition-all cursor-pointer active:scale-95"
                    >
                      A-
                    </button>
                    <button
                      onClick={() => setFontSize(s => Math.min(32, s + 2))}
                      className="flex-1 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 transition-all cursor-pointer active:scale-95"
                    >
                      A+
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Font Family */}
              {viewMode === 'reflow' && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Kiểu chữ
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFontFamily('sans')}
                      className={`p-2 rounded-xl text-xs font-sans font-semibold border transition-all cursor-pointer ${
                        fontFamily === 'sans'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300'
                      }`}
                    >
                      Sans (Hiện đại)
                    </button>
                    <button
                      onClick={() => setFontFamily('serif')}
                      className={`p-2 rounded-xl text-xs font-serif font-semibold border transition-all cursor-pointer ${
                        fontFamily === 'serif'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300'
                      }`}
                    >
                      Serif (Sách giấy cổ điển)
                    </button>
                  </div>
                </div>
              )}

              {/* 4. Reading Theme */}
              {onThemeChange && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Màu nền đọc sách
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => onThemeChange('dark')}
                      className={`py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>Tối</span>
                    </button>

                    <button
                      onClick={() => onThemeChange('sepia')}
                      className={`py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        theme === 'sepia'
                          ? 'bg-amber-600 border-amber-500 text-white shadow-sm'
                          : 'bg-amber-950/40 border-amber-900/60 text-amber-200 hover:bg-amber-900/50'
                      }`}
                    >
                      <Coffee className="w-3.5 h-3.5" />
                      <span>Giấy ấm</span>
                    </button>

                    <button
                      onClick={() => onThemeChange('light')}
                      className={`py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        theme === 'light'
                          ? 'bg-slate-200 border-white text-slate-900 shadow-sm'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
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
              className="w-full mt-2 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-lg shadow-indigo-600/30"
            >
              Áp dụng & Đọc tiếp
            </button>
          </div>
        </div>
      )}

      {/* ================= SIDE DRAWER FOR OUTLINE / BOOKMARKS ================= */}
      {showDrawer !== 'none' && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            onClick={() => setShowDrawer('none')}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <div className="relative w-80 max-w-[85vw] h-full bg-slate-900 border-r border-slate-800 p-5 flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                {showDrawer === 'outline' ? (
                  <>
                    <ListOrdered className="w-4 h-4 text-indigo-400" />
                    <span>Mục lục cuốn sách</span>
                  </>
                ) : (
                  <>
                    <BookmarkIcon className="w-4 h-4 text-indigo-400" />
                    <span>Trang đã lưu (Bookmark)</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => setShowDrawer('none')}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
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
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-800/80 transition-colors text-xs text-slate-300 hover:text-indigo-300 flex items-center justify-between group cursor-pointer"
                    >
                      <span className="truncate pr-2">{item.title}</span>
                      {item.pageNumber && (
                        <span className="text-[11px] text-slate-500 group-hover:text-slate-400 shrink-0">
                          Tr. {item.pageNumber}
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-500 text-xs">
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
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors text-xs flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <BookmarkIcon className="w-3.5 h-3.5 text-amber-400 fill-current" />
                        <span className="font-medium text-slate-200">{bm.title || `Trang ${bm.pageNumber}`}</span>
                      </div>
                      <span className="text-[11px] text-indigo-400 group-hover:underline">
                        Đến trang &rarr;
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-500 text-xs">
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
