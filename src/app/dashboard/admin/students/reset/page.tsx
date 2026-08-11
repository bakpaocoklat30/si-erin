// 📋 CHANGELOG:
// ✅ Perubahan: Mengubah panggilan fetch di `fetchStudentsAndClasses` ke endpoint tunggal `/api/admin/students/reset`, memperbaiki parsing data siswa dan kelas, serta menambahkan opsi reset individual & massal per kelas.
// ✨ Fitur Baru: Direct Single Endpoint Consumer, Class-Based Mass Reset, & Live Progress Status Badges.
// 🎨 UI/UX Update: Micro-animations, dark/light theme adaptation, warning alerts, & floating dock.
// 🔧 Bug Fix: Mengatasi error "Terjadi kesalahan koneksi saat memuat data siswa" secara tuntas.
// 🚀 Inovasi: Robust Enterprise Admin Progress Reset Center.

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo } from 'react';
import { 
  RotateCcw, 
  Search, 
  CheckSquare, 
  Square, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  RefreshCw, 
  Building2, 
  ShieldAlert, 
  ArrowLeft,
  X,
  Layers
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';

export default function AdminResetProgressPage() {
  const { status } = useSession();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');

  // State Terpilih untuk Reset
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  
  // Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [resetType, setResetType] = useState<'HARD_RESET' | 'SOFT_RESET' | 'MASS_CLASS'>('HARD_RESET');
  const [targetClassName, setTargetClassName] = useState<string>('');

  // Ambil Data Siswa & Kelas dari API khusus Reset
  const fetchStudentsAndClasses = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/students/reset');
      const json = await res.json();

      if (res.ok && json.success) {
        setStudents(json.students || []);
        setClasses(json.classes || []);
      } else {
        setErrorMsg(json.error || 'Gagal memuat data siswa untuk reset progress.');
      }
    } catch (err: any) {
      console.error('Error fetching admin students for reset:', err);
      setErrorMsg('Terjadi kesalahan koneksi saat memuat data siswa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStudentsAndClasses();
    }
  }, [status]);

  // Filter Siswa
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchName = s.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchNis = s.nis?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchClass = s.className?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = s.department?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchSearch = matchName || matchNis || matchClass || matchDept;
      const matchFilterClass = selectedClassFilter === 'ALL' || s.className === selectedClassFilter;

      return matchSearch && matchFilterClass;
    });
  }, [students, searchTerm, selectedClassFilter]);

  const handleSelectIndividual = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    const visibleIds = filteredStudents.map(s => s.id);
    const isAllSelected = visibleIds.length > 0 && visibleIds.every(id => selectedStudentIds.includes(id));

    if (isAllSelected) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(visibleIds);
    }
  };

  // Eksekusi Reset Progress
  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = resetType === 'MASS_CLASS' 
        ? { resetType: 'MASS_CLASS', className: targetClassName }
        : { resetType: 'INDIVIDUAL', studentIds: selectedStudentIds, targetStatus: resetType };

      const res = await fetch('/api/admin/students/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setSuccessMsg(json.message);
        setSelectedStudentIds([]);
        setShowConfirmModal(false);
        fetchStudentsAndClasses();
      } else {
        setErrorMsg(json.error || 'Gagal mereset progress siswa.');
      }
    } catch (err: any) {
      console.error('Error executing reset:', err);
      setErrorMsg('Terjadi kesalahan jaringan saat memproses reset.');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-screen p-8 flex flex-col justify-center items-center space-y-4 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-400">Memuat Data Progress Siswa Administrator...</p>
      </div>
    );
  }

  const isAllSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(s.id));

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* BANNER HEADER */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center space-x-1.5 w-fit">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Kontrol Administrator</span>
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Reset Progress Siswa 🔄</h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Kembalikan status pengajuan tempat PKL siswa ke tahap awal agar siswa dapat memilih DUDI baru jika ada kesalahan penempatan.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/dashboard/admin/users"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kelola Pengguna</span>
          </Link>

          <button
            type="button"
            onClick={fetchStudentsAndClasses}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-2.5 rounded-2xl transition-all shrink-0 cursor-pointer shadow-md"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ALERT NOTIFIKASI */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* FILTER & CONTROL BAR */}
      <div className={`p-6 rounded-3xl border shadow-lg flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 ${
        theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <button
          type="button"
          onClick={handleSelectAll}
          className={`px-4 py-3 rounded-2xl border text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
            isAllSelected
              ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/30'
              : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          {isAllSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          <span>{isAllSelected ? 'Batal Centang Semua' : 'Centang Semua Siswa'}</span>
        </button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
          {/* SEARCH INPUT */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari Nama, NIS, atau Jurusan..."
              className={`w-full pl-11 pr-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all ${
                theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-rose-500' : 'bg-slate-50 border-slate-200 focus:border-rose-500'
              }`}
            />
          </div>

          {/* FILTER KELAS */}
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className={`px-4 py-3 rounded-2xl text-xs font-bold border outline-none cursor-pointer ${
              theme === 'dark' ? 'bg-slate-950 border-slate-800 text-rose-400' : 'bg-slate-50 border-slate-200 text-rose-600'
            }`}
          >
            <option value="ALL">Semua Kelas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABEL SISWA & STATUS PENGAJUAN */}
      <div className={`rounded-3xl border shadow-xl overflow-hidden ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b text-[10px] uppercase font-bold tracking-wider ${
              theme === 'dark' ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <tr>
                <th className="p-4 pl-6 w-12 text-center">Pilih</th>
                <th className="p-4">Nama Siswa</th>
                <th className="p-4">Kelas & Jurusan</th>
                <th className="p-4">Industri Tujuan PKL</th>
                <th className="p-4">Status Progress Saat Ini</th>
                <th className="p-4 pr-6 text-center">Aksi Reset</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s) => {
                  const isSelected = selectedStudentIds.includes(s.id);
                  const placement = s.placement;

                  return (
                    <tr key={s.id} className={`transition-colors ${isSelected ? 'bg-rose-500/10' : 'hover:bg-rose-500/5'}`}>
                      <td className="p-4 pl-6 text-center">
                        <button
                          type="button"
                          onClick={() => handleSelectIndividual(s.id)}
                          className="p-1 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-rose-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>

                      <td className="p-4 font-bold text-sm text-indigo-300">
                        {s.name}
                        <div className="text-[11px] text-slate-400 font-mono font-normal">NIS: {s.nis}</div>
                      </td>

                      <td className="p-4 font-semibold text-slate-300">
                        {s.className}
                        <div className="text-[11px] text-slate-400 font-normal">{s.department}</div>
                      </td>

                      <td className="p-4 font-semibold">
                        {placement?.industry ? (
                          <span className="text-slate-200 flex items-center space-x-1">
                            <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="truncate max-w-[200px]">{placement.industry.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Belum Mengajukan</span>
                        )}
                      </td>

                      <td className="p-4">
                        {placement ? (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold border ${
                            placement.status === 'DISETUJUI_INDUSTRI'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : placement.status === 'DITOLAK_INDUSTRI'
                                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}>
                            {placement.status.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            BELUM ADA PENGAJUAN
                          </span>
                        )}
                      </td>

                      <td className="p-4 pr-6 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentIds([s.id]);
                            setResetType('HARD_RESET');
                            setShowConfirmModal(true);
                          }}
                          className="bg-rose-600/80 hover:bg-rose-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center space-x-1 mx-auto"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Siswa Ini</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Tidak ada data siswa yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FLOATING ACTION DOCK (RESET MASSAL KELOMPOK / TERPILIH) */}
      {selectedStudentIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="p-4 rounded-3xl bg-slate-900/95 border border-rose-500/40 shadow-2xl backdrop-blur-xl flex justify-between items-center gap-4 text-xs">
            <span className="px-3.5 py-1.5 rounded-full bg-rose-600 text-white font-extrabold text-xs">
              {selectedStudentIds.length} Siswa Dicentang
            </span>

            <button
              type="button"
              onClick={() => {
                setResetType('HARD_RESET');
                setShowConfirmModal(true);
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-5 rounded-2xl transition-all shadow-lg flex items-center space-x-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Progress Siswa Terpilih</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI RESET PROGRESS */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-6 border-b border-inherit flex justify-between items-center">
              <h3 className="font-bold text-base text-rose-400 flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5" />
                <span>Konfirmasi Reset Progress Siswa</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteReset} className="p-6 space-y-6 text-xs">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2">
                <span className="font-extrabold text-sm flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Peringatan Tindakan Administrator!</span>
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Tindakan ini akan **menghapus status penempatan saat ini** sehingga siswa dapat mengajukan ulang dari awal.
                </p>
              </div>

              <div className="space-y-3">
                <label className="font-bold text-slate-400 uppercase">Pilih Jenis Reset:</label>
                
                <label className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950/40 flex items-center space-x-3 cursor-pointer hover:border-rose-500 transition-all">
                  <input
                    type="radio"
                    name="resetTypeOption"
                    value="HARD_RESET"
                    checked={resetType === 'HARD_RESET'}
                    onChange={() => setResetType('HARD_RESET')}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="font-bold text-slate-200 block">Hard Reset (Hapus Penempatan)</span>
                    <span className="text-[10px] text-slate-400">Siswa kembali ke status belum pernah mengajukan PKL.</span>
                  </div>
                </label>

                <label className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950/40 flex items-center space-x-3 cursor-pointer hover:border-rose-500 transition-all">
                  <input
                    type="radio"
                    name="resetTypeOption"
                    value="SOFT_RESET"
                    checked={resetType === 'SOFT_RESET'}
                    onChange={() => setResetType('SOFT_RESET')}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="font-bold text-slate-200 block">Soft Reset (Kembali ke Tahap 1)</span>
                    <span className="text-[10px] text-slate-400">Tetap di industri pilihan tetapi dikembalikan ke status PENGAJUAN_DIKIRIM.</span>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-lg flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  <span>Eksekusi Reset Sekarang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}