// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Menambahkan fitur Paste Gambar Clipboard (Ctrl+V / Copy Image Direct Paste) pada area upload logo sekolah.
// ✨ Fitur Baru: Clipboard Image Event Hydration & Instant Base64/Blob Preview Engine.
// 🎨 UI/UX Update: Area drop/paste interaktif dengan petunjuk visual shortcut keyboard (Ctrl+V).
// 🔧 Bug Fix: Mencegah admin kerepotan menyimpan file gambar secara manual ke harddisk sebelum mengunggah.
// 🚀 Inovasi: Triple Input Logo Pipeline (File Upload, Clipboard Paste, & URL Paste).
// ----------------------------------------------------------------------

'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  Save, 
  RefreshCw, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  GraduationCap, 
  Loader2,
  ArrowLeft,
  Database,
  Upload,
  Link2,
  ClipboardCheck,
  Clipboard
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';

export default function SchoolSettingsPage() {
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Mode Input Logo: 'UPLOAD' | 'URL'
  const [logoInputMode, setLogoInputMode] = useState<'UPLOAD' | 'URL'>('UPLOAD');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: 'SMK Negeri 1 Adiwerna',
    shortName: 'SMKN 1 Adiwerna',
    logoUrl: '/images/logo-sekolah.png',
    address: 'Jl. Raya Adiwerna No. 15, Kabupaten Tegal',
    phone: '(0283) 442192',
    email: 'info@smkn1adiwerna.sch.id',
    headmaster: 'Drs. Joko Purnomo, M.Pd.',
    headmasterNip: '196805121994031004',
    accreditation: 'A (Unggul)'
  });

  const fetchSchoolSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/school?t=' + new Date().getTime());
      const json = await res.json();
      if (json.data) {
        setForm({
          name: json.data.name || '',
          shortName: json.data.shortName || '',
          logoUrl: json.data.logoUrl || '/images/logo-sekolah.png',
          address: json.data.address || '',
          phone: json.data.phone || '',
          email: json.data.email || '',
          headmaster: json.data.headmaster || '',
          headmasterNip: json.data.headmasterNip || '',
          accreditation: json.data.accreditation || 'A (Unggul)'
        });
      }
    } catch (err) {
      console.error('Error fetching school settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchoolSettings();
  }, []);

  // 🌟 HELPER PROCESS PASTE FILE (CONVERT BLOB TO FILE)
  const processImageFile = useCallback((file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setStatusMsg({ type: 'error', text: 'Ukuran file logo maksimal 5MB.' });
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setStatusMsg({ type: 'success', text: 'Gambar dari Clipboard berhasil disisipkan!' });
  }, []);

  // 🌟 PASTE EVENT LISTENER UNTUK CLIPBOARD (CTRL + V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (logoInputMode !== 'UPLOAD') return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const pastedFile = new File([blob], `pasted-logo-${Date.now()}.png`, { type: blob.type });
            processImageFile(pastedFile);
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [logoInputMode, processImageFile]);

  // Handle Pilih File Manual
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Handle Form Submit (Multipart / JSON Handler)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    try {
      let res;
      if (logoInputMode === 'UPLOAD' && selectedFile) {
        const formData = new FormData();
        formData.append('logoFile', selectedFile);
        formData.append('name', form.name);
        formData.append('shortName', form.shortName);
        formData.append('logoUrl', form.logoUrl);
        formData.append('address', form.address);
        formData.append('phone', form.phone);
        formData.append('email', form.email);
        formData.append('headmaster', form.headmaster);
        formData.append('headmasterNip', form.headmasterNip);
        formData.append('accreditation', form.accreditation);

        res = await fetch('/api/settings/school', {
          method: 'POST',
          body: formData
        });
      } else {
        res = await fetch('/api/settings/school', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
      }

      const json = await res.json();

      if (res.ok && json.success) {
        setStatusMsg({ type: 'success', text: 'Identitas & Logo Sekolah berhasil disimpan secara PERMANEN!' });
        if (json.data?.logoUrl) {
          setForm((prev) => ({ ...prev, logoUrl: json.data.logoUrl }));
        }
        setSelectedFile(null);
        setFilePreview(null);
      } else {
        setStatusMsg({ type: 'error', text: json.error || 'Gagal menyimpan perubahan.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Terjadi kesalahan jaringan saat menyimpan.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-[80vh] flex flex-col justify-center items-center space-y-4 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Memuat Data Pengaturan Identitas Sekolah...</p>
      </div>
    );
  }

  const activeLogoDisplay = filePreview || form.logoUrl;

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-900'
    }`}>
      
      {/* HEADER BANNER */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="space-y-2">
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center space-x-2 text-xs font-bold text-indigo-500 hover:underline mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Dashboard Admin</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center space-x-3">
            <Building2 className="w-8 h-8 text-indigo-500" />
            <span>Pengaturan Identitas & Logo Sekolah</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Atur nama instansi dan logo sekolah (Upload File PNG, Paste Gambar Clipboard, atau Paste Tautan URL).
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSchoolSettings}
          className="px-4 py-2.5 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold flex items-center space-x-2 shrink-0 cursor-pointer transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reload Data</span>
        </button>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center space-x-2 ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* FORM PENGATURAN */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* SISI KIRI: PANEL PENGATURAN LOGO (TRIPLE INPUT MODE) */}
        <div className={`lg:col-span-5 p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="border-b border-inherit pb-4 flex items-center justify-between">
            <h3 className="text-base font-extrabold flex items-center space-x-2">
              <ImageIcon className="w-5 h-5 text-indigo-500" />
              <span>Logo Sekolah</span>
            </h3>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center space-x-1">
              <Database className="w-3 h-3" />
              <span>Persistent Storage</span>
            </span>
          </div>

          {/* BOX LIVE PREVIEW LOGO */}
          <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-4">
            <div className="w-36 h-36 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-4 flex items-center justify-center relative group">
              <img 
                src={activeLogoDisplay} 
                alt="Logo Sekolah" 
                className="max-w-full max-h-full object-contain drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                onError={(e: any) => {
                  e.target.onerror = null;
                  e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/1/15/Logo_SMK_Negeri_1_Adiwerna.png';
                }}
              />
            </div>
            <div className="text-center space-y-1">
              <span className="text-xs font-bold text-emerald-400">{form.shortName || 'SMKN 1 Adiwerna'}</span>
              <p className="text-[10px] text-slate-500">Preview Logo Aktif</p>
            </div>
          </div>

          {/* TAB SWITCHER MODE INPUT LOGO */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Pilih Metode Input Logo:
            </label>
            <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setLogoInputMode('UPLOAD')}
                className={`py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  logoInputMode === 'UPLOAD'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload / Paste Gambar</span>
              </button>

              <button
                type="button"
                onClick={() => setLogoInputMode('URL')}
                className={`py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  logoInputMode === 'URL'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Paste URL Logo</span>
              </button>
            </div>
          </div>

          {/* MODE 1: UPLOAD FILE LOKAL ATAU PASTE CLIPBOARD (CTRL+V) */}
          {logoInputMode === 'UPLOAD' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Upload File ATAU Paste Gambar dari Clipboard:
              </label>
              
              <div className="relative border-2 border-dashed border-indigo-500/50 hover:border-indigo-400 rounded-3xl p-6 text-center space-y-3 transition-all cursor-pointer bg-indigo-500/5 hover:bg-indigo-500/10">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 w-fit mx-auto border border-indigo-500/20">
                  <Clipboard className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-extrabold text-slate-200">
                    {selectedFile ? selectedFile.name : 'Klik untuk Unggah ATAU Tekan CTRL + V di Sini'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    💡 **Tips Cepat:** Lakukan <i>Right Click → Copy Image</i> pada gambar di mana saja, lalu tekan <code>Ctrl + V</code> di halaman ini.
                  </p>
                </div>

                {selectedFile && (
                  <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    <ClipboardCheck className="w-3 h-3" />
                    <span>Gambar Terdeteksi & Siap Disimpan</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* MODE 2: PASTE URL TAUTAN GAMBAR */}
          {logoInputMode === 'URL' && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Paste Tautan URL Gambar Logo
              </label>
              <input
                type="text"
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https:// domain.com/logo.png atau /images/logo.png"
                className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                }`}
              />
            </div>
          )}

        </div>

        {/* SISI KANAN: FIELD FORM IDENTITAS SEKOLAH */}
        <div className={`lg:col-span-7 p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="border-b border-inherit pb-4 flex justify-between items-center">
            <div>
              <h3 className="text-base font-extrabold flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-indigo-500" />
                <span>Form Identitas Resmi Sekolah</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">Lengkapi informasi sekolah untuk kop surat dan header portal.</p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Menyimpan...' : 'Simpan Permanen'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Nama Lengkap Sekolah
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="SMK Negeri 1 Adiwerna"
                className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold border outline-none ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Nama Singkat / Akronim
              </label>
              <input
                type="text"
                required
                value={form.shortName}
                onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                placeholder="SMKN 1 Adiwerna"
                className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold border outline-none ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Akreditasi Sekolah
              </label>
              <input
                type="text"
                value={form.accreditation}
                onChange={(e) => setForm({ ...form, accreditation: e.target.value })}
                placeholder="A (Unggul)"
                className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold border outline-none ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                }`}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Alamat Lengkap Sekolah
              </label>
              <textarea
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Jl. Raya Adiwerna No. 15, Kabupaten Tegal..."
                className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold border outline-none ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Nomor Telepon Kantor
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(0283) 442192"
                className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold border outline-none ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Email Resmi Sekolah
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="info@smkn1adiwerna.sch.id"
                className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold border outline-none ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Nama Kepala Sekolah
              </label>
              <input
                type="text"
                value={form.headmaster}
                onChange={(e) => setForm({ ...form, headmaster: e.target.value })}
                placeholder="Drs. Joko Purnomo, M.Pd."
                className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold border outline-none ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                NIP Kepala Sekolah
              </label>
              <input
                type="text"
                value={form.headmasterNip}
                onChange={(e) => setForm({ ...form, headmasterNip: e.target.value })}
                placeholder="196805121994031004"
                className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold border outline-none ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                }`}
              />
            </div>

          </div>
        </div>

      </form>

    </div>
  );
}