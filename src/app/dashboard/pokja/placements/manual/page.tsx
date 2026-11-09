'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, Search, Building2, CheckCircle2, ChevronLeft, ChevronRight,
  Plus, Trash2, Calendar, FileText, X, CheckSquare, Square,
  Briefcase, GraduationCap, AlertCircle, UserPlus, Sparkles, Filter, Check, Clock,
  RefreshCw, ArrowRight, UserCheck, Layers, MoreVertical, ShieldAlert,
  ChevronDown, ArrowUpRight, School, Info, UserMinus, ShieldCheck
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';
import { formatDateIndonesia } from '@/lib/date-utils';

export default function ManualPlacementPage() {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Core Data
  const [industries, setIndustries] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  // UI / Loading States
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Menginisialisasi...');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selected Group Workspace State
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [groupStudents, setGroupStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [activeTab, setActiveTab] = useState<'enrolled' | 'allocate'>('enrolled');
  const [searchEnrolledTerm, setSearchEnrolledTerm] = useState('');

  // Left Panel (Groups) Filtering
  const [searchGroupTerm, setSearchGroupTerm] = useState('');
  const [groupFilterTab, setGroupFilterTab] = useState<'all' | 'filled' | 'empty'>('all');

  // Allocate (Add Students) Filtering & Selection
  const [searchAllocateTerm, setSearchAllocateTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [allocateStatusFilter, setAllocateStatusFilter] = useState<'unplaced' | 'all'>('unplaced');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [addingStudents, setAddingStudents] = useState(false);
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(null);

  // Form Create Group (Modal)
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [formInd, setFormInd] = useState('');
  const [searchIndTerm, setSearchIndTerm] = useState('');
  const [showIndDropdown, setShowIndDropdown] = useState(false);
  const [formPeriod, setFormPeriod] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Fetch placement groups
  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/pokja/placement-groups');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setGroups(data.data);
        return data.data;
      }
      return [];
    } catch (e) {
      console.error('Error fetching groups:', e);
      return [];
    }
  }, []);

  // Fetch all students
  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch('/api/pokja/students');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setAllStudents(data.data);
          return data.data;
        }
      }
      return [];
    } catch (e) {
      console.error('Error fetching students:', e);
      return [];
    }
  }, []);

  // Load students belonging to a group
  const loadGroupStudents = useCallback(async (group: any) => {
    if (!group?.id) return;
    setLoadingStudents(true);
    try {
      const res = await fetch(`/api/pokja/placement-groups/${group.id}/students`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setGroupStudents(data.data);
      } else {
        setGroupStudents([]);
      }
    } catch (e) {
      console.error('Error fetching group students:', e);
      setGroupStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  // Select a group and automatically load students
  const handleSelectGroup = (group: any) => {
    setSelectedGroup(group);
    setSelectedStudentIds([]);
    setSearchEnrolledTerm('');
    setSearchAllocateTerm('');
    setActiveTab('enrolled');
    loadGroupStudents(group);
  };

  // Full Refresh action
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    setErrorMsg('');
    try {
      const [latestGroups] = await Promise.all([
        fetchGroups(),
        fetchStudents()
      ]);
      if (selectedGroup) {
        const updatedSelected = latestGroups.find((g: any) => g.id === selectedGroup.id);
        if (updatedSelected) {
          setSelectedGroup(updatedSelected);
          await loadGroupStudents(updatedSelected);
        }
      }
      setSuccessMsg('Data penempatan berhasil diperbarui!');
    } catch (err: any) {
      setErrorMsg('Gagal memperbarui data.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial Load
  useEffect(() => {
    const initData = async () => {
      try {
        setLoadingText('Memuat data penempatan...');
        const [loadedGroups, indRes, perRes] = await Promise.all([
          fetchGroups(),
          fetch('/api/pokja/industries').then(res => res.json()).catch(() => ({ success: false, data: [] })),
          fetch('/api/pokja/periods').then(res => res.json()).catch(() => ({ success: false, data: [] })),
          fetchStudents()
        ]);

        if (indRes.success && Array.isArray(indRes.data)) setIndustries(indRes.data);
        if (perRes.success && Array.isArray(perRes.data)) setPeriods(perRes.data);

        // Auto select first group if available
        if (loadedGroups && loadedGroups.length > 0) {
          handleSelectGroup(loadedGroups[0]);
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
        setErrorMsg('Gagal memuat sebagian data awal.');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [fetchGroups, fetchStudents]);

  // Handle period change in create group modal
  const handlePeriodChange = (pid: string) => {
    setFormPeriod(pid);
    const p = periods.find(x => x.id === pid);
    if (p) {
      if (p.startDate) setFormStart(p.startDate.split('T')[0]);
      if (p.endDate) setFormEnd(p.endDate.split('T')[0]);
    }
  };

  // Create placement group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInd || !formPeriod) {
      setErrorMsg('Silakan pilih industri dan periode PKL.');
      return;
    }

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
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan saat membuat kelompok');

      setSuccessMsg('Kelompok baru berhasil dibuat!');
      setShowGroupForm(false);
      setFormInd('');
      setFormPeriod('');
      setFormStart('');
      setFormEnd('');
      setSearchIndTerm('');

      const updatedGroups = await fetchGroups();
      if (data.data?.id) {
        const newlyCreated = updatedGroups.find((g: any) => g.id === data.data.id) || data.data;
        handleSelectGroup(newlyCreated);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuat kelompok');
    } finally {
      setCreatingGroup(false);
    }
  };

  // Delete placement group
  const handleDeleteGroup = async (id: string, groupName: string) => {
    if (!confirm(`Hapus kelompok industri "${groupName}"?\nSemua penempatan siswa dalam kelompok ini akan dibatalkan/direset.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/pokja/placement-groups/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus kelompok');

      setSuccessMsg(`Kelompok "${groupName}" berhasil dihapus.`);
      const updatedGroups = await fetchGroups();
      await fetchStudents();

      if (selectedGroup?.id === id) {
        if (updatedGroups.length > 0) {
          handleSelectGroup(updatedGroups[0]);
        } else {
          setSelectedGroup(null);
          setGroupStudents([]);
        }
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Gagal menghapus kelompok.');
    }
  };

  // Add selected students to current group
  const handleAddStudentsToGroup = async () => {
    if (!selectedGroup) return;
    if (selectedStudentIds.length === 0) {
      setErrorMsg('Pilih minimal satu siswa untuk dialokasikan.');
      return;
    }

    setAddingStudents(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/pokja/placement-groups/${selectedGroup.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedStudentIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menambahkan siswa ke kelompok');

      setSuccessMsg(`Berhasil menambahkan ${selectedStudentIds.length} siswa ke kelompok ${selectedGroup.industry?.name}!`);
      setSelectedStudentIds([]);
      
      // Refresh both group students and all students to keep unplaced stats fresh
      await Promise.all([
        loadGroupStudents(selectedGroup),
        fetchGroups(),
        fetchStudents()
      ]);

      // Automatically switch to Enrolled tab to show results
      setActiveTab('enrolled');
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menambahkan siswa.');
    } finally {
      setAddingStudents(false);
    }
  };

  // Remove a student from group
  const handleRemoveStudent = async (placementId: string, studentName: string) => {
    if (!confirm(`Keluarkan siswa "${studentName}" dari kelompok ${selectedGroup?.industry?.name}?\nStatus penempatan siswa akan di-reset.`)) {
      return;
    }

    setRemovingStudentId(placementId);
    try {
      const res = await fetch(`/api/pokja/placement-groups/${selectedGroup.id}/students?placementId=${placementId}`, { 
        method: 'DELETE' 
      });
      if (!res.ok) throw new Error('Gagal mengeluarkan siswa');

      setSuccessMsg(`Siswa "${studentName}" berhasil dikeluarkan.`);
      await Promise.all([
        loadGroupStudents(selectedGroup),
        fetchGroups(),
        fetchStudents()
      ]);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Gagal menghapus siswa dari kelompok.');
    } finally {
      setRemovingStudentId(null);
    }
  };

  // Toggle single student selection
  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  // Select all visible unplaced students
  const handleSelectAllVisible = () => {
    const unplacedIds = filteredAvailableStudents
      .filter(s => !s.placement?.industryId)
      .map(s => s.id);
    setSelectedStudentIds(unplacedIds);
  };

  // Clear student selection
  const handleClearSelection = () => {
    setSelectedStudentIds([]);
  };

  // Extract unique classes for filter pills
  const availableClasses = useMemo(() => {
    const classesSet = new Set<string>();
    allStudents.forEach(s => {
      if (s.className) classesSet.add(s.className);
    });
    return Array.from(classesSet).sort();
  }, [allStudents]);

  // Filter groups in Left Panel
  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      const q = searchGroupTerm.toLowerCase();
      const matchSearch = 
        (g.industry?.name || '').toLowerCase().includes(q) ||
        (g.period?.name || '').toLowerCase().includes(q) ||
        (g.department || '').toLowerCase().includes(q);
      if (!matchSearch) return false;

      if (groupFilterTab === 'filled') return (g.studentCount || 0) > 0;
      if (groupFilterTab === 'empty') return (g.studentCount || 0) === 0;
      return true;
    });
  }, [groups, searchGroupTerm, groupFilterTab]);

  // Filter available students for assignment
  const filteredAvailableStudents = useMemo(() => {
    return allStudents.filter(s => {
      // Must not already be in the currently selected group
      const inCurrentGroup = groupStudents.some(gs => gs.id === s.id);
      if (inCurrentGroup) return false;

      // Filter by placement status
      const isPlaced = !!s.placement?.industryId;
      if (allocateStatusFilter === 'unplaced' && isPlaced) return false;

      // Filter by class
      if (selectedClassFilter !== 'all' && s.className !== selectedClassFilter) {
        return false;
      }

      // Filter by search query (name, NIS, class)
      const q = searchAllocateTerm.toLowerCase();
      if (!q) return true;
      const matchName = (s.name || '').toLowerCase().includes(q);
      const matchNis = (s.nis || '').toLowerCase().includes(q);
      const matchClass = (s.className || '').toLowerCase().includes(q);
      return matchName || matchNis || matchClass;
    });
  }, [allStudents, groupStudents, allocateStatusFilter, selectedClassFilter, searchAllocateTerm]);

  // Filter enrolled students inside selected group
  const filteredEnrolledStudents = useMemo(() => {
    if (!searchEnrolledTerm.trim()) return groupStudents;
    const q = searchEnrolledTerm.toLowerCase();
    return groupStudents.filter(s => 
      (s.name || '').toLowerCase().includes(q) ||
      (s.nis || '').toLowerCase().includes(q) ||
      (s.className || '').toLowerCase().includes(q)
    );
  }, [groupStudents, searchEnrolledTerm]);

  // Summary Metrics & Stats
  const stats = useMemo(() => {
    const totalGroups = groups.length;
    const totalPlaced = allStudents.filter(s => !!s.placement?.industryId).length;
    const unplacedStudents = allStudents.filter(s => !s.placement?.industryId).length;
    const uniqueIndustries = new Set(groups.map(g => g.industryId)).size;
    const totalStudents = allStudents.length;
    const placementRate = totalStudents > 0 ? Math.round((totalPlaced / totalStudents) * 100) : 0;

    return {
      totalGroups,
      totalPlaced,
      unplacedStudents,
      uniqueIndustries,
      totalStudents,
      placementRate
    };
  }, [groups, allStudents]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
            <Sparkles className="w-6 h-6 text-indigo-500 absolute inset-0 m-auto animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base tracking-tight">Memuat Antarmuka Penempatan</h3>
            <p className="text-xs text-indigo-500 font-semibold animate-pulse">{loadingText}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50/70 text-slate-900'
    }`}>

      {/* ============================================================== */}
      {/* 1. TOP HEADER & BREADCRUMB                                      */}
      {/* ============================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Link 
              href="/dashboard/pokja" 
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Dashboard Pokja</span>
            </Link>
            <span>/</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">Penempatan Manual</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 text-white shadow-lg shadow-indigo-600/25">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-display text-slate-900 dark:text-white">
                Penempatan Manual PKL
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Kelola kelompok industri mitra, alokasikan siswa secara terarah, dan pantau ketersediaan kuota siswa.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start md:self-center">
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className={`p-2.5 rounded-2xl border transition-all ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700' 
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-sm'
            }`}
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
          </button>

          <button
            onClick={() => setShowGroupForm(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Kelompok Baru</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FLASH MESSAGES (Error / Success)                              */}
      {/* ============================================================== */}
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
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="p-1 text-emerald-400 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. STATS & KPI OVERVIEW CARDS                                   */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Kelompok */}
        <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
          isDark 
            ? 'bg-gradient-to-b from-slate-900/90 to-slate-900/50 border-slate-800/80' 
            : 'bg-white border-slate-200/90 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Kelompok</span>
            <div className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-display tracking-tight">{stats.totalGroups}</span>
            <span className="text-xs text-slate-400">kelompok</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {stats.uniqueIndustries} perusahaan mitra aktif
          </p>
        </div>

        {/* Card 2: Siswa Ditempatkan */}
        <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
          isDark 
            ? 'bg-gradient-to-b from-slate-900/90 to-slate-900/50 border-slate-800/80' 
            : 'bg-white border-slate-200/90 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Siswa Ditempatkan</span>
            <div className="p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-display tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.totalPlaced}
            </span>
            <span className="text-xs text-slate-400">/ {stats.totalStudents} siswa</span>
          </div>
          <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${stats.placementRate}%` }}
            />
          </div>
        </div>

        {/* Card 3: Belum Ditempatkan */}
        <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
          isDark 
            ? 'bg-gradient-to-b from-slate-900/90 to-slate-900/50 border-slate-800/80' 
            : 'bg-white border-slate-200/90 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Menunggu Alokasi</span>
            <div className="p-2 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-display tracking-tight text-amber-600 dark:text-amber-400">
              {stats.unplacedStudents}
            </span>
            <span className="text-xs text-slate-400">siswa</span>
          </div>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-1 font-semibold">
            Siap ditempatkan ke industri
          </p>
        </div>

        {/* Card 4: Jurusan / Periode Aktif */}
        <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
          isDark 
            ? 'bg-gradient-to-b from-slate-900/90 to-slate-900/50 border-slate-800/80' 
            : 'bg-white border-slate-200/90 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Lingkup Jurusan</span>
            <div className="p-2 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-base sm:text-lg font-bold font-display truncate text-purple-600 dark:text-purple-400">
              {(session?.user as any)?.department || 'Semua Jurusan'}
            </p>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {periods.length} periode PKL tersedia
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MAIN WORKSPACE: SPLIT SCREEN (MASTER-DETAIL)                 */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ============================================================== */}
        {/* PANEL KIRI: DAFTAR KELOMPOK INDUSTRI (4 Kolom)                 */}
        {/* ============================================================== */}
        <div className={`lg:col-span-4 rounded-3xl border flex flex-col ${
          isDark ? 'bg-slate-900/70 border-slate-800/90' : 'bg-white border-slate-200/90'
        } shadow-sm overflow-hidden`}>
          
          {/* Header Panel Kiri */}
          <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-500" />
                <h2 className="font-extrabold text-sm sm:text-base tracking-tight font-display">
                  Kelompok Industri
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                {filteredGroups.length}
              </span>
            </div>

            {/* Pencarian Kelompok */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari industri / periode..." 
                value={searchGroupTerm} 
                onChange={e => setSearchGroupTerm(e.target.value)} 
                className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark 
                    ? 'bg-slate-800/80 border-slate-700/80 text-white placeholder-slate-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                }`} 
              />
              {searchGroupTerm && (
                <button 
                  onClick={() => setSearchGroupTerm('')} 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills: Semua / Terisi / Kosong */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setGroupFilterTab('all')}
                className={`flex-1 py-1 rounded-lg transition-all text-center ${
                  groupFilterTab === 'all'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white font-bold shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setGroupFilterTab('filled')}
                className={`flex-1 py-1 rounded-lg transition-all text-center ${
                  groupFilterTab === 'filled'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white font-bold shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                Terisi
              </button>
              <button
                onClick={() => setGroupFilterTab('empty')}
                className={`flex-1 py-1 rounded-lg transition-all text-center ${
                  groupFilterTab === 'empty'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white font-bold shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                Kosong
              </button>
            </div>
          </div>

          {/* List Scroll Area Kelompok */}
          <div className="p-3 sm:p-4 space-y-2.5 max-h-[680px] overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <Building2 className="w-6 h-6 opacity-40" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Kelompok tidak ditemukan</p>
                  <p className="text-[11px] text-slate-400">Coba ubah kata kunci pencarian atau buat kelompok baru.</p>
                </div>
                <button
                  onClick={() => setShowGroupForm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300 text-xs font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Buat Kelompok Baru</span>
                </button>
              </div>
            ) : (
              filteredGroups.map(g => {
                const isSelected = selectedGroup?.id === g.id;
                const studentCount = g.studentCount || 0;

                return (
                  <div 
                    key={g.id} 
                    onClick={() => handleSelectGroup(g)} 
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 relative group ${
                      isSelected 
                        ? (isDark 
                            ? 'border-indigo-500 bg-gradient-to-r from-indigo-950/70 via-purple-950/40 to-slate-900 shadow-md ring-1 ring-indigo-500/50' 
                            : 'border-indigo-500 bg-gradient-to-r from-indigo-50/90 via-purple-50/30 to-white shadow-md shadow-indigo-100 ring-1 ring-indigo-500/40') 
                        : (isDark 
                            ? 'border-slate-800/80 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-800/40' 
                            : 'border-slate-200/80 hover:border-slate-300 bg-white hover:bg-slate-50/80')
                    }`}
                  >
                    {/* Active Indicator Bar */}
                    {isSelected && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-r-full" />
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold text-xs sm:text-sm line-clamp-1 transition-colors ${
                            isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'
                          }`}>
                            {g.industry?.name}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[140px]">{g.period?.name || 'Periode PKL'}</span>
                          </span>
                          {g.department && (
                            <>
                              <span>&bull;</span>
                              <span className="truncate max-w-[100px] text-purple-600 dark:text-purple-400 font-semibold">
                                {g.department}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Delete Group Action */}
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleDeleteGroup(g.id, g.industry?.name); 
                        }} 
                        className="text-slate-300 hover:text-rose-600 dark:text-slate-600 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors opacity-0 group-hover:opacity-100"
                        title="Hapus Kelompok Ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Bottom Info: Tanggal & Student Count Badge */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>
                          {g.startDate ? g.startDate.split('T')[0] : 'Tgl Belum Diset'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                          studentCount > 0 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60' 
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          <Users className="w-3 h-3" />
                          <span>{studentCount} Siswa</span>
                        </span>

                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${
                          isSelected ? 'text-indigo-600 dark:text-indigo-400 translate-x-0.5' : 'text-slate-300 group-hover:translate-x-0.5'
                        }`} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* PANEL KANAN: WORKSPACE KELOMPOK TERPILIH (8 Kolom)             */}
        {/* ============================================================== */}
        <div className={`lg:col-span-8 rounded-3xl border flex flex-col ${
          isDark ? 'bg-slate-900/70 border-slate-800/90' : 'bg-white border-slate-200/90'
        } shadow-sm overflow-hidden min-h-[640px]`}>

          {!selectedGroup ? (
            /* Empty State: Belum ada kelompok yang dipilih */
            <div className="flex-1 p-12 sm:p-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 shadow-inner">
                <Building2 className="w-10 h-10 text-indigo-500 opacity-60" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="font-bold text-lg font-display">Pilih Kelompok Industri</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pilih salah satu kelompok mitra di sebelah kiri untuk melihat siswa terdaftar atau mulai mengalokasikan siswa baru secara mudah.
                </p>
              </div>
              <button
                onClick={() => setShowGroupForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Kelompok Baru</span>
              </button>
            </div>
          ) : (
            /* Active Group Workspace */
            <div className="flex-1 flex flex-col">
              
              {/* Group Hero Header Banner */}
              <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border-b border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200/60 dark:border-indigo-800/60">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Mitra Industri Aktif</span>
                      </span>

                      {selectedGroup.department && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200/50 dark:border-purple-800/50">
                          {selectedGroup.department}
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">
                      {selectedGroup.industry?.name}
                    </h2>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>Periode: <strong>{selectedGroup.period?.name || '-'}</strong></span>
                      </span>

                      <span>&bull;</span>

                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {formatDateIndonesia(selectedGroup.startDate)} &mdash; {formatDateIndonesia(selectedGroup.endDate)}
                        </span>
                      </span>

                      {selectedGroup.industry?.address && (
                        <>
                          <span>&bull;</span>
                          <span className="truncate max-w-[240px]" title={selectedGroup.industry.address}>
                            📍 {selectedGroup.industry.address}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Top Action Pills: Quick Switch between Enrolled & Allocate */}
                  <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
                    <button
                      onClick={() => setActiveTab('enrolled')}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'enrolled'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Siswa Terdaftar</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        activeTab === 'enrolled'
                          ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        {groupStudents.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab('allocate')}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'allocate'
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Alokasikan Siswa</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ============================================================== */}
              {/* TAB 1: SISWA TERDAFTAR DI KELOMPOK INI                        */}
              {/* ============================================================== */}
              {activeTab === 'enrolled' && (
                <div className="flex-1 p-5 sm:p-6 space-y-4 flex flex-col">
                  
                  {/* Toolbar Siswa Terdaftar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-xs sm:text-sm flex items-center gap-2">
                        <span>Anggota Kelompok Terdaftar</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                          {groupStudents.length} Siswa
                        </span>
                      </h3>
                    </div>

                    {/* Search inside group */}
                    {groupStudents.length > 0 && (
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cari siswa di kelompok ini..."
                          value={searchEnrolledTerm}
                          onChange={e => setSearchEnrolledTerm(e.target.value)}
                          className={`w-full pl-9 pr-8 py-1.5 rounded-xl text-xs border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        />
                        {searchEnrolledTerm && (
                          <button onClick={() => setSearchEnrolledTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* List Container */}
                  {loadingStudents ? (
                    <div className="flex-1 py-16 flex items-center justify-center text-xs text-slate-400 gap-2">
                      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Memuat data siswa terdaftar...</span>
                    </div>
                  ) : groupStudents.length === 0 ? (
                    /* Empty Enrolled State */
                    <div className="flex-1 text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-500">
                        <UserPlus className="w-7 h-7" />
                      </div>
                      <div className="space-y-1 max-w-sm">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          Kelompok Ini Belum Memiliki Siswa
                        </p>
                        <p className="text-xs text-slate-400">
                          Mulai tambahkan siswa yang belum memiliki tempat PKL ke industri {selectedGroup.industry?.name}.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('allocate')}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Mulai Alokasikan Siswa Sekarang</span>
                      </button>
                    </div>
                  ) : filteredEnrolledStudents.length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-400">
                      Tidak ada siswa yang cocok dengan pencarian "{searchEnrolledTerm}".
                    </div>
                  ) : (
                    <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className={`text-[11px] uppercase tracking-wider font-bold ${
                            isDark ? 'bg-slate-800/80 text-slate-400' : 'bg-slate-100/90 text-slate-600'
                          }`}>
                            <tr>
                              <th className="py-3 px-4 w-12 text-center">No</th>
                              <th className="py-3 px-4">Nama Siswa</th>
                              <th className="py-3 px-4">NIS</th>
                              <th className="py-3 px-4">Kelas</th>
                              <th className="py-3 px-4">Jurusan</th>
                              <th className="py-3 px-4 text-center w-24">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredEnrolledStudents.map((s, idx) => (
                              <tr 
                                key={s.id || s.placementId || idx} 
                                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                              >
                                <td className="py-3.5 px-4 text-center text-slate-400 font-medium">
                                  {idx + 1}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                                      {s.name ? s.name.substring(0, 2).toUpperCase() : 'SW'}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-900 dark:text-white leading-tight">
                                        {s.name}
                                      </p>
                                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>Aktif Ditempatkan</span>
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                                  {s.nis || '-'}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
                                    {s.className || '-'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                                  {s.department || '-'}
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <button 
                                    onClick={() => handleRemoveStudent(s.placementId, s.name)}
                                    disabled={removingStudentId === s.placementId}
                                    className="inline-flex items-center justify-center p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition disabled:opacity-50"
                                    title="Keluarkan dari Kelompok"
                                  >
                                    {removingStudentId === s.placementId ? (
                                      <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
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
              )}

              {/* ============================================================== */}
              {/* TAB 2: ALOKASIKAN SISWA BARU (INTEGRATED INLINE WORKSPACE)    */}
              {/* ============================================================== */}
              {activeTab === 'allocate' && (
                <div className="flex-1 p-5 sm:p-6 space-y-4 flex flex-col relative">
                  
                  {/* Allocation Header Banner */}
                  <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <h4 className="font-bold text-xs sm:text-sm text-indigo-950 dark:text-indigo-200">
                          Alokasikan Siswa ke {selectedGroup.industry?.name}
                        </h4>
                      </div>
                      <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                        Pilih siswa di bawah ini dengan mencentang kotak seleksi, lalu klik tombol Simpan.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleSelectAllVisible}
                        className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 shadow-sm transition"
                      >
                        Pilih Semua yang Tampil
                      </button>
                      {selectedStudentIds.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearSelection}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        >
                          Reset ({selectedStudentIds.length})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setAllocateStatusFilter('unplaced')}
                        className={`px-3 py-1.5 rounded-xl transition-all ${
                          allocateStatusFilter === 'unplaced'
                            ? 'bg-indigo-600 text-white font-bold shadow-sm'
                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        Belum Ditempatkan ({allStudents.filter(s => !s.placement?.industryId).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllocateStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-xl transition-all ${
                          allocateStatusFilter === 'all'
                            ? 'bg-indigo-600 text-white font-bold shadow-sm'
                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        Semua Siswa
                      </button>
                    </div>

                    {/* Class Selector & Search Input */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {/* Filter Kelas */}
                      <select
                        value={selectedClassFilter}
                        onChange={e => setSelectedClassFilter(e.target.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                          isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="all">Semua Kelas</option>
                        {availableClasses.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>

                      {/* Search Input */}
                      <div className="relative flex-1 sm:w-60">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cari nama, NIS..."
                          value={searchAllocateTerm}
                          onChange={e => setSearchAllocateTerm(e.target.value)}
                          className={`w-full pl-9 pr-7 py-1.5 rounded-xl text-xs border transition ${
                            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        />
                        {searchAllocateTerm && (
                          <button onClick={() => setSearchAllocateTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Available Students Table */}
                  <div className="flex-1 overflow-y-auto max-h-[460px] border border-slate-200/90 dark:border-slate-800 rounded-2xl">
                    {filteredAvailableStudents.length === 0 ? (
                      <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                        <Users className="w-8 h-8 mx-auto opacity-30" />
                        <p className="font-bold text-slate-600 dark:text-slate-300">Tidak ada siswa yang sesuai kriteria.</p>
                        <p className="text-[11px]">Silakan sesuaikan filter kelas atau pencarian nama.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className={`text-[10px] uppercase font-bold tracking-wider sticky top-0 z-10 ${
                          isDark ? 'bg-slate-800/95 text-slate-400 backdrop-blur-sm' : 'bg-slate-100/95 text-slate-600 backdrop-blur-sm'
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
                                onClick={() => !isPlaced && toggleStudentSelection(s.id)} 
                                className={`transition-colors ${
                                  isPlaced 
                                    ? 'opacity-50 bg-slate-50 dark:bg-slate-800/30 cursor-not-allowed' 
                                    : 'cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-slate-800/50'
                                } ${isChecked ? 'bg-indigo-50/80 dark:bg-indigo-950/40 font-semibold' : ''}`}
                              >
                                <td className="py-2.5 px-3.5 text-center">
                                  <input 
                                    type="checkbox" 
                                    disabled={isPlaced} 
                                    checked={isChecked} 
                                    onChange={() => !isPlaced && toggleStudentSelection(s.id)}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                                      {s.name ? s.name.substring(0, 1).toUpperCase() : 'S'}
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">{s.name}</span>
                                  </div>
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
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Siap Ditempatkan</span>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* STICKY BOTTOM ACTION BAR (When Students Selected) */}
                  <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-center justify-between gap-3 ${
                    selectedStudentIds.length > 0 
                      ? 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white shadow-xl shadow-indigo-600/30' 
                      : (isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-100 border-slate-200 text-slate-600')
                  }`}>
                    <div className="flex items-center gap-2.5 text-xs">
                      <div className={`p-1.5 rounded-xl ${selectedStudentIds.length > 0 ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <span className="font-bold">
                        {selectedStudentIds.length > 0 ? (
                          <span>{selectedStudentIds.length} Siswa Terpilih untuk Dialokasikan</span>
                        ) : (
                          <span>Centang siswa di tabel atas untuk mengalokasikan ke kelompok ini</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setActiveTab('enrolled')}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                          selectedStudentIds.length > 0 ? 'text-white/80 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Batal
                      </button>

                      <button
                        type="button"
                        onClick={handleAddStudentsToGroup}
                        disabled={addingStudents || selectedStudentIds.length === 0}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                          selectedStudentIds.length > 0
                            ? 'bg-white text-indigo-700 hover:bg-indigo-50 shadow-md shadow-black/10'
                            : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {addingStudents ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            <span>Menyimpan...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>Tambahkan ke {selectedGroup.industry?.name}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

      </div>

      {/* ============================================================== */}
      {/* MODAL: BUAT KELOMPOK PENEMPATAN BARU                            */}
      {/* ============================================================== */}
      {showGroupForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`relative max-w-lg w-full rounded-3xl border shadow-2xl overflow-hidden transition-all animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
          }`}>
            
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold font-display text-base">Buat Kelompok Baru</h3>
                  <p className="text-xs text-indigo-100">Kaitkan industri mitra dengan periode PKL</p>
                </div>
              </div>
              <button 
                onClick={() => setShowGroupForm(false)} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
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
                  className={`w-full p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition text-xs font-medium ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                  onClick={() => setShowIndDropdown(true)}
                >
                  <div className="flex items-center gap-2.5 flex-1">
                    <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    <input 
                      type="text" 
                      required={!formInd}
                      placeholder={formInd ? industries.find(i => i.id === formInd)?.name : "Ketik untuk mencari industri mitra..."} 
                      value={searchIndTerm}
                      onChange={(e) => {
                        setSearchIndTerm(e.target.value);
                        setShowIndDropdown(true);
                      }}
                      onFocus={() => setShowIndDropdown(true)}
                      className="bg-transparent outline-none w-full text-xs"
                    />
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showIndDropdown ? 'rotate-180' : ''}`} />
                </div>

                {/* Dropdown List */}
                {showIndDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowIndDropdown(false)} />
                    <div className={`absolute z-20 mt-1.5 w-full max-h-52 overflow-y-auto border rounded-2xl shadow-2xl text-xs ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}>
                      {industries
                        .filter(i => (i.name || '').toLowerCase().includes((searchIndTerm || '').toLowerCase()))
                        .map(ind => (
                          <div 
                            key={ind.id} 
                            className={`px-4 py-3 cursor-pointer flex items-center justify-between transition ${
                              isDark ? 'hover:bg-slate-700' : 'hover:bg-indigo-50'
                            } ${formInd === ind.id ? 'font-bold text-indigo-500 bg-indigo-50/50 dark:bg-slate-700/60' : ''}`}
                            onClick={() => {
                              setFormInd(ind.id);
                              setSearchIndTerm(ind.name);
                              setShowIndDropdown(false);
                            }}
                          >
                            <div className="space-y-0.5">
                              <p className="font-bold">{ind.name}</p>
                              {ind.address && <p className="text-[10px] text-slate-400 truncate max-w-xs">{ind.address}</p>}
                            </div>
                            {formInd === ind.id && <Check className="w-4 h-4 text-indigo-500" />}
                          </div>
                        ))}
                      {industries.filter(i => (i.name || '').toLowerCase().includes((searchIndTerm || '').toLowerCase())).length === 0 && (
                        <div className="px-4 py-4 text-slate-400 text-center">
                          Industri tidak ditemukan
                        </div>
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
                  className={`w-full p-3 rounded-2xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
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
                  <p className="text-[11px] text-indigo-500 mt-1 font-semibold flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    <span>Jurusan: {periods.find(p => p.id === formPeriod)?.department || 'Semua Jurusan'}</span>
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
                    className={`w-full p-2.5 rounded-2xl border text-xs ${
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
                    className={`w-full p-2.5 rounded-2xl border text-xs ${
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
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={creatingGroup || !formInd || !formPeriod} 
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {creatingGroup ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

    </div>
  );
}
