// 📋 CHANGELOG:
// ✅ Perubahan: Membangun antarmuka Update Profil Siswa dengan fitur unggah & live preview dokumen PDF/Gambar untuk CV dan Kartu BPJS Ketenagakerjaan.
// ✨ Fitur Baru: Interactive Modal Document Viewer, Live Base64 Document Sync, & Document Verification Status Tracker.
// 🎨 UI/UX Update: Badges status interaktif, animasi modal backdrop-blur, layout responsif 2 kolom, dan tombol pratinjau live.
// 🔧 Bug Fix: Mengamankan tipe file maksimum 5MB dan mencegah form reload saat pratinjau dokumen dibuka.
// 🚀 Inovasi: Enterprise Portfolio & Student Document Management Center.

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { 
  User, 
  FileText, 
  Upload, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Save, 
  Loader2, 
  ArrowLeft,
  GraduationCap,
  Users,
  FileCheck2,
  X,
  ExternalLink
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';

export default function StudentProfilePage() {
  const { status } = useSession();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // State Form Data Diri
  const [nis, setNis] = useState('');
  const [nisn, setNisn] = useState('');
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentRelation, setParentRelation] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  // State Status & URL Dokumen
  const [bpjsStatus, setBpjsStatus] = useState('BELUM_UPLOAD');
  const [bpjsUrl, setBpjsUrl] = useState<string | null>(null);
  const [cvStatus, setCvStatus] = useState('BELUM_UPLOAD');
  const [cvUrl, setCvUrl] = useState<string | null>(null);

  // State File Upload Baru (Base64)
  const [newBpjsBase64, setNewBpjsBase64] = useState<string | null>(null);
  const [newCvBase64, setNewCvBase64] = useState<string | null>(null);

  // State Modal Pratinjau Dokumen
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [activePreviewTitle, setActivePreviewTitle] = useState<string>('');

  const bpjsInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);

  // Ambil Data Profil Terbaru dari Database
  const fetchProfile = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/students/profile');
      const json = await res.json();

      if (res.ok && json.success) {
        const data = json.data;
        setNis(data.nis || '');
        setNisn(data.nisn || '');
        setName(data.name || '');
        setClassName(data.className || '');
        setDepartment(data.department || '');
        setPhone(data.phone || '');
        setParentName(data.parentName || '');
        setParentRelation(data.parentRelation || 'Orang Tua / Wali');
        setParentPhone(data.parentPhone || '');
        
        setBpjsStatus(data.bpjsStatus || 'BELUM_UPLOAD');
        setBpjsUrl(data.bpjsUrl || null);
        
        setCvStatus(data.cvStatus || 'BELUM_UPLOAD');
        setCvUrl(data.cvUrl || null);
      } else {
        setErrorMsg(json.error || 'Gagal memuat data profil siswa.');
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setErrorMsg('Terjadi kesalahan jaringan saat memuat profil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProfile();
    }
  }, [status]);

  // Handler Konversi File ke Data URL Base64
  const handleFileConvert = (file: File, callback: (base64: string) => void) => {
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file tidak boleh melebihi 5MB!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        callback(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBpjsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileConvert(file, (base64) => {
        setNewBpjsBase64(base64);
        setBpjsUrl(base64);
        setBpjsStatus('MENUNGGU_VERIFIKASI');
      });
    }
  };

  const handleCvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileConvert(file, (base64) => {
        setNewCvBase64(base64);
        setCvUrl(base64);
        setCvStatus('MENUNGGU_VERIFIKASI');
      });
    }
  };

  // Submit Perubahan Data ke Backend
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload: any = {
        name,
        nisn,
        phone,
        parentName,
        parentRelation,
        parentPhone
      };

      if (newBpjsBase64) payload.bpjsUrl = newBpjsBase64;
      if (newCvBase64) payload.cvUrl = newCvBase64;

      const res = await fetch('/api/students/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setSuccessMsg(json.message || 'Profil dan dokumen Anda berhasil diperbarui!');
        setNewBpjsBase64(null);
        setNewCvBase64(null);
        fetchProfile();
      } else {
        setErrorMsg(json.error || 'Gagal menyimpan perubahan profil.');
      }
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setErrorMsg('Terjadi kesalahan koneksi saat menyimpan profil.');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-screen p-8 flex flex-col justify-center items-center space-y-4 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-400">Memuat Profil & Berkas Siswa...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* BANNER HEADER */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center space-x-1.5 w-fit">
            <User className="w-3.5 h-3.5" />
            <span>Pusat Data Profil & Berkas Prakerin</span>
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Update Profil & Dokumen 📄</h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Lengkapi identitas diri, kontak orang tua, serta unggah dokumen CV dan Kartu BPJS Ketenagakerjaan Anda secara terpusat.
          </p>
        </div>

        <Link
          href="/dashboard/students"
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>

      {/* ALERT NOTIFIKASI */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* KOLOM UTAMA: FORM DATA SISWA & ORANG TUA */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* SECTION 1: IDENTITAS DIRI & AKADEMIK */}
          <div className={`p-8 rounded-3xl border shadow-xl space-y-6 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center space-x-3 border-b border-inherit pb-4">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Identitas Akademik</h3>
                <p className="text-xs text-slate-400">NIS, Kelas, dan Jurusan dikunci oleh pihak pengelola sekolah.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase">NIS (Nomor Induk Siswa)</label>
                <input
                  type="text"
                  value={nis}
                  disabled
                  className="w-full px-4 py-3 rounded-2xl border bg-slate-950/50 border-slate-800 text-slate-400 font-mono font-bold cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase">NISN (Nomor Induk Siswa Nasional)</label>
                <input
                  type="text"
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value)}
                  placeholder="Masukkan NISN"
                  className={`w-full px-4 py-3 rounded-2xl border outline-none font-semibold transition-all ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="font-bold text-slate-400 uppercase">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={`w-full px-4 py-3 rounded-2xl border outline-none font-semibold transition-all ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase">Kelas</label>
                <input
                  type="text"
                  value={className}
                  disabled
                  className="w-full px-4 py-3 rounded-2xl border bg-slate-950/50 border-slate-800 text-slate-400 font-bold cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase">Jurusan</label>
                <input
                  type="text"
                  value={department}
                  disabled
                  className="w-full px-4 py-3 rounded-2xl border bg-slate-950/50 border-slate-800 text-slate-400 font-bold cursor-not-allowed"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="font-bold text-slate-400 uppercase">Nomor WhatsApp / HP Siswa</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  required
                  className={`w-full px-4 py-3 rounded-2xl border outline-none font-semibold transition-all ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: DATA ORANG TUA / WALI */}
          <div className={`p-8 rounded-3xl border shadow-xl space-y-6 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center space-x-3 border-b border-inherit pb-4">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Kontak Orang Tua / Wali</h3>
                <p className="text-xs text-slate-400">Diperlukan untuk komunikasi darurat tim Pokja.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase">Nama Orang Tua / Wali</label>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="Masukkan Nama Orang Tua/Wali"
                  className={`w-full px-4 py-3 rounded-2xl border outline-none font-semibold transition-all ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase">Hubungan Keluarga</label>
                <input
                  type="text"
                  value={parentRelation}
                  onChange={(e) => setParentRelation(e.target.value)}
                  placeholder="Contoh: Ayah / Ibu / Wali"
                  className={`w-full px-4 py-3 rounded-2xl border outline-none font-semibold transition-all ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="font-bold text-slate-400 uppercase">Nomor Telepon Orang Tua / Wali</label>
                <input
                  type="text"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="Contoh: 081987654321"
                  className={`w-full px-4 py-3 rounded-2xl border outline-none font-semibold transition-all ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                  }`}
                />
              </div>
            </div>
          </div>

        </div>

        {/* KOLOM SAMPING: MANAJEMEN BERKAS CV & BPJS */}
        <div className="space-y-8">
          
          <div className={`p-8 rounded-3xl border shadow-xl space-y-6 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center space-x-3 border-b border-inherit pb-4">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Unggah Berkas</h3>
                <p className="text-xs text-slate-400">CV & BPJS Ketenagakerjaan.</p>
              </div>
            </div>

            {/* DOKUMEN 1: CV / RESUME */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-300">1. Curriculum Vitae (CV)</span>
                {cvStatus === 'DISETUJUI' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                )}
                {cvStatus === 'MENUNGGU_VERIFIKASI' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Review</span>
                  </span>
                )}
                {(cvStatus === 'BELUM_UPLOAD' || cvStatus === 'DITOLAK') && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    Belum Upload
                  </span>
                )}
              </div>

              <input
                type="file"
                ref={cvInputRef}
                onChange={handleCvChange}
                accept=".pdf,image/*"
                className="hidden"
              />

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => cvInputRef.current?.click()}
                  className="flex-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{cvUrl ? 'Ganti File CV' : 'Unggah File CV'}</span>
                </button>

                {cvUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setActivePreviewUrl(cvUrl);
                      setActivePreviewTitle('Pratinjau Curriculum Vitae (CV)');
                    }}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
                    title="Pratinjau CV"
                  >
                    <Eye className="w-4 h-4 text-emerald-400" />
                  </button>
                )}
              </div>
            </div>

            {/* DOKUMEN 2: BPJS KETENAGAKERJAAN */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-300">2. Kartu BPJS TK</span>
                {bpjsStatus === 'DISETUJUI' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                )}
                {bpjsStatus === 'MENUNGGU_VERIFIKASI' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Review</span>
                  </span>
                )}
                {(bpjsStatus === 'BELUM_UPLOAD' || bpjsStatus === 'DITOLAK') && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    Belum Upload
                  </span>
                )}
              </div>

              <input
                type="file"
                ref={bpjsInputRef}
                onChange={handleBpjsChange}
                accept=".pdf,image/*"
                className="hidden"
              />

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => bpjsInputRef.current?.click()}
                  className="flex-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{bpjsUrl ? 'Ganti Kartu BPJS' : 'Unggah Kartu BPJS'}</span>
                </button>

                {bpjsUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setActivePreviewUrl(bpjsUrl);
                      setActivePreviewTitle('Pratinjau Kartu BPJS Ketenagakerjaan');
                    }}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
                    title="Pratinjau BPJS"
                  >
                    <Eye className="w-4 h-4 text-emerald-400" />
                  </button>
                )}
              </div>
            </div>

            {/* TOMBOL SIMPAN KESELURUHAN */}
            <div className="pt-4 border-t border-inherit">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-2xl text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Perubahan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Profil & Berkas</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>

      </form>

      {/* MODAL PRATINJAU DOKUMEN LIVE INTERAKTIF */}
      {activePreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            
            <div className="p-5 border-b border-inherit flex justify-between items-center">
              <h3 className="font-bold text-sm text-indigo-400 flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>{activePreviewTitle}</span>
              </h3>
              <button
                type="button"
                onClick={() => setActivePreviewUrl(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-auto flex justify-center items-center bg-slate-950/60 min-h-[400px]">
              {activePreviewUrl.startsWith('data:application/pdf') || activePreviewUrl.endsWith('.pdf') ? (
                <iframe
                  src={activePreviewUrl}
                  className="w-full h-[550px] rounded-2xl border border-slate-800"
                  title="PDF Preview"
                />
              ) : (
                <img
                  src={activePreviewUrl}
                  alt="Document Preview"
                  className="max-w-full max-h-[550px] object-contain rounded-2xl border border-slate-800 shadow-lg"
                />
              )}
            </div>

            <div className="p-4 border-t border-inherit flex justify-end space-x-3">
              <a
                href={activePreviewUrl}
                download="dokumen_sierin"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Unduh Berkas</span>
              </a>
              <button
                type="button"
                onClick={() => setActivePreviewUrl(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}