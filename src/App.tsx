import React, { useState, useEffect, useRef } from 'react';
import { Book, ThemeMode, TTSState, SyncStatus } from './types';
import { StorageService } from './services/storage';
import { PdfService } from './services/pdfService';
import { ttsService } from './services/ttsService';
import { syncService } from './services/syncService';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { BookList } from './components/Library/BookList';
import { LibraryView } from './components/Library/LibraryView';
import { BookmarksView } from './components/Bookmarks/BookmarksView';
import { AnnotationsView } from './components/Annotations/AnnotationsView';
import { PdfViewer } from './components/Reader/PdfViewer';
import { PodcastPlayer } from './components/Player/PodcastPlayer';
import { SyncModal } from './components/Sync/SyncModal';
import { GoogleDriveModal } from './components/Library/GoogleDriveModal';
import { PDFDocumentProxy } from 'pdfjs-dist';

export const DEFAULT_CURATED_BOOKS: Book[] = [
  {
    id: 'atelier_book_0',
    title: 'Lost Trails',
    author: 'Sarah Croft',
    fileSize: 6200000,
    totalPages: 210,
    currentPage: 65,
    addedAt: 1726915000000,
    lastReadAt: 1726915000000,
    isFavorite: false,
    source: 'local',
    syncStatus: 'synced',
  },
  {
    id: 'atelier_book_1',
    title: 'The Silent Echo',
    author: 'Orchestra',
    fileSize: 4200000,
    totalPages: 185,
    currentPage: 12,
    addedAt: 1726910000000,
    lastReadAt: 1726910000000,
    isFavorite: true,
    source: 'local',
    syncStatus: 'synced',
  },
  {
    id: 'atelier_book_2',
    title: 'Whispers in the Wind',
    author: 'Evelyn Reed',
    fileSize: 3100000,
    totalPages: 240,
    currentPage: 44,
    addedAt: 1726900000000,
    lastReadAt: 1726900000000,
    isFavorite: false,
    source: 'local',
    syncStatus: 'synced',
  },
  {
    id: 'atelier_book_3',
    title: 'Chronicles of Ash',
    author: 'Julian Finch',
    fileSize: 5600000,
    totalPages: 320,
    currentPage: 88,
    addedAt: 1726890000000,
    lastReadAt: 1726890000000,
    isFavorite: true,
    source: 'cloud',
    syncStatus: 'synced',
  },
  {
    id: 'atelier_book_4',
    title: 'The Quiet Woods',
    author: 'Elara Jensen',
    fileSize: 4800000,
    totalPages: 160,
    currentPage: 44,
    addedAt: 1726880000000,
    lastReadAt: 1726880000000,
    isFavorite: false,
    source: 'local',
    syncStatus: 'synced',
  },
  {
    id: 'atelier_book_5',
    title: 'The Silent Echo',
    author: 'Orchestra',
    fileSize: 4200000,
    totalPages: 185,
    currentPage: 12,
    addedAt: 1726870000000,
    lastReadAt: 1726870000000,
    isFavorite: true,
    source: 'google_drive',
    syncStatus: 'synced',
  }
];

