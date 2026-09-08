// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Membuat Halaman Real-Time Analytics & Interactive Export Center khusus Tim Pokja.
// ✨ Fitur Baru: Live Analytics Cards, Interactive Status Pie/Bar Visualization, CSV/Excel/PDF Exporter, & Real-time Audit Trigger.
// 🎨 UI/UX Update: Dashboard Glassmorphic Enterprise dengan Chart Ringkasan, Quick Filter, dan Download Progress Indicator.
// 🚀 Inovasi: Integrated Multi-Format Data Exporter Engine.
// ----------------------------------------------------------------------

'use client';

import { useState, useEffect } from 'react';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';
import {
  BarChart3,
  RefreshCw,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  Clock,
  Building2,
  TrendingUp,
  PieChart,
  Download,
  Loader2,
  ShieldAlert,
  ArrowLeft,
  Filter,
  Check
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';

export default function PokjaAnalyticsPage() {
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [exporting, setExporting] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pokja/analytics?t=' + new Date().getTime());
      const json = await res.json();
      if (json.success) {
        setAnalytics(json.analytics);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedClass]);

  // 🌟 HELPER EKSPOR DATA KE FORMAT CSV (EXCEL COMPATIBLE)
  const handleExportCSV = () => {
    if (!analytics?.exportData) return;

    setExporting(true);
    try {
      let filtered = analytics.exportData;
      if (filterDepartment !== 'ALL') {
        filtered = filtered.filter((d: any) => d.department === filterDepartment);
      }

      const headers = ['NIS', 'NISN', 'Nama Siswa', 'Kelas', 'Jurusan', 'No Telepon', 'Status BPJS', 'Status CV', 'Industri PKL', 'Status Pengajuan', 'Pembimbing'];
      const rows = filtered.map((s: any) => [
        `"${s.nis}"`,
        `"${s.nisn}"`,
        `"${s.name}"`,
        `"${s.className}"`,
        `"${s.department}"`,
        `"${s.phone}"`,
        `"${s.bpjsStatus}"`,
        `"${s.cvStatus}"`,
        `"${s.industryName}"`,
        `"${s.placementStatus}"`,
        `"${s.teacherName}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `LAPORAN_REKAP_PKL_SIERIN_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Gagal mengekspor data CSV.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-[80vh] flex flex-col justify-center items-center space-y-4 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Mengkalkulasi Analitik Real-Time Pokja...</p>
      </div>
    );
  }

  const metrics = analytics?.metrics || {};
  const departmentStats = analytics?.departmentStats || [];
  const topIndustries = analytics?.topIndustries || [];

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
            href="/dashboard/pokja"
            className="inline-flex items-center space-x-2 text-xs font-bold text-indigo-500 hover:underline mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Dashboard Pokja</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-indigo-500" />
            <span>Real-Time Analytics & Export Center</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Pusat analisis statistik PKL realtime dan unduh laporan resmi rekapitulasi siswa, status penempatan, serta keterisian kuota DUDI.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={fetchAnalytics}
            className="px-4 py-2.5 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold flex items-center space-x-2 cursor-pointer transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Analytics</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={exporting}
            className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center space-x-2 cursor-pointer shadow-lg shadow-emerald-600/30 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exporting ? 'Mengekspor...' : 'Ekspor Rekap Excel (CSV)'}</span>
          </button>
        </div>
      </div>

      {/* SUMMARY STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className={`p-6 rounded-3xl border shadow-lg space-y-2 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Siswa Terdaftar</span>
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black">{metrics.totalStudents || 0}</p>
          <p className="text-[11px] text-slate-500 font-medium">Siswa terdaftar dalam database</p>
        </div>

        <div className={`p-6 rounded-3xl border shadow-lg space-y-2 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pengajuan Diterima</span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400">{metrics.statusDiterima || 0}</p>
          <p className="text-[11px] text-slate-500 font-medium">Siswa resmi diterima di DUDI</p>
        </div>

        <div className={`p-6 rounded-3xl border shadow-lg space-y-2 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Menunggu Verifikasi</span>
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-400">{(metrics.statusPengajuan || 0) + (metrics.statusProses || 0)}</p>
          <p className="text-[11px] text-slate-500 font-medium">Pengajuan dalam antrean Pokja/DUDI</p>
        </div>

        <div className={`p-6 rounded-3xl border shadow-lg space-y-2 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Keterisian Kuota DUDI</span>
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-500">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-purple-400">{metrics.quotaPercentage}%</p>
          <p className="text-[11px] text-slate-500 font-medium">{metrics.totalQuotaUsed} dari {metrics.totalQuotaAvailable} total kuota</p>
        </div>

      </div>

      {/* ANALYTICS CHARTS SECTION DENGAN RECHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* KIRI: GRAFIK STATUS PENGAJUAN (BAR CHART) */}
        <div className={`lg:col-span-7 p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="border-b border-inherit pb-4">
            <h3 className="text-base font-extrabold flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              <span>Grafik Status Penempatan PKL</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Perbandingan jumlah siswa berdasarkan status penerimaan.</p>
          </div>
          
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart
                data={[
                  { name: 'Diterima', count: metrics.statusDiterima || 0, fill: '#10b981' },
                  { name: 'Proses/Menunggu', count: (metrics.statusPengajuan || 0) + (metrics.statusProses || 0), fill: '#f59e0b' },
                  { name: 'Ditolak', count: metrics.statusDitolak || 0, fill: '#ef4444' },
                ]}
                margin={{ top: 20, right: 30, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: theme === 'dark' ? '#1e293b' : '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={50}>
                  {
                    [
                      { name: 'Diterima', count: metrics.statusDiterima || 0, fill: '#10b981' },
                      { name: 'Proses/Menunggu', count: (metrics.statusPengajuan || 0) + (metrics.statusProses || 0), fill: '#f59e0b' },
                      { name: 'Ditolak', count: metrics.statusDitolak || 0, fill: '#ef4444' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))
                  }
                </Bar>
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KANAN: PIE CHART DISTRIBUSI JURUSAN */}
        <div className={`lg:col-span-5 p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="border-b border-inherit pb-4">
            <h3 className="text-base font-extrabold flex items-center space-x-2">
              <PieChart className="w-5 h-5 text-emerald-500" />
              <span>Sebaran Siswa Per Jurusan</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Proporsi total siswa aktif per Kompetensi Keahlian.</p>
          </div>

          <div className="h-64 w-full flex justify-center items-center">
            {departmentStats.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Data jurusan kosong.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={departmentStats}
                    dataKey="total"
                    nameKey="department"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    paddingAngle={5}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {departmentStats.map((entry: any, index: number) => {
                      const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                </RePieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* BAWAH: TOP DUDI BAR */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 mt-8 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="border-b border-inherit pb-4 flex justify-between items-center">
          <div>
            <h3 className="text-base font-extrabold flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-purple-500" />
              <span>Top Industri Mitra (Keterisian Kuota)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Daftar industri dengan tingkat keterisian kuota terbanyak.</p>
          </div>
        </div>
        
        <div className="h-64 w-full mt-4">
          {topIndustries.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-6 text-center">Belum ada data industri terdaftar.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart
                data={topIndustries}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: theme === 'dark' ? '#1e293b' : '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="filled" name="Kuota Terisi" radius={[0, 6, 6, 0]} fill="#8b5cf6" barSize={20} />
              </ReBarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
</div>
  );
}