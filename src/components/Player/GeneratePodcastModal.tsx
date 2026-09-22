import React, { useState, useEffect } from 'react';
import { Book } from '../../types';
import { podcastService, Speaker, JobStatus } from '../../services/podcastService';
import { 
  Radio, 
  Sparkles, 
  Music, 
  X, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Headphones,
  Sliders
} from 'lucide-react';

interface GeneratePodcastModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  onPodcastReady: () => void;
}

export const GeneratePodcastModal: React.FC<GeneratePodcastModalProps> = ({
  book,
  isOpen,
  onClose,
  onPodcastReady
}) => {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('NF');
  const [enableBgm, setEnableBgm] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      podcastService.getSpeakers().then(data => {
        setSpeakers(data);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartGeneration = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      // Bắt đầu job trên Local FastAPI Worker
      const { job_id } = await podcastService.startConversion(
        null,
        book.id,
        selectedSpeaker,
        enableBgm
      );

      // Polling tiến độ
      await podcastService.pollUntilComplete(job_id, (status) => {
        setJobStatus(status);
      });

      onPodcastReady();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Không thể kết nối đến Podcast Worker (127.0.0.1:8765). Vui lòng đảm bảo server python đang chạy.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1c261e] border border-[#3b4d3e] text-[#eef2ef] rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-[0_24px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2d3a2f] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#94a596]/15 border border-[#94a596]/30 flex items-center justify-center text-[#94a596]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-white">
                Tạo Audio Podcast AI
              </h3>
              <p className="text-xs text-[#8fa792] truncate max-w-[280px]">
                {book.title}
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="text-[#8fa792] hover:text-white p-1.5 rounded-full hover:bg-[#253227] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Trạng thái đang xử lý (Progress State) */}
        {isProcessing ? (
          <div className="py-6 flex flex-col items-center text-center">
            {jobStatus?.status === 'completed' ? (
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            ) : (
              <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-[#94a596] animate-spin" />
                <Headphones className="w-5 h-5 text-[#94a596] absolute" />
              </div>
            )}

            <h4 className="font-serif font-bold text-base text-white mb-1">
              {jobStatus?.status === 'completed'
                ? 'Podcast đã sẵn sàng!'
                : jobStatus?.message || 'Đang phân tích cấu trúc sách...'}
            </h4>

            <p className="text-xs text-[#8fa792] mb-6">
              {jobStatus?.stage ? `Giai đoạn: ${jobStatus.stage}` : 'Đang xử lý trên động cơ Valtec-TTS & PyMuPDF...'}
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-[#253227] h-3 rounded-full overflow-hidden mb-3 border border-[#3b4d3e]">
              <div
                className="bg-[#94a596] h-full transition-all duration-300 rounded-full"
                style={{ width: `${jobStatus?.percent || 10}%` }}
              />
            </div>
            <span className="font-mono text-xs font-semibold text-[#b5c7b7]">
              {jobStatus?.percent || 10}%
            </span>

            {jobStatus?.status === 'completed' && (
              <button
                onClick={() => {
                  onClose();
                  onPodcastReady();
                }}
                className="mt-6 w-full py-3 bg-[#94a596] hover:bg-[#a6b7a8] text-[#1c261e] font-sans font-bold text-sm rounded-xl transition-all shadow-lg active:scale-[0.98]"
              >
                Mở Trình Phát Podcast Ngay
              </button>
            )}
          </div>
        ) : (
          /* Form cấu hình trước khi chạy */
          <div className="space-y-5">
            {/* Lỗi nếu có */}
            {errorMessage && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Chọn giọng đọc Valtec-TTS */}
            <div>
              <label className="block text-xs font-semibold text-[#8fa792] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Chọn Giọng Đọc (Valtec-TTS Tiếng Việt)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {speakers.map((spk) => (
                  <button
                    key={spk.id}
                    onClick={() => setSelectedSpeaker(spk.id)}
                    type="button"
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedSpeaker === spk.id
                        ? 'border-[#94a596] bg-[#253227] text-white shadow-sm'
                        : 'border-[#2d3a2f] bg-[#162018]/60 text-[#a3b8a6] hover:border-[#3b4d3e]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-sans font-bold text-xs">
                        {spk.name}
                      </span>
                      {selectedSpeaker === spk.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#94a596]" />
                      )}
                    </div>
                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-[#1c261e] border border-[#2d3a2f] text-[#8fa792]">
                      {spk.region === 'north' ? 'Miền Bắc' : 'Miền Nam'} • {spk.gender === 'female' ? 'Nữ' : 'Nam'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tùy chọn Nhạc nền (BGM) Ducking */}
            <div className="p-3.5 bg-[#162018]/60 border border-[#2d3a2f] rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#94a596]/10 text-[#94a596]">
                  <Music className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    Nhạc nền Ambient & Hiệu ứng Intro
                  </div>
                  <div className="text-[11px] text-[#8fa792]">
                    Tự động hạ âm lượng nhạc (-22dB) khi có giọng đọc
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={enableBgm}
                onChange={(e) => setEnableBgm(e.target.checked)}
                className="w-4 h-4 accent-[#94a596] cursor-pointer"
              />
            </div>

            {/* Nút thực thi */}
            <button
              onClick={handleStartGeneration}
              className="w-full py-3.5 bg-[#94a596] hover:bg-[#a6b7a8] text-[#1c261e] font-sans font-extrabold text-sm rounded-xl transition-all shadow-[0_8px_20px_rgba(148,165,150,0.25)] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Bắt Đầu Tạo Audio Podcast
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
