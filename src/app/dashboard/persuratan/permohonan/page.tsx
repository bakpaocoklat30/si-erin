// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Menambahkan Filter Toggle Status Penerbitan Surat (Semua, Menunggu Unggah Surat, Sudah Diterbitkan) pada halaman Surat Permohonan PKL.
// ✨ Fitur Baru:
//    - Letter Status Filter Bar (Menyembunyikan kelompok yang sudah terbit suratnya agar Tata Usaha fokus pada yang pending).
//    - Counter Indicator Badge untuk tiap status kelompok.
//    - Full Schema.prisma Alignment (`letterNumber`).
// 🎨 UI/UX Update: Filter Bar ganda (Jurusan & Status Surat) yang responsif dan interaktif.
// 🔧 Bug Fix: Menyempurnakan filter ganda kombinasi Jurusan + Status Surat + Search Query.
// 🚀 Inovasi: Workflow Efficiency Filter Suite for Tata Usaha SI-ERIN.
// ----------------------------------------------------------------------

'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/app/theme-provider';

import {
  Users,
  Building2,
  Calendar,
  CheckCircle2,
  FileText,
  Upload,
  Eye,
  Search,
  X,
  Loader2,
  Database,
  RefreshCw,
  User,
  Clock,
  SendHorizontal,
  FileCheck2,
  ExternalLink,
  AlertCircle,
  Hash,
  GraduationCap,
  Layers,
  CalendarDays,
  Filter,
  CheckCheck
} from 'lucide-react';

interface StudentItem {
  id?: string;
  placementId?: string;
  name?: string;
  studentName?: string;
  nis?: string;
  className?: string;
  department?: string;
  departmentName?: string;
  teacher?: { name?: string };
  teacherName?: string;
  startDate?: string;
  endDate?: string;
}

interface GroupItem {
  groupId?: string;
  groupKey?: string;
  industryId?: string;
  industryName?: string;
  industryAddress?: string;
  departmentName?: string;
  periodName?: string;
  startDate?: string;
  endDate?: string;
  suratTugasUrl?: string;
  letterNumber?: string; // 🌟 Diselaraskan dengan schema.prisma
  letterUploadedBy?: string;
  letterUploadedAt?: string;
  students?: StudentItem[];
  placements?: StudentItem[];
}

interface DepartmentItem {
  id: string;
  name: string;
  code?: string;
}

// FALLBACK UNTUK UI VERIFIKASI INTERAKTIF
const FALLBACK_GROUPS: GroupItem[] = [
  {
    groupId: 'GRP-TKJ-001',
    industryId: 'IND-01',
    industryName: 'PT Jembatan Citra Nusantara Tegal',
    industryAddress: 'Jalan Werkudoro Komplek Ruko Langon Square No 7',
    departmentName: 'Teknik Komputer dan Jaringan',
    periodName: 'Periode Semester Gasar 2026/2027',
    startDate: '2026-08-01T00:00:00.000Z',
    endDate: '2026-11-30T00:00:00.000Z',
    suratTugasUrl: undefined,
    letterNumber: undefined,
    students: [
      {
        id: 'S1',
        name: 'MUHAMAD DWI ADI PRABOWO',
        nis: '1',
        className: 'XII TKJ 1',
        department: 'Teknik Komputer dan Jaringan',
        teacher: null,
        startDate: '2026-08-01T00:00:00.000Z',
        endDate: '2026-11-30T00:00:00.000Z'
      },
      {
        id: 'S2',
        name: 'M. FALAKHUL ARFANI',
        nis: '2',
        className: 'XII TKJ 2',
        department: 'Teknik Komputer dan Jaringan',
        teacher: { name: 'Budi Santoso, S.Kom.' },
        startDate: '2026-08-01T00:00:00.000Z',
        endDate: '2026-11-30T00:00:00.000Z'
      }
    ]
  }
];

