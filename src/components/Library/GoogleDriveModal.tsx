import React, { useState, useRef } from 'react';
import { 
  X, 
  Link, 
  Download, 
  Loader2, 
  AlertCircle, 
  FolderOpen,
  Sparkles,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  Key
} from 'lucide-react';
import { googleDriveService } from '../../services/googleDriveService';
import { loadSyncConfig, saveSyncConfig } from '../../services/supabaseClient';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPdfDownloaded: (fileData: ArrayBuffer, fileName: string) => Promise<void>;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  onPdfDownloaded,
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'native_cloud'>('url');
  const [driveUrl, setDriveUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Hidden native file input for cloud browsing
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Developer settings (hidden)
  const [devClicks, setDevClicks] = useState(0);
  const [showDevConfig, setShowDevConfig] = useState(false);
  const config = loadSyncConfig();
  const [clientId, setClientId] = useState(config.googleClientId || '');
  const [apiKey, setApiKey] = useState(config.googleApiKey || '');

  if (!isOpen) return null;

  // 1. Download via Direct Public URL
  const handleDownloadFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveUrl.trim()) {
      setError('Vui lòng dán link file PDF trên Google Drive.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStep('Đang kết nối Google Drive & tải file...');

    try {
      const { arrayBuffer, name } = await googleDriveService.downloadFromPublicUrl(driveUrl.trim());
      setLoadingStep('Đang xử lý thông tin sách...');
      await onPdfDownloaded(arrayBuffer, name);
      onClose();
    } catch (err: any) {
      console.error('Google Drive URL import failed:', err);
      setError(err?.message || 'Không thể tải file từ liên kết này. Hãy đảm bảo file đã bật quyền "Bất kỳ ai có đường liên kết đều có thể xem".');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // 2. Native Cloud & Drive file selection
  const handleDeviceFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setError('Vui lòng chọn tệp định dạng PDF.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStep(`Đang nạp file "${file.name}"...`);

    try {
      const buffer = await file.arrayBuffer();
      await onPdfDownloaded(buffer, file.name);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Không thể đọc tệp PDF đã chọn.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 3. Optional OAuth Picker (if SaaS has credentials configured in env)
  const handleOpenOAuthPicker = async () => {
    const activeClientId = clientId || (import.meta.env.VITE_GOOGLE_CLIENT_ID as string);
    const activeApiKey = apiKey || (import.meta.env.VITE_GOOGLE_API_KEY as string);

    if (!activeClientId) {
      setError('Tính năng đăng nhập Google OAuth trực tiếp đang được nâng cấp. Bạn hãy dùng cách Dán link hoặc Chọn file từ Google Drive của máy nhé!');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStep('Đang mở hộp thoại Google Drive...');

    try {
      const result = await googleDriveService.openPicker(activeClientId, activeApiKey);
      setLoadingStep(`Đã chọn "${result.name}". Đang nạp sách...`);
      await onPdfDownloaded(result.arrayBuffer, result.name);
      onClose();
    } catch (err: any) {
      if (err?.message?.includes('hủy chọn file')) return;
      console.error('Google Picker error:', err);
      setError(err?.message || 'Lỗi khi kết nối Google Drive.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleVersionClick = () => {
    const next = devClicks + 1;
    setDevClicks(next);
    if (next >= 5) {
      setShowDevConfig(prev => !prev);
      setDevClicks(0);
    }
  };

  const handleSaveDevCredentials = () => {
    saveSyncConfig({ googleClientId: clientId.trim(), googleApiKey: apiKey.trim() });
    setShowDevConfig(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-sans select-none">
      <div 
        className="bg-[#12151c] border border-[#252834] text-stone-200 rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Sheet Drag Handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center bg-[#0e1014]/60">
          <div className="w-10 h-1 bg-stone-700/60 rounded-full" />
        </div>

        {/* Hidden Native File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleDeviceFileSelect}
          accept="application/pdf,.pdf"
          className="hidden"
        />

        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#20232e] bg-[#0e1014]/60">
          <div className="flex items-center gap-3 min-w-0">
            {/* Google Drive Logo Icon */}
            <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-[#181a22] border border-[#252834] flex items-center justify-center shadow-sm shrink-0">
              <svg className="w-4.5 sm:w-5 h-4.5 sm:h-5" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z" fill="#ea4335"/>
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-serif font-bold text-white truncate">
                Nhập sách từ Google Drive
              </h2>
              <p className="text-[11px] sm:text-xs text-stone-400 font-sans truncate hidden sm:block">
                Thêm sách PDF từ Google Drive hoặc Tệp đám mây vào tủ sách
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg text-stone-400 hover:text-white hover:bg-[#1c202a] transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= TABS ================= */}
        <div className="flex border-b border-[#20232e] bg-[#0c0e12]/40 px-3 sm:px-6 pt-1 sm:pt-2 gap-2">
          <button
            onClick={() => setActiveTab('url')}
            className={`pb-2.5 sm:pb-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap flex-1 ${
              activeTab === 'url'
                ? 'border-[#b2532a] text-[#c97a3e]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Link className="w-3.5 h-3.5 shrink-0" />
            <span>Dán link Google Drive</span>
          </button>

          <button
            onClick={() => setActiveTab('native_cloud')}
            className={`pb-2.5 sm:pb-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap flex-1 ${
              activeTab === 'native_cloud'
                ? 'border-[#b2532a] text-[#c97a3e]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 shrink-0" />
            <span>Chọn từ Tệp của máy</span>
          </button>
        </div>

        {/* ================= BODY ================= */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 text-sm">
          
          {/* TAB 1: DÁN ĐƯỜNG DẪN GOOGLE DRIVE */}
          {activeTab === 'url' && (
            <form onSubmit={handleDownloadFromUrl} className="space-y-4 animate-in fade-in duration-150">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-300">
                  Dán đường dẫn chia sẻ file PDF trên Google Drive:
                </label>
                <input
                  type="url"
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/1xxxxxx/view?usp=sharing"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e1014] border border-[#252834] text-white text-xs font-mono placeholder:font-sans placeholder:text-stone-600 focus:outline-none focus:border-[#b2532a]"
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              {/* Friendly Guide */}
              <div className="p-3.5 rounded-2xl bg-[#161822] border border-[#252834] text-xs text-stone-300 space-y-2">
                <p className="font-semibold text-white flex items-center gap-1.5 text-xs">
                  <HelpCircle className="w-4 h-4 text-[#c97a3e]" />
                  Hướng dẫn lấy link trong 3 giây:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-stone-400 text-[11px] leading-relaxed">
                  <li>Mở file PDF trên ứng dụng hoặc web Google Drive của bạn.</li>
                  <li>Chọn <strong>Chia sẻ (Share)</strong> &rarr; Đổi quyền thành <strong>"Bất kỳ ai có đường liên kết" (Anyone with the link)</strong>.</li>
                  <li>Bấm <strong>Sao chép liên kết</strong> và dán vào ô bên trên.</li>
                </ol>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/50 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !driveUrl.trim()}
                className="w-full py-3 rounded-xl bg-[#b2532a] hover:bg-[#9c441f] disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{loadingStep || 'Đang tải sách về...'}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Tải về & Mở sách ngay</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: CHỌN TỪ TỆP CỦA MÁY / GOOGLE DRIVE CÓ SẴN */}
          {activeTab === 'native_cloud' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-[#161822] border border-[#252834] space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[#4ade80] font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Cách nhanh nhất và không cần link</span>
                </div>
                <p className="text-stone-300 leading-relaxed text-[11px]">
                  Trên điện thoại (iOS / Android) và máy tính, trình quản lý <strong>Tệp (Files)</strong> đã tích hợp sẵn tài khoản Google Drive, iCloud và OneDrive của bạn.
                </p>
                <p className="text-stone-400 text-[11px]">
                  Bấm nút bên dưới để chọn trực tiếp bất kỳ cuốn sách PDF nào từ thư mục Google Drive của bạn.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/50 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-[#b2532a] hover:bg-[#9c441f] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                <span>📂 Mở Tệp trên máy / Google Drive</span>
              </button>

              {/* Optional 1-Click Google OAuth Picker */}
              {(config.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID) && (
                <div className="pt-2 border-t border-[#1e222e] text-center">
                  <button
                    onClick={handleOpenOAuthPicker}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Hoặc đăng nhập tài khoản Google Drive qua web picker</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= SECRET DEVELOPER OPTIONS ================= */}
          {showDevConfig && (
            <div className="p-4 rounded-2xl bg-[#141010] border border-amber-900/40 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-1 border-b border-amber-900/30">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  Google API Developer Config
                </span>
                <button
                  onClick={() => setShowDevConfig(false)}
                  className="text-stone-500 hover:text-stone-300 text-xs"
                >
                  Đóng
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[11px] text-stone-400">Google OAuth Client ID:</label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#0e1014] border border-[#2b2e3c] text-stone-200 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-stone-400">Google API Key:</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#0e1014] border border-[#2b2e3c] text-stone-200 font-mono text-xs"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveDevCredentials}
                className="px-3 py-1.5 rounded-lg bg-[#b2532a] text-xs text-white hover:bg-[#9c441f]"
              >
                Lưu cấu hình
              </button>
            </div>
          )}

        </div>

        {/* ================= FOOTER ================= */}
        <div className="px-6 py-2.5 bg-[#0a0c10] border-t border-[#1a1d24] flex items-center justify-between text-[11px] text-stone-500">
          <span 
            onClick={handleVersionClick}
            className="cursor-pointer hover:text-stone-400 transition-colors"
            title="Nhấn 5 lần để mở tùy chọn nhà phát triển"
          >
            Google Drive Importer v1.2.0
          </span>
          <span className="font-serif italic text-stone-600">
            Hỗ trợ tất cả định dạng PDF
          </span>
        </div>

      </div>
    </div>
  );
};
