'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Building2, 
  CheckCircle2, 
  Loader2, 
  Check, 
  ShieldCheck,
  ChevronLeft
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ManualPlacementPage() {
  const { status } = useSession();
  const { theme } = useTheme();
  const router = useRouter();

  const [students, setStudents] = useState<any[]>([]);
  const [industries, setIndustries] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [selectedIndustry, setSelectedIndustry] = useState('');
  // const [selectedPeriod, setSelectedPeriod] = useState(''); // Visual only, DB infers from Class
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resStudents, resIndustries, resPeriods] = await Promise.all([
          fetch('/api/pokja/students'),
          fetch('/api/pokja/industries'),
          fetch('/api/pokja/periods')
        ]);
        
        const [jsonStudents, jsonIndustries, jsonPeriods] = await Promise.all([
          resStudents.json(),
          resIndustries.json(),
          resPeriods.json()
        ]);

        if (jsonStudents.success) setStudents(jsonStudents.data);
        if (jsonIndustries.success) setIndustries(jsonIndustries.data);
        if (jsonPeriods.success) setPeriods(jsonPeriods.data);
      } catch (err) {
        setErrorMsg('Gagal mengambil data dari server.');
      } finally {
        setLoading(false);
      }
    };
    if (status === 'authenticated') fetchData();
  }, [status]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchName = s.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchNis = s.nis?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchClass = s.className?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchName || matchNis || matchClass;
    });
  }, [students, searchTerm]);

  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIndustry || selectedStudentIds.length === 0) {
      setErrorMsg('Harap pilih industri dan minimal 1 siswa.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/pokja/students/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: selectedStudentIds,
          industryId: selectedIndustry,
          status: 'DISETUJUI_INDUSTRI'
        })
      });

      const json = await res.json();
      if (res.ok) {
        setSuccessMsg('Penempatan manual berhasil! Siswa telah otomatis masuk ke kelompok industri.');
        setTimeout(() => {
          router.push('/dashboard/pokja/kelompok');
        }, 2000);
      } else {
        setErrorMsg(json.error || 'Gagal menyimpan penempatan.');
      }
    } catch (err: any) {
      setErrorMsg('Terjadi kesalahan koneksi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen p-8 flex flex-col justify-center items-center space-y-4 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-sm font-semibold">Memuat Data...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-32 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/dashboard/pokja" className="p-2 bg-slate-200 dark:bg-slate-800 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">Penempatan PKL Manual</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Buat kelompok baru secara manual tanpa melalui pengajuan siswa.</p>
        </div>
      </div>

      {errorMsg && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-2xl">{errorMsg}</div>}
      {successMsg && <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-2xl">{successMsg}</div>}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* KOLOM KIRI: PILIHAN INDUSTRI & PERIODE */}
        <div className={`lg:col-span-1 p-6 rounded-3xl border shadow-xl space-y-6 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="space-y-2">
            <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              <span>1. Pilih Industri Tujuan</span>
            </h3>
            <select 
              value={selectedIndustry} 
              onChange={e => setSelectedIndustry(e.target.value)}
              className={`w-full p-3.5 rounded-xl border font-semibold text-sm outline-none focus:ring-2 focus:ring-blue-500/50 ${theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'}`}
              required
            >
              <option value="">-- Pilih Industri --</option>
              {industries.map(ind => (
                <option key={ind.id} value={ind.id}>{ind.name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-bold text-slate-700 dark:text-slate-300">Catatan Sistem:</h3>
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-400 space-y-2">
              <p>Kelompok ini akan memiliki ID unik tersendiri sehingga <b>tidak akan tercampur</b> dengan pengajuan sebelumnya meskipun di industri yang sama.</p>
              <p>Periode PKL akan disesuaikan otomatis berdasarkan tahun ajaran (kelas) siswa yang Anda pilih di sebelah kanan.</p>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting || selectedStudentIds.length === 0 || !selectedIndustry}
            className="w-full py-3.5 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-all flex justify-center items-center gap-2 shadow-lg shadow-blue-500/30"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
            <span>Buat Kelompok PKL</span>
          </button>
        </div>

        {/* KOLOM KANAN: PILIH SISWA */}
        <div className={`lg:col-span-2 p-6 rounded-3xl border shadow-xl flex flex-col h-[600px] ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
              <Users className="w-5 h-5 text-indigo-500" />
              <span>2. Pilih Anggota Siswa ({selectedStudentIds.length} terpilih)</span>
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari siswa..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 ${theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'}`}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">Siswa tidak ditemukan.</div>
            ) : (
              filteredStudents.map(student => {
                const isSelected = selectedStudentIds.includes(student.id);
                const isSudahPkl = student.placement && (student.placement.status === 'AKTIF' || student.placement.status === 'DISETUJUI_INDUSTRI' || student.placement.status === 'SURAT_DITERBITKAN');

                return (
                  <div 
                    key={student.id} 
                    onClick={() => handleToggleStudent(student.id)}
                    className={`p-4 rounded-2xl border flex items-center gap-4 cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-indigo-500/10 border-indigo-500/50' 
                        : theme === 'dark' 
                          ? 'bg-slate-950 border-slate-800 hover:border-slate-700' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-md border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-400'}`}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{student.name}</h4>
                        {isSudahPkl && (
                          <span className="px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-600 rounded-full font-bold">Sudah PKL</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-4 mt-1">
                        <span>NIS: {student.nis}</span>
                        <span>Kelas: <strong className="text-indigo-500">{student.className}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </form>
    </div>
  );
}
