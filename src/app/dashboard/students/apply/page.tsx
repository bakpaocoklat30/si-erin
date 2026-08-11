// 📋 CHANGELOG:
// ✅ Perubahan: Membangun Antarmuka Pengajuan PKL Siswa dengan 6-Step Visual Timeline Progress Tracker, Fitur Unduh Surat Tugas (Tahap 4/5), dan Live Upload/Preview Surat Balasan Industri (Tahap 6).
// ✨ Fitur Baru: 6-Step Visual Stepper Progress, Download Official Request Letter, & Industry Reply Upload Vault with Live Modal Preview.
// 🎨 UI/UX Update: Dynamic active step highlight, micro-animations, theme-adaptive dark/light mode, and badge indicators.
// 🔧 Bug Fix: Mengamankan pembacaan properti status 6 tahap dengan optional chaining untuk mencegah crash UI.
// 🚀 Inovasi: Enterprise Interactive Student PKL Placement Hub.

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, 
  Send, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  Search, 
  MapPin, 
  Phone, 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  FileText, 
  Calendar, 
  Check, 
  Download, 
  Upload, 
  Eye, 
  X, 
  ExternalLink,
  FileCheck2,
  FileSearch,
  MailCheck,
  SendHorizontal
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';

export default function StudentApplyPage() {
  const { status } = useSession();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingBalasan, setUploadingBalasan] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [activePlacement, setActivePlacement] = useState<any>(null);
  const [industries, setIndustries] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State Pengajuan
  const [selectedIndustry, setSelectedIndustry] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  // Modal Preview State
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [activePreviewTitle, setActivePreviewTitle] = useState<string>('');

  const balasanInputRef = useRef<HTMLInputElement>(null);

  // Fetch Data Pengajuan Siswa
  const fetchApplyData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/students/apply');
      const json = await res.json();

      if (res.ok && json.success) {
        setStudentInfo(json.data.student);
        setActivePlacement(json.data.activePlacement);
        setIndustries(json.data.industries || []);
        
        const today = new Date();
        const defaultStart = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().split('T')[0];
        const defaultEnd = new Date(today.getFullYear(), today.getMonth() + 4, 0).toISOString().split('T')[0];
        setStartDate(defaultStart);
        setEndDate(defaultEnd);
      } else {
        setErrorMsg(json.error || 'Gagal memuat data pengajuan.');
      }
    } catch (err: any) {
      console.error('Error fetching apply data:', err);
      setErrorMsg('Terjadi kesalahan koneksi saat memuat data katalog industri.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchApplyData();
    }
  }, [status]);

  // Filter Katalog Industri
  const filteredIndustries = useMemo(() => {
    return industries.filter((ind) => {
      const matchName = ind.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchAddress = ind.address?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSector = ind.sector?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchName || matchAddress || matchSector;
    });
  }, [industries, searchTerm]);

  // Submit Pengajuan Tempat PKL (Tahap 1)
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIndustry) {
      setErrorMsg('Silakan pilih salah satu industri dari katalog terlebih dahulu!');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/students/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industryId: selectedIndustry.id,
          startDate,
          endDate,
          notes
        })
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setSuccessMsg(json.message || 'Pengajuan tempat PKL Anda berhasil dikirim!');
        setSelectedIndustry(null);
        fetchApplyData();
      } else {
        setErrorMsg(json.error || 'Gagal mengirim pengajuan.');
      }
    } catch (err: any) {
      console.error('Error submitting application:', err);
      setErrorMsg('Terjadi kesalahan jaringan saat mengirim pengajuan.');
    } finally {
      setSubmitting(false);
    }
  };

  // Upload Surat Balasan Industri (Tahap 6)
  const handleBalasanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file surat balasan maksimal adalah 5MB!');
      return;
    }

    setUploadingBalasan(true);
    setErrorMsg('');
    setSuccessMsg('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;

      try {
        const res = await fetch('/api/students/apply', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ suratBalasanUrl: base64 })
        });

        const json = await res.json();

        if (res.ok && json.success) {
          setSuccessMsg(json.message || 'Surat balasan industri berhasil diunggah!');
          fetchApplyData();
        } else {
          setErrorMsg(json.error || 'Gagal mengunggah surat balasan.');
        }
      } catch (err: any) {
        console.error('Error uploading reply letter:', err);
        setErrorMsg('Terjadi kesalahan koneksi saat mengunggah surat balasan.');
      } finally {
        setUploadingBalasan(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-screen p-8 flex flex-col justify-center items-center space-y-4 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-400">Memuat Status Pengajuan & Katalog Industri...</p>
      </div>
    );
  }

  const isEligible = studentInfo?.isAllowedPkl && studentInfo?.cvUrl && studentInfo?.bpjsUrl;

  // Hitung nomor langkah aktif (1-6) berdasarkan status backend
  const getStepNumber = (statusStr: string) => {
    switch (statusStr) {
      case 'PENGAJUAN_DIKIRIM': return 1;
      case 'REVIEW_POKJA': return 2;
      case 'PEMBUATAN_SURAT': return 3;
      case 'SURAT_DITERBITKAN': return 4;
      case 'KIRIM_SURAT': return 5;
      case 'DISETUJUI_INDUSTRI':
      case 'DITOLAK_INDUSTRI': return 6;
      default: return 1;
    }
  };

  const currentStep = activePlacement ? getStepNumber(activePlacement.status) : 0;

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
            <Send className="w-3.5 h-3.5" />
            <span>Portal Pengajuan Tempat PKL</span>
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Pengajuan Prakerin 🏢</h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Pilih industri mitra (DUDI), pantau 6 alur verifikasi surat permohonan, serta unggah surat balasan penerimaan dari perusahaan secara real-time.
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

      {/* NOTIFIKASI ERROR / SUCCESS */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* SYARAT KELAYAKAN CHECKER */}
      {!isEligible && (
        <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 space-y-3">
          <div className="flex items-center space-x-2 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Persyaratan Pengajuan PKL Belum Lengkap</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Sebelum dapat mengajukan tempat PKL, Anda wajib memenuhi 3 persyaratan utama berikut:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
            <div className={`p-3 rounded-2xl border flex items-center space-x-2 ${
              studentInfo?.isAllowedPkl ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-950/60 border-slate-800 text-slate-400'
            }`}>
              {studentInfo?.isAllowedPkl ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              <span>1. Izin PKL dari Pokja</span>
            </div>
            <div className={`p-3 rounded-2xl border flex items-center space-x-2 ${
              studentInfo?.cvUrl ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-950/60 border-slate-800 text-slate-400'
            }`}>
              {studentInfo?.cvUrl ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              <span>2. Unggah File CV</span>
            </div>
            <div className={`p-3 rounded-2xl border flex items-center space-x-2 ${
              studentInfo?.bpjsUrl ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-950/60 border-slate-800 text-slate-400'
            }`}>
              {studentInfo?.bpjsUrl ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              <span>3. Unggah Kartu BPJS</span>
            </div>
          </div>
          {(!studentInfo?.cvUrl || !studentInfo?.bpjsUrl) && (
            <div className="pt-2">
              <Link
                href="/dashboard/students/profile"
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs shadow-md hover:bg-amber-500 transition-all"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Lengkapi Profil & Berkas Sekarang</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 🧭 VISUAL 6-STEP TIMELINE TRACKER PROGRESS */}
      {activePlacement && (
        <div className={`p-8 rounded-3xl border shadow-xl space-y-8 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-inherit pb-6">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Industri Tujuan PKL</span>
              <h3 className="text-2xl font-black text-indigo-400">{activePlacement.industry?.name}</h3>
              <p className="text-xs text-slate-400">{activePlacement.industry?.address}</p>
            </div>

            <div className="flex items-center space-x-3">
              {/* TOMBOL UNDUH SURAT TUGAS (Mulai dari Tahap 4) */}
              {currentStep >= 4 && activePlacement.suratTugasUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setActivePreviewUrl(activePlacement.suratTugasUrl);
                    setActivePreviewTitle(`Surat Tugas / Permohonan PKL - ${activePlacement.industry?.name}`);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Surat Tugas</span>
                </button>
              )}

              <span className={`px-4 py-2 rounded-full text-xs font-extrabold border ${
                activePlacement.status === 'DISETUJUI_INDUSTRI'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : activePlacement.status === 'DITOLAK_INDUSTRI'
                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                TAHAP {currentStep}/6: {activePlacement.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* STEPPER PROGRESS BAR (6 TAHAPAN) */}
          <div className="space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Progres Tahapan Alur Pengajuan (1 - 6):</h4>
            
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              
              {/* STEP 1: Pengajuan Dikirim */}
              <div className={`p-4 rounded-2xl border space-y-2 transition-all ${
                currentStep >= 1 ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300' : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] font-bold">01</span>
                  {currentStep >= 1 && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </div>
                <div className="font-bold text-xs leading-snug">Pengajuan Dikirim</div>
                <p className="text-[10px] opacity-75">Siswa memilih DUDI</p>
              </div>

              {/* STEP 2: Review Pokja */}
              <div className={`p-4 rounded-2xl border space-y-2 transition-all ${
                currentStep >= 2 ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300' : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] font-bold">02</span>
                  {currentStep >= 2 && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </div>
                <div className="font-bold text-xs leading-snug">Review Pokja</div>
                <p className="text-[10px] opacity-75">Verifikasi berkas oleh Pokja</p>
              </div>

              {/* STEP 3: Pembuatan Surat */}
              <div className={`p-4 rounded-2xl border space-y-2 transition-all ${
                currentStep >= 3 ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300' : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] font-bold">03</span>
                  {currentStep >= 3 && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </div>
                <div className="font-bold text-xs leading-snug">Pembuatan Surat</div>
                <p className="text-[10px] opacity-75">Proses cetak surat permohonan</p>
              </div>

              {/* STEP 4: Surat Tugas Diterbitkan */}
              <div className={`p-4 rounded-2xl border space-y-2 transition-all ${
                currentStep >= 4 ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300' : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] font-bold">04</span>
                  {currentStep >= 4 && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </div>
                <div className="font-bold text-xs leading-snug">Surat Diterbitkan</div>
                <p className="text-[10px] opacity-75">Siap diunduh siswa</p>
              </div>

              {/* STEP 5: Kirim Surat ke Industri */}
              <div className={`p-4 rounded-2xl border space-y-2 transition-all ${
                currentStep >= 5 ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300' : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] font-bold">05</span>
                  {currentStep >= 5 && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </div>
                <div className="font-bold text-xs leading-snug">Kirim ke DUDI</div>
                <p className="text-[10px] opacity-75">Penyerahan ke industri</p>
              </div>

              {/* STEP 6: Upload Balasan Industri */}
              <div className={`p-4 rounded-2xl border space-y-2 transition-all ${
                currentStep >= 6 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] font-bold">06</span>
                  {currentStep >= 6 && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <div className="font-bold text-xs leading-snug">Upload Balasan</div>
                <p className="text-[10px] opacity-75">Unggah bukti penerimaan</p>
              </div>

            </div>
          </div>

          {/* AREA UNGGAH SURAT BALASAN INDUSTRI (TAHAP 5 & 6) */}
          {currentStep >= 4 && (
            <div className="p-6 rounded-3xl bg-slate-950/60 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-indigo-400 flex items-center space-x-2">
                    <MailCheck className="w-4 h-4" />
                    <span>Unggah Surat Balasan / Jawaban dari Industri (DUDI)</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Setelah menyerahkan Surat Tugas ke perusahaan, unggah foto/PDF surat balasan resmi dari DUDI di sini.
                  </p>
                </div>

                <input
                  type="file"
                  ref={balasanInputRef}
                  onChange={handleBalasanUpload}
                  accept=".pdf,image/*"
                  className="hidden"
                />

                <div className="flex items-center space-x-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => balasanInputRef.current?.click()}
                    disabled={uploadingBalasan}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                  >
                    {uploadingBalasan ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>{activePlacement.suratBalasanUrl ? 'Ganti Surat Balasan' : 'Unggah Surat Balasan'}</span>
                      </>
                    )}
                  </button>

                  {activePlacement.suratBalasanUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setActivePreviewUrl(activePlacement.suratBalasanUrl);
                        setActivePreviewTitle(`Surat Balasan Industri - ${activePlacement.industry?.name}`);
                      }}
                      className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
                      title="Pratinjau Surat Balasan"
                    >
                      <Eye className="w-4 h-4 text-emerald-400" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* SECTION KATALOG & FORM PENGAJUAN PENEMPATAN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* KATALOG INDUSTRI MITRA */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h3 className="font-extrabold text-lg flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <span>Katalog Industri Mitra (DUDI)</span>
              </h3>
              <p className="text-xs text-slate-400">Pilih salah satu perusahaan yang kuotanya masih tersedia.</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama/alamat industri..."
                className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-semibold border outline-none ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-800 focus:border-indigo-500' : 'bg-white border-slate-200 focus:border-indigo-500'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredIndustries.length > 0 ? (
              filteredIndustries.map((ind) => {
                const isSelected = selectedIndustry?.id === ind.id;
                const isFull = ind.remainingQuota <= 0;

                return (
                  <div
                    key={ind.id}
                    onClick={() => {
                      if (!isFull && isEligible) setSelectedIndustry(ind);
                    }}
                    className={`p-6 rounded-3xl border shadow-lg space-y-4 transition-all relative overflow-hidden ${
                      isFull 
                        ? 'opacity-60 bg-slate-950/40 border-slate-800 cursor-not-allowed' 
                        : isSelected 
                          ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30 cursor-pointer' 
                          : theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-slate-700 cursor-pointer' : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">{ind.sector}</span>
                        <h4 className="font-extrabold text-base leading-snug">{ind.name}</h4>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border shrink-0 ${
                        isFull ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        Sisa Kuota: {ind.remainingQuota}/{ind.totalQuota}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-400">
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{ind.address}</span>
                      </div>
                      {ind.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{ind.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex justify-between items-center border-t border-inherit/40 text-xs">
                      <span className="text-slate-400 text-[11px]">HRD: {ind.contactPerson || '-'}</span>
                      {isSelected ? (
                        <span className="text-indigo-400 font-bold flex items-center space-x-1">
                          <Check className="w-4 h-4" />
                          <span>Terpilih</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 hover:text-indigo-400 font-semibold">
                          {isFull ? 'Kuota Penuh' : 'Pilih Industri'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="sm:col-span-2 p-10 text-center text-slate-400 rounded-3xl border border-slate-800 bg-slate-900/40">
                Tidak ada data industri yang sesuai dengan pencarian Anda.
              </div>
            )}
          </div>
        </div>

        {/* FORM PENGAJUAN PENEMPATAN */}
        <div className="space-y-6">
          <form onSubmit={handleApplySubmit} className={`p-8 rounded-3xl border shadow-xl space-y-6 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="border-b border-inherit pb-4 space-y-1">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <Send className="w-4 h-4 text-indigo-400" />
                <span>Form Pengajuan PKL</span>
              </h3>
              <p className="text-xs text-slate-400">Konfirmasi industri pilihan dan periode rencana PKL.</p>
            </div>

            {selectedIndustry ? (
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-1">
                <span className="text-[10px] uppercase font-bold text-indigo-400">Industri Pilihan:</span>
                <h4 className="font-extrabold text-base text-indigo-300">{selectedIndustry.name}</h4>
                <p className="text-xs text-slate-400">{selectedIndustry.address}</p>
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-dashed border-slate-800 text-center text-slate-400 text-xs space-y-2">
                <Building2 className="w-8 h-8 mx-auto text-slate-600" />
                <p>Silakan klik salah satu kartu industri di sebelah kiri untuk memilih tempat PKL.</p>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Rencana Tanggal Mulai PKL</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className={`w-full px-4 py-3 rounded-2xl border outline-none font-semibold ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Rencana Tanggal Selesai PKL</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className={`w-full px-4 py-3 rounded-2xl border outline-none font-semibold ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tuliskan catatan khusus atau permohonan ke Tim Pokja..."
                  className={`w-full p-4 rounded-2xl border outline-none font-semibold resize-none ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedIndustry || !isEligible}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-2xl text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirim Pengajuan...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Pengajuan (Tahap 1)</span>
                </>
              )}
            </button>
          </form>
        </div>

      </div>

      {/* MODAL LIVE PREVIEW DOKUMEN (SURAT TUGAS & SURAT BALASAN) */}
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
                  title="Document PDF Preview"
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
                download="dokumen_prakerin_sierin"
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