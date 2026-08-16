// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Penambahan info Jurusan & Periode PKL Aktif serta indikator katalog ter-filter.
// ✨ Fitur Baru: Department Badge & Active Period Notice Banner.
// 🎨 UI/UX Update: Tampilan badge jurusan ultra-clean & filter visual indikator.
// 🔧 Bug Fix: Menyelesaikan kebingungan siswa mengapa industri yang ditampilkan kini sudah ter-filter khusus jurusannya.
// 🚀 Inovasi: Department-Specific Industry Filter Display Engine.
// ----------------------------------------------------------------------

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, 
  Send, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  MapPin, 
  Phone, 
  ArrowLeft, 
  Loader2, 
  FileText, 
  Calendar, 
  Check, 
  Download, 
  Upload, 
  Eye, 
  X, 
  ExternalLink,
  FileCheck2,
  MailCheck,
  Info,
  Lock,
  HelpCircle,
  ShieldAlert,
  RotateCcw,
  UserCheck,
  UserX,
  Users,
  EyeOff,
  Filter,
  Map as MapIcon,
  LayoutGrid,
  Table as TableIcon,
  GraduationCap
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';

export default function StudentPengajuanPage() {
  const { status } = useSession();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingBalasan, setUploadingBalasan] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [activePeriod, setActivePeriod] = useState<any>(null);
  const [activePlacement, setActivePlacement] = useState<any>(null);
  const [lastRejectedPlacement, setLastRejectedPlacement] = useState<any>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [industries, setIndustries] = useState<any[]>([]);
  
  // State Filter & Tampilan Katalog (Grid vs Table)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [hideFullQuota, setHideFullQuota] = useState(false);

  // Form State Pengajuan
  const [selectedIndustry, setSelectedIndustry] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  // State Modal Preview, Konfirmasi Pengajuan, & Unggah Balasan
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showBalasanModal, setShowBalasanModal] = useState(false);
  const [pendingBalasanBase64, setPendingBalasanBase64] = useState<string | null>(null);
  const [memberAcceptanceMap, setMemberAcceptanceMap] = useState<Record<string, boolean>>({});

  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [activePreviewTitle, setActivePreviewTitle] = useState<string>('');

  // Track Image Loading Errors per ID
  const [failedLogos, setFailedLogos] = useState<Record<string, boolean>>({});

  const balasanInputRef = useRef<HTMLInputElement>(null);

  // Fetch Data Pengajuan Siswa dari API
  const fetchApplyData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/students/apply');
      const json = await res.json();

      if (res.ok && json.success) {
        setStudentInfo(json.data.student);
        setActivePeriod(json.data.activePeriod);
        setActivePlacement(json.data.activePlacement);
        setLastRejectedPlacement(json.data.lastRejectedPlacement);
        setGroupMembers(json.data.groupMembers || []);
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
      const matchesSearch = matchName || matchAddress || matchSector;

      if (hideFullQuota) {
        return matchesSearch && ind.remainingQuota > 0;
      }

      return matchesSearch;
    });
  }, [industries, searchTerm, hideFullQuota]);

  // Helper Warna Gradient Avatar Fallback
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

  // 📍 STRICT GOOGLE MAPS OPENER (MURNI KOORDINAT DATABASE)
  const handleOpenGoogleMaps = (e: React.MouseEvent, ind: any) => {
    e.stopPropagation();
    
    const rawLat = ind?.latitude ?? ind?.lat ?? ind?.lat_location;
    const rawLng = ind?.longitude ?? ind?.lng ?? ind?.lng_location;

    const latStr = String(rawLat ?? '').trim();
    const lngStr = String(rawLng ?? '').trim();

    const isLatValid = latStr !== '' && latStr.toLowerCase() !== 'null' && latStr.toLowerCase() !== 'undefined';
    const isLngValid = lngStr !== '' && lngStr.toLowerCase() !== 'null' && lngStr.toLowerCase() !== 'undefined';

    let googleMapsUrl = '';

    if (isLatValid && isLngValid) {
      googleMapsUrl = `https://www.google.com/maps?q=${latStr},${lngStr}`;
    } else {
      const cleanAddress = [ind?.address, ind?.subDistrict, ind?.regency].filter(Boolean).join(', ');
      const query = encodeURIComponent(cleanAddress || ind?.name || 'Industri');
      googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
    
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenConfirmModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIndustry) {
      setErrorMsg('Silakan pilih salah satu industri dari katalog terlebih dahulu!');
      return;
    }
    setErrorMsg('');
    setShowConfirmModal(true);
  };

  const handleApplySubmit = async () => {
    setShowConfirmModal(false);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file surat balasan maksimal adalah 5MB!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPendingBalasanBase64(base64);

      const initialMap: Record<string, boolean> = {};
      if (groupMembers.length > 0) {
        groupMembers.forEach((m) => {
          const key = m.placementId || m.studentId;
          initialMap[key] = true;
        });
      } else if (activePlacement) {
        initialMap[activePlacement.id] = true;
      }

      setMemberAcceptanceMap(initialMap);
      setShowBalasanModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleBalasanSubmit = async () => {
    if (!pendingBalasanBase64) return;

    setUploadingBalasan(true);
    setErrorMsg('');
    setSuccessMsg('');

    const memberStatuses = Object.entries(memberAcceptanceMap).map(([idKey, isAccepted]) => ({
      placementId: idKey,
      isAccepted: isAccepted
    }));

    try {
      const res = await fetch('/api/students/apply', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suratBalasanUrl: pendingBalasanBase64,
          memberStatuses: memberStatuses
        })
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setSuccessMsg(json.message || 'Surat balasan industri berhasil diproses!');
        setShowBalasanModal(false);
        setPendingBalasanBase64(null);
        fetchApplyData();
      } else {
        setErrorMsg(json.error || 'Gagal memproses surat balasan.');
      }
    } catch (err: any) {
      console.error('Error submitting reply letter:', err);
      setErrorMsg('Terjadi kesalahan koneksi saat mengunggah surat balasan.');
    } finally {
      setUploadingBalasan(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-screen p-8 flex flex-col justify-center items-center space-y-4 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          Memuat Status Pengajuan & Katalog Industri Ter-filter...
        </p>
      </div>
    );
  }

  const isAllowedPkl = Boolean(studentInfo?.isAllowedPkl);
  const hasCv = Boolean(studentInfo?.cvUrl);
  const hasBpjs = Boolean(studentInfo?.bpjsUrl);
  const isEligible = isAllowedPkl && hasCv;
  const isAlreadyApplied = Boolean(activePlacement);

  const getStepNumber = (statusStr: string) => {
    switch (statusStr) {
      case 'PENGAJUAN_DIKIRIM': return 1;
      case 'REVIEW_POKJA': return 2;
      case 'PEMBUATAN_SURAT': return 3;
      case 'SURAT_DITERBITKAN': return 4;
      case 'KIRIM_SURAT': return 5;
      case 'DISETUJUI_INDUSTRI': return 6;
      default: return 1;
    }
  };

  const currentStep = activePlacement ? getStepNumber(activePlacement.status) : 0;

  // 🖼️ PURE WHITE LOGO RENDERER
  const renderIndustryLogo = (ind: any, sizeClass = "w-12 h-12", textSizeClass = "text-lg") => {
    if (!ind) return null;

    const rawUrl = ind.logoUrl || ind.logo_url || ind.logo || ind.image || ind.imageUrl || ind.industry?.logoUrl || ind.industry?.logo_url;
    const indId = ind.id || ind.industryId || ind.name || 'unknown';
    
    let candidateUrl: string | null = null;

    if (typeof rawUrl === 'string' && rawUrl.trim() !== '' && rawUrl.trim().toLowerCase() !== 'null' && rawUrl.trim().toLowerCase() !== 'undefined') {
      let cleaned = rawUrl.trim().replace(/\\/g, '/');
      if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://') && !cleaned.startsWith('data:') && !cleaned.startsWith('/')) {
        cleaned = '/' + cleaned;
      }
      candidateUrl = cleaned;
    }

    const isFailed = Boolean(failedLogos[indId]);
    const shouldShow = candidateUrl !== null && !isFailed;

    return (
      <div className={`${sizeClass} rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm shrink-0 bg-white flex items-center justify-center p-1.5 relative group`}>
        {shouldShow ? (
          <img
            src={candidateUrl!}
            alt={ind.name || 'Logo DUDI'}
            className="w-full h-full object-contain rounded-xl transition-all duration-300"
            loading="lazy"
            onError={() => {
              console.warn(`[SI-ERIN Logo Renderer] Failed loading logo for ${ind.name} at URL: "${candidateUrl}"`);
              if (indId && indId !== 'unknown') {
                setFailedLogos((prev) => ({ ...prev, [indId]: true }));
              }
            }}
          />
        ) : (
          <div className={`w-full h-full rounded-xl bg-gradient-to-br ${getAvatarGradient(ind.name || 'DUDI')} flex items-center justify-center text-white font-black ${textSizeClass} shadow-inner`}>
            {(ind.name?.[0] || 'D').toUpperCase()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-900'
    }`}>
      
      {/* BANNER HEADER */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all ${
        theme === 'dark' 
          ? 'bg-slate-900 border-slate-800 text-slate-100' 
          : 'bg-white border-slate-200/80 text-slate-900 shadow-slate-200/50'
      }`}>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-3.5 py-1 rounded-full text-xs font-bold border flex items-center space-x-1.5 w-fit ${
              theme === 'dark'
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>
              <Send className="w-3.5 h-3.5" />
              <span>Portal Pengajuan Tempat PKL</span>
            </span>

            {studentInfo?.department && (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Jurusan: {studentInfo.department}</span>
              </span>
            )}

            {activePeriod && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                {activePeriod.name}
              </span>
            )}
          </div>

          <h1 className={`text-3xl font-extrabold tracking-tight ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            Pengajuan Prakerin 🏢
          </h1>
          <p className={`text-sm max-w-2xl font-medium ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Katalog di bawah ini telah disesuaikan secara khusus untuk jurusan <strong>{studentInfo?.department || 'Anda'}</strong> berdasarkan alokasi Periode PKL dari Tim Pokja.
          </p>
        </div>

        <Link
          href="/dashboard/students"
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer border shadow-sm ${
            theme === 'dark'
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>

      {/* NOTIFIKASI ERROR / SUCCESS */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* PEMBERITAHUAN PENOLAKAN SISWA */}
      {!isAlreadyApplied && lastRejectedPlacement && (
        <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-300 space-y-3 animate-in fade-in duration-300 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-rose-600 text-white shrink-0">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-rose-950 dark:text-rose-200">
                Pengajuan Tempat PKL Sebelumnya Ditolak ({lastRejectedPlacement.status === 'DITOLAK_POKJA' ? 'Pokja Prakerin' : 'Pihak Industri'})
              </h4>
              <p className="text-xs font-medium mt-0.5 text-rose-800 dark:text-rose-300">
                Pengajuan Anda di <strong>{lastRejectedPlacement.industry?.name || 'Industri Mitra'}</strong> tidak disetujui. Opsi pemilihan industri kini <strong className="underline">kembali dibuka</strong>.
              </p>
            </div>
          </div>
          {lastRejectedPlacement.notes && (
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-900 text-xs text-slate-700 dark:text-slate-300">
              <strong>Catatan Penolakan:</strong> {lastRejectedPlacement.notes}
            </div>
          )}
          <div className="flex items-center space-x-1.5 text-[11px] font-extrabold text-rose-700 dark:text-rose-400">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Silakan pilih perusahaan mitra baru pada katalog di bawah ini.</span>
          </div>
        </div>
      )}

      {/* BANNER NOTIFIKASI JIKA STATUS PENGAJUAN SUDAH TERKUNCI */}
      {isAlreadyApplied && (
        <div className={`p-6 rounded-3xl border flex items-center justify-between gap-4 animate-in fade-in duration-300 shadow-md ${
          theme === 'dark'
            ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300'
            : 'bg-indigo-50 border-indigo-200 text-indigo-950'
        }`}>
          <div className="flex items-center space-x-4">
            <div className={`p-3.5 rounded-2xl ${
              theme === 'dark' ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-600 text-white'
            }`}>
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h4 className={`font-extrabold text-sm ${
                theme === 'dark' ? 'text-indigo-200' : 'text-indigo-900'
              }`}>
                Pengajuan PKL Anda Sedang Diproses & Terkunci 🔒
              </h4>
              <p className={`text-xs font-medium mt-0.5 ${
                theme === 'dark' ? 'text-slate-300' : 'text-indigo-800/90'
              }`}>
                Anda telah mengajukan penempatan di <strong className="underline decoration-indigo-400">{activePlacement.industry?.name}</strong>. Opsi pemilihan industri lain dikunci secara otomatis.
              </p>
            </div>
          </div>
          <span className="px-4 py-2 rounded-2xl bg-indigo-600 text-white font-extrabold text-xs shrink-0 shadow-md">
            Katalog Terkunci
          </span>
        </div>
      )}

      {/* STATUS PRASYARAT KELAYAKAN CHECKER */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-5 transition-all ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-slate-200/50'
      }`}>
        <div className="flex items-center justify-between border-b border-inherit pb-4">
          <h3 className={`font-extrabold text-sm flex items-center space-x-2 ${
            theme === 'dark' ? 'text-indigo-400' : 'text-indigo-700'
          }`}>
            <FileCheck2 className="w-5 h-5" />
            <span>Status Syarat Kelayakan Pengajuan PKL</span>
          </h3>

          <span className={`px-3.5 py-1 rounded-full text-[10px] font-black border tracking-wider uppercase ${
            isEligible 
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' 
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
          }`}>
            {isEligible ? 'SIAP MENGAJUKAN' : 'BELUM MEMENUHI SYARAT'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className={`p-4 rounded-2xl border flex items-center space-x-3 transition-all ${
            isAllowedPkl 
              ? theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
              : theme === 'dark' ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}>
            {isAllowedPkl ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Lock className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
            )}
            <div>
              <span className="font-extrabold block text-xs">1. Izin PKL dari Pokja</span>
              <span className={`text-[11px] font-medium ${
                isAllowedPkl ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'
              }`}>
                {isAllowedPkl ? 'Izin Dibuka' : 'Belum Diizinkan'}
              </span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border flex items-center justify-between space-x-2 transition-all ${
            hasCv 
              ? theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
              : theme === 'dark' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-center space-x-3">
              {hasCv ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              <div>
                <span className="font-extrabold block text-xs">2. File CV (Wajib)</span>
                <span className={`text-[11px] font-medium ${
                  hasCv ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                }`}>
                  {hasCv ? 'Sudah Ada' : 'Belum Upload'}
                </span>
              </div>
            </div>

            {!hasCv && (
              <Link
                href="/dashboard/students/profile"
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition-all cursor-pointer shrink-0 shadow-sm"
              >
                Upload CV
              </Link>
            )}
          </div>

          <div className={`p-4 rounded-2xl border flex items-center justify-between space-x-2 transition-all ${
            hasBpjs 
              ? theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-900'
              : theme === 'dark' ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-slate-100/90 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center space-x-3">
              {hasBpjs ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Info className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
              )}
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold block text-xs">3. Kartu BPJS</span>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                    SUNNAH
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  {hasBpjs ? 'Sudah Upload' : 'Bisa Nanti'}
                </span>
              </div>
            </div>

            {!hasBpjs && (
              <Link
                href="/dashboard/students/profile"
                className={`px-3 py-1.5 rounded-xl font-bold text-[10px] transition-all cursor-pointer shrink-0 ${
                  theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    : 'bg-slate-800 hover:bg-slate-900 text-white'
                }`}
              >
                Upload
              </Link>
            )}
          </div>
        </div>

        {!isEligible && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs font-semibold flex items-center space-x-2">
            <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              {!isAllowedPkl 
                ? 'Akses pengajuan PKL untuk kelas Anda belum dibuka oleh Pokja.' 
                : 'Anda belum bisa memilih tempat PKL karena belum mengunggah File CV. Silakan unggah CV di menu Update Profil Siswa.'}
            </span>
          </div>
        )}
      </div>

      {/* 🧭 VISUAL 6-STEP TIMELINE TRACKER PROGRESS */}
      {activePlacement && (
        <div className={`p-8 rounded-3xl border shadow-xl space-y-8 transition-all ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-slate-200/50'
        }`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-inherit pb-6">
            <div className="flex items-center space-x-4">
              {renderIndustryLogo(activePlacement.industry, "w-14 h-14", "text-xl")}
              <div className="space-y-1">
                <span className={`text-[10px] uppercase font-bold tracking-wider ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Industri Tujuan PKL
                </span>
                <h3 className={`text-2xl font-black ${
                  theme === 'dark' ? 'text-indigo-400' : 'text-indigo-900'
                }`}>
                  {activePlacement.industry?.name}
                </h3>
                <p className={`text-xs font-medium ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {activePlacement.industry?.address}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
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
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
              }`}>
                TAHAP {currentStep}/6: {activePlacement.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* STEPPER PROGRESS BAR */}
          <div className="space-y-4">
            <h4 className={`font-bold text-xs uppercase tracking-wider ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Progres Tahapan Alur Pengajuan (1 - 6):
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className={`p-4 rounded-2xl border space-y-2 transition-all ${
                currentStep >= 1 
                  ? theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300' : 'bg-indigo-50 border-indigo-300 text-indigo-950'
                  : theme === 'dark' ? 'bg-slate-950/40 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] font-bold">01</span>
                  {currentStep >= 1 && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <div className="font-bold text-xs leading-snug">Pengajuan Dikirim</div>
                <p className="text-[10px] opacity-80">Siswa memilih DUDI</p>
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 transition-all ${
                currentStep >= 2 
                  ? theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300' : 'bg-indigo-50 border-indigo-300 text-indigo-950'
                  : theme === 'dark' ? 'bg-slate-950/40 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] font-bold">02</span>
                  {currentStep >= 2 && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <div className="font-bold text-xs leading-snug">Review Pokja</div>
                <p className="text-[10px] opacity-80">Verifikasi berkas Pokja</p>
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 transition-all ${
                currentStep >= 3 
                  ? theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300' : 'bg-indigo-50 border-indigo-300 text-indigo-950'
                  : theme === 'dark' ? 'bg-slate-950/40 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] font-bold">03</span>
                  {currentStep >= 3 && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <div className="font-bold text-xs leading-snug">Pembuatan Surat</div>
                <p className="text-[10px] opacity-80">Proses cetak surat</p>
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 transition-all ${
                currentStep >= 4 
                  ? theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300' : 'bg-indigo-50 border-indigo-300 text-indigo-950'
                  : theme === 'dark' ? 'bg-slate-950/40 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] font-bold">04</span>
                  {currentStep >= 4 && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <div className="font-bold text-xs leading-snug">Surat Diterbitkan</div>
                <p className="text-[10px] opacity-80">Siap diunduh siswa</p>
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 transition-all ${
                currentStep >= 5 
                  ? theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300' : 'bg-indigo-50 border-indigo-300 text-indigo-950'
                  : theme === 'dark' ? 'bg-slate-950/40 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] font-bold">05</span>
                  {currentStep >= 5 && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <div className="font-bold text-xs leading-snug">Kirim ke DUDI</div>
                <p className="text-[10px] opacity-80">Penyerahan ke industri</p>
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 transition-all ${
                currentStep >= 6 
                  ? theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : theme === 'dark' ? 'bg-slate-950/40 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] font-bold">06</span>
                  {currentStep >= 6 && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                </div>
                <div className="font-bold text-xs leading-snug">Upload Balasan</div>
                <p className="text-[10px] opacity-80">Unggah bukti balasan</p>
              </div>
            </div>
          </div>

          {/* AREA UNGGAH SURAT BALASAN */}
          {currentStep >= 4 && (
            <div className={`p-6 rounded-3xl border space-y-4 transition-all ${
              theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <h4 className={`font-bold text-sm flex items-center space-x-2 ${
                    theme === 'dark' ? 'text-indigo-400' : 'text-indigo-900'
                  }`}>
                    <MailCheck className="w-4 h-4" />
                    <span>Unggah Surat Balasan & Tentukan Status Penerimaan DUDI</span>
                  </h4>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Setelah mendapat surat balasan dari perusahaan, unggah berkasnya lalu tandai siapa saja siswa yang <strong>DITERIMA</strong> atau <strong>DITOLAK</strong>.
                  </p>
                </div>

                <input
                  type="file"
                  ref={balasanInputRef}
                  onChange={handleFileChange}
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
                        <span>Memproses...</span>
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
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                          : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                      }`}
                      title="Pratinjau Surat Balasan"
                    >
                      <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FORM PENGAJUAN PENEMPATAN */}
      <div className="space-y-6">
        <form onSubmit={handleOpenConfirmModal} className={`p-8 rounded-3xl border shadow-xl space-y-6 transition-all ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-slate-200/50'
        }`}>
          <div className="border-b border-inherit pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="space-y-1">
              <h3 className={`font-extrabold text-lg flex items-center space-x-2 ${
                theme === 'dark' ? 'text-indigo-400' : 'text-indigo-900'
              }`}>
                <Send className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Form Pengajuan Tempat PKL</span>
              </h3>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Pilih perusahaan dari katalog di bawah, lalu tentukan rencana periode pelaksanaan PKL Anda.
              </p>
            </div>

            {selectedIndustry && !isAlreadyApplied && (
              <button
                type="button"
                onClick={() => setSelectedIndustry(null)}
                className="text-xs font-bold text-rose-600 hover:text-rose-500 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20 cursor-pointer flex items-center space-x-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Batalkan Pilihan</span>
              </button>
            )}
          </div>

          {isAlreadyApplied ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 space-y-2">
              <div className="flex items-center space-x-2 font-extrabold text-xs">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Pengajuan Sudah Terisi & Terkunci</span>
              </div>
              <p className="text-[11px] font-medium leading-relaxed">
                Status pengajuan Anda sedang aktif di <strong>{activePlacement.industry?.name}</strong>. Anda tidak dapat mengisi form pengajuan baru kecuali dibatalkan oleh Tim Pokja.
              </p>
            </div>
          ) : selectedIndustry ? (
            <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                {renderIndustryLogo(selectedIndustry, "w-12 h-12", "text-lg")}
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider">
                    Industri Pilihan Anda:
                  </span>
                  <h4 className="font-black text-base text-indigo-950 dark:text-indigo-200 leading-tight">
                    {selectedIndustry.name}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    {selectedIndustry.address} • <strong className="text-emerald-600 dark:text-emerald-400">Kuota Sisa: {selectedIndustry.remainingQuota}/{selectedIndustry.totalQuota}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleOpenGoogleMaps(e, selectedIndustry)}
                  className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1.5 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-sm"
                  title="Lihat Titik Koordinat Lokasi Google Maps"
                >
                  <MapIcon className="w-4 h-4 text-emerald-500" />
                  <span>Lihat di Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className={`p-6 rounded-2xl border border-dashed text-center text-xs space-y-2 ${
              theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-300 text-slate-500'
            }`}>
              <Building2 className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">Belum Ada Industri Pilihan</p>
              <p>Silakan klik salah satu kartu/baris industri dari katalog di bawah untuk memulai pengajuan.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="space-y-1.5">
              <label className={`font-bold uppercase flex items-center space-x-1 ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-700'
              }`}>
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Rencana Tanggal Mulai PKL</span>
              </label>
              <input
                type="date"
                value={startDate}
                disabled={isAlreadyApplied}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-2xl border outline-none font-bold transition-all ${
                  theme === 'dark' 
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <label className={`font-bold uppercase flex items-center space-x-1 ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-700'
              }`}>
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Rencana Tanggal Selesai PKL</span>
              </label>
              <input
                type="date"
                value={endDate}
                disabled={isAlreadyApplied}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-2xl border outline-none font-bold transition-all ${
                  theme === 'dark' 
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600'
                }`}
              />
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className={`font-bold uppercase ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-700'
              }`}>
                Catatan Tambahan (Opsional)
              </label>
              <input
                type="text"
                value={notes}
                disabled={isAlreadyApplied}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Permohonan khusus ke Tim Pokja..."
                className={`w-full px-4 py-3 rounded-2xl border outline-none font-semibold transition-all ${
                  theme === 'dark' 
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600'
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !selectedIndustry || !isEligible || isAlreadyApplied}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl text-xs shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengirim Pengajuan Tempat PKL...</span>
              </>
            ) : isAlreadyApplied ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Pengajuan Anda Terkunci</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Kirim Pengajuan Tempat PKL (Tahap 1)</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* 🏢 SECTION KATALOG INDUSTRI MITRA (DUDI) */}
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-1">
            <h3 className={`font-extrabold text-xl flex items-center space-x-2 ${
              theme === 'dark' ? 'text-indigo-400' : 'text-indigo-900'
            }`}>
              <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span>Katalog Industri Mitra (Ter-filter Khusus Jurusan)</span>
            </h3>
            <p className={`text-xs font-medium ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Hanya menampilkan DUDI yang dialokasikan oleh Pokja untuk jurusan <strong>{studentInfo?.department || 'Anda'}</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
            <div className={`p-1 rounded-2xl border flex items-center space-x-1 shrink-0 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
            }`}>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Tabel (Full Teks)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setHideFullQuota(!hideFullQuota)}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-extrabold border transition-all flex items-center justify-center space-x-2 cursor-pointer shrink-0 shadow-sm ${
                hideFullQuota
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/20'
                  : theme === 'dark'
                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {hideFullQuota ? <EyeOff className="w-4 h-4 text-white" /> : <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
              <span>{hideFullQuota ? 'Kuota Penuh Sembunyi' : 'Sembunyikan Kuota Penuh'}</span>
            </button>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama/sektor/alamat..."
                className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs font-semibold border outline-none transition-all ${
                  theme === 'dark' 
                    ? 'bg-slate-900 border-slate-800 text-slate-100 focus:border-indigo-500' 
                    : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 shadow-sm'
                }`}
              />
            </div>
          </div>
        </div>

        {/* MODE GRID */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIndustries.length > 0 ? (
              filteredIndustries.map((ind) => {
                const isSelected = selectedIndustry?.id === ind.id;
                const isFull = ind.remainingQuota <= 0;
                const isLockedForStudent = isAlreadyApplied;

                return (
                  <div
                    key={ind.id}
                    onClick={() => {
                      if (!isFull && isEligible && !isLockedForStudent) {
                        setSelectedIndustry(ind);
                      }
                    }}
                    className={`p-6 rounded-3xl border shadow-lg space-y-4 transition-all relative overflow-hidden flex flex-col justify-between ${
                      isLockedForStudent
                        ? theme === 'dark' ? 'opacity-50 bg-slate-950/60 border-slate-800 cursor-not-allowed filter grayscale' : 'opacity-60 bg-slate-200/80 border-slate-300 cursor-not-allowed filter grayscale'
                        : isFull 
                          ? theme === 'dark' ? 'opacity-60 bg-slate-950/40 border-slate-800 cursor-not-allowed' : 'opacity-60 bg-slate-100 border-slate-300 cursor-not-allowed'
                          : isSelected 
                            ? 'border-indigo-600 bg-indigo-500/10 ring-2 ring-indigo-500/40 cursor-pointer scale-[1.01]' 
                            : theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-slate-700 cursor-pointer hover:scale-[1.01]' : 'bg-white border-slate-200/90 hover:border-indigo-300 cursor-pointer shadow-slate-200/50 hover:scale-[1.01]'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-center space-x-3.5 overflow-hidden">
                          {renderIndustryLogo(ind, "w-12 h-12", "text-lg")}
                          <div className="space-y-0.5 overflow-hidden">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block truncate">
                              {ind.sector || 'Umum'}
                            </span>
                            <h4 className={`font-black text-base leading-snug truncate ${
                              theme === 'dark' ? 'text-white' : 'text-slate-900'
                            }`}>
                              {ind.name}
                            </h4>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border shrink-0 ${
                          isFull 
                            ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' 
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                        }`}>
                          Sisa: {ind.remainingQuota}/{ind.totalQuota}
                        </span>
                      </div>

                      <div className={`space-y-1.5 text-xs font-medium ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start space-x-1.5 overflow-hidden">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">
                              {ind.address || 'Alamat Belum Diisi'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleOpenGoogleMaps(e, ind)}
                            className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/20 shrink-0 flex items-center space-x-1 transition-all cursor-pointer shadow-sm"
                            title="Buka Titik Koordinat Presisi di Google Maps"
                          >
                            <MapIcon className="w-3 h-3 text-emerald-500" />
                            <span>Maps</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        {ind.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>{ind.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between items-center border-t border-inherit/40 text-xs font-semibold">
                      <span className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        HRD: {ind.contactPerson || '-'}
                      </span>
                      {isLockedForStudent ? (
                        <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center space-x-1">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Terkunci</span>
                        </span>
                      ) : isSelected ? (
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center space-x-1">
                          <Check className="w-4 h-4" />
                          <span>Terpilih</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-extrabold">
                          {isFull ? 'Kuota Penuh' : 'Pilih Industri'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={`col-span-full p-10 text-center text-xs font-semibold rounded-3xl border space-y-2 ${
                theme === 'dark' ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
              }`}>
                <Building2 className="w-8 h-8 mx-auto text-slate-400" />
                <p>Tidak ada industri mitra yang dialokasikan untuk jurusan Anda pada periode ini.</p>
              </div>
            )}
          </div>
        ) : (
          /* MODE TABEL */
          <div className={`rounded-3xl border shadow-xl overflow-hidden transition-all ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-slate-200/50'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-black border-b tracking-wider ${
                  theme === 'dark' ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <tr>
                    <th className="py-4 px-6">Perusahaan / DUDI</th>
                    <th className="py-4 px-6">Sektor Industri</th>
                    <th className="py-4 px-6">Alamat Lengkap</th>
                    <th className="py-4 px-6">Kontak HRD</th>
                    <th className="py-4 px-6 text-center">Kuota Tersedia</th>
                    <th className="py-4 px-6 text-center">Lokasi Maps</th>
                    <th className="py-4 px-6 text-right">Aksi Pilihan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-inherit">
                  {filteredIndustries.length > 0 ? (
                    filteredIndustries.map((ind) => {
                      const isSelected = selectedIndustry?.id === ind.id;
                      const isFull = ind.remainingQuota <= 0;
                      const isLockedForStudent = isAlreadyApplied;

                      return (
                        <tr
                          key={ind.id}
                          onClick={() => {
                            if (!isFull && isEligible && !isLockedForStudent) {
                              setSelectedIndustry(ind);
                            }
                          }}
                          className={`transition-all ${
                            isLockedForStudent
                              ? 'opacity-50 cursor-not-allowed'
                              : isFull
                                ? 'opacity-60 cursor-not-allowed'
                                : isSelected
                                  ? 'bg-indigo-500/10 font-bold cursor-pointer'
                                  : theme === 'dark'
                                    ? 'hover:bg-slate-800/60 cursor-pointer'
                                    : 'hover:bg-indigo-50/50 cursor-pointer'
                          }`}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-3.5">
                              {renderIndustryLogo(ind, "w-10 h-10", "text-base")}
                              <div>
                                <span className="font-black text-sm text-slate-900 dark:text-slate-100 block whitespace-normal">
                                  {ind.name}
                                </span>
                                {isSelected && (
                                  <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                    ✓ Sedang Terpilih di Form
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-6 font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                            {ind.sector || 'Umum'}
                          </td>

                          <td className="py-4 px-6 max-w-xs whitespace-normal font-medium text-slate-600 dark:text-slate-300">
                            <div className="flex items-start space-x-1.5">
                              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                              <span>{ind.address || 'Alamat Belum Diisi'}</span>
                            </div>
                          </td>

                          <td className="py-4 px-6 whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium">
                            <div className="space-y-0.5">
                              <div className="font-semibold text-slate-900 dark:text-slate-200">
                                {ind.contactPerson || '-'}
                              </div>
                              {ind.phone && (
                                <div className="text-[11px] flex items-center space-x-1">
                                  <Phone className="w-3 h-3 text-emerald-500" />
                                  <span>{ind.phone}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-4 px-6 text-center whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-[11px] font-black border inline-block ${
                              isFull 
                                ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' 
                                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                            }`}>
                              {ind.remainingQuota} / {ind.totalQuota} Kursi
                            </span>
                          </td>

                          <td className="py-4 px-6 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => handleOpenGoogleMaps(e, ind)}
                              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/20 inline-flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                              title="Buka Titik Koordinat Presisi di Google Maps"
                            >
                              <MapIcon className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Maps</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>

                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            {isLockedForStudent ? (
                              <span className="text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-end space-x-1">
                                <Lock className="w-3.5 h-3.5" />
                                <span>Terkunci</span>
                              </span>
                            ) : isSelected ? (
                              <button
                                type="button"
                                className="bg-indigo-600 text-white font-black px-4 py-2 rounded-xl text-xs shadow-md shadow-indigo-600/30 inline-flex items-center space-x-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Terpilih</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isFull}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                  isFull
                                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                    : 'bg-slate-900 hover:bg-indigo-600 text-white dark:bg-slate-800 dark:hover:bg-indigo-600 shadow-sm cursor-pointer'
                                }`}
                              >
                                {isFull ? 'Kuota Penuh' : 'Pilih DUDI'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs font-semibold">
                        <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                        <span>Tidak ada industri mitra yang dialokasikan untuk jurusan Anda pada periode ini.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* POP-UP MODAL BALASAN */}
      {showBalasanModal && activePlacement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-all ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-6 border-b border-inherit flex justify-between items-center bg-indigo-500/10">
              <h3 className="font-extrabold text-base text-indigo-700 dark:text-indigo-400 flex items-center space-x-2">
                <MailCheck className="w-5 h-5" />
                <span>Konfirmasi Hasil Surat Balasan DUDI</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowBalasanModal(false);
                  setPendingBalasanBase64(null);
                }}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs">
              <div className="space-y-2">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-indigo-200 flex items-center space-x-2">
                  <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Tentukan Status Penerimaan Setiap Siswa:</span>
                </h4>
                <p className="text-slate-600 dark:text-slate-400 text-xs font-medium leading-relaxed">
                  Berdasarkan surat balasan dari <strong>{activePlacement.industry?.name}</strong>, tandai status penerimaan masing-masing siswa di bawah ini:
                </p>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {groupMembers.length > 0 ? (
                  groupMembers.map((member) => {
                    const memberKey = member.placementId || member.studentId;
                    const isAccepted = memberAcceptanceMap[memberKey] ?? true;

                    return (
                      <div
                        key={memberKey}
                        className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                          isAccepted
                            ? theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50/90 border-emerald-200'
                            : theme === 'dark' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50/90 border-rose-200'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5">
                            <strong className="text-slate-900 dark:text-slate-100">{member.name}</strong>
                            {member.isCurrentStudent && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-600 text-white">
                                Anda
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            NIS: {member.nis} • Kelas: {member.className}
                          </p>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setMemberAcceptanceMap(prev => ({ ...prev, [memberKey]: true }))}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold flex items-center space-x-1 transition-all cursor-pointer ${
                              isAccepted
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                            }`}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>DITERIMA</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setMemberAcceptanceMap(prev => ({ ...prev, [memberKey]: false }))}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold flex items-center space-x-1 transition-all cursor-pointer ${
                              !isAccepted
                                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                            }`}
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>DITOLAK</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 rounded-2xl border bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <strong className="text-slate-900 dark:text-slate-100">{studentInfo?.name}</strong>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Status penerimaan diri Anda</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setMemberAcceptanceMap({ [activePlacement.id]: true })}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold flex items-center space-x-1 transition-all cursor-pointer ${
                          memberAcceptanceMap[activePlacement.id] !== false
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>DITERIMA</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMemberAcceptanceMap({ [activePlacement.id]: false })}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold flex items-center space-x-1 transition-all cursor-pointer ${
                          memberAcceptanceMap[activePlacement.id] === false
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>DITOLAK</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-[11px] font-semibold flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Siswa yang ditolak industri akan otomatis dilepas kuncinya dan dapat mendaftar kembali ke DUDI pilihan lain.</span>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBalasanModal(false);
                    setPendingBalasanBase64(null);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleBalasanSubmit}
                  disabled={uploadingBalasan}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {uploadingBalasan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>Simpan & Upload Berkas</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP MODAL KONFIRMASI PENGAJUAN AWAL */}
      {showConfirmModal && selectedIndustry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-all ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-6 border-b border-inherit flex justify-between items-center bg-indigo-500/10">
              <h3 className="font-extrabold text-base text-indigo-700 dark:text-indigo-400 flex items-center space-x-2">
                <HelpCircle className="w-5 h-5" />
                <span>Konfirmasi Ajuan Tempat PKL</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs">
              <div className="text-center space-y-2">
                <div className="mx-auto flex justify-center">
                  {renderIndustryLogo(selectedIndustry, "w-16 h-16", "text-2xl")}
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-indigo-300">
                  Apakah Anda yakin mengajukan di industri ini?
                </h4>
                <p className="text-slate-600 dark:text-slate-400 text-xs font-medium leading-relaxed">
                  Setelah dikonfirmasi, data pengajuan Anda akan <strong className="text-amber-600 dark:text-amber-400">terkunci</strong> dan diproses langsung oleh Tim Pokja Prakerin.
                </p>
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 font-medium ${
                theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Industri Mitra:</span>
                  <strong className="text-indigo-900 dark:text-indigo-300">{selectedIndustry.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Alamat:</span>
                  <span className="text-slate-800 dark:text-slate-300 truncate max-w-[200px]">{selectedIndustry.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Rencana Mulai:</span>
                  <strong className="text-slate-900 dark:text-slate-200">{startDate}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Rencana Selesai:</span>
                  <strong className="text-slate-900 dark:text-slate-200">{endDate}</strong>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-[11px] font-semibold flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Pilihan tidak dapat diubah sendiri secara langsung setelah dikirim.</span>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                  }`}
                >
                  Batal / Pilih Lain
                </button>
                <button
                  type="button"
                  onClick={handleApplySubmit}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Ya, Ajukan Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW DOKUMEN */}
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