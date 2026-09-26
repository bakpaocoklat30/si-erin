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
  Layers,
  Building,
  Users,
} from 'lucide-react';
import {
  generateSuratTugasHtml,
  generateSppdHtml,
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

  // Preview Modal State
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

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/persuratan/sppd');
      const json = await res.json();
      if (json.success) {
        setTasks(json.data || []);
        if (json.departments) setDepartments(json.departments);
        if (json.schoolSetting) setSchoolSetting(json.schoolSetting);
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

  const handleBulkDownload = (type: 'tugas' | 'sppd') => {
    if (selectedTaskIds.length === 0) {
      alert('Pilih setidaknya satu penugasan terlebih dahulu.');
      return;
    }
    const url = `/api/persuratan/sppd/download-bulk?type=${type}&ids=${selectedTaskIds.join(',')}`;
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
              Pratinjau, unduh Word kolektif untuk pengajuan TTE, lalu unggah file PDF yang sudah bertanda tangan elektronik.
            </p>
          </div>
        </div>

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

          <div className="flex items-center space-x-2 w-full sm:w-auto">
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

                  {/* Purpose Box */}
                  <div className="mb-4 text-xs font-semibold text-slate-600 dark:text-slate-400 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Maksud Perjalanan:</p>
                    <p className="line-clamp-2">{task.purpose}</p>
                  </div>

                  {/* Actions Grid: Surat Tugas & SPPD */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {/* Kolom 1: Surat Tugas */}
                    <div className="space-y-1.5 border-r border-slate-200 dark:border-slate-800 pr-2">
                      <p className="text-[10px] uppercase font-black text-slate-400 text-center tracking-wider">
                        Surat Tugas
                      </p>

                      {/* Tombol Pratinjau Surat Tugas */}
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewModal({
                            isOpen: true,
                            type: 'SURAT_TUGAS',
                            task,
                            useTteTags: true,
                          })
                        }
                        className="w-full py-1.5 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white dark:text-blue-400 font-bold rounded-xl text-xs flex justify-center items-center gap-1.5 transition-all cursor-pointer"
                        title="Pratinjau tampilan Surat Tugas sebelum diunduh"
                      >
                        <Eye className="w-3.5 h-3.5" /> Pratinjau
                      </button>

                      {/* Tombol Unduh DOCX */}
                      <a
                        href={`/api/pokja/monitoring/${task.id}/download-docx?type=tugas&tte=true`}
                        download
                        className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex justify-center items-center gap-1.5 transition-all cursor-pointer"
                        title="Unduh Berkas Word (.docx)"
                      >
                        <Download className="w-3.5 h-3.5" /> Unduh DOCX
                      </a>

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
                      <p className="text-[10px] uppercase font-black text-slate-400 text-center tracking-wider">
                        SPPD
                      </p>

                      {/* Tombol Pratinjau SPPD */}
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewModal({
                            isOpen: true,
                            type: 'SPPD',
                            task,
                            useTteTags: true,
                          })
                        }
                        className="w-full py-1.5 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-500 hover:text-white dark:text-indigo-400 font-bold rounded-xl text-xs flex justify-center items-center gap-1.5 transition-all cursor-pointer"
                        title="Pratinjau tampilan SPPD sebelum diunduh"
                      >
                        <Eye className="w-3.5 h-3.5" /> Pratinjau
                      </button>

                      {/* Tombol Unduh DOCX */}
                      <a
                        href={`/api/pokja/monitoring/${task.id}/download-docx?type=sppd&tte=true`}
                        download
                        className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex justify-center items-center gap-1.5 transition-all cursor-pointer"
                        title="Unduh Berkas Word (.docx)"
                      >
                        <Download className="w-3.5 h-3.5" /> Unduh DOCX
                      </a>

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
                <a
                  href={`/api/pokja/monitoring/${previewModal.task.id}/download-docx?type=${
                    previewModal.type === 'SURAT_TUGAS' ? 'tugas' : 'sppd'
                  }&tte=${previewModal.useTteTags}`}
                  download
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh DOCX</span>
                </a>

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
    </div>
  );
}
