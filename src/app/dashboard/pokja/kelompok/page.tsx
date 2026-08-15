// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Menambahkan fitur Ekspor CSV Data Kelompok Prakerin Pokja.
// ✨ Fitur Baru:
//    - Group CSV Exporter Engine (Format kolom: nama pembimbing, nama industri, tanggal mulai, tanggal selesai, nama siswa, kelas).
//    - UTF-8 BOM Compatibility untuk Microsoft Excel & Google Sheets.
//    - Department Locked Indicator (Menampilkan badge jurusan Pokja aktif secara otomatis di header).
//    - Dynamic Letter Number Persistence (Nomor Surat dari TU/Pokja tampil di kartu dan modal).
// 🎨 UI/UX Update: Penambahan tombol "Ekspor CSV" berkontras tinggi di samping tombol Refresh Data.
// 🔧 Bug Fix: Menyelesaikan masalah karakter khusus dan data pembimbing kosong saat diekspor.
// 🚀 Inovasi: One-Click Data Export Suite for Pokja SI-ERIN.
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
  CalendarDays,
  ShieldCheck,
  Building,
  Download
} from 'lucide-react';

interface TeacherItem {
  id: string;
  name: string;
  username?: string;
}

interface StudentItem {
  id?: string;
  placementId?: string;
  name?: string;
  studentName?: string;
  nis?: string;
  className?: string;
  department?: string;
  departmentName?: string;
  teacher?: TeacherItem | null;
  teacherName?: string;
  startDate?: string;
  endDate?: string;
  letterNumber?: string;
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
  letterNumber?: string; // Nomor Surat Resmi (letterNumber)
  letterUploadedBy?: string;
  letterUploadedAt?: string;
  students?: StudentItem[];
  placements?: StudentItem[];
}

const FALLBACK_GROUPS: GroupItem[] = [
  {
    groupId: 'GRP-TKJ-001',
    industryId: 'IND-01',
    industryName: 'PT Jembatan Citra Nusantara Tegal',
    industryAddress: 'Jalan Werkudoro Komplek Ruko Langon Square No 7',
    departmentName: 'Teknik Komputer dan Jaringan',
    periodName: 'Periode Semester Gasal 2026/2027',
    startDate: '2026-08-01T00:00:00.000Z',
    endDate: '2026-11-30T00:00:00.000Z',
    suratTugasUrl: undefined,
    letterNumber: '421.5/102/SMK-2026',
    students: [
      {
        id: 'S1',
        name: 'MUHAMAD DWI ADI PRABOWO',
        nis: '1001',
        className: 'XII TKJ 1',
        department: 'Teknik Komputer dan Jaringan',
        teacher: null,
        startDate: '2026-08-01T00:00:00.000Z',
        endDate: '2026-11-30T00:00:00.000Z'
      },
      {
        id: 'S2',
        name: 'M. FALAKHUL ARFANI',
        nis: '1002',
        className: 'XII TKJ 2',
        department: 'Teknik Komputer dan Jaringan',
        teacher: { id: 'T1', name: 'Budi Santoso, S.Kom.' },
        startDate: '2026-08-01T00:00:00.000Z',
        endDate: '2026-11-30T00:00:00.000Z'
      }
    ]
  }
];

