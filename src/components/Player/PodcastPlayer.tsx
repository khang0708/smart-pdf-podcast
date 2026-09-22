import React, { useState, useEffect, useRef } from 'react';
import { Book } from '../../types';
import { podcastService, PodcastManifest, ChapterTrack } from '../../services/podcastService';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  SkipForward, 
  SkipBack, 
  ListMusic, 
  X,
  Radio,
  Gauge
} from 'lucide-react';

interface PodcastPlayerProps {
  book: Book;
  onClose?: () => void;
}

export const PodcastPlayer: React.FC<PodcastPlayerProps> = ({
  book,
  onClose
}) => {
  const [manifest, setManifest] = useState<PodcastManifest | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [showPlaylist, setShowPlaylist] = useState<boolean>(false);
  const [loadingAudio, setLoadingAudio] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // Tải manifest cho cuốn sách hiện tại
  useEffect(() => {
    let isMounted = true;
    podcastService.getManifest(book.id).then((data) => {
      if (isMounted && data && data.chapters && data.chapters.length > 0) {
        setManifest(data);
        setCurrentChapterIndex(0);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [book.id]);

  const currentChapter: ChapterTrack | undefined = manifest?.chapters?.[currentChapterIndex];

  // Cập nhật audio source khi đổi chương
  useEffect(() => {
    if (!audioRef.current) return;
    if (currentChapter?.audio_url) {
      setLoadingAudio(true);
      audioRef.current.src = currentChapter.audio_url;
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
    }
  }, [currentChapter?.audio_url]);

  // Điều khiển Play / Pause
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Playback error:', err);
        setIsPlaying(false);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    setLoadingAudio(false);
    if (audioRef.current) {
      setDuration(audioRef.current.duration || currentChapter?.duration_seconds || 0);
    }
  };

  const handleEnded = () => {
    // Tự động chuyển chương kế tiếp
    if (manifest && currentChapterIndex < manifest.chapters.length - 1) {
      setCurrentChapterIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioRef.current || duration === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const seekRatio = Math.max(0, Math.min(1, clickX / width));
    const newTime = seekRatio * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMute = !isMuted;
    setIsMuted(newMute);
    audioRef.current.muted = newMute;
  };

  const cyclePlaybackRate = () => {
    const rates = [1.0, 1.25, 1.5, 1.75, 2.0];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const newRate = rates[nextIdx];
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const nextChapter = () => {
    if (manifest && currentChapterIndex < manifest.chapters.length - 1) {
      setCurrentChapterIndex(prev => prev + 1);
    }
  };

  const prevChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(prev => prev - 1);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[95%] sm:w-[650px] select-none pointer-events-auto transition-all duration-300">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      {/* Danh sách chương (Playlist Popover) */}
      {showPlaylist && manifest && (
        <div className="mb-2 bg-[#1c261e] border border-[#3b4d3e] text-[#eef2ef] rounded-2xl p-4 shadow-2xl backdrop-blur-md max-h-64 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-[#2d3a2f] mb-2">
            <span className="font-serif font-bold text-sm tracking-wide text-[#b5c7b7] flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#8fa792]" />
              Danh sách chương ({manifest.chapters.length})
            </span>
            <button 
              onClick={() => setShowPlaylist(false)}
              className="text-[#8fa792] hover:text-white p-1 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            {manifest.chapters.map((ch, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentChapterIndex(idx);
                  setShowPlaylist(false);
                  setIsPlaying(true);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                  idx === currentChapterIndex
                    ? 'bg-[#324534] text-white font-semibold'
                    : 'text-[#a3b8a6] hover:bg-[#253227] hover:text-white'
                }`}
              >
                <span className="truncate pr-2">
                  {idx + 1}. {ch.title}
                </span>
                <span className="font-mono text-[11px] text-[#7d9380] shrink-0">
                  {ch.duration_formatted}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* The Atelier Floating Pill Player */}
      <div className="bg-[#94a596] border border-[#a6b7a8] text-[#1c261e] rounded-full px-4 sm:px-6 py-2.5 shadow-[0_14px_36px_rgba(0,0,0,0.38)] flex items-center justify-between gap-3 sm:gap-5">
        
        {/* Left: Playlist Menu & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button 
            onClick={() => setShowPlaylist(!showPlaylist)}
            className={`p-1.5 rounded-full transition-colors ${showPlaylist ? 'bg-[#7d8f7f] text-black' : 'text-[#1c261e] hover:text-black'}`}
            title="Danh sách chương podcast"
          >
            <ListMusic className="w-4 h-4" />
          </button>

          <button
            onClick={prevChapter}
            disabled={currentChapterIndex === 0}
            className="text-[#1c261e] hover:text-black disabled:opacity-30 transition-transform active:scale-90"
            title="Chương trước"
          >
            <SkipBack className="w-3.5 h-3.5 fill-current" />
          </button>

          <button
            onClick={togglePlayPause}
            className="w-8 h-8 rounded-full bg-[#1c261e] text-[#94a596] hover:bg-black hover:text-white flex items-center justify-center transition-transform active:scale-95 shadow-sm"
            title={isPlaying ? 'Tạm dừng' : 'Phát podcast'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={nextChapter}
            disabled={!manifest || currentChapterIndex >= manifest.chapters.length - 1}
            className="text-[#1c261e] hover:text-black disabled:opacity-30 transition-transform active:scale-90"
            title="Chương sau"
          >
            <SkipForward className="w-3.5 h-3.5 fill-current" />
          </button>

          <button 
            onClick={toggleMute}
            className="text-[#1c261e] hover:text-black transition-colors hidden sm:inline-flex p-1"
            title="Âm lượng"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-800" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Center: Title & Scrubber Line */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0">
          <div className="text-center truncate w-full mb-1 flex items-center justify-center gap-1.5">
            <span className="font-sans font-extrabold text-[10px] sm:text-xs text-[#1c261e] tracking-wide truncate">
              {currentChapter ? `TẬP ${currentChapter.chapter_index}: ${currentChapter.title.toUpperCase()}` : `AURORA PODCAST | ${book.title}`}
            </span>
          </div>

          {/* Interactive Progress Bar */}
          <div 
            ref={progressBarRef}
            onClick={handleSeek}
            className="w-full max-w-xs h-[5px] bg-[#7a8c7c] hover:h-[7px] transition-all rounded-full overflow-hidden relative cursor-pointer group"
            title="Tua âm thanh"
          >
            <div 
              className="h-full bg-[#1c261e] rounded-full transition-all duration-100 group-hover:bg-black"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right: Rate, Timestamp & Close */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Tốc độ đọc */}
          <button
            onClick={cyclePlaybackRate}
            className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#849586] hover:bg-[#728374] text-[#1c261e] transition-colors"
            title="Thay đổi tốc độ phát"
          >
            {playbackRate}x
          </button>

          <span className="font-mono font-medium text-[11px] sm:text-xs text-[#1c261e]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {onClose && (
            <button
              onClick={onClose}
              className="text-[#1c261e] hover:text-black p-1 hover:bg-[#849586] rounded-full transition-colors"
              title="Đóng trình phát podcast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
