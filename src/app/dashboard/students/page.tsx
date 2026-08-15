// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Memperbarui kartu "Status Penempatan Industri (DUDI)" agar alur 6 tahap tetap akurat & menambahkan kartu khusus "Guru Pembimbing Sekolah".
// ✨ Fitur Baru: Dedicated School Mentorship Card with Direct Contact Info & Dual Mentor Display Pipeline.
// 🎨 UI/UX Update: Penyempurnaan indikator visual (badge warna, ikon status, & panduan langkah aksi) yang responsif pada mode Gelap maupun Terang.
// 🔧 Bug Fix: Menyelesaikan ketiadaan tampilan informasi Guru Pembimbing Sekolah di dashboard role siswa.
// 🚀 Inovasi: Real-Time Guided Student Prakerin Progression Tracker & Dual-Mentor Architecture.
// ----------------------------------------------------------------------

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  RefreshCw, 
  ShieldCheck, 
  Calendar, 
  Download, 
  Clock, 
  ExternalLink, 
  Send, 
  ArrowRight,
  Loader2,
  FileCheck2,
  HelpCircle,
  Map as MapIcon,
  X,
  UserCheck,
  Award,
  BookOpen
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';

export default function StudentDashboardPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [activePlacement, setActivePlacement] = useState<any>(null);
  const [lastRejectedPlacement, setLastRejectedPlacement] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // State Preview Modal Dokumen
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [activePreviewTitle, setActivePreviewTitle] = useState<string>('');

  // Fetch Data Dashboard Siswa dari API /api/students/apply
  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/students/apply?t=${timestamp}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setStudentInfo(json.data.student);
        setActivePlacement(json.data.activePlacement);
        setLastRejectedPlacement(json.data.lastRejectedPlacement);
      } else {
        setErrorMsg(json.error || 'Gagal memuat data profil & penempatan.');
      }
    } catch (err: any) {
      console.error('Error fetching student dashboard:', err);
      setErrorMsg('Terjadi kesalahan jaringan saat memuat data dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDashboardData();
    }
  }, [status]);

  // Helper Google Maps Opener
  const handleOpenGoogleMaps = (ind: any) => {
    if (!ind) return;
    const rawLat = ind.latitude ?? ind.lat;
    const rawLng = ind.longitude ?? ind.lng;

    const latStr = String(rawLat ?? '').trim();
    const lngStr = String(rawLng ?? '').trim();

    const isLatValid = latStr !== '' && latStr.toLowerCase() !== 'null' && latStr.toLowerCase() !== 'undefined';
    const isLngValid = lngStr !== '' && lngStr.toLowerCase() !== 'null' && lngStr.toLowerCase() !== 'undefined';

    let googleMapsUrl = '';
    if (isLatValid && isLngValid) {
      googleMapsUrl = `https://www.google.com/maps?q=${latStr},${lngStr}`;
    } else {
      const cleanAddress = [ind.address, ind.subDistrict, ind.regency].filter(Boolean).join(', ');
      const query = encodeURIComponent(cleanAddress || ind.name || 'Industri');
      googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
    
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
  };

  // 🎯 HELPER PEMETAAN INSTRUKSI DAN BADGE CONFIG BERDASARKAN STATUS PENGAJUAN
  const getStatusDisplayConfig = (placementStatus: string) => {
    switch (placementStatus) {
      case 'PENGAJUAN_DIKIRIM':
        return {
          badgeText: 'DIPROSES POKJA',
          badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
          icon: Clock,
          title: 'Pengajuan Telah Diterima Tim Pokja',
          instruction: 'Berkas pengajuan Anda sedang berada dalam antrean pemeriksaan oleh Tim Pokja Prakerin SMK. Mohon bersabar dan pantau halaman ini secara berkala.',
          nextStepText: 'Langkah Selanjutnya: Menunggu Verifikasi Berkas oleh Pokja',
          actionButton: null
        };

      case 'REVIEW_POKJA':
        return {
          badgeText: 'VERIFIKASI POKJA',
          badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
          icon: Clock,
          title: 'Verifikasi Persyaratan Akademik & Berkas',
          instruction: 'Tim Pokja sedang mencocokkan kelayakan akademik dan data profil CV Anda dengan kuota industri yang dipilih.',
          nextStepText: 'Langkah Selanjutnya: Menunggu Validasi Akhir Pokja',
          actionButton: null
        };

      case 'PEMBUATAN_SURAT':
        return {
          badgeText: 'PROSES CETAK SURAT',
          badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
          icon: FileText,
          title: 'Tim Pokja Sedang Penerbitan Surat Permohonan',
          instruction: 'Pengajuan Anda disetujui Pokja! Saat ini admin sedang menerbitkan Surat Permohonan Resmi yang ditandatangani Kepala Sekolah/Ketua Pokja.',
          nextStepText: 'Langkah Selanjutnya: Surat Permohonan Segera Diunggah Pokja',
          actionButton: null
        };

      case 'SURAT_DITERBITKAN':
        return {
          badgeText: 'SURAT READY DIUNDUH',
          badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
          icon: FileCheck2,
          title: 'Surat Permohonan PKL Telah Terbit!',
          instruction: 'Surat Permohonan resmi dari sekolah sudah tersedia. Silakan unduh berkas di bawah ini, cetak, dan bawa/kirimkan langsung ke pihak HRD industri mitra.',
          nextStepText: 'Langkah Selanjutnya: Cetak & Antar Surat Permohonan ke Industri',
          actionButton: 'DOWNLOAD_SURAT_PERMOHONAN'
        };

      case 'KIRIM_SURAT':
        return {
          badgeText: 'MENUNGGU BALASAN DUDI',
          badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
          icon: Send,
          title: 'Surat Dalam Proses Pengantaran ke Perusahaan',
          instruction: 'Pastikan Anda telah menyerahkan Surat Permohonan ke HRD perusahaan. Setelah mendapatkan Surat Balasan (Diterima/Ditolak), segera upload scan balasan tersebut pada menu Pengajuan.',
          nextStepText: 'Langkah Selanjutnya: Upload Surat Balasan dari Industri',
          actionButton: 'GO_TO_UPLOAD'
        };

      case 'DISETUJUI_INDUSTRI':
        return {
          badgeText: 'RESMI DITERIMA PKL 🎉',
          badgeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20',
          icon: CheckCircle2,
          title: 'Selamat! Pengajuan PKL Anda Resmi Disetujui Perusahaan',
          instruction: 'Harap melakukan konfirmasi ke guru pembimbing sekolah sebelum memulai hari pertama Prakerin. Pastikan Anda mengenakan seragam sekolah resmi dan membawa jurnal harian.',
          nextStepText: 'Langkah Selanjutnya: Lakukan Konfirmasi Pembimbing & Ikuti Pembekalan',
          actionButton: null
        };

      default:
        return {
          badgeText: 'DALAM PROSES',
          badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
          icon: HelpCircle,
          title: 'Status Pengajuan Diproses',
          instruction: 'Pantau terus perkembangan verifikasi tempat PKL Anda di portal ini.',
          nextStepText: 'Langkah Selanjutnya: Pantau Status Pengajuan',
          actionButton: null
        };
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-screen p-8 flex flex-col justify-center items-center space-y-4 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          Memuat Ringkasan Dashboard Siswa...
        </p>
      </div>
    );
  }

  const isAllowedPkl = Boolean(studentInfo?.isAllowedPkl);
  const hasCv = Boolean(studentInfo?.cvUrl);
  const hasBpjs = Boolean(studentInfo?.bpjsUrl);
  const isAlreadyApplied = Boolean(activePlacement);

  // Ambil objek Guru Pembimbing Sekolah jika di-assign oleh Pokja
  const schoolTeacher = studentInfo?.teacher || activePlacement?.teacher || null;

  const statusConfig = activePlacement ? getStatusDisplayConfig(activePlacement.status) : null;

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-900'
    }`}>
      
      {/* BANNER UCAPAN SELAMAT DATANG */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all ${
        theme === 'dark' 
          ? 'bg-slate-900 border-slate-800 text-slate-100' 
          : 'bg-white border-slate-200/80 text-slate-900 shadow-slate-200/50'
      }`}>
        <div className="space-y-2">
          <span className={`px-3.5 py-1 rounded-full text-xs font-bold border flex items-center space-x-1.5 w-fit ${
            theme === 'dark'
              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
          }`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Portal Siswa Prakerin SMK</span>
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Selamat Datang, <span className="text-indigo-600 dark:text-indigo-400">{studentInfo?.name || session?.user?.name || 'Siswa'}</span> 👋
          </h1>
          <p className={`text-sm max-w-2xl font-medium ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Pantau status kelayakan Prakerin, verifikasi dokumen BPJS Ketenagakerjaan, serta informasi penempatan industri dan guru pembimbing Anda secara real-time di sini.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDashboardData}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer border shadow-sm ${
            theme === 'dark'
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* NOTIFIKASI ERROR */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KARTU PRASYARAT DAN IDENTITAS SISWA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KARTU 1: STATUS IZIN PRAKERIN */}
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 flex flex-col justify-between transition-all ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-slate-200/50'
        }`}>
          <div className="flex justify-between items-center">
            <span className={`text-[11px] font-black uppercase tracking-wider ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            }`}>
              STATUS IZIN PRAKERIN
            </span>
            <div className={`p-2.5 rounded-2xl ${
              isAllowedPkl ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
            }`}>
              {isAllowedPkl ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
          </div>

          <div className="space-y-1">
            <h3 className={`text-xl font-black ${
              isAllowedPkl ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {isAllowedPkl ? 'DIIZINKAN PKL' : 'BELUM DIIZINKAN'}
            </h3>
            <p className={`text-xs font-medium ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>
              {isAllowedPkl 
                ? 'Selamat! Persyaratan akademik dan administratif Anda telah disetujui Pokja.' 
                : 'Akses pengajuan PKL untuk kelas Anda belum dibuka oleh Tim Pokja Prakerin.'}
            </p>
          </div>

          <div className="pt-2 border-t border-inherit/40 text-[11px] font-bold text-slate-500 flex items-center justify-between">
            <span>File CV Siswa:</span>
            <span className={hasCv ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
              {hasCv ? '✓ Sudah Upload' : '✗ Belum Upload'}
            </span>
          </div>
        </div>

        {/* KARTU 2: KARTU BPJS TK */}
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 flex flex-col justify-between transition-all ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-slate-200/50'
        }`}>
          <div className="flex justify-between items-center">
            <span className={`text-[11px] font-black uppercase tracking-wider ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            }`}>
              KARTU BPJS TK
            </span>
            <div className={`p-2.5 rounded-2xl ${
              hasBpjs ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-500/10 text-slate-500'
            }`}>
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-1">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${
              hasBpjs 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
            }`}>
              {hasBpjs ? 'SUDAH DIUNGGAH' : 'BELUM DIUNGGAH'}
            </span>
            <p className={`text-xs font-medium pt-2 ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Dokumen BPJS Ketenagakerjaan bersifat perlindungan utama siswa selama masa Prakerin.
            </p>
          </div>

          <div className="pt-2 border-t border-inherit/40 flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-slate-500">Status Perlindungan</span>
            <Link
              href="/dashboard/students/profile"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
            >
              <span>{hasBpjs ? 'Lihat Profile' : 'Upload Sekarang'}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* KARTU 3: IDENTITAS DIRI SISWA */}
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 flex flex-col justify-between transition-all ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-slate-200/50'
        }`}>
          <div className="flex justify-between items-center">
            <span className={`text-[11px] font-black uppercase tracking-wider ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            }`}>
              IDENTITAS DIRI
            </span>
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
              <User className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">NIS:</span>
              <strong className="text-slate-900 dark:text-slate-100">{studentInfo?.nis || '-'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kelas:</span>
              <strong className="text-slate-900 dark:text-slate-100">{studentInfo?.className || '-'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Jurusan:</span>
              <strong className="text-indigo-600 dark:text-indigo-400 truncate max-w-[160px]">{studentInfo?.department || '-'}</strong>
            </div>
          </div>

          <div className="pt-2 border-t border-inherit/40 flex justify-end">
            <Link
              href="/dashboard/students/profile"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
            >
              <span>Edit Profil Siswa</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

      </div>

      {/* 🌟 KARTU GURU PEMBIMBING SEKOLAH */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-4 transition-all ${
        theme === 'dark' 
          ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/30 text-white' 
          : 'bg-gradient-to-r from-emerald-50/60 via-white to-white border-emerald-200 text-slate-900 shadow-slate-200/50'
      }`}>
        <div className="flex justify-between items-center border-b border-inherit pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Guru Pembimbing Sekolah</span>
              <h3 className="text-lg font-extrabold">Pendamping Resmi Prakerin</h3>
            </div>
          </div>

          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Penugasan Pokja
          </span>
        </div>

        {schoolTeacher ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-emerald-500 shrink-0" />
                <h4 className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{schoolTeacher.name || 'Guru Pembimbing'}</h4>
              </div>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Guru pembimbing sekolah bertanggung jawab memantau kehadiran, jurnal harian, serta perkembangan kompetensi PKL Anda di industri.
              </p>
            </div>

            <div className={`p-4 rounded-2xl border space-y-2 text-xs font-medium ${
              theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100/80 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Username / NIP:</span>
                <strong className="text-slate-900 dark:text-white font-bold">{schoolTeacher.username || schoolTeacher.nip || '-'}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Kontak WhatsApp:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{schoolTeacher.phone || 'Tersedia via Pokja'}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status Pendampingan:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  AKTIF MENDAMPINGI
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center space-y-2">
            <BookOpen className="w-8 h-8 text-slate-500 mx-auto opacity-50" />
            <p className="text-xs font-bold text-slate-400">Belum ada Guru Pembimbing Sekolah yang ditugaskan untuk Anda.</p>
            <p className="text-[11px] text-slate-500">Tim Pokja akan mengalokasikan guru pembimbing setelah alokasi jam dan kelas PKL selesai dipetakan.</p>
          </div>
        )}
      </div>

      {/* 🎯 KARTU STATUS PENEMPATAN INDUSTRI (DUDI) */}
      <div className={`p-8 rounded-3xl border shadow-xl space-y-6 transition-all ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-slate-200/50'
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-inherit pb-5">
          <div className="space-y-1">
            <h3 className={`font-extrabold text-xl flex items-center space-x-2.5 ${
              theme === 'dark' ? 'text-indigo-400' : 'text-indigo-900'
            }`}>
              <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span>Status Penempatan Industri (DUDI)</span>
            </h3>
            <p className={`text-xs font-medium ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Informasi perusahaan tempat Anda akan melaksanakan Praktik Kerja Lapangan.
            </p>
          </div>

          {/* BADGE STATUS PROSES DINAMIS */}
          {activePlacement && statusConfig && (
            <span className={`px-4 py-2 rounded-2xl text-xs font-black border tracking-wider flex items-center space-x-2 shrink-0 ${statusConfig.badgeClass}`}>
              <statusConfig.icon className="w-4 h-4" />
              <span>{statusConfig.badgeText}</span>
            </span>
          )}
        </div>

        {isAlreadyApplied && activePlacement ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* SISI KIRI: DETAIL INDUSTRI MITRA */}
            <div className="lg:col-span-6 space-y-4">
              <div className="space-y-1">
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  NAMA PERUSAHAAN / INDUSTRI
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                  {activePlacement.industry?.name}
                </h2>
              </div>

              <div className={`space-y-2 text-xs font-medium ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{activePlacement.industry?.address || 'Alamat Perusahaan Belum Diisi'}</span>
                </div>

                {activePlacement.industry?.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{activePlacement.industry?.phone}</span>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Pembimbing Lapangan / HRD: <strong>{activePlacement.industry?.contactPerson || '-'}</strong></span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenGoogleMaps(activePlacement.industry)}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1.5 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-sm"
                >
                  <MapIcon className="w-4 h-4 text-emerald-500" />
                  <span>Lihat Lokasi di Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </button>

                <span className="text-[11px] font-bold text-slate-500">
                  Kategori: {activePlacement.industry?.sector || 'Umum'}
                </span>
              </div>
            </div>

            {/* SISI KANAN: KOTAK INSTRUKSI SELANJUTNYA DINAMIS SESUAI TAHAP */}
            <div className="lg:col-span-6 space-y-4">
              <div className={`p-6 rounded-3xl border space-y-4 transition-all ${
                theme === 'dark'
                  ? 'bg-slate-950/80 border-slate-800 text-slate-200'
                  : 'bg-indigo-50/70 border-indigo-200 text-indigo-950 shadow-sm'
              }`}>
                <div className="flex items-center space-x-2.5 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <h4>{statusConfig?.title}</h4>
                </div>

                <p className={`text-xs font-medium leading-relaxed ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  {statusConfig?.instruction}
                </p>

                <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center space-x-2 ${
                  theme === 'dark'
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                    : 'bg-white border-indigo-200 text-indigo-900 shadow-sm'
                }`}>
                  <ArrowRight className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <span>{statusConfig?.nextStepText}</span>
                </div>

                {/* TOMBOL AKSI TERKAIT TAHAP SURAT PERMOHONAN */}
                {activePlacement.suratTugasUrl && (
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActivePreviewUrl(activePlacement.suratTugasUrl);
                        setActivePreviewTitle(`Surat Permohonan PKL - ${activePlacement.industry?.name}`);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center space-x-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh Surat Permohonan PKL</span>
                    </button>

                    <Link
                      href="/dashboard/students/pengajuan"
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                        theme === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                          : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                      }`}
                    >
                      <span>Menu Pengajuan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          /* TAMPILAN JIKA SISWA BELUM MENGAJUKAN ATAU PENGAJUAN SEBELUMNYA DITOLAK */
          <div className={`p-8 rounded-3xl border border-dashed text-center space-y-4 ${
            theme === 'dark' ? 'border-slate-800 bg-slate-950/40 text-slate-400' : 'border-slate-300 bg-slate-50 text-slate-600'
          }`}>
            <Building2 className="w-12 h-12 mx-auto text-indigo-500/80" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                {lastRejectedPlacement ? 'Pengajuan PKL Sebelumnya Ditolak' : 'Anda Belum Memilih Tempat PKL'}
              </h4>
              <p className="text-xs max-w-md mx-auto">
                {lastRejectedPlacement 
                  ? `Pengajuan Anda ke ${lastRejectedPlacement.industry?.name} ditolak. Opsi pendaftaran dibuka kembali.`
                  : 'Silakan jelajahi Katalog Industri Mitra dan kirimkan pengajuan tempat PKL Anda sekarang.'}
              </p>
            </div>

            <Link
              href="/dashboard/students/pengajuan"
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-6 py-3 rounded-2xl text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{lastRejectedPlacement ? 'Pilih Perusahaan Mitra Baru' : 'Pilih Tempat PKL Sekarang'}</span>
            </Link>
          </div>
        )}
      </div>

      {/* MODAL PREVIEW DOKUMEN SURAT PERMOHONAN */}
      {activePreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-5 border-b border-inherit flex justify-between items-center">
              <h3 className="font-bold text-sm text-indigo-600 dark:text-indigo-400 flex items-center space-x-2">
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
                <iframe src={activePreviewUrl} className="w-full h-[550px] rounded-2xl border border-slate-800" title="PDF Preview" />
              ) : (
                <img src={activePreviewUrl} alt="Preview Document" className="max-w-full max-h-[550px] object-contain rounded-2xl border border-slate-800 shadow-lg" />
              )}
            </div>

            <div className="p-4 border-t border-inherit flex justify-end space-x-3">
              <a
                href={activePreviewUrl}
                download="surat_permohonan_pkl_sierin"
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
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
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