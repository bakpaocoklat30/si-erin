'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Building2, CheckCircle2, ChevronLeft, ChevronRight,
  Plus, Trash2, Calendar, FileText, X, CheckSquare, Square,
  Briefcase, GraduationCap, AlertCircle, UserPlus, Sparkles, Filter, Check, Clock
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';

export default function ManualPlacementPage() {
  const { data: session } = useSession();
  const { theme } = useTheme();

  const [industries, setIndustries] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [searchGroupTerm, setSearchGroupTerm] = useState('');
  const [groupFilterTab, setGroupFilterTab] = useState<'all' | 'filled' | 'empty'>('all');
  
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Menginisialisasi...');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Create Group (Modal)
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [formInd, setFormInd] = useState('');
  const [searchIndTerm, setSearchIndTerm] = useState('');
  const [showIndDropdown, setShowIndDropdown] = useState(false);
  const [formPeriod, setFormPeriod] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Selected Group State
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [groupStudents, setGroupStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Form Add Student to Group (Modal)
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentFilterTab, setStudentFilterTab] = useState<'unplaced' | 'all'>('unplaced');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [addingStudents, setAddingStudents] = useState(false);

  const isDark = theme === 'dark';

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/pokja/placement-groups');
      const data = await res.json();
      if (data.success) setGroups(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingText('Memuat data kelompok...');
        await fetchGroups();

        setLoadingText('Memuat data industri dan periode...');
        const [indRes, perRes] = await Promise.all([
          fetch('/api/pokja/industries').then(res => res.json()).catch(() => ({ success: false, data: [] })),
          fetch('/api/pokja/periods').then(res => res.json()).catch(() => ({ success: false, data: [] })),
        ]);
        if (indRes.success) setIndustries(indRes.data);
        if (perRes.success) setPeriods(perRes.data);

        setLoadingText('Memuat data siswa...');
        try {
          const stuResObj = await fetch('/api/pokja/students');
          if (stuResObj.ok) {
            const stuJson = await stuResObj.json();
            if (stuJson.success) setAllStudents(stuJson.data);
          }
        } catch (stuErr) {
          console.warn('Peringatan: Gagal memuat daftar siswa:', stuErr);
        }
      } catch (err) {
        console.error('Error loading manual placement data:', err);
        setErrorMsg('Gagal memuat sebagian data awal.');
      } finally {
        setLoadingText('');
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handlePeriodChange = (pid: string) => {
    setFormPeriod(pid);
    const p = periods.find(x => x.id === pid);
    if (p) {
      if (p.startDate) setFormStart(p.startDate.split('T')[0]);
      if (p.endDate) setFormEnd(p.endDate.split('T')[0]);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingGroup(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/pokja/placement-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industryId: formInd,
          periodId: formPeriod,
          department: (session?.user as any)?.department || undefined,
          startDate: formStart || null,
          endDate: formEnd || null,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
      
      setSuccessMsg('Kelompok baru berhasil dibuat!');
      setShowGroupForm(false);
      setFormInd(''); setFormPeriod(''); setFormStart(''); setFormEnd(''); setSearchIndTerm('');
      await fetchGroups();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kelompok ini? Semua siswa di dalamnya akan di-reset penempatannya.')) return;
    try {
      await fetch(`/api/pokja/placement-groups/${id}`, { method: 'DELETE' });
      if (selectedGroup?.id === id) {
        setSelectedGroup(null);
        setGroupStudents([]);
      }
      setSuccessMsg('Kelompok berhasil dihapus.');
      fetchGroups();
    } catch (e) {
      console.error(e);
      setErrorMsg('Gagal menghapus kelompok.');
    }
  };

  const loadGroupStudents = async (g: any) => {
    setSelectedGroup(g);
    setLoadingStudents(true);
    setShowAddStudentForm(false);
    setSelectedStudentIds([]);
    try {
      const res = await fetch(`/api/pokja/placement-groups/${g.id}/students`);
      const data = await res.json();
      if (data.success) setGroupStudents(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStudents(false);
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const selectAllUnplaced = () => {
    const unplacedIds = filteredAvailableStudents
      .filter(s => !s.placement?.industryId)
      .map(s => s.id);
    setSelectedStudentIds(unplacedIds);
  };

  const clearSelection = () => {
    setSelectedStudentIds([]);
  };

  const handleAddStudents = async () => {
    if (selectedStudentIds.length === 0) return;
    setAddingStudents(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/pokja/placement-groups/${selectedGroup.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedStudentIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan saat menambahkan siswa');
      
      setSuccessMsg(`Berhasil menambahkan ${selectedStudentIds.length} siswa ke kelompok!`);
      setShowAddStudentForm(false);
      setSelectedStudentIds([]);
      loadGroupStudents(selectedGroup);
      fetchGroups(); // refresh student count on groups list
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setAddingStudents(false);
    }
  };

  const handleRemoveStudent = async (placementId: string) => {
    if (!confirm('Hapus siswa ini dari kelompok? Penempatannya akan dibatalkan.')) return;
    try {
      await fetch(`/api/pokja/placement-groups/${selectedGroup.id}/students?placementId=${placementId}`, { method: 'DELETE' });
      setSuccessMsg('Siswa berhasil dikeluarkan dari kelompok.');
      loadGroupStudents(selectedGroup);
      fetchGroups();
    } catch (e) {
      console.error(e);
      setErrorMsg('Gagal menghapus siswa dari kelompok.');
    }
  };

  // Filter available students for adding to group
  const filteredAvailableStudents = useMemo(() => {
    return allStudents.filter(s => {
      // Must not be already in the currently selected group
      const inCurrentGroup = groupStudents.some(gs => gs.id === s.id);
      if (inCurrentGroup) return false;

      // Filter by placement status tab
      const isPlaced = !!s.placement?.industryId;
      if (studentFilterTab === 'unplaced' && isPlaced) return false;

      // Filter by search query
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.nis && s.nis.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (s.className && s.className.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchSearch;
    });
  }, [allStudents, groupStudents, studentFilterTab, searchTerm]);

  // Filter groups in left column
  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      const matchSearch = (g.industry?.name || '').toLowerCase().includes(searchGroupTerm.toLowerCase()) ||
                          (g.period?.name || '').toLowerCase().includes(searchGroupTerm.toLowerCase());
      if (!matchSearch) return false;

      if (groupFilterTab === 'filled') return (g.studentCount || 0) > 0;
      if (groupFilterTab === 'empty') return (g.studentCount || 0) === 0;
      return true;
    });
  }, [groups, searchGroupTerm, groupFilterTab]);

  // Overall KPI statistics
  const stats = useMemo(() => {
    const totalPlaced = groups.reduce((acc, curr) => acc + (curr.studentCount || 0), 0);
    const unplacedStudents = allStudents.filter(s => !s.placement?.industryId).length;
    const uniqueIndustries = new Set(groups.map(g => g.industryId)).size;
    return {
      totalGroups: groups.length,
      totalPlaced,
      unplacedStudents,
      uniqueIndustries
    };
  }, [groups, allStudents]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="text-center space-y-4">
          <div className="relative w-14 h-14 mx-auto">
            <div className="w-14 h-14 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <Sparkles className="w-5 h-5 text-indigo-500 absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="text-sm font-semibold text-indigo-500 animate-pulse tracking-wide">{loadingText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 sm:p-8 space-y-6 transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50/70 text-slate-900'
    }`}>

      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Link href="/dashboard/pokja" className="hover:text-indigo-500 transition-colors flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Dashboard Pokja</span>
            </Link>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300 font-semibold">Penempatan PKL Manual</span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20">
              <Users className="w-6 h-6" />
            </span>
            <span>Penempatan Manual PKL</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Kelola pembentukan kelompok kerja sama industri dan lakukan penempatan siswa secara fleksibel & terorganisir.
          </p>
        </div>

        {/* Action Button: Buat Kelompok Baru */}
        <button
          onClick={() => setShowGroupForm(true)}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Kelompok Baru</span>
        </button>
      </div>

      {/* FLASH MESSAGES */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="p-1 text-rose-400 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="p-1 text-emerald-400 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className={`p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200/80'
        } shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Kelompok</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 font-display">{stats.totalGroups}</p>
          <span className="text-[11px] text-slate-400">Kelompok industri terdaftar</span>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200/80'
        } shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Siswa Ditempatkan</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 font-display text-emerald-600 dark:text-emerald-400">{stats.totalPlaced}</p>
          <span className="text-[11px] text-slate-400">Siswa sudah memiliki lokasi</span>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200/80'
        } shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Belum Ditempatkan</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 font-display text-amber-600 dark:text-amber-400">{stats.unplacedStudents}</p>
          <span className="text-[11px] text-slate-400">Perlu dialokasikan ke industri</span>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200/80'
        } shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Industri Mitra</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 font-display">{stats.uniqueIndustries}</p>
          <span className="text-[11px] text-slate-400">Perusahaan aktif digunakan</span>
        </div>
      </div>

      {/* MASTER-DETAIL WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ============================================================== */}
        {/* PANEL KIRI: DAFTAR KELOMPOK (4 Cols)                           */}
        {/* ============================================================== */}
        <div className={`lg:col-span-4 rounded-3xl border ${
          isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200/90'
        } shadow-sm overflow-hidden flex flex-col`}>
          
          {/* Header List Kelompok */}
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2 tracking-tight">
                <FileText className="w-4 h-4 text-indigo-500" />
                <span>Daftar Kelompok</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                {filteredGroups.length} Kelompok
              </span>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari nama industri / periode..." 
                value={searchGroupTerm} 
                onChange={e => setSearchGroupTerm(e.target.value)} 
                className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark ? 'bg-slate-800/80 border-slate-700/80 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                }`} 
              />
              {searchGroupTerm && (
                <button onClick={() => setSearchGroupTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 text-[11px] font-medium pt-1">
              <button
                onClick={() => setGroupFilterTab('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  groupFilterTab === 'all'
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setGroupFilterTab('filled')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  groupFilterTab === 'filled'
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Ada Siswa
              </button>
              <button
                onClick={() => setGroupFilterTab('empty')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  groupFilterTab === 'empty'
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Kosong
              </button>
            </div>
          </div>

          {/* Groups Scroll Area */}
          <div className="p-3 space-y-2.5 max-h-[640px] overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2">
                <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto opacity-40" />
                <p className="text-xs text-slate-400 font-medium">Tidak ada kelompok yang cocok.</p>
                <button
                  onClick={() => setShowGroupForm(true)}
                  className="text-xs text-indigo-500 hover:underline font-semibold"
                >
                  + Buat Kelompok Sekarang
                </button>
              </div>
            ) : (
              filteredGroups.map(g => {
                const isSelected = selectedGroup?.id === g.id;
                const studentCount = g.studentCount || 0;

                return (
                  <div 
                    key={g.id} 
                    onClick={() => loadGroupStudents(g)} 
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-150 relative group ${
                      isSelected 
                        ? (isDark 
                            ? 'border-indigo-500 bg-gradient-to-r from-indigo-950/60 to-purple-950/30 shadow-md ring-1 ring-indigo-500/50' 
                            : 'border-indigo-500 bg-indigo-50/80 shadow-md shadow-indigo-100 ring-1 ring-indigo-500/40') 
                        : (isDark 
                            ? 'border-slate-800/80 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-800/40' 
                            : 'border-slate-200/80 hover:border-slate-300 bg-white hover:bg-slate-50/70')
                    }`}
                  >
                    {/* Active Indicator Notch */}
                    {isSelected && (
                      <span className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-600 rounded-r-full"></span>
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 pr-2">
                        <h3 className={`font-bold text-xs sm:text-sm line-clamp-1 flex items-center gap-1.5 ${
                          isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          <Building2 className="w-3.5 h-3.5 shrink-0 opacity-70" />
                          <span>{g.industry?.name}</span>
                        </h3>
                        
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span className="truncate">{g.period?.name || 'Periode PKL'}</span>
                        </p>
                      </div>

                      {/* Delete Group Button */}
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleDeleteGroup(g.id); 
                        }} 
                        className="text-slate-300 hover:text-rose-600 dark:text-slate-600 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Hapus Kelompok"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Bottom Details: Date Range & Student Count Pill */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        studentCount > 0 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60' 
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60'
                      }`}>
                        {studentCount} Siswa
                      </span>

                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span>Pilih</span>
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* PANEL KANAN: WORKSPACE KELOMPOK TERPILIH (8 Cols)               */}
        {/* ============================================================== */}
        <div className={`lg:col-span-8 rounded-3xl border ${
          isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200/90'
        } shadow-sm overflow-hidden`}>
          
          {!selectedGroup ? (
            /* Empty State: Belum memilih kelompok */
            <div className="p-12 sm:p-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 shadow-inner">
                <Users className="w-10 h-10 text-indigo-500 opacity-60" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="font-bold text-base sm:text-lg font-display">Pilih Kelompok Penempatan</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pilih salah satu kelompok industri di panel sebelah kiri untuk melihat daftar siswa atau menambahkan siswa baru secara manual.
                </p>
              </div>
              <button
                onClick={() => setShowGroupForm(true)}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Kelompok Baru</span>
              </button>
            </div>
          ) : (
            /* Active Group Workspace */
            <div className="space-y-6">
              
              {/* Group Hero Header */}
              <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
                    <Building2 className="w-3 h-3" />
                    <span>Industri Penempatan</span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">
                    {selectedGroup.industry?.name}
                  </h2>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Periode: <strong>{selectedGroup.period?.name || '-'}</strong></span>
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedGroup.startDate ? selectedGroup.startDate.split('T')[0] : 'Tgl Belum Diset'} s/d {selectedGroup.endDate ? selectedGroup.endDate.split('T')[0] : 'Selesai'}</span>
                    </span>
                  </div>
                </div>

                {/* Action Button: Open Add Student Modal */}
                <button
                  onClick={() => {
                    setShowAddStudentForm(true);
                    setSelectedStudentIds([]);
                    setSearchTerm('');
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Siswa ke Kelompok</span>
                </button>
              </div>

              {/* Group Students List */}
              <div className="p-5 sm:p-6 pt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span>Daftar Siswa di Kelompok Ini ({groupStudents.length})</span>
                  </h3>

                  {groupStudents.length > 0 && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60">
                      Terisi {groupStudents.length} Siswa
                    </span>
                  )}
                </div>

                {loadingStudents ? (
                  <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Memuat siswa di kelompok ini...</span>
                  </div>
                ) : groupStudents.length === 0 ? (
                  <div className="text-center py-14 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3">
                    <UserPlus className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Belum Ada Siswa di Kelompok Ini</p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        Klik tombol Tambah Siswa di atas untuk memilih dan menempatkan siswa ke industri {selectedGroup.industry?.name}.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddStudentForm(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 dark:text-indigo-300 text-xs font-semibold transition"
                    >
                      + Tambah Siswa Sekarang
                    </button>
                  </div>
                ) : (
                  <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className={`text-[11px] uppercase tracking-wider font-bold ${
                          isDark ? 'bg-slate-800/80 text-slate-400' : 'bg-slate-100/80 text-slate-600'
                        }`}>
                          <tr>
                            <th className="py-3 px-4 w-12 text-center">No</th>
                            <th className="py-3 px-4">Nama Siswa</th>
                            <th className="py-3 px-4">NIS</th>
                            <th className="py-3 px-4">Kelas</th>
                            <th className="py-3 px-4 text-center w-24">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {groupStudents.map((s, idx) => (
                            <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                              <td className="py-3 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                              <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 shadow-sm">
                                    {s.name ? s.name.substring(0, 2).toUpperCase() : 'SW'}
                                  </div>
                                  <span>{s.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">{s.nis || '-'}</td>
                              <td className="py-3 px-4">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
                                  {s.className || '-'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button 
                                  onClick={() => handleRemoveStudent(s.placementId)} 
                                  className="inline-flex items-center justify-center p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                                  title="Hapus dari Kelompok Ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>

      {/* ============================================================== */}
      {/* MODAL 1: FORM BUAT KELOMPOK BARU                               */}
      {/* ============================================================== */}
      {showGroupForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`relative max-w-lg w-full rounded-3xl border shadow-2xl overflow-hidden transition-all animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
          }`}>
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold font-display text-sm">Buat Kelompok Penempatan Baru</h3>
                  <p className="text-[11px] text-indigo-100">Kaitkan industri mitra dengan periode PKL</p>
                </div>
              </div>
              <button onClick={() => setShowGroupForm(false)} className="text-white/80 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
              
              {/* Searchable Industry Combobox */}
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Pilih Industri Mitra *
                </label>
                
                <div 
                  className={`w-full p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition text-xs font-medium ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                  onClick={() => setShowIndDropdown(true)}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    <input 
                      type="text" 
                      required={!formInd}
                      placeholder={formInd ? industries.find(i => i.id === formInd)?.name : "Ketik untuk mencari industri..."} 
                      value={searchIndTerm}
                      onChange={(e) => {
                        setSearchIndTerm(e.target.value);
                        setShowIndDropdown(true);
                      }}
                      onFocus={() => setShowIndDropdown(true)}
                      className="bg-transparent outline-none w-full text-xs"
                    />
                  </div>
                  <ChevronLeft className={`w-3.5 h-3.5 transition-transform text-slate-400 ${showIndDropdown ? '-rotate-90' : '-rotate-180'}`} />
                </div>

                {/* Dropdown List */}
                {showIndDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowIndDropdown(false)}></div>
                    <div className={`absolute z-20 mt-1 w-full max-h-48 overflow-y-auto border rounded-xl shadow-xl text-xs ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}>
                      {industries.filter(i => (i.name || '').toLowerCase().includes((searchIndTerm || '').toLowerCase())).map(ind => (
                        <div 
                          key={ind.id} 
                          className={`px-3.5 py-2.5 cursor-pointer flex items-center justify-between transition ${
                            isDark ? 'hover:bg-slate-700' : 'hover:bg-indigo-50'
                          } ${formInd === ind.id ? 'font-bold text-indigo-500 bg-indigo-50/50 dark:bg-slate-700' : ''}`}
                          onClick={() => {
                            setFormInd(ind.id);
                            setSearchIndTerm(ind.name);
                            setShowIndDropdown(false);
                          }}
                        >
                          <span className="truncate">{ind.name}</span>
                          {formInd === ind.id && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                        </div>
                      ))}
                      {industries.filter(i => (i.name || '').toLowerCase().includes((searchIndTerm || '').toLowerCase())).length === 0 && (
                        <div className="px-3.5 py-3 text-slate-400 text-center">Industri tidak ditemukan</div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Pilihan Periode */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Pilih Periode PKL *
                </label>
                <select 
                  required 
                  value={formPeriod} 
                  onChange={e => handlePeriodChange(e.target.value)} 
                  className={`w-full p-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="">-- Pilih Periode PKL --</option>
                  {periods.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.department || 'Semua Jurusan'})
                    </option>
                  ))}
                </select>
                {formPeriod && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Detail: {periods.find(p => p.id === formPeriod)?.department || 'Semua Jurusan'} &bull; {periods.find(p => p.id === formPeriod)?.activeIndustries?.length || 0} Industri Terdaftar
                  </p>
                )}
              </div>

              {/* Rentang Tanggal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Tanggal Mulai
                  </label>
                  <input 
                    type="date" 
                    value={formStart} 
                    onChange={e => setFormStart(e.target.value)} 
                    className={`w-full p-2 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Tanggal Selesai
                  </label>
                  <input 
                    type="date" 
                    value={formEnd} 
                    onChange={e => setFormEnd(e.target.value)} 
                    className={`w-full p-2 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`} 
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => setShowGroupForm(false)} 
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={creatingGroup || !formInd || !formPeriod} 
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {creatingGroup ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Kelompok</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: PILIH SISWA UNTUK DIMASUKKAN KE KELOMPOK             */}
      {/* ============================================================== */}
      {showAddStudentForm && selectedGroup && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`relative max-w-3xl w-full rounded-3xl border shadow-2xl overflow-hidden transition-all animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh] ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
          }`}>
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white flex items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-200" />
                  <h3 className="font-bold font-display text-sm sm:text-base">
                    Pilih Siswa untuk {selectedGroup.industry?.name}
                  </h3>
                </div>
                <p className="text-[11px] text-indigo-100">
                  {selectedStudentIds.length} siswa terpilih untuk dialokasikan
                </p>
              </div>

              <button onClick={() => setShowAddStudentForm(false)} className="text-white/80 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              
              {/* Tab Status Filter */}
              <div className="flex items-center gap-1.5 text-xs font-semibold w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setStudentFilterTab('unplaced')}
                  className={`px-3 py-1.5 rounded-xl transition ${
                    studentFilterTab === 'unplaced'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  Belum Ditempatkan
                </button>
                <button
                  type="button"
                  onClick={() => setStudentFilterTab('all')}
                  className={`px-3 py-1.5 rounded-xl transition ${
                    studentFilterTab === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  Semua Siswa
                </button>
              </div>

              {/* Search Bar & Quick Select */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Cari nama, NIS, kelas..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`} 
                  />
                </div>

                <button
                  type="button"
                  onClick={selectAllUnplaced}
                  className="px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 whitespace-nowrap transition"
                >
                  Pilih Semua
                </button>
                {selectedStudentIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="px-2 py-1.5 text-[11px] text-rose-500 hover:underline whitespace-nowrap"
                  >
                    Reset
                  </button>
                )}
              </div>

            </div>

            {/* Students Table / List Container */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredAvailableStudents.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400 space-y-1">
                  <Users className="w-8 h-8 mx-auto opacity-30 mb-2" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">Tidak ada siswa yang sesuai.</p>
                  <p className="text-[11px]">Coba ubah kata kunci pencarian atau ganti filter status.</p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className={`text-[10px] uppercase font-bold tracking-wider ${
                      isDark ? 'bg-slate-800/90 text-slate-400' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <tr>
                        <th className="py-2.5 px-3.5 w-10 text-center">
                          <CheckSquare className="w-3.5 h-3.5 mx-auto text-slate-400" />
                        </th>
                        <th className="py-2.5 px-3">Nama Siswa</th>
                        <th className="py-2.5 px-3">NIS</th>
                        <th className="py-2.5 px-3">Kelas</th>
                        <th className="py-2.5 px-3">Status Saat Ini</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredAvailableStudents.map(s => {
                        const isPlaced = !!s.placement?.industryId;
                        const isChecked = selectedStudentIds.includes(s.id);

                        return (
                          <tr 
                            key={s.id} 
                            onClick={() => !isPlaced && toggleStudent(s.id)} 
                            className={`transition-colors ${
                              isPlaced 
                                ? 'opacity-50 bg-slate-50 dark:bg-slate-800/30 cursor-not-allowed' 
                                : 'cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-slate-800/50'
                            } ${isChecked ? 'bg-indigo-50/80 dark:bg-indigo-950/40' : ''}`}
                          >
                            <td className="py-2.5 px-3.5 text-center">
                              <input 
                                type="checkbox" 
                                disabled={isPlaced} 
                                checked={isChecked} 
                                onChange={() => !isPlaced && toggleStudent(s.id)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                              {s.name}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">
                              {s.nis || '-'}
                            </td>
                            <td className="py-2.5 px-3 font-medium">
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {s.className || '-'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {isPlaced ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/60">
                                  Sudah di {s.placement?.industry?.name || 'Industri Lain'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                                  Siap Ditempatkan
                                </span>
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

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-xs font-semibold text-slate-500">
                Terpilih: <strong className="text-indigo-600 dark:text-indigo-400">{selectedStudentIds.length}</strong> siswa
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentForm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAddStudents}
                  disabled={addingStudents || selectedStudentIds.length === 0}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {addingStudents ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan {selectedStudentIds.length} Siswa ke Kelompok</span>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
