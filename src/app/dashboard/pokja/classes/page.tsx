// 📋 CHANGELOG:
// ✅ Perubahan: Memperbarui antarmuka Manajemen Kelas Pokja agar terhubung langsung dengan endpoint `/api/pokja/classes`, mendukung toggle izin PKL interaktif, penetapan periode massal, serta jumlah siswa dari tabel Student.
// ✨ Fitur Baru: Direct Toggle Izin PKL, Single/Bulk Period Assigner, Real-time Student Counter, & Floating Control Dock.
// 🎨 UI/UX Update: Micro-animations, responsive dark/light mode, status badge indicators, & interactive modal.
// 🔧 Bug Fix: Mengeliminasi kesalahan koneksi dengan menyatukan query data ke satu endpoint yang sah.
// 🚀 Inovasi: Enterprise Pokja Class Relational Hub.

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo } from 'react';
import { 
  Layers, 
  Calendar, 
  CheckCircle2, 
  Search, 
  CheckSquare, 
  Square, 
  Loader2, 
  RefreshCw, 
  AlertCircle,
  X,
  Save,
  Users,
  Lock,
  Unlock,
  Building2
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

export default function PokjaClassesPage() {
  const { status } = useSession();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [classes, setClasses] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // State Centang Kelas
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  // State Modal Assign Periode
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [targetPeriodId, setTargetPeriodId] = useState<string>('NONE');

  // Fetch Data Kelas & Periode dari Backend Pokja
  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/pokja/classes');
      const json = await res.json();

      if (res.ok && json.success) {
        setClasses(json.data || []);
        setPeriods(json.periods || []);
      } else {
        setErrorMsg(json.error || 'Gagal memuat data kelas.');
      }
    } catch (err: any) {
      console.error('Error fetching data for Pokja classes:', err);
      setErrorMsg('Terjadi kesalahan koneksi saat memuat data kelas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  // Filter Kelas berdasarkan Pencarian
  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const matchName = c.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = c.department?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPeriod = c.period?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchName || matchDept || matchPeriod;
    });
  }, [classes, searchTerm]);

  // Handler Centang Individual & Massal
  const handleSelectIndividual = (id: string) => {
    setSelectedClassIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const allIds = filteredClasses.map(c => c.id);
    if (selectedClassIds.length === allIds.length) {
      setSelectedClassIds([]);
    } else {
      setSelectedClassIds(allIds);
    }
  };

  // Toggle Izin PKL Kelas (Langsung Ubah)
  const handleTogglePklPermission = async (classObj: any) => {
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/pokja/classes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: classObj.id,
          isAllowedPkl: !classObj.isAllowedPkl
        })
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setSuccessMsg(`Izin PKL untuk kelas ${classObj.name} berhasil diperbarui!`);
        fetchData();
      } else {
        setErrorMsg(json.error || 'Gagal memperbarui izin PKL.');
      }
    } catch (err: any) {
      console.error('Error toggling PKL permission:', err);
      setErrorMsg('Terjadi kesalahan koneksi.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Massal/Individual Penetapan Periode
  const handleAssignPeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClassIds.length === 0) {
      setErrorMsg('Pilih minimal satu kelas!');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/pokja/classes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classIds: selectedClassIds,
          periodId: targetPeriodId === 'NONE' ? null : targetPeriodId
        })
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setSuccessMsg(json.message);
        setShowAssignModal(false);
        setSelectedClassIds([]);
        fetchData();
      } else {
        setErrorMsg(json.error || 'Gagal menetapkan periode.');
      }
    } catch (err: any) {
      console.error('Error assigning period:', err);
      setErrorMsg('Terjadi kesalahan jaringan.');
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
        <p className="text-sm font-semibold text-slate-400">Memuat Data Manajemen Kelas Pokja...</p>
      </div>
    );
  }

  const isAllSelected = filteredClasses.length > 0 && selectedClassIds.length === filteredClasses.length;

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* BANNER HEADER */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center space-x-1.5 w-fit">
            <Layers className="w-3.5 h-3.5" />
            <span>Manajemen Relasi Kelas & Periode</span>
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Manajemen Kelas Pokja 🏫</h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Atur izin pengajuan PKL dan tetapkan Periode Prakerin aktif untuk masing-masing kelas.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer shadow-md"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* NOTIFIKASI ERROR / SUCCESS */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* CONTROL BAR */}
      <div className={`p-6 rounded-3xl border shadow-lg flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 ${
        theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <button
          type="button"
          onClick={handleSelectAll}
          className={`px-4 py-3 rounded-2xl border text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
            isAllSelected
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          {isAllSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          <span>{isAllSelected ? 'Batal Centang Semua' : 'Centang Semua Kelas'}</span>
        </button>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari Nama Kelas, Jurusan, atau Periode..."
            className={`w-full pl-11 pr-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all ${
              theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
            }`}
          />
        </div>
      </div>

      {/* TABEL KELAS */}
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
                <th className="p-4">Nama Kelas</th>
                <th className="p-4">Jurusan / Departemen</th>
                <th className="p-4 text-center">Jumlah Siswa</th>
                <th className="p-4">Izin Akses PKL</th>
                <th className="p-4">Periode Prakerin Terikat</th>
                <th className="p-4 pr-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {filteredClasses.length > 0 ? (
                filteredClasses.map((c) => {
                  const isSelected = selectedClassIds.includes(c.id);

                  return (
                    <tr key={c.id} className={`transition-colors ${isSelected ? 'bg-indigo-500/10' : 'hover:bg-indigo-500/5'}`}>
                      <td className="p-4 pl-6 text-center">
                        <button
                          type="button"
                          onClick={() => handleSelectIndividual(c.id)}
                          className="p-1 rounded-lg hover:bg-indigo-500/10 transition-all cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>

                      <td className="p-4 font-bold text-sm text-indigo-300">{c.name}</td>
                      <td className="p-4 font-semibold text-slate-300">{c.department?.name || '-'}</td>

                      <td className="p-4 text-center font-bold">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 font-mono">
                          {c._count?.students || 0} Siswa
                        </span>
                      </td>

                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => handleTogglePklPermission(c)}
                          disabled={submitting}
                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold border flex items-center space-x-1.5 transition-all cursor-pointer ${
                            c.isAllowedPkl
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                          }`}
                        >
                          {c.isAllowedPkl ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          <span>{c.isAllowedPkl ? 'PKL DIIZINKAN' : 'PKL DITUTUP'}</span>
                        </button>
                      </td>

                      <td className="p-4">
                        {c.period ? (
                          <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center space-x-1 w-fit">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{c.period.name}</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 w-fit block">
                            Belum Ada Periode
                          </span>
                        )}
                      </td>

                      <td className="p-4 pr-6 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClassIds([c.id]);
                            setTargetPeriodId(c.periodId || 'NONE');
                            setShowAssignModal(true);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                        >
                          Atur Periode
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Tidak ada data kelas yang sesuai dengan pencarian Anda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FLOATING ACTION BAR DOCK */}
      {selectedClassIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="p-4 rounded-3xl bg-slate-900/95 border border-indigo-500/40 shadow-2xl backdrop-blur-xl flex justify-between items-center gap-4 text-xs">
            <span className="px-3 py-1 rounded-full bg-indigo-600 text-white font-extrabold text-xs">
              {selectedClassIds.length} Kelas Dicentang
            </span>

            <button
              type="button"
              onClick={() => {
                setTargetPeriodId('NONE');
                setShowAssignModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-2xl transition-all shadow-lg flex items-center space-x-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Tetapkan Periode Massal</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL ASSIGN PERIODE */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-6 border-b border-inherit flex justify-between items-center">
              <h3 className="font-bold text-base text-indigo-400 flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Tetapkan Periode Prakerin</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignPeriodSubmit} className="p-6 space-y-6 text-xs">
              <div className="space-y-2">
                <label className="font-bold text-slate-400 uppercase">Pilih Periode Prakerin:</label>
                <select
                  value={targetPeriodId}
                  onChange={(e) => setTargetPeriodId(e.target.value)}
                  required
                  className={`w-full px-4 py-3 rounded-2xl border outline-none font-bold ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-indigo-300 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-indigo-600 focus:border-indigo-500'
                  }`}
                >
                  <option value="NONE">-- Batalkan / Lepas Periode (Kosong) --</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 text-slate-400 space-y-1">
                <span className="font-bold text-slate-200 block">Catatan Pokja:</span>
                <p>Seluruh siswa yang terdaftar di kelas yang dicentang akan secara otomatis mewarisi jadwal Periode Prakerin ini.</p>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}