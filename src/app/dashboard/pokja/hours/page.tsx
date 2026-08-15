// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Menambahkan fitur Ekspor CSV Data Alokasi Jam PKL Pembimbing per Kelas.
// ✨ Fitur Baru:
//    - Hours CSV Exporter Engine (Format kolom: kelas, guru pembimbing, nama guru pembimbing, jumlah jam asli di kelas itu).
//    - UTF-8 BOM Compatibility (\uFEFF) untuk Microsoft Excel & Google Sheets.
//    - Pre-checked Existing Teacher Allocation & Visual Indicator Pipeline.
// 🎨 UI/UX Update: Penambahan tombol "Ekspor CSV" berwarna Emerald berkontras tinggi di Header Banner.
// 🔧 Bug Fix: Menangani sanitasi karakter CSV dan penanganan data pembimbing kosong saat diekspor.
// 🚀 Inovasi: One-Click Hours Allocation CSV Generator for Pokja SI-ERIN.
// ----------------------------------------------------------------------

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { 
  Clock, Users, Trash2, ShieldCheck, AlertCircle, X, Calendar, Calculator, CheckCircle2, UserPlus, Check, UserCheck, AlertTriangle, Building2, User, Search, Download 
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

export default function PokjaTeacherHoursPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  const userRole = (session?.user as any)?.role;
  const userDepartment = (session?.user as any)?.department || 'Teknik Komputer dan Jaringan';

  const [allocations, setAllocations] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal Detail Kelas
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [classDetailData, setClassDetailData] = useState<{ periodInfo: any; coefficientInfo: any } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Sub-Modal Tambah Guru & Search State
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [teacherHoursMap, setTeacherHoursMap] = useState<{ [key: string]: string }>({});
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sub-Modal Assign Siswa ke Guru
  const [showAssignStudentModal, setShowAssignStudentModal] = useState(false);
  const [activeTeacherForAssign, setActiveTeacherForAssign] = useState<any>(null);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const loadData = useCallback(() => {
    setLoading(true);
    const timestamp = new Date().getTime();

    // 1. Ambil alokasi jam & master guru dari endpoint /api/pokja/teacher-hours
    fetch(`/api/pokja/teacher-hours?t=${timestamp}`)
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setAllocations(res.allocations || []);
          if (res.teachers && res.teachers.length > 0) {
            setTeachers(res.teachers);
          }
        }
      })
      .catch(() => {});

    // 2. Ambil master kelas
    fetch(`/api/admin/master?type=class&t=${timestamp}`)
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          const clsNames = (res.data || []).map((c: any) => c.name);
          setClassesList(clsNames);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    // 3. Ambil daftar guru / pembimbing secara inklusif
    fetch(`/api/admin/users?t=${timestamp}`)
      .then(res => res.json())
      .then(res => {
        const userList = res.data || res.users || [];
        if (userList.length > 0) {
          const filteredTeachers = userList.filter((u: any) => {
            const r = String(u.role || '').toUpperCase();
            return ['GURU', 'PEMBIMBING', 'TEACHER', 'GURUPMB', 'POKJA', 'ADMIN', 'SUPER_ADMIN'].includes(r);
          });
          if (filteredTeachers.length > 0) {
            setTeachers(filteredTeachers);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      loadData();
    }
  }, [status, loadData]);

  // ----------------------------------------------------------------------
  // 🌟 FUNGSI EKSPOR CSV ALOKASI JAM PKL POKJA
  // Format Kolom: kelas, guru pembimbing, nama guru pembimbing, jumlah jam asli di kelas itu
  // ----------------------------------------------------------------------
  const handleExportCSV = () => {
    if (!allocations || allocations.length === 0) {
      alert('Tidak ada data alokasi jam PKL untuk diekspor!');
      return;
    }

    // Header Kolom Wajib Sesuai Permintaan
    const headers = ['kelas', 'guru pembimbing', 'nama guru pembimbing', 'jumlah jam asli di kelas itu'];

    const rows = allocations.map((alloc) => {
      const className = alloc.className || '-';
      const guruPembimbingInfo = alloc.teacher?.username || alloc.teacherId || 'N/A';
      const namaGuruPembimbing = alloc.teacher?.name || 'Belum Di-assign';
      const jumlahJamAsli = alloc.totalHours ?? 0;

      return [
        className,
        guruPembimbingInfo,
        namaGuruPembimbing,
        jumlahJamAsli.toString()
      ];
    });

    // Sanitasi String CSV
    const csvContent = [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    // Menambahkan UTF-8 BOM (\uFEFF) untuk Kompatibilitas Excel
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const timeStamp = new Date().toISOString().slice(0, 10);
    const sanitizedDept = userDepartment.replace(/[^a-zA-Z0-9]/g, '_');

    link.href = url;
    link.setAttribute('download', `Alokasi_Jam_PKL_${sanitizedDept}_${timeStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccessMsg('Data alokasi jam PKL berhasil diekspor ke format CSV!');
  };

  const handleOpenClassModal = async (className: string) => {
    setSelectedClass(className);
    setLoadingDetail(true);
    setClassDetailData(null);
    setShowAddTeacherModal(false);
    setShowAssignStudentModal(false);
    setTeacherSearchQuery('');

    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/pokja/teacher-hours?className=${encodeURIComponent(className)}&t=${timestamp}`);
      const result = await res.json();
      if (result.success) {
        setClassDetailData({
          periodInfo: result.periodInfo,
          coefficientInfo: result.coefficientInfo
        });
        if (result.teachers && result.teachers.length > 0) {
          setTeachers(result.teachers);
        }

        // 🌟 OTOMATIS CENTANG GURU YANG SUDAH TER-ASSIGN DI KELAS INI
        const currentClassAllocations = (result.allocations || allocations).filter((a: any) => a.className === className);
        const preSelectedIds = currentClassAllocations.map((a: any) => a.teacherId);
        setSelectedTeacherIds(preSelectedIds);

        // Masukkan juga jam alokasi mereka ke state map
        const initialHoursMap: { [key: string]: string } = {};
        currentClassAllocations.forEach((a: any) => {
          initialHoursMap[a.teacherId] = String(a.totalHours || 20);
        });
        setTeacherHoursMap(initialHoursMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleToggleTeacherCheckbox = (teacherId: string) => {
    if (selectedTeacherIds.includes(teacherId)) {
      setSelectedTeacherIds(selectedTeacherIds.filter(id => id !== teacherId));
    } else {
      setSelectedTeacherIds([...selectedTeacherIds, teacherId]);
      if (!teacherHoursMap[teacherId]) {
        setTeacherHoursMap(prev => ({ ...prev, [teacherId]: '20' }));
      }
    }
  };

  const handleHourChange = (teacherId: string, hours: string) => {
    setTeacherHoursMap(prev => ({ ...prev, [teacherId]: hours }));
  };

  const handleSaveAssignedTeachers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || selectedTeacherIds.length === 0) {
      alert('Pilih minimal satu guru pembimbing.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const assignments = selectedTeacherIds.map(tId => ({
      teacherId: tId,
      totalHours: parseInt(teacherHoursMap[tId]) || 20
    }));

    try {
      const res = await fetch('/api/pokja/teacher-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          className: selectedClass,
          assignments,
          academicYear: '2026/2027'
        })
      });
      const result = await res.json();
      if (result.success) {
        setSuccessMsg('Alokasi guru pembimbing berhasil diperbarui.');
        setShowAddTeacherModal(false);
        loadData();
        handleOpenClassModal(selectedClass);
      } else {
        setErrorMsg(result.error || 'Gagal menyimpan');
      }
    } catch (err) {
      setErrorMsg('Gagal terhubung ke server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus alokasi guru ini dari kelas?')) return;
    try {
      const res = await fetch(`/api/pokja/teacher-hours?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        setSuccessMsg(result.message);
        loadData();
        if (selectedClass) handleOpenClassModal(selectedClass);
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert('Gagal menghapus data');
    }
  };

  const handleOpenAssignStudent = async (teacherAlloc: any) => {
    setActiveTeacherForAssign(teacherAlloc);
    setShowAssignStudentModal(true);
    setLoadingStudents(true);
    setClassStudents([]);

    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/admin/students?className=${encodeURIComponent(selectedClass || '')}&t=${timestamp}`);
      const result = await res.json();
      if (result.success || result.data) {
        const list = result.data || result.students || [];
        setClassStudents(list);
        const assignedIds = list.filter((s: any) => s.teacherId === teacherAlloc.teacherId).map((s: any) => s.id);
        setSelectedStudentIds(assignedIds);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleToggleStudentCheckbox = (studentId: string) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter(id => id !== studentId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  const handleSaveAssignedStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeacherForAssign) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/pokja/assign-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: activeTeacherForAssign.teacherId,
          studentIds: selectedStudentIds
        })
      });
      const result = await res.json();
      if (result.success) {
        setSuccessMsg('Siswa bimbingan berhasil di-assign ke guru.');
        setShowAssignStudentModal(false);
        loadData();
        handleOpenClassModal(selectedClass!);
      } else {
        alert(result.error || 'Gagal menyimpan siswa bimbingan');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan');
    } finally {
      setSubmitting(false);
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

  const allUniqueClasses = Array.from(new Set([...classesList, ...allocations.map(a => a.className)]));
  const coefficientVal = classDetailData?.coefficientInfo?.coefficient ? parseFloat(classDetailData.coefficientInfo.coefficient) : 1.0;

  // Filter guru berdasarkan search query
  const filteredTeachers = teachers.filter(t => {
    const query = teacherSearchQuery.toLowerCase();
    const nameMatch = t.name?.toLowerCase().includes(query);
    const roleMatch = t.role?.toLowerCase().includes(query);
    const deptMatch = t.department?.toLowerCase().includes(query);
    return nameMatch || roleMatch || deptMatch;
  });

  // Daftar ID guru yang sudah ter-assign di kelas saat ini
  const currentClassAllocatedTeacherIds = allocations
    .filter(a => a.className === selectedClass)
    .map(a => a.teacherId);

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Header Banner DENGAN TOMBOL EKSPOR CSV */}
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
            Klik card kelas di bawah untuk melihat periode prakerin, nilai koefisien, kalkulasi jam PKL aktual, rekomendasi siswa, serta meng-assign siswa bimbingan.
          </p>
        </div>

        {/* 🌟 TOMBOL EKSPOR CSV */}
        <div className="flex items-center space-x-3 shrink-0 relative z-10">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-5 py-3 rounded-2xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center space-x-2 shadow-lg shadow-emerald-600/30 cursor-pointer border border-emerald-500/30"
            title="Ekspor Rekap Alokasi Jam ke File CSV Excel"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
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
            <span>Pilih Rombongan Belajar (Kelas)</span>
          </h3>
          <span className="text-xs text-slate-400">{allUniqueClasses.length} Kelas Terdaftar</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-36 rounded-2xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
            ))}
          </div>
        ) : allUniqueClasses.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Clock className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
            <p className="text-sm font-semibold text-slate-400">Belum ada data kelas yang tersedia di sistem.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allUniqueClasses.map((clsName) => {
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
                    <p className="text-slate-400">Guru Pembimbing: <strong className="text-white">{classAllocations.length} Orang</strong></p>
                    <p className="text-slate-400">Total Alokasi Jam: <strong className="text-emerald-400">{totalHours} Jam</strong></p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/50 flex justify-between items-center text-xs font-bold text-emerald-400">
                    <span>Atur Guru & Kalkulasi PKL</span>
                    <span>→</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DETAIL KELAS & KALKULASI PKL */}
      {selectedClass && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            
            <div className="flex justify-between items-center border-b pb-4 border-inherit">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Mapping Kelas & Kalkulasi PKL</span>
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
                
                {/* 🌟 KARTU PERIODE & KOEFISIEN */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-2xl border space-y-1.5 ${theme === 'dark' ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                    <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      <span>Periode Prakerin Siswa</span>
                    </div>
                    <p className="text-base font-black">{classDetailData?.periodInfo?.name || 'Belum Terikat Periode'}</p>
                    <p className="text-[11px] opacity-80">
                      {classDetailData?.periodInfo?.startDate 
                        ? `${new Date(classDetailData.periodInfo.startDate).toLocaleDateString('id-ID')} s.d. ${new Date(classDetailData.periodInfo.endDate).toLocaleDateString('id-ID')}`
                        : 'Atur periode di Master Data'}
                    </p>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-1.5 ${theme === 'dark' ? 'bg-indigo-950/20 border-indigo-900/50 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-900'}`}>
                    <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
                      <Calculator className="w-4 h-4 text-indigo-500" />
                      <span>Nilai Koefisien PKL</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <p className="text-2xl font-black">{classDetailData?.coefficientInfo?.coefficient || '1.00'}</p>
                      <span className="text-[10px] font-semibold opacity-80">
                        {classDetailData?.coefficientInfo ? `Kelas: ${classDetailData.coefficientInfo.totalClasses} | Jam: ${classDetailData.coefficientInfo.hoursPerClass}` : 'Standard'}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-80">Koefisien pengali jam bimbingan PKL</p>
                  </div>
                </div>

                {/* DAFTAR GURU & KALKULASI JAM PKL AKTUAL */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Guru Pembimbing & Kalkulasi Jam PKL Aktif</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddTeacherModal(!showAddTeacherModal);
                        setTeacherSearchQuery('');
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{showAddTeacherModal ? 'Tutup Form' : 'Tambahkan Guru ke Kelas Ini'}</span>
                    </button>
                  </div>

                  {/* FORM CHECKBOX TAMBAH GURU & SEARCH BAR */}
                  {showAddTeacherModal && (
                    <div className={`p-5 rounded-2xl border space-y-4 animate-in fade-in duration-200 ${theme === 'dark' ? 'bg-slate-950 border-emerald-500/30' : 'bg-slate-50 border-emerald-300'}`}>
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-extrabold text-emerald-400 uppercase">Pilih Guru Pembimbing Dari Database</p>
                        <span className="text-[11px] text-slate-400">{filteredTeachers.length} dari {teachers.length} Guru Ditemukan</span>
                      </div>

                      {/* SEARCH BAR */}
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Search className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          value={teacherSearchQuery}
                          onChange={(e) => setTeacherSearchQuery(e.target.value)}
                          placeholder="Cari nama guru atau role..."
                          className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium border outline-none transition-all ${
                            theme === 'dark' 
                              ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500' 
                              : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600'
                          }`}
                        />
                        {teacherSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setTeacherSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {teachers.length === 0 ? (
                        <p className="text-xs text-amber-500 py-3 text-center">Tidak ada data guru/pembimbing ditemukan di database.</p>
                      ) : filteredTeachers.length === 0 ? (
                        <p className="text-xs text-slate-400 py-3 text-center italic">Tidak ada guru yang cocok dengan kata kunci "{teacherSearchQuery}".</p>
                      ) : (
                        <form onSubmit={handleSaveAssignedTeachers} className="space-y-3">
                          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                            {filteredTeachers.map((t: any) => {
                              const isChecked = selectedTeacherIds.includes(t.id);
                              const isAlreadyInClass = currentClassAllocatedTeacherIds.includes(t.id);

                              return (
                                <div key={t.id} className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                                  isChecked 
                                    ? 'bg-emerald-600/10 border-emerald-500/50' 
                                    : theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                                }`}>
                                  <label className="flex items-center space-x-3 cursor-pointer flex-1">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleTeacherCheckbox(t.id)}
                                      className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                                    />
                                    <div className="space-y-0.5">
                                      <span className="text-xs font-bold text-white">{t.name} <span className="opacity-60 uppercase text-[10px]">({t.role})</span></span>
                                      {isAlreadyInClass && (
                                        <p className="text-[10px] font-semibold text-emerald-400">✓ Sudah ada di kelas ini</p>
                                      )}
                                    </div>
                                  </label>

                                  {isChecked && (
                                    <div className="flex items-center space-x-2 shrink-0">
                                      <span className="text-[10px] text-slate-400">Jam Alokasi:</span>
                                      <input
                                        type="number"
                                        min="1"
                                        value={teacherHoursMap[t.id] || '20'}
                                        onChange={(e) => handleHourChange(t.id, e.target.value)}
                                        className={`w-16 p-1.5 rounded-lg border text-xs text-center font-bold outline-none ${theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'}`}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex justify-end space-x-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setShowAddTeacherModal(false)}
                              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-700 text-slate-300 cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="submit"
                              disabled={submitting || selectedTeacherIds.length === 0}
                              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer flex items-center space-x-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{submitting ? 'Menyimpan...' : `Simpan ${selectedTeacherIds.length} Guru Dipilih`}</span>
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {/* LIST GURU TERALOKASI + KALKULASI PKL AKTUAL & REKOMENDASI */}
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {allocations.filter(a => a.className === selectedClass).length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-4 text-center">Belum ada guru pembimbing yang ditugaskan ke kelas ini.</p>
                    ) : (
                      allocations.filter(a => a.className === selectedClass).map((alloc) => {
                        const assignedStudentsCount = classStudents ? classStudents.filter((s: any) => s.teacherId === alloc.teacherId).length : 0;
                        const actualPKLHours = Number((assignedStudentsCount * coefficientVal).toFixed(2));
                        const originalAllocatedHours = Number(alloc.totalHours || 0);
                        const isUnderallocated = actualPKLHours < originalAllocatedHours;
                        const recommendedStudentsCount = coefficientVal > 0 ? Math.ceil(originalAllocatedHours / coefficientVal) : originalAllocatedHours;

                        return (
                          <div key={alloc.id} className={`p-4 rounded-2xl border space-y-3 ${
                            theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <p className="font-extrabold text-sm text-white">{alloc.teacher?.name || 'Guru Pembimbing'}</p>
                                <p className="text-[11px] text-slate-400">Tahun Pelajaran: {alloc.academicYear} • <strong className="text-indigo-400">{assignedStudentsCount} Siswa Bimbingan</strong></p>
                              </div>
                              <div className="flex items-center space-x-2 shrink-0">
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Alokasi Asli: {originalAllocatedHours} Jam
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(alloc.id)}
                                  className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                                  title="Hapus Guru"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* KALKULASI & REKOMENDASI BOX */}
                            <div className={`p-3 rounded-xl border grid grid-cols-1 md:grid-cols-2 gap-3 text-xs ${
                              theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                            }`}>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400">Jam PKL Aktual (Siswa x Koefisien):</span>
                                <p className="font-black text-sm text-emerald-400 mt-0.5">
                                  {actualPKLHours} Jam <span className="text-[10px] font-normal text-slate-400">({assignedStudentsCount} × {coefficientVal})</span>
                                </p>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400">Rekomendasi Jumlah Siswa Ideal:</span>
                                <p className="font-black text-sm text-indigo-400 mt-0.5">
                                  ~{recommendedStudentsCount} Siswa <span className="text-[10px] font-normal text-slate-400">(Jam Asli ÷ Koefisien)</span>
                                </p>
                              </div>
                            </div>

                            {/* WARNING BANNER JIKA JAM PKL AKTUAL LEBIH SEDIKIT */}
                            {isUnderallocated && (
                              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-semibold flex items-center space-x-2">
                                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                                <span>Peringatan: Jam PKL aktual ({actualPKLHours} Jam) lebih sedikit dibanding jam alokasi asli ({originalAllocatedHours} Jam)! Tambah {Math.max(0, recommendedStudentsCount - assignedStudentsCount)} siswa lagi agar sesuai.</span>
                              </div>
                            )}

                            {/* TOMBOL ASSIGN SISWA KE GURU INI */}
                            <div className="pt-2 border-t border-slate-800/40 flex justify-between items-center">
                              <span className="text-[11px] text-slate-400">Atur daftar siswa bimbingan untuk guru ini</span>
                              <button
                                type="button"
                                onClick={() => handleOpenAssignStudent(alloc)}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Assign Siswa ke Guru Ini</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
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

      {/* MODAL CHECKBOX ASSIGN SISWA KE GURU DENGAN INFO INDUSTRI & PEMBIMBING */}
      {showAssignStudentModal && activeTeacherForAssign && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-lg border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex justify-between items-center border-b pb-4 border-inherit">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Assign Siswa Bimbingan</span>
                <h3 className="text-lg font-extrabold">{activeTeacherForAssign.teacher?.name}</h3>
              </div>
              <button onClick={() => setShowAssignStudentModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignedStudents} className="space-y-4">
              <p className="text-xs text-slate-400">Pilih siswa dari kelas <strong>{selectedClass}</strong> yang akan dibimbing oleh guru ini:</p>

              <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
                {loadingStudents ? (
                  <div className="text-center py-8 space-y-2 animate-pulse">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs text-slate-400">Memuat daftar siswa kelas {selectedClass}...</p>
                  </div>
                ) : classStudents.length === 0 ? (
                  <div className="text-center py-6 space-y-1">
                    <p className="text-xs text-amber-500 font-semibold">Tidak ada siswa terdaftar pada kelas {selectedClass}.</p>
                    <p className="text-[10px] text-slate-500">Pastikan data siswa di menu Siswa sudah diatur dengan nama kelas "{selectedClass}".</p>
                  </div>
                ) : (
                  classStudents.map((s: any) => {
                    const isChecked = selectedStudentIds.includes(s.id);
                    const industryName = s.placement?.industry?.name || null;
                    const assignedTeacherName = s.teacher?.name || null;
                    const isAssignedToOther = assignedTeacherName && s.teacherId !== activeTeacherForAssign.teacherId;

                    return (
                      <label key={s.id} className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-800 hover:border-indigo-500/50' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/50'
                      }`}>
                        <div className="flex items-center space-x-3 flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleStudentCheckbox(s.id)}
                            className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                          />
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-white">{s.name} <span className="text-[10px] text-slate-400 font-normal">({s.nis})</span></p>
                              
                              {/* BADGE INDUSTRI TEMPAT PKL */}
                              {industryName ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                  <Building2 className="w-3 h-3" />
                                  <span>{industryName}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                  <span>Belum Penempatan</span>
                                </span>
                              )}
                            </div>

                            {/* INFORMASI GURU PEMBIMBING */}
                            <div className="flex items-center space-x-1.5 text-[11px]">
                              <User className="w-3 h-3 text-slate-400" />
                              {assignedTeacherName ? (
                                <span className={isAssignedToOther ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                                  Pembimbing: {assignedTeacherName} {isAssignedToOther ? '(Guru Lain)' : '(Guru Ini)'}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">Belum ada pembimbing</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-inherit">
                <button
                  type="button"
                  onClick={() => setShowAssignStudentModal(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border ${theme === 'dark' ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-700'}`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Menyimpan...' : `Simpan ${selectedStudentIds.length} Siswa Bimbingan`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}