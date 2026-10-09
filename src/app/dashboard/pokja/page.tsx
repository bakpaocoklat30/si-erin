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
  Clock, ShieldCheck, ArrowUpRight, AlertCircle, Database, Layers,
  PieChart, Activity, Briefcase, Download, ArrowRight, UserX, UserCheck
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

export default function PokjaDashboardPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  const userRole = (session?.user as any)?.role;
  const userDepartment = (session?.user as any)?.department || 'Semua Jurusan';

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      const timestamp = new Date().getTime();
      fetch(`/api/pokja/dashboard?t=${timestamp}`)
        .then(res => res.json())
        .then(res => {
          if (res.success) {
            setDashboardData(res.data);
          } else {
            setErrorMsg(res.error || 'Gagal memuat data sistem Pokja');
          }
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setErrorMsg('Koneksi ke server gagal');
          setLoading(false);
        });
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-[70vh] flex items-center justify-center ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold">Memuat Panel Pokja Prakerin...</span>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats || { totalStudents: 0, totalIndustries: 0, pendingVerifications: 0, approvedPlacements: 0 };
  const activePeriods = dashboardData?.activePeriods || [];
  const recentApplications = dashboardData?.recentApplications || [];

  const unplacedStudents = stats.totalStudents - stats.approvedPlacements;
  const placementPercentage = stats.totalStudents > 0 ? Math.round((stats.approvedPlacements / stats.totalStudents) * 100) : 0;

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
            <span>Portal Pokja Prakerin ({userRole}) - {userDepartment}</span>
          </div>
          <h2 className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Dashboard <span className="text-emerald-600 dark:text-emerald-400">Kelompok Kerja</span> 🛠️
          </h2>
          <p className={`text-sm max-w-2xl ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Pusat pemantauan penempatan siswa, ketersediaan DUDI, serta monitoring alokasi pembimbing secara real-time.
          </p>
        </div>

        <div className="flex items-center space-x-3 relative z-10 shrink-0">
          <a
            href="/dashboard/pokja/hours"
            className="px-5 py-3 rounded-2xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center space-x-2 shadow-lg shadow-emerald-600/30 cursor-pointer border border-emerald-500/30"
          >
            <Clock className="w-4 h-4" />
            <span>Alokasi Jam Guru</span>
          </a>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm font-semibold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STATS GRID - KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Penempatan */}
        <div className={`border rounded-3xl p-6 shadow-xl space-y-4 relative overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'}`}>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Siswa Ditempatkan</span>
            <UserCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-3xl font-black">{stats.approvedPlacements} <span className="text-sm font-semibold text-slate-400">/ {stats.totalStudents}</span></p>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5">
            <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${placementPercentage}%` }}></div>
          </div>
          <p className="text-[11px] text-slate-400 font-bold">{placementPercentage}% Siswa sudah memiliki tempat PKL</p>
        </div>

        {/* Card 2: Menunggu */}
        <div className={`border rounded-3xl p-6 shadow-xl space-y-4 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'}`}>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Menunggu Verifikasi</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-black">{stats.pendingVerifications} <span className="text-sm font-medium text-slate-400">Siswa</span></p>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 text-[11px] font-bold border border-amber-500/20">
            {stats.pendingVerifications > 0 ? 'Segera periksa pengajuan di menu Penempatan!' : 'Tidak ada pengajuan tertunda.'}
          </div>
        </div>

        {/* Card 3: Belum Penempatan */}
        <div className={`border rounded-3xl p-6 shadow-xl space-y-4 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'}`}>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Belum Penempatan</span>
            <UserX className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-black">{unplacedStudents} <span className="text-sm font-medium text-slate-400">Siswa</span></p>
          <p className="text-[11px] text-slate-400 font-bold leading-relaxed">
            Siswa yang belum memilih industri atau pengajuannya ditolak.
          </p>
        </div>

        {/* Card 4: Industri */}
        <div className={`border rounded-3xl p-6 shadow-xl space-y-4 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'}`}>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Industri Mitra</span>
            <Building2 className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-black">{stats.totalIndustries} <span className="text-sm font-medium text-slate-400">Perusahaan</span></p>
          <a href="/dashboard/pokja/industries" className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-500 hover:text-indigo-400">
            <span>Kelola Kuota & Industri</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* RECENT APPLICATIONS */}
        <div className={`lg:col-span-2 border rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 flex flex-col ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Aktivitas Penempatan Terbaru</h3>
                <p className="text-[11px] text-slate-400">5 Pengajuan terakhir oleh siswa</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {recentApplications.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-slate-400 italic">Belum ada aktivitas pengajuan PKL.</p>
              </div>
            ) : (
              recentApplications.map((app: any, idx: number) => (
                <div key={idx} className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div>
                    <h4 className="font-extrabold text-sm">{app.student?.name} <span className="text-xs font-normal text-slate-400">({app.student?.className})</span></h4>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
                      <Briefcase className="w-3 h-3" />
                      <span>{app.industry?.name || 'Industri tidak diketahui'}</span>
                    </p>
                  </div>
                  <div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      app.status.toUpperCase() === 'PENDING' || app.status.toUpperCase() === 'MENUNGGU' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      app.status.toUpperCase() === 'APPROVED' || app.status.toUpperCase() === 'DISETUJUI' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ACTIVE PERIODS */}
        <div className={`border rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 flex flex-col ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'}`}>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Gelombang PKL</h3>
              <p className="text-[11px] text-slate-400">Periode aktif saat ini</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {activePeriods.length === 0 ? (
              <div className="text-center py-10 border border-dashed rounded-2xl border-slate-800">
                <AlertCircle className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Belum ada periode PKL yang aktif.</p>
              </div>
            ) : (
              activePeriods.map((period: any) => (
                <div key={period.id} className={`p-4 rounded-2xl border space-y-2 ${theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex justify-between items-start">
                    <h4 className="font-extrabold text-sm">{period.name}</h4>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mt-1"></span>
                  </div>
                  <div className="text-[10px] text-slate-400 space-y-1 font-semibold">
                    <p className="flex justify-between"><span>Mulai:</span> <span className="text-slate-300">{new Date(period.startDate).toLocaleDateString('id-ID')}</span></p>
                    <p className="flex justify-between"><span>Selesai:</span> <span className="text-slate-300">{new Date(period.endDate).toLocaleDateString('id-ID')}</span></p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}