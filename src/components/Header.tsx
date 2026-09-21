import React from 'react';
import { ArrowLeft, Search, Cloud, Plus, Sun, Moon, Coffee } from 'lucide-react';
import { ThemeMode, SyncStatus } from '../types';

interface HeaderProps {
  currentView: 'library' | 'reader';
  bookTitle?: string;
  onBackToLibrary?: () => void;
  activeNav?: 'bookshelf' | 'library' | 'podcasts' | 'annotations' | 'bookmarks';
  onSelectNav?: (nav: 'bookshelf' | 'library' | 'podcasts' | 'annotations' | 'bookmarks') => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onOpenSync?: () => void;
  onOpenDrive?: () => void;
  onUploadClick?: () => void;
  syncStatus?: SyncStatus;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  bookTitle,
  onBackToLibrary,
  activeNav = 'bookshelf',
  onSelectNav,
  searchQuery = '',
  onSearchChange,
  theme,
  onThemeChange,
  onOpenSync,
  onOpenDrive,
  onUploadClick,
  syncStatus
}) => {
  return (
    <header className="h-14 bg-[#101317] border-b border-[#1b1e25] px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-20 select-none">
      {/* Left: Brand or Back to Library */}
      <div className="flex items-center gap-6 min-w-0">
        {currentView === 'reader' ? (
          <button
            onClick={onBackToLibrary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181b22] hover:bg-[#222630] text-stone-200 border border-[#262b37] transition-colors text-xs font-medium shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#c97a3e]" />
            <span>Thư viện</span>
          </button>
        ) : (
          <div className="flex flex-col cursor-pointer shrink-0" onClick={() => onSelectNav?.('bookshelf')}>
            <span className="font-serif font-bold text-sm sm:text-lg text-[#e8e2d5] tracking-[0.16em] uppercase leading-none">
              AURORA
            </span>
            <span className="hidden sm:inline text-[7.5px] font-sans font-medium tracking-[0.28em] text-[#8e887c] uppercase mt-0.5">
              LITERARY COLLECTIVE
            </span>
          </div>
        )}

        {currentView === 'reader' && bookTitle && (
          <h2 className="text-xs font-serif italic text-stone-300 truncate max-w-[180px] sm:max-w-md border-l border-stone-800 pl-3">
            {bookTitle}
          </h2>
        )}

        {/* Center Nav Links (Bookshelf, Library, Annotations) */}
        {currentView === 'library' && (
          <nav className="hidden md:flex items-center gap-7 text-xs font-sans font-semibold tracking-wider">
            <button
              onClick={() => onSelectNav?.('bookshelf')}
              className={`pb-1 transition-colors cursor-pointer uppercase ${
                activeNav === 'bookshelf'
                  ? 'text-white border-b-2 border-white'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              BOOKSHELF
            </button>
            <button
              onClick={() => onSelectNav?.('library')}
              className={`pb-1 transition-colors cursor-pointer uppercase ${
                activeNav === 'library'
                  ? 'text-white border-b-2 border-white'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              LIBRARY
            </button>
            <button
              onClick={() => onSelectNav?.('bookmarks')}
              className={`pb-1 transition-colors cursor-pointer uppercase ${
                activeNav === 'bookmarks'
                  ? 'text-white border-b-2 border-white'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              BOOKMARKS
            </button>
            <button
              onClick={() => onSelectNav?.('annotations')}
              className={`pb-1 transition-colors cursor-pointer uppercase ${
                activeNav === 'annotations'
                  ? 'text-white border-b-2 border-white'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              ANNOTATIONS
            </button>
          </nav>
        )}
      </div>

      {/* Right: Search + Badges (Cloud Sync Synced, Google Drive Active) + Upload */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search Bar */}
        {currentView === 'library' && onSearchChange && (
          <div className="relative hidden lg:block w-44">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#14171e] border border-[#252834] text-stone-200 text-xs font-sans placeholder:text-stone-500 focus:outline-none focus:border-stone-400 transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-2" />
          </div>
        )}

        {/* Upload PDF Button */}
        {currentView === 'library' && onUploadClick && (
          <button
            onClick={onUploadClick}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#b2532a] hover:bg-[#9c441f] text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
            title="Thêm file PDF"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Thêm PDF</span>
          </button>
        )}

        {/* Cloud Sync Micro-Badge */}
        {onOpenSync && (
          <button
            onClick={onOpenSync}
            title="Đồng bộ Cloud Supabase"
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1 rounded-lg bg-[#14171e] hover:bg-[#1c202a] border border-[#232733] text-stone-300 transition-colors cursor-pointer"
          >
            <div className="relative">
              <Cloud className="w-4 h-4 text-stone-400" />
              <span className="sm:hidden absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#4ade80]" />
            </div>
            <div className="hidden sm:flex flex-col items-start leading-none text-[9px]">
              <span className="text-stone-400 font-sans">Cloud Sync</span>
              <span className="text-[#4ade80] font-bold font-sans">Synced</span>
            </div>
          </button>
        )}

        {/* Google Drive Micro-Badge */}
        {onOpenDrive && (
          <button
            onClick={onOpenDrive}
            title="Tài khoản Google Drive"
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1 rounded-lg bg-[#14171e] hover:bg-[#1c202a] border border-[#232733] text-stone-300 transition-colors cursor-pointer"
          >
            <div className="relative">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z" fill="#ea4335"/>
              </svg>
              <span className="sm:hidden absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#4ade80]" />
            </div>
            <div className="hidden sm:flex flex-col items-start leading-none text-[9px]">
              <span className="text-stone-400 font-sans">Google Drive</span>
              <span className="text-[#4ade80] font-bold font-sans">Active</span>
            </div>
          </button>
        )}

        {/* Theme Switcher in Reader */}
        {currentView === 'reader' && (
          <div className="flex items-center bg-[#14171e] rounded-lg p-0.5 border border-[#232733]">
            <button onClick={() => onThemeChange('dark')} className={`p-1.5 rounded ${theme === 'dark' ? 'bg-[#252834] text-white' : 'text-stone-400'}`} title="Tối">
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onThemeChange('sepia')} className={`p-1.5 rounded ${theme === 'sepia' ? 'bg-[#c97a3e] text-white' : 'text-stone-400'}`} title="Ấm">
              <Coffee className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onThemeChange('light')} className={`p-1.5 rounded ${theme === 'light' ? 'bg-stone-200 text-stone-900' : 'text-stone-400'}`} title="Sáng">
              <Sun className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