export const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>(DEFAULT_CURATED_BOOKS);
  const [isLoadingBooks, setIsLoadingBooks] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'library' | 'reader'>(() => {
    return new URLSearchParams(window.location.search).get('view') === 'reader' ? 'reader' : 'library';
  });
  const [activeNav, setActiveNav] = useState<'bookshelf' | 'library' | 'podcasts' | 'annotations' | 'bookmarks'>(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam && ['bookshelf', 'library', 'bookmarks', 'annotations'].includes(tabParam)) {
      return tabParam as any;
    }
    return 'bookshelf';
  });
  const [activeBook, setActiveBook] = useState<Book | null>(DEFAULT_CURATED_BOOKS[4]); // The Quiet Woods
  const [activePdfDoc, setActivePdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [activeSentence, setActiveSentence] = useState<string>('');
  const [ttsState, setTtsState] = useState<TTSState>(ttsService.getState());
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modals state
  const [showSyncModal, setShowSyncModal] = useState<boolean>(() => {
    return new URLSearchParams(window.location.search).get('modal') === 'sync';
  });
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState<boolean>(() => {
    return new URLSearchParams(window.location.search).get('modal') === 'drive';
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus());
  const [isCloudDownloading, setIsCloudDownloading] = useState<boolean>(false);
  const [showReaderControls, setShowReaderControls] = useState<boolean>(true);
  const headerFileInputRef = useRef<HTMLInputElement>(null);

  // 1. Initial load of books & populate curated Atelier shelf
  useEffect(() => {
    const init = async () => {
      try {
        let savedBooks = await StorageService.getAllBooks();

        if (!savedBooks || savedBooks.length === 0) {
          savedBooks = DEFAULT_CURATED_BOOKS;
          for (const b of DEFAULT_CURATED_BOOKS) {
            StorageService.saveBook(b).catch(() => {});
          }
        }

        setBooks(savedBooks);
        const defaultSelected = savedBooks.find(b => b.title.toLowerCase().includes('quiet')) || savedBooks[1] || savedBooks[0];
        setActiveBook(defaultSelected);

        const savedTheme = await StorageService.getSetting<ThemeMode>('theme_mode', 'dark');
        setTheme(savedTheme);

        // Silent Cloud Sync
        syncService.performSync().then(res => {
          if (res.success && res.updatedBooks && res.updatedBooks.length > 0) {
            setBooks(res.updatedBooks);
          }
        }).catch(err => console.warn('Initial sync notice:', err));

        // URL param routing for testing and direct access
        const params = new URLSearchParams(window.location.search);
        if (params.get('modal') === 'sync') {
          setShowSyncModal(true);
        } else if (params.get('modal') === 'drive') {
          setShowGoogleDriveModal(true);
        }
        if (params.get('view') === 'reader') {
          handleOpenBook(defaultSelected || savedBooks[0]);
        }
      } catch (err) {
        console.warn('Error loading library:', err);
        setBooks(DEFAULT_CURATED_BOOKS);
      } finally {
        setIsLoadingBooks(false);
      }
    };
    init();

    const unsubSync = syncService.subscribe((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubSync();
    };
  }, []);

  // Handle Theme Change
  const handleThemeChange = async (newTheme: ThemeMode) => {
    setTheme(newTheme);
    await StorageService.saveSetting('theme_mode', newTheme);
  };

  const refreshBooks = async () => {
    const latestBooks = await StorageService.getAllBooks();
    setBooks(latestBooks);
  };

  // Open Book (optionally jumping directly to targetPage)
  const handleOpenBook = async (book: Book, targetPage?: number) => {
    try {
      let binary = await StorageService.getPdfBinary(book.id);

      if (!binary) {
        setIsCloudDownloading(true);
        try {
          binary = await syncService.downloadPdfFromCloud(book.id, book.storagePath);
        } catch (downloadErr) {
          console.warn('Cloud download error:', downloadErr);
        } finally {
          setIsCloudDownloading(false);
        }

        if (!binary) {
          // Fallback to sample book binary if missing
          const res = await fetch('/sample-book.pdf');
          binary = await res.arrayBuffer();
          await StorageService.savePdfBinary(book.id, binary);
        }
      }

      const doc = await PdfService.loadDocument(binary);
      setActivePdfDoc(doc);

      const pageToOpen = targetPage ? Math.min(doc.numPages, Math.max(1, targetPage)) : book.currentPage;
      const updatedBook: Book = {
        ...book,
        currentPage: pageToOpen,
        lastReadAt: Date.now()
      };

      if (targetPage) {
        await StorageService.updateBookProgress(book.id, pageToOpen);
        setBooks(prev => prev.map(b => b.id === book.id ? updatedBook : b));
        syncService.syncProgress(book.id, pageToOpen);
      }

      setActiveBook(updatedBook);
      setCurrentView('reader');
    } catch (err: any) {
      console.error('Không thể mở sách:', err);
    }
  };

  // Change Page
  const handlePageChange = async (newPage: number) => {
    if (!activeBook || !activePdfDoc) return;
    if (newPage < 1 || newPage > activeBook.totalPages) return;

    const updatedBook: Book = {
      ...activeBook,
      currentPage: newPage,
      lastReadAt: Date.now()
    };
    setActiveBook(updatedBook);

    await StorageService.updateBookProgress(activeBook.id, newPage);
    setBooks(prev => prev.map(b => b.id === activeBook.id ? updatedBook : b));
    syncService.syncProgress(activeBook.id, newPage);
  };

  // Upload Local PDF
  const handleUploadPdf = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const doc = await PdfService.loadDocument(arrayBuffer);
    const coverUrl = await PdfService.generateThumbnail(doc);
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
      isFavorite: false,
      source: 'local',
      syncStatus: 'local',
    };

    await StorageService.savePdfBinary(newBook.id, arrayBuffer);
    await StorageService.saveBook(newBook);
    setBooks(prev => [newBook, ...prev]);

    syncService.pushBookMetadata(newBook).catch(e => console.warn(e));
    syncService.uploadPdfToCloud(newBook.id).catch(e => console.warn(e));
    syncService.performSync().catch(() => {});
    await handleOpenBook(newBook);
  };

  // Google Drive Downloaded
  const handleGoogleDrivePdfDownloaded = async (arrayBuffer: ArrayBuffer, fileName: string) => {
    const doc = await PdfService.loadDocument(arrayBuffer);
    const coverUrl = await PdfService.generateThumbnail(doc);
    const title = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    const driveBook: Book = {
      id: `book_drive_${Date.now()}`,
      title: title,
      fileSize: arrayBuffer.byteLength,
      totalPages: doc.numPages,
      currentPage: 1,
      addedAt: Date.now(),
      lastReadAt: Date.now(),
      coverDataUrl: coverUrl || undefined,
      isFavorite: false,
      source: 'google_drive',
      syncStatus: 'local',
    };

    await StorageService.savePdfBinary(driveBook.id, arrayBuffer);
    await StorageService.saveBook(driveBook);
    setBooks(prev => [driveBook, ...prev]);

    syncService.pushBookMetadata(driveBook).catch(e => console.warn(e));
    syncService.uploadPdfToCloud(driveBook.id).catch(e => console.warn(e));
    syncService.performSync().catch(() => {});
    await handleOpenBook(driveBook);
  };

  const handleLoadSampleBook = async () => {
    const res = await fetch('/sample-book.pdf');
    const buf = await res.arrayBuffer();
    await handleUploadPdf(new File([buf], 'Sach-Mau-Tri-Thuc.pdf', { type: 'application/pdf' }));
  };

  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isFav = await StorageService.toggleFavorite(id);
    setBooks(prev => prev.map(b => b.id === id ? { ...b, isFavorite: isFav } : b));
  };

  const handleDeleteBook = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xoá cuốn sách này?')) {
      await StorageService.deleteBook(id);
      setBooks(prev => prev.filter(b => b.id !== id));
      if (activeBook?.id === id) {
        setActiveBook(null);
        setActivePdfDoc(null);
        setCurrentView('library');
      }
    }
  };

  const handleBackToLibrary = () => {
    setCurrentView('library');
  };

  return (
    <div className="h-screen w-screen bg-[#111317] text-stone-100 flex overflow-hidden font-sans select-none">
      {/* 1. Left Vertical Sidebar - Only in Library */}
      {currentView === 'library' && (
        <Sidebar
          activeTab={activeNav}
          onSelectTab={(tab) => {
            if (tab === 'settings') {
              setShowSyncModal(true);
            } else {
              setActiveNav(tab as any);
            }
          }}
          onOpenSync={() => setShowSyncModal(true)}
        />
      )}

      {/* 2. Main App Column */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Top Header - Only in Library */}
        {currentView === 'library' && (
          <Header
            currentView={currentView}
            bookTitle={activeBook?.title}
            onBackToLibrary={handleBackToLibrary}
            activeNav={activeNav}
            onSelectNav={setActiveNav}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            theme={theme}
            onThemeChange={handleThemeChange}
            onOpenSync={() => setShowSyncModal(true)}
            onOpenDrive={() => setShowGoogleDriveModal(true)}
            onUploadClick={() => headerFileInputRef.current?.click()}
            syncStatus={syncStatus}
          />
        )}

        <input
          type="file"
          ref={headerFileInputRef}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              await handleUploadPdf(file);
              if (headerFileInputRef.current) headerFileInputRef.current.value = '';
            }
          }}
          accept="application/pdf,.pdf"
          className="hidden"
        />

        {/* Content Body */}
        <main className={`flex-1 flex flex-col ${currentView === 'library' ? 'h-[calc(100vh-56px)]' : 'h-full'} overflow-hidden relative`}>
          {currentView === 'reader' && activeBook && activePdfDoc ? (
            <PdfViewer
              book={activeBook}
              pdfDoc={activePdfDoc}
              theme={theme}
              onThemeChange={handleThemeChange}
              onBackToLibrary={handleBackToLibrary}
              onPageChange={handlePageChange}
              showControls={showReaderControls}
              onToggleControls={() => setShowReaderControls(v => !v)}
            />
          ) : activeNav === 'library' ? (
            <LibraryView
              books={books.filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase()))}
              onOpenBook={handleOpenBook}
              onToggleFavorite={handleToggleFavorite}
              onDeleteBook={handleDeleteBook}
              onUploadClick={() => headerFileInputRef.current?.click()}
              onOpenDrive={() => setShowGoogleDriveModal(true)}
              onLoadSampleBook={handleLoadSampleBook}
            />
          ) : activeNav === 'bookmarks' ? (
            <BookmarksView
              books={books}
              onOpenBookAtPage={handleOpenBook}
            />
          ) : activeNav === 'annotations' ? (
            <AnnotationsView
              books={books}
              onOpenBookAtPage={handleOpenBook}
            />
          ) : (
            <BookList
              books={books.filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase()))}
              isLoading={isLoadingBooks}
              onOpenBook={handleOpenBook}
              onUploadPdf={handleUploadPdf}
              onLoadSampleBook={handleLoadSampleBook}
              onToggleFavorite={handleToggleFavorite}
              onDeleteBook={handleDeleteBook}
              onOpenGoogleDrive={() => setShowGoogleDriveModal(true)}
            />
          )}
        </main>

        {/* 3. Floating Pill Podcast Player (Tạm ẩn theo yêu cầu) */}
        {/* {currentView === 'library' && activeBook && (
          <PodcastPlayer
            book={activeBook}
            ttsState={ttsState}
            onPageChange={handlePageChange}
          />
        )} */}
      </div>

      {/* Cloud Downloading Indicator */}
      {isCloudDownloading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#181a20] border border-[#2b2e3a] px-6 py-4 rounded-2xl flex items-center gap-3 shadow-2xl">
            <div className="w-4 h-4 border-2 border-[#c97a3e] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-stone-200">Đang tải sách từ Cloud Storage...</span>
          </div>
        </div>
      )}

      {/* Modals */}
      <SyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onSyncComplete={refreshBooks}
      />

      <GoogleDriveModal
        isOpen={showGoogleDriveModal}
        onClose={() => setShowGoogleDriveModal(false)}
        onPdfDownloaded={handleGoogleDrivePdfDownloaded}
      />
    </div>
  );
};

export default App;
