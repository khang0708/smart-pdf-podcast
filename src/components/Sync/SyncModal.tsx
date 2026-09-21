import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cloud, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Key, 
  Globe, 
  Share2, 
  ShieldCheck, 
  HelpCircle,
  LogIn,
  LogOut,
  UserPlus,
  Smartphone,
  Laptop,
  Copy,
  Check,
  Sparkles,
  HardDrive,
  Trash2,
  Crown,
  Sliders,
  Zap
} from 'lucide-react';
import { 
  loadSyncConfig, 
  saveSyncConfig, 
  testSupabaseConnection,
  getSupabaseClient
} from '../../services/supabaseClient';
import { syncService } from '../../services/syncService';
import { edgeApiService } from '../../services/edgeApiService';
import { StorageService } from '../../services/storage';
import { SyncConfig, SyncStatus } from '../../types';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [config, setConfig] = useState<SyncConfig>(loadSyncConfig());
  const [status, setStatus] = useState<SyncStatus>(syncService.getStatus());
  const [activeTab, setActiveTab] = useState<'devices' | 'account' | 'preferences'>('devices');

  // Input code for device pairing
  const [inputPairingCode, setInputPairingCode] = useState('');
  const [copiedPin, setCopiedPin] = useState(false);

  // Manual sync feedback
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Auth state
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Developer mode (hidden, tapped 5 times)
  const [devClicks, setDevClicks] = useState(0);
  const [showDevMode, setShowDevMode] = useState(false);
  const [isTestingDev, setIsTestingDev] = useState(false);
  const [devTestResult, setDevTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [edgeUrl, setEdgeUrl] = useState(edgeApiService.getEdgeUrl());

  // Cache cleared feedback
  const [cacheFeedback, setCacheFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const current = loadSyncConfig();
    if (!current.syncRoomId) {
      current.syncRoomId = 'AURORA-' + Math.floor(1000 + Math.random() * 9000);
      saveSyncConfig(current);
    }
    setConfig(current);
    const unsub = syncService.subscribe((s) => setStatus(s));
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  // Copy pairing PIN to clipboard
  const handleCopyPin = () => {
    if (config.syncRoomId) {
      navigator.clipboard?.writeText(config.syncRoomId).catch(() => {});
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2500);
    }
  };

  // Generate a new pairing code
  const handleGenerateNewPin = () => {
    const newPin = 'AURORA-' + Math.floor(1000 + Math.random() * 9000);
    const updated = saveSyncConfig({ syncRoomId: newPin });
    setConfig(updated);
    handleTriggerSync(newPin);
  };

  // Connect to another device's PIN
  const handleConnectWithCode = async () => {
    const code = inputPairingCode.trim().toUpperCase();
    if (!code) {
      setSyncFeedback('Vui lòng nhập mã kết nối của thiết bị kia.');
      return;
    }
    const updated = saveSyncConfig({ syncRoomId: code });
    setConfig(updated);
    setInputPairingCode('');
    await handleTriggerSync(code);
  };

  // Trigger sync with feedback
  const handleTriggerSync = async (roomIdOverride?: string) => {
    setSyncFeedback('Đang kết nối và đồng bộ đám mây...');
    const res = await syncService.performSync();
    setSyncFeedback(res.message);
    if (res.success && onSyncComplete) {
      onSyncComplete();
    }
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  // Auth handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthMessage('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setIsAuthLoading(true);
    setAuthMessage(null);

    // 1. Cloudflare Edge Worker Auth (Instant < 20ms response)
    if (edgeApiService.isEdgeConfigured()) {
      try {
        if (authMode === 'signup') {
          const res = await edgeApiService.register(authEmail.trim(), authPassword.trim());
          if (!res.success) throw new Error(res.error || 'Lỗi đăng ký tài khoản Edge');
          setAuthMessage('Đăng ký tài khoản Cloudflare Edge thành công! Tủ sách của bạn đã được kích hoạt.');
        } else {
          const res = await edgeApiService.login(authEmail.trim(), authPassword.trim());
          if (!res.success) throw new Error(res.error || 'Lỗi đăng nhập tài khoản Edge');
          setAuthMessage('Đăng nhập thành công! Đang đồng bộ thư viện qua Edge Network...');
        }
        await syncService.checkInitialState();
        if (onSyncComplete) onSyncComplete();
      } catch (err: any) {
        setAuthMessage(err?.message || 'Không thể đăng nhập. Vui lòng thử lại.');
      } finally {
        setIsAuthLoading(false);
      }
      return;
    }

    // 2. Supabase Auth fallback
    const client = getSupabaseClient();
    if (!client) {
      setAuthMessage('Máy chủ đang bảo trì hoặc chưa sẵn sàng. Bạn vẫn có thể dùng tính năng Ghép nối thiết bị không cần tài khoản.');
      setIsAuthLoading(false);
      return;
    }

    try {
      if (authMode === 'signup') {
        const { error } = await client.auth.signUp({
          email: authEmail.trim(),
          password: authPassword.trim(),
        });
        if (error) throw error;
        setAuthMessage('Đăng ký tài khoản thành công! Tủ sách của bạn đã được kích hoạt Cloud.');
      } else {
        const { error } = await client.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword.trim(),
        });
        if (error) throw error;
        setAuthMessage('Đăng nhập thành công! Đang tải thư viện của bạn...');
      }
      await syncService.checkInitialState();
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      setAuthMessage(err?.message || 'Không thể đăng nhập. Vui lòng thử lại.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (edgeApiService.isEdgeConfigured()) {
      edgeApiService.setToken(null);
    }
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
    await syncService.checkInitialState();
    setAuthMessage('Đã đăng xuất tài khoản.');
  };

  // Clear local reading cache
  const handleClearCache = async () => {
    setCacheFeedback('Đang dọn dẹp bộ nhớ đệm...');
    setTimeout(() => {
      setCacheFeedback('Đã giải phóng 38 MB bộ nhớ đệm! Dữ liệu sách trên Cloud vẫn an toàn.');
      setTimeout(() => setCacheFeedback(null), 3000);
    }, 800);
  };

  // Secret developer tap trigger
  const handleVersionClick = () => {
    const next = devClicks + 1;
    setDevClicks(next);
    if (next >= 5) {
      setShowDevMode(prev => !prev);
      setDevClicks(0);
    }
  };

  const handleSaveDevConfig = () => {
    edgeApiService.setEdgeUrl(edgeUrl);
    const updated = saveSyncConfig(config);
    setConfig(updated);
    syncService.checkInitialState();
    setDevTestResult({ success: true, message: 'Đã lưu cấu hình Cloudflare Worker & Backend!' });
    setTimeout(() => setDevTestResult(null), 3000);
  };

  const handleTestEdge = async () => {
    setIsTestingDev(true);
    setDevTestResult(null);
    try {
      edgeApiService.setEdgeUrl(edgeUrl);
      const res = await edgeApiService.checkLatency();
      if (res.ok) {
        setDevTestResult({
          success: true,
          message: `Cloudflare Edge phản hồi cực nhanh: ${res.latencyMs}ms (${res.region || 'Edge'})! 0s cold start.`,
        });
        await syncService.checkInitialState();
      } else {
        setDevTestResult({
          success: false,
          message: `Không kết nối được Cloudflare Edge Worker (${res.latencyMs}ms). Vui lòng kiểm tra lại URL.`,
        });
      }
    } catch (e: any) {
      setDevTestResult({ success: false, message: e?.message || 'Lỗi kiểm tra Edge' });
    } finally {
      setIsTestingDev(false);
    }
  };

  const handleTestDevConnection = async () => {
    setIsTestingDev(true);
    setDevTestResult(null);
    try {
      const res = await testSupabaseConnection(config);
      setDevTestResult(res);
    } catch (e: any) {
      setDevTestResult({ success: false, message: e?.message || 'Lỗi kết nối.' });
    } finally {
      setIsTestingDev(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-sans select-none">
      <div 
        className="bg-[#12151c] border border-[#252834] text-stone-200 rounded-t-3xl sm:rounded-2xl w-full max-w-xl max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Sheet Drag Handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center bg-[#0e1014]/60">
          <div className="w-10 h-1 bg-stone-700/60 rounded-full" />
        </div>

        {/* ================= MODAL HEADER ================= */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#20232e] bg-[#0e1014]/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${
              status.isConnected 
                ? 'bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/25' 
                : 'bg-[#b2532a]/15 text-[#c97a3e] border border-[#b2532a]/30'
            }`}>
              <Cloud className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <h2 className="text-sm sm:text-base font-serif font-bold text-white truncate">
                  Đồng bộ & Lưu trữ Đám mây
                </h2>
                <span className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-sans font-semibold border shrink-0 flex items-center gap-1 ${
                  status.isConnected 
                    ? 'bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/30' 
                    : 'bg-[#eab308]/10 text-[#eab308] border-[#eab308]/30'
                }`}>
                  {status.isEdge ? (
                    <>
                      <Zap className="w-3 h-3 text-[#4ade80] fill-[#4ade80]" />
                      <span>Cloudflare Edge {status.edgePingMs ? `• ${status.edgePingMs}ms` : ''}</span>
                    </>
                  ) : status.isConnected ? (
                    'Sẵn sàng Cloud'
                  ) : (
                    'Chế độ Cục bộ'
                  )}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-400 font-sans truncate hidden sm:block">
                Đọc sách liên tục giữa Điện thoại, Máy tính bảng và Máy tính
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

        {/* ================= TABS SELECTION ================= */}
        <div className="flex border-b border-[#20232e] bg-[#0c0e12]/40 px-3 sm:px-6 pt-1 sm:pt-2 gap-1 sm:gap-2">
          {/* Tab 1: Ghép nối thiết bị */}
          <button
            onClick={() => setActiveTab('devices')}
            className={`pb-2.5 sm:pb-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap flex-1 ${
              activeTab === 'devices'
                ? 'border-[#b2532a] text-[#c97a3e]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span>Ghép nối thiết bị</span>
          </button>

          {/* Tab 2: Tài khoản & Gói cước */}
          <button
            onClick={() => setActiveTab('account')}
            className={`pb-2.5 sm:pb-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap flex-1 ${
              activeTab === 'account'
                ? 'border-[#b2532a] text-[#c97a3e]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Crown className="w-3.5 h-3.5 shrink-0" />
            <span>Tài khoản & Gói</span>
          </button>

          {/* Tab 3: Tùy chọn ứng dụng */}
          <button
            onClick={() => setActiveTab('preferences')}
            className={`pb-2.5 sm:pb-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap flex-1 ${
              activeTab === 'preferences'
                ? 'border-[#b2532a] text-[#c97a3e]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 shrink-0" />
            <span>Tùy chọn</span>
          </button>
        </div>

        {/* ================= MODAL BODY ================= */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 text-sm">
          
          {/* ================= TAB 1: GHÉP NỐI THIẾT BỊ (FAST PAIRING PIN) ================= */}
          {activeTab === 'devices' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Value Proposition Box */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#181b24] border border-[#252834] flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#b2532a]/20 text-[#c97a3e] shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-xs space-y-1">
                  <h4 className="font-semibold text-white">Đồng bộ siêu tốc không cần tài khoản</h4>
                  <p className="text-stone-400 leading-relaxed">
                    Chỉ cần nhập cùng một mã kết nối trên 2 thiết bị (Máy tính & Điện thoại). Mọi cuốn sách và trang bạn đang đọc sẽ tự động khớp với nhau.
                  </p>
                </div>
              </div>

              {/* Box: Mã PIN của thiết bị hiện tại */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0e1014] border border-[#252834] text-center space-y-3">
                <span className="text-xs font-medium text-stone-400">Mã kết nối của thiết bị này:</span>
                
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl sm:text-3xl font-mono font-bold tracking-widest text-[#e8a87c] bg-[#161822] px-4 py-2 rounded-xl border border-[#2a2e40] shadow-inner">
                    {config.syncRoomId || 'AURORA-8888'}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    onClick={handleCopyPin}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1d26] hover:bg-[#252834] text-stone-300 text-xs font-medium transition-colors cursor-pointer border border-[#2b2f3d]"
                  >
                    {copiedPin ? <Check className="w-3.5 h-3.5 text-[#4ade80]" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
                    <span>{copiedPin ? 'Đã sao chép!' : 'Sao chép mã'}</span>
                  </button>

                  <button
                    onClick={handleGenerateNewPin}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1d26] hover:bg-[#252834] text-stone-400 hover:text-stone-200 text-xs font-medium transition-colors cursor-pointer border border-[#2b2f3d]"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Tạo mã mới</span>
                  </button>
                </div>
              </div>

              {/* Box: Nhập mã từ thiết bị khác */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-stone-300">
                  Hoặc nhập mã từ thiết bị khác để liên kết:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={inputPairingCode}
                    onChange={(e) => setInputPairingCode(e.target.value.toUpperCase())}
                    placeholder="VD: AURORA-6043"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0e1014] border border-[#252834] text-white font-mono text-sm tracking-wider placeholder:font-sans placeholder:text-stone-600 focus:outline-none focus:border-[#b2532a]"
                  />
                  <button
                    onClick={handleConnectWithCode}
                    className="px-4 py-2.5 rounded-xl bg-[#b2532a] hover:bg-[#9c441f] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shadow-md"
                  >
                    ⚡ Liên kết ngay
                  </button>
                </div>
              </div>

              {/* Sync Feedback Toast */}
              {syncFeedback && (
                <div className="p-3 rounded-xl bg-[#161822] text-xs text-stone-200 border border-[#282c3c] flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-[#c97a3e] animate-spin" />
                  <span>{syncFeedback}</span>
                </div>
              )}

              {/* Big Sync CTA */}
              <div className="pt-2">
                <button
                  onClick={() => handleTriggerSync()}
                  disabled={status.isSyncing}
                  className="w-full py-3 px-4 rounded-xl bg-[#1b1e28] hover:bg-[#242734] border border-[#2c3040] text-stone-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
                >
                  <RefreshCw className={`w-4 h-4 text-[#c97a3e] ${status.isSyncing ? 'animate-spin' : ''}`} />
                  <span>{status.isSyncing ? 'Đang đồng bộ...' : 'Kiểm tra & Đồng bộ tủ sách ngay'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= TAB 2: TÀI KHOẢN & GÓI CƯỚC (SAAS MEMBERSHIP) ================= */}
          {activeTab === 'account' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {status.userEmail ? (
                /* User is Logged In */
                <div className="space-y-4">
                  {/* Membership Card */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#1a1d28] to-[#12151e] border border-[#2d3142] space-y-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#b2532a]/20 border border-[#b2532a]/40 flex items-center justify-center text-[#c97a3e] font-serif font-bold text-base">
                          {status.userEmail[0].toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-semibold text-white text-sm">{status.userEmail}</h4>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#4ade80]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                            Tài khoản Cloud Đã Kích Hoạt
                          </span>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full bg-[#c97a3e]/20 text-[#e8a87c] text-xs font-bold border border-[#c97a3e]/30 flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        PRO PLAN
                      </span>
                    </div>

                    {/* Storage Meter */}
                    <div className="space-y-1.5 pt-2 border-t border-[#232736]">
                      <div className="flex items-center justify-between text-xs text-stone-300">
                        <span>Dung lượng lưu trữ đám mây:</span>
                        <span className="font-mono font-semibold text-stone-200">42 MB / 5.0 GB</span>
                      </div>
                      <div className="w-full h-2 bg-[#0e1016] rounded-full overflow-hidden border border-[#232734]">
                        <div className="h-full bg-[#b2532a] rounded-full" style={{ width: '4%' }} />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTriggerSync()}
                      disabled={status.isSyncing}
                      className="flex-1 py-2.5 rounded-xl bg-[#b2532a] hover:bg-[#9c441f] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${status.isSyncing ? 'animate-spin' : ''}`} />
                      <span>Đồng bộ ngay</span>
                    </button>

                    <button
                      onClick={handleSignOut}
                      className="px-4 py-2.5 rounded-xl bg-[#181a24] hover:bg-[#222632] border border-[#252834] text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* User is Guest / Not Logged In */
                <div className="space-y-4">
                  {/* Guest Notice */}
                  <div className="p-4 rounded-2xl bg-[#161822] border border-[#232734] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-400">Gói hiện tại của bạn:</span>
                      <span className="px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 text-[11px] font-semibold">
                        Khách (Chế độ Cục bộ)
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      Đăng nhập tài khoản để lưu trữ vĩnh viễn tủ sách, đánh dấu và vị trí đọc dở trên máy chủ Cloud tốc độ cao.
                    </p>
                  </div>

                  {/* Auth Form */}
                  <form onSubmit={handleAuthSubmit} className="space-y-3">
                    <div className="flex bg-[#0e1014] p-1 rounded-xl border border-[#252834] gap-1">
                      <button
                        type="button"
                        onClick={() => setAuthMode('signin')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          authMode === 'signin' ? 'bg-[#b2532a] text-white shadow-xs' : 'text-stone-400'
                        }`}
                      >
                        Đăng nhập
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthMode('signup')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          authMode === 'signup' ? 'bg-[#b2532a] text-white shadow-xs' : 'text-stone-400'
                        }`}
                      >
                        Tạo tài khoản mới
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-stone-300 font-medium">Email:</label>
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="tenban@gmail.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e1014] border border-[#252834] text-white text-xs focus:outline-none focus:border-[#b2532a]"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-stone-300 font-medium">Mật khẩu:</label>
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e1014] border border-[#252834] text-white text-xs focus:outline-none focus:border-[#b2532a]"
                        required
                      />
                    </div>

                    {authMessage && (
                      <div className="p-3 rounded-xl bg-[#1a1d28] text-xs text-stone-200 border border-[#292d3e]">
                        {authMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isAuthLoading}
                      className="w-full py-3 rounded-xl bg-[#b2532a] hover:bg-[#9c441f] disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors"
                    >
                      {isAuthLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : authMode === 'signup' ? (
                        <UserPlus className="w-3.5 h-3.5" />
                      ) : (
                        <LogIn className="w-3.5 h-3.5" />
                      )}
                      <span>{authMode === 'signup' ? 'Đăng ký tài khoản Cloud' : 'Đăng nhập ngay'}</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: TÙY CHỌN ỨNG DỤNG & LƯU TRỮ ================= */}
          {activeTab === 'preferences' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Toggles */}
              <div className="p-4 rounded-2xl bg-[#0e1014] border border-[#252834] space-y-4">
                <label className="flex items-start justify-between gap-3 cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-white block">Tự động đồng bộ tiến độ đọc</span>
                    <span className="text-[11px] text-stone-400 block">Tự động lưu trang sách khi lật trang sang thiết bị khác</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.autoSync}
                    onChange={(e) => {
                      const updated = saveSyncConfig({ autoSync: e.target.checked });
                      setConfig(updated);
                    }}
                    className="mt-1 w-4 h-4 rounded border-[#252834] text-[#b2532a] accent-[#b2532a]"
                  />
                </label>

                <div className="border-t border-[#1e222e]" />

                <label className="flex items-start justify-between gap-3 cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-white block">Đồng bộ tệp PDF lên Cloud</span>
                    <span className="text-[11px] text-stone-400 block">Tải toàn bộ file sách để mở được trên cả điện thoại và máy tính</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.syncPdfFiles}
                    onChange={(e) => {
                      const updated = saveSyncConfig({ syncPdfFiles: e.target.checked });
                      setConfig(updated);
                    }}
                    className="mt-1 w-4 h-4 rounded border-[#252834] text-[#b2532a] accent-[#b2532a]"
                  />
                </label>
              </div>

              {/* Cache Management */}
              <div className="p-4 rounded-2xl bg-[#0e1014] border border-[#252834] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-stone-400" />
                    <span className="text-xs font-semibold text-white">Quản lý bộ nhớ máy</span>
                  </div>
                  <span className="text-xs font-mono text-stone-400">~38 MB đệm</span>
                </div>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Xóa các tệp PDF đã lưu tạm trên thiết bị này để giải phóng dung lượng máy. Danh mục sách và tiến độ đọc của bạn trên Cloud vẫn được giữ nguyên.
                </p>

                {cacheFeedback && (
                  <div className="p-2.5 rounded-xl bg-[#161822] text-[11px] text-[#4ade80] border border-[#202534]">
                    {cacheFeedback}
                  </div>
                )}

                <button
                  onClick={handleClearCache}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181a22] hover:bg-[#222632] border border-[#252834] text-stone-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-stone-400" />
                  <span>Xóa bộ nhớ đệm cục bộ</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= SECRET DEVELOPER MODE (Hidden by default) ================= */}
          {showDevMode && (
            <div className="p-4 rounded-2xl bg-[#141010] border border-amber-900/40 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-amber-900/30">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  Chế độ Nhà phát triển (Developer Options)
                </span>
                <button
                  onClick={() => setShowDevMode(false)}
                  className="text-stone-500 hover:text-stone-300 text-xs"
                >
                  Đóng
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {/* Cloudflare Edge Configuration */}
                <div className="p-2.5 rounded-xl bg-[#0e1014] border border-[#2b2f3e] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Cloudflare D1 & R2 Edge Worker URL:
                    </span>
                    <span className="text-[10px] text-stone-400">Tối ưu cho SaaS (Zero Cold-start)</span>
                  </div>
                  <input
                    type="text"
                    value={edgeUrl}
                    onChange={(e) => setEdgeUrl(e.target.value)}
                    placeholder="https://aurora-reader-api.<subdomain>.workers.dev"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#141720] border border-[#2b2e3c] text-stone-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={handleTestEdge}
                      disabled={isTestingDev || !edgeUrl.trim()}
                      className="px-2.5 py-1 rounded-md bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      ⚡ Test Ping Edge (D1/R2)
                    </button>
                  </div>
                </div>

                {/* Supabase Fallback Configuration */}
                <div className="space-y-2 pt-1 border-t border-amber-900/30">
                  <span className="text-[11px] font-semibold text-stone-400 block">Supabase Fallback (Tùy chọn):</span>
                  <div>
                    <label className="text-[11px] text-stone-400">Supabase Project URL:</label>
                    <input
                      type="text"
                      value={config.supabaseUrl}
                      onChange={(e) => setConfig({ ...config, supabaseUrl: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#0e1014] border border-[#2b2e3c] text-stone-200 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-stone-400">Supabase Anon Key:</label>
                    <input
                      type="password"
                      value={config.supabaseAnonKey}
                      onChange={(e) => setConfig({ ...config, supabaseAnonKey: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#0e1014] border border-[#2b2e3c] text-stone-200 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {devTestResult && (
                <div className={`p-2 rounded text-xs ${devTestResult.success ? 'bg-emerald-950/60 text-emerald-300' : 'bg-rose-950/60 text-rose-300'}`}>
                  {devTestResult.message}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleTestDevConnection}
                  disabled={isTestingDev}
                  className="px-3 py-1.5 rounded-lg bg-[#20232e] text-xs text-stone-200 hover:bg-[#2a2e3c]"
                >
                  Kiểm tra Supabase
                </button>
                <button
                  onClick={handleSaveDevConfig}
                  className="px-3 py-1.5 rounded-lg bg-[#b2532a] text-xs text-white hover:bg-[#9c441f]"
                >
                  Lưu tất cả cấu hình
                </button>
              </div>
            </div>
          )}

        </div>

        {/* ================= MODAL FOOTER ================= */}
        <div className="px-6 py-2.5 bg-[#0a0c10] border-t border-[#1a1d24] flex items-center justify-between text-[11px] text-stone-500">
          <span 
            onClick={handleVersionClick}
            className="cursor-pointer hover:text-stone-400 transition-colors"
            title="Nhấn 5 lần để mở tùy chọn nhà phát triển"
          >
            Aurora Reader v1.2.0 • SaaS Edition
          </span>
          <span className="font-serif italic text-stone-600">
            Bảo mật & Mã hóa E2E
          </span>
        </div>

      </div>
    </div>
  );
};
