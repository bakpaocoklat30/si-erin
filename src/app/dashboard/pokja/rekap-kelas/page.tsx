'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/app/theme-provider';
import { useSession } from 'next-auth/react';
import { Loader2, Users, Search, AlertCircle, BarChart3, Filter } from 'lucide-react';

const BELUM_MENDAFTAR = ['BELUM_MENDAFTAR'];
const MENGAJUKAN = ['PENGAJUAN_DIKIRIM', 'REVIEW_POKJA', 'PEMBUATAN_SURAT', 'SURAT_DITERBITKAN', 'LETTER_ISSUED'];
const MENUNGGU_BALASAN = ['KIRIM_SURAT', 'SENT_DUDI'];
const DITERIMA = ['DISETUJUI_INDUSTRI', 'REQUEST_PENGANTARAN', 'MENUNGGU_PEMBERANGKATAN', 'PENGANTARAN_DITERBITKAN', 'REQUEST_PENARIKAN', 'MENUNGGU_PENARIKAN', 'PENARIKAN_DITERBITKAN', 'DITERIMA', 'DITERIMA_INDUSTRI', 'COMPLETED', 'SELESAI_PKL'];

export default function PokjaRekapKelasPage() {
  const { theme } = useTheme();
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [students, setStudents] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classRooms, setClassRooms] = useState<any[]>([]);
  
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('ALL');
  const [selectedClassRoom, setSelectedClassRoom] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData(selectedAcademicYear, selectedClassRoom);
  }, [selectedAcademicYear, selectedClassRoom]);

  const fetchData = async (academicYearId: string, className: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      if (academicYearId && academicYearId !== 'ALL') params.set('academicYearId', academicYearId);
      if (className && className !== 'ALL') params.set('className', className);
      
      const res = await fetch(`/api/pokja/rekap-kelas?${params.toString()}`);
      const json = await res.json();
      
      if (res.ok && json.success) {
        setStudents(json.data || []);
        if (json.filters) {
          if (academicYears.length === 0) setAcademicYears(json.filters.academicYears || []);
          setClassRooms(json.filters.classRooms || []);
        }
      } else {
        setErrorMsg(json.error || 'Gagal memuat rekap kelas');
      }
    } catch (e: any) {
      setErrorMsg('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  };

  const filteredClassRooms = useMemo(() => {
    if (selectedAcademicYear === 'ALL') return classRooms;
    return classRooms.filter(c => c.academicYearId === selectedAcademicYear);
  }, [classRooms, selectedAcademicYear]);

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const lowerSearch = searchTerm.toLowerCase();
    return students.filter(s => 
      s.name.toLowerCase().includes(lowerSearch) ||
      s.nis.toLowerCase().includes(lowerSearch)
    );
  }, [students, searchTerm]);

  // Statistik
  const stats = useMemo(() => {
    let belumMendaftar = 0;
    let mengajukan = 0;
    let menunggu = 0;
    let diterima = 0;

    students.forEach(s => {
      const status = s.placement?.status;
      if (!s.placement || !status || BELUM_MENDAFTAR.includes(status)) {
        belumMendaftar++;
      } else if (MENGAJUKAN.includes(status)) {
        mengajukan++;
      } else if (MENUNGGU_BALASAN.includes(status)) {
        menunggu++;
      } else if (DITERIMA.includes(status)) {
        diterima++;
      } else {
        belumMendaftar++; // Fallback
      }
    });

    const total = students.length || 1; // avoid div by 0
    return {
      total: students.length,
      belumMendaftar,
      mengajukan,
      menunggu,
      diterima,
      pctBelumMendaftar: (belumMendaftar / total) * 100,
      pctMengajukan: (mengajukan / total) * 100,
      pctMenunggu: (menunggu / total) * 100,
      pctDiterima: (diterima / total) * 100,
    };
  }, [students]);

  const formatStatus = (status?: string) => {
    if (!status || BELUM_MENDAFTAR.includes(status)) return 'Belum Mendaftar PKL';
    if (MENGAJUKAN.includes(status)) return 'Mengajukan PKL';
    if (MENUNGGU_BALASAN.includes(status)) return 'Menunggu Balasan PKL';
    if (DITERIMA.includes(status)) return 'Diterima Industri';
    return status.replace(/_/g, ' ');
  };

  const getStatusColor = (status?: string) => {
    if (!status || BELUM_MENDAFTAR.includes(status)) return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300';
    if (MENGAJUKAN.includes(status)) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200';
    if (MENUNGGU_BALASAN.includes(status)) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200';
    if (DITERIMA.includes(status)) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/80 text-slate-900'
    }`}>
      
      {/* HEADER */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center space-x-3">
            <div className="p-3 bg-indigo-600/10 rounded-2xl">
              <BarChart3 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Rekapitulasi Siswa Per Kelas
            </span>
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Pantau progres penempatan PKL siswa berdasarkan tahun pelajaran dan kelas.
          </p>
        </div>
      </div>

      {/* FILTER BOX */}
      <div className={`p-6 rounded-2xl border shadow-sm ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">Tahun Pelajaran</label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => {
                setSelectedAcademicYear(e.target.value);
                setSelectedClassRoom('ALL');
              }}
              className={`w-full p-2.5 rounded-xl text-sm border focus:ring-2 focus:ring-indigo-500 transition-all ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <option value="ALL">-- Semua Tahun Pelajaran --</option>
              {academicYears.map(ay => (
                <option key={ay.id} value={ay.id}>{ay.year}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">Nama Kelas</label>
            <select
              value={selectedClassRoom}
              onChange={(e) => setSelectedClassRoom(e.target.value)}
              className={`w-full p-2.5 rounded-xl text-sm border focus:ring-2 focus:ring-indigo-500 transition-all ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <option value="ALL">-- Semua Kelas --</option>
              {filteredClassRooms.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">Cari Siswa / NIS</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari nama atau NIS..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border focus:ring-2 focus:ring-indigo-500 transition-all ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-semibold">{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="font-bold text-slate-500">Memuat rekapitulasi kelas...</p>
        </div>
      ) : (
        <>
          {/* PROGRESS BAR & STATS */}
          <div className={`p-6 rounded-2xl border shadow-sm ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className="font-bold mb-4 text-lg">Statistik Kelas ({stats.total} Siswa)</h3>
            
            <div className="w-full h-6 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner mb-6">
              <div style={{ width: `${stats.pctDiterima}%` }} className="h-full bg-emerald-500 transition-all duration-500" title="Diterima Industri"></div>
              <div style={{ width: `${stats.pctMenunggu}%` }} className="h-full bg-amber-500 transition-all duration-500" title="Menunggu Balasan PKL"></div>
              <div style={{ width: `${stats.pctMengajukan}%` }} className="h-full bg-blue-500 transition-all duration-500" title="Mengajukan PKL"></div>
              <div style={{ width: `${stats.pctBelumMendaftar}%` }} className="h-full bg-slate-300 dark:bg-slate-600 transition-all duration-500" title="Belum Mendaftar PKL"></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 flex flex-col">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Belum Mendaftar</span>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-slate-700 dark:text-slate-300">{stats.belumMendaftar}</span>
                  <span className="text-sm font-medium text-slate-400 mb-1">({stats.pctBelumMendaftar.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="p-4 rounded-xl border bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 flex flex-col">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Mengajukan PKL</span>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-blue-700 dark:text-blue-300">{stats.mengajukan}</span>
                  <span className="text-sm font-medium text-blue-500 mb-1">({stats.pctMengajukan.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="p-4 rounded-xl border bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30 flex flex-col">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Menunggu Balasan</span>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-amber-700 dark:text-amber-300">{stats.menunggu}</span>
                  <span className="text-sm font-medium text-amber-500 mb-1">({stats.pctMenunggu.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="p-4 rounded-xl border bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 flex flex-col">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Diterima Industri</span>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{stats.diterima}</span>
                  <span className="text-sm font-medium text-emerald-500 mb-1">({stats.pctDiterima.toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* TABEL SISWA */}
          <div className={`rounded-2xl border shadow-sm overflow-hidden ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className={`bg-slate-50 dark:bg-slate-800/50 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                  <tr>
                    <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 w-16 text-center">No</th>
                    <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400">NIS</th>
                    <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400">Nama Siswa</th>
                    <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 text-center">Kelas</th>
                    <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400">Status Terakhir</th>
                    <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400">Industri / Instansi Penempatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student, idx) => (
                      <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 text-center font-medium">{idx + 1}</td>
                        <td className="px-6 py-4 font-mono text-xs">{student.nis}</td>
                        <td className="px-6 py-4 font-bold">{student.name}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
                            {student.className}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(student.placement?.status)}`}>
                            {formatStatus(student.placement?.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {student.placement?.industry?.name ? (
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                              {student.placement.industry.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Belum ada instansi</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        Tidak ada data siswa yang sesuai filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

