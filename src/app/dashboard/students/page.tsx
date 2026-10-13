// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: 
//    1. Menambahkan widget pelacak hari PKL ("Day xx / xx PKL") dengan penghitungan hari otomatis real-time (H-minus, Sedang Berjalan, atau Selesai).
//    2. Menampilkan rentang tanggal resmi persis sesuai yang tersimpan pada pengajuan / surat balasan industri mitra.
//    3. Mempercantik antarmuka UI/UX secara komprehensif: Glassmorphism header, Stepper 6-tahap visual, Logo renderer, & WhatsApp Direct Connect.
// ✨ Fitur Baru: Real-Time PKL Day Counter, Calendar Progress Tracker, & Dynamic Stage Stepper Engine.
// 🎨 UI/UX Update: Desain modern bernuansa enterprise dengan dukungan Dark & Light theme yang kontras dan nyaman dibaca.
// 🔧 Bug Fix: Peningkatan kompatibilitas modal pratinjau dokumen (iframe PDF universal).
// 🚀 Inovasi: Enterprise Student Prakerin Day Progression & Industry Synchronized Tracker.
// ----------------------------------------------------------------------

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo } from 'react';
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
  BookOpen,
  Sparkles,
  Timer,
  Check,
  MessageCircle,
  Users,
  Flame,
  TrendingUp,
  Briefcase,
  GraduationCap
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
  const [activePeriod, setActivePeriod] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [failedLogos, setFailedLogos] = useState<Record<string, boolean>>({});

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
        setActivePeriod(json.data.activePeriod);
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

  // Greeting dinamis berdasarkan waktu lokal
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  }, []);

  // 🎯 KALKULASI PROGRES HARI PKL (DAY XX / XX & TANGGAL SESUAI DATABASE)
  const pklProgress = useMemo(() => {
    const rawStart = activePlacement?.startDate || activePeriod?.startDate;
    const rawEnd = activePlacement?.endDate || activePeriod?.endDate;

    if (!rawStart || !rawEnd) return null;

    const startDate = new Date(rawStart);
    const endDate = new Date(rawEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;

    const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const oneDayMs = 1000 * 60 * 60 * 24;
    const totalDays = Math.max(1, Math.round((endMidnight.getTime() - startMidnight.getTime()) / oneDayMs) + 1);
    const isCustomDate = Boolean(activePlacement?.startDate && activePlacement?.endDate);

    const formattedStartDate = startMidnight.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const formattedEndDate = endMidnight.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    if (todayMidnight.getTime() < startMidnight.getTime()) {
      const daysUntil = Math.round((startMidnight.getTime() - todayMidnight.getTime()) / oneDayMs);
      return {
        status: 'UPCOMING',
        dayLabel: `Day 00 / ${String(totalDays).padStart(2, '0')}`,
        currentDay: 0,
        totalDays,
        daysRemaining: totalDays,
        daysPassed: 0,
        percent: 0,
        statusText: `Dimulai dalam ${daysUntil} Hari (H-${daysUntil})`,
        statusBadge: 'MENUNGGU WAKTU PKL',
        badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        formattedStartDate,
        formattedEndDate,
        isCustomDate
      };
    } else if (todayMidnight.getTime() > endMidnight.getTime()) {
      return {
        status: 'COMPLETED',
        dayLabel: `Day ${String(totalDays).padStart(2, '0')} / ${String(totalDays).padStart(2, '0')}`,
        currentDay: totalDays,
        totalDays,
        daysRemaining: 0,
        daysPassed: totalDays,
        percent: 100,
        statusText: 'Masa Praktik Kerja Lapangan Telah Selesai',
        statusBadge: 'SELESAI PKL 🎉',
        badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        formattedStartDate,
        formattedEndDate,
        isCustomDate
      };
    } else {
      const elapsedDays = Math.min(
        totalDays,
        Math.max(1, Math.round((todayMidnight.getTime() - startMidnight.getTime()) / oneDayMs) + 1)
      );
      const remainingDays = Math.max(0, totalDays - elapsedDays);
      const percent = Math.min(100, Math.max(1, Math.round((elapsedDays / totalDays) * 100)));

      return {
        status: 'ACTIVE',
        dayLabel: `Day ${String(elapsedDays).padStart(2, '0')} / ${String(totalDays).padStart(2, '0')}`,
        currentDay: elapsedDays,
        totalDays,
        daysRemaining: remainingDays,
        daysPassed: elapsedDays,
        percent,
        statusText: `Sedang Berjalan • Hari ke-${elapsedDays} dari ${totalDays} (${percent}%)`,
        statusBadge: 'SEDANG PKL BERJALAN',
        badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        formattedStartDate,
        formattedEndDate,
        isCustomDate
      };
    }
  }, [activePlacement?.startDate, activePlacement?.endDate, activePeriod?.startDate, activePeriod?.endDate]);

  // Helper nomor langkah aktif (1 - 6)
  const getStepNumber = (statusStr: string) => {
    switch (statusStr) {
      case 'PENGAJUAN_DIKIRIM': return 1;
      case 'REVIEW_POKJA': return 2;
      case 'PEMBUATAN_SURAT': return 3;
      case 'SURAT_DITERBITKAN': return 4;
      case 'KIRIM_SURAT': return 5;
      case 'DISETUJUI_INDUSTRI':
      case 'REQUEST_PENGANTARAN':
      case 'MENUNGGU_PEMBERANGKATAN':
      case 'PENGANTARAN_DITERBITKAN':
      case 'COMPLETED':
      case 'SELESAI_PKL': return 6;
      default: return 1;
    }
  };

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

  // Helper link WhatsApp
  const getWaLink = (rawPhone: string) => {
    if (!rawPhone) return null;
    let clean = rawPhone.replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    if (!clean.startsWith('62')) clean = '62' + clean;
    return `https://wa.me/${clean}`;
  };

  // Helper Avatar Gradient
  const getAvatarGradient = (name: string) => {
    const gradients = [
      'from-indigo-600 to-blue-600',
      'from-purple-600 to-pink-600',
      'from-emerald-600 to-teal-600',
      'from-amber-600 to-orange-600',
      'from-rose-600 to-red-600',
      'from-cyan-600 to-blue-700'
    ];
    let charCodeSum = 0;
    const cleanName = name || 'DUDI';
    for (let i = 0; i < cleanName.length; i++) {
      charCodeSum += cleanName.charCodeAt(i);
    }
    return gradients[charCodeSum % gradients.length];
  };

  // Helper Logo Renderer
  const renderIndustryLogo = (ind: any) => {
    if (!ind) return null;
    const rawUrl = ind.logoUrl || ind.logo_url || ind.logo;
    const indId = ind.id || ind.name || 'unknown';

    let candidateUrl: string | null = null;
    if (typeof rawUrl === 'string' && rawUrl.trim() !== '' && rawUrl.trim().toLowerCase() !== 'null') {
      let cleaned = rawUrl.trim().replace(/\\/g, '/');
      if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://') && !cleaned.startsWith('data:') && !cleaned.startsWith('/')) {
        cleaned = '/' + cleaned;
      }
      candidateUrl = cleaned;
    }

    const isFailed = Boolean(failedLogos[indId]);
    const shouldShow = candidateUrl !== null && !isFailed;

    return (
      <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md shrink-0 bg-white flex items-center justify-center p-2 relative">
        {shouldShow ? (
          <img
            src={candidateUrl!}
            alt={ind.name || 'Logo Industri'}
            className="w-full h-full object-contain rounded-xl"
            onError={() => setFailedLogos((prev) => ({ ...prev, [indId]: true }))}
          />
        ) : (
          <div className={`w-full h-full rounded-xl bg-gradient-to-br ${getAvatarGradient(ind.name || 'DUDI')} flex items-center justify-center text-white font-black text-xl shadow-inner`}>
            {(ind.name?.[0] || 'D').toUpperCase()}
          </div>
        )}
      </div>
    );
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
      case 'REQUEST_PENGANTARAN':
      case 'MENUNGGU_PEMBERANGKATAN':
      case 'PENGANTARAN_DITERBITKAN':
      case 'COMPLETED':
      case 'SELESAI_PKL':
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
  const currentStep = activePlacement ? getStepNumber(activePlacement.status) : 0;

  const stepperSteps = [
    { num: 1, label: 'Pengajuan' },
    { num: 2, label: 'Review Pokja' },
    { num: 3, label: 'Cetak Surat' },
    { num: 4, label: 'Surat Terbit' },
    { num: 5, label: 'Kirim DUDI' },
    { num: 6, label: 'Diterima PKL' }
  ];

  return (
    <div className={`min-h-screen p-4 sm:p-8 lg:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-900'
    }`}>
      
      {/* 🌟 BANNER UTAMA DENGAN UCAPAN & IDENTITAS */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative overflow-hidden transition-all ${
        theme === 'dark' 
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-slate-800 text-slate-100' 
          : 'bg-white border-slate-200/80 text-slate-900 shadow-slate-200/50'
      }`}>
        <div className="space-y-3 z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-3.5 py-1 rounded-full text-xs font-bold border flex items-center space-x-1.5 w-fit ${
              theme === 'dark'
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Portal Siswa Praktik Kerja Lapangan (PKL)</span>
            </span>

            {studentInfo?.department && (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>{studentInfo.department}</span>
              </span>
            )}

            {studentInfo?.className && (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
                {studentInfo.className}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center flex-wrap gap-2">
              <span>{greetingText},</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                {studentInfo?.name || session?.user?.name || 'Siswa'}
              </span>
              <span>👋</span>
            </h1>
            <p className={`text-xs sm:text-sm max-w-2xl font-medium leading-relaxed ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Pantau status pengajuan DUDI, progres durasi hari PKL Anda, kontak guru pembimbing, serta berkas administrasi resmi sekolah secara terpusat.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0 z-10">
          <button
            type="button"
            onClick={fetchDashboardData}
            className={`px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl text-xs font-extrabold transition-all flex items-center space-x-2 shrink-0 cursor-pointer border shadow-sm ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* NOTIFIKASI ERROR */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 🚀 WIDGET UTAMA: PELACAK HARI PKL (DAY XX / XX & TANGGAL SESUAI DATABASE) */}
      {pklProgress ? (
        <div className={`p-6 sm:p-8 rounded-3xl border shadow-2xl relative overflow-hidden transition-all ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-900 border-indigo-500/40 text-white'
            : 'bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 text-white shadow-indigo-500/25'
        }`}>
          {/* Subtle Background Glow Accent */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -top-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            
            {/* BARIS HEADER WIDGET HARI */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/15 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-inner">
                  {pklProgress.status === 'ACTIVE' ? (
                    <Flame className="w-6 h-6 text-amber-300 animate-pulse" />
                  ) : pklProgress.status === 'COMPLETED' ? (
                    <Award className="w-6 h-6 text-emerald-300" />
                  ) : (
                    <Calendar className="w-6 h-6 text-cyan-300" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200">
                      Pelacak Waktu Praktik Kerja Lapangan
                    </span>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <h2 className="text-xl font-extrabold tracking-tight">Status Durasi PKL Siswa</h2>
                </div>
              </div>

              {/* BADGE STATUS WAKTU */}
              <span className="px-4 py-1.5 rounded-full text-xs font-black border backdrop-blur-md flex items-center space-x-2 bg-white/10 text-white border-white/25">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{pklProgress.statusBadge}</span>
              </span>
            </div>

            {/* KONTEN UTAMA: DAY COUNTER BESAR */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              <div className="lg:col-span-7 space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-200 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-300" />
                  <span>TARGET PELAKSANAAN</span>
                </span>

                <div className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-md">
                  {pklProgress.dayLabel}
                </div>

                <p className="text-xs sm:text-sm font-semibold text-indigo-100/90 flex items-center space-x-2 pt-1">
                  <span>{pklProgress.statusText}</span>
                </p>

                {/* TANGGAL RESMI SESUAI DATABASE PENGAJUAN / PENERIMAAN */}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <div className="px-3.5 py-1.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-xs font-black flex items-center space-x-2 shadow-sm">
                    <Calendar className="w-4 h-4 text-amber-300" />
                    <span>{pklProgress.formattedStartDate} — {pklProgress.formattedEndDate}</span>
                  </div>

                  <span className="text-[11px] font-bold text-indigo-200/90 italic">
                    {pklProgress.isCustomDate 
                      ? '(Tersimpan sesuai persetujuan / surat balasan industri)' 
                      : '(Berdasarkan jadwal periode PKL sekolah)'}
                  </span>
                </div>
              </div>

              {/* 3 KARTU METRIK RINGKAS */}
              <div className="lg:col-span-5 grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200">Hari Berlalu</span>
                  <div className="text-2xl font-black text-white">{pklProgress.daysPassed}</div>
                  <span className="text-[10px] font-bold text-indigo-200">Hari</span>
                </div>

                <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-200">Sisa Hari</span>
                  <div className="text-2xl font-black text-amber-300">{pklProgress.daysRemaining}</div>
                  <span className="text-[10px] font-bold text-indigo-200">Hari Lagi</span>
                </div>

                <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-200">Total Durasi</span>
                  <div className="text-2xl font-black text-cyan-300">{pklProgress.totalDays}</div>
                  <span className="text-[10px] font-bold text-indigo-200">Hari Kalender</span>
                </div>
              </div>

            </div>

            {/* PROGRESS BAR ANIMATED */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-xs font-extrabold text-indigo-100">
                <span className="flex items-center space-x-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-300" />
                  <span>Progres Masa Prakerin</span>
                </span>
                <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-[11px] font-black">{pklProgress.percent}%</span>
              </div>

              <div className="w-full bg-black/30 backdrop-blur-md h-3.5 rounded-full overflow-hidden p-0.5 border border-white/20">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 shadow-lg shadow-emerald-400/50 transition-all duration-1000 ease-out"
                  style={{ width: `${Math.max(2, pklProgress.percent)}%` }}
                />
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* PLACEHOLDER JIKA BELUM MEMILIKI TANGGAL PKL */
        <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 transition-all ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center space-x-4">
            <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Calendar className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Jadwal Kalender Prakerin</span>
              <h3 className="text-lg font-black">Pelacak Hari PKL Siap Diaktifkan</h3>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                {activePlacement 
                  ? 'Tanggal resmi PKL Anda akan aktif setelah diverifikasi oleh industri mitra dan Tim Pokja.'
                  : 'Pilih industri mitra tempat PKL Anda untuk mengaktifkan penghitungan hari pelaksanaan Prakerin.'}
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/students/pengajuan"
            className="px-5 py-2.5 rounded-2xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center space-x-2 shrink-0 transition-all"
          >
            <span>{activePlacement ? 'Lihat Status Pengajuan' : 'Buka Katalog Industri'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* 🎯 KARTU STATUS PENEMPATAN INDUSTRI (DUDI) */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 transition-all ${
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

        {/* STEPPER 6 TAHAP PROGRES SELEKSI / VERIFIKASI */}
        {isAlreadyApplied && (
          <div className="py-2">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-4 relative">
              {stepperSteps.map((s) => {
                const isPassed = currentStep > s.num;
                const isCurrent = currentStep === s.num;
                return (
                  <div key={s.num} className="flex flex-col items-center text-center space-y-2 relative group">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-black text-xs transition-all shadow-sm ${
                      isPassed
                        ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                        : isCurrent
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/30 scale-110 shadow-indigo-500/30'
                        : theme === 'dark'
                        ? 'bg-slate-800 text-slate-500 border border-slate-700'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}>
                      {isPassed ? <Check className="w-4 h-4 stroke-[3]" /> : s.num}
                    </div>
                    <span className={`text-[10px] sm:text-[11px] font-bold line-clamp-1 ${
                      isCurrent 
                        ? 'text-indigo-600 dark:text-indigo-400 font-black' 
                        : isPassed 
                        ? 'text-slate-800 dark:text-slate-200' 
                        : 'text-slate-400 dark:text-slate-600'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isAlreadyApplied && activePlacement ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
            
            {/* SISI KIRI: DETAIL INDUSTRI MITRA */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center space-x-4">
                {renderIndustryLogo(activePlacement.industry)}
                <div className="space-y-1">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    PERUSAHAAN MITRA TERPILIH
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    {activePlacement.industry?.name}
                  </h2>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
                    Sektor: {activePlacement.industry?.sector || 'Umum'}
                  </span>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border space-y-2.5 text-xs font-medium ${
                theme === 'dark' ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <div className="flex items-start space-x-2.5">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{activePlacement.industry?.address || 'Alamat Perusahaan Belum Diisi'}</span>
                </div>

                {activePlacement.industry?.phone && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{activePlacement.industry?.phone}</span>
                    </div>
                    {getWaLink(activePlacement.industry?.phone) && (
                      <a
                        href={getWaLink(activePlacement.industry?.phone)!}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-bold flex items-center space-x-1"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>Chat WA</span>
                      </a>
                    )}
                  </div>
                )}

                <div className="flex items-center space-x-2.5">
                  <User className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Pembimbing Lapangan / HRD: <strong className="text-slate-900 dark:text-white">{activePlacement.industry?.contactPerson || '-'}</strong></span>
                </div>
              </div>

              <div className="pt-1 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenGoogleMaps(activePlacement.industry)}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1.5 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-sm"
                >
                  <MapIcon className="w-4 h-4 text-emerald-500" />
                  <span>Petunjuk Arah Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </button>

                <Link
                  href="/dashboard/students/kelompok"
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all flex items-center space-x-1.5 ${
                    theme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                  }`}
                >
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span>Rekan Satu Kelompok</span>
                </Link>
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
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  {activePlacement.suratTugasUrl && (
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
                  )}

                  <Link
                    href="/dashboard/students/pengajuan"
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                      theme === 'dark'
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Kelola Pengajuan & Balasan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
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

      {/* 🌟 KARTU PRASYARAT DAN GURU PEMBIMBING */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KARTU 1: STATUS IZIN PRAKERIN */}
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 flex flex-col justify-between transition-all ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-slate-200/50'
        }`}>
          <div className="flex justify-between items-center">
            <span className={`text-[11px] font-black uppercase tracking-wider ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
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
            <h3 className={`text-lg font-black ${
              isAllowedPkl ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {isAllowedPkl ? 'DIIZINKAN PKL' : 'BELUM DIIZINKAN'}
            </h3>
            <p className={`text-xs font-medium ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>
              {isAllowedPkl 
                ? 'Persyaratan administratif dan akademik disetujui Pokja.' 
                : 'Akses pengajuan PKL kelas belum dibuka oleh Pokja.'}
            </p>
          </div>

          <div className="pt-2 border-t border-inherit/40 text-[11px] font-bold text-slate-700 dark:text-slate-400 flex items-center justify-between">
            <span>Status Verifikasi:</span>
            <span className={isAllowedPkl ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-amber-600 dark:text-amber-400 font-black'}>
              {isAllowedPkl ? 'Terverifikasi' : 'Menunggu Pokja'}
            </span>
          </div>
        </div>

        {/* KARTU 2: KARTU BPJS TK */}
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 flex flex-col justify-between transition-all ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-slate-200/50'
        }`}>
          <div className="flex justify-between items-center">
            <span className={`text-[11px] font-black uppercase tracking-wider ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>
              BPJS KETENAGAKERJAAN
            </span>
            <div className={`p-2.5 rounded-2xl ${
              hasBpjs ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-500/10 text-slate-500'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-1">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
              hasBpjs 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                : 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20'
            }`}>
              {hasBpjs ? 'SUDAH TERLINDUNGI' : 'BELUM DIUNGGAH'}
            </span>
            <p className={`text-xs font-medium pt-1 ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Jaminan perlindungan keselamatan kerja siswa selama beraktivitas di industri.
            </p>
          </div>

          <div className="pt-2 border-t border-inherit/40 flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-400">Berkas BPJS</span>
            <Link
              href="/dashboard/students/profile"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
            >
              <span>{hasBpjs ? 'Lihat Dokumen' : 'Unggah Kartu'}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* KARTU 3: CV PORTOFOLIO SISWA */}
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 flex flex-col justify-between transition-all ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-slate-200/50'
        }`}>
          <div className="flex justify-between items-center">
            <span className={`text-[11px] font-black uppercase tracking-wider ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>
              CV & PORTOFOLIO
            </span>
            <div className={`p-2.5 rounded-2xl ${
              hasCv ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
            }`}>
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-1">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
              hasCv 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
            }`}>
              {hasCv ? 'CV TERSEDIA' : 'CV BELUM DIUNGGAH'}
            </span>
            <p className={`text-xs font-medium pt-1 ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Curriculum Vitae memuat keahlian kompetensi Anda untuk ditinjau oleh pihak HRD.
            </p>
          </div>

          <div className="pt-2 border-t border-inherit/40 flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-400">Status CV</span>
            <Link
              href="/dashboard/students/profile"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
            >
              <span>{hasCv ? 'Perbarui CV' : 'Upload Sekarang'}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* KARTU 4: GURU PEMBIMBING SEKOLAH */}
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 flex flex-col justify-between transition-all ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-emerald-950/30 to-slate-900 border-emerald-500/30' 
            : 'bg-gradient-to-br from-emerald-50/70 to-white border-emerald-200 shadow-slate-200/50'
        }`}>
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              GURU PEMBIMBING
            </span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          {schoolTeacher ? (
            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 truncate">
                {schoolTeacher.name}
              </h4>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                NIP/ID: {schoolTeacher.username || schoolTeacher.nip || '-'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-600 dark:text-slate-400">
                Belum Ditugaskan
              </h4>
              <p className="text-[11px] text-slate-500">
                Alokasi pembimbing sedang disusun oleh Pokja.
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-inherit/40 flex items-center justify-between text-xs">
            {schoolTeacher?.phone && getWaLink(schoolTeacher.phone) ? (
              <a
                href={getWaLink(schoolTeacher.phone)!}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Hubungi Guru WA</span>
              </a>
            ) : (
              <span className="text-[11px] font-bold text-slate-500">Pendamping Resmi</span>
            )}
            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              {schoolTeacher ? 'Aktif' : 'Menunggu'}
            </span>
          </div>
        </div>

      </div>

      {/* 🧭 MENU PINTASAN AKSI CEPAT SISWA */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span>Pintasan Akses Cepat Menu Siswa</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/students/pengajuan"
            className={`p-5 rounded-3xl border transition-all flex items-center justify-between group shadow-sm hover:shadow-md ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Katalog DUDI & Pengajuan
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">Pilih & ajukan tempat PKL</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-indigo-500 transition-all" />
          </Link>

          <Link
            href="/dashboard/students/kelompok"
            className={`p-5 rounded-3xl border transition-all flex items-center justify-between group shadow-sm hover:shadow-md ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Rekan Satu Kelompok
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">Teman satu perusahaan</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-500 transition-all" />
          </Link>

          <Link
            href="/dashboard/students/profile"
            className={`p-5 rounded-3xl border transition-all flex items-center justify-between group shadow-sm hover:shadow-md ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Profil & Dokumen
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">Upload CV, BPJS, biodata</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-500 transition-all" />
          </Link>

          <Link
            href="/dashboard/students/surat-izin"
            className={`p-5 rounded-3xl border transition-all flex items-center justify-between group shadow-sm hover:shadow-md ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Surat Izin Orang Tua
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">Persetujuan wali murid</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-purple-500 transition-all" />
          </Link>
        </div>
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
              {!activePreviewUrl.startsWith('data:image/') && !activePreviewUrl.toLowerCase().endsWith('.png') && !activePreviewUrl.toLowerCase().endsWith('.jpg') && !activePreviewUrl.toLowerCase().endsWith('.jpeg') && !activePreviewUrl.toLowerCase().endsWith('.webp') ? (
                <iframe src={activePreviewUrl} className="w-full h-[550px] rounded-2xl border border-slate-800 bg-white" title="PDF Preview" />
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
                <span>Buka / Unduh Berkas</span>
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