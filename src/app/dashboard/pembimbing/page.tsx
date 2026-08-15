// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Menyediakan halaman Dashboard Pembimbing yang lengkap dengan perlindungan session, statistik bimbingan, dan daftar kelas interaktif.
// ✨ Fitur Baru: Bulletproof Teacher Mentorship Dashboard Rendering Pipeline.
// 🎨 UI/UX Update: Tema card responsif dengan indikator jumlah siswa dan akses cepat ke rute detail kelas.
// 🔧 Bug Fix: Mengatasi halaman kosong (blank page) saat mengakses `/dashboard/pembimbing`.
// 🚀 Inovasi: Enterprise Resilient Dashboard Architecture.
// ----------------------------------------------------------------------

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { 
  Users, Building2, BookOpen, ShieldCheck, AlertCircle, Loader2, ArrowRight, Sparkles 
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';

export default function TeacherDashboardPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  const teacherName = session?.user?.name || 'Guru Pembimbing';
  const teacherRole = (session?.user as any)?.role || 'GURU';

  const [loading, setLoading] = useState(true);
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      const timestamp = new Date().getTime();
      fetch(`/api/teacher/students?t=${timestamp}`)
        .then(res => res.json())
        .then(res => {
          if (res && res.success) {
            setAssignedClasses(res.classes || []);
            setTotalStudents(res.totalStudents || 0);
          } else {
            setErrorMsg(res?.error || 'Gagal memuat data kelas bimbingan.');
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching teacher students:', err);
          setErrorMsg('Terjadi kesalahan jaringan saat memuat data bimbingan.');
          setLoading(false);
        });
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-[80vh] p-8 flex flex-col justify-center items-center space-y-4 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          Memuat Dashboard & Data Siswa Bimbingan...
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-full p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-900'
    }`}>
      
      {/* WELCOME BANNER GURU */}
      <div className={`p-8 rounded-3xl border shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' 
          ? 'bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border-indigo-500/30 text-white' 
          : 'bg-gradient-to-r from-indigo-50 via-white to-white border-indigo-200 text-slate-900 shadow-xl'
      }`}>
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-2 relative z-10">
          <div className={`inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-xs font-semibold border ${
            theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-indigo-100 border-indigo-200 text-indigo-700'
          }`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Portal Guru Pembimbing ({teacherRole})</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Selamat Datang, <span className="text-indigo-600 dark:text-indigo-400">{teacherName}</span>! 👋
          </h1>
          <p className={`text-sm max-w-2xl ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Kelola dan pantau perkembangan siswa bimbingan PKL Anda. Periksa daftar kelas, status penempatan industri, serta progres kegiatan mereka secara real-time.
          </p>
        </div>

        <div className="flex items-center space-x-4 relative z-10 bg-indigo-500/10 border border-indigo-500/30 p-4 rounded-2xl shrink-0">
          <Users className="w-8 h-8 text-indigo-500 shrink-0" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Bimbingan</p>
            <p className="text-2xl font-black text-indigo-500">{totalStudents} <span className="text-xs font-normal">Siswa</span></p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* MENU SISWA BIMBINGAN (DAFTAR KELAS) */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex justify-between items-center border-b pb-4 border-inherit">
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              <span>Daftar Rombongan Belajar (Kelas) Bimbingan</span>
            </h3>
            <p className="text-xs text-slate-400">Pilih kelas di bawah untuk melihat detail nama siswa beserta industri tempat mereka PKL.</p>
          </div>
          <span className="text-xs font-bold text-indigo-400">{assignedClasses.length} Kelas Diampu</span>
        </div>

        {assignedClasses.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Users className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
            <p className="text-sm font-semibold text-slate-400">Belum ada siswa yang di-assign ke akun pembimbing Anda.</p>
            <p className="text-xs text-slate-500">Silakan hubungi Tim Pokja Prakerin untuk melakukan penugasan bimbingan melalui menu Manajemen Jam PKL.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignedClasses.map((cls) => (
              <Link
                key={cls.className}
                href={`/dashboard/pembimbing/classes/${encodeURIComponent(cls.className)}`}
                className={`border rounded-2xl p-6 shadow-md transition-all hover:scale-[1.02] cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-4 ${
                  theme === 'dark' ? 'bg-slate-950/60 border-slate-800 hover:border-indigo-500/50' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/50'
                }`}
              >
                <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-24 h-24 bg-indigo-600/10 rounded-full blur-xl pointer-events-none"></div>

                <div className="space-y-1 relative z-10">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Rombongan Belajar</span>
                  <h4 className="text-xl font-extrabold">{cls.className}</h4>
                </div>

                <div className="space-y-2 relative z-10 text-xs">
                  <p className="text-slate-400">Jumlah Siswa Bimbingan: <strong className="text-white">{cls.students.length} Siswa</strong></p>
                  <p className="text-slate-400">Jurusan: <strong className="text-indigo-400">{cls.department || 'Teknik Komputer dan Jaringan'}</strong></p>
                </div>

                <div className="pt-3 border-t border-slate-800/50 flex justify-between items-center text-xs font-bold text-indigo-400">
                  <span>Lihat Detail Siswa & Industri</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}