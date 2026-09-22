import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  Plus
} from 'lucide-react';

interface PodcastsViewProps {
  books: Book[];
  onPlayPodcast: (book: Book) => void;
  onRequestGenerate: (book: Book) => void;
}

export const PodcastsView: React.FC<PodcastsViewProps> = ({
  books,
  onPlayPodcast,
  onRequestGenerate
}) => {
  const [manifests, setManifests] = useState<Record<string, PodcastManifest>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchAll = async () => {
      setLoading(true);
      const results: Record<string, PodcastManifest> = {};
      
      // Kiểm tra manifest cho sample_test_book và tất cả sách trong thư viện
      const checkList = [
        { id: 'sample_test_book', title: 'Bản Thử Nghiệm: Bình Minh Trên Đỉnh Núi', author: 'Aurora Collective' },
        ...books
      ];

      for (const b of checkList) {
        try {
          const m = await podcastService.getManifest(b.id);
          if (m) {
            results[b.id] = m;
          }
        } catch {}
      }

      if (isMounted) {
        setManifests(results);
        setLoading(false);
      }
    };

    fetchAll();
    return () => {
      isMounted = false;
    };
  }, [books]);

  const readyBooks = books.filter(b => !!manifests[b.id]);
  const otherBooks = books.filter(b => !manifests[b.id]);

  // Bao gồm cả sample nếu có
  const hasSample = !!manifests['sample_test_book'];

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full pb-32">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#1c261e] via-[#243328] to-[#172019] border border-[#3b4d3e] rounded-3xl p-6 sm:p-8 mb-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#94a596]/15 border border-[#94a596]/30 text-[#94a596] text-xs font-semibold uppercase tracking-wider mb-3">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            AI Audio Podcast Studio
          </div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-white tracking-tight mb-2">
            Không gian Nghe Sách & Podcast Thông Minh
          </h1>
          <p className="text-sm text-[#a3b8a6] leading-relaxed">
            Chuyển thể sách PDF thành các tập Audio Podcast sống động nhờ mô hình Valtec-TTS tiếng Việt đa vùng miền, tự động ghép chương và hòa trộn nhạc nền thư giãn.
          </p>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute right-4 -bottom-6 opacity-15 pointer-events-none">
          <Headphones className="w-56 h-56 text-[#94a596]" />
        </div>
      </div>

      {/* Sách Đã Có Bản Podcast (Ready to Listen) */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif font-bold text-lg text-[#eef2ef] flex items-center gap-2">
            <Headphones className="w-5 h-5 text-[#94a596]" />
            Podcast Đã Sẵn Sàng Nghe
          </h2>
          <span className="text-xs text-[#8fa792] font-mono">
            {readyBooks.length + (hasSample ? 1 : 0)} podcast
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Sample Book Podcast nếu có */}
          {hasSample && (
            <div className="bg-[#181f19] border border-[#314234] hover:border-[#4d6350] rounded-2xl p-5 transition-all shadow-lg flex flex-col justify-between group">
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
                  Bình Minh Trên Đỉnh Núi
                </h3>
                <p className="text-xs text-[#8fa792] mb-4">
                  Bản mẫu chuyển thể từ PDF mẫu
                </p>

                <div className="space-y-1.5 text-xs text-[#a3b8a6] mb-5 border-t border-[#253227] pt-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#8fa792]">
                      <Clock className="w-3.5 h-3.5" /> Thời lượng
                    </span>
                    <span className="font-mono font-semibold text-white">
                      {manifests['sample_test_book'].total_duration_formatted}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#8fa792]">
                      <ListMusic className="w-3.5 h-3.5" /> Số tập/chương
                    </span>
                    <span className="font-mono font-semibold text-white">
                      {manifests['sample_test_book'].total_chapters} chương
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#8fa792]">
                      <Mic2 className="w-3.5 h-3.5" /> Giọng đọc
                    </span>
                    <span className="font-sans font-semibold text-white">
                      {manifests['sample_test_book'].speaker_info?.name || 'Nữ miền Bắc'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onPlayPodcast({
                  id: 'sample_test_book',
                  title: 'Bình Minh Trên Đỉnh Núi',
                  totalPages: 2,
                  currentPage: 1,
                  fileSize: 100000,
                  addedAt: Date.now(),
                  lastReadAt: Date.now(),
                })}
                className="w-full py-2.5 bg-[#94a596] hover:bg-[#a6b7a8] text-[#1c261e] font-sans font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow cursor-pointer active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                Phát Audio Podcast Ngay
              </button>
            </div>
          )}

          {/* Các sách người dùng đã có podcast */}
          {readyBooks.map(book => {
            const m = manifests[book.id];
            return (
              <div key={book.id} className="bg-[#181f19] border border-[#314234] hover:border-[#4d6350] rounded-2xl p-5 transition-all shadow-lg flex flex-col justify-between group">
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
                    {book.title}
                  </h3>
                  <p className="text-xs text-[#8fa792] mb-4">
                    {book.author || 'Tác giả'}
                  </p>

                  <div className="space-y-1.5 text-xs text-[#a3b8a6] mb-5 border-t border-[#253227] pt-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[#8fa792]">
                        <Clock className="w-3.5 h-3.5" /> Thời lượng
                      </span>
                      <span className="font-mono font-semibold text-white">
                        {m.total_duration_formatted}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[#8fa792]">
                        <ListMusic className="w-3.5 h-3.5" /> Số tập/chương
                      </span>
                      <span className="font-mono font-semibold text-white">
                        {m.total_chapters} chương
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[#8fa792]">
                        <Mic2 className="w-3.5 h-3.5" /> Giọng đọc
                      </span>
                      <span className="font-sans font-semibold text-white">
                        {m.speaker_info?.name || m.speaker}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPlayPodcast(book)}
                    className="flex-1 py-2.5 bg-[#94a596] hover:bg-[#a6b7a8] text-[#1c261e] font-sans font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow cursor-pointer active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Phát Ngay
                  </button>
                  <button
                    onClick={() => onRequestGenerate(book)}
                    className="px-3 py-2.5 bg-[#253227] hover:bg-[#324534] text-[#a3b8a6] hover:text-white rounded-xl text-xs font-semibold transition-colors"
                    title="Tạo lại hoặc đổi giọng đọc"
                  >
                    Tạo lại
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sách Chưa Tạo Podcast (Sẵn sàng chuyển thể) */}
      <div>
        <h2 className="font-serif font-bold text-lg text-[#eef2ef] mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#c97a3e]" />
          Tạo Podcast Cho Sách Trong Thư Viện
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {otherBooks.map(book => (
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
                onClick={() => onRequestGenerate(book)}
                className="w-full py-2 rounded-xl bg-[#252834] hover:bg-[#94a596] hover:text-[#1c261e] text-stone-300 font-sans font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                Tạo Podcast AI
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
