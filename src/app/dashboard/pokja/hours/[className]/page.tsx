'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, Users, Calendar, Calculator, UserPlus, Trash2, UserCheck, 
  AlertTriangle, Building2, User, Search, Check, AlertCircle, CheckCircle2, Clock,
  Edit3, X
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function PokjaClassHoursDetailPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const params = useParams();
  const router = useRouter();

  // Decode nama kelas dari URL params
  const rawClassName = params?.className ? decodeURIComponent(params.className as string) : '';

  const [allocations, setAllocations] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classDetailData, setClassDetailData] = useState<{ periodInfo: any; coefficientInfo: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Tambah Guru & State
  const [showAddTeacherSection, setShowAddTeacherSection] = useState(false);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [teacherHoursMap, setTeacherHoursMap] = useState<{ [key: string]: string }>({});
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Alokasi Jam Guru State
  const [editingAlloc, setEditingAlloc] = useState<any>(null);
  const [editHoursInput, setEditHoursInput] = useState<string>('');
  const [editTeacherId, setEditTeacherId] = useState<string>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Bagian Assign Siswa ke Guru
  const [activeTeacherForAssign, setActiveTeacherForAssign] = useState<any>(null);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // State tahapan pemuatan data
  const [loadingStep, setLoadingStep] = useState<string>('Memulai sinkronisasi data...');

  // Muat semua data kelas (alokasi, guru, dan siswa) secara menyeluruh dalam satu request cepat
  const loadAllData = useCallback(async () => {
    if (!rawClassName) return;
    setLoading(true);
    setLoadingStudents(true);
    setErrorMsg('');
    try {
      const timestamp = new Date().getTime();
      setLoadingStep('Mengambil data alokasi jam & siswa kelas ' + rawClassName + '...');

      // 1. Ambil data alokasi jam kelas, guru, dan siswa sekaligus dari /api/pokja/teacher-hours
      const res = await fetch(`/api/pokja/teacher-hours?className=${encodeURIComponent(rawClassName)}&t=${timestamp}`);
      const hoursResult = await res.json();

      if (res.ok && hoursResult.success) {
        // Siswa langsung didapat dari payload terpadu
        let studentList = hoursResult.classStudents || [];

        // Fallback hanya jika classStudents kosong di server
        if (studentList.length === 0) {
          try {
            const fallbackRes = await fetch(`/api/admin/students?className=${encodeURIComponent(rawClassName.trim())}&t=${timestamp}`);
            const fallbackResult = await fallbackRes.json();
            if (fallbackRes.ok && (fallbackResult.success || fallbackResult.data || fallbackResult.students)) {
              studentList = fallbackResult.data || fallbackResult.students || [];
            }
          } catch (e) {
            console.error('Fallback students error:', e);
          }
        }

        setClassStudents(studentList);
        setAllocations(hoursResult.allocations || []);
        setClassDetailData({
          periodInfo: hoursResult.periodInfo,
          coefficientInfo: hoursResult.coefficientInfo
        });

        if (hoursResult.teachers && hoursResult.teachers.length > 0) {
          setTeachers(hoursResult.teachers);
        }

        // Pre-check guru yang sudah ter-assign di kelas ini
        const currentClassAllocations = (hoursResult.allocations || []).filter((a: any) => a.className === rawClassName);
        const preSelectedIds = currentClassAllocations.map((a: any) => a.teacherId);
        setSelectedTeacherIds(preSelectedIds);

        const initialHoursMap: { [key: string]: string } = {};
        currentClassAllocations.forEach((a: any) => {
          initialHoursMap[a.teacherId] = String(a.totalHours || 20);
        });
        setTeacherHoursMap(initialHoursMap);
      } else {
        setErrorMsg(hoursResult?.error || 'Gagal memuat data alokasi kelas');
      }
    } catch (e: any) {
      setErrorMsg('Terjadi kesalahan jaringan saat memuat data');
    } finally {
      setLoading(false);
      setLoadingStudents(false);
    }
  }, [rawClassName]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadAllData();
    }
  }, [status, loadAllData]);

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
    if (!rawClassName || selectedTeacherIds.length === 0) {
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
          className: rawClassName,
          assignments,
          academicYear: '2026/2027'
        })
      });
      const result = await res.json();
      if (result.success) {
        setSuccessMsg('Alokasi guru pembimbing berhasil diperbarui.');
        setShowAddTeacherSection(false);
        loadAllData();
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
        loadAllData();
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert('Gagal menghapus data');
    }
  };

  const handleOpenEditModal = (alloc: any) => {
    setEditingAlloc(alloc);
    setEditHoursInput(String(alloc.totalHours || 0));
    setEditTeacherId(alloc.teacherId);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingAlloc(null);
    setEditHoursInput('');
    setEditTeacherId('');
  };

  const handleSaveEditAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlloc) return;

    const parsedHours = parseInt(editHoursInput);
    if (isNaN(parsedHours) || parsedHours <= 0) {
      alert('Jumlah jam alokasi harus berupa angka lebih dari 0.');
      return;
    }

    setIsSubmittingEdit(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/pokja/teacher-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAlloc.id,
          totalHours: parsedHours,
          teacherId: editTeacherId || editingAlloc.teacherId,
          academicYear: editingAlloc.academicYear || '2026/2027'
        })
      });

      const result = await res.json();
      if (result.success) {
        setSuccessMsg(`Berhasil memperbarui alokasi jam untuk ${result.allocation?.teacher?.name || 'guru'}.`);
        handleCloseEditModal();
        loadAllData();
      } else {
        alert(result.error || 'Gagal memperbarui alokasi jam');
      }
    } catch (err: any) {
      alert('Terjadi kesalahan jaringan saat memperbarui alokasi');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleSelectTeacherForAssign = (teacherAlloc: any) => {
    setActiveTeacherForAssign(teacherAlloc);
    const assignedIds = classStudents
      .filter((s: any) => s.teacherId === teacherAlloc.teacherId)
      .map((s: any) => s.id);
    setSelectedStudentIds(assignedIds);
    setStudentSearchQuery('');
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
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/pokja/assign-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: activeTeacherForAssign.teacherId,
          className: activeTeacherForAssign.className,
          studentIds: selectedStudentIds
        })
      });
      const result = await res.json();
      if (result.success) {
        setSuccessMsg(`Berhasil menugaskan ${selectedStudentIds.length} siswa ke ${activeTeacherForAssign.teacher?.name || 'Guru'}.`);
        setActiveTeacherForAssign(null);
        loadAllData();
      } else {
        setErrorMsg(result.error || 'Gagal menyimpan siswa bimbingan');
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan jaringan saat menyimpan siswa bimbingan');
    } finally {
      setSubmitting(false);
    }
  };

  const coefficientVal = classDetailData?.coefficientInfo?.coefficient ? parseFloat(classDetailData.coefficientInfo.coefficient) : 1.0;
  const targetHours = classDetailData?.coefficientInfo?.hoursPerClass ? Number(classDetailData.coefficientInfo.hoursPerClass) : null;

  const currentClassAllocations = allocations.filter(a => a.className === rawClassName);
  const currentClassAllocatedTeacherIds = currentClassAllocations.map(a => a.teacherId);
  const totalAllocatedHours = currentClassAllocations.reduce((sum, a) => sum + Number(a.totalHours || 0), 0);
  const hoursDiff = targetHours !== null ? targetHours - totalAllocatedHours : null;

  const totalActualPKLHours = Number(
    currentClassAllocations.reduce((sum, a) => {
      const studentCount = classStudents.filter((s: any) => s.teacherId === a.teacherId).length;
      return sum + (studentCount * coefficientVal);
    }, 0).toFixed(2)
  );

  const pendingSelectedNewHours = selectedTeacherIds.reduce((sum, id) => {
    return sum + (parseInt(teacherHoursMap[id]) || 20);
  }, 0);

  // Filter guru pencarian
  const filteredTeachers = teachers.filter(t => {
    const query = teacherSearchQuery.toLowerCase();
    const nameMatch = t.name?.toLowerCase().includes(query);
    const roleMatch = t.role?.toLowerCase().includes(query);
    const deptMatch = t.department?.toLowerCase().includes(query);
    return nameMatch || roleMatch || deptMatch;
  });

  // Filter siswa pencarian
  const filteredStudents = classStudents.filter((s: any) => {
    if (!studentSearchQuery) return true;
    const q = studentSearchQuery.toLowerCase();
    const nameMatch = s.name?.toLowerCase().includes(q);
    const nisMatch = s.nis?.toLowerCase().includes(q);
    const indMatch = s.placement?.industry?.name?.toLowerCase().includes(q);
    return nameMatch || nisMatch || indMatch;
  });

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center space-y-4 px-4 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="relative flex items-center justify-center">
          <div className="w-14 h-14 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <Users className="w-6 h-6 text-emerald-500 absolute animate-pulse" />
        </div>
        <div className="text-center space-y-1.5 max-w-sm">
          <h3 className="text-base font-bold text-slate-100">Memuat Data Kelas {rawClassName}...</h3>
          <p className="text-xs text-slate-400 font-medium">
            {loadingStep || 'Sinkronisasi alokasi jam, guru pembimbing, dan daftar siswa...'}
          </p>
          <div className="pt-2 flex items-center justify-center space-x-2 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Menyiapkan seluruh data sebelum menampilkan halaman...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Tombol Kembali & Header */}
      <div className="space-y-4">
        <Link 
          href="/dashboard/pokja/hours" 
          className="inline-flex items-center text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali ke Ringkasan Alokasi Jam PKL</span>
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-500">Manajemen Alokasi Guru & Pembimbing Siswa</span>
            <h1 className="text-3xl font-extrabold flex items-center gap-3">
              <Users className="w-8 h-8 text-emerald-500" />
              <span>Kelas {rawClassName}</span>
            </h1>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowAddTeacherSection(!showAddTeacherSection);
              setTeacherSearchQuery('');
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{showAddTeacherSection ? 'Tutup Form Plot Guru' : 'Plot Guru Pembimbing ke Kelas'}</span>
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

      {/* KARTU INFORMASI PERIODE, KOEFISIEN, & TOTAL JAM KELAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded-3xl border shadow-md space-y-2 relative overflow-hidden flex flex-col justify-between ${theme === 'dark' ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Periode Prakerin Siswa</span>
            </div>
            <p className="text-xl font-black">{classDetailData?.periodInfo?.name || 'Belum Terikat Periode'}</p>
            <p className="text-xs opacity-80">
              {classDetailData?.periodInfo?.startDate 
                ? `${new Date(classDetailData.periodInfo.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} s.d. ${new Date(classDetailData.periodInfo.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : 'Atur periode di menu Master Data'}
            </p>
          </div>
          <div className="pt-3 border-t border-inherit flex justify-between items-center text-xs opacity-90">
            <span>Tahun Ajaran:</span>
            <span className="font-bold">{classDetailData?.periodInfo?.academicYear?.year || '2026/2027'}</span>
          </div>
        </div>

        <div className={`p-6 rounded-3xl border shadow-md space-y-2 relative overflow-hidden flex flex-col justify-between ${theme === 'dark' ? 'bg-indigo-950/20 border-indigo-900/50 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-900'}`}>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
              <Calculator className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Nilai Koefisien PKL</span>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-black">{classDetailData?.coefficientInfo?.coefficient || '1.00'}</p>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                {classDetailData?.coefficientInfo ? `Target: ${classDetailData.coefficientInfo.hoursPerClass || 46} Jam` : 'Standard'}
              </span>
            </div>
            <p className="text-xs opacity-80">Koefisien pengali jam bimbingan PKL aktual per siswa</p>
          </div>
          <div className="pt-3 border-t border-inherit flex justify-between items-center text-xs opacity-90">
            <span>Total Siswa PKL:</span>
            <span className="font-bold">{classDetailData?.coefficientInfo?.totalStudents || classStudents.length} Siswa</span>
          </div>
        </div>

        {/* KARTU TOTAL JAM TERINPUT DI KELAS INI */}
        <div className={`p-6 rounded-3xl border shadow-md space-y-3 relative overflow-hidden flex flex-col justify-between ${
          hoursDiff !== null && hoursDiff > 0
            ? theme === 'dark' ? 'bg-amber-950/25 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
            : hoursDiff === 0
            ? theme === 'dark' ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-200' : 'bg-emerald-50 border-emerald-300 text-emerald-900'
            : theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
                <Clock className={`w-4 h-4 shrink-0 ${hoursDiff !== null && hoursDiff > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
                <span>Total Jam Terinput Kelas</span>
              </div>
              {hoursDiff !== null && (
                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  hoursDiff === 0 
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : hoursDiff > 0
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse'
                    : 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30'
                }`}>
                  {hoursDiff === 0 ? '✓ Target Terpenuhi' : hoursDiff > 0 ? `Kurang ${hoursDiff} Jam` : `+${Math.abs(hoursDiff)} Jam`}
                </span>
              )}
            </div>

            <div className="flex items-baseline space-x-2">
              <p className="text-3xl font-black tracking-tight">{totalAllocatedHours}</p>
              <span className="text-sm font-bold opacity-70">/ {targetHours ? `${targetHours} Jam Target` : 'Jam'}</span>
            </div>

            {/* Progress bar visual */}
            {targetHours && (
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                <div 
                  className={`h-full transition-all duration-500 ${
                    hoursDiff === 0 ? 'bg-emerald-500' : hoursDiff > 0 ? 'bg-amber-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.round((totalAllocatedHours / targetHours) * 100))}%` }}
                />
              </div>
            )}
            
            <p className="text-xs opacity-80 pt-0.5">
              {currentClassAllocations.length} Guru Pembimbing Terplot • {classStudents.length} Siswa Terdaftar
            </p>
          </div>

          <div className="pt-3 border-t border-inherit flex justify-between items-center text-xs opacity-90">
            <span>Total Jam PKL Aktual:</span>
            <span className="font-black text-emerald-500">{totalActualPKLHours} Jam</span>
          </div>
        </div>
      </div>

      {/* BANNER PERINGATAN / STATUS KUOTA JAM KELAS */}
      {targetHours !== null && (
        <>
          {hoursDiff > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-600 dark:text-amber-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5 animate-in fade-in">
              <div className="flex items-start sm:items-center space-x-3.5">
                <div className="p-2.5 rounded-xl bg-amber-500/20 shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-black">
                    Perhatian: Masih Ada Guru yang Belum Terplot / Jam Alokasi Kurang!
                  </h4>
                  <p className="text-xs opacity-90 leading-relaxed">
                    Total jam yang telah diinput untuk kelas <strong>{rawClassName}</strong> saat ini baru <strong>{totalAllocatedHours} Jam</strong> dari target kurikulum <strong>{targetHours} Jam</strong> (Kurang <strong>{hoursDiff} Jam</strong>). Mohon periksa kembali daftar guru pembimbing agar tidak ada guru yang terlewat.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddTeacherSection(true);
                  window.scrollTo({ top: 380, behavior: 'smooth' });
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shrink-0 cursor-pointer shadow-md flex items-center space-x-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Plot Guru Terlewat</span>
              </button>
            </div>
          )}

          {hoursDiff === 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center space-x-3.5 shadow-sm animate-in fade-in">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-black">
                  Alokasi Jam Kelas Sempurna & Sesuai Target ({totalAllocatedHours} / {targetHours} Jam)
                </h4>
                <p className="text-xs opacity-90">
                  Seluruh target alokasi jam untuk kelas <strong>{rawClassName}</strong> telah lengkap terpenuhi oleh <strong>{currentClassAllocations.length} guru pembimbing</strong> tanpa ada guru yang terlewat.
                </p>
              </div>
            </div>
          )}

          {hoursDiff < 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center space-x-3.5 shadow-sm animate-in fade-in">
              <div className="p-2.5 rounded-xl bg-purple-500/20 shrink-0">
                <AlertCircle className="w-6 h-6 text-purple-500" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-black">
                  Total Alokasi Melebihi Target Kelas ({totalAllocatedHours} / {targetHours} Jam)
                </h4>
                <p className="text-xs opacity-90">
                  Total alokasi jam terinput melebihi target kelas sebanyak <strong>+{Math.abs(hoursDiff)} Jam</strong>. Pastikan pembagian jam pada masing-masing guru pembimbing sudah sesuai.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* SECTION PLOT GURU PEMBIMBING KE KELAS INI */}
      {showAddTeacherSection && (
        <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${theme === 'dark' ? 'bg-slate-900 border-emerald-500/40' : 'bg-white border-emerald-300'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-4 border-inherit">
            <div>
              <h3 className="text-lg font-bold text-emerald-500 uppercase tracking-wide">Pilih Guru Pembimbing dari Database</h3>
              <p className="text-xs text-slate-400">Centang guru dan sesuaikan jam alokasi asli untuk kelas {rawClassName}</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
              {filteredTeachers.length} dari {teachers.length} Guru Ditemukan
            </span>
          </div>

          {/* SEARCH GURU */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={teacherSearchQuery}
              onChange={(e) => setTeacherSearchQuery(e.target.value)}
              placeholder="Cari nama guru, NIP, atau role..."
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm font-medium border outline-none transition-all ${
                theme === 'dark' 
                  ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-600'
              }`}
            />
          </div>

          <form onSubmit={handleSaveAssignedTeachers} className="space-y-4">
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {filteredTeachers.map((t: any) => {
                const isChecked = selectedTeacherIds.includes(t.id);
                const isAlreadyInClass = currentClassAllocatedTeacherIds.includes(t.id);

                return (
                  <div key={t.id} className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                    isChecked 
                      ? 'bg-emerald-600/10 border-emerald-500/50' 
                      : theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <label className="flex items-center space-x-3 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleTeacherCheckbox(t.id)}
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                      />
                      <div className="space-y-0.5">
                        <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.name} <span className="opacity-60 uppercase text-xs">({t.role})</span></span>
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <span className="text-[11px] font-semibold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded">
                            {t._count?.supervisedStudents ?? 0} Total Siswa Terplot
                          </span>
                          {isAlreadyInClass && (
                            <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                              ✓ Ditugaskan di kelas ini
                            </span>
                          )}
                        </div>
                      </div>
                    </label>

                    {isChecked && (
                      <div className="flex items-center space-x-2 pl-7 sm:pl-0">
                        <span className="text-xs text-slate-400">Jam Alokasi Asli:</span>
                        <input
                          type="number"
                          min="1"
                          value={teacherHoursMap[t.id] || '20'}
                          onChange={(e) => handleHourChange(t.id, e.target.value)}
                          className={`w-20 p-2 rounded-lg border text-sm text-center font-bold outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Live Indicator Jam Saat Plotting */}
            <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs ${
              theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  Total Jam dari <strong>{selectedTeacherIds.length} Guru Terpilih</strong>: <strong className="text-emerald-500 font-bold text-sm">{pendingSelectedNewHours} Jam</strong>
                </span>
              </div>
              {targetHours && (
                <span className={`font-semibold px-2.5 py-1 rounded-md border ${
                  pendingSelectedNewHours === targetHours 
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                    : pendingSelectedNewHours < targetHours 
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                    : 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                }`}>
                  Target Kelas: {targetHours} Jam ({pendingSelectedNewHours === targetHours ? '✓ Tepat Sesuai' : pendingSelectedNewHours < targetHours ? `Kurang ${targetHours - pendingSelectedNewHours} Jam` : `Lebih +${pendingSelectedNewHours - targetHours} Jam`})
                </span>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-inherit">
              <button
                type="button"
                onClick={() => setShowAddTeacherSection(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-700 text-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting || selectedTeacherIds.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>{submitting ? 'Menyimpan...' : `Simpan ${selectedTeacherIds.length} Guru Dipilih ke Kelas ${rawClassName}`}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION DAFTAR GURU YANG SUDAH DI-PLOT KE KELAS INI */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4 border-inherit">
          <div>
            <h3 className="text-lg font-bold">Daftar Guru Pembimbing & Siswa Bimbingan</h3>
            <p className="text-xs text-slate-400">Gunakan tombol "Edit Jam" untuk memperbarui alokasi guru, atau "Plot Siswa" untuk memetakan siswa bimbingan</p>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              {currentClassAllocations.length} Guru Terplot
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
              hoursDiff === null || hoursDiff === 0 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                : hoursDiff > 0 
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' 
                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
            }`}>
              Total: {totalAllocatedHours} {targetHours ? `/ ${targetHours}` : ''} Jam {hoursDiff !== null && (hoursDiff === 0 ? '✓' : hoursDiff > 0 ? `(Kurang ${hoursDiff} Jam)` : `(+${Math.abs(hoursDiff)} Jam)`)}
            </span>
          </div>
        </div>

        {allocations.filter(a => a.className === rawClassName).length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Clock className="w-12 h-12 text-slate-500 mx-auto opacity-50" />
            <p className="text-sm font-semibold text-slate-400">Belum ada guru pembimbing yang di-plot ke kelas {rawClassName}.</p>
            <p className="text-xs text-slate-500">Klik tombol "Plot Guru Pembimbing ke Kelas" di atas untuk menambahkan guru.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {allocations.filter(a => a.className === rawClassName).map((alloc) => {
              const assignedStudents = classStudents.filter((s: any) => s.teacherId === alloc.teacherId);
              const assignedStudentsCount = assignedStudents.length;
              const actualPKLHours = Number((assignedStudentsCount * coefficientVal).toFixed(2));
              const originalAllocatedHours = Number(alloc.totalHours || 0);
              const isUnderallocated = actualPKLHours < originalAllocatedHours;
              const recommendedStudentsCount = coefficientVal > 0 ? Math.ceil(originalAllocatedHours / coefficientVal) : originalAllocatedHours;

              const isManagingThisTeacher = activeTeacherForAssign?.id === alloc.id;

              return (
                <div key={alloc.id} className={`p-6 rounded-2xl border space-y-5 transition-all ${
                  isManagingThisTeacher 
                    ? 'ring-2 ring-indigo-500 border-indigo-500/50 bg-indigo-500/5' 
                    : theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h4 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{alloc.teacher?.name || 'Guru Pembimbing'}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          {assignedStudentsCount} Siswa di Kelas Ini
                        </span>
                        {alloc.teacher?._count?.supervisedStudents !== undefined && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20">
                            Total {alloc.teacher._count.supervisedStudents} Siswa (Semua Kelas)
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">Username/NIP: <span className="font-mono">{alloc.teacher?.username || alloc.teacherId}</span> • Tahun Pelajaran: {alloc.academicYear || '-'}</p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Alokasi Asli: {originalAllocatedHours} Jam
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(alloc)}
                        className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center space-x-1.5 text-xs font-bold border border-blue-500/20"
                        title="Edit Alokasi Jam Guru Ini"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Jam</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(alloc.id)}
                        className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                        title="Hapus Guru dari Kelas Ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* KALKULASI & REKOMENDASI BOX */}
                  <div className={`p-4 rounded-xl border grid grid-cols-1 md:grid-cols-2 gap-4 text-xs ${
                    theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Jam PKL Aktual (Siswa x Koefisien):</span>
                      <p className="font-black text-base text-emerald-500 mt-0.5">
                        {actualPKLHours} Jam <span className="text-xs font-normal text-slate-400">({assignedStudentsCount} Siswa × {coefficientVal})</span>
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Rekomendasi Jumlah Siswa Ideal:</span>
                      <p className="font-black text-base text-indigo-500 mt-0.5">
                        ~{recommendedStudentsCount} Siswa <span className="text-xs font-normal text-slate-400">(Jam Asli ÷ Koefisien)</span>
                      </p>
                    </div>
                  </div>

                  {/* WARNING BANNER JIKA JAM PKL AKTUAL LEBIH SEDIKIT */}
                  {isUnderallocated && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-semibold flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Peringatan: Jam PKL aktual ({actualPKLHours} Jam) lebih sedikit dibanding jam alokasi asli ({originalAllocatedHours} Jam)! Tambah {Math.max(0, recommendedStudentsCount - assignedStudentsCount)} siswa lagi agar memenuhi alokasi.</span>
                    </div>
                  )}

                  {/* TOMBOL PLOT SISWA KE GURU INI */}
                  <div className="pt-3 border-t border-inherit flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="text-xs text-slate-400">
                      {assignedStudentsCount > 0 ? (
                        <span>Siswa saat ini: <strong>{assignedStudents.map(s => s.name.split(' ')[0]).join(', ')}</strong></span>
                      ) : (
                        <span className="italic text-amber-500">Belum ada siswa yang ditugaskan ke guru ini</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectTeacherForAssign(isManagingThisTeacher ? null : alloc)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer ${
                        isManagingThisTeacher 
                          ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>{isManagingThisTeacher ? 'Tutup Pilihan Siswa' : 'Plot Siswa ke Guru Ini'}</span>
                    </button>
                  </div>

                  {/* FORM PLOT SISWA EXPANDED IN-PAGE (Bukan Pop-Up!) */}
                  {isManagingThisTeacher && (
                    <div className={`mt-4 p-6 rounded-2xl border space-y-4 animate-in fade-in duration-200 ${
                      theme === 'dark' ? 'bg-slate-900 border-indigo-500/40' : 'bg-indigo-50/60 border-indigo-200'
                    }`}>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3 border-inherit">
                        <div>
                          <h4 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                            Pilih Siswa Kelas {rawClassName} untuk {alloc.teacher?.name}
                          </h4>
                          <p className="text-xs text-slate-400">
                            Centang siswa yang ingin dibimbing oleh guru ini ({selectedStudentIds.length} terpilih)
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedStudentIds(classStudents.map((s: any) => s.id))}
                            className="px-2.5 py-1 text-xs rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition"
                          >
                            Pilih Semua
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedStudentIds([])}
                            className="px-2.5 py-1 text-xs rounded-lg bg-slate-500/10 text-slate-400 hover:bg-slate-500 hover:text-white transition"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      {/* SEARCH SISWA */}
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={studentSearchQuery}
                          onChange={(e) => setStudentSearchQuery(e.target.value)}
                          placeholder="Cari nama siswa, NIS, atau nama industri tempat PKL..."
                          className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm font-medium border outline-none transition-all ${
                            theme === 'dark' 
                              ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500' 
                              : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600'
                          }`}
                        />
                      </div>

                      <form onSubmit={handleSaveAssignedStudents} className="space-y-4">
                        <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                          {loadingStudents ? (
                            <div className="flex items-center justify-center py-6 space-x-2 text-xs text-indigo-400">
                              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                              <span>Memuat data siswa kelas {rawClassName}...</span>
                            </div>
                          ) : classStudents.length === 0 ? (
                            <div className="py-6 text-center space-y-2">
                              <p className="text-xs text-amber-500 font-semibold">Tidak ada siswa terdaftar di kelas {rawClassName}.</p>
                              <button
                                type="button"
                                onClick={() => loadAllData()}
                                className="px-3 py-1 text-xs rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 cursor-pointer"
                              >
                                Muat Ulang Siswa
                              </button>
                            </div>
                          ) : filteredStudents.length === 0 ? (
                            <p className="text-xs text-slate-400 py-4 text-center italic">Tidak ada siswa yang cocok dengan pencarian "{studentSearchQuery}".</p>
                          ) : (
                            filteredStudents.map((s: any) => {
                              const isChecked = selectedStudentIds.includes(s.id);
                              const industryName = s.placement?.industry?.name || null;
                              const assignedTeacherName = s.teacher?.name || null;
                              const isAssignedToOther = assignedTeacherName && s.teacherId !== alloc.teacherId;

                              return (
                                <label key={s.id} className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                  isChecked 
                                    ? 'bg-indigo-600/15 border-indigo-500 shadow-sm' 
                                    : theme === 'dark' ? 'bg-slate-950 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}>
                                  <div className="flex items-center space-x-3 flex-1">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleStudentCheckbox(s.id)}
                                      className="w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0"
                                    />
                                    <div className="space-y-1 flex-1">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                        <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                          {s.name} <span className="text-xs text-slate-400 font-normal">({s.nis})</span>
                                        </p>
                                        
                                        {industryName ? (
                                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 w-fit">
                                            <Building2 className="w-3.5 h-3.5" />
                                            <span>{industryName}</span>
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20 w-fit">
                                            <span>Belum Penempatan</span>
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center space-x-1.5 text-xs">
                                        <User className="w-3 h-3 text-slate-400" />
                                        {assignedTeacherName ? (
                                          <span className={isAssignedToOther ? 'text-amber-500 font-semibold' : 'text-emerald-500 font-semibold'}>
                                            Pembimbing: {assignedTeacherName} {isAssignedToOther ? '(Guru Lain)' : '(Guru Ini)'}
                                          </span>
                                        ) : (
                                          <span className="text-slate-500 italic">Belum ada guru pembimbing</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-inherit">
                          <button
                            type="button"
                            onClick={() => setActiveTeacherForAssign(null)}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-700 text-slate-300 cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            disabled={submitting}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer flex items-center space-x-2"
                          >
                            <Check className="w-4 h-4" />
                            <span>{submitting ? 'Menyimpan...' : `Simpan ${selectedStudentIds.length} Siswa untuk ${alloc.teacher?.name}`}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL EDIT ALOKASI JAM GURU TERPILIH */}
      {isEditModalOpen && editingAlloc && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-lg border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-start border-b pb-4 border-inherit">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-500">Edit Alokasi Guru Terpilih</span>
                <h3 className="text-xl font-extrabold flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-blue-500" />
                  <span>Ubah Jam / Guru Pembimbing</span>
                </h3>
                <p className="text-xs text-slate-400">Kelas: <strong className="text-emerald-500 font-bold">{rawClassName}</strong></p>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAllocation} className="space-y-5">
              {/* Pilihan Guru */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Guru Pembimbing Terpilih
                </label>
                <select
                  value={editTeacherId}
                  onChange={(e) => setEditTeacherId(e.target.value)}
                  className={`w-full p-3 rounded-xl border text-sm font-semibold outline-none transition ${
                    theme === 'dark' 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-600'
                  }`}
                >
                  {teachers.map((t: any) => {
                    const isAlreadyInClass = currentClassAllocations.some(a => a.teacherId === t.id && a.id !== editingAlloc.id);
                    return (
                      <option key={t.id} value={t.id} disabled={isAlreadyInClass}>
                        {t.name} ({t.username || t.role}) {isAlreadyInClass ? '— [Sudah Ada di Kelas Ini]' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-400">Anda dapat mengganti nama guru pembimbing atau tetap menggunakan guru saat ini.</p>
              </div>

              {/* Input Jam Alokasi */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex justify-between">
                  <span>Jumlah Jam Alokasi Asli (Jam)</span>
                  {targetHours && (
                    <span className="text-blue-500 font-semibold">Target Kelas: {targetHours} Jam</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={editHoursInput}
                    onChange={(e) => setEditHoursInput(e.target.value)}
                    className={`w-full p-3 pr-14 rounded-xl border text-lg font-black outline-none transition ${
                      theme === 'dark' 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Jam
                  </span>
                </div>
              </div>

              {/* Kalkulasi Dampak Jam Terhadap Total Jam Kelas */}
              {(() => {
                const currentOldHours = Number(editingAlloc.totalHours || 0);
                const newEnteredHours = parseInt(editHoursInput) || 0;
                const projectedClassTotal = totalAllocatedHours - currentOldHours + newEnteredHours;
                const diffWithTarget = targetHours ? targetHours - projectedClassTotal : null;

                return (
                  <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                    theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Total Jam Kelas Sebelum Edit:</span>
                      <strong className="font-semibold">{totalAllocatedHours} Jam</strong>
                    </div>
                    <div className="flex justify-between items-center text-blue-500 font-bold">
                      <span>Proyeksi Total Jam Kelas Setelah Edit:</span>
                      <strong className="text-sm">{projectedClassTotal} Jam</strong>
                    </div>
                    {diffWithTarget !== null && (
                      <div className="flex justify-between items-center pt-2 border-t border-inherit">
                        <span className="text-slate-400">Status Target ({targetHours} Jam):</span>
                        <span className={`font-bold ${
                          diffWithTarget === 0 
                            ? 'text-emerald-500' 
                            : diffWithTarget > 0 
                            ? 'text-amber-500' 
                            : 'text-purple-500'
                        }`}>
                          {diffWithTarget === 0 ? '✓ Tepat Sesuai Target' : diffWithTarget > 0 ? `Kurang ${diffWithTarget} Jam` : `Lebih +${Math.abs(diffWithTarget)} Jam`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex justify-end gap-3 pt-4 border-t border-inherit">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={isSubmittingEdit}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-700 text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/30 cursor-pointer flex items-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmittingEdit ? 'Menyimpan...' : 'Simpan Perubahan Jam'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

