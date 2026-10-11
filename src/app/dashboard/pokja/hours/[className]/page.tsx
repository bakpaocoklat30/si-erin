'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, Users, Calendar, Calculator, UserPlus, Trash2, UserCheck, 
  AlertTriangle, Building2, User, Search, Check, AlertCircle, CheckCircle2, Clock
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

  // Bagian Assign Siswa ke Guru
  const [activeTeacherForAssign, setActiveTeacherForAssign] = useState<any>(null);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const loadClassData = useCallback(async () => {
    if (!rawClassName) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/pokja/teacher-hours?className=${encodeURIComponent(rawClassName)}&t=${timestamp}`);
      const result = await res.json();
      if (result.success) {
        setAllocations(result.allocations || []);
        setClassDetailData({
          periodInfo: result.periodInfo,
          coefficientInfo: result.coefficientInfo
        });
        if (result.teachers && result.teachers.length > 0) {
          setTeachers(result.teachers);
        }

        // Ambil juga master guru dari /api/admin/users jika list belum lengkap
        fetch(`/api/admin/users?t=${timestamp}`)
          .then(uRes => uRes.json())
          .then(uJson => {
            const userList = uJson.data || uJson.users || [];
            if (userList.length > 0) {
              const filtered = userList.filter((u: any) => {
                const r = String(u.role || '').toUpperCase();
                return ['GURU', 'PEMBIMBING', 'TEACHER', 'GURUPMB', 'POKJA', 'ADMIN', 'SUPER_ADMIN'].includes(r);
              });
              if (filtered.length > 0) setTeachers(filtered);
            }
          })
          .catch(() => {});

        // Pre-check guru yang sudah ter-assign di kelas ini
        const currentClassAllocations = (result.allocations || []).filter((a: any) => a.className === rawClassName);
        const preSelectedIds = currentClassAllocations.map((a: any) => a.teacherId);
        setSelectedTeacherIds(preSelectedIds);

        const initialHoursMap: { [key: string]: string } = {};
        currentClassAllocations.forEach((a: any) => {
          initialHoursMap[a.teacherId] = String(a.totalHours || 20);
        });
        setTeacherHoursMap(initialHoursMap);
      } else {
        setErrorMsg(result.error || 'Gagal memuat data alokasi kelas');
      }
    } catch (e: any) {
      setErrorMsg('Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  }, [rawClassName]);

  // Load daftar siswa kelas untuk keperluan penghitungan & assign
  const loadClassStudents = useCallback(async () => {
    if (!rawClassName) return;
    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/admin/students?className=${encodeURIComponent(rawClassName)}&t=${timestamp}`);
      const result = await res.json();
      if (result.success || result.data) {
        const list = result.data || result.students || [];
        setClassStudents(list);
      }
    } catch (e) {
      console.error(e);
    }
  }, [rawClassName]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadClassData();
      loadClassStudents();
    }
  }, [status, loadClassData, loadClassStudents]);

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
        loadClassData();
        loadClassStudents();
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
        loadClassData();
        loadClassStudents();
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert('Gagal menghapus data');
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
        loadClassData();
        loadClassStudents();
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

  // Filter guru pencarian
  const filteredTeachers = teachers.filter(t => {
    const query = teacherSearchQuery.toLowerCase();
    const nameMatch = t.name?.toLowerCase().includes(query);
    const roleMatch = t.role?.toLowerCase().includes(query);
    const deptMatch = t.department?.toLowerCase().includes(query);
    return nameMatch || roleMatch || deptMatch;
  });

  const currentClassAllocatedTeacherIds = allocations
    .filter(a => a.className === rawClassName)
    .map(a => a.teacherId);

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
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold">Memuat Data Alokasi Kelas {rawClassName}...</span>
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

      {/* KARTU INFORMASI PERIODE & KOEFISIEN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`p-6 rounded-3xl border shadow-md space-y-2 ${theme === 'dark' ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span>Periode Prakerin Siswa</span>
          </div>
          <p className="text-xl font-black">{classDetailData?.periodInfo?.name || 'Belum Terikat Periode'}</p>
          <p className="text-xs opacity-80">
            {classDetailData?.periodInfo?.startDate 
              ? `${new Date(classDetailData.periodInfo.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} s.d. ${new Date(classDetailData.periodInfo.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
              : 'Atur periode di menu Master Data'}
          </p>
        </div>

        <div className={`p-6 rounded-3xl border shadow-md space-y-2 ${theme === 'dark' ? 'bg-indigo-950/20 border-indigo-900/50 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-900'}`}>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
            <Calculator className="w-4 h-4 text-indigo-500" />
            <span>Nilai Koefisien PKL</span>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-black">{classDetailData?.coefficientInfo?.coefficient || '1.00'}</p>
            <span className="text-xs font-semibold opacity-80">
              {classDetailData?.coefficientInfo ? `Kelas: ${classDetailData.coefficientInfo.totalClasses} | Jam: ${classDetailData.coefficientInfo.hoursPerClass}` : 'Standard'}
            </span>
          </div>
          <p className="text-xs opacity-80">Koefisien pengali jam bimbingan PKL aktual per siswa</p>
        </div>
      </div>

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
        <div className="flex justify-between items-center border-b pb-4 border-inherit">
          <div>
            <h3 className="text-lg font-bold">Daftar Guru Pembimbing & Siswa Bimbingan</h3>
            <p className="text-xs text-slate-400">Pilih "Plot Siswa ke Guru Ini" untuk memetakan siswa bimbingan per guru</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            {allocations.filter(a => a.className === rawClassName).length} Guru Terplot
          </span>
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

                    <div className="flex items-center space-x-3 shrink-0">
                      <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Alokasi Asli: {originalAllocatedHours} Jam
                      </span>
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
                          {classStudents.length === 0 ? (
                            <p className="text-xs text-amber-500 py-4 text-center">Tidak ada siswa terdaftar di kelas {rawClassName}.</p>
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

    </div>
  );
}

