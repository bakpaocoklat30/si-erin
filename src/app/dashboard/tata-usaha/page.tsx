// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Mengimplementasikan Ultra-Permissive Multi-Criteria Period Matcher untuk menjamin kelompok Pokja selalu lolos filter.
// ✨ Fitur Baru: Robust Academic Year Extractor, Dependent Period Selector, & Synchronized Matrix Stat Cards.
// 🎨 UI/UX Update: Glassmorphic Dropdown Controls, Dynamic Reset Indicator, & Responsive Table Matrix.
// 🔧 Bug Fix: Membasmi bug "Data 0 Total saat Filter Terpilih" dengan Fuzzy Normalization matching.
// 🚀 Inovasi: Zero-Loss Data Retrieval & Fuzzy Relational Matching Pipeline.
// ----------------------------------------------------------------------

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FileText, 
  RefreshCw, 
  ShieldCheck,
  Loader2,
  Calendar,
  Filter,
  TrendingUp,
  Truck,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  FileCheck2,
  Award,
  Users,
  Layers
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';

export default function TataUsahaDashboardPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  const userRole = (session?.user as any)?.role || 'TATA_USAHA';

  // Master Data & Placement States
  const [placements, setPlacements] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [academicYearsList, setAcademicYearsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Dependent Filter States
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 🛡️ Helper safe converter
  const safeStr = (val: any): string => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'object') {
      return val.name || val.year || val.title || val.code || '-';
    }
    return String(val);
  };

  // 🛡️ Helper pembaca string Tahun Pelajaran secara presisi
  const getYearString = (yearData: any): string => {
    if (!yearData) return '';
    if (typeof yearData === 'string') return yearData.trim();
    if (typeof yearData === 'object') return (yearData.year || yearData.name || '').trim();
    return String(yearData).trim();
  };

  // 🛡️ Helper normalisasi string untuk pencocokan toleran (menghapus spasi ganda & karakter khusus)
  const normalizeString = (str: string): string => {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  // LOAD MASTER DATA DARI API BACKEND
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const timestamp = new Date().getTime();
      const [resLetters, resPeriods, resYears] = await Promise.all([
        fetch(`/api/letters?t=${timestamp}`),
        fetch(`/api/admin/master?type=period&t=${timestamp}`),
        fetch(`/api/admin/master?type=academic_year&t=${timestamp}`)
      ]);

      const jsonLetters = await resLetters.json();
      const jsonPeriods = await resPeriods.json();
      const jsonYears = await resYears.json();

      if (resLetters.ok && jsonLetters.success) {
        setPlacements(jsonLetters.data || []);
      } else if (jsonLetters.error) {
        setErrorMsg(jsonLetters.error);
      }

      if (resPeriods.ok && jsonPeriods.success) {
        setPeriods(jsonPeriods.data || []);
      }

      if (resYears.ok && jsonYears.success) {
        setAcademicYearsList(jsonYears.data || []);
      }
    } catch (err) {
      console.error('Gagal mengambil data:', err);
      setErrorMsg('Gagal terhubung ke API server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, fetchData]);

  // 1. EXTRACT DYNAMIC TAHUN PELAJARAN MURNI DARI DATABASE MASTER
  const academicYearsFromDb = useMemo(() => {
    const yearSet = new Set<string>();

    academicYearsList.forEach((y: any) => {
      const str = getYearString(y);
      if (str) yearSet.add(str);
    });

    periods.forEach((p: any) => {
      const str = getYearString(p.academicYear) || getYearString(p.year);
      if (str) yearSet.add(str);
    });

    placements.forEach((p: any) => {
      const str = getYearString(p.period?.academicYear) || getYearString(p.period?.year);
      if (str) yearSet.add(str);
    });

    return Array.from(yearSet).sort((a, b) => b.localeCompare(a));
  }, [academicYearsList, periods, placements]);

  // 2. DEPENDENT DROPDOWN: FILTER PERIODE BERDASARKAN TAHUN PELAJARAN TERPILIH
  const filteredPeriodsByYear = useMemo(() => {
    if (selectedYear === 'ALL') {
      return periods;
    }
    return periods.filter((p: any) => {
      const periodYear = getYearString(p.academicYear) || getYearString(p.year);
      return periodYear === selectedYear;
    });
  }, [periods, selectedYear]);

  // SAAT TAHUN PELAJARAN DIUBAH, RESET SELEKSI PERIODE KE 'ALL'
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = e.target.value;
    setSelectedYear(newYear);
    setSelectedPeriodId('ALL');
  };

  // 3. 🌟 ULTRA-PERMISSIVE MULTI-CRITERIA FILTER MATCHING ENGINE (SOLUSI DUA SCREENSHOT)
  const filteredPlacements = useMemo(() => {
    return placements.filter((item: any) => {
      // BACA TAHUN PELAJARAN ITEM
      const itemYear = getYearString(item.period?.academicYear) || getYearString(item.period?.year) || getYearString(item.academicYear);
      
      // Match Year Filter
      const matchYear = selectedYear === 'ALL' || itemYear === selectedYear || itemYear === '';

      // Match Period Filter: Cek ID, Fuzzy Name, maupun Title
      let matchPeriod = selectedPeriodId === 'ALL';
      if (!matchPeriod) {
        const pId = item.periodId || item.period?.id || item.internshipPeriodId;
        const pName = item.period?.name || item.period?.title || '';
        
        // Cari objek periode terpilih dari master data
        const selectedPeriodObj = periods.find((p) => p.id === selectedPeriodId);
        const targetName = selectedPeriodObj?.name || selectedPeriodObj?.title || '';

        const directIdMatch = Boolean(pId && pId === selectedPeriodId);
        
        const fuzzyNameMatch = Boolean(
          pName && targetName && normalizeString(pName).includes(normalizeString(targetName)) ||
          normalizeString(targetName).includes(normalizeString(pName))
        );

        // Jika data item tidak punya periodId (misal placement baru), loloskan jika tahun pelajarannya cocok
        const fallbackMatch = !pId && matchYear;

        matchPeriod = directIdMatch || fuzzyNameMatch || fallbackMatch;
      }

      // Match Search Query
      const studentName = safeStr(item.student?.name).toLowerCase();
      const industryName = safeStr(item.industry?.name).toLowerCase();
      const periodName = safeStr(item.period?.name || item.period?.title).toLowerCase();
      const searchLower = searchQuery.toLowerCase();
      
      const matchSearch = 
        searchQuery === '' ||
        studentName.includes(searchLower) || 
        industryName.includes(searchLower) ||
        periodName.includes(searchLower);

      return matchYear && matchPeriod && matchSearch;
    });
  }, [placements, periods, selectedYear, selectedPeriodId, searchQuery]);

  // 📊 RATIO STATISTICAL METRICS (BERAPA / TOTAL)
  const stats = useMemo(() => {
    const total = filteredPlacements.length;

    if (total === 0) {
      return {
        total: 0,
        pengajuan: { count: 0, total: 0, percentage: 0 },
        penerjunan: { count: 0, total: 0, percentage: 0 },
        monitoring: { count: 0, total: 0, percentage: 0 },
        penarikan: { count: 0, total: 0, percentage: 0 },
      };
    }

    // 1. Surat Permohonan / Pengajuan
    const pengajuanDone = filteredPlacements.filter(
      (item) => Boolean(item.suratTugasUrl || item.letterFile) || item.stage >= 4 || item.status === 'SURAT_DITERBITKAN' || item.status === 'LETTER_ISSUED'
    ).length;

    // 2. Surat Tugas Penerjunan
    const penerjunanDone = filteredPlacements.filter(
      (item) => Boolean(item.suratPenerjunanUrl) || item.stage >= 5 || item.status === 'TERKIRIM_DUDI' || item.status === 'SEDANG_PKL'
    ).length;

    // 3. Surat Tugas Monitoring
    const monitoringDone = filteredPlacements.filter(
      (item) => Boolean(item.suratMonitoringUrl) || item.isMonitored || item.status === 'MONITORING_DONE'
    ).length;

    // 4. Surat Penarikan PKL
    const penarikanDone = filteredPlacements.filter(
      (item) => Boolean(item.suratPenarikanUrl) || item.stage >= 6 || item.status === 'SELESAI_PKL' || item.status === 'PENARIKAN_DONE'
    ).length;

    return {
      total,
      pengajuan: {
        count: pengajuanDone,
        total,
        percentage: Math.round((pengajuanDone / total) * 100)
      },
      penerjunan: {
        count: penerjunanDone,
        total,
        percentage: Math.round((penerjunanDone / total) * 100)
      },
      monitoring: {
        count: monitoringDone,
        total,
        percentage: Math.round((monitoringDone / total) * 100)
      },
      penarikan: {
        count: penarikanDone,
        total,
        percentage: Math.round((penarikanDone / total) * 100)
      }
    };
  }, [filteredPlacements]);

  if (status === 'loading') {
    return (
      <div className={`min-h-[70vh] flex items-center justify-center ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="flex items-center space-x-3">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="text-xs font-semibold">Memuat Analytics Tata Usaha...</span>
        </div>
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
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Portal Bidang Persuratan Tata Usaha ({userRole})</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-indigo-500" />
            <span>Analytics & Statistik Persuratan PKL</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Ringkasan eksekutif penerbitan seluruh dokumen resmi PKL (Surat Pengajuan, Penerjunan, Monitoring, dan Penarikan) terintegrasi Master Data Database.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2.5 rounded-2xl border text-xs font-bold flex items-center space-x-2 transition-all bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard Utama</span>
          </Link>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2.5 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold flex items-center space-x-2 cursor-pointer transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SMART DEPENDENT FILTER BAR (DATABASE DRIVEN) */}
      <div className={`p-6 rounded-3xl border shadow-lg flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold">Filter Parameter Database</h3>
            <p className="text-[11px] text-slate-400">Pilih Tahun Pelajaran & Periode PKL (Terhubung Otomatis)</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          
          {/* 1. Dropdown Tahun Pelajaran (Database Master Driven) */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
            <select
              value={selectedYear}
              onChange={handleYearChange}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-2xl border text-xs font-extrabold outline-none cursor-pointer transition-all ${
                theme === 'dark'
                  ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
              }`}
            >
              <option value="ALL">Semua Tahun Pelajaran ({academicYearsFromDb.length})</option>
              {academicYearsFromDb.map((year) => (
                <option key={year} value={year}>
                  T.A. {year}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Dependent Dropdown Periode PKL (Tersaring berdasarkan Tahun Pelajaran) */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-2xl border text-xs font-extrabold outline-none cursor-pointer transition-all ${
                theme === 'dark'
                  ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
              }`}
            >
              <option value="ALL">
                {selectedYear === 'ALL' 
                  ? `Semua Periode Gelombang (${filteredPeriodsByYear.length})` 
                  : `Semua Periode T.A. ${selectedYear} (${filteredPeriodsByYear.length})`}
              </option>
              {filteredPeriodsByYear.map((period: any) => {
                const yearLabel = getYearString(period.academicYear) || getYearString(period.year) || 'T.A.';
                const titleLabel = period.name || period.title || 'Periode PKL';
                return (
                  <option key={period.id} value={period.id}>
                    {titleLabel} ({yearLabel})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Reset Filter Button */}
          {(selectedYear !== 'ALL' || selectedPeriodId !== 'ALL' || searchQuery !== '') && (
            <button
              type="button"
              onClick={() => {
                setSelectedYear('ALL');
                setSelectedPeriodId('ALL');
                setSearchQuery('');
              }}
              className="px-3.5 py-2.5 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold transition-all cursor-pointer"
            >
              Reset Filter
            </button>
          )}

        </div>
      </div>

      {/* STATS CARDS SECTION (RATIO STATISTIK: BERAPA / TOTAL) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* CARD 1: SURAT PENGAJUAN / PERMOHONAN */}
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 relative overflow-hidden transition-all hover:scale-[1.02] ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Surat Permohonan / Pengajuan</span>
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-indigo-500">{stats.pengajuan.count}</span>
              <span className="text-sm font-extrabold text-slate-400">/ {stats.pengajuan.total}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Selesai diterbitkan oleh TU</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold">
              <span>Capaian Persuratan</span>
              <span className="text-indigo-500">{stats.pengajuan.percentage}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                style={{ width: `${stats.pengajuan.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* CARD 2: SURAT PENERJUNAN */}
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 relative overflow-hidden transition-all hover:scale-[1.02] ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Surat Tugas Penerjunan</span>
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Truck className="w-6 h-6" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-emerald-500">{stats.penerjunan.count}</span>
              <span className="text-sm font-extrabold text-slate-400">/ {stats.penerjunan.total}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Siswa resmi diterjunkan ke DUDI</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold">
              <span>Capaian Persuratan</span>
              <span className="text-emerald-500">{stats.penerjunan.percentage}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                style={{ width: `${stats.penerjunan.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* CARD 3: SURAT MONITORING */}
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 relative overflow-hidden transition-all hover:scale-[1.02] ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Surat Tugas Monitoring</span>
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
              <FileCheck2 className="w-6 h-6" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-amber-500">{stats.monitoring.count}</span>
              <span className="text-sm font-extrabold text-slate-400">/ {stats.monitoring.total}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Kunjungan Guru Pembimbing</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold">
              <span>Capaian Persuratan</span>
              <span className="text-amber-500">{stats.monitoring.percentage}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                style={{ width: `${stats.monitoring.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* CARD 4: SURAT PENARIKAN */}
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 relative overflow-hidden transition-all hover:scale-[1.02] ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Surat Penarikan PKL</span>
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
              <Award className="w-6 h-6" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-purple-500">{stats.penarikan.count}</span>
              <span className="text-sm font-extrabold text-slate-400">/ {stats.penarikan.total}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Selesai masa PKL di Industri</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold">
              <span>Capaian Persuratan</span>
              <span className="text-purple-500">{stats.penarikan.percentage}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div 
                className="h-full bg-purple-500 rounded-full transition-all duration-500" 
                style={{ width: `${stats.penarikan.percentage}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* MATRIX TABLE SECTION WITH LIVE SEARCH */}
      <div className={`rounded-3xl border shadow-xl overflow-hidden ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="p-6 border-b border-inherit flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <Users className="w-5 h-5 text-indigo-500" />
            <h3 className="text-base font-extrabold">Matriks Status Persuratan Siswa ({filteredPlacements.length} Total)</h3>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa atau DUDI..."
              className={`w-full pl-10 pr-4 py-2 rounded-2xl text-xs font-semibold border outline-none transition-all ${
                theme === 'dark'
                  ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
              }`}
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-400">Memuat matriks statistik persuratan...</p>
          </div>
        ) : filteredPlacements.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <FileText className="w-12 h-12 text-slate-500 mx-auto opacity-40" />
            <p className="text-xs font-semibold text-slate-400">Tidak ada data persuratan yang cocok dengan filter terpilih.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b border-inherit uppercase text-[10px] font-black tracking-wider ${
                  theme === 'dark' ? 'bg-slate-950/50 text-slate-400' : 'bg-slate-50 text-slate-500'
                }`}>
                  <th className="p-4">Siswa Pengaju</th>
                  <th className="p-4">Kelas / Jurusan</th>
                  <th className="p-4">Industri Tujuan (DUDI)</th>
                  <th className="p-4 text-center">Surat Pengajuan</th>
                  <th className="p-4 text-center">Surat Penerjunan</th>
                  <th className="p-4 text-center">Surat Monitoring</th>
                  <th className="p-4 text-center">Surat Penarikan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit font-semibold">
                {filteredPlacements.map((item) => {
                  const hasPengajuan = Boolean(item.suratTugasUrl || item.letterFile) || item.stage >= 4;
                  const hasPenerjunan = Boolean(item.suratPenerjunanUrl) || item.stage >= 5;
                  const hasMonitoring = Boolean(item.suratMonitoringUrl) || item.isMonitored;
                  const hasPenarikan = Boolean(item.suratPenarikanUrl) || item.stage >= 6;

                  return (
                    <tr key={item.id} className="hover:bg-slate-500/5 transition-colors">
                      <td className="p-4 font-extrabold text-slate-200">
                        {safeStr(item.student?.name)}
                      </td>
                      <td className="p-4 text-slate-400">
                        {safeStr(item.student?.className)}
                      </td>
                      <td className="p-4 font-bold text-indigo-400">
                        {safeStr(item.industry?.name)}
                      </td>
                      
                      {/* Status Surat Pengajuan */}
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center space-x-1 ${
                          hasPengajuan ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-500/10 text-slate-500'
                        }`}>
                          <CheckCircle2 className={`w-3 h-3 ${hasPengajuan ? 'text-indigo-400' : 'text-slate-500'}`} />
                          <span>{hasPengajuan ? 'Terbit' : 'Belum'}</span>
                        </span>
                      </td>

                      {/* Status Surat Penerjunan */}
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center space-x-1 ${
                          hasPenerjunan ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-500'
                        }`}>
                          <CheckCircle2 className={`w-3 h-3 ${hasPenerjunan ? 'text-emerald-400' : 'text-slate-500'}`} />
                          <span>{hasPenerjunan ? 'Selesai' : 'Belum'}</span>
                        </span>
                      </td>

                      {/* Status Surat Monitoring */}
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center space-x-1 ${
                          hasMonitoring ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-slate-500'
                        }`}>
                          <CheckCircle2 className={`w-3 h-3 ${hasMonitoring ? 'text-amber-400' : 'text-slate-500'}`} />
                          <span>{hasMonitoring ? 'Aktif' : 'Belum'}</span>
                        </span>
                      </td>

                      {/* Status Surat Penarikan */}
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center space-x-1 ${
                          hasPenarikan ? 'bg-purple-500/10 text-purple-400' : 'bg-slate-500/10 text-slate-500'
                        }`}>
                          <CheckCircle2 className={`w-3 h-3 ${hasPenarikan ? 'text-purple-400' : 'text-slate-500'}`} />
                          <span>{hasPenarikan ? 'Selesai' : 'Belum'}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}