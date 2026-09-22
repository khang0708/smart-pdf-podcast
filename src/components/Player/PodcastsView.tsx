import React, { useState, useEffect, useRef } from 'react';
import { Book } from '../../types';
import { podcastService, PodcastManifest } from '../../services/podcastService';
import { 
  Radio, 
  Play, 
  Sparkles, 
  Headphones, 
  Clock, 
  ListMusic, 
  Mic2, 
  Plus,
  UploadCloud,
  FileText,
  RotateCcw
} from 'lucide-react';

interface PodcastsViewProps {
  books: Book[];
  onPlayPodcast: (book: Book) => void;
  onRequestGenerate: (book?: Book | null, file?: File | null) => void;
}

export const PodcastsView: React.FC<PodcastsViewProps> = ({
  books,
  onPlayPodcast,
  onRequestGenerate
}) => {
  const [manifests, setManifests] = useState<Record<string, PodcastManifest>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAll = async () => {
    setLoading(true);
    const results: Record<string, PodcastManifest> = {};
    
    // 1. Lấy toàn bộ podcast từ backend API (nếu worker online)
    try {
      const apiPodcasts = await podcastService.listAllPodcasts();
      for (const p of apiPodcasts) {
        if (p && p.book_id) {
          results[p.book_id] = p;
        }
      }
    } catch {}

    // 2. Kiểm tra manifest cho sample_test_book và tất cả sách trong thư viện
    const checkList = [
      { id: 'sample_test_book', title: 'Bản Thử Nghiệm: Bình Minh Trên Đỉnh Núi', author: 'Aurora Collective' },
      ...books
    ];

    for (const b of checkList) {
      if (!results[b.id]) {
        try {
          const m = await podcastService.getManifest(b.id);
          if (m) {
            results[b.id] = m;
          }
        } catch {}
      }
    }

    setManifests(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [books]);

  // Danh sách các sách sẵn sàng podcast (từ thư viện)
  const readyBookIds = new Set(Object.keys(manifests));
  const libraryReadyBooks = books.filter(b => readyBookIds.has(b.id));
  const otherLibraryBooks = books.filter(b => !readyBookIds.has(b.id));

  // Thêm các podcast từ backend mà chưa có trong state thư viện (ví dụ mới upload)
  const externalPodcasts: Book[] = [];
  for (const [bId, m] of Object.entries(manifests)) {
    if (bId !== 'sample_test_book' && !books.some(b => b.id === bId)) {
      externalPodcasts.push({
        id: bId,
        title: m.title || bId,
        author: m.author || 'Tải lên trực tiếp',
        totalPages: 1,
        currentPage: 1,
        fileSize: 0,
        addedAt: (m.created_at || Date.now() / 1000) * 1000,
        lastReadAt: (m.created_at || Date.now() / 1000) * 1000,
        source: 'local'
      });
    }
  }

  const allReadyItems = [
    ...(manifests['sample_test_book'] ? [{
      id: 'sample_test_book',
      title: manifests['sample_test_book'].title || 'Bình Minh Trên Đỉnh Núi',
      author: 'Aurora Collective (Bản Mẫu)',
      totalPages: 2,
      currentPage: 1,
      fileSize: 100000,
      addedAt: Date.now(),
      lastReadAt: Date.now(),
      source: 'local' as const
    }] : []),
    ...libraryReadyBooks,
    ...externalPodcasts
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf')) {
      onRequestGenerate(null, file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onRequestGenerate(null, file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full pb-32">
      {/* Hidden file input for quick direct upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Hero Banner with Quick Upload Action */}
      <div className="bg-gradient-to-r from-[#1c261e] via-[#243328] to-[#172019] border border-[#3b4d3e] rounded-3xl p-6 sm:p-8 mb-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#94a596]/15 border border-[#94a596]/30 text-[#94a596] text-xs font-semibold uppercase tracking-wider mb-3">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            AI Audio Podcast Studio
          </div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-white tracking-tight mb-2">
            Không gian Nghe Sách & Podcast Thông Minh
          </h1>
          <p className="text-sm text-[#a3b8a6] leading-relaxed mb-6">
            Chuyển thể bất kỳ file PDF nào thành các tập Audio Podcast sống động nhờ mô hình Valtec-TTS tiếng Việt đa vùng miền, tự động nhận diện chương và lồng ghép nhạc nền thư giãn.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onRequestGenerate(null, null)}
              className="px-5 py-2.5 rounded-xl bg-[#94a596] hover:bg-[#a6b7a8] text-[#1c261e] font-sans font-bold text-xs sm:text-sm transition-all shadow-[0_4px_14px_rgba(148,165,150,0.3)] flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Tải Lên PDF & Tạo Podcast Mới
            </button>

            <button
              onClick={fetchAll}
              className="px-3.5 py-2.5 rounded-xl bg-[#253227] hover:bg-[#324335] text-[#b5c7b7] font-sans font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Làm mới danh sách podcast"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Làm mới
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute right-4 -bottom-6 opacity-15 pointer-events-none">
          <Headphones className="w-56 h-56 text-[#94a596]" />
        </div>
      </div>

      {/* Drag & Drop Quick Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mb-8 border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
          isDragging
            ? 'border-[#94a596] bg-[#94a596]/15 scale-[0.99]'
            : 'border-[#2d3a2f] hover:border-[#94a596]/70 bg-[#162018]/40 hover:bg-[#1a261d]/70'
        }`}
      >
        <div className="w-12 h-12 rounded-2xl bg-[#94a596]/15 border border-[#94a596]/30 flex items-center justify-center text-[#94a596]">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div className="text-sm font-bold text-white">
          Kéo thả file PDF trực tiếp vào đây để tạo Podcast động
        </div>
        <p className="text-xs text-[#8fa792] max-w-md">
          Hệ thống sẽ trích xuất chương, làm sạch văn bản, tạo giọng đọc Valtec-TTS và ghép thành các tập podcast MP3 có thể nghe ngay lập tức.
        </p>
      </div>

      {/* Sách Đã Có Bản Podcast (Ready to Listen) */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif font-bold text-lg text-[#eef2ef] flex items-center gap-2">
            <Headphones className="w-5 h-5 text-[#94a596]" />
            Podcast Đã Sẵn Sàng Nghe
          </h2>
          <span className="text-xs text-[#8fa792] font-mono">
            {allReadyItems.length} podcast
          </span>
        </div>

        {allReadyItems.length === 0 ? (
          <div className="p-8 rounded-2xl border border-[#2d3a2f] bg-[#162018]/40 text-center">
            <Radio className="w-8 h-8 text-[#8fa792] mx-auto mb-2 opacity-50" />
            <p className="text-sm text-[#8fa792]">Chưa có bản Podcast nào được tạo.</p>
            <p className="text-xs text-stone-500 mt-1">Hãy tải lên một file PDF ở trên để bắt đầu nghe!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allReadyItems.map((item) => {
              const m = manifests[item.id];
              return (
                <div
                  key={item.id}
                  className="bg-[#181f19] border border-[#314234] hover:border-[#4d6350] rounded-2xl p-5 transition-all shadow-lg flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#94a596]/15 border border-[#94a596]/30 flex items-center justify-center text-[#94a596] shrink-0">
                        <Radio className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-700/60 text-emerald-400">
                        SẴN SÀNG
                      </span>
                    </div>

                    <h3 className="font-serif font-bold text-base text-white group-hover:text-[#b5c7b7] transition-colors mb-1 line-clamp-1">
                      {m?.title || item.title}
                    </h3>
                    <p className="text-xs text-[#8fa792] mb-4 line-clamp-1">
                      {m?.author || item.author || 'Tài liệu PDF'}
                    </p>

                    <div className="space-y-1.5 text-xs text-[#a3b8a6] mb-5 border-t border-[#253227] pt-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-[#8fa792]">
                          <Clock className="w-3.5 h-3.5" /> Thời lượng
                        </span>
                        <span className="font-mono font-semibold text-white">
                          {m?.total_duration_formatted || '--:--'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-[#8fa792]">
                          <ListMusic className="w-3.5 h-3.5" /> Số tập/chương
                        </span>
                        <span className="font-mono font-semibold text-white">
                          {m?.total_chapters || 1} chương
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-[#8fa792]">
                          <Mic2 className="w-3.5 h-3.5" /> Giọng đọc
                        </span>
                        <span className="font-sans font-semibold text-white">
                          {m?.speaker_info?.name || m?.speaker || 'Nữ miền Bắc'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onPlayPodcast(item)}
                      className="flex-1 py-2.5 bg-[#94a596] hover:bg-[#a6b7a8] text-[#1c261e] font-sans font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow cursor-pointer active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Phát Ngay
                    </button>
                    <button
                      onClick={() => onRequestGenerate(item, null)}
                      className="px-3 py-2.5 bg-[#253227] hover:bg-[#324534] text-[#a3b8a6] hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      title="Tạo lại với giọng đọc khác"
                    >
                      Tạo lại
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sách Chưa Tạo Podcast (Trong Thư Viện) */}
      {otherLibraryBooks.length > 0 && (
        <div>
          <h2 className="font-serif font-bold text-lg text-[#eef2ef] mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#c97a3e]" />
            Tạo Podcast Cho Sách Trong Thư Viện
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {otherLibraryBooks.map((book) => (
              <div
                key={book.id}
                className="bg-[#14181f] border border-[#232734] hover:border-[#3b4257] rounded-2xl p-4 transition-all flex flex-col justify-between"
              >
                <div className="mb-4">
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#1f2430] text-stone-400 mb-2 inline-block">
                    {book.totalPages} trang
                  </span>
                  <h4 className="font-serif font-bold text-sm text-stone-200 line-clamp-1 mb-1">
                    {book.title}
                  </h4>
                  <p className="text-xs text-stone-400">
                    {book.author || 'Tác giả'}
                  </p>
                </div>

                <button
                  onClick={() => onRequestGenerate(book, null)}
                  className="w-full py-2 rounded-xl bg-[#252834] hover:bg-[#94a596] hover:text-[#1c261e] text-stone-300 font-sans font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tạo Podcast AI
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
