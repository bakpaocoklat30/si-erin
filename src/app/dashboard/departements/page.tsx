// 📋 CHANGELOG:
// ✅ Perubahan: Menyempurnakan binding tombol Lihat Detail (mata biru), Edit Data (pensil indigo), dan Keluarkan dari Kelas (user-minus merah) di tabel modal kelas.
// ✨ Fitur Baru: Tampilan profil lengkap 360° peserta didik, pratinjau dokumen BPJS, dan form edit data siswa interaktif.
// 🎨 UI/UX Update: Tombol aksi tabel terintegrasi penuh dengan transisi hover halus dan dukungan Dark/Light mode.
// 🔧 Bug Fix: Memastikan state modal aktif terbuka secara presisi saat tombol diklik oleh admin.
// 🚀 Inovasi: Enterprise Student 360° Profile Viewer & Class Management Controller.

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { 
  Layers, 
  BookOpen, 
  ArrowLeft, 
  ChevronRight, 
  Search, 
  X, 
  GraduationCap,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Eye,
  Edit3,
  FileText,
  ExternalLink,
  User,
  UserMinus
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

export default function AdminDepartmentsHierarchyPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  const [departments, setDepartments] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  
  // Modal Tambah Siswa Baru Manual
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [studentForm, setStudentForm] = useState({ name: '', nis: '', phone: '', address: '', nisn: '' });
  const [submittingStudent, setSubmittingStudent] = useState(false);

  // Modal Tambah dari Daftar Eksisting
  const [showExistingModal, setShowExistingModal] = useState(false);
  const [searchExisting, setSearchExisting] = useState('');

  // Modal Lihat Detail Siswa
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeStudentDetail, setActiveStudentDetail] = useState<any>(null);

  // Modal Edit Siswa
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ 
    id: '', 
    name: '', 
    nis: '', 
    phone: ''
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const loadHierarchyData = useCallback(() => {
    setLoading(true);
    setErrorMsg('');
    const timestamp = new Date().getTime();

    Promise.all([
      fetch(`/api/admin/master?type=class&t=${timestamp}`).then(res => res.json()),
      fetch(`/api/admin/master?type=department&t=${timestamp}`).then(res => res.json()),
      fetch(`/api/admin/users?t=${timestamp}`).then(res => res.json()).catch(() => ({ success: false, data: [] }))
    ])
      .then(([resClass, resDept, resStudents]) => {
        if (resDept.success && resClass.success) {
          const studentsData = resStudents.success && Array.isArray(resStudents.data) ? resStudents.data : [];
          setAllStudents(studentsData);

          const deptList = resDept.data.map((dept: any) => {
            const classesOfDept = resClass.data.filter(
              (cls: any) => cls.departmentId === dept.id || cls.department?.id === dept.id
            ).map((cls: any) => {
              const studentsInThisClass = studentsData.filter(
                (s: any) => s.role === 'SISWA' && s.className?.trim().toLowerCase() === cls.name.trim().toLowerCase()
              );
              const placedCount = studentsInThisClass.filter(
                (s: any) => s.placementStatus === 'DISETUJUI' || s.placementStatus === 'BERJALAN' || s.bpjsStatus === 'DISETUJUI'
              ).length;
              const totalCount = studentsInThisClass.length;
              const percentage = totalCount > 0 ? Math.round((placedCount / totalCount) * 100) : 0;

              return {
                ...cls,
                totalStudents: totalCount,
                placedStudents: placedCount,
                progressPercentage: percentage,
              };
            });

            const totalDeptStudents = classesOfDept.reduce((acc: number, c: any) => acc + c.totalStudents, 0);
            const totalDeptPlaced = classesOfDept.reduce((acc: number, c: any) => acc + c.placedStudents, 0);
            const deptPercentage = totalDeptStudents > 0 ? Math.round((totalDeptPlaced / totalDeptStudents) * 100) : 0;

            return {
              ...dept,
              classes: classesOfDept,
              totalStudents: totalDeptStudents,
              placedStudents: totalDeptPlaced,
              progressPercentage: deptPercentage,
            };
          });

          setDepartments(deptList);
        } else {
          setErrorMsg('Gagal memuat struktur data akademik.');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg('Gagal menghubungkan ke server.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      loadHierarchyData();
    }
  }, [status, loadHierarchyData]);

  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    setSubmittingStudent(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: studentForm.nis,
          name: studentForm.name,
          password: 'password123',
          role: 'SISWA',
          className: selectedClass.name,
          department: selectedDepartment?.name || '',
          phone: studentForm.phone,
        }),
      });
      const result = await res.json();

      if (result.success) {
        setSuccessMsg('Siswa berhasil ditambahkan ke kelas!');
        setShowAddStudentModal(false);
        setStudentForm({ name: '', nis: '', phone: '', address: '', nisn: '' });
        loadHierarchyData();
      } else {
        alert(result.error || 'Gagal menambahkan siswa');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan');
    } finally {
      setSubmittingStudent(false);
    }
  };

  const handleEditStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingEdit(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editForm.id,
          name: editForm.name,
          username: editForm.nis,
          phone: editForm.phone,
          className: selectedClass?.name || '',
        }),
      });
      const result = await res.json();

      if (result.success) {
        setSuccessMsg('Data profil siswa berhasil diperbarui!');
        setShowEditModal(false);
        loadHierarchyData();
      } else {
        alert(result.error || 'Gagal memperbarui data siswa');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan saat menyimpan perubahan');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleAssignExistingStudent = async (student: any) => {
    if (student.className && student.className.trim().toLowerCase() !== selectedClass.name.trim().toLowerCase()) {
      const confirmMove = window.confirm(
        `Siswa "${student.name}" sudah ada di kelas ${student.className}, apa kamu yakin memindahkan ke kelas ini (${selectedClass.name})?`
      );
      if (!confirmMove) return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: student.id,
          name: student.name,
          role: 'SISWA',
          className: selectedClass.name,
          department: selectedDepartment?.name || student.department,
        }),
      });
      const result = await res.json();

      if (result.success) {
        setSuccessMsg(`Siswa ${student.name} berhasil dimasukkan ke kelas ${selectedClass.name}!`);
        loadHierarchyData();
      } else {
        alert(result.error || 'Gagal memindahkan siswa');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan saat memindahkan siswa');
    }
  };

  const handleRemoveFromClass = async (studentId: string, studentName: string) => {
    if (!confirm(`Apakah Anda yakin ingin mengeluarkan "${studentName}" dari kelas ${selectedClass?.name}? (Akun siswa tidak akan dihapus dari sistem)`)) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: studentId,
          className: null,
        }),
      });
      const result = await res.json();

      if (result.success) {
        setSuccessMsg(`Siswa ${studentName} berhasil dikeluarkan dari kelas.`);
        loadHierarchyData();
      } else {
        alert(result.error || 'Gagal mengeluarkan siswa dari kelas');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-[70vh] flex items-center justify-center ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold">Memuat Hierarki Akademik...</span>
        </div>
      </div>
    );
  }

  const studentsInSelectedClass = selectedClass 
    ? allStudents.filter((s: any) => s.role === 'SISWA' && s.className?.trim().toLowerCase() === selectedClass.name.trim().toLowerCase())
    : [];

  const availableExistingStudents = allStudents.filter(
    (s: any) => s.role === 'SISWA' && (!s.className || s.className.trim().toLowerCase() !== selectedClass?.name?.trim().toLowerCase())
  );

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Header Banner */}
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
            <span>Monitoring Akademik & Progress PKL</span>
          </div>
          <h2 className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Eksplorasi <span className="text-indigo-600 dark:text-indigo-400">Jurusan & Kelas</span> 🏛️
          </h2>
          <p className={`text-sm max-w-2xl ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Kelola peserta didik, lihat detail profil lengkap, dokumen BPJS, status Prakerin, serta edit data secara real-time.
          </p>
        </div>

        <a
          href="/dashboard"
          className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-800 shadow-sm hover:bg-slate-50'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard</span>
        </a>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* BREADCRUMB */}
      <div className="flex items-center space-x-2 text-xs font-bold text-slate-400">
        <span 
          onClick={() => { setSelectedDepartment(null); setSelectedClass(null); }}
          className="hover:text-indigo-500 cursor-pointer transition-colors"
        >
          Semua Jurusan
        </span>
        {selectedDepartment && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span 
              onClick={() => setSelectedClass(null)}
              className={`cursor-pointer transition-colors ${!selectedClass ? 'text-indigo-500' : 'hover:text-indigo-500'}`}
            >
              {selectedDepartment.name}
            </span>
          </>
        )}
        {selectedClass && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-indigo-500">{selectedClass.name}</span>
          </>
        )}
      </div>

      {/* LEVEL 1: GRID JURUSAN */}
      {!selectedDepartment ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <div
              key={dept.id}
              onClick={() => setSelectedDepartment(dept)}
              className={`border rounded-3xl p-6 shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1 relative overflow-hidden ${
                theme === 'dark' 
                  ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/50' 
                  : 'bg-white border-slate-200 hover:border-indigo-500/50 hover:shadow-2xl'
              }`}
            >
              <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl group-hover:bg-indigo-600/20 transition-all"></div>
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {dept.code}
                </span>
              </div>

              <div className="space-y-1 relative z-10 mb-4">
                <h3 className={`text-lg font-bold group-hover:text-indigo-500 transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {dept.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {dept.classes?.length || 0} Kelas • {dept.totalStudents || 0} Total Peserta Didik
                </p>
              </div>

              <div className="space-y-1.5 pt-3 border-t border-inherit relative z-10">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Progress Penempatan</span>
                  </span>
                  <span className="text-indigo-500 font-mono font-bold">{dept.progressPercentage || 0}%</span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${dept.progressPercentage || 0}%` }}
                  ></div>
                </div>
              </div>

              <div className={`mt-5 pt-3 border-t flex items-center justify-between text-xs font-bold text-indigo-500 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                <span>Lihat Daftar Kelas</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        // LEVEL 2: DAFTAR KELAS DALAM JURUSAN
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-xl font-extrabold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Daftar Kelas: {selectedDepartment.name}
              </h3>
              <p className="text-xs text-slate-400">Pilih kelas di bawah untuk melihat rincian peserta didik dan status Prakerin.</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDepartment(null)}
              className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 shadow-sm'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Jurusan</span>
            </button>
          </div>

          {selectedDepartment.classes?.length === 0 ? (
            <div className={`border rounded-3xl p-12 text-center space-y-3 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'}`}>
              <Layers className="w-12 h-12 text-slate-500 mx-auto opacity-50" />
              <p className="text-sm font-semibold text-slate-400">Belum ada kelas yang terdaftar pada jurusan ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {selectedDepartment.classes.map((cls: any) => (
                <div
                  key={cls.id}
                  onClick={() => setSelectedClass(cls)}
                  className={`border rounded-2xl p-5 shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-1 space-y-4 ${
                    theme === 'dark'
                      ? 'bg-slate-900 border-slate-800 hover:border-indigo-500'
                      : 'bg-white border-slate-200 hover:border-indigo-500 hover:shadow-xl'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <Layers className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {cls.totalStudents || 0} Siswa
                    </span>
                  </div>

                  <div>
                    <h4 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {cls.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Ditempatkan: {cls.placedStudents || 0} siswa</p>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-inherit">
                    <div className="flex justify-between items-center text-[10px] font-semibold">
                      <span className="text-slate-400">Progres PKL</span>
                      <span className="text-emerald-500 font-mono font-bold">{cls.progressPercentage || 0}%</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${cls.progressPercentage || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LEVEL 3: MODAL DETAIL KELAS */}
      {selectedClass && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-5xl border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[85vh] flex flex-col relative z-[10000000] ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b pb-4 border-inherit shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Manajemen Peserta Didik Kelas</span>
                <h3 className="text-xl font-extrabold">{selectedClass.name}</h3>
              </div>
              <div className="flex items-center space-x-3 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowExistingModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md shadow-emerald-600/30 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Ambil dari Daftar Siswa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Tambah Baru</span>
                </button>
                <button 
                  onClick={() => setSelectedClass(null)} 
                  className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/40 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search Filter */}
            <div className={`flex items-center px-4 py-2.5 border rounded-xl shrink-0 ${
              theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}>
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                placeholder="Cari nama atau NIS siswa di kelas ini..."
                className="w-full bg-transparent text-xs outline-none"
              />
            </div>

            {/* Content List Siswa */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {studentsInSelectedClass.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <GraduationCap className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
                  <p className="text-sm font-semibold text-slate-400">Belum ada data siswa yang terdaftar di kelas ini.</p>
                  <p className="text-xs text-slate-500">Gunakan tombol "Ambil dari Daftar Siswa" atau "Tambah Baru" di atas.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className={`border-b text-xs uppercase tracking-wider ${theme === 'dark' ? 'border-slate-800 text-slate-400 bg-slate-950/50' : 'border-slate-200 text-slate-500 bg-slate-50'}`}>
                      <tr>
                        <th className="p-3">No</th>
                        <th className="p-3">Nama Siswa</th>
                        <th className="p-3">NIS / Username</th>
                        <th className="p-3">No. Telepon</th>
                        <th className="p-3">Status PKL</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30 text-xs">
                      {studentsInSelectedClass
                        .filter((s: any) => s.name?.toLowerCase().includes(searchStudent.toLowerCase()) || s.nis?.includes(searchStudent))
                        .map((student: any, idx: number) => (
                          <tr key={student.id || idx} className={`transition-colors ${theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                            <td className="p-3 font-medium text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-bold">{student.name}</td>
                            <td className="p-3 font-mono text-indigo-400">{student.nis || student.username || '-'}</td>
                            <td className="p-3">{student.phone || '-'}</td>
                            <td className="p-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                student.placementStatus === 'DISETUJUI' || student.bpjsStatus === 'DISETUJUI' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              }`}>
                                {student.placementStatus || student.bpjsStatus || 'BELUM PENEMPATAN'}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                              {/* Tombol Lihat Detail (Icon Mata Biru) */}
                              <button
                                type="button"
                                onClick={() => { setActiveStudentDetail(student); setShowDetailModal(true); }}
                                className="p-1.5 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all cursor-pointer inline-flex items-center shadow-sm"
                                title="Lihat Detail Profil & Dokumen BPJS"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {/* Tombol Edit Data (Icon Pensil Indigo) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditForm({
                                    id: student.id,
                                    name: student.name || '',
                                    nis: student.username || student.nis || '',
                                    phone: student.phone || ''
                                  });
                                  setShowEditModal(true);
                                }}
                                className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all cursor-pointer inline-flex items-center shadow-sm"
                                title="Edit Data Siswa"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              {/* Tombol Keluarkan dari Kelas (Icon UserMinus Merah) */}
                              <button
                                type="button"
                                onClick={() => handleRemoveFromClass(student.id, student.name)}
                                className="p-1.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer inline-flex items-center shadow-sm"
                                title="Keluarkan dari Kelas Ini"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-4 border-t border-inherit shrink-0">
              <button
                type="button"
                onClick={() => setSelectedClass(null)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                Tutup Jendela
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 360° DETAIL SISWA & DOKUMEN BPJS */}
      {showDetailModal && activeStudentDetail && (
        <div className="fixed inset-0 z-[999999999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-xl border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] flex flex-col ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center border-b pb-4 border-inherit shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Detail Profil Lengkap Siswa</h3>
                  <p className="text-[10px] text-slate-400">Informasi akademik, status PKL, & dokumen BPJS</p>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-slate-400 font-medium">Nama Lengkap</p>
                  <p className="font-bold text-sm mt-0.5">{activeStudentDetail.name}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">NIS / Username</p>
                  <p className="font-mono font-bold text-sm mt-0.5 text-indigo-400">{activeStudentDetail.username || activeStudentDetail.nis || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-slate-400 font-medium">Kelas / Rombel</p>
                  <p className="font-bold mt-0.5">{activeStudentDetail.className || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Program Keahlian</p>
                  <p className="font-bold mt-0.5">{activeStudentDetail.department || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-slate-400 font-medium">Nomor Telepon Siswa</p>
                  <p className="font-bold mt-0.5">{activeStudentDetail.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Status Penempatan PKL</p>
                  <p className="font-bold mt-0.5 text-emerald-500 uppercase">{activeStudentDetail.placementStatus || 'Belum Penempatan'}</p>
                </div>
              </div>

              {/* Dokumen BPJS Section */}
              <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold flex items-center space-x-2 text-indigo-500">
                    <FileText className="w-4 h-4" />
                    <span>Dokumen BPJS Ketenagakerjaan</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    activeStudentDetail.bpjsStatus === 'DISETUJUI' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {activeStudentDetail.bpjsStatus || 'BELUM_UPLOAD'}
                  </span>
                </div>
                {activeStudentDetail.bpjsUrl ? (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] text-slate-400 truncate max-w-[240px]">{activeStudentDetail.bpjsUrl}</span>
                    <a
                      href={activeStudentDetail.bpjsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold inline-flex items-center space-x-1 transition-all"
                    >
                      <span>Lihat Dokumen</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">Siswa belum mengunggah dokumen BPJS.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-inherit shrink-0">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT KOMPREHENSIF SISWA */}
      {showEditModal && (
        <div className="fixed inset-0 z-[999999999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-lg border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] flex flex-col ${
            theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center border-b pb-4 border-inherit shrink-0">
              <div>
                <h3 className="text-base font-bold">Edit Profil Peserta Didik</h3>
                <p className="text-xs text-slate-400">Perbarui identitas akademik siswa secara langsung</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditStudentSubmit} className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">NIS / Username</label>
                  <input
                    type="text"
                    required
                    value={editForm.nis}
                    onChange={(e) => setEditForm({ ...editForm, nis: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">No. Telepon Siswa</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-inherit shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className={`px-4 py-2.5 rounded-xl font-semibold border cursor-pointer ${
                    theme === 'dark' ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  {submittingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL: AMBIL DARI DAFTAR SISWA EKSISTING */}
      {showExistingModal && (
        <div className="fixed inset-0 z-[99999999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-2xl border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[80vh] flex flex-col ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center border-b pb-4 border-inherit shrink-0">
              <div>
                <h3 className="text-base font-bold">Pilih Siswa dari Daftar Terdaftar</h3>
                <p className="text-xs text-slate-400">Memasukkan siswa ke kelas {selectedClass?.name}</p>
              </div>
              <button onClick={() => setShowExistingModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`flex items-center px-4 py-2 border rounded-xl shrink-0 ${
              theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}>
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                value={searchExisting}
                onChange={(e) => setSearchExisting(e.target.value)}
                placeholder="Cari nama atau NIS siswa..."
                className="w-full bg-transparent text-xs outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {availableExistingStudents.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">Semua siswa sudah terdaftar di kelas ini.</p>
              ) : (
                <div className="space-y-2">
                  {availableExistingStudents
                    .filter((s: any) => s.name?.toLowerCase().includes(searchExisting.toLowerCase()) || s.nis?.includes(searchExisting))
                    .map((student: any) => (
                      <div key={student.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        theme === 'dark' ? 'bg-slate-950/50 border-slate-800 hover:border-indigo-500' : 'bg-slate-50 border-slate-200 hover:border-indigo-500'
                      }`}>
                        <div>
                          <p className="text-xs font-bold">{student.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">NIS: {student.nis || student.username} {student.className ? `• Kelas Saat Ini: ${student.className}` : '• Belum ada kelas'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAssignExistingStudent(student)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-md cursor-pointer"
                        >
                          Masukkan ke Kelas
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-inherit shrink-0">
              <button
                type="button"
                onClick={() => setShowExistingModal(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                  theme === 'dark' ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Selesai / Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: TAMBAH SISWA BARU MANUAL */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-[99999999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-md border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 ${
            theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center border-b pb-4 border-inherit">
              <h3 className="text-base font-bold">Tambah Siswa Baru ke {selectedClass?.name}</h3>
              <button onClick={() => setShowAddStudentModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  required
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">NIS / Username</label>
                <input
                  type="text"
                  required
                  value={studentForm.nis}
                  onChange={(e) => setStudentForm({ ...studentForm, nis: e.target.value })}
                  placeholder="Contoh: 2026001"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Nomor Telepon</label>
                <input
                  type="text"
                  value={studentForm.phone}
                  onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                  placeholder="08123456789"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-inherit">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className={`px-4 py-2 rounded-xl font-semibold border cursor-pointer ${
                    theme === 'dark' ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingStudent}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  {submittingStudent ? 'Menyimpan...' : 'Simpan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}