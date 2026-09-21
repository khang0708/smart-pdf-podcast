import React, { useState, useEffect, useMemo } from 'react';
import { Book, Bookmark } from '../../types';
import { StorageService } from '../../services/storage';
import { 
  Bookmark as BookmarkIcon, 
  BookOpen, 
  Trash2, 
  Search, 
  Clock, 
  ChevronRight,
  Sparkles,
  Edit2
} from 'lucide-react';

interface BookmarksViewProps {
  books: Book[];
  onOpenBookAtPage: (book: Book, pageNumber: number) => void;
}

// Initial curated sample bookmarks if user has none yet
const SAMPLE_BOOKMARKS: Bookmark[] = [
  {
    id: 'bm_sample_1',
    bookId: 'atelier_book_4', // The Quiet Woods
    pageNumber: 44,
    title: 'Chương 4: Sự tĩnh lặng của rừng già',
    snippet: 'Trong sự tĩnh lặng sâu sắc nhất của khu rừng già, tâm trí tìm thấy câu trả lời mà những ồn ào phố thị không thể đem lại...',
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
  },
  {
    id: 'bm_sample_2',
    bookId: 'atelier_book_2', // Whispers in the Wind
    pageNumber: 18,
    title: 'Đoạn thơ về ngọn gió cao nguyên',
    snippet: 'Gió kể lại những câu chuyện mà thời gian vô tình lãng quên, nhẹ lướt qua những rặng thông và thì thầm lời hứa...',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: 'bm_sample_3',
    bookId: 'atelier_book_3', // Chronicles of Ash
    pageNumber: 88,
    title: 'Bước ngoặt trận chiến thành phố tro tàn',
    snippet: 'Từ trong tro tàn của đế chế cũ, những hạt mầm mới bắt đầu nảy lộc, minh chứng cho ý chí sinh tồn bất diệt...',
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
  }
];

