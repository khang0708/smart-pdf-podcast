import React from 'react';
import { BookOpen, Headphones, ArrowLeft, Sun, Moon, Coffee, Download } from 'lucide-react';
import { ThemeMode } from '../types';

interface HeaderProps {
  currentView: 'library' | 'reader';
  bookTitle?: string;
  onBackToLibrary?: () => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onInstallPwa?: () => void;
  canInstallPwa?: boolean;
  visible?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  bookTitle,
  onBackToLibrary,
  theme,
  onThemeChange,
  onInstallPwa,
  canInstallPwa,
  visible = true
}) => {
  return (
    <header className={`z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 transition-all duration-300 ${
      currentView === 'reader'
        ? (visible ? 'fixed top-0 left-0 right-0 translate-y-0 opacity-100 shadow-xl' : 'fixed top-0 left-0 right-0 -translate-y-full opacity-0 pointer-events-none')
        : 'sticky top-0'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Logo or Back Button */}
        <div className="flex items-center gap-3 min-w-0">
          {currentView === 'reader' ? (
            <button
              onClick={onBackToLibrary}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-sm font-medium shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Thư viện</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
                  Smart PDF <span className="text-indigo-400 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30">Reader</span>
                </h1>
                <p className="text-[11px] text-slate-400 hidden sm:block">Đọc sách & Quản lý thư viện file PDF</p>
              </div>
            </div>
          )}

          {currentView === 'reader' && bookTitle && (
            <h2 className="text-sm font-medium text-slate-200 truncate max-w-[200px] sm:max-w-md md:max-w-lg">
              {bookTitle}
            </h2>
          )}
        </div>

        {/* Right: Theme Switcher & Install PWA */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme selector in reader */}
          {currentView === 'reader' && (
            <div className="flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700/60">
              <button
                title="Chế độ Tối"
                onClick={() => onThemeChange('dark')}
                className={`p-1.5 rounded-md transition-colors ${
                  theme === 'dark' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Moon className="w-4 h-4" />
              </button>
              <button
                title="Chế độ Giấy ấm (Sepia)"
                onClick={() => onThemeChange('sepia')}
                className={`p-1.5 rounded-md transition-colors ${
                  theme === 'sepia' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Coffee className="w-4 h-4" />
              </button>
              <button
                title="Chế độ Sáng"
                onClick={() => onThemeChange('light')}
                className={`p-1.5 rounded-md transition-colors ${
                  theme === 'light' ? 'bg-slate-200 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sun className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* PWA Install Button */}
          {canInstallPwa && onInstallPwa && (
            <button
              onClick={onInstallPwa}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Cài App</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
