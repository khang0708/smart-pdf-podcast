import React, { useState } from 'react';
import { TTSState, Book } from '../../types';
import { ttsService } from '../../services/ttsService';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX 
} from 'lucide-react';

interface PodcastPlayerProps {
  book: Book;
  ttsState: TTSState;
  onPageChange: (page: number) => void;
}

export const PodcastPlayer: React.FC<PodcastPlayerProps> = ({
  book,
  ttsState,
  onPageChange
}) => {
  const [isMuted, setIsMuted] = useState(false);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[94%] sm:w-[620px] select-none pointer-events-auto">
      {/* The Atelier Floating Pill Player */}
      <div className="bg-[#94a596] border border-[#a6b7a8] text-[#1c261e] rounded-full px-5 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.35)] flex items-center justify-between gap-4 sm:gap-6">
        
        {/* Left: Playlist Menu & Play/Pause & Volume */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            className="text-[#1c261e] hover:text-black transition-colors cursor-pointer"
            title="Danh sách chương"
          >
            {/* 3 lines playlist icon */}
            <svg className="w-4 h-4 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <button
            onClick={() => ttsService.togglePlayPause()}
            className="text-[#1c261e] hover:text-black flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
            title={ttsState.isPlaying && !ttsState.isPaused ? 'Tạm dừng' : 'Phát âm thanh'}
          >
            {ttsState.isPlaying && !ttsState.isPaused ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="text-[#1c261e] hover:text-black transition-colors cursor-pointer"
            title="Âm lượng"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Center: Title & Thin Scrubber Line */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0">
          <div className="text-center truncate w-full mb-1">
            <span className="font-sans font-bold text-[11px] sm:text-xs text-[#1c261e] tracking-wide">
              AURORA PODCASTS | Ep. 42: Modern Classics
            </span>
          </div>

          {/* Progress Scrubber Bar */}
          <div className="w-full max-w-xs h-[3px] bg-[#7d8f7f] rounded-full overflow-hidden relative">
            <div 
              className="h-full bg-[#1c261e] rounded-full transition-all duration-300"
              style={{ width: `${Math.max(12, (ttsState.currentPage / Math.max(1, book.totalPages)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Right: Timestamp */}
        <div className="shrink-0">
          <span className="font-mono font-medium text-xs text-[#1c261e]">
            12:45 / 48:10
          </span>
        </div>

      </div>
    </div>
  );
};