export const BookmarksView: React.FC<BookmarksViewProps> = ({
  books,
  onOpenBookAtPage
}) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedBookId, setSelectedBookId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load bookmarks
  useEffect(() => {
    const load = async () => {
      try {
        let bms = await StorageService.getAllBookmarks();
        if (!bms || bms.length === 0) {
          // Seed sample bookmarks
          for (const s of SAMPLE_BOOKMARKS) {
            await StorageService.saveBookmark(s).catch(() => {});
          }
          bms = SAMPLE_BOOKMARKS;
        }
        setBookmarks(bms);
      } catch (err) {
        console.warn('Error loading bookmarks:', err);
        setBookmarks(SAMPLE_BOOKMARKS);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Delete bookmark
  const handleDeleteBookmark = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc muốn xóa trang đánh dấu này?')) {
      await StorageService.deleteBookmark(id);
      setBookmarks(prev => prev.filter(b => b.id !== id));
    }
  };

  // Filtered bookmarks
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter(bm => {
      if (selectedBookId !== 'all' && bm.bookId !== selectedBookId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = bm.title?.toLowerCase().includes(q) || false;
        const matchSnippet = bm.snippet?.toLowerCase().includes(q) || false;
        const matchPage = `trang ${bm.pageNumber}`.includes(q) || `${bm.pageNumber}` === q;
        if (!matchTitle && !matchSnippet && !matchPage) return false;
      }
      return true;
    });
  }, [bookmarks, selectedBookId, searchQuery]);

  // Book lookup map
  const bookMap = useMemo(() => {
    const map = new Map<string, Book>();
    for (const b of books) {
      map.set(b.id, b);
    }
    return map;
  }, [books]);

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} lúc ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 w-full h-full bg-[#0c0d10] text-stone-200 overflow-y-auto px-4 sm:px-8 py-6 pb-24 md:pb-8 flex flex-col gap-6 select-none font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b1e25] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#faf6ee] tracking-wide flex items-center gap-2.5">
            <span>Trang Đã Đánh Dấu</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#181b22] text-[#c97a3e] border border-[#2b3040] font-sans font-medium">
              {bookmarks.length} trang đã lưu
            </span>
          </h1>
          <p className="text-xs text-stone-400 mt-1 font-sans">
            Xem lại và mở nhanh các đoạn sách, trang ghi nhớ quan trọng trên mọi tài liệu của bạn
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111318] border border-[#1c202a] rounded-2xl p-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo số trang, tiêu đề hoặc đoạn trích..."
            className="w-full bg-[#181b22] border border-[#262c3b] rounded-xl pl-9 pr-3 py-1.5 text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none focus:border-[#c97a3e] transition-colors"
          />
        </div>

        {/* Filter by Book Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400 shrink-0">Lọc theo sách:</span>
          <select
            value={selectedBookId}
            onChange={(e) => setSelectedBookId(e.target.value)}
            className="bg-[#181b22] border border-[#262c3b] text-stone-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer max-w-[220px] truncate"
          >
            <option value="all">Tất cả các sách ({books.length})</option>
            {books.map(b => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bookmarks List */}
      {filteredBookmarks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center bg-[#111318] border border-dashed border-[#222734] rounded-3xl p-6">
          <div className="w-16 h-16 rounded-full bg-[#181b24] flex items-center justify-center text-[#c97a3e] mb-4">
            <BookmarkIcon className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="text-base font-serif font-semibold text-[#faf6ee]">Chưa có trang nào được đánh dấu</h3>
          <p className="text-xs text-stone-400 max-w-sm mt-1.5 mb-2">
            Khi đang đọc sách trong màn hình đọc, hãy bấm vào biểu tượng <b>Đánh dấu (Bookmark)</b> trên thanh công cụ để lưu lại trang bạn tâm đắc.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookmarks.map((bm) => {
            const book = bookMap.get(bm.bookId);
            const bookTitle = book?.title || 'Sách trong thư viện';
            const bookAuthor = book?.author || 'Tác giả ẩn danh';

            return (
              <div
                key={bm.id}
                onClick={() => book && onOpenBookAtPage(book, bm.pageNumber)}
                className="group bg-[#12141a] hover:bg-[#161922] border border-[#1e222d] hover:border-[#384055] rounded-2xl p-4 flex flex-col justify-between gap-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/50 cursor-pointer relative"
              >
                {/* Top: Bookmark Ribbon & Book Info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#261a14] border border-[#4a2b1a] text-[#c97a3e] flex items-center justify-center shrink-0">
                      <BookmarkIcon className="w-4 h-4 fill-[#c97a3e]" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-serif font-bold text-[#faf6ee] truncate group-hover:text-[#c97a3e] transition-colors">
                        {bookTitle}
                      </h4>
                      <p className="text-[10.5px] text-stone-400 truncate">
                        {bookAuthor}
                      </p>
                    </div>
                  </div>

                  {/* Page Pill */}
                  <span className="px-2.5 py-1 rounded-full bg-[#1b202c] border border-[#2d3448] text-[#c97a3e] text-[11px] font-mono font-semibold shrink-0">
                    Trang {bm.pageNumber}
                  </span>
                </div>

                {/* Bookmark Title / Excerpt */}
                <div className="bg-[#171922] border border-[#232734] rounded-xl p-3">
                  <div className="text-xs font-serif font-semibold text-[#f0ebe1] mb-1">
                    {bm.title || `Đánh dấu trang ${bm.pageNumber}`}
                  </div>
                  {bm.snippet && (
                    <p className="text-[11px] font-serif italic text-stone-400 line-clamp-2 leading-relaxed">
                      "{bm.snippet}"
                    </p>
                  )}
                </div>

                {/* Footer: Date & Jump Button */}
                <div className="flex items-center justify-between pt-1 border-t border-[#1b1e26] text-[10px] text-stone-500">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-stone-600" />
                    {formatDate(bm.createdAt)}
                  </span>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleDeleteBookmark(bm.id, e)}
                      className="p-1 rounded text-stone-500 hover:text-[#f43f5e] transition-colors cursor-pointer"
                      title="Xóa đánh dấu"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => book && onOpenBookAtPage(book, bm.pageNumber)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#202534] hover:bg-[#c97a3e] text-stone-200 hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      <span>Mở trang</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default BookmarksView;
