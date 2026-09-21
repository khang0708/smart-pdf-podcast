import React from 'react';
import { Book } from '../../types';
import { BookOpen, Trash2, Heart, Clock, PlayCircle, Cloud, DownloadCloud } from 'lucide-react';

interface BookCardProps {
  book: Book;
  onOpenBook: (book: Book) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onDeleteBook: (id: string, e: React.MouseEvent) => void;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onOpenBook,
  onToggleFavorite,
  onDeleteBook
}) => {
  const percentage = book.totalPages > 0 
    ? Math.min(100, Math.round((book.currentPage / book.totalPages) * 100))
    : 0;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins}m trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h trước`;
    const days = Math.floor(hours / 24);
    return `${days}d trước`;
  };

  return (
    <div
      onClick={() => onOpenBook(book)}
      className="group relative bg-[#13151b] hover:bg-[#181a22] border border-[#21242e] hover:border-[#383c4b] rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1.5 flex flex-col cursor-pointer"
    >
      {/* Top Cover Section with Tactile Book Spine */}
      <div className="relative aspect-[1/1.414] w-full bg-[#0e1014] flex items-center justify-center overflow-hidden border-b border-[#1c1e26]">
        {/* Left Book Spine Shadow Effect */}
        <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/60 via-black/25 to-transparent z-10 pointer-events-none" />
        <div className="absolute left-1 top-0 bottom-0 w-[1px] bg-white/10 z-10 pointer-events-none" />

        {book.coverDataUrl ? (
          <img
            src={book.coverDataUrl}
            alt={book.title}
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-[#181a22] to-[#0e1014]">
            <div className="w-10 h-10 rounded-lg bg-[#222530] border border-[#2e3240] flex items-center justify-center text-[#c97a3e] mb-2 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-serif text-xs text-stone-200 font-semibold line-clamp-3 px-1">
              {book.title}
            </span>
          </div>
        )}

        {/* Favorite Heart Button */}
        <button
          onClick={(e) => onToggleFavorite(book.id, e)}
          className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg backdrop-blur-md transition-all active:scale-90 z-20 ${
            book.isFavorite
              ? 'bg-[#c97a3e] text-white shadow-md'
              : 'bg-black/50 text-stone-400 hover:text-white hover:bg-black/70'
          }`}
          title={book.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
        >
          <Heart className="w-3.5 h-3.5 fill-current" />
        </button>

        {/* Quick Read overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 backdrop-blur-[2px]">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c97a3e] text-white font-medium text-xs shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all">
            <PlayCircle className="w-3.5 h-3.5" />
            <span>{book.currentPage > 1 ? `Trang ${book.currentPage}` : 'Đọc ngay'}</span>
          </div>
        </div>

        {/* Badges on Cover bottom */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 z-20">
          <div className="px-2 py-0.5 rounded bg-black/75 backdrop-blur-md font-mono text-[10px] text-stone-300 border border-white/10">
            {book.currentPage}/{book.totalPages}p
          </div>

          {book.syncStatus === 'cloud_only' && (
            <div className="p-1 rounded bg-[#c97a3e] text-white text-[10px]" title="Tải từ Cloud">
              <DownloadCloud className="w-3 h-3" />
            </div>
          )}

          {book.syncStatus === 'synced' && (
            <div className="p-1 rounded bg-[#181a20] text-[#5b8266] border border-[#2a2d39]" title="Đã đồng bộ Cloud">
              <Cloud className="w-3 h-3" />
            </div>
          )}

          {book.source === 'google_drive' && (
            <div className="px-1.5 py-0.5 rounded bg-[#1e2330] text-blue-300 border border-blue-500/30 text-[9px] font-bold">
              Drive
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
        <div>
          <h3 className="font-serif font-semibold text-stone-100 text-xs line-clamp-2 group-hover:text-[#c97a3e] transition-colors leading-snug">
            {book.title}
          </h3>
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-stone-400 font-mono">
            <span>{formatFileSize(book.fileSize)}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-stone-500" />
              {formatTimeAgo(book.lastReadAt)}
            </span>
          </div>
        </div>

        {/* Minimal Progress Bar & Delete */}
        <div className="pt-2 border-t border-[#1c1e26] flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono">
            <span>Tiến độ</span>
            <span className="font-semibold text-[#c97a3e]">{percentage}%</span>
          </div>
          <div className="w-full h-1 bg-[#1c1e26] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#c97a3e] to-[#e0985c] rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={(e) => onDeleteBook(book.id, e)}
              className="text-stone-500 hover:text-rose-400 p-0.5 rounded hover:bg-rose-500/10 transition-colors text-[10px] flex items-center gap-1"
              title="Xoá sách"
            >
              <Trash2 className="w-3 h-3" />
              <span>Xoá</span>
            </button>
            <span className="text-[10px] text-[#c97a3e] font-medium group-hover:underline">
              Đọc sách &rarr;
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
