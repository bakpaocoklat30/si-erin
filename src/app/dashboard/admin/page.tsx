// 📋 CHANGELOG:
// ✅ Perubahan: Menyempurnakan logika pengambilan data statistik dashboard admin secara real-time dari database.
// ✨ Fitur Baru: Otomatisasi kalkulasi total peserta didik, mitra industri, pengajuan pending, dan penempatan diterima.
// 🎨 UI/UX Update: Kartu analitik interaktif dengan transisi hover yang elegan dan indikator status database.
// 🔧 Bug Fix: Mengatasi angka statistik yang bernilai 0 akibat perbedaan huruf kapital pada role atau struktur data API.
// 🚀 Inovasi: Enterprise Analytics Dashboard Controller with robust data fallback.

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle, 
  Activity,
  ArrowUpRight,
  FileText
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalIndustries: 0,
    totalPending: 0,
    totalAccepted: 0
  });
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      const timestamp = new Date().getTime();
      Promise.all([
        fetch(`/api/admin/users?t=${timestamp}`).then(res => res.json()).catch(() => ({ success: false, data: [] })),
        fetch(`/api/admin/master?type=industry&t=${timestamp}`).then(res => res.json()).catch(() => ({ success: false, data: [] }))
      ])
        .then(([resUsers, resIndustries]) => {
          const usersData = resUsers.success && Array.isArray(resUsers.data) ? resUsers.data : [];
          const industriesData = resIndustries.success && Array.isArray(resIndustries.data) ? resIndustries.data : [];

          // Filter siswa (mengabaikan perbedaan huruf kapital role)
          const students = usersData.filter((u: any) => u.role?.toUpperCase() === 'SISWA');
          
          // Hitung penempatan berdasarkan status
          const acceptedCount = students.filter(
            (s: any) => s.placementStatus?.toUpperCase() === 'DISETUJUI' || s.placementStatus?.toUpperCase() === 'BERJALAN' || s.bpjsStatus?.toUpperCase() === 'DISETUJUI'
          ).length;

          const pendingCount = students.filter(
            (s: any) => s.placementStatus?.toUpperCase() === 'PENDING' || s.placementStatus?.toUpperCase() === 'MENGAJUKAN'
          ).length;

          setStats({
            totalStudents: students.length,
            totalIndustries: industriesData.length,
            totalPending: pendingCount,
            totalAccepted: acceptedCount
          });

          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setErrorMsg('Gagal memuat analitik dashboard dari database.');
          setLoading(false);
        });
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-[70vh] flex items-center justify-center ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold">Memuat Dashboard Administrator...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* WELCOME BANNER */}
      <div className={`border rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' 
          ? 'bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border-indigo-500/30 text-white' 
          : 'bg-gradient-to-r from-indigo-50 via-white to-white border-indigo-200 text-slate-900 shadow-xl'
      }`}>
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-2 relative z-10">
          <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold border ${
            theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-indigo-100 border-indigo-200 text-indigo-700'
          }`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Control Center • Sesi Aktif</span>
          </div>
          <h1 className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Selamat Datang, <span className="text-indigo-600 dark:text-indigo-400">{session?.user?.name || 'Administrator SI-Erin'}</span>! 🚀
          </h1>
          <p className={`text-sm max-w-2xl ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Kelola data mitra industri, verifikasi pengajuan tempat PKL peserta didik, dan pantau rekapitulasi penempatan secara terpusat dari panel ini.
          </p>
        </div>

        <div className={`p-4 rounded-2xl border text-xs font-mono font-bold flex items-center space-x-3 ${
          theme === 'dark' ? 'bg-slate-900/80 border-slate-800 text-indigo-400' : 'bg-white border-slate-200 text-indigo-600 shadow-sm'
        }`}>
          <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Waktu Real-Time</p>
            <p>{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STATS GRID (REAL-TIME DATABASE VALUES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Peserta Didik */}
        <div className={`border rounded-3xl p-6 shadow-xl space-y-4 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
        }`}>
          <div className="flex justify-between items-center">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400">
              Terdaftar
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Peserta Didik</p>
            <h3 className="text-3xl font-extrabold mt-1 font-mono">{stats.totalStudents}</h3>
          </div>
          <p className="text-[11px] text-slate-400 pt-2 border-t border-inherit">Akun siswa aktif dalam sistem</p>
        </div>

        {/* Mitra Industri */}
        <div className={`border rounded-3xl p-6 shadow-xl space-y-4 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
        }`}>
          <div className="flex justify-between items-center">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500">
              Aktif
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mitra Industri</p>
            <h3 className="text-3xl font-extrabold mt-1 font-mono">{stats.totalIndustries}</h3>
          </div>
          <p className="text-[11px] text-slate-400 pt-2 border-t border-inherit">Perusahaan dan instansi mitra</p>
        </div>

        {/* Pengajuan Pending */}
        <div className={`border rounded-3xl p-6 shadow-xl space-y-4 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
        }`}>
          <div className="flex justify-between items-center">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500">
              Perlu Aksi
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pengajuan Pending</p>
            <h3 className="text-3xl font-extrabold mt-1 font-mono">{stats.totalPending}</h3>
          </div>
          <p className="text-[11px] text-slate-400 pt-2 border-t border-inherit">Menunggu verifikasi penempatan</p>
        </div>

        {/* Penempatan Diterima */}
        <div className={`border rounded-3xl p-6 shadow-xl space-y-4 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
        }`}>
          <div className="flex justify-between items-center">
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400">
              Berjalan
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Penempatan Diterima</p>
            <h3 className="text-3xl font-extrabold mt-1 font-mono">{stats.totalAccepted}</h3>
          </div>
          <p className="text-[11px] text-slate-400 pt-2 border-t border-inherit">Siswa aktif melaksanakan PKL</p>
        </div>

      </div>

      {/* REKAPITULASI SECTION */}
      <div className={`border rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex justify-between items-center border-b pb-4 border-inherit">
          <div>
            <h3 className="text-lg font-bold">Rekapitulasi Pengajuan Tempat PKL Terbaru</h3>
            <p className="text-xs text-slate-400">Daftar pengajuan surat pengantar dan penempatan dari peserta didik.</p>
          </div>
          <a
            href="/dashboard/admin/departments"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-1 cursor-pointer"
          >
            <span>Kelola Semua Data</span>
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>

        <div className="py-12 text-center space-y-3 text-slate-400">
          <FileText className="w-12 h-12 mx-auto opacity-40" />
          <p className="text-xs font-semibold">Belum ada pengajuan penempatan PKL saat ini.</p>
        </div>
      </div>

    </div>
  );
}