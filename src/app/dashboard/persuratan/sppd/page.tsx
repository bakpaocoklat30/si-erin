'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/app/theme-provider';
import {
  FileText,
  CheckCircle2,
  Search,
  Loader2,
  Download,
  Upload,
  Eye,
  FileSignature,
  Printer,
  Sparkles,
  ExternalLink,
  X,
  CheckSquare,
  Calendar,
  Layers,
  Building,
  Users,
  Save,
  AlertCircle,
  Check,
  UploadCloud,
} from 'lucide-react';
import {
  generateSuratTugasHtml,
  generateSppdHtml,
  formatIndonesianDateRange,
  calculateDurationDays,
} from '@/lib/monitoring-templates';

function getAssignmentType(purpose?: string | null) {
  const p = (purpose || '').toLowerCase();
  if (p.includes('penerjunan') || p.includes('pengantaran')) {
    return {
      type: 'PENERJUNAN',
      label: 'Penerjunan',
      icon: '🚚',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
    };
  }
  if (p.includes('penarikan') || p.includes('penjemputan')) {
    return {
      type: 'PENARIKAN',
      label: 'Penarikan',
      icon: '🎓',
      badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30'
    };
  }
  return {
    type: 'MONITORING',
    label: 'Monitoring',
    icon: '📋',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30'
  };
}

