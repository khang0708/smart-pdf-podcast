import React, { useState, useEffect, useCallback } from 'react';
import { Book, ThemeMode, TTSState } from './types';
import { StorageService } from './services/storage';
import { PdfService } from './services/pdfService';
import { ttsService } from './services/ttsService';
import { Header } from './components/Header';
import { BookList } from './components/Library/BookList';
import { PdfViewer } from './components/Reader/PdfViewer';
import { PodcastPlayer } from './components/Player/PodcastPlayer';
import { PDFDocumentProxy } from 'pdfjs-dist';

// Cờ tính năng: tạm thời ẩn Text-to-Speech
const ENABLE_TTS = false;

export const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<'library' | 'reader'>('library');
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [activePdfDoc, setActivePdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [activeSentence, setActiveSentence] = useState<string>('');
  const [ttsState, setTtsState] = useState<TTSState>(ttsService.getState());
  
  // PWA install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstallPwa, setCanInstallPwa] = useState<boolean>(false);
  const [showReaderControls, setShowReaderControls] = useState<boolean>(true);

  // 1. Initial load of books and settings
  useEffect(() => {
    const init = async () => {
      try {
        const savedBooks = await StorageService.getAllBooks();
        setBooks(savedBooks);

        const savedTheme = await StorageService.getSetting<ThemeMode>('theme_mode', 'dark');
        setTheme(savedTheme);
      } catch (err) {
        console.warn('Error loading library:', err);
      } finally {
        setIsLoadingBooks(false);
      }
    };
    init();

    // PWA Install Event Listener
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPwa(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // 2. Setup TTS Callbacks (chỉ kích hoạt nếu ENABLE_TTS bật)
  useEffect(() => {
    if (!ENABLE_TTS) return;
    ttsService.initCallbacks({
      onSentenceStart: (idx, text) => {
        setActiveSentence(text);
      },
      onPageEnd: () => {
        // Tự động lật sang trang tiếp theo khi kết thúc trang hiện tại
        if (activeBook && activePdfDoc && activeBook.currentPage < activeBook.totalPages) {
          handlePageChange(activeBook.currentPage + 1, true);
        } else {
          ttsService.stopPlayback();
          setActiveSentence('');
        }
      },
      onStateChange: (state) => {
        setTtsState({ ...state });
      }
    });
  }, [activeBook, activePdfDoc]);

  // Handle Theme Change
  const handleThemeChange = async (newTheme: ThemeMode) => {
    setTheme(newTheme);
    await StorageService.saveSetting('theme_mode', newTheme);
  };

  // Open Book
  const handleOpenBook = async (book: Book) => {
    try {
      const binary = await StorageService.getPdfBinary(book.id);
      if (!binary) {
        alert('Không tìm thấy tệp nhị phân của cuốn sách này.');
        return;
      }

      const doc = await PdfService.loadDocument(binary);
      setActivePdfDoc(doc);
      setActiveBook(book);
      setCurrentView('reader');

      if (ENABLE_TTS) {
        // Extract text of current page for TTS readiness
        const textData = await PdfService.extractPageText(doc, book.currentPage);
        ttsService.stopPlayback();
        ttsService.startPlayback(textData.sentences, book.currentPage, doc.numPages, 0);
        ttsService.pause();
      }
    } catch (err: any) {
      alert('Không thể mở sách: ' + (err?.message || err));
    }
  };

  // Change Page
  const handlePageChange = async (newPage: number, continueAutoplay: boolean = false) => {
    if (!activeBook || !activePdfDoc) return;
    if (newPage < 1 || newPage > activeBook.totalPages) return;

    const updatedBook = {
      ...activeBook,
      currentPage: newPage,
      lastReadAt: Date.now()
    };
    setActiveBook(updatedBook);

    // Update in storage and list
    await StorageService.updateBookProgress(activeBook.id, newPage);
    setBooks(prev => prev.map(b => b.id === activeBook.id ? updatedBook : b));

    if (ENABLE_TTS && activePdfDoc) {
      try {
        const textData = await PdfService.extractPageText(activePdfDoc, newPage);
        const isBlankOrImage = textData.sentences.length === 0 || 
          (textData.sentences.length === 1 && textData.sentences[0].includes('không có văn bản'));

        if (isBlankOrImage && continueAutoplay && newPage < activeBook.totalPages) {
          setTimeout(() => {
            handlePageChange(newPage + 1, true);
          }, 1200);
          return;
        }
        
        if (continueAutoplay || (ttsState.isPlaying && !ttsState.isPaused)) {
          ttsService.startPlayback(textData.sentences, newPage, activeBook.totalPages, 0, ttsState.rate);
        } else {
          ttsService.stopPlayback();
          ttsService.startPlayback(textData.sentences, newPage, activeBook.totalPages, 0, ttsState.rate);
          ttsService.pause();
          setActiveSentence('');
        }
      } catch (e) {
        console.warn('Error extracting text on page change:', e);
        if (continueAutoplay && newPage < activeBook.totalPages) {
          handlePageChange(newPage + 1, true);
        }
      }
    }
  };

  // Upload PDF File
  const handleUploadPdf = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const doc = await PdfService.loadDocument(arrayBuffer);
    
    // Generate thumbnail
    const coverUrl = await PdfService.generateThumbnail(doc);

    // Clean up filename for title
    const title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    const newBook: Book = {
      id: `book_${Date.now()}`,
      title: title,
      fileSize: file.size,
      totalPages: doc.numPages,
      currentPage: 1,
      addedAt: Date.now(),
      lastReadAt: Date.now(),
      coverDataUrl: coverUrl || undefined,
      isFavorite: false
    };

    // Save binary and metadata
    await StorageService.savePdfBinary(newBook.id, arrayBuffer);
    await StorageService.saveBook(newBook);

    setBooks(prev => [newBook, ...prev]);

    // Open book immediately
    await handleOpenBook(newBook);
  };

  // Load Sample Book
  const handleLoadSampleBook = async () => {
    try {
      const response = await fetch('/sample-book.pdf');
      const arrayBuffer = await response.arrayBuffer();
      const doc = await PdfService.loadDocument(arrayBuffer);
      const coverUrl = await PdfService.generateThumbnail(doc);

      const sampleBook: Book = {
        id: `book_sample_${Date.now()}`,
        title: 'Sách Mẫu: Nghệ Thuật Đọc Sách & Phát Triển Bản Thân',
        author: 'Smart Reader Team',
        fileSize: arrayBuffer.byteLength,
        totalPages: doc.numPages,
        currentPage: 1,
        addedAt: Date.now(),
        lastReadAt: Date.now(),
        coverDataUrl: coverUrl || undefined,
        isFavorite: true
      };

      await StorageService.savePdfBinary(sampleBook.id, arrayBuffer);
      await StorageService.saveBook(sampleBook);

      setBooks(prev => [sampleBook, ...prev]);
      await handleOpenBook(sampleBook);
    } catch (err: any) {
      alert('Không thể tải sách mẫu: ' + (err?.message || err));
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isFav = await StorageService.toggleFavorite(id);
    setBooks(prev => prev.map(b => b.id === id ? { ...b, isFavorite: isFav } : b));
  };

  // Delete Book
  const handleDeleteBook = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xoá cuốn sách này khỏi thư viện?')) {
      await StorageService.deleteBook(id);
      setBooks(prev => prev.filter(b => b.id !== id));
      if (activeBook?.id === id) {
        ttsService.stopPlayback();
        setActiveBook(null);
        setActivePdfDoc(null);
        setCurrentView('library');
      }
    }
  };

  // Back to Library
  const handleBackToLibrary = () => {
    if (ENABLE_TTS) ttsService.stopPlayback();
    setCurrentView('library');
  };

  // Trigger PWA Install Prompt
  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstallPwa(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation (Chỉ ở trang Thư viện) */}
      {currentView === 'library' && (
        <Header
          currentView="library"
          theme={theme}
          onThemeChange={handleThemeChange}
          onInstallPwa={handleInstallPwa}
          canInstallPwa={canInstallPwa}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {currentView === 'library' ? (
          <BookList
            books={books}
            isLoading={isLoadingBooks}
            onOpenBook={handleOpenBook}
            onUploadPdf={handleUploadPdf}
            onLoadSampleBook={handleLoadSampleBook}
            onToggleFavorite={handleToggleFavorite}
            onDeleteBook={handleDeleteBook}
          />
        ) : activeBook && activePdfDoc ? (
          <PdfViewer
            book={activeBook}
            pdfDoc={activePdfDoc}
            theme={theme}
            onThemeChange={handleThemeChange}
            onBackToLibrary={handleBackToLibrary}
            onPageChange={(p) => handlePageChange(p, false)}
            activeSentence={ENABLE_TTS ? activeSentence : undefined}
            isTTSPlaying={ENABLE_TTS && ttsState.isPlaying && !ttsState.isPaused}
            showControls={showReaderControls}
            onToggleControls={() => setShowReaderControls(v => !v)}
          />
        ) : null}
      </main>

      {/* Bottom Podcast Player (chỉ hiển thị khi ENABLE_TTS = true) */}
      {ENABLE_TTS && activeBook && (
        <PodcastPlayer
          book={activeBook}
          ttsState={ttsState}
          onPageChange={(p) => handlePageChange(p, true)}
        />
      )}
    </div>
  );
};

export default App;
