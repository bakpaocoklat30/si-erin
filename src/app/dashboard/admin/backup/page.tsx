'use client';

// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Integrasi Modal Form Pengaturan Kredensial Google Drive In-App langsung ke dalam Dashboard Backup Admin.
// ✨ Fitur Baru: Real-time Credential Status Banner, Modal Form GUI Kredensial, & Toggle Key Visibility.
// 🎨 UI/UX Update: Glassmorphism Alert, Dynamic Status Badges, & Smooth Modal Transitions.
// 🔧 Bug Fix: Mengubah indikator warning kredensial menjadi tombol aksi langsung "Atur Kredensial".
// 🚀 Inovasi: Zero-Downtime Dynamic Disaster Recovery & Cloud Storage Control Center.
// ----------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { 
  Database, 
  UploadCloud, 
  HardDrive, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  FileArchive, 
  Clock, 
  ShieldCheck,
  ExternalLink,
  RotateCcw,
  Check,
  Key,
  Settings,
  Eye,
  EyeOff,
  Save,
  X
} from 'lucide-react';

export default function AdminBackupPage() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal & Form Kredensial GDrive State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [credentials, setCredentials] = useState({
    clientEmail: '',
    privateKey: '',
    folderId: '',
    impersonateUser: '',
  });

  const isCredentialReady = credentials.clientEmail.length > 0 && credentials.privateKey.length > 0;

  // Load Kredensial GDrive
  const fetchCredentials = async () => {
    try {
      const res = await fetch('/api/admin/settings/gdrive');
      const data = await res.json();
      if (data.success && data.credentials) {
        setCredentials(data.credentials);
      }
    } catch (err) {
      console.error('Gagal memuat kredensial GDrive:', err);
    }
  };

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/backup');
      const data = await res.json();
      if (data.success) {
        setBackups(data.backups || []);
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal memuat riwayat backup dari Google Drive' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal terhubung ke server backup' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
    fetchBackups();
  }, []);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/settings/gdrive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Kredensial Google Drive berhasil disimpan!' });
        setShowSettingsModal(false);
        fetchCredentials();
        fetchBackups();
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal menyimpan kredensial' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan sistem saat menyimpan kredensial' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!isCredentialReady) {
      setShowSettingsModal(true);
      setMessage({ type: 'error', text: 'Silakan atur kredensial Google Drive terlebih dahulu.' });
      return;
    }

    if (!confirm('Apakah Anda yakin ingin memulai proses Backup Seluruh Database & Berkas Media (public/uploads) ke Google Drive sekarang?')) return;

    setIsBackingUp(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/backup', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchBackups();
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal melakukan backup ke Google Drive' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan saat melakukan backup' });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async (fileId: string, fileName: string) => {
    if (!confirm(`PERINGATAN KRITIS!\n\nApakah Anda yakin ingin memulihkan (Restore) sistem dari arsip "${fileName}"?\n\nTindakan ini akan menimpa data database dan berkas media saat ini dengan data dari cadangan tersebut.`)) return;

    setRestoringId(fileId);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal memulihkan sistem' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan saat memulihkan sistem' });
    } finally {
      setRestoringId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 🛡️ SKEMA DATA SI-ERIN LENGKAP TANPA ADA YANG TERTINGGAL
  const schemaModules = [
    { name: 'Identitas Sekolah & Logo Header', count: 'Pengaturan Utama' },
    { name: 'Manajemen Akun, User & RBAC', count: 'Multi-Role User' },
    { name: 'Akademik, Jurusan & Kelas', count: 'Master Akademik' },
    { name: 'Periode PKL & Nilai Koefisien', count: 'Konfigurasi PKL' },
    { name: 'DUDI Mitra & Master Sektor Usaha', count: 'Mitra Industri' },
    { name: 'Siswa, Pembimbing & Penempatan', count: 'Data Penempatan' },
    { name: 'Absensi, Jurnal & Catatan PKL', count: 'Aktivitas Harian' },
    { name: 'Jam Bimbingan & Monitoring Guru', count: 'Jadwal Bimbingan' },
    { name: 'Surat Pengantar & Dokumen PKL', count: 'Administrasi' },
    { name: 'Berkas Uploads (PDF/PNG/JPG)', count: 'public/uploads (.zip)' }
  ];

  return (
    <div className="space-y-6">
      
      {/* TOP HEADER BANNER SECTION */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Full-Schema Disaster Recovery Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Pencadangan & Pemulihan (Backup & Restore)
            </h1>
            <p className="text-indigo-200 text-xs sm:text-sm max-w-xl leading-relaxed">
              Mencakup pencadangan **100% Seluruh Database PostgreSQL (Seluruh Model Prisma)** dan seluruh berkas lampiran <code className="bg-indigo-950/60 px-1.5 py-0.5 rounded text-indigo-300 font-mono">public/uploads/</code> secara otomatis ke Google Drive.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-5 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider flex items-center space-x-2 transition-all cursor-pointer shadow-lg active:scale-95"
            >
              <Settings className="w-4 h-4 text-indigo-400" />
              <span>Atur Kredensial</span>
            </button>

            <button
              onClick={handleCreateBackup}
              disabled={isBackingUp}
              className={`px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center space-x-3 transition-all cursor-pointer ${
                isBackingUp
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30 hover:scale-105 active:scale-95'
              }`}
            >
              {isBackingUp ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                  <span>Memproses Full Backup Cloud...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-5 h-5" />
                  <span>Mulai Full Backup Sekarang</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* BANNER STATUS KREDENSIAL GDRIVE */}
      <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-4 transition-all ${
        isCredentialReady 
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
          : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
      }`}>
        <div className="flex items-center space-x-3">
          {isCredentialReady ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
          )}
          <span>
            {isCredentialReady
              ? `Kredensial Google Drive Terhubung (${credentials.clientEmail})`
              : 'Kredensial Google Drive belum diatur. Klik "Atur Kredensial" untuk mengonfigurasi Service Account.'}
          </span>
        </div>

        <button
          onClick={() => setShowSettingsModal(true)}
          className="px-3.5 py-1.5 rounded-xl border border-current hover:opacity-80 transition-opacity text-[11px] font-extrabold uppercase tracking-wider cursor-pointer shrink-0"
        >
          {isCredentialReady ? 'Ubah' : 'Atur Sekarang'}
        </button>
      </div>

      {/* NOTIFICATION ALERT */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center space-x-3 border animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* SUMMARY STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Database Coverage</p>
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">Full-Schema Prisma PostgreSQL</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Folder Storage Terproteksi</p>
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">public/uploads (.zip)</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <FileArchive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Arsip Google Drive</p>
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">{backups.length} File Tersimpan</p>
          </div>
        </div>
      </div>

      {/* RINCIAN TABEL & SKEMA YANG TERCOVER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-inherit pb-3">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            Cakupan Proteksi Data SI-ERIN (100% Full-Coverage)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {schemaModules.map((item, index) => (
            <div key={index} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 flex items-center space-x-2.5">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="overflow-hidden">
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                <span className="text-[9px] font-extrabold text-indigo-500 dark:text-indigo-400 uppercase tracking-tight">{item.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BACKUP HISTORY & RESTORE TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-inherit flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-100">Riwayat Berkas Full Backup di Google Drive</h2>
          </div>
          <button
            onClick={fetchBackups}
            disabled={loading}
            className="p-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold animate-pulse">
            Memuat daftar arsip dari Google Drive API...
          </div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            Belum ada arsip backup di Google Drive. Klik tombol "Mulai Full Backup Sekarang" di atas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-inherit bg-slate-50 dark:bg-slate-950/50 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">
                  <th className="p-4">Nama Arsip Backup</th>
                  <th className="p-4">Waktu Dibuat</th>
                  <th className="p-4">Ukuran File</th>
                  <th className="p-4 text-right">Aksi Pemulihan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit font-medium">
                {backups.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-3">
                      <FileArchive className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="truncate max-w-xs sm:max-w-md">{file.name}</span>
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">
                      {new Date(file.createdTime).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">
                      {formatFileSize(Number(file.size))}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleRestoreBackup(file.id, file.name)}
                        disabled={restoringId === file.id}
                        className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition-all cursor-pointer ${
                          restoringId === file.id
                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        <RotateCcw className={`w-3 h-3 ${restoringId === file.id ? 'animate-spin' : ''}`} />
                        <span>{restoringId === file.id ? 'Memulihkan...' : 'Pulihkan (Restore)'}</span>
                      </button>

                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-extrabold text-[11px] transition-all cursor-pointer"
                      >
                        <span>Drive</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL FORM PENGATURAN KREDENSIAL GOOGLE DRIVE */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-inherit pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Pengaturan Kredensial Google Drive</h3>
                  <p className="text-xs text-slate-400">Konfigurasi Service Account tanpa mengedit file .env di server</p>
                </div>
              </div>

              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCredentials} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block uppercase tracking-wider text-slate-400 text-[10px] font-black mb-1">
                  Google Service Account Client Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="si-erin-backup@project-id.iam.gserviceaccount.com"
                  value={credentials.clientEmail}
                  onChange={(e) => setCredentials({ ...credentials, clientEmail: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block uppercase tracking-wider text-slate-400 text-[10px] font-black">
                    Google Service Account Private Key <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="text-[11px] text-indigo-500 hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    {showPrivateKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPrivateKey ? 'Sembunyikan' : 'Tampilkan'}</span>
                  </button>
                </div>
                <textarea
                  required
                  rows={4}
                  placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
                  value={credentials.privateKey}
                  onChange={(e) => setCredentials({ ...credentials, privateKey: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 font-mono text-[11px] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider text-slate-400 text-[10px] font-black mb-1">
                  Folder ID Google Drive (Wajib)
                </label>
                <input
                  type="text"
                  required
                  placeholder="1A2b3C4d5E6f7G8h9I0j"
                  value={credentials.folderId}
                  onChange={(e) => setCredentials({ ...credentials, folderId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">Dapatkan Folder ID dari ujung URL folder Google Drive Anda.</p>
              </div>

              <div>
                <label className="block uppercase tracking-wider text-slate-400 text-[10px] font-black mb-1">
                  Google Workspace User to Impersonate (Opsional - Domain Delegation)
                </label>
                <input
                  type="email"
                  placeholder="admin@sekolah.sch.id"
                  value={credentials.impersonateUser}
                  onChange={(e) => setCredentials({ ...credentials, impersonateUser: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">Digunakan jika Anda mengaktifkan Domain-Wide Delegation untuk bypass kuota Service Account 0 byte.</p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-inherit">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan Kredensial</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}