export default function PersuratanSppdPage() {
  const { data: session } = useSession();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [schoolSetting, setSchoolSetting] = useState<any>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [purposeFilter, setPurposeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Checklist Selection for Bulk Download
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // TTE Mode Toggle per Task & per Document Type (Default: ON / true)
  // { [taskId]: { tugas: boolean, sppd: boolean } }
  const [taskTteMap, setTaskTteMap] = useState<Record<string, { tugas: boolean; sppd: boolean }>>({});

  // Letter Numbers Local State (for editing and saving)
  // { [taskId]: { letterNumber: string, sppdNumber: string, isModified: boolean } }
  const [taskNumberMap, setTaskNumberMap] = useState<Record<string, { letterNumber: string; sppdNumber: string; isModified: boolean }>>({});
  const [savingNumberId, setSavingNumberId] = useState<string | null>(null);

  // Collective Bulk TTE Mode (Default true: ON)
  const [bulkUseTte, setBulkUseTte] = useState(true);

  // Preview Modal State
  
  // Modal Beri Nomor Sekaligus State
  const [bulkNumberModal, setBulkNumberModal] = useState<{
    isOpen: boolean;
    letterNumber: string;
    sppdNumber: string;
  }>({
    isOpen: false,
    letterNumber: '',
    sppdNumber: '',
  });
  const [submittingBulkNumber, setSubmittingBulkNumber] = useState(false);

  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    type: 'SURAT_TUGAS' | 'SPPD';
    task: any | null;
    useTteTags: boolean;
  }>({
    isOpen: false,
    type: 'SURAT_TUGAS',
    task: null,
    useTteTags: true,
  });

  // Upload Modal State
  const [uploadModal, setUploadModal] = useState<{ isOpen: boolean; task: any; type: 'TUGAS' | 'SPPD' | null }>({
    isOpen: false,
    task: null,
    type: null
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // 🌟 State Unggah Massal Hasil TTE
  const [bulkUploadModal, setBulkUploadModal] = useState<{
    isOpen: boolean;
    file: File | null;
    mode: 'AUTO' | 'TUGAS' | 'SPPD';
    analyzing: boolean;
    committing: boolean;
    analysisResult: any | null;
    commitResult: any | null;
  }>({
    isOpen: false,
    file: null,
    mode: 'AUTO',
    analyzing: false,
    committing: false,
    analysisResult: null,
    commitResult: null,
  });

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/persuratan/sppd');
      const json = await res.json();
      if (json.success) {
        setTasks(json.data || []);
        if (json.departments) setDepartments(json.departments);
        if (json.schoolSetting) setSchoolSetting(json.schoolSetting);

        // Initialize number map with current numbers
        const nMap: Record<string, { letterNumber: string; sppdNumber: string; isModified: boolean }> = {};
        (json.data || []).forEach((t: any) => {
          nMap[t.id] = {
            letterNumber: t.letterNumber === '${nomor_naskah}' ? '' : (t.letterNumber || ''),
            sppdNumber: t.sppdNumber === '${nomor_naskah}' ? '' : (t.sppdNumber || ''),
            isModified: false,
          };
        });
        setTaskNumberMap(nMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // TTE Toggle Helper
  const isTteActive = (taskId: string, type: 'tugas' | 'sppd'): boolean => {
    return taskTteMap[taskId]?.[type] ?? true; // Default ON
  };

  const handleToggleTte = (taskId: string, type: 'tugas' | 'sppd') => {
    setTaskTteMap((prev) => {
      const current = prev[taskId] ?? { tugas: true, sppd: true };
      return {
        ...prev,
        [taskId]: {
          ...current,
          [type]: !current[type],
        },
      };
    });
  };

  // Letter Number Change Handler
  const handleNumberChange = (taskId: string, field: 'letterNumber' | 'sppdNumber', value: string) => {
    setTaskNumberMap((prev) => {
      const current = prev[taskId] || { letterNumber: '', sppdNumber: '', isModified: false };
      return {
        ...prev,
        [taskId]: {
          ...current,
          [field]: value,
          isModified: true,
        },
      };
    });
  };

  // Save Letter Numbers to Database via PUT
  const handleSaveNumbers = async (taskId: string) => {
    const entry = taskNumberMap[taskId];
    if (!entry) return;

    setSavingNumberId(taskId);
    try {
      const res = await fetch(`/api/pokja/monitoring/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          letterNumber: entry.letterNumber.trim() !== '' ? entry.letterNumber.trim() : '${nomor_naskah}',
          sppdNumber: entry.sppdNumber.trim() !== '' ? entry.sppdNumber.trim() : '${nomor_naskah}',
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setTaskNumberMap((prev) => ({
          ...prev,
          [taskId]: {
            ...prev[taskId],
            isModified: false,
          },
        }));
        // Update local tasks array
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  letterNumber: entry.letterNumber.trim() || '${nomor_naskah}',
                  sppdNumber: entry.sppdNumber.trim() || '${nomor_naskah}',
                }
              : t
          )
        );
      } else {
        alert(json.error || 'Gagal menyimpan nomor naskah.');
      }
    } catch (e) {
      console.error(e);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setSavingNumberId(null);
    }
  };

  // Save single number on the fly if prompted
  const handleSaveSingleNumber = async (taskId: string, type: 'tugas' | 'sppd', value: string) => {
    try {
      const payload: any = {};
      if (type === 'tugas') payload.letterNumber = value;
      else payload.sppdNumber = value;

      const res = await fetch(`/api/pokja/monitoring/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setTaskNumberMap((prev) => {
          const cur = prev[taskId] || { letterNumber: '', sppdNumber: '', isModified: false };
          return {
            ...prev,
            [taskId]: {
              ...cur,
              [type === 'tugas' ? 'letterNumber' : 'sppdNumber']: value,
              isModified: false,
            },
          };
        });
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...payload } : t))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Safe Download Handler with Number Check
  const handleDownloadClick = async (task: any, type: 'tugas' | 'sppd') => {
    let currentNumber =
      type === 'tugas'
        ? (taskNumberMap[task.id]?.letterNumber !== undefined
            ? taskNumberMap[task.id].letterNumber
            : task.letterNumber)
        : (taskNumberMap[task.id]?.sppdNumber !== undefined
            ? taskNumberMap[task.id].sppdNumber
            : task.sppdNumber);

    if (
      !currentNumber ||
      currentNumber.trim() === '' ||
      currentNumber.trim() === '${nomor_naskah}'
    ) {
      const inputVal = prompt(
        `⚠️ Nomor ${type === 'tugas' ? 'Surat Tugas' : 'SPPD'} belum diisi!\n\n` +
          `Silakan masukkan nomor naskah resmi untuk ${task.teacher.name} ke ${task.industry.name}:`,
        type === 'tugas' ? '800.1.11.1/' : '090/'
      );

      if (!inputVal || inputVal.trim() === '') {
        alert('Pengunduhan dibatalkan karena nomor naskah wajib diisi.');
        return;
      }

      await handleSaveSingleNumber(task.id, type, inputVal.trim());
      currentNumber = inputVal.trim();
    } else if (taskNumberMap[task.id]?.isModified) {
      await handleSaveNumbers(task.id);
    }

    const tteState = isTteActive(task.id, type);
    window.location.href = `/api/pokja/monitoring/${task.id}/download-docx?type=${type}&tte=${tteState}`;
  };

  // Safe Preview Handler with Number Check
  const handleOpenPreview = async (task: any, type: 'SURAT_TUGAS' | 'SPPD') => {
    if (taskNumberMap[task.id]?.isModified) {
      await handleSaveNumbers(task.id);
    }

    // Refresh task with latest numbers for accurate preview
    const updatedTask = {
      ...task,
      letterNumber:
        taskNumberMap[task.id]?.letterNumber || task.letterNumber || '${nomor_naskah}',
      sppdNumber:
        taskNumberMap[task.id]?.sppdNumber || task.sppdNumber || '${nomor_naskah}',
    };

    const docTypeKey = type === 'SURAT_TUGAS' ? 'tugas' : 'sppd';
    const tteState = isTteActive(task.id, docTypeKey);

    setPreviewModal({
      isOpen: true,
      type,
      task: updatedTask,
      useTteTags: tteState,
    });
  };

  // Filter Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Search Query
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        t.industry.name.toLowerCase().includes(q) ||
        t.teacher.name.toLowerCase().includes(q) ||
        (t.purpose && t.purpose.toLowerCase().includes(q));

      // 2. Purpose Filter
      const pType = getAssignmentType(t.purpose).type;
      const matchesPurpose = purposeFilter === 'ALL' || pType === purposeFilter;

      // 3. Status Filter
      let matchesStatus = true;
      if (statusFilter === 'PROSES_TTE') {
        matchesStatus = t.status === 'MENUNGGU_TTE' || t.status === 'PROSES_TTE';
      } else if (statusFilter === 'TERBIT_TTE') {
        matchesStatus = t.status === 'SELESAI_TTE' || t.status === 'TERBIT_TTE';
      }

      // 4. Department Filter
      let matchesDept = true;
      if (departmentFilter !== 'ALL') {
        const teacherDept = (t.teacher?.department || '').toLowerCase();
        const placementDepts = (t.industry?.placements || []).map((p: any) =>
          (p.student?.department || '').toLowerCase()
        );
        const targetDept = departmentFilter.toLowerCase();
        matchesDept =
          teacherDept === targetDept ||
          teacherDept.includes(targetDept) ||
          placementDepts.some((d: string) => d === targetDept || d.includes(targetDept));
      }

      return matchesSearch && matchesPurpose && matchesStatus && matchesDept;
    });
  }, [tasks, searchQuery, purposeFilter, statusFilter, departmentFilter]);

  // Bulk Selection Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTaskIds(filteredTasks.map((t) => t.id));
    } else {
      setSelectedTaskIds([]);
    }
  };

  const handleToggleSelect = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  // Safe Bulk Download with Number Check
  
  const handleApplyBulkNumbers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTaskIds.length === 0) return;
    if (!bulkNumberModal.letterNumber.trim() && !bulkNumberModal.sppdNumber.trim()) {
      alert('Masukkan setidaknya Nomor Surat Tugas atau Nomor SPPD.');
      return;
    }

    setSubmittingBulkNumber(true);
    try {
      const res = await fetch('/api/persuratan/sppd/bulk-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedTaskIds,
          letterNumber: bulkNumberModal.letterNumber.trim() || undefined,
          sppdNumber: bulkNumberModal.sppdNumber.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        // Update local state
        setTaskNumberMap((prev) => {
          const next = { ...prev };
          selectedTaskIds.forEach((id) => {
            next[id] = {
              letterNumber: bulkNumberModal.letterNumber.trim() || prev[id]?.letterNumber || '',
              sppdNumber: bulkNumberModal.sppdNumber.trim() || prev[id]?.sppdNumber || '',
              isModified: false,
            };
          });
          return next;
        });

        setTasks((prev) =>
          prev.map((t) => {
            if (selectedTaskIds.includes(t.id)) {
              return {
                ...t,
                ...(bulkNumberModal.letterNumber.trim() && { letterNumber: bulkNumberModal.letterNumber.trim() }),
                ...(bulkNumberModal.sppdNumber.trim() && { sppdNumber: bulkNumberModal.sppdNumber.trim() }),
              };
            }
            return t;
          })
        );

        alert(json.message || 'Nomor naskah berhasil diterapkan ke seluruh penugasan terpilih!');
        setBulkNumberModal({ isOpen: false, letterNumber: '', sppdNumber: '' });
      } else {
        alert(json.error || 'Gagal menerapkan nomor surat massal');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan');
    } finally {
      setSubmittingBulkNumber(false);
    }
  };

  const handleBulkDownload = async (type: 'tugas' | 'sppd') => {
    if (selectedTaskIds.length === 0) {
      alert('Pilih setidaknya satu penugasan terlebih dahulu.');
      return;
    }

    // Check if any selected task is missing its letter number
    const missing = selectedTaskIds.filter((id) => {
      const t = tasks.find((item) => item.id === id);
      const num =
        type === 'tugas'
          ? (taskNumberMap[id]?.letterNumber !== undefined
              ? taskNumberMap[id].letterNumber
              : t?.letterNumber)
          : (taskNumberMap[id]?.sppdNumber !== undefined
              ? taskNumberMap[id].sppdNumber
              : t?.sppdNumber);
      return !num || num.trim() === '' || num.trim() === '${nomor_naskah}';
    });

    if (missing.length > 0) {
      alert(
        `⚠️ PERHATIAN: Terdapat ${missing.length} penugasan yang nomor ${
          type === 'tugas' ? 'Surat Tugas' : 'SPPD'
        }-nya masih kosong!\n\n` +
          'Mohon lengkapi seluruh nomor naskah pada kartu penugasan terpilih terlebih dahulu sebelum mengunduh berkas kolektif.'
      );
      return;
    }

    // Auto-save any modified numbers
    for (const id of selectedTaskIds) {
      if (taskNumberMap[id]?.isModified) {
        await handleSaveNumbers(id);
      }
    }

    // Determine TTE status for bulk download:
    // If bulkUseTte is false, or if all selected tasks have TTE turned off for this type
    const anySelectedTteOn = selectedTaskIds.some((id) => isTteActive(id, type));
    const finalTte = bulkUseTte && anySelectedTteOn;

    const url = `/api/persuratan/sppd/download-bulk?type=${type}&ids=${selectedTaskIds.join(',')}&tte=${finalTte}`;
    window.location.href = url;
  };

  // Preview HTML
  const previewHtml = useMemo(() => {
    if (!previewModal.task) return '';
    return previewModal.type === 'SURAT_TUGAS'
      ? generateSuratTugasHtml(previewModal.task, {
          schoolSetting,
          useTteTags: previewModal.useTteTags,
        })
      : generateSppdHtml(previewModal.task, {
          schoolSetting,
          useTteTags: previewModal.useTteTags,
        });
  }, [previewModal, schoolSetting]);

  // Print Document
  const handlePrintDocument = () => {
    if (!previewHtml) return;
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(previewHtml);
      printWin.document.close();
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || !uploadModal.task || !uploadModal.type) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('id', uploadModal.task.id);
      formData.append('type', uploadModal.type);

      const res = await fetch('/api/persuratan/sppd/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (res.ok && json.success) {
        alert(`Berhasil mengunggah dokumen ${uploadModal.type}`);
        setUploadModal({ isOpen: false, task: null, type: null });
        setSelectedFile(null);
        fetchTasks();
      } else {
        alert(json.error || 'Gagal mengunggah dokumen');
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan jaringan');
    } finally {
      setUploading(false);
    }
  };

  // 🌟 Bulk Upload Handlers
  const handleBulkUploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBulkUploadModal((prev) => ({
        ...prev,
        file: e.target.files![0],
        analysisResult: null,
        commitResult: null,
      }));
    }
  };

  const handleBulkUploadAnalyze = async () => {
    if (!bulkUploadModal.file) {
      alert('Pilih berkas PDF terlebih dahulu.');
      return;
    }
    setBulkUploadModal((prev) => ({ ...prev, analyzing: true, analysisResult: null }));
    try {
      const fd = new FormData();
      fd.append('file', bulkUploadModal.file);
      fd.append('mode', bulkUploadModal.mode);
      fd.append('action', 'analyze');

      const res = await fetch('/api/persuratan/sppd/upload-bulk', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setBulkUploadModal((prev) => ({ ...prev, analysisResult: json }));
      } else {
        alert(json.error || 'Gagal menganalisis berkas PDF');
      }
    } catch (e: any) {
      alert('Terjadi kesalahan jaringan saat menganalisis berkas PDF.');
    } finally {
      setBulkUploadModal((prev) => ({ ...prev, analyzing: false }));
    }
  };

  const handleBulkUploadCommit = async () => {
    if (!bulkUploadModal.file) {
      alert('Pilih berkas PDF terlebih dahulu.');
      return;
    }
    setBulkUploadModal((prev) => ({ ...prev, committing: true }));
    try {
      const fd = new FormData();
      fd.append('file', bulkUploadModal.file);
      fd.append('mode', bulkUploadModal.mode);
      fd.append('action', 'commit');

      const res = await fetch('/api/persuratan/sppd/upload-bulk', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setBulkUploadModal((prev) => ({
          ...prev,
          commitResult: json,
          analysisResult: null,
        }));
        await fetchTasks();
      } else {
        alert(json.error || 'Gagal memisahkan dan menyimpan dokumen hasil TTE');
      }
    } catch (e: any) {
      alert('Terjadi kesalahan jaringan saat menyimpan dokumen.');
    } finally {
      setBulkUploadModal((prev) => ({ ...prev, committing: false }));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Surat Tugas & SPPD (TTE)</h1>
            <p className="text-sm font-medium text-slate-500">
              Lengkapi nomor surat, atur mode TTE, pratinjau naskah, lalu unduh Word secara mandiri atau kolektif.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Tombol Unggah Massal Hasil TTE */}
          <button
            type="button"
            onClick={() =>
              setBulkUploadModal({
                isOpen: true,
                file: null,
                mode: 'AUTO',
                analyzing: false,
                committing: false,
                analysisResult: null,
                commitResult: null,
              })
            }
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
            title="Unggah satu file PDF gabungan hasil TTE untuk dipisahkan dan dicocokkan otomatis ke masing-masing guru & tujuan"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Unggah Massal Hasil TTE</span>
          </button>

          <div className="relative">
            <input
              type="text"
              placeholder="Cari guru atau industri..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 rounded-xl border outline-none text-sm font-semibold w-full md:w-64 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 transition-colors"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>
        </div>
      </div>

      {/* TOOLBAR FILTERS & BULK ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 1. Filter Jurusan */}
          <div className="relative">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border outline-none text-xs font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer focus:border-blue-500"
            >
              <option value="ALL">Semua Jurusan</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filter Jenis Penugasan */}
          <div className="relative">
            <select
              value={purposeFilter}
              onChange={(e) => setPurposeFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border outline-none text-xs font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer focus:border-blue-500"
            >
              <option value="ALL">Semua Jenis Penugasan</option>
              <option value="PENERJUNAN">🚚 Penerjunan PKL</option>
              <option value="MONITORING">📋 Monitoring PKL</option>
              <option value="PENARIKAN">🎓 Penarikan PKL</option>
            </select>
          </div>

          {/* 3. Filter Status */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border outline-none text-xs font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer focus:border-blue-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="PROSES_TTE">Proses TTE (Menunggu)</option>
              <option value="TERBIT_TTE">Terbit TTE (Selesai)</option>
            </select>
          </div>
        </div>

        {/* Select All Checkbox */}
        {filteredTasks.length > 0 && (
          <label className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selectedTaskIds.length > 0 && selectedTaskIds.length === filteredTasks.length}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>Pilih Semua ({filteredTasks.length})</span>
          </label>
        )}
      </div>

      {/* FLOATING BULK DOWNLOAD BAR (Saat ada item yang dicentang) */}
      {selectedTaskIds.length > 0 && (
        <div className="p-4 rounded-2xl bg-indigo-600 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center space-x-3 text-sm font-bold">
            <CheckSquare className="w-5 h-5 text-indigo-200" />
            <span>{selectedTaskIds.length} penugasan dipilih untuk unduh kolektif</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Toggle TTE Kolektif */}
            <button
              type="button"
              onClick={() => {
                const nextVal = !bulkUseTte;
                setBulkUseTte(nextVal);
                // Sinkronkan juga status TTE ke seluruh kartu penugasan terpilih
                setTaskTteMap((prev) => {
                  const next = { ...prev };
                  selectedTaskIds.forEach((id) => {
                    next[id] = {
                      tugas: nextVal,
                      sppd: nextVal,
                    };
                  });
                  return next;
                });
              }}
              className={`flex-1 sm:flex-initial px-3.5 py-2 text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                bulkUseTte
                  ? 'bg-indigo-800/90 hover:bg-indigo-900 text-indigo-100 border border-indigo-400/40'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-500'
              }`}
              title="Klik untuk beralih mode TTE Massal (ON: TTE Pemprov ${...} / OFF: Cetak Langsung TTD Asli Kepala Sekolah)"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>TTE Kolektif: {bulkUseTte ? 'ON' : 'OFF'}</span>
            </button>

            {/* Beri Nomor Surat Sekaligus */}
            <button
              onClick={() => setBulkNumberModal({ isOpen: true, letterNumber: '', sppdNumber: '' })}
              className="flex-1 sm:flex-initial px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              title="Beri nomor Surat Tugas & SPPD yang sama ke seluruh penugasan terpilih"
            >
              <FileSignature className="w-3.5 h-3.5" />
              <span>Beri Nomor Sekaligus ({selectedTaskIds.length})</span>
            </button>

            {/* Unduh Kolektif Surat Tugas */}
            <button
              onClick={() => handleBulkDownload('tugas')}
              className="flex-1 sm:flex-initial px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              title="Unduh 1 file DOCX gabungan yang berisi seluruh Surat Tugas terpilih"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Kolektif Surat Tugas ({selectedTaskIds.length})</span>
            </button>

            {/* Unduh Kolektif SPPD */}
            <button
              onClick={() => handleBulkDownload('sppd')}
              className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              title="Unduh 1 file DOCX gabungan yang berisi seluruh SPPD terpilih"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Kolektif SPPD ({selectedTaskIds.length})</span>
            </button>

            {/* Batal Pilihan */}
            <button
              onClick={() => setSelectedTaskIds([])}
              className="p-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-indigo-200 hover:text-white transition-all cursor-pointer"
              title="Batalkan Pilihan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TASK LIST / CARDS */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-400 mt-4">Memuat data penugasan persuratan...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
            <CheckCircle2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">Tidak ada penugasan yang sesuai dengan filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTasks.map((task) => {
              const aType = getAssignmentType(task.purpose);
              const isSelected = selectedTaskIds.includes(task.id);
              const studentCount = task.industry?.placements?.length || 0;

              const isTugasTteOn = isTteActive(task.id, 'tugas');
              const isSppdTteOn = isTteActive(task.id, 'sppd');

              const hasUnsavedNumbers = taskNumberMap[task.id]?.isModified;

              return (
                <div
                  key={task.id}
                  className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border shadow-sm relative transition-all ${
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Top Bar: Checkbox, Header, and Badges */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(task.id)}
                        className="w-4 h-4 mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-bold text-base text-slate-900 dark:text-white">
                            {task.teacher.name}
                          </h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${aType.badgeClass}`}>
                            <span>{aType.icon}</span>
                            <span>{aType.label}</span>
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                          Tujuan: <strong className="text-slate-700 dark:text-slate-300">{task.industry.name}</strong>
                          {studentCount > 0 && (
                            <span className="text-[10px] text-blue-500 bg-blue-500/10 px-1.5 py-0.2 rounded font-semibold ml-1">
                              {studentCount} Siswa
                            </span>
                          )}
                        </p>
                        {task.teacher?.department && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Jurusan: <span className="font-semibold text-indigo-400">{task.teacher.department}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-full whitespace-nowrap ${
                        task.status === 'SELESAI_TTE'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                      }`}
                    >
                      {task.status === 'SELESAI_TTE' ? 'TERBIT TTE' : 'PROSES TTE'}
                    </span>
                  </div>

                  
                  {/* 📅 Tanggal Rencana Perjalanan Dinas */}
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20 px-3 py-1.5 rounded-xl mb-3">
                    <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-500 dark:text-slate-400">Rencana Perjalanan:</span>
                      <strong className="text-indigo-600 dark:text-indigo-400">
                        {formatIndonesianDateRange(task.monitoringDate, task.returnDate)}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-medium">
                        ({calculateDurationDays(task.monitoringDate, task.returnDate)} Hari Kunjungan)
                      </span>
                    </div>
                  </div>

                  {/* Purpose Box */}
                  <div className="mb-3 text-xs font-semibold text-slate-600 dark:text-slate-400 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Maksud Perjalanan:</p>
                    <p className="line-clamp-2">{task.purpose}</p>
                  </div>

                  {/* 📝 NOMOR NASKAH INPUT SECTION */}
                  <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/80 mb-3 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 flex items-center justify-between mb-1">
                          <span>No. Surat Tugas</span>
                          <span className="text-rose-500">*wajib</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Cth: 800.1.11.1/1000/2026"
                          value={taskNumberMap[task.id]?.letterNumber ?? ''}
                          onChange={(e) => handleNumberChange(task.id, 'letterNumber', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 flex items-center justify-between mb-1">
                          <span>No. SPPD</span>
                          <span className="text-rose-500">*wajib</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Cth: 090/1000/2026"
                          value={taskNumberMap[task.id]?.sppdNumber ?? ''}
                          onChange={(e) => handleNumberChange(task.id, 'sppdNumber', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {hasUnsavedNumbers && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleSaveNumbers(task.id)}
                          disabled={savingNumberId === task.id}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                        >
                          {savingNumberId === task.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          <span>Simpan Nomor Naskah</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions Grid: Surat Tugas & SPPD */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {/* Kolom 1: Surat Tugas */}
                    <div className="space-y-1.5 border-r border-slate-200 dark:border-slate-800 pr-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                          Surat Tugas
                        </p>

                        {/* TOGGLE TTE SURAT TUGAS (DEFAULT ON) */}
                        <button
                          type="button"
                          onClick={() => handleToggleTte(task.id, 'tugas')}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                            isTugasTteOn
                              ? 'bg-blue-600/20 text-blue-500 dark:text-blue-400 border-blue-500/40 shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                          }`}
                          title="Klik untuk beralih antara Mode TTE Tag ${...} atau Mode TTD Langsung Kepala Sekolah"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>TTE: {isTugasTteOn ? 'ON' : 'OFF'}</span>
                        </button>
                      </div>

                      {/* Tombol Pratinjau Surat Tugas */}
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(task, 'SURAT_TUGAS')}
                        className="w-full py-1.5 bg-blue-500/10 hover:bg-blue-500 text-blue-600 hover:text-white dark:text-blue-400 font-bold rounded-xl text-xs flex justify-center items-center gap-1.5 transition-all cursor-pointer"
                        title="Pratinjau tampilan Surat Tugas sebelum diunduh"
                      >
                        <Eye className="w-3.5 h-3.5" /> Pratinjau
                      </button>

                      {/* Tombol Unduh DOCX Surat Tugas */}
                      <button
                        type="button"
                        onClick={() => handleDownloadClick(task, 'tugas')}
                        className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex justify-center items-center gap-1.5 transition-all cursor-pointer"
                        title="Unduh Berkas Word (.docx)"
                      >
                        <Download className="w-3.5 h-3.5" /> Unduh DOCX
                      </button>

                      {/* Upload / Lihat PDF TTE */}
                      {task.suratTugasUrl ? (
                        <a
                          href={task.suratTugasUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 font-bold rounded-xl text-xs flex justify-center items-center gap-1.5"
                        >
                          <FileSignature className="w-3.5 h-3.5" /> PDF TTE Terbit
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setUploadModal({ isOpen: true, task, type: 'TUGAS' })}
                          className="w-full py-1.5 border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold rounded-xl text-xs flex justify-center items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" /> Unggah PDF TTE
                        </button>
                      )}
                    </div>

                    {/* Kolom 2: SPPD */}
                    <div className="space-y-1.5 pl-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                          SPPD
                        </p>

                        {/* TOGGLE TTE SPPD (DEFAULT ON) */}
                        <button
                          type="button"
                          onClick={() => handleToggleTte(task.id, 'sppd')}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                            isSppdTteOn
                              ? 'bg-indigo-600/20 text-indigo-500 dark:text-indigo-400 border-indigo-500/40 shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                          }`}
                          title="Klik untuk beralih antara Mode TTE Tag ${...} atau Mode TTD Langsung Kepala Sekolah"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>TTE: {isSppdTteOn ? 'ON' : 'OFF'}</span>
                        </button>
                      </div>

                      {/* Tombol Pratinjau SPPD */}
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(task, 'SPPD')}
                        className="w-full py-1.5 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-600 hover:text-white dark:text-indigo-400 font-bold rounded-xl text-xs flex justify-center items-center gap-1.5 transition-all cursor-pointer"
                        title="Pratinjau tampilan SPPD sebelum diunduh"
                      >
                        <Eye className="w-3.5 h-3.5" /> Pratinjau
                      </button>

                      {/* Tombol Unduh DOCX SPPD */}
                      <button
                        type="button"
                        onClick={() => handleDownloadClick(task, 'sppd')}
                        className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex justify-center items-center gap-1.5 transition-all cursor-pointer"
                        title="Unduh Berkas Word (.docx)"
                      >
                        <Download className="w-3.5 h-3.5" /> Unduh DOCX
                      </button>

                      {/* Upload / Lihat PDF TTE */}
                      {task.sppdUrl ? (
                        <a
                          href={task.sppdUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 font-bold rounded-xl text-xs flex justify-center items-center gap-1.5"
                        >
                          <FileSignature className="w-3.5 h-3.5" /> PDF TTE Terbit
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setUploadModal({ isOpen: true, task, type: 'SPPD' })}
                          className="w-full py-1.5 border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold rounded-xl text-xs flex justify-center items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" /> Unggah PDF TTE
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🌟 MODAL PRATINJAU DOKUMEN HTML (SURAT TUGAS & SPPD) */}
      {previewModal.isOpen && previewModal.task && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className={`w-full max-w-5xl h-[95vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800/30 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  {previewModal.type === 'SURAT_TUGAS' ? <FileSignature className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {previewModal.type === 'SURAT_TUGAS' ? 'Pratinjau Surat Perintah Tugas' : 'Pratinjau SPPD'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tujuan: <strong className="text-white">{previewModal.task.industry.name}</strong> • Petugas:{' '}
                    <strong className="text-white">{previewModal.task.teacher.name}</strong>
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                {/* Switcher TTE Tag vs Normal */}
                <button
                  type="button"
                  onClick={() =>
                    setPreviewModal((prev) => ({
                      ...prev,
                      useTteTags: !prev.useTteTags,
                    }))
                  }
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    previewModal.useTteTags
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-inner'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                  title="Tag TTE Jateng mempertahankan format ${nomor_naskah}, ${ttd_pengirim}, dll."
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{previewModal.useTteTags ? 'Mode TTE: AKTIF' : 'Mode Langsung'}</span>
                </button>

                {/* Print Button */}
                <button
                  type="button"
                  onClick={handlePrintDocument}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak A4</span>
                </button>

                {/* Download DOCX Button */}
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadClick(
                      previewModal.task,
                      previewModal.type === 'SURAT_TUGAS' ? 'tugas' : 'sppd'
                    )
                  }
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh DOCX</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setPreviewModal((prev) => ({ ...prev, isOpen: false }))}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold border border-rose-500/30 transition-all cursor-pointer shadow-sm ml-1"
                >
                  <X className="w-4 h-4" />
                  <span>Tutup</span>
                </button>
              </div>
            </div>

            {/* Modal Body: Sandboxed HTML Iframe Preview */}
            <div className="flex-1 bg-slate-200/90 dark:bg-slate-950 p-4 overflow-hidden flex justify-center">
              <iframe
                title="Document Preview"
                srcDoc={previewHtml}
                className="w-full max-w-4xl h-full rounded-2xl bg-white shadow-2xl border border-slate-300 dark:border-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* 🌟 MODAL UNGGAH PDF TTE */}
      {uploadModal.isOpen && uploadModal.task && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold mb-1">Unggah PDF {uploadModal.type}</h2>
            <p className="text-xs text-slate-500 mb-6">
              Penugasan: {uploadModal.task.teacher.name} ke {uploadModal.task.industry.name}
            </p>

            <input
              type="file"
              accept=".pdf"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors mb-6"
            >
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              {selectedFile ? (
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{selectedFile.name}</p>
              ) : (
                <p className="text-sm font-bold text-slate-500">Klik untuk memilih file PDF bertanda tangan elektronik</p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setUploadModal({ isOpen: false, task: null, type: null });
                  setSelectedFile(null);
                }}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={!selectedFile || uploading}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Unggah Dokumen
              </button>
            </div>
          </div>
        </div>
      )}
    
      {/* 🌟 MODAL BERI NOMOR NASKAH SEKALIGUS */}
      {bulkNumberModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                  <FileSignature className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">Beri Nomor Naskah Sekaligus</h2>
                  <p className="text-xs text-slate-500">
                    Menerapkan nomor yang sama pada <strong className="text-amber-500">{selectedTaskIds.length} penugasan</strong> terpilih.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkNumberModal({ isOpen: false, letterNumber: '', sppdNumber: '' })}
                className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyBulkNumbers} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Nomor Surat Tugas Bersama
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 800.1.11.1/1000/2026"
                  value={bulkNumberModal.letterNumber}
                  onChange={(e) => setBulkNumberModal({ ...bulkNumberModal, letterNumber: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm font-semibold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Nomor ini akan otomatis mengisi naskah Surat Tugas seluruh penugasan yang Anda centang.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Nomor SPPD Bersama
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 090/1000/2026"
                  value={bulkNumberModal.sppdNumber}
                  onChange={(e) => setBulkNumberModal({ ...bulkNumberModal, sppdNumber: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm font-semibold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Nomor ini akan otomatis mengisi naskah lembar 1 dan lembar 2 SPPD seluruh penugasan yang dicentang.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBulkNumberModal({ isOpen: false, letterNumber: '', sppdNumber: '' })}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingBulkNumber}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submittingBulkNumber ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Terapkan ke {selectedTaskIds.length} Penugasan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 MODAL UNGGAH MASSAL HASIL TTE (AUTO-SPLIT & MATCHING) */}
      {bulkUploadModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Unggah Massal Hasil TTE</h2>
                  <p className="text-xs text-slate-500">
                    Pemisahan otomatis berkas PDF gabungan hasil TTE (Surat Tugas / SPPD 2 lembar) dan pencocokan ke penugasan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setBulkUploadModal({
                    isOpen: false,
                    file: null,
                    mode: 'AUTO',
                    analyzing: false,
                    committing: false,
                    analysisResult: null,
                    commitResult: null,
                  })
                }
                className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content: Saat belum commit berhasil */}
            {!bulkUploadModal.commitResult ? (
              <div className="space-y-5">
                {/* 1. Pemilihan Mode Pemilahan */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Mode Pemilahan Halaman
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setBulkUploadModal((prev) => ({ ...prev, mode: 'AUTO', analysisResult: null }))}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        bulkUploadModal.mode === 'AUTO'
                          ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-500/10 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Deteksi Otomatis</span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        Mengenali otomatis apakah lembar merupakan Surat Tugas (1 hal) atau SPPD (2 hal).
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBulkUploadModal((prev) => ({ ...prev, mode: 'TUGAS', analysisResult: null }))}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        bulkUploadModal.mode === 'TUGAS'
                          ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-500/10 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white mb-1">
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                        <span>Surat Tugas Saja</span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        Setiap 1 halaman dipecah sebagai satu berkas Surat Tugas.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBulkUploadModal((prev) => ({ ...prev, mode: 'SPPD', analysisResult: null }))}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        bulkUploadModal.mode === 'SPPD'
                          ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-500/10 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white mb-1">
                        <Layers className="w-3.5 h-3.5 text-indigo-500" />
                        <span>SPPD Saja</span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        Setiap 2 halaman (Lembar 1 & 2) dipecah sebagai satu berkas SPPD.
                      </p>
                    </button>
                  </div>
                </div>

                {/* 2. File Picker */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Berkas PDF Gabungan Hasil TTE
                  </label>
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:border-emerald-500/50 transition-colors bg-slate-50/50 dark:bg-slate-800/20">
                    <input
                      type="file"
                      accept=".pdf"
                      id="bulk-pdf-input"
                      onChange={handleBulkUploadFileChange}
                      className="hidden"
                    />
                    {bulkUploadModal.file ? (
                      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 max-w-md mx-auto">
                        <div className="flex items-center space-x-3 truncate">
                          <FileText className="w-8 h-8 text-emerald-500 shrink-0" />
                          <div className="text-left truncate">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {bulkUploadModal.file.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {(bulkUploadModal.file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <label
                          htmlFor="bulk-pdf-input"
                          className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition-colors shrink-0"
                        >
                          Ganti
                        </label>
                      </div>
                    ) : (
                      <label htmlFor="bulk-pdf-input" className="cursor-pointer block space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            Klik untuk memilih berkas PDF hasil TTE
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Mendukung file PDF gabungan berisi beberapa Surat Tugas dan/atau SPPD
                          </p>
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                {/* 3. Tombol Aksi Analisis & Simpan */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleBulkUploadAnalyze}
                    disabled={!bulkUploadModal.file || bulkUploadModal.analyzing || bulkUploadModal.committing}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {bulkUploadModal.analyzing ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-emerald-500" />
                    )}
                    <span>Pratinjau Pemilahan</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkUploadCommit}
                    disabled={!bulkUploadModal.file || bulkUploadModal.analyzing || bulkUploadModal.committing}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {bulkUploadModal.committing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>Pisahkan & Simpan Langsung</span>
                  </button>
                </div>

                {/* 4. Hasil Analisis / Pratinjau Pemilahan */}
                {bulkUploadModal.analysisResult && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Hasil Deteksi:
                        </span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          {bulkUploadModal.analysisResult.matchedCount} Dokumen Cocok
                        </span>
                        {bulkUploadModal.analysisResult.unmatchedCount > 0 && (
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                            {bulkUploadModal.analysisResult.unmatchedCount} Tidak Cocok
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Total {bulkUploadModal.analysisResult.totalPages} Halaman ({bulkUploadModal.analysisResult.totalSegments} Berkas)
                      </span>
                    </div>

                    {/* Daftar Dokumen Cocok */}
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {bulkUploadModal.analysisResult.matched.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-black text-slate-900 dark:text-white">
                                {item.teacherName}
                              </span>
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  item.docType === 'TUGAS'
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                }`}
                              >
                                {item.docType === 'TUGAS' ? 'Surat Tugas' : 'SPPD (2 Lembar)'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">
                                (Hal. {item.pageNumbers.join(', ')})
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                              Tujuan: <strong className="text-slate-700 dark:text-slate-300">{item.industryName}</strong>
                            </p>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {item.matchReasons.map((r: string, rIdx: number) => (
                                <span
                                  key={rIdx}
                                  className="text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded"
                                >
                                  ✓ {r}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Terdeteksi
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Peringatan jika ada yang tidak cocok */}
                    {bulkUploadModal.analysisResult.unmatchedCount > 0 && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>
                            Terdapat {bulkUploadModal.analysisResult.unmatchedCount} dokumen yang belum cocok dengan database
                          </span>
                        </div>
                        <p className="text-[11px] opacity-90">
                          Pastikan nama guru dan industri pada penugasan di sistem telah diisi sesuai naskah.
                        </p>
                      </div>
                    )}

                    {/* Tombol Konfirmasi Simpan Hasil Analisis */}
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleBulkUploadCommit}
                        disabled={bulkUploadModal.committing}
                        className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {bulkUploadModal.committing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>
                          Konfirmasi & Simpan {bulkUploadModal.analysisResult.matchedCount} Dokumen ke Sistem
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Content: Laporan Hasil Commit Berhasil */
              <div className="space-y-4 py-4 text-center animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Berhasil Memisahkan & Mengunggah Dokumen TTE!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    {bulkUploadModal.commitResult.message}
                  </p>
                </div>

                {/* List of updated assignments */}
                {bulkUploadModal.commitResult.updatedAssignments && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-left max-h-60 overflow-y-auto space-y-2">
                    {bulkUploadModal.commitResult.updatedAssignments.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                            <span>{item.teacherName}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              ke {item.industryName}
                            </span>
                          </div>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                            ✓ {item.docType === 'TUGAS' ? 'Surat Tugas' : 'SPPD'} berhasil disimpan (Hal {item.pageNumbers.join(', ')})
                          </p>
                        </div>
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-xs font-bold rounded-lg flex items-center gap-1 shrink-0"
                        >
                          <Eye className="w-3.5 h-3.5" /> Lihat PDF
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      setBulkUploadModal({
                        isOpen: false,
                        file: null,
                        mode: 'AUTO',
                        analyzing: false,
                        committing: false,
                        analysisResult: null,
                        commitResult: null,
                      })
                    }
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-black rounded-xl transition-all cursor-pointer"
                  >
                    Selesai & Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