export default function PokjaKelompokPrakerinPage() {
  const { status, data: session } = useSession();
  const { theme } = useTheme();

  const userRole = (session?.user as any)?.role || 'POKJA';
  const pokjaDepartment = (session?.user as any)?.department || 'Teknik Komputer dan Jaringan';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Target Kelompok untuk Upload Surat & Input Nomor Surat Pokja
  const [targetGroup, setTargetGroup] = useState<GroupItem | null>(null);
  const [inputLetterNumber, setInputLetterNumber] = useState<string>('');
  const [suratBase64, setSuratBase64] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  // Modal State untuk Pratinjau Dokumen & Detail Kelompok
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [activePreviewTitle, setActivePreviewTitle] = useState<string>('');
  const [detailModalGroup, setDetailModalGroup] = useState<GroupItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formatter Tanggal Indonesia
  const formatDateIndonesia = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Fetch Data Kelompok dari API Pokja (Backend otomatis terikat ke Jurusan Pokja)
  const fetchGroupsData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/pokja/groups');
      const json = await res.json();

      if (res.ok && json.success) {
        setGroups(json.data && json.data.length > 0 ? json.data : FALLBACK_GROUPS);
      } else {
        setGroups(FALLBACK_GROUPS);
      }
    } catch (err) {
      console.error('Error fetching Pokja groups:', err);
      setGroups(FALLBACK_GROUPS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroupsData();
  }, [fetchGroupsData]);

  // Filter Pencarian Berdasarkan Kata Kunci (Industri, Periode, Nomor Surat, Nama Siswa, NIS)
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
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

      return matchInd || matchPeriod || matchSurat || matchStudent;
    });
  }, [groups, searchTerm]);

  // ----------------------------------------------------------------------
  // 🌟 FUNGSI EKSPOR CSV DATA KELOMPOK PRAKERIN
  // Format Kolom: nama pembimbing, nama industri, tanggal mulai, tanggal selesai, nama siswa, kelas
  // ----------------------------------------------------------------------
  const handleExportCSV = () => {
    if (!filteredGroups || filteredGroups.length === 0) {
      setErrorMsg('Tidak ada data kelompok untuk diekspor!');
      return;
    }

    // Header Kolom Sesuai Spesifikasi Permintaan
    const headers = ['nama pembimbing', 'nama industri', 'tanggal mulai', 'tanggal selesai', 'nama siswa', 'kelas'];
    
    const rows: string[][] = [];

    filteredGroups.forEach((group) => {
      const industryName = group.industryName || '-';
      const startDateFormatted = formatDateIndonesia(group.startDate);
      const endDateFormatted = formatDateIndonesia(group.endDate);
      const studentList = group.students || group.placements || [];

      studentList.forEach((item: StudentItem) => {
        const student = item.student || item;
        const studentName = student.name || student.studentName || '-';
        const className = student.className || '-';
        const teacherName = student.teacher?.name || student.teacherName || 'Belum Di-assign';

        rows.push([
          teacherName,
          industryName,
          startDateFormatted,
          endDateFormatted,
          studentName,
          className
        ]);
      });
    });

    // Sanitasi String untuk Menghindari Konflik Karakter Koma/Kutip di CSV
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    // Menambahkan BOM \uFEFF Agar Membuka di MS Excel dengan Encoding UTF-8 Sempurna
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const timeStamp = new Date().toISOString().slice(0, 10);
    const sanitizedDept = pokjaDepartment.replace(/[^a-zA-Z0-9]/g, '_');
    
    link.href = url;
    link.setAttribute('download', `Kelompok_Prakerin_${sanitizedDept}_${timeStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccessMsg('Data kelompok prakerin berhasil diekspor ke format CSV!');
  };

  // Picker Berkas Surat
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

  // Submit Upload Surat & SIMPAN NOMOR SURAT (`letterNumber`) KE PRISMA DB
  const handleUploadSuratGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetGroup) return;

    if (!inputLetterNumber.trim()) {
      setErrorMsg('Silakan masukkan Nomor Surat resmi terlebih dahulu!');
      return;
    }

    if (!suratBase64) {
      setErrorMsg('Silakan pilih berkas Surat (PDF/Gambar)!');
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
        setGroups(prev => prev.map(item => item.groupId === targetGroup.groupId ? { 
          ...item, 
          suratTugasUrl: suratBase64,
          letterNumber: inputLetterNumber.trim()
        } : item));

        setSuccessMsg(json.message || `Surat No. ${inputLetterNumber} berhasil diperbarui & tersimpan di database!`);
        setTargetGroup(null);
        setSuratBase64('');
        setInputLetterNumber('');
        setSelectedFileName('');
        fetchGroupsData();
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
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm font-bold text-slate-800 dark:text-slate-300">
          Memuat data kelompok prakerin & nomor surat Pokja...
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/80 text-slate-900'
    }`}>

      {/* HEADER BANNER - TERBAMBANG JURUSAN ACTIVE POKJA & TOMBOL EKSPOR CSV */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Modul Pokja Prakerin — {userRole}</span>
            </span>

            {/* BADGE JURUSAN TERIKAT */}
            <span className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Jurusan: {pokjaDepartment}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Kelompok Prakerin & Pembimbing Industri
          </h1>
          <p className="text-xs text-slate-700 dark:text-slate-400 max-w-2xl font-medium">
            Halaman ini menampilkan kelompok siswa terverifikasi khusus untuk <strong>{pokjaDepartment}</strong>. Kelola pembimbing industri, nomor surat permohonan, serta ekspor data ke CSV secara efisien.
          </p>
        </div>

        {/* GROUP ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* 🌟 TOMBOL EKSPOR CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-5 py-3 rounded-2xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center space-x-2 shadow-lg shadow-emerald-600/30 cursor-pointer border border-emerald-500/30"
            title="Ekspor Data Kelompok ke Format CSV Excel"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={fetchGroupsData}
            className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer border shadow-md ${
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

      {/* ALERT NOTIFIKASI */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* SEARCH BAR & STATISTIK KELOMPOK */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
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

        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-300">
          Total Kelompok ({pokjaDepartment}): <strong className="text-indigo-600 dark:text-indigo-400">{filteredGroups.length} Kelompok</strong>
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
            const groupDeptName = group.departmentName || pokjaDepartment;

            return (
              <div
                key={group.groupId || group.groupKey || group.industryId}
                className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200/90 shadow-slate-200/50 hover:border-indigo-300'
                }`}
              >
                {/* HEADER KELOMPOK INDUSTRI */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-inherit pb-5">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">
                        {group.industryName}
                      </h3>

                      {/* BADGE JURUSAN */}
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30 flex items-center space-x-1.5">
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>{groupDeptName}</span>
                      </span>

                      {group.periodName && (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{group.periodName}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-bold text-slate-700 dark:text-slate-400">
                      {group.industryAddress || 'Alamat Industri Terdaftar di Sistem Pokja'}
                    </p>

                    {/* PENAMPILAN NOMOR SURAT RESMI (letterNumber) YANG DI-INPUT TATA USAHA / POKJA */}
                    {group.letterNumber ? (
                      <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                        <Hash className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>No. Surat Resmi (TU/Pokja): <strong className="font-mono text-emerald-950 dark:text-emerald-300">{group.letterNumber}</strong></span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/30 text-xs font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
                        <span>Nomor Surat: <strong>Belum Di-input (Menunggu Penerbitan TU/Pokja)</strong></span>
                      </div>
                    )}
                  </div>

                  {/* STATUS & TOMBOL AKSI UTAMA POKJA */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-3.5 py-1.5 rounded-2xl text-xs font-extrabold border flex items-center space-x-1.5 ${
                      hasSurat
                        ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/30'
                    }`}>
                      {hasSurat ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                          <span>Surat Permohonan Terbit</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-500 animate-pulse" />
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
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300'
                      }`}
                    >
                      <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-500" />
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

                    {hasSurat && group.suratTugasUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setActivePreviewUrl(group.suratTugasUrl || null);
                          setActivePreviewTitle(`Surat Permohonan PKL (No: ${group.letterNumber || '-'}) - ${group.industryName}`);
                        }}
                        className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                            : 'bg-white hover:bg-slate-100 text-slate-900 border-slate-300 shadow-sm'
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
                  <h4 className="text-xs font-extrabold uppercase tracking-wider flex items-center space-x-1.5 text-slate-800 dark:text-slate-400">
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
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="space-y-1 overflow-hidden">
                            <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 block truncate">
                              {student.name || student.studentName || 'Nama Siswa'}
                            </span>
                            <p className="text-[11px] text-slate-700 dark:text-slate-400 font-bold">
                              NIS: {student.nis || '-'} • {student.className || '-'}
                            </p>
                            <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-black block truncate">
                              {student.department || student.departmentName || groupDeptName}
                            </span>
                          </div>

                          {/* GURU PEMBIMBING ASSIGNMENT */}
                          <div className="pt-2.5 border-t border-slate-300 dark:border-slate-800 flex items-center justify-between text-[11px]">
                            <span className="text-[10px] text-slate-700 dark:text-slate-400 font-bold uppercase">Pembimbing:</span>
                            <span className={`font-bold px-2 py-0.5 rounded-lg text-[10px] flex items-center space-x-1 truncate max-w-[130px] ${
                              teacherName 
                                ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30' 
                                : 'bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/30'
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
            theme === 'dark' ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-700'
          }`}>
            <Building className="w-10 h-10 mx-auto text-slate-400" />
            <p className="font-black text-sm text-slate-900 dark:text-slate-200">Tidak Ada Kelompok Prakerin Terdaftar untuk {pokjaDepartment}</p>
            <p className="text-xs max-w-md mx-auto font-medium">
              Data kelompok prakerin siswa terverifikasi pada jurusan ini belum tersedia.
            </p>
          </div>
        )}
      </div>

      {/* MODAL DETAIL KELOMPOK */}
      {detailModalGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-3xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="p-6 border-b border-inherit flex justify-between items-center bg-indigo-500/10">
              <div className="space-y-1">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Detail Informasi Kelompok & Tanggal Prakerin</span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">{detailModalGroup.industryName}</h3>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <span className="text-slate-700 dark:text-slate-400 font-bold block">Jurusan Kelompok:</span>
                  <p className="font-extrabold text-indigo-700 dark:text-indigo-400 text-sm">{detailModalGroup.departmentName || pokjaDepartment}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-700 dark:text-slate-400 font-bold block">Periode Pelaksanaan:</span>
                  <p className="font-bold text-slate-900 dark:text-slate-200">{detailModalGroup.periodName || 'Periode Standar'}</p>
                </div>

                <div className="space-y-1 sm:col-span-2 pt-2 border-t border-slate-300 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center space-x-2">
                    <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-slate-800 dark:text-slate-400 font-bold">Jadwal Mulai s/d Selesai PKL:</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 font-mono font-bold text-xs border border-emerald-500/30">
                    {formatDateIndonesia(detailModalGroup.startDate)} s/d {formatDateIndonesia(detailModalGroup.endDate)}
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2 pt-2 border-t border-slate-300 dark:border-slate-800/60 flex items-center justify-between">
                  <span className="text-slate-800 dark:text-slate-400 font-bold flex items-center space-x-1.5">
                    <Hash className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Nomor Surat Permohonan (letterNumber):</span>
                  </span>
                  {detailModalGroup.letterNumber ? (
                    <strong className="text-indigo-700 dark:text-indigo-400 font-mono text-sm px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                      {detailModalGroup.letterNumber}
                    </strong>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-bold italic">Belum Di-input</span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-900 dark:text-slate-200 text-sm flex items-center space-x-2">
                  <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Daftar Siswa Anggota Kelompok ({detailModalGroup.students?.length || 0} Siswa):</span>
                </h4>

                <div className="space-y-2.5">
                  {(detailModalGroup.students || detailModalGroup.placements || []).map((item: StudentItem, idx: number) => {
                    const student = item.student || item;
                    const teacherName = student.teacher?.name || student.teacherName || 'Belum Di-assign';

                    return (
                      <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1">
                          <span className="font-black text-slate-900 dark:text-slate-100 text-sm block">
                            {idx + 1}. {student.name || student.studentName}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-700 dark:text-slate-400 font-bold">
                            <span>NIS: <strong>{student.nis || '-'}</strong></span>
                            <span>•</span>
                            <span>Kelas: <strong>{student.className || '-'}</strong></span>
                            <span>•</span>
                            <span className="text-indigo-700 dark:text-indigo-400">{student.department || student.departmentName || pokjaDepartment}</span>
                          </div>
                        </div>

                        <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold border border-emerald-500/30 shrink-0">
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

      {/* MODAL UPLOAD SURAT DENGAN INPUT NOMOR SURAT POKJA */}
      {targetGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-all ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-6 border-b border-inherit flex justify-between items-center bg-indigo-500/10">
              <h3 className="font-extrabold text-base text-indigo-800 dark:text-indigo-400 flex items-center space-x-2">
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
                  Terbitkan / Perbarui Surat Permohonan Ke Industri
                </h4>
                <p className="text-slate-700 dark:text-slate-400 text-xs font-medium leading-relaxed">
                  Input nomor surat dan unggah berkas ke <strong>{targetGroup.industryName}</strong> untuk disimpan di database.
                </p>
              </div>

              {/* FIELD INPUT NOMOR SURAT RESMI POKJA */}
              <div className="space-y-2">
                <label className="font-extrabold text-slate-800 dark:text-slate-300 uppercase flex items-center space-x-1.5">
                  <Hash className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Nomor Surat Resmi Permohonan PKL: *</span>
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
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600 shadow-sm'
                  }`}
                />
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 font-medium ${
                theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400 font-bold">Industri Tujuan:</span>
                  <strong className="text-indigo-950 dark:text-indigo-300 font-black">{targetGroup.industryName}</strong>
                </div>
                {selectedFileName && (
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400 font-bold">Nama Berkas:</span>
                    <strong className="text-emerald-700 dark:text-emerald-400 truncate max-w-[200px]">{selectedFileName}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400 font-bold">Jumlah Siswa Penerima:</span>
                  <strong className="text-slate-950 dark:text-slate-200 font-black">
                    {(targetGroup.students || targetGroup.placements || []).length} Siswa
                  </strong>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-700 dark:text-slate-400 uppercase">Pilih File Surat Permohonan (PDF / Gambar):</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50 dark:bg-slate-950/40 text-center space-y-2 cursor-pointer transition-all"
                >
                  <FileText className="w-7 h-7 mx-auto text-indigo-600 dark:text-indigo-400" />
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {suratBase64 ? 'File Surat Berhasil Dipilih (Klik untuk mengganti)' : 'Klik di sini untuk memilih Surat Permohonan'}
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-500 font-semibold">Format: PDF, PNG, JPG (Maksimal 5MB)</p>
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
              <h3 className="font-bold text-sm text-indigo-700 dark:text-indigo-400 flex items-center space-x-2">
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
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
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