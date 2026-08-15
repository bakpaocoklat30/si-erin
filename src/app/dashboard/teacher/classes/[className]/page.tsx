// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Membuat halaman detail siswa bimbingan per kelas yang menampilkan daftar lengkap nama siswa beserta informasi industri penempatan PKL.
// ✨ Fitur Baru: Teacher Class Student Mentorship & Industry Detail Pipeline.
// 🎨 UI/UX Update: Tabel/Card responsif modern dengan badge status penempatan industri yang jelas.
// 🔧 Bug Fix: Penanganan aman parameter dynamic route kelas dengan decodeURIComponent.
// 🚀 Inovasi: Comprehensive Student Placement & Industry Inspector Architecture.
// ----------------------------------------------------------------------

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Users, Building2, ArrowLeft, ShieldCheck, AlertCircle, Loader2, Phone, Search, CheckCircle2, MapPin 
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

export default function TeacherClassDetailPage() {
  const { status } = useSession();
  const { theme } = useTheme();
  const params = useParams();
  const router = useRouter();

  const classNameParam = decodeURIComponent((params?.className as string) || '');

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (status === 'authenticated' && classNameParam) {
      const timestamp = new Date().getTime();
      fetch(`/api/teacher/students?className=${encodeURIComponent(classNameParam)}&t=${timestamp}`)
        .then(res => res.json())
        .then(res => {
          if (res.success) {
            setStudents(res.students || []);
          } else {
            setErrorMsg(res.error || 'Gagal memuat detail siswa kelas.');
          }
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setErrorMsg('Terjadi kesalahan jaringan.');
          setLoading(false);
        });
    }
  }, [status, classNameParam]);

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-screen p-8 flex flex-col justify-center items-center space-y-4 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          Memuat Daftar Siswa Bimbingan Kelas {classNameParam}...
        </p>
      </div>
    );
  }

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.placement?.industry?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-900'
    }`}>
      
      {/* HEADER & TOMBOL KEMBALI */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          type="button"
          onClick={() => router.push('/dashboard/teacher')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 border cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
              : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Kelas</span>
        </button>

        <span className="text-xs font-bold text-slate-400">
          Rombel Kelas: <strong className="text-emerald-400">{classNameParam}</strong>
        </span>
      </div>

      {/* BANNER KELAS */}
      <div className={`p-8 rounded-3xl border shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' 
          ? 'bg-slate-900 border-slate-800 text-white' 
          : 'bg-white border-slate-200 text-slate-900 shadow-xl'
      }`}>
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-block">
            Detail Rombongan Belajar
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Kelas {classNameParam}</h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Daftar lengkap siswa bimbingan di kelas ini beserta informasi kontak dan tempat penempatan industri PKL masing-masing siswa.
          </p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl text-center">
          <p className="text-2xl font-black text-emerald-400">{students.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Siswa Bimbingan</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Nama Siswa, NIS, atau Nama Industri..."
            className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all ${
              theme === 'dark' 
                ? 'bg-slate-900 border-slate-800 text-slate-100 focus:border-emerald-500' 
                : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600 shadow-sm'
            }`}
          />
        </div>
        <span className="text-xs font-bold text-slate-400">Menampilkan {filteredStudents.length} dari {students.length} Siswa</span>
      </div>

      {/* DAFTAR SISWA CARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.length === 0 ? (
          <div className="col-span-full text-center py-12 space-y-2">
            <Users className="w-10 h-10 text-slate-600 mx-auto opacity-50" />
            <p className="text-xs font-semibold text-slate-400">Tidak ada siswa yang cocok dengan pencarian.</p>
          </div>
        ) : (
          filteredStudents.map((s) => {
            const industry = s.placement?.industry;
            const industryName = industry?.name || null;
            const industryAddress = industry?.address || null;

            return (
              <div 
                key={s.id} 
                className={`border rounded-2xl p-6 shadow-md space-y-4 flex flex-col justify-between ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-base">{s.name}</h4>
                      <p className="text-xs text-slate-400">NIS: {s.nis} • {s.department || '-'}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {s.className}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{s.phone || 'Telp tidak tersedia'}</span>
                  </div>
                </div>

                {/* 🌟 INFORMASI INDUSTRI TEMPAT PKL */}
                <div className={`p-4 rounded-xl border space-y-2 ${
                  theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">{industryName || 'Belum Ada Penempatan Industri'}</span>
                  </div>
                  {industryAddress && (
                    <div className="flex items-start space-x-1.5 text-[11px] text-slate-400">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-500 mt-0.5" />
                      <span className="line-clamp-2">{industryAddress}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-800/40 flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-semibold uppercase">Status Penempatan:</span>
                    <span className={`font-bold px-2 py-0.5 rounded ${
                      industryName ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {industryName ? 'Aktif PKL' : 'Belum Penempatan'}
                    </span>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}