// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Tuning menu Pokja dengan integrasi data periode PKL aktif, statistik penempatan siswa, dan rekapitulasi DUDI.
// ✨ Fitur Baru: Pokja Dashboard & Internship Monitoring Integration.
// ----------------------------------------------------------------------

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { 
  Users, Building2, FileText, CheckCircle2, 
  Clock, ShieldCheck, ArrowUpRight, AlertCircle, Database, Layers
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

export default function PokjaDashboardPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  const userRole = (session?.user as any)?.role;
  const [stats, setStats] = useState({
    totalStudents: 0,
    placedStudents: 0,
    totalIndustries: 0,
    activePeriods: []
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      const timestamp = new Date().getTime();
      fetch(`/api/admin/periods?t=${timestamp}`)
        .then(res => res.json())
        .then(res => {
          if (res.success) {
            const active = (res.periods || []).filter((p: any) => p.isActive);
            setStats(prev => ({ ...prev, activePeriods: active }));
          }
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setErrorMsg('Gagal memuat data sistem Pokja');
          setLoading(false);
        });
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-[70vh] flex items-center justify-center ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold">Memuat Panel Pokja Prakerin...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Header Banner */}
      <div className={`border rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' 
          ? 'bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-500/30 text-white' 
          : 'bg-gradient-to-r from-emerald-50 via-white to-white border-emerald-200 text-slate-900 shadow-xl'
      }`}>
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-2 relative z-10">
          <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold border ${
            theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-100 border-emerald-200 text-emerald-700'
          }`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Portal Pokja Prakerin ({userRole})</span>
          </div>
          <h2 className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Dashboard <span className="text-emerald-600 dark:text-emerald-400">Kelompok Kerja</span> 🛠️
          </h2>
          <p className={`text-sm max-w-2xl ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Pusat koordinasi penempatan siswa, verifikasi berkas DUDI, dan pemantauan gelombang Prakerin yang sedang berjalan.
          </p>
        </div>

        <div className="flex items-center space-x-3 relative z-10">
          <a
            href="/dashboard"
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-all ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-800 shadow-sm hover:bg-slate-50'
            }`}
          >
            <span>Dashboard Utama</span>
          </a>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm font-semibold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`border rounded-3xl p-6 shadow-xl space-y-2 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'}`}>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Periode Aktif</span>
            <Clock className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-black">{stats.activePeriods.length} Gelombang</p>
          <p className="text-[11px] text-slate-400">Siap menerima pendaftaran & penempatan</p>
        </div>

        <div className={`border rounded-3xl p-6 shadow-xl space-y-2 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'}`}>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Siswa PKL</span>
            <Users className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-2xl font-black">Terintegrasi</p>
          <p className="text-[11px] text-slate-400">Berdasarkan rombongan belajar aktif</p>
        </div>

        <div className={`border rounded-3xl p-6 shadow-xl space-y-2 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'}`}>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Mitra DUDI</span>
            <Building2 className="w-5 h-5 text-cyan-500" />
          </div>
          <p className="text-2xl font-black">Database Pusat</p>
          <p className="text-[11px] text-slate-400">Terhubung langsung ke sistem DUDI</p>
        </div>

        <div className={`border rounded-3xl p-6 shadow-xl space-y-2 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'}`}>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Verifikasi Berkas</span>
            <FileText className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-black">Live Monitoring</p>
          <p className="text-[11px] text-slate-400">Surat tugas & balasan industri</p>
        </div>
      </div>

      {/* ACTIVE PERIODS LIST */}
      <div className={`border rounded-3xl p-8 shadow-xl space-y-6 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'}`}>
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Gelombang / Periode PKL yang Sedang Aktif</h3>
            <p className="text-xs text-slate-400">Daftar periode yang diaktifkan oleh Administrator untuk operasional Pokja.</p>
          </div>
        </div>

        {stats.activePeriods.length === 0 ? (
          <div className="text-center py-12 space-y-2 border border-dashed rounded-2xl border-slate-800">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-400">Belum ada periode PKL yang diaktifkan oleh Administrator.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.activePeriods.map((period: any) => (
              <div key={period.id} className={`p-5 rounded-2xl border space-y-3 ${theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-start">
                  <h4 className="font-extrabold text-base">{period.name}</h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    AKTIF
                  </span>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <p>📅 Mulai: {new Date(period.startDate).toLocaleDateString('id-ID')}</p>
                  <p>🏁 Selesai: {new Date(period.endDate).toLocaleDateString('id-ID')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}