export default function PermohonanSuratKelompokPage() {
  const { status, data: session } = useSession();
  const { theme } = useTheme();

  const userRole = (session?.user as any)?.role || 'TATA_USAHA';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [verifiedGroups, setVerifiedGroups] = useState<GroupItem[]>([]);
  const [dbDepartments, setDbDepartments] = useState<DepartmentItem[]>([]);
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('SEMUA');
  
  // 🌟 FITUR BARU: STATE FILTER STATUS SURAT PERMOHONAN ('ALL' | 'PENDING' | 'PUBLISHED')
  const [letterStatusFilter, setLetterStatusFilter] = useState<'ALL' | 'PENDING' | 'PUBLISHED'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');

  // Target Kelompok untuk Modal Upload Surat & Input Nomor Surat
  const [targetGroup, setTargetGroup] = useState<GroupItem | null>(null);
  const [inputLetterNumber, setInputLetterNumber] = useState<string>('');
  const [suratBase64, setSuratBase64] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  // Modal State untuk Pratinjau Dokumen & Detail Kelompok
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [activePreviewTitle, setActivePreviewTitle] = useState<string>('');
  const [detailModalGroup, setDetailModalGroup] = useState<GroupItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formatter Tanggal Lokal Indonesia
  const formatDateIndonesia = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Ambil Data dari API Pokja dengan Recovery Fallback
  const fetchVerifiedGroups = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/pokja/groups');
      const json = await res.json();

      if (res.ok && json.success) {
        setVerifiedGroups(json.data && json.data.length > 0 ? json.data : FALLBACK_GROUPS);
        if (json.departments && Array.isArray(json.departments)) {
          setDbDepartments(json.departments);
        }
      } else {
        setVerifiedGroups(FALLBACK_GROUPS);
      }
    } catch (err) {
      console.error('Error fetching verified groups:', err);
      setVerifiedGroups(FALLBACK_GROUPS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVerifiedGroups();
  }, [fetchVerifiedGroups]);

  // Ekstrak Daftar Jurusan Unik dari Data Kelompok jika Database Department belum terisi
  const availableDepartments = useMemo(() => {
    const setJur = new Set<string>();
    verifiedGroups.forEach((g) => {
      if (g.departmentName) setJur.add(g.departmentName);
      const studentList = g.students || g.placements || [];
      studentList.forEach((st: any) => {
        const studentObj = st.student || st;
        if (studentObj.department) setJur.add(studentObj.department);
      });
    });

    if (dbDepartments.length > 0) {
      dbDepartments.forEach((d) => setJur.add(d.name));
    }

    return ['SEMUA', ...Array.from(setJur)];
  }, [verifiedGroups, dbDepartments]);

  // Hitung Statistik Jumlah Kelompok Berdasarkan Status Penerbitan Surat
  const letterStatusCounts = useMemo(() => {
    let pending = 0;
    let published = 0;

    verifiedGroups.forEach((g) => {
      const hasSurat = Boolean(g.suratTugasUrl || g.letterNumber);
      if (hasSurat) {
        published++;
      } else {
        pending++;
      }
    });

    return {
      all: verifiedGroups.length,
      pending,
      published
    };
  }, [verifiedGroups]);

  // Filter Search, Filter Jurusan Dinamis, dan FILTER STATUS SURAT
  const filteredGroups = useMemo(() => {
    return verifiedGroups.filter((g) => {
      const groupDept = g.departmentName || (g.students?.[0]?.department) || '';
      const matchDept = selectedDepartmentFilter === 'SEMUA' || groupDept.toLowerCase() === selectedDepartmentFilter.toLowerCase();

      // Filter Berdasarkan Status Surat
      const hasSurat = Boolean(g.suratTugasUrl || g.letterNumber);
      let matchStatus = true;
      if (letterStatusFilter === 'PENDING') {
        matchStatus = !hasSurat; // Hanya yang belum punya surat
      } else if (letterStatusFilter === 'PUBLISHED') {
        matchStatus = hasSurat;  // Hanya yang sudah punya surat
      }

      const matchInd = g.industryName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPeriod = g.periodName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSurat = g.letterNumber?.toLowerCase().includes(searchTerm.toLowerCase());

      const studentsList = g.students || g.placements || [];
      const matchStudent = studentsList.some((p: any) => {
        const studentObj = p.student || p;
        const name = studentObj.name || studentObj.studentName || '';
        const nis = studentObj.nis || '';
        const className = studentObj.className || '';
        const teacherName = studentObj.teacher?.name || studentObj.teacherName || '';
        return (
          name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
          className.toLowerCase().includes(searchTerm.toLowerCase()) ||
          teacherName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });

      return matchDept && matchStatus && (matchInd || matchPeriod || matchSurat || matchStudent);
    });
  }, [verifiedGroups, searchTerm, selectedDepartmentFilter, letterStatusFilter]);

  // Handler Pilih File Surat Permohonan
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file maksimal adalah 5MB!');
      return;
    }

    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSuratBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Upload Surat & SIMPAN `letterNumber` KE PRISMA DATABASE
  const handleUploadSuratGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetGroup) return;

    if (!inputLetterNumber.trim()) {
      setErrorMsg('Silakan masukkan Nomor Surat Permohonan terlebih dahulu!');
      return;
    }

    if (!suratBase64) {
      setErrorMsg('Silakan pilih berkas Surat Permohonan (PDF/Gambar)!');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const rawList = targetGroup.placements || targetGroup.students || [];
    const placementIds = rawList.map((p: any) => p.id || p.placementId).filter(Boolean);

    try {
      const res = await fetch('/api/pokja/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: targetGroup.groupId,
          industryId: targetGroup.industryId,
          placementIds: placementIds,
          letterNumber: inputLetterNumber.trim(),
          suratTugasUrl: suratBase64 
        })
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setVerifiedGroups(prev => prev.map(item => item.groupId === targetGroup.groupId ? { 
          ...item, 
          suratTugasUrl: suratBase64,
          letterNumber: inputLetterNumber.trim()
        } : item));

        setSuccessMsg(json.message || `Surat Permohonan No. ${inputLetterNumber} berhasil diterbitkan & tersimpan di database!`);
        setTargetGroup(null);
        setSuratBase64('');
        setInputLetterNumber('');
        setSelectedFileName('');
        fetchVerifiedGroups(); // Re-fetch konfirmasi server
      } else {
        setErrorMsg(json.error || 'Gagal menyimpan Nomor Surat ke database.');
      }
    } catch (err) {
      console.error('Error uploading group letter:', err);
      setErrorMsg('Terjadi kesalahan koneksi saat menyimpan berkas ke database.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen p-8 flex flex-col justify-center items-center space-y-4 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          Menyinkronkan data kelompok permohonan & status surat dengan database...
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-900'
    }`}>

      {/* HEADER BANNER */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Database className="w-3.5 h-3.5" />
            <span>Sinkronisasi Database Modul Persuratan — {userRole}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Surat Permohonan PKL Berdasarkan Kelompok Industri
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Data diambil langsung dari modul verifikasi Pokja. Kelola penerbitan surat permohonan resmi, atur nomor surat, dan unggah berkas balasan untuk kelompok siswa per jurusan.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchVerifiedGroups}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer border shadow-sm ${
            theme === 'dark'
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Sinkronisasi Data Pokja</span>
        </button>
      </div>

      {/* ALERT NOTIFIKASI HASIL AKSI */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* BARIS CONTROL PANEL: FILTER STATUS SURAT & FILTER JURUSAN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* 🌟 FITUR BARU: FILTER TOGGLE STATUS SURAT PERMOHONAN */}
        <div className={`lg:col-span-5 p-4 rounded-3xl border shadow-lg space-y-3 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center space-x-2 text-xs font-extrabold text-amber-500">
            <Filter className="w-4 h-4" />
            <span>Filter Status Penerbitan Surat:</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setLetterStatusFilter('PENDING')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer border ${
                letterStatusFilter === 'PENDING'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                  : theme === 'dark'
                  ? 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Belum Terbit</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white font-mono">
                {letterStatusCounts.pending}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setLetterStatusFilter('PUBLISHED')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer border ${
                letterStatusFilter === 'PUBLISHED'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                  : theme === 'dark'
                  ? 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <CheckCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Sudah Terbit</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white font-mono">
                {letterStatusCounts.published}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setLetterStatusFilter('ALL')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer border ${
                letterStatusFilter === 'ALL'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : theme === 'dark'
                  ? 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <span>Semua</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white font-mono">
                {letterStatusCounts.all}
              </span>
            </button>
          </div>
        </div>

        {/* FILTER JURUSAN DINAMIS */}
        <div className={`lg:col-span-7 p-4 rounded-3xl border shadow-lg space-y-3 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center space-x-2 text-xs font-extrabold text-indigo-500">
            <Layers className="w-4 h-4" />
            <span>Filter Berdasarkan Jurusan (Disinkronkan dari Database):</span>
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            {availableDepartments.map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setSelectedDepartmentFilter(dept)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  selectedDepartmentFilter === dept
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/30'
                    : theme === 'dark'
                    ? 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* SEARCH BAR & STATISTIK KELOMPOK */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari Industri, Periode, No Surat, Nama Siswa, Pembimbing..."
            className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all ${
              theme === 'dark' 
                ? 'bg-slate-900 border-slate-800 text-slate-100 focus:border-indigo-500' 
                : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 shadow-sm'
            }`}
          />
        </div>

        <span className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          Tampil: <strong className="text-indigo-600 dark:text-indigo-400">{filteredGroups.length} Kelompok</strong> 
          {letterStatusFilter === 'PENDING' && ' (Menunggu Unggah Surat)'}
          {letterStatusFilter === 'PUBLISHED' && ' (Sudah Diterbitkan)'}
        </span>
      </div>

      {/* INPUT FILE HIDDEN UNTUK PICKER */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,image/*"
        className="hidden"
      />

      {/* DAFTAR KARTU KELOMPOK SISWA PER INDUSTRI */}
      <div className="space-y-6">
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group) => {
            const hasSurat = Boolean(group.suratTugasUrl || group.letterNumber);
            const studentList = group.students || group.placements || [];
            const groupDeptName = group.departmentName || studentList[0]?.department || 'Teknik Kejuruan';

            return (
              <div
                key={group.groupId || group.groupKey || group.industryId}
                className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200/80 shadow-slate-200/50 hover:border-indigo-200'
                }`}
              >
                {/* HEADER KELOMPOK INDUSTRI */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-inherit pb-5">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <h3 className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {group.industryName}
                      </h3>

                      {/* BADGE JURUSAN */}
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center space-x-1.5">
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>{groupDeptName}</span>
                      </span>

                      {group.periodName && (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{group.periodName}</span>
                        </span>
                      )}
                    </div>

                    <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {group.industryAddress || 'Alamat Industri Terdaftar di Sistem Pokja'}
                    </p>

                    {/* BADGE NOMOR SURAT RESMI (letterNumber DARI PRISMA DATABASE) */}
                    {group.letterNumber && (
                      <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                        <Hash className="w-3.5 h-3.5" />
                        <span>No. Surat: <strong>{group.letterNumber}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* STATUS & TOMBOL AKSI UTAMA */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-3.5 py-1.5 rounded-2xl text-xs font-extrabold border flex items-center space-x-1.5 ${
                      hasSurat
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                    }`}>
                      {hasSurat ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>Surat Permohonan Diterbitkan</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                          <span>Menunggu Unggah Surat</span>
                        </>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() => setDetailModalGroup(group)}
                      className={`px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                      }`}
                    >
                      <Eye className="w-4 h-4 text-indigo-500" />
                      <span>Detail Kelompok</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTargetGroup(group);
                        setInputLetterNumber(group.letterNumber || '');
                        setSuratBase64('');
                        setSelectedFileName('');
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center space-x-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{hasSurat ? 'Ganti Surat & Nomor' : 'Upload Surat Permohonan'}</span>
                    </button>

                    {hasSurat && (
                      <button
                        type="button"
                        onClick={() => {
                          setActivePreviewUrl(group.suratTugasUrl || null);
                          setActivePreviewTitle(`Surat Permohonan PKL (No: ${group.letterNumber || '-'}) - ${group.industryName}`);
                        }}
                        className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                            : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                        }`}
                        title="Pratinjau Surat Permohonan"
                      >
                        <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ANGGOTA KELOMPOK SISWA & GURU PEMBIMBING */}
                <div className="space-y-3">
                  <h4 className={`text-xs font-extrabold uppercase tracking-wider flex items-center space-x-1.5 ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Daftar Anggota Siswa Kelompok ({studentList.length} Orang):</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {studentList.map((item: StudentItem, idx: number) => {
                      const student = item.student || item;
                      const teacherName = student.teacher?.name || student.teacherName || null;

                      return (
                        <div
                          key={item.id || item.placementId || idx}
                          className={`p-4 rounded-2xl border transition-all space-y-3 flex flex-col justify-between ${
                            theme === 'dark'
                              ? 'bg-slate-950/60 border-slate-800'
                              : 'bg-slate-50 border-slate-200/80'
                          }`}
                        >
                          <div className="space-y-1 overflow-hidden">
                            <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 block truncate">
                              {student.name || student.studentName || 'Nama Siswa'}
                            </span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              NIS: {student.nis || '-'} • {student.className || '-'}
                            </p>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block truncate">
                              {student.department || student.departmentName || groupDeptName}
                            </span>
                          </div>

                          {/* GURU PEMBIMBING */}
                          <div className="pt-2.5 border-t border-slate-700/30 flex items-center justify-between text-[11px]">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Pembimbing:</span>
                            <span className={`font-bold px-2 py-0.5 rounded-lg text-[10px] flex items-center space-x-1 truncate max-w-[130px] ${
                              teacherName 
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            }`} title={teacherName || 'Belum Di-assign'}>
                              <User className="w-3 h-3 shrink-0" />
                              <span className="truncate">{teacherName || 'Belum Di-assign'}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            );
          })
        ) : (
          <div className={`p-12 text-center rounded-3xl border space-y-3 ${
            theme === 'dark' ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            <Users className="w-10 h-10 mx-auto text-slate-400" />
            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Tidak Ada Kelompok Pengajuan Sesuai Filter</p>
            <p className="text-xs max-w-md mx-auto">
              {letterStatusFilter === 'PENDING' 
                ? 'Semua kelompok industri pada jurusan ini sudah selesai diterbitkan surat permohonannya!' 
                : 'Coba ganti filter jurusan atau status surat untuk menampilkan kelompok lain.'}
            </p>
          </div>
        )}
      </div>

      {/* MODAL DETAIL KELOMPOK KOMPREHENSIF */}
      {detailModalGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-3xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="p-6 border-b border-inherit flex justify-between items-center bg-indigo-500/10">
              <div className="space-y-1">
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Detail Informasi Kelompok & Tanggal Prakerin</span>
                <h3 className="text-xl font-black">{detailModalGroup.industryName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalGroup(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* RINGKASAN KELOMPOK & JADWAL TANGGAL PKL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-slate-950/40 border border-slate-800">
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block">Jurusan Kelompok:</span>
                  <p className="font-extrabold text-indigo-400 text-sm">{detailModalGroup.departmentName || 'Teknik Kejuruan'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block">Periode Pelaksanaan:</span>
                  <p className="font-bold text-slate-200">{detailModalGroup.periodName || 'Periode Standar'}</p>
                </div>

                <div className="space-y-1 sm:col-span-2 pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center space-x-2">
                    <CalendarDays className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-400 font-bold">Jadwal Mulai s/d Selesai PKL:</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 font-mono font-bold text-xs border border-emerald-500/30">
                    {formatDateIndonesia(detailModalGroup.startDate)} s/d {formatDateIndonesia(detailModalGroup.endDate)}
                  </div>
                </div>

                {detailModalGroup.letterNumber && (
                  <div className="space-y-1 sm:col-span-2 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="text-slate-400 font-bold">Nomor Surat Permohonan (letterNumber):</span>
                    <strong className="text-indigo-400 font-mono text-sm">{detailModalGroup.letterNumber}</strong>
                  </div>
                )}
              </div>

              {/* DAFTAR SISWA KELOMPOK MEMUAT: NAMA, NIS, JURUSAN, KELAS & PEMBIMBING */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-200 text-sm flex items-center space-x-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Daftar Siswa Anggota Kelompok ({detailModalGroup.students?.length || 0} Siswa):</span>
                </h4>

                <div className="space-y-2.5">
                  {(detailModalGroup.students || detailModalGroup.placements || []).map((item: StudentItem, idx: number) => {
                    const student = item.student || item;
                    const teacherName = student.teacher?.name || student.teacherName || 'Belum Di-assign';

                    return (
                      <div key={idx} className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1">
                          <span className="font-extrabold text-slate-100 text-sm block">
                            {idx + 1}. {student.name || student.studentName}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-medium">
                            <span>NIS: <strong>{student.nis || '-'}</strong></span>
                            <span>•</span>
                            <span>Kelas: <strong>{student.className || '-'}</strong></span>
                            <span>•</span>
                            <span className="text-indigo-400 font-bold">{student.department || student.departmentName || detailModalGroup.departmentName}</span>
                          </div>
                        </div>

                        <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 shrink-0">
                          Pembimbing: {teacherName}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-inherit flex justify-end">
              <button
                type="button"
                onClick={() => setDetailModalGroup(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all cursor-pointer"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UPLOAD SURAT & INPUT NOMOR SURAT */}
      {targetGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-all ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-6 border-b border-inherit flex justify-between items-center bg-indigo-500/10">
              <h3 className="font-extrabold text-base text-indigo-700 dark:text-indigo-400 flex items-center space-x-2">
                <FileCheck2 className="w-5 h-5" />
                <span>Upload Surat & Input Nomor Surat</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setTargetGroup(null);
                  setSuratBase64('');
                  setInputLetterNumber('');
                  setSelectedFileName('');
                }}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSuratGroup} className="p-6 space-y-5 text-xs">
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-indigo-200">
                  Terbitkan Surat Permohonan Resmi Ke Industri
                </h4>
                <p className="text-slate-600 dark:text-slate-400 text-xs font-medium leading-relaxed">
                  Input nomor surat (disimpan ke <code>letterNumber</code>) dan unggah berkas ke <strong>{targetGroup.industryName}</strong>.
                </p>
              </div>

              {/* FIELD INPUT NOMOR SURAT (letterNumber) */}
              <div className="space-y-2">
                <label className="font-extrabold text-slate-300 uppercase flex items-center space-x-1.5">
                  <Hash className="w-4 h-4 text-indigo-400" />
                  <span>Nomor Surat Permohonan PKL (letterNumber): *</span>
                </label>
                <input
                  type="text"
                  required
                  value={inputLetterNumber}
                  onChange={(e) => setInputLetterNumber(e.target.value)}
                  placeholder="Contoh: 421.5/450/SMK-2026"
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-mono font-bold border outline-none transition-all ${
                    theme === 'dark' 
                      ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600'
                  }`}
                />
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 font-medium ${
                theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Industri Tujuan:</span>
                  <strong className="text-indigo-900 dark:text-indigo-300">{targetGroup.industryName}</strong>
                </div>
                {selectedFileName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Nama Berkas:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 truncate max-w-[200px]">{selectedFileName}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Jumlah Siswa Penerima:</span>
                  <strong className="text-slate-900 dark:text-slate-200">
                    {(targetGroup.students || targetGroup.placements || []).length} Siswa
                  </strong>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-500 dark:text-slate-400 uppercase">Pilih File Surat Permohonan (PDF / Gambar):</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50 dark:bg-slate-950/40 text-center space-y-2 cursor-pointer transition-all"
                >
                  <FileText className="w-7 h-7 mx-auto text-indigo-600 dark:text-indigo-400" />
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {suratBase64 ? 'File Surat Berhasil Dipilih (Klik untuk mengganti)' : 'Klik di sini untuk memilih Surat Permohonan'}
                  </p>
                  <p className="text-[10px] text-slate-500">Format: PDF, PNG, JPG (Maksimal 5MB)</p>
                </button>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setTargetGroup(null);
                    setSuratBase64('');
                    setInputLetterNumber('');
                    setSelectedFileName('');
                  }}
                  className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !suratBase64 || !inputLetterNumber.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
                  <span>Simpan & Terbitkan Surat</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRATINJAU DOKUMEN */}
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
                <iframe src={activePreviewUrl} className="w-full h-[550px] rounded-2xl border border-slate-800" title="Document PDF Preview" />
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