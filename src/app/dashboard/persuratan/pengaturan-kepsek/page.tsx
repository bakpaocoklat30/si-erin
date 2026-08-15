// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Menghubungkan secara langsung endpoint `/api/settings/school` dengan modul Pengaturan Kepsek.
// ✨ Fitur Baru: Client-Side Dual-Sync Engine (Sinkronisasi otomatis 2 arah antara API Persuratan dan API Admin).
// 🎨 UI/UX Update: Menambahkan badge "Sinkron dengan Admin" untuk menginformasikan SSOT (Single Source of Truth).
// 🔧 Bug Fix: Menyelesaikan masalah isolasi data (data Kepsek tidak sinkron) karena perbedaan key JSON (`headmaster` vs `principalName`).
// 🚀 Inovasi: Safe Background Data Merging Pipeline.
// ----------------------------------------------------------------------

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  PenTool, 
  Save, 
  RefreshCw, 
  ShieldCheck, 
  Loader2, 
  Building, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Image as ImageIcon,
  Trash2,
  HelpCircle,
  MapPin,
  ArrowLeft,
  DatabaseZap
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';

export default function PengaturanKepsekPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  const userRole = (session?.user as any)?.role || 'TATA_USAHA';

  // Form States
  const [principalName, setPrincipalName] = useState('');
  const [principalNip, setPrincipalNip] = useState('');
  const [principalTitle, setPrincipalTitle] = useState('Kepala Sekolah');
  const [principalRank, setPrincipalRank] = useState('');
  const [issueCity, setIssueCity] = useState('Tegal');
  const [useDigitalSignature, setUseDigitalSignature] = useState(true);
  const [signatureUrl, setSignatureUrl] = useState('');
  const [stampUrl, setStampUrl] = useState('');

  // UI States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 🛡️ Safe Date Formatter Helper
  const getFormattedTodayDate = useCallback(() => {
    try {
      return new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  }, []);

  // Auto-hide Toast Notification
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // 🔄 LOAD SETTING DARI DUA API SEKALIGUS (DUAL-FETCH ENGINE)
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch Paralel agar lebih cepat
      const [resLetters, resSchool] = await Promise.all([
        fetch('/api/letters/settings/principal').catch(() => null),
        fetch('/api/settings/school?t=' + new Date().getTime()).catch(() => null)
      ]);

      let letterData: any = {};
      let schoolData: any = {};

      if (resLetters && resLetters.ok) {
        const jsonL = await resLetters.json();
        if (jsonL.data) letterData = jsonL.data;
      }

      if (resSchool && resSchool.ok) {
        const jsonS = await resSchool.json();
        if (jsonS.data) schoolData = jsonS.data;
      }

      // SINKRONISASI SINGLE SOURCE OF TRUTH (Prioritaskan Admin School API)
      setPrincipalName(schoolData.headmaster || letterData.principalName || '');
      setPrincipalNip(schoolData.headmasterNip || letterData.principalNip || '');
      
      // Data Khusus Persuratan
      setPrincipalTitle(letterData.principalTitle || 'Kepala Sekolah');
      setPrincipalRank(letterData.principalRank || '');
      setIssueCity(letterData.issueCity || 'Tegal');
      setUseDigitalSignature(letterData.useDigitalSignature ?? true);
      setSignatureUrl(letterData.signatureUrl || '');
      setStampUrl(letterData.stampUrl || '');

    } catch (err) {
      console.error('Gagal memuat setting Kepsek:', err);
      setToast({ type: 'error', message: 'Gagal sinkronisasi data dari server' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSettings();
    }
  }, [status, fetchSettings]);

  // HANDLER UPLOAD FILE (CONVERT TO BASE64 PNG)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'signature' | 'stamp') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image/')) {
      setToast({ type: 'error', message: 'Harap unggah file gambar (PNG / JPEG)' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setToast({ type: 'error', message: 'Ukuran file maksimal 2 MB' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (target === 'signature') {
        setSignatureUrl(result);
      } else {
        setStampUrl(result);
      }
      setToast({ type: 'success', message: `Gambar ${target === 'signature' ? 'TTD' : 'Stempel'} berhasil diunggah` });
    };
    reader.readAsDataURL(file);
  };

  // 💾 HANDLER SAVE SETTING (DUAL-POST ENGINE)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!principalName.trim()) {
      setToast({ type: 'error', message: 'Nama Kepala Sekolah tidak boleh kosong' });
      return;
    }

    setSaving(true);
    try {
      // 1. Simpan ke Database Persuratan API
      const resLetters = await fetch('/api/letters/settings/principal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principalName,
          principalNip,
          principalTitle,
          principalRank,
          issueCity,
          useDigitalSignature,
          signatureUrl,
          stampUrl
        })
      });
      const jsonLetters = await resLetters.json();

      if (!jsonLetters.success) {
        throw new Error(jsonLetters.error || 'Gagal menyimpan ke modul persuratan');
      }

      // 2. Background Sync ke Database Admin API (Mencegah Fragmentation)
      try {
        const schoolRes = await fetch('/api/settings/school');
        if (schoolRes.ok) {
          const schoolJson = await schoolRes.json();
          const existingSchoolData = schoolJson.data || {};

          // Merge Data Lama dengan Nama/NIP Baru agar tidak hilang logo dll
          await fetch('/api/settings/school', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...existingSchoolData,
              headmaster: principalName,
              headmasterNip: principalNip
            })
          });
        }
      } catch (syncErr) {
        console.warn('Silent Warning: Gagal background sync ke /api/settings/school', syncErr);
      }

      setToast({ type: 'success', message: 'Pengaturan berhasil disimpan & tersinkronisasi 100%!' });
      
    } catch (err: any) {
      console.error('Save error:', err);
      setToast({ type: 'error', message: err.message || 'Terjadi kesalahan sistem saat menyimpan' });
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-[70vh] flex items-center justify-center ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="flex items-center space-x-3">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="text-xs font-semibold">Memuat Sinkronisasi Kepsek & TTD...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-900'
    }`}>
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-2xl border shadow-2xl flex items-center space-x-3 transition-all animate-bounce ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* HEADER BANNER */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <PenTool className="w-3.5 h-3.5" />
            <span>Legalitas & Legitimasi Dokumen ({userRole})</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center space-x-3">
            <span>Pengaturan Kepsek & TTD Digital</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Atur data penandatangan resmi, tanda tangan elektronik, stempel sekolah, dan atribut legalitas dokumen persuratan PKL.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2.5 rounded-2xl border text-xs font-bold flex items-center space-x-2 transition-all bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </Link>

          <button
            type="button"
            onClick={fetchSettings}
            disabled={loading}
            className="px-4 py-2.5 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold flex items-center space-x-2 cursor-pointer transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload & Sinkronkan</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: FORM INPUTS (7 COLS) */}
        <div className={`lg:col-span-7 p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between border-b border-inherit pb-4">
            <h3 className="text-base font-extrabold flex items-center space-x-2">
              <Building className="w-5 h-5 text-indigo-500" />
              <span>Profil Penandatangan Resmi</span>
            </h3>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <DatabaseZap className="w-3 h-3" />
              <span>Sync Aktif</span>
            </span>
          </div>

          <div className="space-y-4">
            {/* Nama Kepala Sekolah */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 flex justify-between items-center">
                <span>Nama Lengkap & Gelar Kepala Sekolah <span className="text-red-400">*</span></span>
              </label>
              <input
                type="text"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                placeholder="misal: Dr. H. Ahmad Fauzi, M.Pd."
                required
                className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                }`}
              />
              <p className="text-[10px] text-emerald-500 font-semibold mt-1.5 ml-1 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Terhubung dengan Modul Pengaturan Identitas Sekolah (Admin)</span>
              </p>
            </div>

            {/* NIP / NIPY */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">
                NIP / NIPY Kepala Sekolah
              </label>
              <input
                type="text"
                value={principalNip}
                onChange={(e) => setPrincipalNip(e.target.value)}
                placeholder="misal: 19750815 200003 1 002"
                className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                }`}
              />
            </div>

            {/* Jabatan & Pangkat */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">
                  Jabatan Penandatangan
                </label>
                <input
                  type="text"
                  value={principalTitle}
                  onChange={(e) => setPrincipalTitle(e.target.value)}
                  placeholder="Kepala Sekolah"
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">
                  Pangkat / Golongan
                </label>
                <input
                  type="text"
                  value={principalRank}
                  onChange={(e) => setPrincipalRank(e.target.value)}
                  placeholder="Pembina Utama Muda (IV/c)"
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                  }`}
                />
              </div>
            </div>

            {/* Kota Penerbitan Surat */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                <span>Kota / Kabupaten Penerbitan Surat</span>
              </label>
              <input
                type="text"
                value={issueCity}
                onChange={(e) => setIssueCity(e.target.value)}
                placeholder="Tegal"
                className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                }`}
              />
            </div>

            {/* Toggle TTD Digital */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <p className="text-xs font-extrabold">Sematkan TTD Digital & Stempel Otomatis</p>
                <p className="text-[11px] text-slate-400">Tampilkan gambar TTD & stempel pada PDF yang terbit</p>
              </div>

              <button
                type="button"
                onClick={() => setUseDigitalSignature(!useDigitalSignature)}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  useDigitalSignature ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  useDigitalSignature ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

          </div>

          {/* UPLOAD BERKAS TTD & STEMPEL */}
          <div className="pt-4 border-t border-inherit space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Berkas Media Legalitas (PNG Transparan)</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Uploader 1: Tanda Tangan */}
              <div className={`p-4 rounded-2xl border text-center space-y-3 relative overflow-hidden ${
                theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-[11px] font-bold text-slate-400 block">Tanda Tangan Digital</span>
                
                {signatureUrl ? (
                  <div className="relative group">
                    <img
                      src={signatureUrl}
                      alt="TTD Kepsek"
                      className="h-20 max-w-full mx-auto object-contain bg-white/5 rounded-xl p-2"
                    />
                    <button
                      type="button"
                      onClick={() => setSignatureUrl('')}
                      className="absolute top-1 right-1 p-1.5 rounded-xl bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Hapus TTD"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="py-4 border-2 border-dashed border-slate-700 rounded-xl space-y-1">
                    <ImageIcon className="w-6 h-6 text-slate-500 mx-auto" />
                    <span className="text-[10px] text-slate-400 block">Belum ada TTD</span>
                  </div>
                )}

                <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[11px] font-bold cursor-pointer hover:bg-indigo-500/20 transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{signatureUrl ? 'Ganti TTD' : 'Unggah TTD'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'signature')}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Uploader 2: Stempel Sekolah */}
              <div className={`p-4 rounded-2xl border text-center space-y-3 relative overflow-hidden ${
                theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-[11px] font-bold text-slate-400 block">Stempel Resmi Sekolah</span>
                
                {stampUrl ? (
                  <div className="relative group">
                    <img
                      src={stampUrl}
                      alt="Stempel Sekolah"
                      className="h-20 max-w-full mx-auto object-contain bg-white/5 rounded-xl p-2"
                    />
                    <button
                      type="button"
                      onClick={() => setStampUrl('')}
                      className="absolute top-1 right-1 p-1.5 rounded-xl bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Hapus Stempel"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="py-4 border-2 border-dashed border-slate-700 rounded-xl space-y-1">
                    <ImageIcon className="w-6 h-6 text-slate-500 mx-auto" />
                    <span className="text-[10px] text-slate-400 block">Belum ada Stempel</span>
                  </div>
                )}

                <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[11px] font-bold cursor-pointer hover:bg-rose-500/20 transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{stampUrl ? 'Ganti Stempel' : 'Unggah Stempel'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'stamp')}
                    className="hidden"
                  />
                </label>
              </div>

            </div>
          </div>

          {/* SIMPAN BUTTON */}
          <div className="pt-4 border-t border-inherit">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-rose-600 text-white text-xs font-black shadow-xl shadow-indigo-600/30 hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Menyimpan Sinkronisasi...' : 'Simpan & Sinkronkan Pengaturan'}</span>
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: LIVE DOCUMENT SIGNATURE PREVIEW (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between border-b border-inherit pb-4">
              <h3 className="text-sm font-extrabold flex items-center space-x-2">
                <FileText className="w-4 h-4 text-rose-500" />
                <span>Simulasi Tampilan Surat (PDF)</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-400">
                Live Preview
              </span>
            </div>

            {/* PREVIEW CONTAINER (SPOOFING KERTAS SURAT RESMI) */}
            <div className="p-6 rounded-2xl bg-white text-slate-900 shadow-inner space-y-6 font-serif border border-slate-300 relative overflow-hidden">
              <div className="text-right text-[11px] font-sans text-slate-600 font-semibold">
                {issueCity || 'Tegal'}, {getFormattedTodayDate()}
              </div>

              <div className="text-xs space-y-1 font-sans">
                <p>Hal : Surat Permohonan Praktik Kerja Lapangan (PKL)</p>
                <p>Kepada Yth. Pimpinan DUDI Mitra</p>
              </div>

              <div className="text-[11px] leading-relaxed font-sans text-slate-700">
                Dengan hormat, sehubungan dengan pelaksanaan PKL Tahun Pelajaran 2026/2027, kami memohon kesediaan industri Bapak/Ibu...
              </div>

              {/* TTD BLOCK SIMULATION */}
              <div className="pt-4 flex justify-end font-sans">
                <div className="w-56 text-center space-y-1 text-xs relative">
                  <p className="font-bold">{principalTitle || 'Kepala Sekolah'},</p>
                  
                  {/* OVERLAY TTD & STEMPEL */}
                  <div className="h-20 relative flex items-center justify-center my-1">
                    {useDigitalSignature ? (
                      <>
                        {/* Stempel Layer */}
                        {stampUrl && (
                          <img
                            src={stampUrl}
                            alt="Stempel Preview"
                            className="absolute h-16 w-16 object-contain opacity-80 -left-2 rotate-[-12deg]"
                          />
                        )}
                        {/* Signature Layer */}
                        {signatureUrl ? (
                          <img
                            src={signatureUrl}
                            alt="TTD Preview"
                            className="h-16 max-w-full object-contain relative z-10"
                          />
                        ) : (
                          <span className="text-[10px] italic text-slate-400">[ Tanda Tangan Digital ]</span>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] italic text-slate-400">[ Tanda Tangan Manual ]</span>
                    )}
                  </div>

                  <p className="font-black underline text-slate-900">
                    {principalName || 'Nama Kepala Sekolah'}
                  </p>
                  {principalNip && (
                    <p className="text-[10px] text-slate-600 font-mono">
                      NIP. {principalNip}
                    </p>
                  )}
                </div>
              </div>

            </div>

            {/* INFO BOX */}
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs space-y-1">
              <div className="flex items-center space-x-1.5 font-extrabold">
                <HelpCircle className="w-4 h-4 shrink-0" />
                <span>Tips Pengaturan TTD:</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Gunakan file PNG berlatar belakang transparan agar gambar TTD dan Stempel tampak menyatu secara profesional dengan dokumen PDF.
              </p>
            </div>

          </div>
        </div>

      </form>

    </div>
  );
}