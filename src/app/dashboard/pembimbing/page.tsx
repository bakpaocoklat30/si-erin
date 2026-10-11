// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Menampilkan daftar siswa bimbingan lengkap dengan nama industri, nomor WhatsApp siswa (link langsung), dikelompokkan per kelas, dan kalkulasi jam real guru tersebut.
// ✨ Fitur Baru: Teacher Mentorship Dashboard with Real Hours, Industry, WhatsApp & Class Grouping Pipeline.
// 🎨 UI/UX Update: Header metric jam real vs alokasi asli, accordion kelas interaktif, pencarian cepat, tombol aksi WhatsApp langsung.
// 🚀 Inovasi: Ultra-Fast Lightweight Single-Query Mentorship Inspector.
// ----------------------------------------------------------------------

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo } from 'react';
import { 
  Users, Building2, BookOpen, ShieldCheck, AlertCircle, Loader2, 
  Clock, Phone, MessageSquare, Search, ChevronDown, ChevronUp, 
  MapPin, CheckCircle2, Calculator, ExternalLink 
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

export default function TeacherDashboardPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  const teacherName = session?.user?.name || 'Guru Pembimbing';
  const teacherRole = (session?.user as any)?.role || 'GURU';

  const [loading, setLoading] = useState(true);
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalRealHours, setTotalRealHours] = useState(0);
  const [totalAllocatedHours, setTotalAllocatedHours] = useState(0);
  const [coefficient, setCoefficient] = useState(1.0);
  const [errorMsg, setErrorMsg] = useState('');
  
  // State interaktif
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedClasses, setExpandedClasses] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (status === 'authenticated') {
      const timestamp = new Date().getTime();
      fetch(`/api/teacher/students?t=${timestamp}`)
        .then(res => res.json())
        .then(res => {
          if (res && res.success) {
            const classes = res.classes || [];
            setAssignedClasses(classes);
            setTotalStudents(res.totalStudents || 0);
            setTotalRealHours(res.totalRealHours || 0);
            setTotalAllocatedHours(res.totalAllocatedHours || 0);
            setCoefficient(res.coefficient || 1.0);

            // Buka semua kelas secara default
            const initialExpanded: { [key: string]: boolean } = {};
            classes.forEach((c: any) => {
              initialExpanded[c.className] = true;
            });
            setExpandedClasses(initialExpanded);
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

  const toggleClassExpand = (className: string) => {
    setExpandedClasses(prev => ({
      ...prev,
      [className]: !prev[className]
    }));
  };

  // Format link WhatsApp Indonesia (+62)
  const formatWaLink = (rawPhone: string, studentName: string) => {
    if (!rawPhone) return null;
    let clean = rawPhone.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    } else if (!clean.startsWith('62')) {
      clean = '62' + clean;
    }
    const message = encodeURIComponent(`Halo ${studentName}, saya ${teacherName} selaku Guru Pembimbing PKL Anda.`);
    return `https://wa.me/${clean}?text=${message}`;
  };

  // Filter siswa berdasarkan pencarian nama, NIS, nomor WA, atau industri
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return assignedClasses;
    const q = searchQuery.toLowerCase().trim();

    return assignedClasses.map(cls => {
      const matchingStudents = cls.students.filter((s: any) => {
        const nameMatch = s.name?.toLowerCase().includes(q);
        const nisMatch = s.nis?.toLowerCase().includes(q);
        const phoneMatch = s.phone?.includes(q);
        const indMatch = s.placement?.industry?.name?.toLowerCase().includes(q);
        return nameMatch || nisMatch || phoneMatch || indMatch;
      });
      return {
        ...cls,
        students: matchingStudents
      };
    }).filter(cls => cls.students.length > 0);
  }, [assignedClasses, searchQuery]);

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-[80vh] p-8 flex flex-col justify-center items-center space-y-4 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          Memuat Dashboard Siswa Bimbingan & Alokasi Jam...
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-full p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-900'
    }`}>
      
      {/* WELCOME BANNER GURU & RINGKASAN METRIK */}
      <div className={`p-8 rounded-3xl border shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' 
          ? 'bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 border-indigo-500/30 text-white' 
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
            Daftar siswa bimbingan PKL Anda beserta tempat industri, nomor WhatsApp, dan kalkulasi jam PKL aktual guru secara real-time.
          </p>
        </div>

        {/* STATISTIK CEPAT */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 relative z-10 shrink-0">
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center space-x-3.5 min-w-[150px]">
            <Users className="w-7 h-7 text-indigo-500 shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Siswa</p>
              <p className="text-2xl font-black text-indigo-500">{totalStudents} <span className="text-xs font-normal">Siswa</span></p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-3.5 min-w-[170px]">
            <Clock className="w-7 h-7 text-emerald-500 shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jam PKL Real</p>
              <p className="text-2xl font-black text-emerald-500">
                {totalRealHours} <span className="text-xs font-normal">Jam</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Alokasi: {totalAllocatedHours} Jam (Koef: {coefficient})
              </p>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SEARCH BAR & HEADER KELAS */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 border-inherit">
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              <span>Daftar Siswa Bimbingan Per Kelas</span>
            </h3>
            <p className="text-xs text-slate-400">
              Daftar siswa dikelompokkan berdasarkan rombel kelas lengkap dengan nama DUDI/Industri, nomor WA, dan jam real.
            </p>
          </div>

          {/* INPUT SEARCH */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, NIS, no WA, industri..."
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-medium border outline-none transition-all ${
                theme === 'dark' 
                  ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600'
              }`}
            />
          </div>
        </div>

        {assignedClasses.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Users className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
            <p className="text-sm font-semibold text-slate-400">Belum ada siswa yang di-assign ke akun pembimbing Anda.</p>
            <p className="text-xs text-slate-500">Silakan hubungi Tim Pokja Prakerin untuk melakukan plotting siswa ke guru pembimbing.</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <p className="text-sm font-semibold text-slate-400">Tidak ada siswa atau industri yang cocok dengan kata kunci "{searchQuery}".</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-indigo-500 hover:underline font-semibold"
            >
              Reset Pencarian
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredClasses.map((cls) => {
              const isExpanded = expandedClasses[cls.className] ?? true;
              const studentCount = cls.students.length;
              const classRealHours = cls.realHours ?? Number((studentCount * coefficient).toFixed(2));
              const classAllocatedHours = cls.allocatedHours ?? 0;

              return (
                <div 
                  key={cls.className}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200 shadow-sm'
                  }`}
                >
                  {/* HEADER KELAS ACCORDION */}
                  <div 
                    onClick={() => toggleClassExpand(cls.className)}
                    className={`p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer select-none transition-colors ${
                      theme === 'dark' ? 'hover:bg-slate-900' : 'hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black text-sm shrink-0 border border-indigo-500/20">
                        {cls.className.substring(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                            Kelas {cls.className}
                          </h4>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            {studentCount} Siswa
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Jurusan: {cls.department || 'Teknik Komputer dan Jaringan'}
                        </p>
                      </div>
                    </div>

                    {/* BADGE JAM REAL KELAS */}
                    <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Jam Real Guru:</span>
                        <span className="text-sm font-black text-emerald-500">
                          {classRealHours} Jam
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal ml-1.5">
                          (Alokasi: {classAllocatedHours} Jam)
                        </span>
                      </div>
                      <div className={`p-2 rounded-lg text-slate-400 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* DAFTAR SISWA KELAS */}
                  {isExpanded && (
                    <div className="border-t border-inherit">
                      {cls.students.length === 0 ? (
                        <p className="p-6 text-xs text-amber-500 text-center italic">
                          Belum ada siswa yang ditugaskan di kelas ini.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className={`border-b border-inherit uppercase text-[10px] font-bold tracking-wider ${
                              theme === 'dark' ? 'bg-slate-900/60 text-slate-400' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <tr>
                                <th className="py-3 px-4 w-12">No</th>
                                <th className="py-3 px-4">Nama Siswa / NIS</th>
                                <th className="py-3 px-4">Tempat Industri / DUDI</th>
                                <th className="py-3 px-4">Nomor WhatsApp Siswa</th>
                                <th className="py-3 px-4 text-center w-28">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-inherit">
                              {cls.students.map((student: any, idx: number) => {
                                const industry = student.placement?.industry;
                                const waLink = formatWaLink(student.phone, student.name);

                                return (
                                  <tr 
                                    key={student.id}
                                    className={`transition-colors ${
                                      theme === 'dark' ? 'hover:bg-slate-900/40' : 'hover:bg-indigo-50/30'
                                    }`}
                                  >
                                    <td className="py-3.5 px-4 font-mono text-slate-400">
                                      {idx + 1}
                                    </td>
                                    
                                    {/* NAMA SISWA & NIS */}
                                    <td className="py-3.5 px-4">
                                      <p className="font-bold text-slate-900 dark:text-white">
                                        {student.name}
                                      </p>
                                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                        NIS: {student.nis}
                                      </p>
                                    </td>

                                    {/* INDUSTRI PENEMPATAN */}
                                    <td className="py-3.5 px-4">
                                      {industry ? (
                                        <div className="space-y-0.5">
                                          <p className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                                            <span>{industry.name}</span>
                                          </p>
                                          {industry.address && (
                                            <p className="text-[11px] text-slate-400 line-clamp-1 flex items-center gap-1">
                                              <MapPin className="w-3 h-3 shrink-0" />
                                              <span>{industry.address}</span>
                                            </p>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-amber-500 italic text-[11px] font-medium">
                                          Belum Terplot Industri
                                        </span>
                                      )}
                                    </td>

                                    {/* NOMOR WHATSAPP SISWA */}
                                    <td className="py-3.5 px-4">
                                      {student.phone ? (
                                        <div className="flex items-center space-x-2">
                                          <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                          <span className="font-mono text-slate-700 dark:text-slate-300">
                                            {student.phone}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 italic text-[11px]">
                                          Tidak ada nomor
                                        </span>
                                      )}
                                    </td>

                                    {/* AKSI CHAT WHATSAPP */}
                                    <td className="py-3.5 px-4 text-center">
                                      {waLink ? (
                                        <a
                                          href={waLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm shadow-emerald-600/30 cursor-pointer"
                                          title={`Kirim pesan WhatsApp ke ${student.name}`}
                                        >
                                          <MessageSquare className="w-3.5 h-3.5" />
                                          <span>Chat WA</span>
                                        </a>
                                      ) : (
                                        <span className="text-slate-500 text-[11px]">-</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}