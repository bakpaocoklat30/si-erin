// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Menampilkan informasi Periode Prakerin dan Nilai Koefisien PKL secara otomatis pada modal mapping kelas.
// ✨ Fitur Baru: Class Detail Period & Coefficient Modal Card Integration.
// ----------------------------------------------------------------------

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { 
  Clock, Users, Plus, Trash2, ShieldCheck, ArrowLeft, AlertCircle, X, Calendar, Calculator, CheckCircle2 
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

export default function PokjaTeacherHoursPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  const userRole = (session?.user as any)?.role;
  const [allocations, setAllocations] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [classDetailData, setClassDetailData] = useState<{ periodInfo: any; coefficientInfo: any } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form Add Allocation
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    className: 'XII TKJ 1',
    teacherId: '',
    totalHours: '20',
    academicYear: '2026/2027'
  });

  const loadData = useCallback(() => {
    setLoading(true);
    const timestamp = new Date().getTime();
    fetch(`/api/pokja/teacher-hours?t=${timestamp}`)
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setAllocations(res.allocations || []);
        } else {
          setErrorMsg(res.error || 'Gagal memuat data');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setErrorMsg('Koneksi server terputus');
        setLoading(false);
      });

    // Ambil daftar guru pembimbing
    fetch(`/api/admin/master?type=teachers&t=${timestamp}`)
      .then(res => res.json())
      .then(res => {
        if (res.success) setTeachers(res.data || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      loadData();
    }
  }, [status, loadData]);

  const handleOpenClassModal = async (className: string) => {
    setSelectedClass(className);
    setLoadingDetail(true);
    setClassDetailData(null);

    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/pokja/teacher-hours?className=${encodeURIComponent(className)}&t=${timestamp}`);
      const result = await res.json();
      if (result.success) {
        setClassDetailData({
          periodInfo: result.periodInfo,
          coefficientInfo: result.coefficientInfo
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAddAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/pokja/teacher-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await res.json();
      if (result.success) {
        setSuccessMsg(result.message);
        setShowAddModal(false);
        loadData();
      } else {
        setErrorMsg(result.error || 'Gagal menyimpan');
      }
    } catch (err) {
      setErrorMsg('Gagal terhubung ke server');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus alokasi jam ini?')) return;
    try {
      const res = await fetch(`/api/pokja/teacher-hours?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        setSuccessMsg(result.message);
        loadData();
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert('Gagal menghapus data');
    }
  };

  if (status === 'loading') {
    return (
      <div className={`min-h-[70vh] flex items-center justify-center ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold">Memuat Manajemen Jam PKL...</span>
        </div>
      </div>
    );
  }

  // Kelompokkan alokasi berdasarkan kelas
  const classesList = Array.from(new Set(allocations.map(a => a.className)));

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
            Manajemen <span className="text-emerald-600 dark:text-emerald-400">Jam & Bimbingan PKL</span> ⏱️
          </h2>
          <p className={`text-sm max-w-2xl ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Atur alokasi jam guru pembimbing dan pantau periode serta koefisien PKL per rombongan belajar.
          </p>
        </div>

        <div className="flex items-center space-x-3 relative z-10">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Alokasi Jam</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-sm font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm font-semibold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* DAFTAR KELAS CARD GRID */}
      <div className={`border rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'}`}>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold flex items-center space-x-2">
            <Users className="w-5 h-5 text-emerald-500" />
            <span>Daftar Kelas & Alokasi Bimbingan PKL</span>
          </h3>
          <span className="text-xs text-slate-400">Klik kelas untuk melihat Periode & Koefisien</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-36 rounded-2xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
            ))}
          </div>
        ) : classesList.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Clock className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
            <p className="text-sm font-semibold text-slate-400">Belum ada alokasi jam kelas yang diatur.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classesList.map((clsName) => {
              const classAllocations = allocations.filter(a => a.className === clsName);
              const totalHours = classAllocations.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);
              
              return (
                <div
                  key={clsName}
                  onClick={() => handleOpenClassModal(clsName)}
                  className={`border rounded-2xl p-6 shadow-md transition-all hover:scale-[1.02] cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-4 ${
                    theme === 'dark' ? 'bg-slate-950/60 border-slate-800 hover:border-emerald-500/50' : 'bg-slate-50 border-slate-200 hover:border-emerald-500/50'
                  }`}
                >
                  <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-24 h-24 bg-emerald-600/10 rounded-full blur-xl pointer-events-none"></div>
                  
                  <div className="space-y-1 relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Rombongan Belajar</span>
                    <h4 className="text-xl font-extrabold">{clsName}</h4>
                  </div>

                  <div className="space-y-2 relative z-10 text-xs">
                    <p className="text-slate-400">Jumlah Guru Pembimbing: <strong className="text-white">{classAllocations.length} Orang</strong></p>
                    <p className="text-slate-400">Total Alokasi Jam: <strong className="text-emerald-400">{totalHours} Jam</strong></p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/50 flex justify-between items-center text-xs font-bold text-emerald-400">
                    <span>Detail & Periode PKL</span>
                    <span>→</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DETAIL KELAS, PERIODE & KOEFISIEN */}
      {selectedClass && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            
            <div className="flex justify-between items-center border-b pb-4 border-inherit">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Mapping Guru & Periode PKL</span>
                <h3 className="text-xl font-extrabold">Kelas {selectedClass}</h3>
              </div>
              <button onClick={() => setSelectedClass(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-12 text-center space-y-2 animate-pulse">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-400">Memuat periode dan koefisien kelas...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 🌟 KARTU PERIODE PRAKERIN & KOEFISIEN PKL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Periode Card */}
                  <div className={`p-4 rounded-2xl border space-y-1.5 ${theme === 'dark' ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                    <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      <span>Periode Prakerin Siswa</span>
                    </div>
                    <p className="text-base font-black">{classDetailData?.periodInfo?.name || 'Belum Terikat Periode'}</p>
                    <p className="text-[11px] opacity-80">
                      {classDetailData?.periodInfo?.startDate 
                        ? `${new Date(classDetailData.periodInfo.startDate).toLocaleDateString('id-ID')} s.d. ${new Date(classDetailData.periodInfo.endDate).toLocaleDateString('id-ID')}`
                        : 'Atur periode di menu Pokja / Master Data'}
                    </p>
                  </div>

                  {/* Koefisien Card */}
                  <div className={`p-4 rounded-2xl border space-y-1.5 ${theme === 'dark' ? 'bg-indigo-950/20 border-indigo-900/50 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-900'}`}>
                    <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
                      <Calculator className="w-4 h-4 text-indigo-500" />
                      <span>Nilai Koefisien PKL</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <p className="text-2xl font-black">{classDetailData?.coefficientInfo?.coefficient || '0.0000'}</p>
                      <span className="text-[10px] font-semibold opacity-80">
                        {classDetailData?.coefficientInfo ? `Kelas: ${classDetailData.coefficientInfo.totalClasses} | Jam: ${classDetailData.coefficientInfo.hoursPerClass}` : 'Belum diatur'}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-80">Diambil dari data input koefisien Pokja</p>
                  </div>
                </div>

                {/* DAFTAR GURU PEMBIMBING DI KELAS INI */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Daftar Guru Pembimbing & Alokasi Jam</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {allocations.filter(a => a.className === selectedClass).map((alloc) => (
                      <div key={alloc.id} className={`p-4 rounded-xl border flex justify-between items-center ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div>
                          <p className="font-bold text-sm">{alloc.teacher?.name || 'Guru Pembimbing'}</p>
                          <p className="text-[11px] text-slate-400">Tahun Pelajaran: {alloc.academicYear}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {alloc.totalHours} Jam
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDelete(alloc.id)}
                            className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                            title="Hapus Alokasi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-inherit">
              <button
                type="button"
                onClick={() => setSelectedClass(null)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-600/30"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH ALOKASI JAM */}
      {showAddModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex justify-between items-center border-b pb-4 border-inherit">
              <h3 className="text-lg font-bold">Tambah Alokasi Jam Guru</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAllocation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nama Kelas / Rombel</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: XII TKJ 1"
                  value={formData.className}
                  onChange={(e) => setFormData({...formData, className: e.target.value})}
                  className={`w-full p-3 rounded-xl border text-xs outline-none ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Pilih Guru Pembimbing</label>
                <select
                  required
                  value={formData.teacherId}
                  onChange={(e) => setFormData({...formData, teacherId: e.target.value})}
                  className={`w-full p-3 rounded-xl border text-xs outline-none cursor-pointer ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                >
                  <option value="">-- Pilih Guru Pembimbing --</option>
                  {teachers.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.username})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Total Jam</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.totalHours}
                    onChange={(e) => setFormData({...formData, totalHours: e.target.value})}
                    className={`w-full p-3 rounded-xl border text-xs outline-none ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Tahun Pelajaran</label>
                  <input
                    type="text"
                    required
                    value={formData.academicYear}
                    onChange={(e) => setFormData({...formData, academicYear: e.target.value})}
                    className={`w-full p-3 rounded-xl border text-xs outline-none ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-inherit">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${theme === 'dark' ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-700'}`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
                >
                  Simpan Alokasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}