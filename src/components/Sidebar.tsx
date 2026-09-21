import React from 'react';
import { 
  Bookmark, 
  BookOpen, 
  Tag, 
  Archive, 
  Radio, 
  Settings, 
  LogOut 
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'bookshelf' | 'library' | 'podcasts' | 'annotations' | 'bookmarks' | 'settings';
  onSelectTab: (tab: 'bookshelf' | 'library' | 'podcasts' | 'annotations' | 'bookmarks' | 'settings') => void;
  onOpenSync?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenSync
}) => {
  return (
    <>
    <aside className="hidden md:flex w-14 sm:w-16 bg-[#0e1116] border-r border-[#1a1d24] flex-col items-center justify-between py-4 shrink-0 z-30 select-none">
      {/* Top: Menu Toggle & Main Navigation */}
      <div className="flex flex-col items-center gap-5 w-full">
        {/* Hamburger Menu */}
        <button 
          className="w-10 h-10 rounded-lg text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          title="Menu"
        >
          <svg className="w-5 h-5 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="7" x2="21" y2="7" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="17" x2="21" y2="17" />
          </svg>
        </button>

        {/* Navigation Items Stack */}
        <nav className="flex flex-col items-center gap-3 w-full">
          {/* 1. Bookshelf (3 vertical books icon) */}
          <button
            onClick={() => onSelectTab('bookshelf')}
            title="Tủ sách (Bookshelf)"
            className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeTab === 'bookshelf'
                ? 'text-white'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            {/* 3 Books standing icon */}
            <svg className="w-5 h-5 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round">
              <rect x="4" y="4" width="3.5" height="16" rx="0.5" />
              <rect x="10.5" y="4" width="3.5" height="16" rx="0.5" />
              <path d="M17 4.5l3.5 15.5" />
            </svg>
            {activeTab === 'bookshelf' && (
              <span className="absolute -left-2 top-2 bottom-2 w-1 bg-white rounded-r-full" />
            )}
          </button>

          {/* 2. Bookmark Ribbon */}
          <button
            onClick={() => onSelectTab('bookmarks')}
            title="Đánh dấu (Bookmarks)"
            className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeTab === 'bookmarks' ? 'text-white' : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            {activeTab === 'bookmarks' && (
              <span className="absolute -left-2 top-1.5 bottom-1.5 w-1 bg-white rounded-r-full" />
            )}
          </button>

          {/* 3. Open Book (Library) */}
          <button
            onClick={() => onSelectTab('library')}
            title="Thư viện (Library)"
            className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeTab === 'library' ? 'text-white' : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            {activeTab === 'library' && (
              <span className="absolute -left-2 top-1.5 bottom-1.5 w-1 bg-white rounded-r-full" />
            )}
          </button>

          {/* 4. Tag (Annotations) */}
          <button
            onClick={() => onSelectTab('annotations')}
            title="Ghi chú (Annotations)"
            className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeTab === 'annotations' ? 'text-white' : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            <Tag className="w-4 h-4" />
            {activeTab === 'annotations' && (
              <span className="absolute -left-2 top-1.5 bottom-1.5 w-1 bg-white rounded-r-full" />
            )}
          </button>

          {/* 5. Archive Box */}
          <button
            title="Lưu trữ (Archive)"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-300 transition-colors cursor-pointer"
          >
            <Archive className="w-4 h-4" />
          </button>

          {/* 6. Podcast Tower (Tạm ẩn theo yêu cầu) */}
          {/* <button
            onClick={() => onSelectTab('podcasts')}
            title="Podcasts"
            className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeTab === 'podcasts' ? 'text-white' : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            <Radio className="w-4 h-4" />
            {activeTab === 'podcasts' && (
              <span className="absolute -left-2 top-1.5 bottom-1.5 w-1 bg-white rounded-r-full" />
            )}
          </button> */}

          {/* 7. Settings Gear */}
          <button
            onClick={() => onSelectTab('settings')}
            title="Cài đặt hệ thống"
            className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeTab === 'settings' ? 'text-white' : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </nav>
      </div>

      {/* Bottom: Logout & Author Avatar */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={onOpenSync}
          title="Đăng xuất / Tài khoản"
          className="w-10 h-10 rounded-lg text-stone-500 hover:text-stone-300 flex items-center justify-center transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>

        {/* User Portrait Avatar */}
        <div 
          onClick={onOpenSync}
          title="Tài khoản cá nhân"
          className="w-8 h-8 rounded-full overflow-hidden border border-stone-600/60 shadow-md cursor-pointer hover:border-white transition-colors bg-stone-800 flex items-center justify-center"
        >
          <svg className="w-full h-full" viewBox="0 0 32 32">
            <rect width="32" height="32" fill="#d2d7db"/>
            {/* Black crewneck shirt */}
            <path d="M6 32 L6 26 C6 22 10.5 20.5 16 20.5 C21.5 20.5 26 22 26 26 L26 32 Z" fill="#181a1e"/>
            {/* Neck */}
            <rect x="14" y="16" width="4" height="5" fill="#e8c8b0"/>
            {/* Head / skin */}
            <ellipse cx="16" cy="13" rx="4.5" ry="5.5" fill="#eed0bb"/>
            {/* Hair */}
            <path d="M11 12 C11 7.5 13 6 16 6 C19 6 21 7.5 21 12 C20.5 9 18 8 16 8 C14 8 11.5 9 11 12 Z" fill="#221e1f"/>
            {/* Beard */}
            <path d="M12.5 13.5 C12.5 17 14 18.5 16 18.5 C18 18.5 19.5 17 19.5 13.5 C19 16.5 17.5 17.5 16 17.5 C14.5 17.5 13 16.5 12.5 13.5 Z" fill="#322927"/>
          </svg>
        </div>
      </div>
    </aside>

    {/* ================= MOBILE BOTTOM NAVIGATION BAR ================= */}
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0e1116]/95 backdrop-blur-xl border-t border-[#1d2028] px-2 py-1.5 flex items-center justify-around shadow-[0_-8px_24px_rgba(0,0,0,0.6)] select-none">
      {/* 1. Tủ sách (Bookshelf) */}
      <button
        onClick={() => onSelectTab('bookshelf')}
        className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
          activeTab === 'bookshelf'
            ? 'text-white'
            : 'text-stone-400 hover:text-stone-200'
        }`}
      >
        <div className="relative">
          <svg className={`w-5 h-5 ${activeTab === 'bookshelf' ? 'text-[#c97a3e]' : 'stroke-current'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="4" y="4" width="3.5" height="16" rx="0.5" />
            <rect x="10.5" y="4" width="3.5" height="16" rx="0.5" />
            <path d="M17 4.5l3.5 15.5" />
          </svg>
          {activeTab === 'bookshelf' && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#c97a3e]" />
          )}
        </div>
        <span className="text-[10px] font-sans font-medium tracking-tight">Tủ sách</span>
      </button>

      {/* 2. Thư viện (Library) */}
      <button
        onClick={() => onSelectTab('library')}
        className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
          activeTab === 'library'
            ? 'text-white'
            : 'text-stone-400 hover:text-stone-200'
        }`}
      >
        <div className="relative">
          <BookOpen className={`w-5 h-5 ${activeTab === 'library' ? 'text-[#c97a3e]' : ''}`} />
          {activeTab === 'library' && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#c97a3e]" />
          )}
        </div>
        <span className="text-[10px] font-sans font-medium tracking-tight">Thư viện</span>
      </button>

      {/* 3. Đánh dấu (Bookmarks) */}
      <button
        onClick={() => onSelectTab('bookmarks')}
        className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
          activeTab === 'bookmarks'
            ? 'text-white'
            : 'text-stone-400 hover:text-stone-200'
        }`}
      >
        <div className="relative">
          <Bookmark className={`w-5 h-5 ${activeTab === 'bookmarks' ? 'text-[#c97a3e]' : ''}`} />
          {activeTab === 'bookmarks' && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#c97a3e]" />
          )}
        </div>
        <span className="text-[10px] font-sans font-medium tracking-tight">Đánh dấu</span>
      </button>

      {/* 4. Ghi chú (Annotations) */}
      <button
        onClick={() => onSelectTab('annotations')}
        className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
          activeTab === 'annotations'
            ? 'text-white'
            : 'text-stone-400 hover:text-stone-200'
        }`}
      >
        <div className="relative">
          <Tag className={`w-5 h-5 ${activeTab === 'annotations' ? 'text-[#c97a3e]' : ''}`} />
          {activeTab === 'annotations' && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#c97a3e]" />
          )}
        </div>
        <span className="text-[10px] font-sans font-medium tracking-tight">Ghi chú</span>
      </button>

      {/* 5. Cài đặt (Settings) */}
      <button
        onClick={() => onSelectTab('settings')}
        className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
          activeTab === 'settings'
            ? 'text-white'
            : 'text-stone-400 hover:text-stone-200'
        }`}
      >
        <div className="relative">
          <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-[#c97a3e]' : ''}`} />
          {activeTab === 'settings' && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#c97a3e]" />
          )}
        </div>
        <span className="text-[10px] font-sans font-medium tracking-tight">Cài đặt</span>
      </button>
    </nav>
    </>
  );
};
