import React, { useState, useEffect, useRef } from 'react';
import { Book } from '../../types';
import { podcastService, Speaker, JobStatus } from '../../services/podcastService';
import { StorageService } from '../../services/storage';
import { PdfService } from '../../services/pdfService';
import { 
  Radio, 
  Sparkles, 
  Music, 
  X, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Headphones,
  Sliders,
  UploadCloud,
  FileText,
  FileUp,
  RefreshCw,
  Play
} from 'lucide-react';

interface GeneratePodcastModalProps {
  book?: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onPodcastReady: (book: Book) => void;
  initialFile?: File | null;
}

export const GeneratePodcastModal: React.FC<GeneratePodcastModalProps> = ({
  book,
  isOpen,
  onClose,
  onPodcastReady,
  initialFile = null
}) => {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('NF');
  const [enableBgm, setEnableBgm] = useState<boolean>(true);
  
  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile);
  const [podcastTitle, setPodcastTitle] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedBook, setCompletedBook] = useState<Book | null>(null);

  useEffect(() => {
    if (isOpen) {
      podcastService.getSpeakers().then(data => {
        setSpeakers(data);
      });

      if (initialFile) {
        setSelectedFile(initialFile);
        const nameWithoutExt = initialFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setPodcastTitle(nameWithoutExt);
      } else if (book) {
        setPodcastTitle(book.title);
        setSelectedFile(null);
      } else {
        setSelectedFile(null);
        setPodcastTitle('');
      }

      setIsProcessing(false);
      setJobStatus(null);
      setErrorMessage(null);
      setCompletedBook(null);
    }
  }, [isOpen, book, initialFile]);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('Chỉ chấp nhận file định dạng PDF (.pdf)');
      return;
    }
    setSelectedFile(file);
    setErrorMessage(null);
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setPodcastTitle(cleanTitle);
  };

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
    if (file) {
      handleFileChange(file);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleStartGeneration = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setJobStatus({
      job_id: '',
      book_id: '',
      status: 'pending',
      percent: 5,
      stage: 'INITIALIZING',
      message: 'Đang chuẩn bị dữ liệu và tài liệu PDF...'
    });

    try {
      let targetBook: Book;
      let pdfFileToSend: File | Blob | null = null;

      if (selectedFile) {
        // Trường hợp 1: User tải lên file PDF mới trực tiếp
        const arrayBuffer = await selectedFile.arrayBuffer();
        let totalPages = 1;
        let coverUrl: string | undefined = undefined;

        try {
          const doc = await PdfService.loadDocument(arrayBuffer);
          totalPages = doc.numPages;
          coverUrl = await PdfService.generateThumbnail(doc);
        } catch (pdfErr) {
          console.warn('Cannot parse PDF preview:', pdfErr);
        }

        const newBookId = `book_podcast_${Date.now()}`;
        const newBook: Book = {
          id: newBookId,
          title: podcastTitle.trim() || selectedFile.name.replace(/\.[^/.]+$/, ''),
          author: 'Audiobook AI',
          fileSize: selectedFile.size,
          totalPages: totalPages,
          currentPage: 1,
          addedAt: Date.now(),
          lastReadAt: Date.now(),
          coverDataUrl: coverUrl,
          isFavorite: false,
          source: 'local',
          syncStatus: 'local',
        };

        // Lưu vào Local Storage / IndexedDB của trình duyệt
        await StorageService.savePdfBinary(newBook.id, arrayBuffer);
        await StorageService.saveBook(newBook);
        targetBook = newBook;
        pdfFileToSend = selectedFile;

      } else if (book) {
        // Trường hợp 2: Chuyển đổi sách có sẵn trong thư viện
        targetBook = book;
        const binary = await StorageService.getPdfBinary(book.id);
        if (binary) {
          pdfFileToSend = new Blob([binary], { type: 'application/pdf' });
        } else if (book.id === 'sample_test_book') {
          // Backend sẽ dùng public/sample-book.pdf
          pdfFileToSend = null;
        } else {
          // Thử tìm trong public folder
          try {
            const res = await fetch('/sample-book.pdf');
            if (res.ok) {
              const buf = await res.arrayBuffer();
              pdfFileToSend = new Blob([buf], { type: 'application/pdf' });
            }
          } catch {}
        }
      } else {
        throw new Error('Vui lòng chọn hoặc kéo thả một file PDF để bắt đầu.');
      }

      // Khởi động job trên FastAPI Worker (cổng 8765)
      const { job_id } = await podcastService.startConversion(
        pdfFileToSend,
        targetBook.id,
        selectedSpeaker,
        enableBgm,
        podcastTitle.trim() || targetBook.title
      );

      // Polling tiến độ theo thời gian thực
      await podcastService.pollUntilComplete(job_id, (status) => {
        setJobStatus(status);
      });

      setCompletedBook(targetBook);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message || 'Không thể kết nối đến Podcast Worker (127.0.0.1:8765). Vui lòng đảm bảo server python đang chạy.'
      );
      setIsProcessing(false);
    }
  };

  const handleFinishAndPlay = () => {
    if (completedBook) {
      onPodcastReady(completedBook);
    } else if (book) {
      onPodcastReady(book);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#1c261e] border border-[#3b4d3e] text-[#eef2ef] rounded-3xl w-full max-w-xl p-6 sm:p-7 shadow-[0_24px_60px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2d3a2f] mb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#94a596]/15 border border-[#94a596]/30 flex items-center justify-center text-[#94a596]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-white">
                Chuyển Thể Sách PDF Sang Podcast
              </h3>
              <p className="text-xs text-[#8fa792]">
                Valtec-TTS Tiếng Việt • Phân tích chương & Ghép nhạc nền tự động
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="text-[#8fa792] hover:text-white p-1.5 rounded-full hover:bg-[#253227] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Trạng thái đang xử lý (Progress State) */}
        {isProcessing ? (
          <div className="py-8 flex flex-col items-center text-center my-auto overflow-y-auto">
            {jobStatus?.status === 'completed' ? (
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mb-5 animate-in zoom-in-75 duration-300">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            ) : (
              <div className="relative w-20 h-20 mb-5 flex items-center justify-center">
                <Loader2 className="w-16 h-16 text-[#94a596] animate-spin opacity-80" />
                <Headphones className="w-7 h-7 text-[#94a596] absolute" />
              </div>
            )}

            <h4 className="font-serif font-bold text-lg text-white mb-1.5">
              {jobStatus?.status === 'completed'
                ? 'Podcast Đã Sản Xuất Thành Công!'
                : jobStatus?.message || 'Đang xử lý nội dung sách...'}
            </h4>

            <p className="text-xs text-[#8fa792] mb-6 max-w-md">
              {jobStatus?.stage
                ? `Giai đoạn: [${jobStatus.stage}] • Động cơ Valtec-TTS & PyMuPDF`
                : 'Đang trích xuất nội dung văn bản và tách chương...'}
            </p>

            {/* Progress Bar Container */}
            <div className="w-full bg-[#141d16] h-3.5 rounded-full overflow-hidden mb-3 border border-[#2d3a2f] p-0.5">
              <div
                className="bg-gradient-to-r from-[#7a947d] to-[#b5c7b7] h-full transition-all duration-300 rounded-full"
                style={{ width: `${jobStatus?.percent || 5}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between w-full text-xs font-mono text-[#8fa792] px-1">
              <span>Tiến độ thực tế</span>
              <span className="font-bold text-[#b5c7b7]">{jobStatus?.percent || 5}%</span>
            </div>

            {jobStatus?.status === 'completed' && (
              <button
                onClick={handleFinishAndPlay}
                className="mt-8 w-full py-3.5 bg-[#94a596] hover:bg-[#a6b7a8] text-[#1c261e] font-sans font-bold text-sm rounded-2xl transition-all shadow-[0_10px_25px_rgba(148,165,150,0.3)] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Mở Trình Phát & Nghe Podcast Ngay
              </button>
            )}
          </div>
        ) : (
          /* Form cấu hình trước khi chạy */
          <div className="space-y-4 overflow-y-auto pr-1">
            {/* Lỗi nếu có */}
            {errorMessage && (
              <div className="p-3.5 bg-red-950/50 border border-red-800/70 rounded-2xl flex items-start gap-2.5 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* KHU VỰC TẢI LÊN PDF (Dropzone / File Selector) */}
            <div>
              <label className="block text-xs font-semibold text-[#8fa792] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Tài liệu PDF Nguồn
              </label>

              {selectedFile ? (
                /* File đã chọn */
                <div className="p-3.5 bg-[#253227] border border-[#3b4d3e] rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#94a596]/20 border border-[#94a596]/40 flex items-center justify-center text-[#94a596] shrink-0">
                      <FileUp className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate max-w-[260px] sm:max-w-[320px]">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-[#8fa792]">
                        {formatFileSize(selectedFile.size)} • PDF sẵn sàng xử lý
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-[#94a596] hover:text-white px-3 py-1.5 rounded-lg bg-[#1c261e] border border-[#3b4d3e] hover:border-[#94a596] transition-colors shrink-0 cursor-pointer"
                  >
                    Đổi file
                  </button>
                </div>
              ) : book ? (
                /* Đang dùng sách từ thư viện */
                <div className="p-3.5 bg-[#253227] border border-[#3b4d3e] rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#94a596]/20 border border-[#94a596]/40 flex items-center justify-center text-[#94a596] shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate max-w-[260px] sm:max-w-[320px]">
                        {book.title}
                      </p>
                      <p className="text-[11px] text-[#8fa792]">
                        {book.totalPages} trang • {book.author || 'Thư viện của bạn'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-[#94a596] hover:text-white px-3 py-1.5 rounded-lg bg-[#1c261e] border border-[#3b4d3e] hover:border-[#94a596] transition-colors shrink-0 cursor-pointer"
                  >
                    Tải PDF khác
                  </button>
                </div>
              ) : (
                /* Drag & Drop Zone khi chưa có file */
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                    isDragging
                      ? 'border-[#94a596] bg-[#94a596]/10 scale-[0.99]'
                      : 'border-[#3b4d3e] hover:border-[#94a596] bg-[#162018]/50 hover:bg-[#1a251c]'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#94a596]/15 border border-[#94a596]/30 flex items-center justify-center text-[#94a596] mb-1">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-white">
                    Kéo thả file PDF vào đây hoặc bấm để chọn tệp
                  </div>
                  <p className="text-[11px] text-[#8fa792] max-w-xs">
                    Hỗ trợ tài liệu PDF sách, tài liệu nghiên cứu, truyện ngắn (tự động loại bỏ header/footer)
                  </p>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileChange(f);
                }}
              />
            </div>

            {/* Tiêu đề Podcast tùy chỉnh */}
            <div>
              <label className="block text-xs font-semibold text-[#8fa792] uppercase tracking-wider mb-1.5">
                Tên Tập Podcast / Tựa Sách
              </label>
              <input
                type="text"
                value={podcastTitle}
                onChange={(e) => setPodcastTitle(e.target.value)}
                placeholder="Nhập tên podcast..."
                className="w-full px-3.5 py-2.5 bg-[#162018] border border-[#2d3a2f] focus:border-[#94a596] rounded-xl text-xs text-white placeholder-stone-500 outline-none transition-colors"
              />
            </div>

            {/* Chọn giọng đọc Valtec-TTS */}
            <div>
              <label className="block text-xs font-semibold text-[#8fa792] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Chọn Giọng Đọc (Valtec-TTS Tiếng Việt)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {speakers.map((spk) => (
                  <button
                    key={spk.id}
                    onClick={() => setSelectedSpeaker(spk.id)}
                    type="button"
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedSpeaker === spk.id
                        ? 'border-[#94a596] bg-[#253227] text-white shadow-sm ring-1 ring-[#94a596]/40'
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
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1c261e] border border-[#2d3a2f] text-[#8fa792]">
                        {spk.region === 'north' ? 'Miền Bắc' : 'Miền Nam'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1c261e] border border-[#2d3a2f] text-[#8fa792]">
                        {spk.gender === 'female' ? 'Nữ' : 'Nam'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tùy chọn Nhạc nền (BGM) Ducking */}
            <div className="p-3 bg-[#162018]/70 border border-[#2d3a2f] rounded-2xl flex items-center justify-between">
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
              disabled={!selectedFile && !book}
              className={`w-full py-3.5 font-sans font-extrabold text-sm rounded-xl transition-all shadow-[0_8px_20px_rgba(148,165,150,0.25)] flex items-center justify-center gap-2 cursor-pointer ${
                !selectedFile && !book
                  ? 'bg-[#253227] text-stone-500 cursor-not-allowed'
                  : 'bg-[#94a596] hover:bg-[#a6b7a8] text-[#1c261e] active:scale-[0.98]'
              }`}
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
