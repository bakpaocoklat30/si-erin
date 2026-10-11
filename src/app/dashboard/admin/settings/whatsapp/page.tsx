'use client';

// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✨ Fitur Baru: Halaman Manajemen & Koneksi WhatsApp Gateway (WAHA).
// 🔧 Fitur:
//    - Indikator Status Koneksi Real-time (CONNECTED, SCAN_QR, STOPPED, ERROR).
//    - Tampilan QR Code interaktif untuk scan WhatsApp Web di ponsel pengirim.
//    - Form Konfigurasi (Toggle Aktif, URL WAHA, Session Name, API Key, Nomor Pokja).
//    - Fitur Kirim Pesan Uji Coba (Test Message).
// 🎨 UI/UX: Glassmorphic theme-aware design (Dark & Light).
// ----------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { useTheme } from '@/app/theme-provider';
import { 
  MessageSquare, ShieldCheck, RefreshCw, Send, CheckCircle2, 
  AlertCircle, QrCode, Phone, Globe, Key, Settings, Loader2, Sparkles, Check, Play,
  Bell, FileText, UserCheck, GraduationCap, Building2, Users
} from 'lucide-react';

export default function WhatsAppSettingsPage() {
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [startingSession, setStartingSession] = useState(false);

  // Form State
  const [enabled, setEnabled] = useState(false);
  const [apiUrl, setApiUrl] = useState('http://localhost:7005');
  const [sessionName, setSessionName] = useState('default');
  const [apiKey, setApiKey] = useState('');
  const [pokjaPhone, setPokjaPhone] = useState('');
  const [tuPhone, setTuPhone] = useState('');

  // Event Toggles
  const [notifyPokjaNewApp, setNotifyPokjaNewApp] = useState(true);
  const [notifyStudentPermohonan, setNotifyStudentPermohonan] = useState(true);
  const [notifyStudentPenerjunan, setNotifyStudentPenerjunan] = useState(true);
  const [notifyStudentPenarikan, setNotifyStudentPenarikan] = useState(true);
  const [notifyTeacherMonitoring, setNotifyTeacherMonitoring] = useState(true);
  const [notifyTuNewPermohonan, setNotifyTuNewPermohonan] = useState(true);

  // Status Sesi WAHA
  const [sessionStatus, setSessionStatus] = useState<any>(null);

  // Uji Coba Pesan
  const [testPhone, setTestPhone] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings/whatsapp');
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.config) {
          setEnabled(data.config.enabled);
          setApiUrl(data.config.apiUrl);
          setSessionName(data.config.sessionName);
          setApiKey(data.config.apiKey);
          setPokjaPhone(data.config.pokjaPhone || '');
          setTuPhone(data.config.tuPhone || '');
          setNotifyPokjaNewApp(data.config.notifyPokjaNewApp !== false);
          setNotifyStudentPermohonan(data.config.notifyStudentPermohonan !== false);
          setNotifyStudentPenerjunan(data.config.notifyStudentPenerjunan !== false);
          setNotifyStudentPenarikan(data.config.notifyStudentPenarikan !== false);
          setNotifyTeacherMonitoring(data.config.notifyTeacherMonitoring !== false);
          setNotifyTuNewPermohonan(data.config.notifyTuNewPermohonan !== false);
        }
        if (data.session) {
          setSessionStatus(data.session);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/settings/whatsapp');
      const data = await res.json();
      if (res.ok && data.session) {
        setSessionStatus(data.session);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Polling status otomatis setiap 3.5 detik jika belum terhubung agar QR code & status update live
  useEffect(() => {
    if (sessionStatus?.status === 'CONNECTED') return;

    const interval = setInterval(() => {
      refreshStatus();
    }, 3500);

    return () => clearInterval(interval);
  }, [sessionStatus?.status]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);
    try {
      const res = await fetch('/api/admin/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          apiUrl,
          sessionName,
          apiKey,
          pokjaPhone,
          tuPhone,
          notifyPokjaNewApp,
          notifyStudentPermohonan,
          notifyStudentPenerjunan,
          notifyStudentPenarikan,
          notifyTeacherMonitoring,
          notifyTuNewPermohonan,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', text: 'Pengaturan WhatsApp Gateway berhasil disimpan!' });
        refreshStatus();
      } else {
        setNotification({ type: 'error', text: data.error || 'Gagal menyimpan pengaturan' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Terjadi kesalahan jaringan' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) {
      setNotification({ type: 'error', text: 'Masukkan nomor WhatsApp tujuan uji coba!' });
      return;
    }
    setTesting(true);
    setNotification(null);
    try {
      const res = await fetch('/api/admin/settings/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST_MESSAGE',
          testPhone,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', text: data.message });
      } else {
        setNotification({ type: 'error', text: data.error || 'Gagal mengirim pesan uji coba' });
      }
    } catch (err) {
      setNotification({ type: 'error', text: 'Gagal menghubungi server' });
    } finally {
      setTesting(false);
    }
  };

  const handleStartSession = async () => {
    setStartingSession(true);
    setNotification(null);
    try {
      const res = await fetch('/api/admin/settings/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'START_SESSION' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', text: data.message || 'Sesi WAHA berhasil dimulai!' });
        setTimeout(() => refreshStatus(), 1500);
      } else {
        setNotification({ type: 'error', text: data.error || 'Gagal memulai sesi WAHA' });
      }
    } catch {
      setNotification({ type: 'error', text: 'Gagal menghubungi server' });
    } finally {
      setStartingSession(false);
    }
  };

  const handleStopSession = async () => {
    setStartingSession(true);
    setNotification(null);
    try {
      const res = await fetch('/api/admin/settings/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'STOP_SESSION' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', text: data.message || 'Sesi WAHA berhasil dihentikan.' });
        setTimeout(() => refreshStatus(), 1000);
      } else {
        setNotification({ type: 'error', text: data.error || 'Gagal menghentikan sesi WAHA' });
      }
    } catch {
      setNotification({ type: 'error', text: 'Gagal menghubungi server' });
    } finally {
      setStartingSession(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-[80vh] flex flex-col items-center justify-center space-y-4 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Memuat Pengaturan WhatsApp Gateway...</p>
      </div>
    );
  }

  const isConnected = sessionStatus?.status === 'CONNECTED';
  const isScanQr = sessionStatus?.status === 'SCAN_QR';

  return (
    <div className={`min-h-full p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-900'
    }`}>
      {/* HEADER BANNER */}
      <div className={`p-8 rounded-3xl border shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark'
          ? 'bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border-emerald-500/30 text-white'
          : 'bg-gradient-to-r from-emerald-50 via-white to-white border-emerald-200 text-slate-900 shadow-xl'
      }`}>
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-2 relative z-10">
          <div className={`inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-xs font-semibold border ${
            theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-100 border-emerald-200 text-emerald-700'
          }`}>
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Integrasi Self-Hosted WAHA</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            WhatsApp <span className="text-emerald-500">Gateway Notifikasi</span> 📲
          </h1>
          <p className={`text-sm max-w-2xl ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Kirim notifikasi otomatis ke Tim Pokja saat ada pengajuan baru siswa, serta ke Siswa dan Guru saat surat resmi diterbitkan / di-TTE.
          </p>
        </div>

        <div className="flex items-center space-x-4 relative z-10 bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl shrink-0">
          <div className={`w-3.5 h-3.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status Sesi WhatsApp</p>
            <p className={`text-sm font-black ${isConnected ? 'text-emerald-500' : 'text-amber-500'}`}>
              {isConnected ? 'TERHUBUNG (ONLINE)' : isScanQr ? 'PERLU SCAN QR' : 'OFFLINE'}
            </p>
          </div>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-2xl border flex items-center space-x-3 text-sm font-semibold ${
          notification.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{notification.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* KOLOM KIRI: STATUS KONEKSI & SCAN QR */}
        <div className={`p-6 rounded-3xl border space-y-6 ${
          theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-lg'
        }`}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center space-x-2">
              <QrCode className="w-5 h-5 text-emerald-500" />
              <span>Koneksi Perangkat WhatsApp</span>
            </h2>
            <button
              onClick={refreshStatus}
              disabled={refreshing}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="Perbarui Status Sesi"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="text-center py-4 space-y-4">
            {isConnected ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="font-bold text-emerald-500 text-base">WhatsApp Bot Aktif!</h3>
                <p className="text-xs text-slate-400">
                  Nomor telah terhubung dengan server WAHA. SI-ERIN siap mengirimkan notifikasi otomatis secara berkala.
                </p>
                {sessionStatus?.name && (
                  <p className="text-xs font-mono bg-slate-950/40 p-2 rounded-lg border border-slate-800 text-emerald-400">
                    ID: {sessionStatus.name}
                  </p>
                )}
                <div className="pt-2 flex justify-center space-x-2">
                  <button
                    type="button"
                    onClick={handleStopSession}
                    disabled={startingSession}
                    className="px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-medium text-xs cursor-pointer transition-all"
                  >
                    {startingSession ? 'Memproses...' : 'Putuskan Sesi'}
                  </button>
                  <button
                    type="button"
                    onClick={handleStartSession}
                    disabled={startingSession}
                    className="px-3 py-1.5 rounded-xl border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-medium text-xs cursor-pointer transition-all"
                  >
                    {startingSession ? 'Memproses...' : 'Mulai Ulang'}
                  </button>
                </div>
              </div>
            ) : isScanQr ? (
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-2xl inline-block border-2 border-emerald-500 shadow-xl">
                  {sessionStatus.qrCode ? (
                    <img 
                      src={sessionStatus.qrCode.startsWith('data:') ? sessionStatus.qrCode : `data:image/png;base64,${sessionStatus.qrCode}`} 
                      alt="WhatsApp QR Code" 
                      className="w-56 h-56 mx-auto object-contain"
                    />
                  ) : (
                    <div className="w-56 h-56 flex flex-col items-center justify-center space-y-2 text-slate-500">
                      <QrCode className="w-12 h-12 animate-pulse text-emerald-500" />
                      <p className="text-xs font-semibold">Memuat QR Code...</p>
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300">📱 Cara Menautkan Nomor:</p>
                  <p>1. Buka aplikasi WhatsApp di HP pengirim (Bot)</p>
                  <p>2. Tekan menu titik tiga / Pengaturan ➜ <b>Perangkat Tertaut</b></p>
                  <p>3. Arahkan kamera HP ke QR Code di atas</p>
                </div>
                <div className="pt-2 flex justify-center space-x-2">
                  <button
                    type="button"
                    onClick={refreshStatus}
                    disabled={refreshing}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 cursor-pointer transition-all"
                  >
                    {refreshing ? 'Memperbarui...' : 'Segarkan QR'}
                  </button>
                  <button
                    type="button"
                    onClick={handleStartSession}
                    disabled={startingSession}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-500 cursor-pointer transition-all"
                  >
                    {startingSession ? 'Memulai...' : 'Buat Ulang Sesi'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
                <h3 className="font-bold text-amber-500 text-base">Sesi Belum Dimulai</h3>
                <p className="text-xs text-slate-400">
                  {sessionStatus?.message || 'Server WAHA belum mendeteksi sesi WhatsApp aktif. Pastikan container WAHA aktif di server.'}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleStartSession}
                    disabled={startingSession}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 cursor-pointer transition-all flex items-center justify-center space-x-1.5"
                  >
                    {startingSession ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{startingSession ? 'Memulai Sesi...' : 'Mulai Sesi (Start)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={refreshStatus}
                    disabled={refreshing}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 cursor-pointer transition-all"
                  >
                    Cek Ulang Sesi
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* UJI COBA KIRIM PESAN */}
          <div className="pt-4 border-t border-inherit space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Send className="w-3.5 h-3.5 text-emerald-500" />
              <span>Uji Coba Kirim Pesan</span>
            </h3>
            <form onSubmit={handleTestMessage} className="space-y-3">
              <input
                type="text"
                placeholder="Nomor WA (contoh: 08123456789)"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-600'
                }`}
              />
              <button
                type="submit"
                disabled={testing || !isConnected}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  isConnected
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{testing ? 'Mengirim...' : 'Kirim Pesan Uji Coba'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* KOLOM KANAN: FORM KONFIGURASI WAHA */}
        <div className={`lg:col-span-2 p-6 sm:p-8 rounded-3xl border space-y-6 ${
          theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-lg'
        }`}>
          <div className="space-y-1">
            <h2 className="text-lg font-bold flex items-center space-x-2">
              <Settings className="w-5 h-5 text-emerald-500" />
              <span>Konfigurasi WhatsApp Gateway (WAHA)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Pengaturan alamat endpoint API, nama sesi, dan nomor tujuan notifikasi Tim Pokja.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {/* TOGGLE AKTIFKAN WA */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="space-y-0.5">
                <p className="text-sm font-bold">Aktifkan Notifikasi WhatsApp Otomatis</p>
                <p className="text-xs text-slate-400">Kirim notifikasi real-time saat siswa mendaftar dan surat diterbitkan</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* WAHA API URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-500" />
                <span>WAHA API URL Endpoint</span>
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:7005 atau http://waha:3000"
                className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-all ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-600'
                }`}
                required
              />
              <p className="text-[11px] text-slate-500">
                Gunakan <b>http://waha:3000</b> jika berjalan di dalam container Docker server Rocky Linux, atau <b>http://localhost:7005</b> saat pengujian lokal.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* SESSION NAME */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Nama Sesi (Session Name)</span>
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="default"
                  className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-all ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-600'
                  }`}
                  required
                />
              </div>

              {/* API KEY */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-500" />
                  <span>WAHA API Key (Opsional)</span>
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Kosongkan jika tanpa API Key"
                  className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-all ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-600'
                  }`}
                />
              </div>
            </div>

            {/* KONFIGURASI NOMOR TUJUAN PIC (POKJA & TATA USAHA) */}
            <div className="pt-2 border-t border-inherit space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center space-x-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span>Nomor WhatsApp Tujuan Petugas (PIC Sekolah)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Nomor resmi yang didaftarkan untuk menerima laporan dan peringatan langsung ke HP petugas.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* NOMOR WA TIM POKJA */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    <span>WhatsApp Tim Pokja Prakerin</span>
                  </label>
                  <input
                    type="text"
                    value={pokjaPhone}
                    onChange={(e) => setPokjaPhone(e.target.value)}
                    placeholder="Contoh: 08123456789 atau 628123456789"
                    className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-all ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-600'
                    }`}
                  />
                  <p className="text-[11px] text-slate-500">
                    Menerima notifikasi setiap kali ada pengajuan tempat PKL baru dari siswa.
                  </p>
                </div>

                {/* NOMOR WA TATA USAHA */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>WhatsApp Tata Usaha / Persuratan</span>
                  </label>
                  <input
                    type="text"
                    value={tuPhone}
                    onChange={(e) => setTuPhone(e.target.value)}
                    placeholder="Contoh: 08123456789 atau 628123456789"
                    className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-all ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-600'
                    }`}
                  />
                  <p className="text-[11px] text-slate-500">
                    Menerima info jika ada berkas/surat permohonan baru yang perlu diproses.
                  </p>
                </div>
              </div>
            </div>

            {/* PREFERENSI JENIS PESAN & PENERIMA NOTIFIKASI */}
            <div className="pt-4 border-t border-inherit space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-emerald-500" />
                  <span>Kriteria Notifikasi & Penerima Pesan</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Tentukan peristiwa apa saja yang akan memicu pengiriman pesan WhatsApp dan siapa target penerimanya.
                </p>
              </div>

              <div className="space-y-3">
                {/* 1. PENGAJUAN BARU KE POKJA */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                  theme === 'dark' ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                        PENERIMA: TIM POKJA
                      </span>
                    </div>
                    <p className="text-sm font-bold">Pengajuan Tempat PKL Baru dari Siswa</p>
                    <p className="text-xs text-slate-400">
                      Kirim pesan otomatis ke HP Tim Pokja saat siswa memilih industri dan mengirim pengajuan tempat PKL.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifyPokjaNewApp}
                      onChange={(e) => setNotifyPokjaNewApp(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* 2. PENGAJUAN BARU KE TATA USAHA */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                  theme === 'dark' ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                        PENERIMA: TATA USAHA
                      </span>
                    </div>
                    <p className="text-sm font-bold">Peringatan Pembuatan Surat Permohonan</p>
                    <p className="text-xs text-slate-400">
                      Beri tahu tim TU saat ada pengajuan baru yang siap dicetak/dibuatkan nomor surat permohonan PKL.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifyTuNewPermohonan}
                      onChange={(e) => setNotifyTuNewPermohonan(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* 3. SURAT PERMOHONAN KE SISWA */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                  theme === 'dark' ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        PENERIMA: SISWA
                      </span>
                    </div>
                    <p className="text-sm font-bold">Penerbitan Surat Permohonan PKL</p>
                    <p className="text-xs text-slate-400">
                      Kirim link dan pemberitahuan ke nomor WhatsApp siswa saat TU menerbitkan surat permohonan.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifyStudentPermohonan}
                      onChange={(e) => setNotifyStudentPermohonan(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* 4. SURAT PENERJUNAN / TUGAS KE SISWA */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                  theme === 'dark' ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        PENERIMA: SISWA
                      </span>
                    </div>
                    <p className="text-sm font-bold">Penerbitan Surat Tugas & Pengantar Penerjunan</p>
                    <p className="text-xs text-slate-400">
                      Kirim info surat penerjunan resmi dan instruksi koordinasi pembimbing langsung ke siswa.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifyStudentPenerjunan}
                      onChange={(e) => setNotifyStudentPenerjunan(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* 5. SURAT PENARIKAN KE SISWA */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                  theme === 'dark' ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        PENERIMA: SISWA
                      </span>
                    </div>
                    <p className="text-sm font-bold">Penerbitan Surat Penarikan Siswa PKL</p>
                    <p className="text-xs text-slate-400">
                      Kirim dokumen penarikan dan ucapan terima kasih kepada siswa saat masa PKL berakhir.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifyStudentPenarikan}
                      onChange={(e) => setNotifyStudentPenarikan(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* 6. SURAT TUGAS & SPPD TTE KE GURU PEMBIMBING */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                  theme === 'dark' ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        PENERIMA: GURU PEMBIMBING
                      </span>
                    </div>
                    <p className="text-sm font-bold">Surat Tugas & SPPD Monitoring TTE Siap Unduh</p>
                    <p className="text-xs text-slate-400">
                      Kirim pesan langsung ke WhatsApp Guru Pembimbing saat dokumen penugasan monitoring telah selesai di-TTE.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifyTeacherMonitoring}
                      onChange={(e) => setNotifyTeacherMonitoring(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center space-x-2 cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{saving ? 'Menyimpan...' : 'Simpan Semua Pengaturan WhatsApp'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

