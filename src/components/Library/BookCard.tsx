import React from 'react';
import { Book } from '../../types';
import { BookOpen, Trash2, Heart, Clock, PlayCircle } from 'lucide-react';

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
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  return (
    <div
      onClick={() => onOpenBook(book)}
      className="group relative bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-indigo-500/10 hover:-translate-y-1 flex flex-col cursor-pointer"
    >
      {/* Top Cover Section */}
      <div className="relative aspect-[3/4] w-full bg-slate-900/60 flex items-center justify-center overflow-hidden border-b border-slate-700/40">
        {book.coverDataUrl ? (
          <img
            src={book.coverDataUrl}
            alt={book.title}
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-indigo-950/40 to-slate-900/80">
            <BookOpen className="w-12 h-12 text-indigo-400/60 mb-3 group-hover:text-indigo-400 group-hover:scale-110 transition-all duration-300" />
            <span className="text-xs text-slate-400 font-medium line-clamp-3">
              {book.title}
            </span>
          </div>
        )}

        {/* Favorite Heart Button */}
        <button
          onClick={(e) => onToggleFavorite(book.id, e)}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-transform active:scale-90 ${
            book.isFavorite
              ? 'bg-rose-500/90 text-white shadow-md shadow-rose-500/30'
              : 'bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-900/80'
          }`}
          title={book.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
        >
          <Heart className="w-4 h-4 fill-current" />
        </button>

        {/* Quick Play/Resume overlay on hover */}
        <div className="absolute inset-0 bg-indigo-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white font-medium text-xs shadow-xl shadow-indigo-600/40 transform translate-y-2 group-hover:translate-y-0 transition-all">
            <PlayCircle className="w-4 h-4" />
            <span>{book.currentPage > 1 ? `Đọc tiếp trang ${book.currentPage}` : 'Bắt đầu đọc'}</span>
          </div>
        </div>

        {/* Page progress badge */}
        <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md text-[11px] font-medium text-slate-300 border border-slate-700/50">
          {book.currentPage} / {book.totalPages} trang
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="font-semibold text-slate-100 text-sm line-clamp-2 group-hover:text-indigo-300 transition-colors">
            {book.title}
          </h3>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
            <span className="bg-slate-700/60 px-2 py-0.5 rounded text-slate-300">
              {formatFileSize(book.fileSize)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              {formatTimeAgo(book.lastReadAt)}
            </span>
          </div>
        </div>

        {/* Progress Bar & Actions */}
        <div className="mt-4 pt-3 border-t border-slate-700/50 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Tiến độ</span>
            <span className="font-semibold text-indigo-400">{percentage}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-700/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-1">
            <button
              onClick={(e) => onDeleteBook(book.id, e)}
              className="text-slate-400 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors text-xs flex items-center gap-1"
              title="Xoá sách khỏi thư viện"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xoá</span>
            </button>
            <span className="text-[11px] text-indigo-400 font-medium group-hover:underline">
              Đọc sách &rarr;
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
