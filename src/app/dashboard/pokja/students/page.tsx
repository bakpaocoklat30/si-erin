// 📋 CHANGELOG:
// ✅ Perubahan: Mengintegrasikan fitur Reset Password Akun Siswa (opsi default NIS / Kustom) ke dalam Halaman Manajemen Siswa Pokja dengan tombol icon Key/Lock dan Modal Interaktif.
// ✨ Fitur Baru: Pokja Direct Student Password Resetter, Custom Password Option, & Copyable Reset Result Banner.
// 🎨 UI/UX Update: Badges status izin PKL & verifikasi berkas, animasi modal backdrop-blur, Search Bar real-time, filter kelas, serta tombol Aksi Reset Password.
// 🔧 Bug Fix: Menyelaraskan pembacaan data siswa dan pembaruan password kredensial `User` via NextAuth & Bcrypt.
// 🚀 Inovasi: All-in-One Student Record Inspection, Verification & Credential Reset Hub.

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Eye, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Building2, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ExternalLink, 
  User, 
  Phone, 
  GraduationCap, 
  Loader2, 
  RefreshCw,
  AlertCircle,
  KeyRound,
  Check,
  Copy,
  Lock
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

export default function PokjaStudentsPage() {
  const { status } = useSession();
  const { theme } = useTheme();

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');

  // State Pagination Limit (5, 10, 25, 50, 100)
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // State Modal Detail Siswa
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // State Modal Preview Dokumen Live (CV / BPJS)
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [activePreviewTitle, setActivePreviewTitle] = useState<string>('');

  // State Modal Reset Password Siswa
  const [targetStudentForReset, setTargetStudentForReset] = useState<any | null>(null);
  const [useDefaultNis, setUseDefaultNis] = useState(true);
  const [customPasswordInput, setCustomPasswordInput] = useState('');
  const [resetSuccessData, setResetSuccessData] = useState<{ name: string; pass: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch Data Siswa Pokja
  const fetchStudents = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/pokja/students');
      const json = await res.json();

      if (res.ok && json.success) {
        setStudents(json.data || []);
      } else {
        setErrorMsg(json.error || 'Gagal memuat daftar siswa.');
      }
    } catch (err: any) {
      console.error('Error fetching students:', err);
      setErrorMsg('Terjadi kesalahan jaringan saat mengambil data siswa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStudents();
    }
  }, [status]);

  // Ekstrak Daftar Unik Kelas untuk Dropdown Filter
  const uniqueClasses = useMemo(() => {
    const setCls = new Set<string>();
    students.forEach(s => { if (s.className) setCls.add(s.className); });
    return Array.from(setCls).sort();
  }, [students]);

  // Filter Data Berdasarkan Pencarian & Filter Kelas
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

  // Hitung Data Terpaginasi
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);

  // Reset ke halaman 1 saat pencarian, filter, atau limit berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedClassFilter, itemsPerPage]);

  // Toggle Status Izin PKL Siswa Langsung dari Tabel
  const handleTogglePklPermission = async (studentId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/pokja/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: studentId, isAllowedPkl: !currentStatus })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setStudents((prev) =>
          prev.map((s) => (s.id === studentId ? { ...s, isAllowedPkl: !currentStatus } : s))
        );
        if (selectedStudent && selectedStudent.id === studentId) {
          setSelectedStudent((prev: any) => ({ ...prev, isAllowedPkl: !currentStatus }));
        }
      }
    } catch (err) {
      console.error('Error updating PKL status:', err);
    }
  };

  // Submit Reset Password Siswa
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentForReset) return;

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/pokja/students/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: targetStudentForReset.id,
          customPassword: useDefaultNis ? targetStudentForReset.nis : customPasswordInput
        })
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setResetSuccessData({
          name: targetStudentForReset.name,
          pass: json.newPassword
        });
        setSuccessMsg(json.message);
        setTargetStudentForReset(null);
        setCustomPasswordInput('');
      } else {
        setErrorMsg(json.error || 'Gagal mereset password siswa.');
      }
    } catch (err: any) {
      console.error('Error executing password reset:', err);
      setErrorMsg('Terjadi kesalahan koneksi saat mereset password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyPassword = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-screen p-8 flex flex-col justify-center items-center space-y-4 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-400">Memuat Data Manajemen Siswa...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* BANNER HEADER */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center space-x-1.5 w-fit">
            <Users className="w-3.5 h-3.5" />
            <span>Portal Pokja Prakerin</span>
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Manajemen Siswa 🎓</h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Kelola kelayakan siswa, pantau status verifikasi berkas CV/BPJS, periksa penempatan DUDI, serta **Reset Password Akun Siswa**.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchStudents}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer shadow-md"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* ALERT NOTIFIKASI ERROR / SUCCESS */}
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

      {/* HASIL RESET PASSWORD BANNER (COPYABLE) */}
      {resetSuccessData && (
        <div className="p-6 rounded-3xl bg-indigo-600/10 border border-indigo-500/40 text-indigo-300 space-y-3 animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center">
            <span className="font-extrabold text-sm flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Password Siswa Berhasil Diperbarui!</span>
            </span>
            <button
              type="button"
              onClick={() => setResetSuccessData(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300">
            Password baru untuk siswa <strong>{resetSuccessData.name}</strong> telah disetel menjadi:
          </p>
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-indigo-500/30 font-mono font-bold text-sm text-amber-400 flex justify-between items-center max-w-md">
            <span>{resetSuccessData.pass}</span>
            <button
              type="button"
              onClick={() => handleCopyPassword(resetSuccessData.pass)}
              className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin Password'}</span>
            </button>
          </div>
        </div>
      )}

      {/* FILTER & LIMIT CONTROL BAR */}
      <div className={`p-6 rounded-3xl border shadow-lg flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 ${
        theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        
        {/* SEARCH BAR */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari berdasarkan NIS, Nama, Kelas, atau Jurusan..."
            className={`w-full pl-11 pr-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all ${
              theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
            }`}
          />
        </div>

        {/* FILTER KELAS & LIMIT CONTROLLER */}
        <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
          {/* DROPDOWN KELAS */}
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold border outline-none cursor-pointer transition-all ${
              theme === 'dark' ? 'bg-slate-950 border-slate-800 text-indigo-300 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-indigo-600 focus:border-indigo-500'
            }`}
          >
            <option value="ALL">Semua Kelas ({uniqueClasses.length} Kelas)</option>
            {uniqueClasses.map((cls) => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>

          {/* LIMIT ITEMS PER PAGE */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-400">Limit:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className={`px-3 py-2.5 rounded-2xl text-xs font-bold border outline-none cursor-pointer transition-all ${
                theme === 'dark' ? 'bg-slate-950 border-slate-800 text-indigo-400 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-indigo-600 focus:border-indigo-500'
              }`}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

      </div>

      {/* TABEL DATA SISWA */}
      <div className={`rounded-3xl border shadow-xl overflow-hidden ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b text-[11px] uppercase font-bold tracking-wider ${
              theme === 'dark' ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <tr>
                <th className="p-4 pl-6">Siswa</th>
                <th className="p-4">Kelas & Jurusan</th>
                <th className="p-4">Status Izin PKL</th>
                <th className="p-4">Berkas CV</th>
                <th className="p-4">Kartu BPJS</th>
                <th className="p-4">Penempatan DUDI</th>
                <th className="p-4 pr-6 text-center">Aksi Kelola</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {paginatedStudents.length > 0 ? (
                paginatedStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-indigo-500/5 transition-colors">
                    
                    {/* NAMA & NIS */}
                    <td className="p-4 pl-6 font-semibold">
                      <div className="font-bold text-sm text-indigo-400">{s.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">NIS: {s.nis}</div>
                    </td>

                    {/* KELAS & JURUSAN */}
                    <td className="p-4">
                      <div className="font-bold">{s.className || '-'}</div>
                      <div className="text-[11px] text-slate-400">{s.department || '-'}</div>
                    </td>

                    {/* STATUS IZIN PKL */}
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => handleTogglePklPermission(s.id, s.isAllowedPkl)}
                        className={`px-3 py-1 rounded-full text-[11px] font-extrabold border transition-all cursor-pointer flex items-center space-x-1.5 w-fit ${
                          s.isAllowedPkl 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                        }`}
                      >
                        {s.isAllowedPkl ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>DIIZINKAN</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>BELUM IZIN</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* STATUS BERKAS CV */}
                    <td className="p-4">
                      {s.cvUrl ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>ADA CV</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 w-fit block">
                          BELUM ADA
                        </span>
                      )}
                    </td>

                    {/* STATUS KARTU BPJS */}
                    <td className="p-4">
                      {s.bpjsUrl ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center space-x-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>ADA BPJS</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 w-fit block">
                          BELUM ADA
                        </span>
                      )}
                    </td>

                    {/* PENEMPATAN DUDI */}
                    <td className="p-4 font-semibold">
                      {s.placement?.industry ? (
                        <span className="text-emerald-400 flex items-center space-x-1">
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[140px]">{s.placement.industry.name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Belum Penempatan</span>
                      )}
                    </td>

                    {/* AKSI KELOLA (LIHAT DETAIL & RESET PASSWORD) */}
                    <td className="p-4 pr-6 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {/* TOMBOL 1: LIHAT DETAIL */}
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(s)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1 cursor-pointer"
                          title="Lihat Detail Profil Siswa"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>

                        {/* TOMBOL 2: RESET PASSWORD */}
                        <button
                          type="button"
                          onClick={() => {
                            setTargetStudentForReset(s);
                            setUseDefaultNis(true);
                            setCustomPasswordInput('');
                          }}
                          className="bg-amber-600/80 hover:bg-amber-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center space-x-1 cursor-pointer"
                          title="Reset Password Akun Siswa"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Reset Pass</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Tidak ada data siswa yang cocok dengan pencarian Anda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER NAVIGASI PAGINASI */}
        <div className={`p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-xs ${
          theme === 'dark' ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="text-slate-400">
            Menampilkan <strong className="text-indigo-400">{paginatedStudents.length}</strong> dari total <strong className="text-indigo-400">{filteredStudents.length}</strong> siswa
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className="p-2 rounded-xl border bg-slate-800 border-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-bold">
              Halaman {currentPage} dari {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              className="p-2 rounded-xl border bg-slate-800 border-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: LIHAT DETAIL PROFIL LENGKAP SISWA */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-3xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            
            {/* HEADER MODAL */}
            <div className="p-6 border-b border-inherit flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-indigo-400">{selectedStudent.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">NIS: {selectedStudent.nis} | NISN: {selectedStudent.nisn || '-'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* BODY MODAL DETAIL */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              
              {/* STATUS UTAMA & STATUS IZIN PKL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Kelayakan Prakerin</span>
                  <div className="flex items-center justify-between pt-1">
                    <span className={`font-black ${selectedStudent.isAllowedPkl ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {selectedStudent.isAllowedPkl ? 'DIIZINKAN PKL' : 'BELUM DIIZINKAN'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTogglePklPermission(selectedStudent.id, selectedStudent.isAllowedPkl)}
                      className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition-all cursor-pointer"
                    >
                      Ubah Status
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Penempatan Industri (DUDI)</span>
                  <div className="font-bold text-emerald-400 pt-1 truncate">
                    {selectedStudent.placement?.industry?.name || 'Belum Penempatan'}
                  </div>
                </div>
              </div>

              {/* DETAIL AKADEMIK & KONTAK */}
              <div className="space-y-3">
                <h4 className="font-bold uppercase tracking-wider text-slate-400 border-b border-inherit pb-2 flex items-center space-x-1.5">
                  <GraduationCap className="w-4 h-4 text-indigo-400" />
                  <span>Informasi Kontak & Akademik</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950/30 border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Kelas:</span>
                    <span className="font-bold">{selectedStudent.className || '-'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/30 border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Jurusan:</span>
                    <span className="font-bold">{selectedStudent.department || '-'}</span>
                  </div>
                  <div className="sm:col-span-2 p-3 rounded-xl bg-slate-950/30 border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Telepon / WhatsApp Siswa:</span>
                    <span className="font-bold text-indigo-400">{selectedStudent.phone || '-'}</span>
                  </div>
                </div>
              </div>

              {/* DATA ORANG TUA / WALI */}
              <div className="space-y-3">
                <h4 className="font-bold uppercase tracking-wider text-slate-400 border-b border-inherit pb-2 flex items-center space-x-1.5">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>Data Orang Tua / Wali</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950/30 border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Nama Orang Tua:</span>
                    <span className="font-bold">{selectedStudent.parentName || '-'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/30 border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Hubungan:</span>
                    <span className="font-bold">{selectedStudent.parentRelation || '-'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/30 border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Telepon Ortu:</span>
                    <span className="font-bold text-emerald-400">{selectedStudent.parentPhone || '-'}</span>
                  </div>
                </div>
              </div>

              {/* BERKAS DOKUMEN CV & BPJS (DILENGKAPI LIVE PREVIEW) */}
              <div className="space-y-3">
                <h4 className="font-bold uppercase tracking-wider text-slate-400 border-b border-inherit pb-2 flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>Dokumen Persyaratan Siswa</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* CV CARD */}
                  <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-200">1. Curriculum Vitae (CV)</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedStudent.cvUrl ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {selectedStudent.cvUrl ? 'Ada Berkas' : 'Belum Ada'}
                      </span>
                    </div>

                    {selectedStudent.cvUrl ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActivePreviewUrl(selectedStudent.cvUrl);
                          setActivePreviewTitle(`Pratinjau CV - ${selectedStudent.name}`);
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Pratinjau Live CV</span>
                      </button>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic text-center py-1">Siswa belum mengunggah file CV.</p>
                    )}
                  </div>

                  {/* BPJS CARD */}
                  <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-200">2. Kartu BPJS TK</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedStudent.bpjsUrl ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {selectedStudent.bpjsUrl ? 'Ada Berkas' : 'Belum Ada'}
                      </span>
                    </div>

                    {selectedStudent.bpjsUrl ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActivePreviewUrl(selectedStudent.bpjsUrl);
                          setActivePreviewTitle(`Pratinjau Kartu BPJS - ${selectedStudent.name}`);
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Pratinjau Live BPJS</span>
                      </button>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic text-center py-1">Siswa belum mengunggah Kartu BPJS.</p>
                    )}
                  </div>

                </div>
              </div>

            </div>

            {/* FOOTER MODAL DETAIL */}
            <div className="p-4 border-t border-inherit flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                Tutup Detail
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: PRATINJAU DOKUMEN LIVE (CV / BPJS) */}
      {activePreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            
            <div className="p-5 border-b border-inherit flex justify-between items-center">
              <h3 className="font-bold text-sm text-indigo-400 flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>{activePreviewTitle}</span>
              </h3>
              <button
                type="button"
                onClick={() => setActivePreviewUrl(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-auto flex justify-center items-center bg-slate-950/60 min-h-[400px]">
              {activePreviewUrl.startsWith('data:application/pdf') || activePreviewUrl.endsWith('.pdf') ? (
                <iframe
                  src={activePreviewUrl}
                  className="w-full h-[550px] rounded-2xl border border-slate-800"
                  title="Document Live PDF Preview"
                />
              ) : (
                <img
                  src={activePreviewUrl}
                  alt="Document Live Preview"
                  className="max-w-full max-h-[550px] object-contain rounded-2xl border border-slate-800 shadow-lg"
                />
              )}
            </div>

            <div className="p-4 border-t border-inherit flex justify-end space-x-3">
              <a
                href={activePreviewUrl}
                download="dokumen_siswa_sierin"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Unduh Berkas</span>
              </a>
              <button
                type="button"
                onClick={() => setActivePreviewUrl(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: RESET PASSWORD AKUN SISWA */}
      {targetStudentForReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-6 border-b border-inherit flex justify-between items-center">
              <h3 className="font-bold text-base text-amber-400 flex items-center space-x-2">
                <KeyRound className="w-5 h-5" />
                <span>Reset Password Akun Siswa</span>
              </h3>
              <button
                type="button"
                onClick={() => setTargetStudentForReset(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-6 text-xs">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Target Siswa:</span>
                <h4 className="font-extrabold text-sm text-amber-200">{targetStudentForReset.name}</h4>
                <p className="text-[11px] text-slate-400 font-mono">NIS: {targetStudentForReset.nis} | Kelas: {targetStudentForReset.className}</p>
              </div>

              <div className="space-y-3">
                <label className="font-bold text-slate-400 uppercase">Opsi Password Baru:</label>

                <label className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950/40 flex items-center space-x-3 cursor-pointer hover:border-amber-500 transition-all">
                  <input
                    type="radio"
                    name="passOption"
                    checked={useDefaultNis}
                    onChange={() => setUseDefaultNis(true)}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-slate-200 block">Gunakan NIS (Default Standar)</span>
                    <span className="text-[10px] text-slate-400 font-mono">Password disetel ke: {targetStudentForReset.nis}</span>
                  </div>
                </label>

                <label className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950/40 flex items-center space-x-3 cursor-pointer hover:border-amber-500 transition-all">
                  <input
                    type="radio"
                    name="passOption"
                    checked={!useDefaultNis}
                    onChange={() => setUseDefaultNis(false)}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-slate-200 block">Gunakan Password Kustom</span>
                    <span className="text-[10px] text-slate-400">Ketik password manual baru untuk siswa ini.</span>
                  </div>
                </label>

                {!useDefaultNis && (
                  <input
                    type="text"
                    value={customPasswordInput}
                    onChange={(e) => setCustomPasswordInput(e.target.value)}
                    placeholder="Masukkan minimal 6 karakter password baru..."
                    required
                    minLength={6}
                    className={`w-full px-4 py-3 rounded-2xl border outline-none font-bold ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800 text-amber-300 focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-amber-600 focus:border-amber-500'
                    }`}
                  />
                )}
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setTargetStudentForReset(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all shadow-lg flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  <span>Reset Password Sekarang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}