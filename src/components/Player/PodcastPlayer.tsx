import React, { useState, useEffect, useRef } from 'react';
import { TTSState, Book } from '../../types';
import { ttsService } from '../../services/ttsService';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  ChevronUp, 
  ChevronDown, 
  Moon, 
  Clock, 
  Gauge, 
  Check, 
  Mic2,
  Sparkles,
  BookOpen,
  Sliders,
  Radio,
  Repeat
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  // Load available system voices
  useEffect(() => {
    const updateVoices = () => {
      const voices = ttsService.getVoices();
      setAvailableVoices(voices);
    };
    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Auto-scroll transcript when sentence changes
  useEffect(() => {
    if (isExpanded && transcriptContainerRef.current) {
      const activeEl = transcriptContainerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [ttsState.currentSentenceIndex, isExpanded]);

  const currentSentenceText = ttsState.sentences[ttsState.currentSentenceIndex] || '';

  const formatCountdown = (secs: number | null) => {
    if (secs === null || secs <= 0) return '';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const speeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  const sleepTimers = [
    { label: 'Tắt hẹn giờ', minutes: null },
    { label: '5 phút', minutes: 5 },
    { label: '15 phút', minutes: 15 },
    { label: '30 phút', minutes: 30 },
    { label: '45 phút', minutes: 45 },
    { label: '60 phút', minutes: 60 },
  ];

  return (
    <>
      {/* ================= STICKY BOTTOM MINI PLAYER ================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800/90 backdrop-blur-xl shadow-2xl transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          
          {/* Left: Cover & Info & Waveform */}
          <div 
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-3 min-w-0 cursor-pointer group flex-1"
          >
            {/* Cover art or placeholder */}
            <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/80 shrink-0 shadow-md">
              {book.coverDataUrl ? (
                <img src={book.coverDataUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-indigo-950/60">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                </div>
              )}
              {/* Equalizer animation when speaking */}
              {ttsState.isPlaying && !ttsState.isPaused && (
                <div className="absolute inset-0 bg-indigo-950/70 flex items-center justify-center gap-0.5">
                  <span className="w-1 h-3 bg-indigo-400 rounded-full audio-bar-1" />
                  <span className="w-1 h-4 bg-indigo-300 rounded-full audio-bar-2" />
                  <span className="w-1 h-2 bg-indigo-400 rounded-full audio-bar-3" />
                  <span className="w-1 h-4 bg-indigo-300 rounded-full audio-bar-4" />
                </div>
              )}
            </div>

            {/* Text details */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-100 truncate group-hover:text-indigo-300 transition-colors">
                  {book.title}
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 shrink-0 border border-indigo-500/30">
                  Trang {ttsState.currentPage}
                </span>
                {ttsState.engineMode === 'ai_natural' ? (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0 hidden sm:inline-flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Giọng AI
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300 shrink-0 hidden sm:inline-flex">
                    Giọng Máy
                  </span>
                )}
                {ttsState.sleepTimerRemainingSeconds !== null && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 shrink-0 flex items-center gap-1">
                    <Moon className="w-2.5 h-2.5" />
                    {formatCountdown(ttsState.sleepTimerRemainingSeconds)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md md:max-w-lg mt-0.5">
                {currentSentenceText || 'Bấm Play để tự động phát âm thanh podcast...'}
              </p>
            </div>
          </div>

          {/* Center & Right: Player controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Rewind 15s */}
            <button
              onClick={() => ttsService.skipSeconds(-15)}
              className="p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer hidden sm:flex"
              title="Tua lùi 15s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Prev Sentence */}
            <button
              onClick={() => ttsService.prevSentence()}
              className="p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Câu trước"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Main Play / Pause */}
            <button
              onClick={() => ttsService.togglePlayPause()}
              className="p-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
              title={ttsState.isPlaying && !ttsState.isPaused ? 'Tạm dừng' : 'Phát âm thanh'}
            >
              {ttsState.isPlaying && !ttsState.isPaused ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Next Sentence */}
            <button
              onClick={() => ttsService.nextSentence()}
              className="p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Câu tiếp theo"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Forward 15s */}
            <button
              onClick={() => ttsService.skipSeconds(15)}
              className="p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer hidden sm:flex"
              title="Tua tới 15s"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Speed Badge */}
            <button
              onClick={() => {
                const nextSpeed = speeds[(speeds.indexOf(ttsState.rate) + 1) % speeds.length];
                ttsService.setRate(nextSpeed);
              }}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-indigo-400 border border-slate-700 transition-colors cursor-pointer"
              title="Thay đổi tốc độ đọc"
            >
              {ttsState.rate}x
            </button>

            {/* Expand Full Player Button */}
            <button
              onClick={() => setIsExpanded(true)}
              className="p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Mở toàn màn hình podcast"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= FULLSCREEN EXPANDED PODCAST MODAL ================= */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
          
          {/* Top Bar */}
          <div className="max-w-4xl w-full mx-auto px-4 py-3 flex items-center justify-between border-b border-slate-800/80">
            <button
              onClick={() => setIsExpanded(false)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
              <span>Thu nhỏ</span>
            </button>

            {/* Mode Switcher Pills: AI Natural Voice vs System Voice */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => ttsService.setEngineMode('ai_natural')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  ttsState.engineMode === 'ai_natural'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Giọng đọc AI tự nhiên, mượt mà chuẩn phát thanh viên"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Giọng AI Tự Nhiên</span>
              </button>
              <button
                onClick={() => ttsService.setEngineMode('system')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  ttsState.engineMode === 'system'
                    ? 'bg-slate-700 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Giọng máy của thiết bị (Offline)"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Giọng Thiết Bị</span>
              </button>
            </div>

            {/* Sleep Timer Quick Action */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSleepMenu(!showSleepMenu)}
                className={`p-2 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                  ttsState.sleepTimerRemainingSeconds !== null
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
                title="Hẹn giờ tắt nghe"
              >
                <Moon className="w-4 h-4" />
                {ttsState.sleepTimerRemainingSeconds !== null && (
                  <span className="text-[10px] font-semibold">
                    {formatCountdown(ttsState.sleepTimerRemainingSeconds)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Center Body: Split between Cover Art & Scrolling Karaoke Transcript */}
          <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden">
            
            {/* Left Column: Big Album Cover & Status (5 cols) */}
            <div className="md:col-span-5 flex flex-col items-center justify-center text-center">
              <div className="relative aspect-[3/4] w-48 sm:w-56 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80 group">
                {book.coverDataUrl ? (
                  <img src={book.coverDataUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-indigo-950 to-slate-900 text-indigo-300">
                    <BookOpen className="w-16 h-16 text-indigo-400/80 mb-3" />
                    <span className="text-xs font-bold text-white line-clamp-3">{book.title}</span>
                  </div>
                )}
                {/* Glowing ring when active */}
                {ttsState.isPlaying && !ttsState.isPaused && (
                  <div className="absolute inset-0 rounded-2xl ring-4 ring-indigo-500/50 animate-pulse pointer-events-none" />
                )}
              </div>

              <h3 className="text-base sm:text-lg font-bold text-white mt-4 line-clamp-2 px-2">
                {book.title}
              </h3>
              
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-indigo-400 font-semibold">
                  Trang {ttsState.currentPage} / {book.totalPages}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[11px] text-slate-400">
                  Câu {ttsState.currentSentenceIndex + 1} / {ttsState.sentences.length || 1}
                </span>
              </div>

              {/* Continuous Reading Switch */}
              <button
                onClick={() => ttsService.toggleContinuousBookMode()}
                className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  ttsState.continuousBookMode
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
                title="Tự động đọc xuyên suốt qua các trang cho đến hết sách"
              >
                <Repeat className={`w-3.5 h-3.5 ${ttsState.continuousBookMode ? 'text-indigo-400' : ''}`} />
                <span>{ttsState.continuousBookMode ? 'Tự động đọc hết cuốn sách' : 'Chỉ đọc trang hiện tại'}</span>
              </button>
            </div>

            {/* Right Column: Interactive Karaoke Transcript (7 cols) */}
            <div className="md:col-span-7 flex flex-col bg-slate-900/60 rounded-3xl border border-slate-800/80 p-4 sm:p-5 overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Bản ghi phụ đề ngữ nghĩa (Transcript)
                </span>
                <span className="text-[11px] text-slate-400">
                  Bấm vào câu để nghe ngay
                </span>
              </div>

              {/* Scrollable sentences */}
              <div 
                ref={transcriptContainerRef}
                className="flex-1 overflow-y-auto py-3 space-y-2 pr-1"
              >
                {ttsState.sentences.length > 0 ? (
                  ttsState.sentences.map((sent, idx) => {
                    const isActive = idx === ttsState.currentSentenceIndex;
                    return (
                      <div
                        key={idx}
                        data-active={isActive ? 'true' : 'false'}
                        onClick={() => ttsService.seekSentence(idx)}
                        className={`p-3 rounded-2xl transition-all cursor-pointer text-xs sm:text-sm leading-relaxed ${
                          isActive
                            ? 'bg-indigo-600/30 border border-indigo-500/60 text-white font-medium shadow-lg shadow-indigo-500/10'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                            isActive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="flex-1">{sent}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    Không tìm thấy văn bản trên trang này.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Controls Panel */}
          <div className="max-w-4xl w-full mx-auto px-4 py-4 border-t border-slate-800/90 bg-slate-950/80">
            {/* Sentence Timeline Scrubber */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mb-1.5">
                <span>Câu {ttsState.currentSentenceIndex + 1}</span>
                <span>Tổng {ttsState.sentences.length} câu</span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0, ttsState.sentences.length - 1)}
                value={ttsState.currentSentenceIndex}
                onChange={(e) => ttsService.seekSentence(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Buttons Row */}
            <div className="flex items-center justify-between gap-4">
              {/* Voice Selector button (active when in system mode) */}
              <div className="relative">
                {ttsState.engineMode === 'system' ? (
                  <>
                    <button
                      onClick={() => setShowVoiceMenu(!showVoiceMenu)}
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-800 transition-colors cursor-pointer"
                      title="Chọn giọng đọc thiết bị"
                    >
                      <Mic2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="hidden sm:inline">Giọng đọc</span>
                    </button>

                    {showVoiceMenu && (
                      <div className="absolute bottom-12 left-0 w-64 max-h-60 overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl z-50 text-xs">
                        <p className="px-2 py-1 text-[11px] font-semibold text-slate-400 border-b border-slate-800 mb-1">
                          Giọng đọc có sẵn trên máy:
                        </p>
                        {availableVoices.map((v) => (
                          <button
                            key={v.voiceURI}
                            onClick={() => {
                              ttsService.setVoice(v.voiceURI);
                              setShowVoiceMenu(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between hover:bg-slate-800 transition-colors ${
                              ttsState.voiceURI === v.voiceURI ? 'text-indigo-400 font-semibold' : 'text-slate-300'
                            }`}
                          >
                            <span className="truncate">{v.name} ({v.lang})</span>
                            {ttsState.voiceURI === v.voiceURI && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="px-3 py-2 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span className="hidden sm:inline">AI Phát Thanh Viên</span>
                  </div>
                )}
              </div>

              {/* Main Playback Controls */}
              <div className="flex items-center gap-3 sm:gap-4">
                <button
                  onClick={() => ttsService.skipSeconds(-15)}
                  className="p-2.5 text-slate-300 hover:text-white rounded-full hover:bg-slate-900 transition-all cursor-pointer"
                  title="Tua lại 15 giây"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  onClick={() => ttsService.prevSentence()}
                  className="p-2.5 text-slate-300 hover:text-white rounded-full hover:bg-slate-900 transition-all cursor-pointer"
                  title="Câu trước"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                <button
                  onClick={() => ttsService.togglePlayPause()}
                  className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/40 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                  title={ttsState.isPlaying && !ttsState.isPaused ? 'Tạm dừng' : 'Phát podcast'}
                >
                  {ttsState.isPlaying && !ttsState.isPaused ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={() => ttsService.nextSentence()}
                  className="p-2.5 text-slate-300 hover:text-white rounded-full hover:bg-slate-900 transition-all cursor-pointer"
                  title="Câu tiếp theo"
                >
                  <SkipForward className="w-5 h-5" />
                </button>

                <button
                  onClick={() => ttsService.skipSeconds(15)}
                  className="p-2.5 text-slate-300 hover:text-white rounded-full hover:bg-slate-900 transition-all cursor-pointer"
                  title="Tua tới 15 giây"
                >
                  <RotateCw className="w-5 h-5" />
                </button>
              </div>

              {/* Speed Controller button */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-400 text-xs font-semibold flex items-center gap-1.5 border border-slate-800 transition-colors cursor-pointer"
                  title="Tốc độ đọc"
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>{ttsState.rate}x</span>
                </button>

                {/* Speed Menu Dropdown */}
                {showSpeedMenu && (
                  <div className="absolute bottom-12 right-0 w-32 bg-slate-900 border border-slate-700 rounded-2xl p-1.5 shadow-2xl z-50 text-xs">
                    {speeds.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          ttsService.setRate(s);
                          setShowSpeedMenu(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between hover:bg-slate-800 transition-colors ${
                          ttsState.rate === s ? 'text-indigo-400 font-semibold' : 'text-slate-300'
                        }`}
                      >
                        <span>{s}x</span>
                        {ttsState.rate === s && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sleep Timer Menu Modal */}
            {showSleepMenu && (
              <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-xs w-full shadow-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                      <Moon className="w-4 h-4 text-amber-400" />
                      <span>Hẹn giờ tắt đọc (Sleep Timer)</span>
                    </h4>
                  </div>
                  <div className="space-y-1">
                    {sleepTimers.map((st) => (
                      <button
                        key={st.label}
                        onClick={() => {
                          ttsService.setSleepTimer(st.minutes);
                          setShowSleepMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors"
                      >
                        <span>{st.label}</span>
                        {ttsState.sleepTimerMinutes === st.minutes && (
                          <Check className="w-3.5 h-3.5 text-amber-400" />
                        )}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowSleepMenu(false)}
                    className="w-full mt-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
};
