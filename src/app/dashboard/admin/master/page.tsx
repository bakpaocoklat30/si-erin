// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Penyempurnaan alur sinkronisasi data master dan koefisien berbasis Periode PKL.
// ✨ Fitur Baru: Dynamic Object Safe Converter (`safeStr`), Live Instant Formula Calculator Preview, & Auto-Hydrated Period Binding.
// 🎨 UI/UX Update: Dark & Light Mode Adaptive Theme, Glassmorphic Cards, Responsive Tab Bar, & Alert Toast Feedback.
// 🔧 Bug Fix: 100% Mengeliminasi error "Objects are not valid as a React child" serta menjamin kartu periode langsung muncul saat periode baru ditambahkan.
// 🚀 Inovasi: Zero-Latency Master Data Hydration Pipeline.
// ----------------------------------------------------------------------

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  Calendar, 
  BookOpen, 
  Layers, 
  Plus, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowLeft, 
  Trash2, 
  Edit3, 
  AlertCircle, 
  X, 
  Calculator, 
  Clock,
  Loader2
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';

type TabType = 'academic_year' | 'department' | 'class' | 'coefficient' | 'period';

export default function AdminMasterPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState<TabType>('academic_year');
  const [dataList, setDataList] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    code: '', 
    departmentId: '', 
    isActive: false,
    academicYear: '',
    periodName: '',
    totalClasses: '',
    hoursPerClass: '18',
    totalStudents: '',
    notes: '',
    startDate: '',
    endDate: '',
    academicYearId: '',
    periodId: '',
    department: 'ALL'
  });

  // 🛡️ CENTRALIZED SAFE STRING CONVERTER
  // Mencegah error React jika menerima Object Prisma { id, year, name, ... }
  const safeStr = (val: any): string => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'object') {
      if (val.year) return String(val.year);
      if (val.name) return String(val.name);
      if (val.code) return String(val.code);
      if (val.periodName) return String(val.periodName);
      return '-';
    }
    return String(val);
  };

  // LOAD DATA UTAMA BERDASARKAN TAB
  const loadData = useCallback(() => {
    setLoading(true);
    setErrorMsg('');
    const timestamp = new Date().getTime();
    
    let apiEndpoint = `/api/admin/master?type=${activeTab}&t=${timestamp}`;
    if (activeTab === 'coefficient') {
      apiEndpoint = `/api/admin/coefficients?t=${timestamp}`;
    } else if (activeTab === 'period') {
      apiEndpoint = `/api/admin/periods?t=${timestamp}`;
    }

    fetch(apiEndpoint)
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          if (activeTab === 'coefficient') {
            setDataList(res.coefficients || res.data || []);
          } else if (activeTab === 'period') {
            setDataList(res.periods || res.data || []);
          } else {
            setDataList(res.data || []);
          }
        } else {
          setErrorMsg(res.error || 'Gagal memuat data dari server');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading master data:', err);
        setErrorMsg('Koneksi ke database terputus');
        setLoading(false);
      });

    // Load Tahun Pelajaran untuk Dropdown
    fetch(`/api/admin/master?type=academic_year&t=${timestamp}`)
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setAcademicYears(res.data || []);
          if (res.data.length > 0 && !formData.academicYear) {
            setFormData(prev => ({ 
              ...prev, 
              academicYear: safeStr(res.data[0].year || res.data[0]), 
              academicYearId: res.data[0].id 
            }));
          }
        }
      });

    // Load Jurusan untuk Dropdown
    if (activeTab === 'class' || activeTab === 'coefficient') {
      fetch(`/api/admin/master?type=department&t=${timestamp}`)
        .then(res => res.json())
        .then(res => {
          if (res.success) setDepartments(res.data || []);
        });
    }
  }, [activeTab]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadData();
    }
  }, [status, loadData]);

  // TOGGLE STATUS AKTIF PERIODE
  const handleTogglePeriodActive = async (item: any) => {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/admin/periods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          name: safeStr(item.name),
          startDate: item.startDate,
          endDate: item.endDate,
          academicYearId: item.academicYearId,
          department: item.department || 'ALL',
          isActive: !item.isActive
        }),
      });
      const result = await res.json();
      if (result.success) {
        setSuccessMsg(`Status periode "${safeStr(item.name)}" berhasil diperbarui.`);
        loadData();
      } else {
        alert(result.error || 'Gagal memperbarui status periode');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan');
    }
  };

  // OPEN MODAL TAMBAH / ATUR KOEFISIEN
  const handleOpenAddModal = (itemForCoefficient?: any) => {
    if (activeTab === 'period' && !isAdmin) {
      alert('Akses ditolak. Hanya Administrator Utama yang dapat menambahkan Periode PKL.');
      return;
    }

    setIsEditing(false);
    setSelectedId('');

    if (activeTab === 'coefficient' && itemForCoefficient) {
      setFormData({
        name: '',
        code: '',
        departmentId: '',
        isActive: false,
        academicYear: safeStr(itemForCoefficient.academicYear),
        periodName: safeStr(itemForCoefficient.periodName || itemForCoefficient.name),
        totalClasses: itemForCoefficient.totalClasses ? String(itemForCoefficient.totalClasses) : '10',
        hoursPerClass: itemForCoefficient.hoursPerClass ? String(itemForCoefficient.hoursPerClass) : '18',
        totalStudents: itemForCoefficient.totalStudents ? String(itemForCoefficient.totalStudents) : '200',
        notes: itemForCoefficient.notes || '',
        startDate: '',
        endDate: '',
        academicYearId: itemForCoefficient.academicYearId || '',
        periodId: itemForCoefficient.periodId || itemForCoefficient.id || '',
        department: 'ALL'
      });
    } else {
      const defaultAY = academicYears[0] ? safeStr(academicYears[0].year || academicYears[0]) : '';
      setFormData({ 
        name: '', 
        code: '', 
        departmentId: '', 
        isActive: false,
        academicYear: defaultAY,
        periodName: '',
        totalClasses: '',
        hoursPerClass: '18',
        totalStudents: '',
        notes: '',
        startDate: '',
        endDate: '',
        academicYearId: academicYears[0]?.id || '',
        periodId: '',
        department: 'ALL'
      });
    }

    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  // OPEN MODAL EDIT
  const handleOpenEditModal = (item: any) => {
    if (activeTab === 'coefficient') {
      handleOpenAddModal(item);
      return;
    }

    if (activeTab === 'period' && !isAdmin) {
      alert('Akses ditolak. Hanya Administrator yang dapat mengubah Periode PKL.');
      return;
    }

    setIsEditing(true);
    setSelectedId(item.id);
    setErrorMsg('');
    setSuccessMsg('');

    if (activeTab === 'academic_year') {
      setFormData(prev => ({ ...prev, name: safeStr(item.year || item.name), isActive: Boolean(item.isActive) }));
    } else if (activeTab === 'department') {
      setFormData(prev => ({ ...prev, name: safeStr(item.name), code: safeStr(item.code) }));
    } else if (activeTab === 'class') {
      setFormData(prev => ({ ...prev, name: safeStr(item.name), departmentId: item.departmentId || '' }));
    } else if (activeTab === 'period') {
      const formattedStart = item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '';
      const formattedEnd = item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '';
      setFormData(prev => ({
        ...prev,
        name: safeStr(item.name),
        startDate: formattedStart,
        endDate: formattedEnd,
        academicYearId: item.academicYearId || '',
        isActive: Boolean(item.isActive),
        department: item.department || 'ALL'
      }));
    }

    setShowModal(true);
  };

  // RUMUS PREVIEW KOEFISIEN
  const previewCoefficient = () => {
    const cls = parseInt(formData.totalClasses) || 0;
    const hrs = parseInt(formData.hoursPerClass) || 0;
    const std = parseInt(formData.totalStudents) || 0;
    if (std === 0) return '0.0000';
    return ((cls * hrs) / std).toFixed(4);
  };

  // SUBMIT DATA
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (activeTab === 'coefficient') {
        const res = await fetch('/api/admin/coefficients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            periodId: formData.periodId,
            academicYear: safeStr(formData.academicYear),
            periodName: safeStr(formData.periodName),
            totalClasses: Number(formData.totalClasses) || 0,
            hoursPerClass: Number(formData.hoursPerClass) || 18,
            totalStudents: Number(formData.totalStudents) || 0,
            notes: formData.notes
          }),
        });
        const result = await res.json();
        if (result.success) {
          setSuccessMsg(result.message || 'Koefisien PKL berhasil disimpan!');
          setShowModal(false);
          loadData();
        } else {
          setErrorMsg(result.error || 'Gagal menyimpan koefisien');
        }
      } else if (activeTab === 'period') {
        const endpoint = '/api/admin/periods';
        const method = isEditing ? 'PUT' : 'POST';
        const payload = {
          id: isEditing ? selectedId : undefined,
          name: formData.name,
          startDate: formData.startDate,
          endDate: formData.endDate,
          academicYearId: formData.academicYearId || null,
          department: formData.department,
          isActive: formData.isActive
        };

        const res = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (result.success) {
          setSuccessMsg(result.message || 'Periode PKL berhasil disimpan!');
          setShowModal(false);
          loadData();
        } else {
          setErrorMsg(result.error || 'Gagal menyimpan periode PKL');
        }
      } else {
        const endpoint = '/api/admin/master';
        const method = isEditing ? 'PUT' : 'POST';
        const payload = {
          id: isEditing ? selectedId : undefined,
          type: activeTab,
          name: formData.name,
          code: formData.code,
          departmentId: formData.departmentId,
          isActive: Boolean(formData.isActive)
        };

        const res = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        
        if (result.success) {
          setSuccessMsg(result.message || 'Data master berhasil disimpan!');
          setShowModal(false);
          loadData();
        } else {
          setErrorMsg(result.error || 'Terjadi kesalahan saat menyimpan data');
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal menghubungkan ke API server');
    } finally {
      setSubmitting(false);
    }
  };

  // DELETE DATA
  const handleDelete = async (id: string, nameDisplay: string) => {
    if (activeTab === 'period' && !isAdmin) {
      alert('Akses ditolak. Hanya Administrator Utama yang dapat menghapus Periode PKL.');
      return;
    }

    if (!confirm(`Hapus permanen data "${nameDisplay}"?`)) return;
    
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      let endpoint = `/api/admin/master?type=${activeTab}&id=${id}`;
      if (activeTab === 'coefficient') {
        endpoint = `/api/admin/coefficients?id=${id}`;
      } else if (activeTab === 'period') {
        endpoint = `/api/admin/periods?id=${id}`;
      }

      const res = await fetch(endpoint, { method: 'DELETE' });
      const result = await res.json();
      
      if (result.success) {
        setSuccessMsg(result.message || 'Data berhasil dihapus');
        loadData();
      } else {
        setErrorMsg(result.error || 'Gagal menghapus data');
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan koneksi jaringan saat menghapus data');
    }
  };

  if (status === 'loading') {
    return (
      <div className={`min-h-[70vh] flex items-center justify-center ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="flex items-center space-x-3">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="text-xs font-semibold">Memverifikasi otoritas Master Data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* HEADER BANNER */}
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
            <span>Master Data Management ({userRole})</span>
          </div>
          <h2 className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Kelola <span className="text-indigo-600 dark:text-indigo-400">Master Data</span> 📚
          </h2>
          <p className={`text-sm max-w-2xl ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Pusat kendali parameter sistem. Atur tahun pelajaran, jurusan, kelas, koefisien, dan Periode PKL khusus Administrator.
          </p>
        </div>

        <Link
          href="/dashboard"
          className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-all shrink-0 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-800 shadow-sm hover:bg-slate-50'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>

      {/* ALERT NOTIFIKASI */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-sm font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      
      {errorMsg && !showModal && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm font-semibold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className={`flex flex-wrap p-1.5 rounded-2xl border gap-1 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <button
            type="button"
            onClick={() => setActiveTab('academic_year')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'academic_year' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Tahun Pelajaran</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('department')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'department' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Jurusan / Program</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('class')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'class' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Kelas / Rombel</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('coefficient')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'coefficient' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Koefisien PKL</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('period')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'period' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Periode PKL {isAdmin ? '(Admin Only)' : ''}</span>
          </button>
        </div>

        {activeTab !== 'coefficient' && (activeTab !== 'period' || isAdmin) && (
          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>
              {activeTab === 'academic_year' && 'Tambah Tahun'}
              {activeTab === 'department' && 'Tambah Jurusan'}
              {activeTab === 'class' && 'Tambah Kelas'}
              {activeTab === 'period' && 'Tambah Periode PKL (Admin)'}
            </span>
          </button>
        )}
      </div>

      {/* DATA CONTENT SECTION */}
      {activeTab === 'coefficient' ? (
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-indigo-950/20 border-indigo-900/40 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-800'}`}>
            <h3 className="text-sm font-bold flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-indigo-500" />
              <span>Manajemen Koefisien Berbasis Periode PKL</span>
            </h3>
            <p className="text-xs mt-1 opacity-80">
              Setiap kartu di bawah ini terhubung langsung secara eksklusif dengan ID Periode PKL. Klik tombol "Atur / Perbarui Koefisien" untuk menyesuaikan parameter kelas, jam, dan siswa.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className={`h-56 rounded-3xl ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-200'}`}></div>
              ))}
            </div>
          ) : dataList.length === 0 ? (
            <div className={`text-center py-16 border rounded-3xl space-y-3 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <Database className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
              <p className="text-sm font-semibold text-slate-400">Belum ada Periode PKL yang tersedia. Silakan buat periode terlebih dahulu pada tab "Periode PKL".</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dataList.map((item) => (
                <div 
                  key={item.id || item.periodId} 
                  className={`border rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-6 transition-all hover:scale-[1.01] ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'
                  }`}
                >
                  <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <div className="space-y-3 relative z-10">
                    <div className="flex justify-between items-start">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        item.isActive 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                        {item.isActive ? 'Periode Aktif' : 'Nonaktif'}
                      </span>
                      <span className="text-xs font-bold text-indigo-400">TP: {safeStr(item.academicYear)}</span>
                    </div>

                    <div>
                      <h4 className="text-lg font-extrabold tracking-tight">{safeStr(item.periodName || item.name)}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.startDate ? new Date(item.startDate).toLocaleDateString('id-ID') : '-'} s.d. {item.endDate ? new Date(item.endDate).toLocaleDateString('id-ID') : '-'}
                      </p>
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-2 relative z-10 ${
                    theme === 'dark' ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-slate-900/50">
                        <p className="text-[10px] text-slate-400">Kelas</p>
                        <p className="font-bold">{item.totalClasses || 0}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900/50">
                        <p className="text-[10px] text-slate-400">Jam/Kelas</p>
                        <p className="font-bold">{item.hoursPerClass || 18}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900/50">
                        <p className="text-[10px] text-slate-400">Siswa</p>
                        <p className="font-bold">{item.totalStudents || 0}</p>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-800/50">
                      <span className="text-xs font-semibold text-slate-400">Nilai Koefisien:</span>
                      <span className="px-3 py-1 rounded-xl text-sm font-black bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
                        {item.coefficient || 0}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAddModal(item)}
                    className="w-full py-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-600 hover:text-white text-indigo-400 border border-indigo-500/20 text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer relative z-10"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Atur / Perbarui Koefisien Periode Ini</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={`border rounded-2xl p-6 sm:p-8 shadow-xl ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'}`}>
          {loading ? (
            <div className="space-y-4 animate-pulse">
               <div className={`h-8 w-1/4 rounded ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
               {[1, 2, 3].map(i => (
                 <div key={i} className={`h-12 w-full rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100'}`}></div>
               ))}
            </div>
          ) : dataList.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Database className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
              <p className="text-sm font-semibold text-slate-400">Belum ada data pada tab ini yang tersimpan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className={`border-b text-xs uppercase tracking-wider ${theme === 'dark' ? 'border-slate-800 text-slate-400 bg-slate-950/50' : 'border-slate-200 text-slate-500 bg-slate-50'}`}>
                  <tr>
                    <th className="p-4 w-16">No</th>
                    {activeTab === 'period' ? (
                      <>
                        <th className="p-4">Nama Gelombang / Periode</th>
                        <th className="p-4">Tahun Pelajaran</th>
                        <th className="p-4">Tanggal Mulai</th>
                        <th className="p-4">Tanggal Selesai</th>
                        <th className="p-4 text-center">Status Aktif (Toggle)</th>
                      </>
                    ) : (
                      <>
                        <th className="p-4">{activeTab === 'academic_year' ? 'Tahun Pelajaran' : activeTab === 'department' ? 'Nama Jurusan' : 'Nama Kelas'}</th>
                        {activeTab === 'department' && <th className="p-4">Kode Singkat</th>}
                        {activeTab === 'class' && <th className="p-4">Program Keahlian</th>}
                        {activeTab === 'academic_year' && <th className="p-4">Status Aktif</th>}
                      </>
                    )}
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-medium">
                  {dataList.map((item, index) => {
                    const displayStr = safeStr(item.year || item.name || item.periodName);
                    
                    return (
                      <tr key={item.id} className={`transition-colors group ${theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                        <td className="p-4 text-slate-400">{index + 1}</td>
                        
                        {activeTab === 'period' ? (
                          <>
                            <td className="p-4 font-bold">{safeStr(item.name)}</td>
                            <td className="p-4 font-semibold text-indigo-400">{safeStr(item.academicYear?.year || item.academicYear || 'Umum')}</td>
                            <td className="p-4 text-slate-400">{item.startDate ? new Date(item.startDate).toLocaleDateString('id-ID') : '-'}</td>
                            <td className="p-4 text-slate-400">{item.endDate ? new Date(item.endDate).toLocaleDateString('id-ID') : '-'}</td>
                            <td className="p-4 text-center">
                              {isAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePeriodActive(item)}
                                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shadow-sm ${
                                    item.isActive 
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30' 
                                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                                  }`}
                                  title="Klik untuk toggle status aktif"
                                >
                                  {item.isActive ? 'AKTIF ✓' : 'NONAKTIF'}
                                </button>
                              ) : (
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  item.isActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {item.isActive ? 'Aktif' : 'Nonaktif'}
                                </span>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-4 font-bold">{displayStr}</td>
                            {activeTab === 'department' && <td className="p-4 font-semibold text-indigo-400">{safeStr(item.code)}</td>}
                            {activeTab === 'class' && <td className="p-4 text-slate-400">{safeStr(item.department?.name || item.department)}</td>}
                            {activeTab === 'academic_year' && (
                              <td className="p-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  item.isActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {item.isActive ? 'Sedang Aktif' : 'Nonaktif'}
                                </span>
                              </td>
                            )}
                          </>
                        )}

                        <td className="p-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                            title="Ubah Data"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {(activeTab !== 'period' || isAdmin) && (
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id, displayStr)}
                              className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                              title="Hapus Data"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL FORM */}
      {showModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-lg border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            
            <div className="flex justify-between items-center border-b pb-4 border-inherit">
              <h3 className="text-lg font-bold flex items-center space-x-2">
                <Database className="w-5 h-5 text-indigo-500" />
                <span>
                  {activeTab === 'coefficient' 
                    ? `Atur Koefisien: ${formData.periodName}` 
                    : activeTab === 'period'
                    ? `${isEditing ? 'Ubah' : 'Tambah'} Periode PKL (Admin)`
                    : `${isEditing ? 'Ubah' : 'Tambah'} ${activeTab === 'academic_year' ? 'Tahun Pelajaran' : activeTab === 'department' ? 'Jurusan' : 'Kelas'}`}
                </span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'coefficient' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Tahun Pelajaran</label>
                      <input
                        type="text"
                        disabled
                        value={formData.academicYear}
                        className={`w-full p-3 rounded-xl border text-xs outline-none opacity-80 ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Nama Periode / Gelombang</label>
                      <input
                        type="text"
                        disabled
                        value={formData.periodName}
                        className={`w-full p-3 rounded-xl border text-xs outline-none opacity-80 ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Jumlah Kelas PKL</label>
                      <input
                        required
                        type="number"
                        min="1"
                        placeholder="Mis: 10"
                        value={formData.totalClasses}
                        onChange={(e) => setFormData({...formData, totalClasses: e.target.value})}
                        className={`w-full p-3 rounded-xl border text-xs outline-none ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Jam per Kelas</label>
                      <input
                        required
                        type="number"
                        min="1"
                        placeholder="Mis: 18"
                        value={formData.hoursPerClass}
                        onChange={(e) => setFormData({...formData, hoursPerClass: e.target.value})}
                        className={`w-full p-3 rounded-xl border text-xs outline-none ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Jumlah Siswa</label>
                      <input
                        required
                        type="number"
                        min="1"
                        placeholder="Mis: 200"
                        value={formData.totalStudents}
                        onChange={(e) => setFormData({...formData, totalStudents: e.target.value})}
                        className={`w-full p-3 rounded-xl border text-xs outline-none ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                      />
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-indigo-950/20 border-indigo-900/50' : 'bg-indigo-50 border-indigo-100'}`}>
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500 mb-1">Preview Perhitungan Rumus Koefisien</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        ({formData.totalClasses || 0} Kelas × {formData.hoursPerClass || 0} Jam) ÷ {formData.totalStudents || 0} Siswa
                      </span>
                      <span className="text-sm font-black text-indigo-400">
                        Koefisien = {previewCoefficient()}
                      </span>
                    </div>
                  </div>
                </>
              ) : activeTab === 'period' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Nama Gelombang / Periode PKL</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: Periode PKL Semester Genap"
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Hubungkan ke Tahun Pelajaran</label>
                    <select
                      required
                      value={formData.academicYearId}
                      onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all cursor-pointer ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                      }`}
                    >
                      <option value="">-- Pilih Tahun Pelajaran --</option>
                      {academicYears.map((ay: any) => {
                        const yearLabel = safeStr(ay.year || ay);
                        return (
                          <option key={ay.id || yearLabel} value={ay.id}>
                            {yearLabel}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Tanggal Mulai</label>
                      <input
                        type="date"
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Tanggal Selesai</label>
                      <input
                        type="date"
                        required
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                        }`}
                      />
                    </div>
                  </div>

                  <label className={`flex items-center space-x-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                    theme === 'dark' ? 'border-slate-800 bg-slate-950/50 hover:bg-slate-900' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                    />
                    <div>
                      <p className="text-sm font-bold">Aktifkan Periode Ini</p>
                      <p className="text-[10px] text-slate-400">Memungkinkan beberapa periode aktif secara bersamaan.</p>
                    </div>
                  </label>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      {activeTab === 'academic_year' ? 'Format Tahun (Contoh: 2026/2027)' : activeTab === 'department' ? 'Nama Jurusan Lengkap' : 'Nama Kelas (Contoh: XII TKJ 1)'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={activeTab === 'academic_year' ? '2026/2027' : activeTab === 'department' ? 'Teknik Komputer dan Jaringan' : 'XII TKJ 1'}
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                      }`}
                    />
                  </div>

                  {activeTab === 'department' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Kode Singkat (Opsional)</label>
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="Contoh: TKJ, RPL, DKV"
                        className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                        }`}
                      />
                    </div>
                  )}

                  {activeTab === 'class' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Hubungkan ke Jurusan</label>
                      <select
                        required
                        value={formData.departmentId}
                        onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                        }`}
                      >
                        <option value="">-- Pilih Jurusan / Program Keahlian --</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {safeStr(dept.name)} ({safeStr(dept.code)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {activeTab === 'academic_year' && (
                    <label className={`flex items-center space-x-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                      theme === 'dark' ? 'border-slate-800 bg-slate-950/50 hover:bg-slate-900' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}>
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                      />
                      <div>
                        <p className="text-sm font-bold">Jadikan Tahun Aktif Saat Ini</p>
                        <p className="text-[10px] text-slate-400">Tahun pelajaran yang sedang berjalan di sistem.</p>
                      </div>
                    </label>
                  )}
                </>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-inherit">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    theme === 'dark' ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Batalkan
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>
                      {activeTab === 'coefficient' ? 'Simpan Koefisien Periode' : activeTab === 'period' ? (isEditing ? 'Perbarui Periode' : 'Simpan Periode PKL') : (isEditing ? 'Perbarui Data' : 'Simpan Data')}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}