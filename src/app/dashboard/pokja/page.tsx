// 📋 CHANGELOG:
// ✅ Perubahan: Memperbarui tampilan widget periode aktif agar dapat merender daftar beberapa periode aktif sekaligus (Multi-Active Periods Card List).
// ✨ Fitur Baru: Multi-Active Periods Dynamic Widget & Precise Department Statistics View.
// 🎨 UI/UX Update: Desain card list periodik yang rapi dengan indikator lencana aktif ganda.
// 🔧 Bug Fix: Menampilkan seluruh periode aktif yang dicentang di menu pengaturan periode.
// 🚀 Inovasi: Enterprise Responsive Dashboard Layout.

'client';
'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Building2, 
  Clock, 
  CheckCircle2, 
  CalendarDays,
  ArrowRight,
  Activity,
  AlertCircle,
  ShieldCheck,
  CheckCircle
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';

export default function PokjaDashboardPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [dashboardData, setDashboardData] = useState<any>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/pokja/dashboard?t=${timestamp}`);
      const result = await res.json();

      if (res.ok && result.success) {
        setDashboardData(result.data);
      } else {
        setErrorMsg(result.error || 'Gagal memuat data dashboard.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDashboardData();
    }
  }, [status, fetchDashboardData]);

  if (status === 'loading') return null;

  const stats = dashboardData?.stats || { totalStudents: 0, pendingVerifications: 0, approvedPlacements: 0, totalIndustries: 0 };
  const activePeriods = dashboardData?.activePeriods || [];
  const recentApplications = dashboardData?.recentApplications || [];
  const userDepartment = dashboardData?.userDepartment || (session?.user as any)?.department || 'Semua Jurusan';

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* HEADER COMMAND CENTER */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 flex items-center space-x-1.5 w-fit">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Portal Tim Pokja Prakerin</span>
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Selamat Datang, {session?.user?.name || 'Tim Pokja'}! 🏛️
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Anda mengelola persetujuan pengajuan tempat PKL dan pemetaan industri khusus untuk peserta didik jurusan <strong className="text-indigo-400">{userDepartment}</strong>.
          </p>
        </div>

        <Link
          href="/dashboard/pokja/verifikasi"
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer shrink-0"
        >
          <span>Verifikasi Pengajuan Masuk</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* QUICK STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          loading={loading}
          title="Total Siswa Binaan" 
          value={stats.totalStudents} 
          icon={<Users className="w-6 h-6 text-blue-500" />} 
          theme={theme}
          colorClass="bg-blue-500/10 border-blue-500/20"
          subtitle="Jurusan Terkait"
        />
        <StatCard 
          loading={loading}
          title="Pengajuan Pending" 
          value={stats.pendingVerifications} 
          icon={<Clock className="w-6 h-6 text-amber-500" />} 
          theme={theme}
          colorClass="bg-amber-500/10 border-amber-500/20"
          subtitle="Perlu Tindakan"
        />
        <StatCard 
          loading={loading}
          title="Penempatan Diterima" 
          value={stats.approvedPlacements} 
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-500" />} 
          theme={theme}
          colorClass="bg-emerald-500/10 border-emerald-500/20"
          subtitle="Disetujui Pokja"
        />
        <StatCard 
          loading={loading}
          title="Mitra Industri" 
          value={stats.totalIndustries} 
          icon={<Building2 className="w-6 h-6 text-purple-500" />} 
          theme={theme}
          colorClass="bg-purple-500/10 border-purple-500/20"
          subtitle="Total Instansi"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* MULTI-ACTIVE PERIODS WIDGET */}
        <div className={`lg:col-span-1 p-6 rounded-3xl border shadow-xl flex flex-col justify-between ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="space-y-6">
            <div className="flex items-center space-x-3 border-b border-inherit pb-4">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between flex-1">
                <h3 className="font-bold text-lg tracking-tight">Periode Aktif</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  {activePeriods.length} Berjalan
                </span>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4 animate-pulse py-4">
                <div className="h-4 bg-slate-700/30 rounded w-3/4"></div>
                <div className="h-4 bg-slate-700/30 rounded w-1/2"></div>
              </div>
            ) : activePeriods.length > 0 ? (
              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                {activePeriods.map((period: any, idx: number) => (
                  <div key={period.id || idx} className={`p-4 rounded-2xl border space-y-2 ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-400 text-sm">{period.name}</span>
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="font-mono text-slate-400">Mulai: {new Date(period.startDate).toLocaleDateString('id-ID')}</div>
                      <div className="font-mono text-slate-400 text-right">Selesai: {new Date(period.endDate).toLocaleDateString('id-ID')}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-xs text-slate-400">Belum ada periode Prakerin yang diaktifkan.</p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-inherit">
            <Link href="/dashboard/pokja/periods" className="text-xs font-bold text-indigo-500 hover:text-indigo-400 flex items-center justify-center space-x-2 transition-colors">
              <span>Kelola Pengaturan Periode</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* RECENT APPLICATIONS TABLE */}
        <div className={`lg:col-span-2 p-6 rounded-3xl border shadow-xl flex flex-col ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-6 border-b border-inherit pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg tracking-tight">Rekapitulasi Pengajuan PKL ({userDepartment})</h3>
            </div>
            <Link href="/dashboard/pokja/verifikasi" className="text-xs font-bold text-indigo-400 hover:underline">
              Kelola Verifikasi Lengkap
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            {loading ? (
              <div className="space-y-3 animate-pulse py-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`h-12 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100'}`}></div>
                ))}
              </div>
            ) : recentApplications.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">Belum ada pengajuan penempatan PKL dari siswa jurusan {userDepartment}.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className={`text-[10px] uppercase tracking-wider font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  <tr>
                    <th className="pb-3 px-2">Nama Siswa</th>
                    <th className="pb-3 px-2">Kelas</th>
                    <th className="pb-3 px-2">Industri Tujuan</th>
                    <th className="pb-3 px-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/20 text-xs">
                  {recentApplications.map((app: any) => (
                    <tr key={app.id} className="group">
                      <td className="py-3.5 px-2 font-bold group-hover:text-indigo-400 transition-colors">{app.student.name}</td>
                      <td className="py-3.5 px-2 text-slate-400">{app.student.className}</td>
                      <td className="py-3.5 px-2 font-semibold">{app.industry.name}</td>
                      <td className="py-3.5 px-2 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide ${
                          app.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                          (app.status === 'APPROVED' || app.status === 'ACCEPTED') ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                          'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Komponen Reusable Kartu Metrik
function StatCard({ loading, title, value, icon, theme, colorClass, subtitle }: { loading: boolean, title: string, value: number, icon: any, theme: string, colorClass: string, subtitle: string }) {
  return (
    <div className={`p-6 rounded-3xl border shadow-xl transition-all duration-300 hover:-translate-y-1 ${
      theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:shadow-indigo-500/10' : 'bg-white border-slate-200 hover:shadow-indigo-500/5'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h3>
        <div className={`p-2.5 rounded-2xl border ${colorClass}`}>
          {icon}
        </div>
      </div>
      
      {loading ? (
        <div className="h-8 bg-slate-700/30 rounded w-16 animate-pulse"></div>
      ) : (
        <div className="flex items-baseline justify-between">
          <p className="text-3xl font-extrabold tracking-tight">{value}</p>
          <span className="text-[10px] font-bold text-slate-500 uppercase">{subtitle}</span>
        </div>
      )}
    </div>
  );
}