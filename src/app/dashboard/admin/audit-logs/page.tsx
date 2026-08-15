// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Membuat Halaman UI Admin Audit Logs (`src/app/dashboard/admin/audit-logs/page.tsx`) untuk menampilkan jejak rekam aktivitas seluruh role pengguna.
// ✨ Fitur Baru: Live Search & Filter per Modul, Responsive Log Inspector Modal, Badge Aksis Kode Warna, & Quick Metrics Summary Cards.
// 🎨 UI/UX Update: Enterprise Glassmorphic Layout, Hover Row Elevation, Mode Terang/Gelap Adaptive, & Real-time Refresh.
// 🔧 Bug Fix: Mengeliminasi error 404 Not Found pada URL `/dashboard/admin/audit-logs`.
// 🚀 Inovasi: Interactive Security Activity & Disaster Inspector.
// ----------------------------------------------------------------------

'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  Filter, 
  Clock, 
  User, 
  Globe, 
  Monitor, 
  FileText, 
  ArrowLeft, 
  CheckCircle2, 
  Activity,
  ChevronRight,
  X,
  Loader2,
  Database
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';

export default function AdminAuditLogsPage() {
  const { theme } = useTheme();

  const [logs, setLogs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ totalLogs: 0, todayLogs: 0 });
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  
  // Modal Detail Inspector
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (selectedModule !== 'ALL') queryParams.set('module', selectedModule);
      queryParams.set('t', new Date().getTime().toString());

      const res = await fetch(`/api/admin/audit-logs?${queryParams.toString()}`);
      const json = await res.json();

      if (json.success) {
        setLogs(json.logs || []);
        if (json.metrics) setMetrics(json.metrics);
      } else {
        console.error('Error API Audit Logs:', json.error);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [selectedModule]);

  // Handle Search submit / enter
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAuditLogs();
  };

  // Helper Badge Warna Aksi
  const getActionBadge = (action: string) => {
    const act = String(action).toUpperCase();
    switch (act) {
      case 'CREATE':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'UPDATE':
      case 'VERIFY':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'DELETE':
      case 'RESTORE':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'EXPORT':
        return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const modulesList = [
    { label: 'Semua Modul', value: 'ALL' },
    { label: 'Master & Parameter', value: 'MASTER' },
    { label: 'Analitik & Ekspor', value: 'ANALYTICS' },
    { label: 'Pengajuan PKL', value: 'PLACEMENTS' },
    { label: 'Siswa & User', value: 'USERS' },
    { label: 'Identitas Sekolah', value: 'SCHOOL_SETTINGS' },
    { label: 'Backup Cloud', value: 'BACKUP' },
  ];

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
            href="/dashboard"
            className="inline-flex items-center space-x-2 text-xs font-bold text-indigo-500 hover:underline mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Dashboard Utama</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center space-x-3">
            <ShieldAlert className="w-8 h-8 text-indigo-500" />
            <span>Audit Trail & Activity Inspector</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Sistem pencatatan log jejak keamanan dan riwayat perubahan data secara transparan bagi Administrator Utama SI-ERIN v2.0.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAuditLogs}
          disabled={loading}
          className="px-4 py-2.5 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold flex items-center space-x-2 cursor-pointer transition-all shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className={`p-6 rounded-3xl border shadow-lg space-y-2 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Jejak Audit</span>
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black">{metrics.totalLogs}</p>
          <p className="text-[11px] text-slate-500">Aktivitas terekam di database</p>
        </div>

        <div className={`p-6 rounded-3xl border shadow-lg space-y-2 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Aktivitas Hari Ini</span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400">{metrics.todayLogs}</p>
          <p className="text-[11px] text-slate-500">Aktivitas tercatat sejak 00:00 WIB</p>
        </div>

        <div className={`p-6 rounded-3xl border shadow-lg space-y-2 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Keamanan Akses</span>
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-400">RBAC Safe</p>
          <p className="text-[11px] text-slate-500">IP & User-Agent Trapped</p>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className={`p-5 rounded-3xl border shadow-lg flex flex-col md:flex-row gap-4 items-center justify-between ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        
        {/* Module Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {modulesList.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setSelectedModule(m.value)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                selectedModule === m.value
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : theme === 'dark'
                  ? 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari user, aksi, detail..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs font-semibold border outline-none transition-all ${
              theme === 'dark'
                ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
            }`}
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </form>

      </div>

      {/* LOGS TABLE SECTION */}
      <div className={`rounded-3xl border shadow-xl overflow-hidden ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="p-6 border-b border-inherit flex items-center justify-between">
          <h3 className="text-base font-extrabold flex items-center space-x-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            <span>Riwayat Log Aktivitas Sistem</span>
          </h3>
          <span className="text-xs text-slate-400 font-bold">{logs.length} Log Ditampilkan</span>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-400">Memuat riwayat audit log...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Database className="w-12 h-12 text-slate-500 mx-auto opacity-40" />
            <p className="text-xs font-semibold text-slate-400">Belum ada catatan aktivitas yang sesuai dengan kriteria pencarian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b border-inherit uppercase text-[10px] font-black tracking-wider ${
                  theme === 'dark' ? 'bg-slate-950/50 text-slate-400' : 'bg-slate-50 text-slate-500'
                }`}>
                  <th className="p-4">Waktu</th>
                  <th className="p-4">Pengguna (User)</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Tipe Aksi</th>
                  <th className="p-4">Modul</th>
                  <th className="p-4">Detail Aktivitas</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit font-semibold">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-500/5 transition-colors group">
                    <td className="p-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </td>
                    <td className="p-4 font-extrabold text-slate-200">
                      {log.username}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {log.userRole}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-indigo-400 font-bold">
                      {log.module}
                    </td>
                    <td className="p-4 text-slate-300 max-w-xs truncate">
                      {log.details}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all text-[11px] font-bold cursor-pointer inline-flex items-center space-x-1"
                      >
                        <span>Inspeksi</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSPECTION MODAL DETAIL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            <div className="flex items-center justify-between border-b border-inherit pb-4">
              <h3 className="text-base font-extrabold flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-indigo-500" />
                <span>Inspeksi Detail Audit Log</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-xl bg-slate-800/50 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Waktu Kejadian:</span>
                  <span className="text-indigo-400 font-bold">{new Date(selectedLog.createdAt).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Pengguna (Username):</span>
                  <span className="font-bold">{selectedLog.username} ({selectedLog.userRole})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Tipe Aksi & Modul:</span>
                  <span>{selectedLog.action} / {selectedLog.module}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase tracking-wider text-[10px] font-black">
                  Rincian Deskripsi Aktivitas:
                </label>
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-200 leading-relaxed font-mono text-[11px]">
                  {selectedLog.details}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-1">
                  <p className="text-[10px] text-slate-400 font-black uppercase flex items-center space-x-1">
                    <Globe className="w-3.5 h-3.5 text-indigo-500" />
                    <span>IP Address Client</span>
                  </p>
                  <p className="font-mono text-slate-200">{selectedLog.ipAddress}</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-1">
                  <p className="text-[10px] text-slate-400 font-black uppercase flex items-center space-x-1">
                    <Monitor className="w-3.5 h-3.5 text-emerald-500" />
                    <span>User Agent Browser</span>
                  </p>
                  <p className="font-mono text-slate-200 truncate" title={selectedLog.userAgent}>
                    {selectedLog.userAgent}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end border-t border-inherit">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold cursor-pointer transition-all"
              >
                Tutup Inspeksi
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}