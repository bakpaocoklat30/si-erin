'use client';

// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✨ Fitur Baru: Dashboard Penugasan & Jadwal Monitoring Guru oleh Tim Pokja.
// 🔧 Fitur:
//    - Penunjukan Guru Utama & Guru Pendamping ke Industri Mitra (DUDI).
//    - Generator Surat Perintah Tugas Monitoring (Format Resmi SMKN 1 Adiwerna).
//    - Generator SPPD (Surat Perintah Perjalanan Dinas) Lembar 1 & 2.
//    - Dukungan Penuh Tag TTE Jateng (${nomor_naskah}, ${ttd_pengirim}, dll).
//    - Print Preview A4 Kedinasan & Direct Browser Print.
// 🎨 UI/UX: Rich Aesthetics, Glassmorphism, Theme-Aware (Dark & Light).
// ----------------------------------------------------------------------

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/app/theme-provider';
import {
  Upload,
  ClipboardCheck,
  FileCheck2,
  Building2,
  Users,
  Calendar,
  Plus,
  Search,
  FileText,
  Printer,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  Car,
  FileSignature,
  ExternalLink,
  X,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Download,
  Eye,
  SlidersHorizontal,
  MapPin,
  GraduationCap,
  ShieldCheck,
  Briefcase,
  Loader2,
  UploadCloud,
  Building,
  Camera,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  generateSuratTugasHtml,
  generateSppdHtml,
  generateLaporanHasilKegiatanHtml,
  generateDokumentasiFotoHtml,
  MonitoringAssignmentData,
  formatIndonesianDate,
  formatIndonesianDateRange,
  calculateDurationDays,
  CompanionTeacher,
  AdditionalIndustryItem,
  parseTargetIndustries,
} from '@/lib/monitoring-templates';



function getStatusBadge(status: string = 'TERJADWAL', hasTugas?: boolean, hasSppd?: boolean) {
  if (status === 'SELESAI_TTE' || status === 'TERBIT_TTE' || (hasTugas && hasSppd)) {
    return {
      label: 'Terbit TTE',
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    };
  }
  if (hasTugas || hasSppd || status === 'PROSES_TTE' || status === 'MENUNGGU_TTE') {
    return {
      label: 'Proses TTE',
      badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    };
  }
  switch (status) {
    case 'TERJADWAL':
    case 'DRAFT':
      return {
        label: 'Draft',
        badgeClass: 'bg-slate-500/15 text-slate-400 border-slate-500/30'
      };
    case 'SELESAI':
      return {
        label: 'Selesai',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      };
    case 'DIBATALKAN':
      return {
        label: 'Dibatalkan',
        badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30'
      };
    default:
      return {
        label: status,
        badgeClass: 'bg-slate-500/15 text-slate-400 border-slate-500/30'
      };
  }
}

function getAssignmentType(purpose?: string | null) {
  const p = (purpose || '').toLowerCase();
  if (p.includes('penerjunan') || p.includes('pengantaran')) {
    return {
      type: 'PENERJUNAN',
      label: 'Penerjunan',
      icon: '🚚',
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    };
  }
  if (p.includes('penarikan') || p.includes('penjemputan')) {
    return {
      type: 'PENARIKAN',
      label: 'Penarikan',
      icon: '🎓',
      badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30'
    };
  }
  return {
    type: 'MONITORING',
    label: 'Monitoring',
    icon: '📋',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30'
  };
}

export default function PokjaMonitoringPage() {
  const { data: session } = useSession();
  const { theme } = useTheme();

  // Data State
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);

  const [assignments, setAssignments] = useState<MonitoringAssignmentData[]>([]);

  const [uploadModal, setUploadModal] = useState<{
    isOpen: boolean;
    assignmentId: string;
    industryName: string;
    teacherName: string;
    type: 'LAPORAN' | 'SPPD' | 'TUGAS';
    laporanUrl?: string | null;
    activityPhotos?: any[];
    uploading: boolean;
    uploadingPhoto: boolean;
  }>({
    isOpen: false,
    assignmentId: '',
    industryName: '',
    teacherName: '',
    type: 'LAPORAN',
    laporanUrl: null,
    activityPhotos: [],
    uploading: false,
    uploadingPhoto: false,
  });

  const [galleryModal, setGalleryModal] = useState<{
    isOpen: boolean;
    title: string;
    photos: any[];
    activeIndex: number;
  }>({
    isOpen: false,
    title: '',
    photos: [],
    activeIndex: 0,
  });

  const [photoUploadCaption, setPhotoUploadCaption] = useState<string>('');
  const [editingPhotoIndex, setEditingPhotoIndex] = useState<number | null>(null);
  const [editCaptionValue, setEditCaptionValue] = useState<string>('');
  const [savingCaption, setSavingCaption] = useState<boolean>(false);

  const getSafeFileUrl = (url?: string | null): string => {
    if (!url) return '';
    if (url.startsWith('/uploads/')) {
      const filename = url.replace('/uploads/', '');
      return `/api/files/uploads/${filename}`;
    }
    return url;
  };

  const [docViewerModal, setDocViewerModal] = useState<{
    isOpen: boolean;
    title: string;
    url: string;
    subtitle?: string;
  }>({
    isOpen: false,
    title: '',
    url: '',
    subtitle: '',
  });

  // Upload Berkas Dokumen Laporan (PDF / Scan)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadModal.assignmentId) return;

    setUploadModal(prev => ({ ...prev, uploading: true }));
    const formData = new FormData();
    formData.append('file', file);
    formData.append('id', uploadModal.assignmentId);
    formData.append('type', 'LAPORAN');

    try {
      const res = await fetch('/api/persuratan/sppd/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUploadModal(prev => ({ ...prev, laporanUrl: data.url }));
        setMessage({ type: 'success', text: 'Berkas Laporan Kunjungan berhasil diunggah!' });
        fetchData();
      } else {
        alert(data.error || 'Gagal mengunggah berkas.');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setUploadModal(prev => ({ ...prev, uploading: false }));
      if (e.target) e.target.value = '';
    }
  };

  const [uploadingRowPhotoId, setUploadingRowPhotoId] = useState<string | null>(null);

  // Upload Foto Kegiatan dari Modal (Bisa Lebih dari 1 Foto, Maks 20 Foto)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !uploadModal.assignmentId) return;

    const currentCount = uploadModal.activityPhotos?.length || 0;
    if (currentCount + files.length > 20) {
      alert(`Maksimal 20 foto kegiatan. Saat ini sudah ada ${currentCount} foto, Anda hanya dapat menambahkan ${20 - currentCount} foto lagi.`);
      return;
    }

    setUploadModal(prev => ({ ...prev, uploadingPhoto: true }));
    const formData = new FormData();
    formData.append('id', uploadModal.assignmentId);
    formData.append('type', 'PHOTO');
    if (photoUploadCaption && photoUploadCaption.trim()) {
      formData.append('caption', photoUploadCaption.trim());
    }
    for (let i = 0; i < files.length; i++) {
      formData.append('photos', files[i]);
    }

    try {
      const res = await fetch('/api/persuratan/sppd/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUploadModal(prev => ({ ...prev, activityPhotos: data.activityPhotos || [] }));
        setPhotoUploadCaption('');
        setMessage({ type: 'success', text: `Berhasil mengunggah ${files.length} foto kegiatan!` });
        fetchData();
      } else {
        alert(data.error || 'Gagal mengunggah foto.');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi saat mengunggah foto.');
    } finally {
      setUploadModal(prev => ({ ...prev, uploadingPhoto: false }));
      if (e.target) e.target.value = '';
    }
  };

  // Upload Foto Kegiatan Langsung dari Baris Tabel (Bisa Lebih dari 1 Foto)
  const handleDirectPhotoUpload = async (assignmentId: string, files: FileList | null) => {
    if (!files || files.length === 0 || !assignmentId) return;

    const targetAssignment = assignments.find(a => a.id === assignmentId);
    const rawPhotos = targetAssignment?.activityPhotos;
    const currentPhotos: string[] = Array.isArray(rawPhotos)
      ? rawPhotos
      : (typeof rawPhotos === 'string'
        ? (() => { try { return JSON.parse(rawPhotos); } catch { return []; } })()
        : []);

    if (currentPhotos.length + files.length > 20) {
      alert(`Maksimal 20 foto kegiatan. Saat ini sudah ada ${currentPhotos.length} foto, Anda hanya dapat menambahkan ${20 - currentPhotos.length} foto lagi.`);
      return;
    }

    setUploadingRowPhotoId(assignmentId);
    const formData = new FormData();
    formData.append('id', assignmentId);
    formData.append('type', 'PHOTO');
    for (let i = 0; i < files.length; i++) {
      formData.append('photos', files[i]);
    }

    try {
      const res = await fetch('/api/persuratan/sppd/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: `Berhasil mengunggah ${files.length} foto kegiatan!` });
        await fetchData();
      } else {
        alert(data.error || 'Gagal mengunggah foto.');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi saat mengunggah foto.');
    } finally {
      setUploadingRowPhotoId(null);
    }
  };

  // Hapus Satu Foto Kegiatan
  const handleDeletePhoto = async (photoUrl: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus foto kegiatan ini?')) return;
    if (!uploadModal.assignmentId) return;

    setUploadModal(prev => ({ ...prev, uploadingPhoto: true }));
    const formData = new FormData();
    formData.append('id', uploadModal.assignmentId);
    formData.append('action', 'DELETE_PHOTO');
    formData.append('photoUrl', photoUrl);

    try {
      const res = await fetch('/api/persuratan/sppd/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUploadModal(prev => ({ ...prev, activityPhotos: data.activityPhotos || [] }));
        setMessage({ type: 'success', text: 'Foto kegiatan berhasil dihapus!' });
        fetchData();
      } else {
        alert(data.error || 'Gagal menghapus foto.');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setUploadModal(prev => ({ ...prev, uploadingPhoto: false }));
    }
  };

  // Simpan / Perbarui Keterangan Foto Kegiatan (Opsional)
  const handleSavePhotoCaption = async (photoUrl: string, captionText: string) => {
    if (!uploadModal.assignmentId || !photoUrl) return;

    setSavingCaption(true);
    const formData = new FormData();
    formData.append('id', uploadModal.assignmentId);
    formData.append('action', 'UPDATE_PHOTO_CAPTION');
    formData.append('photoUrl', photoUrl);
    formData.append('caption', captionText.trim());

    try {
      const res = await fetch('/api/persuratan/sppd/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUploadModal(prev => ({ ...prev, activityPhotos: data.activityPhotos || [] }));
        setEditingPhotoIndex(null);
        setEditCaptionValue('');
        setMessage({ type: 'success', text: 'Keterangan foto berhasil disimpan!' });
        fetchData();
      } else {
        alert(data.error || 'Gagal menyimpan keterangan foto.');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi saat menyimpan keterangan foto.');
    } finally {
      setSavingCaption(false);
    }
  };

  const [industries, setIndustries] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [schoolSetting, setSchoolSetting] = useState<any>(null);
  const [activePeriod, setActivePeriod] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [purposeFilter, setPurposeFilter] = useState<string>('ALL');

  // Modal State: Form Penjadwalan Monitoring
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form Field State
  const [formIndustryId, setFormIndustryId] = useState('');
  const [formIndustryAddress, setFormIndustryAddress] = useState('');
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formTeacherRank, setFormTeacherRank] = useState('');
  const [formMonitoringDate, setFormMonitoringDate] = useState('');
  const [formReturnDate, setFormReturnDate] = useState('');
  const [formLetterNumber, setFormLetterNumber] = useState('${nomor_naskah}');
  const [formSppdNumber, setFormSppdNumber] = useState('${nomor_naskah}');
  const [formPurpose, setFormPurpose] = useState('Melaksanakan kegiatan Monitoring siswa Praktik Kerja Lapangan (PKL)');
  const [formTransportType, setFormTransportType] = useState('Mobil Dinas / Kendaraan Umum');
  const [formDeparturePlace, setFormDeparturePlace] = useState('SMK Negeri 1 Adiwerna');
  const [formDestinationPlace, setFormDestinationPlace] = useState('');
  const [formBudgetSource, setFormBudgetSource] = useState('SMK Negeri 1 Adiwerna');
  const [formBudgetAccount, setFormBudgetAccount] = useState('Dana BOS');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState('TERJADWAL');

  // Companion Teachers State (Multi-Guru)
  const [companions, setCompanions] = useState<CompanionTeacher[]>([]);

  // Additional Target Industries State (Multi-Industri Rute Kunjungan)
  const [targetIndustries, setTargetIndustries] = useState<AdditionalIndustryItem[]>([]);
  const [selectedAddIndustryId, setSelectedAddIndustryId] = useState('');

  // Modal State: Print Preview (Surat Tugas / SPPD / Laporan / Foto Dokumentasi)
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    type: 'SURAT_TUGAS' | 'SPPD' | 'LAPORAN' | 'FOTO_DOKUMENTASI';
    assignment: MonitoringAssignmentData | null;
    useTteTags: boolean;
  }>({
    isOpen: false,
    type: 'SURAT_TUGAS',
    assignment: null,
    useTteTags: true,
  });

  // Modal Hapus Confirmation
  const [deleteTarget, setDeleteTarget] = useState<MonitoringAssignmentData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch data
  
  const handleRequestTteBulk = async () => {
    if (selectedAssignments.length === 0) {
      alert('Pilih setidaknya satu penugasan untuk dimintakan TTE.');
      return;
    }
    if (!confirm(`Anda yakin ingin mengirim ${selectedAssignments.length} penugasan ini ke Tata Usaha untuk di-TTE?`)) return;

    try {
      const res = await fetch('/api/pokja/monitoring/request-tte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedAssignments })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Berhasil mengirim permintaan TTE ke Tata Usaha!');
        setSelectedAssignments([]);
        fetchData(); // refresh
      } else {
        alert(data.error || 'Gagal mengirim permintaan TTE');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    }
  };

  
    const fileInputRefCsv = useRef<HTMLInputElement>(null);

    const handleExportCsv = () => {
      const headers = ['No', 'Nama Guru', 'NIP Guru', 'Industri Tujuan', 'Tanggal Berangkat', 'Status', 'Tujuan'];
      const csvContent = assignments.map((a, idx) => {
        return [
          idx + 1,
          `"${a.teacher?.name || ''}"`,
          `"${a.teacher?.nip || ''}"`,
          `"${a.industry?.name || ''}"`,
          `"${formatIndonesianDate(a.monitoringDate) || ''}"`,
          `"${a.status || ''}"`,
          `"${a.purpose || ''}"`
        ].join(',');
      });

      const csvString = [headers.join(','), ...csvContent].join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Data_Penugasan_Monitoring_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const parseCSV = (text: string) => {
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) return [];
      const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!row) continue;
        const rowObj: any = {};
        row.forEach((val, idx) => {
          if (headers[idx]) {
            rowObj[headers[idx]] = val.replace(/^"|"$/g, '').trim();
          }
        });
        data.push(rowObj);
      }
      return data;
    };

    const handleImportCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        alert('File harus berformat CSV!');
        return;
      }
      const text = await file.text();
      const parsedData = parseCSV(text);
      if (parsedData.length === 0) {
        alert('Data CSV kosong atau format tidak valid!');
        return;
      }
      if (!confirm(`Ditemukan ${parsedData.length} baris data CSV. Yakin ingin mengimpor?`)) {
        if (fileInputRefCsv.current) fileInputRefCsv.current.value = '';
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/pokja/monitoring/import-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignments: parsedData })
        });
        const json = await res.json();
        if (json.success) {
          const { successCount, failCount, errors } = json.data;
          let msg = `Berhasil mengimpor: ${successCount} baris.\nGagal: ${failCount} baris.`;
          if (failCount > 0) {
            msg += '\n\nDetail Error:\n' + errors.join('\n');
          }
          alert(msg);
          fetchData();
        } else {
          alert('Gagal impor: ' + json.error);
        }
      } catch (err) {
        alert('Terjadi kesalahan sistem.');
      } finally {
        setLoading(false);
        if (fileInputRefCsv.current) fileInputRefCsv.current.value = '';
      }
    };
  
  
  const [bulkUploadModal, setBulkUploadModal] = useState<{
    isOpen: boolean;
    file: File | null;
    mode: 'AUTO' | 'TUGAS' | 'SPPD' | 'LAPORAN';
    analyzing: boolean;
    committing: boolean;
    targetTaskIds: string[]; // If specific rows selected
    analysisResult: any | null;
    mappings: Array<{ id: string; startPage: number | ''; endPage: number | ''; assignmentId: string; status: 'pending' | 'success' | 'error' }>;
    commitResult: { success: boolean; message: string; updatedAssignments?: any[] } | null;
    showPdfPreview: boolean;
  }>({
    isOpen: false,
    file: null,
    mode: 'LAPORAN', // Changed to LAPORAN for Gabungan
    analyzing: false,
    committing: false,
    targetTaskIds: [],
    analysisResult: null,
    mappings: [],
    commitResult: null,
    showPdfPreview: false,
  });

  const [bulkPdfPreviewUrl, setBulkPdfPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (bulkUploadModal.file) {
      const url = URL.createObjectURL(bulkUploadModal.file);
      setBulkPdfPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setBulkPdfPreviewUrl(null);
    }
  }, [bulkUploadModal.file]);

  const triggerBulkAnalyze = async (file: File, mode: string, customTargetIds?: string[]) => {
    const targetIds = customTargetIds !== undefined ? customTargetIds : bulkUploadModal.targetTaskIds;
    setBulkUploadModal((prev) => ({
      ...prev,
      analyzing: true,
      analysisResult: null,
      commitResult: null,
      mappings: [],
    }));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    formData.append('action', 'analyze');
    if (targetIds && targetIds.length > 0) {
      formData.append('taskIds', JSON.stringify(targetIds));
    }

    try {
      const res = await fetch('/api/persuratan/sppd/upload-bulk', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal analisis');

      const initialMappings = (json.segments || []).map((d: any, idx: number) => ({
        id: `mapping-${idx}-${Date.now()}`,
        startPage: d.startPage,
        endPage: d.endPage,
        assignmentId: d.assignmentId || '',
        status: 'pending',
        autoMatched: Boolean(d.assignmentId),
      }));

      setBulkUploadModal((prev) => ({
        ...prev,
        analysisResult: json,
        mappings: initialMappings,
      }));
    } catch (e: any) {
      console.error('Bulk upload analyze error:', e);
      alert(`Gagal menganalisis berkas: ${e.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setBulkUploadModal((prev) => ({ ...prev, analyzing: false }));
    }
  };

  const handleBulkUploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBulkUploadModal((prev) => ({
        ...prev,
        file,
        analysisResult: null,
        commitResult: null,
        mappings: [],
      }));
      triggerBulkAnalyze(file, bulkUploadModal.mode, bulkUploadModal.targetTaskIds);
    }
  };

  const handleBulkUploadAnalyze = () => {
    if (!bulkUploadModal.file) {
      alert('Pilih berkas PDF terlebih dahulu.');
      return;
    }
    triggerBulkAnalyze(bulkUploadModal.file, bulkUploadModal.mode, bulkUploadModal.targetTaskIds);
  };

  const handleAddMappingRow = () => {
    setBulkUploadModal((prev) => ({
      ...prev,
      mappings: [
        ...prev.mappings,
        { id: `mapping-new-${Date.now()}`, startPage: '', endPage: '', assignmentId: '', status: 'pending' },
      ],
    }));
  };

  const handleRemoveMappingRow = (id: string) => {
    setBulkUploadModal((prev) => ({
      ...prev,
      mappings: prev.mappings.filter((m) => m.id !== id),
    }));
  };

  const handleUpdateMappingRow = (id: string, field: string, value: any) => {
    setBulkUploadModal((prev) => ({
      ...prev,
      mappings: prev.mappings.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    }));
  };

  const handleBulkUploadCommit = async () => {
    if (!bulkUploadModal.file) {
      alert('Pilih berkas PDF terlebih dahulu.');
      return;
    }

    if (bulkUploadModal.mappings.length === 0) {
      alert('Belum ada pemetaan dokumen yang ditentukan. Klik "+ Tambah Dokumen" atau analisis berkas terlebih dahulu.');
      return;
    }

    for (const m of bulkUploadModal.mappings) {
      if (!m.startPage || !m.endPage) {
        alert('Pastikan semua rentang halaman terisi dengan angka.');
        return;
      }
      if (!m.assignmentId) {
        alert('Pastikan semua dokumen telah dipasangkan dengan guru/industri (Penugasan).');
        return;
      }
    }

    setBulkUploadModal((prev) => ({ ...prev, committing: true }));
    const formData = new FormData();
    formData.append('file', bulkUploadModal.file);
    formData.append('mode', bulkUploadModal.mode);
    formData.append('action', 'commit');
    formData.append(
      'segments',
      JSON.stringify(
        bulkUploadModal.mappings.map((m) => ({
          startPage: parseInt(m.startPage as string),
          endPage: parseInt(m.endPage as string),
          assignmentId: m.assignmentId,
        }))
      )
    );

    try {
      const res = await fetch('/api/persuratan/sppd/upload-bulk', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memisahkan dokumen');

      setBulkUploadModal((prev) => ({
        ...prev,
        commitResult: { success: true, message: json.message, updatedAssignments: json.updatedAssignments },
      }));
      fetchData(); // Refresh table
    } catch (e: any) {
      console.error('Bulk upload commit error:', e);
      alert(`Gagal memisahkan dan menyimpan dokumen: ${e.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setBulkUploadModal((prev) => ({ ...prev, committing: false }));
    }
  };
  
  const [loadingStage, setLoadingStage] = useState('Memuat awal...');

  const fetchData = async () => {
    setLoading(true);
    setLoadingStage('Memuat data monitoring...');
    try {
      const res = await fetch('/api/pokja/monitoring', { cache: 'no-store' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || 'HTTP error');
      }
      const json = await res.json();

      if (json.success && json.data) {
        setAssignments(json.data.assignments || []);
        setIndustries(json.data.industries || []);
        setTeachers(json.data.teachers || []);
        setSchoolSetting(json.data.schoolSetting || null);
        setActivePeriod(json.data.activePeriod || null);
      } else {
        setMessage({ type: 'error', text: json.error || 'Gagal memuat data monitoring' });
      }
    } catch (err: any) {
      console.error('Fetch monitoring error:', err);
      setMessage({ type: 'error', text: err?.message || 'Terjadi kesalahan jaringan' });
    } finally {
      setLoadingStage('');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Keyboard Escape shortcut to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (docViewerModal.isOpen) {
          setDocViewerModal((prev) => ({ ...prev, isOpen: false }));
        } else if (galleryModal.isOpen) {
          setGalleryModal((prev) => ({ ...prev, isOpen: false }));
        } else if (previewModal.isOpen) {
          setPreviewModal((prev) => ({ ...prev, isOpen: false }));
        } else if (showFormModal) {
          setShowFormModal(false);
        } else if (deleteTarget) {
          setDeleteTarget(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [docViewerModal.isOpen, galleryModal.isOpen, previewModal.isOpen, showFormModal, deleteTarget]);

  // Filtered Assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      const matchesSearch =
        item.industry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.industry.address && item.industry.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.teacher.name.toLowerCase().includes(searchQuery.toLowerCase());

      const hasTugas = Boolean(item.suratTugasUrl);
      const hasSppd = Boolean(item.sppdUrl);

      let matchesStatus = true;
      if (statusFilter === 'DRAFT') {
        matchesStatus = (item.status === 'DRAFT' || item.status === 'TERJADWAL' || !item.status) && !hasTugas && !hasSppd;
      } else if (statusFilter === 'PROSES_TTE') {
        matchesStatus = item.status === 'PROSES_TTE' || item.status === 'MENUNGGU_TTE' || ((hasTugas || hasSppd) && !(hasTugas && hasSppd));
      } else if (statusFilter === 'TERBIT_TTE') {
        matchesStatus = item.status === 'TERBIT_TTE' || item.status === 'SELESAI_TTE' || (hasTugas && hasSppd);
      } else if (statusFilter === 'SELESAI') {
        matchesStatus = item.status === 'SELESAI';
      } else if (statusFilter !== 'ALL') {
        matchesStatus = item.status === statusFilter;
      }
      const pType = getAssignmentType(item.purpose).type;
      const matchesPurpose = purposeFilter === 'ALL' || pType === purposeFilter;

      return matchesSearch && matchesStatus && matchesPurpose;
    });
  }, [assignments, searchQuery, statusFilter, purposeFilter]);

  // Statistik Ringkas
  const stats = useMemo(() => {
    const total = assignments.length;
    const terbitTte = assignments.filter(
      (a) => a.status === 'SELESAI_TTE' || a.status === 'TERBIT_TTE' || (Boolean(a.suratTugasUrl) && Boolean(a.sppdUrl))
    ).length;
    const terjadwal = assignments.filter(
      (a) => (a.status === 'TERJADWAL' || a.status === 'DRAFT') && !a.suratTugasUrl && !a.sppdUrl
    ).length;
    const selesai = assignments.filter((a) => a.status === 'SELESAI').length;
    const uniqueIndustries = new Set(assignments.map((a) => a.industry.id)).size;
    return { total, terjadwal, terbitTte, selesai, uniqueIndustries };
  }, [assignments]);

  // Helper sinkronisasi Tempat Tujuan SPPD otomatis berdasarkan Industri Utama + Rute
  const syncDestinationPlace = (
    primaryId: string,
    primaryAddress: string,
    currentTargetInds: AdditionalIndustryItem[]
  ) => {
    const selected = industries.find((i) => i.id === primaryId);
    const indNames: string[] = [];
    if (selected) {
      indNames.push(selected.name);
    }
    currentTargetInds.forEach((ind) => {
      if (ind.name && ind.name.trim() !== '') {
        indNames.push(ind.name.trim());
      }
    });
    if (indNames.length > 1) {
      setFormDestinationPlace(indNames.join(', '));
    } else if (selected) {
      const addr = primaryAddress.trim() || selected.regency || '';
      setFormDestinationPlace(addr ? `${selected.name} (${addr})` : selected.name);
    }
  };

  // Handler: Buka Modal Tambah Baru
  const handleOpenAddModal = () => {
    setIsEditing(false);
    setEditingId(null);

    // Default dates (Hari ini atau besok)
    const todayStr = new Date().toISOString().split('T')[0];
    const firstInd = industries[0];
    const initialAddress = firstInd?.address || '';
    setFormIndustryId(firstInd?.id || '');
    setFormIndustryAddress(initialAddress);
    const firstTeacher = teachers[0];
    setFormTeacherId(firstTeacher?.id || '');
    setFormTeacherRank(firstTeacher?.rank || '');
    setFormMonitoringDate(todayStr);
    setFormReturnDate(todayStr);
    setFormLetterNumber('${nomor_naskah}');
    setFormSppdNumber('${nomor_naskah}');
    setFormPurpose('Melaksanakan kegiatan Monitoring siswa Praktik Kerja Lapangan (PKL)');
    setFormTransportType('Mobil Dinas / Kendaraan Umum');
    setFormDeparturePlace('SMK Negeri 1 Adiwerna');
    setFormDestinationPlace(firstInd?.name ? `${firstInd.name} (${initialAddress || firstInd.regency || ''})` : '');
    setFormBudgetSource('SMK Negeri 1 Adiwerna');
    setFormBudgetAccount('Dana BOS');
    setFormNotes('');
    setFormStatus('TERJADWAL');
    setCompanions([]);
    setTargetIndustries([]);
    setSelectedAddIndustryId('');

    setShowFormModal(true);
  };

  // Handler: Buka Modal Edit
  const handleOpenEditModal = (assignment: MonitoringAssignmentData) => {
    setIsEditing(true);
    setEditingId(assignment.id || null);

    const mDate = assignment.monitoringDate ? new Date(assignment.monitoringDate).toISOString().split('T')[0] : '';
    const rDate = assignment.returnDate ? new Date(assignment.returnDate).toISOString().split('T')[0] : mDate;

    setFormIndustryId(assignment.industry.id);
    setFormIndustryAddress(assignment.industry.address || '');
    setFormTeacherId(assignment.teacher.id);
    setFormTeacherRank(assignment.teacher.rank || '');
    setFormMonitoringDate(mDate);
    setFormReturnDate(rDate);
    setFormLetterNumber(assignment.letterNumber || '${nomor_naskah}');
    setFormSppdNumber(assignment.sppdNumber || '${nomor_naskah}');
    setFormPurpose(assignment.purpose || 'Melaksanakan kegiatan Monitoring siswa Praktik Kerja Lapangan (PKL)');
    setFormTransportType(assignment.transportType || 'Mobil Dinas / Kendaraan Umum');
    setFormDeparturePlace(assignment.departurePlace || 'SMK Negeri 1 Adiwerna');
    setFormDestinationPlace(assignment.destinationPlace || assignment.industry.name);
    setFormBudgetSource(assignment.budgetSource || 'SMK Negeri 1 Adiwerna');
    setFormBudgetAccount(assignment.budgetAccount || 'Dana BOS');
    setFormNotes(assignment.notes || '');
    setFormStatus(assignment.status || 'TERJADWAL');
    setCompanions(Array.isArray(assignment.companionTeachers) ? assignment.companionTeachers : []);
    setTargetIndustries(Array.isArray(assignment.targetIndustries) ? assignment.targetIndustries : []);
    setSelectedAddIndustryId('');

    setShowFormModal(true);
  };

  // Handler: Auto-update Destination Place saat Industri Utama diganti
  const handleIndustryChange = (indId: string) => {
    setFormIndustryId(indId);
    const selected = industries.find((i) => i.id === indId);
    const addr = selected?.address || '';
    setFormIndustryAddress(addr);
    syncDestinationPlace(indId, addr, targetIndustries);
  };

  // Handler: Saat alamat industri utama diubah / diperbaiki langsung oleh user
  const handleIndustryAddressChange = (addr: string) => {
    setFormIndustryAddress(addr);
    syncDestinationPlace(formIndustryId, addr, targetIndustries);
  };

  // Handler: Auto-update Pangkat/Golongan saat Guru Utama diganti
  const handleTeacherChange = (teacherId: string) => {
    setFormTeacherId(teacherId);
    const selected = teachers.find((t) => t.id === teacherId);
    const pGol = [selected?.rank, (selected as any)?.golongan].filter(Boolean).join(' / ') || selected?.rank || (selected as any)?.golongan || '';
    setFormTeacherRank(pGol);
  };

  // Handler: Tambah Guru Pendamping Cepat dari Dropdown
  const handleAddCompanionFromTeacher = (teacherId: string) => {
    if (!teacherId) return;
    const found = teachers.find((t) => t.id === teacherId);
    if (!found) return;

    if (found.id === formTeacherId) {
      alert('Guru ini sudah dipilih sebagai Guru Petugas Utama.');
      return;
    }

    setCompanions((prev) => {
      if (prev.some((c) => c.name === found.name)) {
        alert('Guru ini sudah ada di dalam daftar pendamping.');
        return prev;
      }
      return [
        ...prev,
        {
          name: found.name,
          nip: found.nip || found.username || '-',
          rank: [found.rank, (found as any)?.golongan].filter(Boolean).join(' / ') || found.rank || (found as any)?.golongan || '',
          role: 'Guru',
        },
      ];
    });
  };

  // Handler: Tambah Baris Manual Guru Pendamping
  const handleAddCompanion = () => {
    setCompanions((prev) => [...prev, { name: '', nip: '', rank: '', role: 'Guru' }]);
  };

  // Handler: Pilih Guru di baris yang sudah ada (Atomic update)
  const handleSelectCompanion = (index: number, teacherId: string) => {
    const found = teachers.find((t) => t.id === teacherId);
    if (!found) return;
    setCompanions((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        name: found.name,
        nip: found.nip || found.username || '-',
        rank: found.rank || '',
        role: 'Guru',
      };
      return updated;
    });
  };

  // Handler: Perbarui field guru pendamping
  const handleUpdateCompanion = (index: number, field: keyof CompanionTeacher, value: string) => {
    setCompanions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Handler: Hapus Guru Pendamping
  const handleRemoveCompanion = (index: number) => {
    setCompanions((prev) => prev.filter((_, i) => i !== index));
  };

  // Handler: Tambah / Ubah / Hapus Industri Tambahan (Rute Kunjungan)
  const handleAddTargetIndustry = (indId: string) => {
    if (!indId) return;
    const selected = industries.find((i) => i.id === indId);
    if (!selected) return;

    if (selected.id === formIndustryId) {
      alert('Industri ini sudah menjadi industri mitra utama.');
      setSelectedAddIndustryId('');
      return;
    }

    if (targetIndustries.some((t) => t.id === selected.id)) {
      alert('Industri ini sudah ditambahkan dalam rute kunjungan.');
      setSelectedAddIndustryId('');
      return;
    }

    const updated = [
      ...targetIndustries,
      {
        id: selected.id,
        name: selected.name,
        address: selected.address || selected.regency || '',
        regency: selected.regency || '',
      },
    ];
    setTargetIndustries(updated);
    setSelectedAddIndustryId('');
    syncDestinationPlace(formIndustryId, formIndustryAddress, updated);
  };

  const handleAddCustomTargetIndustry = () => {
    const updated = [...targetIndustries, { name: '', address: '', regency: '' }];
    setTargetIndustries(updated);
  };

  const handleUpdateTargetIndustry = (index: number, field: keyof AdditionalIndustryItem, value: string) => {
    const updated = [...targetIndustries];
    updated[index] = { ...updated[index], [field]: value };
    setTargetIndustries(updated);
    syncDestinationPlace(formIndustryId, formIndustryAddress, updated);
  };

  const handleRemoveTargetIndustry = (index: number) => {
    const updated = targetIndustries.filter((_, i) => i !== index);
    setTargetIndustries(updated);
    syncDestinationPlace(formIndustryId, formIndustryAddress, updated);
  };

  // Handler: Submit Form Penjadwalan
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formIndustryId || !formTeacherId || !formMonitoringDate) {
      alert('Industri, Guru Utama, dan Tanggal Monitoring wajib diisi!');
      return;
    }

    if (!formIndustryAddress || formIndustryAddress.trim() === '') {
      const confirmEmpty = confirm(
        '⚠️ PERINGATAN: Alamat Industri Tujuan masih kosong!\n\n' +
        'Jika disimpan tanpa alamat, kolom alamat di Surat Tugas dan SPPD akan tercetak tanda strip (-).\n\n' +
        '• Klik [Cancel / Batal] untuk mengisi alamat terlebih dahulu (bisa ketik langsung di form ini atau via menu Industri Mitra).\n' +
        '• Klik [OK] jika tetap ingin menyimpan tanpa alamat.'
      );
      if (!confirmEmpty) return;
    }

    setSubmitting(true);
    setMessage(null);

    const payload = {
      industryId: formIndustryId,
      industryAddress: formIndustryAddress.trim(),
      teacherId: formTeacherId,
      teacherRank: formTeacherRank.trim(),
      monitoringDate: formMonitoringDate,
      returnDate: formReturnDate || formMonitoringDate,
      letterNumber: formLetterNumber,
      sppdNumber: formSppdNumber,
      purpose: formPurpose,
      transportType: formTransportType,
      departurePlace: formDeparturePlace,
      destinationPlace: formDestinationPlace,
      budgetSource: formBudgetSource,
      budgetAccount: formBudgetAccount,
      notes: formNotes,
      status: formStatus,
      companionTeachers: companions.filter((c) => c && typeof c.name === 'string' && c.name.trim() !== ''),
      targetIndustries: targetIndustries.filter((ind) => ind && typeof ind.name === 'string' && ind.name.trim() !== ''),
      periodId: activePeriod?.id || null,
    };

    try {
      const url = isEditing && editingId ? `/api/pokja/monitoring/${editingId}` : '/api/pokja/monitoring';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: json.message || 'Penugasan monitoring berhasil disimpan!' });
        setShowFormModal(false);
        fetchData();
      } else {
        setMessage({ type: 'error', text: json.error || 'Gagal menyimpan penugasan monitoring' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan sistem' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  // Handler: Eksekusi Hapus
  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/pokja/monitoring/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: 'Jadwal monitoring berhasil dihapus!' });
        setDeleteTarget(null);
        fetchData();
      } else {
        setMessage({ type: 'error', text: json.error || 'Gagal menghapus jadwal' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan' });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  // Handler: Cetak Langsung / Buka Jendela Print Browser
  
  const handlePrintMassalLaporan = () => {
    if (selectedAssignments.length === 0) {
      alert('Pilih setidaknya satu penugasan.');
      return;
    }
    
    const toPrint = assignments.filter(a => selectedAssignments.includes(a.id as string));
    
    let combinedHtml = '';
    toPrint.forEach((assignment, index) => {
      combinedHtml += generateLaporanHasilKegiatanHtml(assignment, { schoolSetting, useTteTags: false });
      if (index < toPrint.length - 1) {
        combinedHtml += '<div style="page-break-after: always; clear: both;"></div>';
      }
    });

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(combinedHtml);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
      }, 700);
    }
  };

  const handlePrintDocument = (type: 'SURAT_TUGAS' | 'SPPD' | 'LAPORAN' | 'FOTO_DOKUMENTASI', assignment: MonitoringAssignmentData, useTte: boolean) => {
    const html =
      type === 'SURAT_TUGAS'
        ? generateSuratTugasHtml(assignment, { schoolSetting, useTteTags: useTte })
        : type === 'SPPD'
        ? generateSppdHtml(assignment, { schoolSetting, useTteTags: useTte })
        : type === 'LAPORAN'
        ? generateLaporanHasilKegiatanHtml(assignment, { schoolSetting, useTteTags: useTte })
        : generateDokumentasiFotoHtml(assignment, { schoolSetting, useTteTags: useTte });

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
      }, 400);
    }
  };

  // Handler: Buka di Tab Baru
  const handleOpenInNewTab = (type: 'SURAT_TUGAS' | 'SPPD' | 'LAPORAN' | 'FOTO_DOKUMENTASI', assignment: MonitoringAssignmentData, useTte: boolean) => {
    const html =
      type === 'SURAT_TUGAS'
        ? generateSuratTugasHtml(assignment, { schoolSetting, useTteTags: useTte })
        : type === 'SPPD'
        ? generateSppdHtml(assignment, { schoolSetting, useTteTags: useTte })
        : type === 'LAPORAN'
        ? generateLaporanHasilKegiatanHtml(assignment, { schoolSetting, useTteTags: useTte })
        : generateDokumentasiFotoHtml(assignment, { schoolSetting, useTteTags: useTte });

    const newWin = window.open('', '_blank');
    if (newWin) {
      newWin.document.open();
      newWin.document.write(html);
      newWin.document.close();
    }
  };

  // Current Generated HTML for Preview Modal
  const previewHtml = useMemo(() => {
    if (!previewModal.assignment) return '';
    if (previewModal.type === 'SURAT_TUGAS') {
      return generateSuratTugasHtml(previewModal.assignment, { schoolSetting, useTteTags: previewModal.useTteTags });
    }
    if (previewModal.type === 'SPPD') {
      return generateSppdHtml(previewModal.assignment, { schoolSetting, useTteTags: previewModal.useTteTags });
    }
    if (previewModal.type === 'LAPORAN') {
      return generateLaporanHasilKegiatanHtml(previewModal.assignment, { schoolSetting, useTteTags: previewModal.useTteTags });
    }
    return generateDokumentasiFotoHtml(previewModal.assignment, { schoolSetting, useTteTags: previewModal.useTteTags });
  }, [previewModal, schoolSetting]);

  if (loading && assignments.length === 0) {
    return (
      <div className={`min-h-screen p-8 flex flex-col justify-center items-center space-y-4 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <div className="flex flex-col items-center">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-300">
            {loadingStage}
          </p>
          <p className="text-xs text-slate-500 mt-1 text-center max-w-sm">
            Harap tunggu, sistem sedang memproses data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 🚀 HEADER UTAMA */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider">
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Tim Pokja Prakerin — SI-ERIN</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Jadwal & Penugasan Monitoring Guru
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Tunjuk guru pembimbing untuk memonitor siswa di DUDI mitra, serta terbitkan{' '}
              <strong className="text-white">Surat Perintah Tugas</strong> dan{' '}
              <strong className="text-white">SPPD Kedinasan</strong> terintegrasi format TTE Jateng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Jadwalkan Monitoring</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="inline-flex items-center space-x-2 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Export data ke CSV"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => fileInputRefCsv.current?.click()}
                className="inline-flex items-center space-x-2 px-4 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-xl shadow-sky-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Import penugasan dari CSV"
              >
                <Upload className="w-4 h-4" />
                <span>Import CSV</span>
              </button>
              
  
              <input type="file" accept=".csv" ref={fileInputRefCsv} className="hidden" onChange={handleImportCsvChange} />
  
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all cursor-pointer"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ALERT NOTIFIKASI */}
      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center space-x-3 text-sm font-semibold transition-all ${
            message.type === 'success'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* 📊 STATISTIK CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div
          className={`p-5 rounded-2xl border transition-all ${
            theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Penugasan</p>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
              <ClipboardCheck className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mt-2">{stats.total}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Seluruh jadwal terdaftar</p>
        </div>

        <div
          className={`p-5 rounded-2xl border transition-all ${
            theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Terjadwal</p>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-amber-500 mt-2">{stats.terjadwal}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Menunggu proses/TTE</p>
        </div>

        <div
          className={`p-5 rounded-2xl border transition-all ${
            theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Terbit TTE</p>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-emerald-500 mt-2">{stats.terbitTte}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Dokumen TTE siap unduh</p>
        </div>

        <div
          className={`p-5 rounded-2xl border transition-all ${
            theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Industri Tujuan</p>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-purple-500 mt-2">{stats.uniqueIndustries}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Mitra DUDI termonitor</p>
        </div>

        <div
          className={`p-5 rounded-2xl border transition-all ${
            theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monitoring Selesai</p>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-blue-500 mt-2">{stats.selesai}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Tugas terlaksana</p>
        </div>
      </div>

      {/* 🔍 FILTER & SEARCH BAR */}
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-4 items-center justify-between ${
          theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        
        <div className="flex items-center gap-3">
          {selectedAssignments.length > 0 && (
            <>
              <button
                onClick={handleRequestTteBulk}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all"
            >
              <FileSignature className="w-4 h-4" />
              Minta TTE ({selectedAssignments.length})
            </button>

              <button
                onClick={() => setBulkUploadModal(prev => ({ ...prev, isOpen: true, targetTaskIds: selectedAssignments }))}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all"
              >
                <UploadCloud className="w-4 h-4" />
                Unggah Massal Hasil ({selectedAssignments.length})
              </button>
                <button
                  onClick={handlePrintMassalLaporan}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Massal Laporan ({selectedAssignments.length})
                </button>
  
  
                      </>
)}
        </div>

        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari Industri, Guru Petugas, atau Alamat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              theme === 'dark'
                ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-400'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        
        {/* Dropdown Filters: Jenis Penugasan & Status */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Dropdown Jenis Penugasan */}
          <div className="relative">
            <select
              value={purposeFilter}
              onChange={(e) => setPurposeFilter(e.target.value)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-800 shadow-sm'
              }`}
            >
              <option value="ALL">Semua Jenis Penugasan</option>
              <option value="PENERJUNAN">🚚 Penerjunan PKL</option>
              <option value="MONITORING">📋 Monitoring PKL</option>
              <option value="PENARIKAN">🎓 Penarikan PKL</option>
            </select>
          </div>

          {/* Dropdown Status */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-800 shadow-sm'
              }`}
            >
              <option value="ALL">Semua Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PROSES_TTE">Proses TTE</option>
              <option value="TERBIT_TTE">Terbit TTE</option>
              <option value="SELESAI">Selesai</option>
            </select>
          </div>
        </div>
      </div>

      {/* 📋 TABEL DAFTAR PENUGASAN MONITORING */}
      <div
        className={`rounded-3xl border overflow-hidden transition-all ${
          theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-md'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead
              className={`text-xs uppercase font-bold border-b ${
                theme === 'dark' ? 'bg-slate-800/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <tr>
                <th className="py-4 px-4 w-12 text-center">
    <input 
      type="checkbox" 
      onChange={(e) => {
        if (e.target.checked) {
          setSelectedAssignments(filteredAssignments.map(a => a.id as string));
        } else {
          setSelectedAssignments([]);
        }
      }}
      checked={selectedAssignments.length > 0 && selectedAssignments.length === filteredAssignments.length}
      className="rounded border-slate-300 text-indigo-500 focus:ring-indigo-500"
    />
  </th>
  <th className="py-4 px-4 w-12 text-center">No</th>
                <th className="py-4 px-6">Industri Mitra (DUDI)</th>
                <th className="py-4 px-6">Guru Petugas Monitoring</th>
                <th className="py-4 px-5">Tanggal Kunjungan</th>
                <th className="py-4 px-4 text-center">Jenis Tugas</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-6 text-center">Dokumen & Cetak</th>
                <th className="py-4 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                      <p className="text-xs font-semibold">Memuat Jadwal Monitoring...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ClipboardCheck className="w-10 h-10 text-slate-500/50" />
                      <p className="font-semibold text-sm">Belum ada penugasan monitoring yang dijadwalkan.</p>
                      <button
                        onClick={handleOpenAddModal}
                        className="text-xs font-bold text-indigo-500 hover:text-indigo-400 mt-1 cursor-pointer"
                      >
                        + Klik di sini untuk menjadwalkan sekarang
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((assignment, index) => {
                  const studentCount = assignment.industry._count?.placements || 0;
                  const companionCount = Array.isArray(assignment.companionTeachers)
                    ? assignment.companionTeachers.length
                    : 0;

                  return (
                    <tr
                      key={assignment.id}
                      className={`transition-colors ${
                        theme === 'dark' ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Checkbox per Item */}
                      <td className="py-4 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedAssignments.includes(assignment.id as string)}
                          onChange={(e) => {
                            const aId = assignment.id as string;
                            if (e.target.checked) {
                              setSelectedAssignments((prev) => [...prev, aId]);
                            } else {
                              setSelectedAssignments((prev) => prev.filter((id) => id !== aId));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* No */}
                      <td className="py-4 px-4 text-center font-semibold text-xs text-slate-400">
                        {index + 1}
                      </td>

                      {/* Industri */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="font-bold text-base text-indigo-500 hover:underline cursor-pointer">
                              {assignment.industry.name}
                            </span>
                            {Array.isArray(assignment.targetIndustries) && assignment.targetIndustries.length > 0 && (
                              <span
                                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                                title={`Rute Tambahan: ${assignment.targetIndustries.map((t: any) => t.name).join(', ')}`}
                              >
                                <Building className="w-3 h-3" />
                                <span>+{assignment.targetIndustries.length} Rute</span>
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 flex items-center space-x-1 mt-0.5 line-clamp-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span>{assignment.industry.address || assignment.industry.regency || 'Alamat belum diatur'}</span>
                          </span>
                          <div className="mt-1 flex items-center space-x-2">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              <GraduationCap className="w-3 h-3" />
                              <span>{studentCount} Siswa PKL</span>
                            </span>
                            {assignment.transportType && (
                              <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                                <Car className="w-3 h-3" />
                                <span>{assignment.transportType}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Guru Petugas */}
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <p className="font-bold text-sm leading-tight text-white">{assignment.teacher.name}</p>
                          <p className="text-xs text-slate-400">
                            NIP. {assignment.teacher.nip || assignment.teacher.username || '-'}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {assignment.teacher.rank && (
                              <span className="inline-block text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                                Gol: {assignment.teacher.rank}
                              </span>
                            )}
                            {companionCount > 0 && (
                              <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                +{companionCount} Pendamping
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tanggal */}
                      <td className="py-4 px-5">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-xs text-white">
                              {formatIndonesianDateRange(assignment.monitoringDate, assignment.returnDate)}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {calculateDurationDays(assignment.monitoringDate, assignment.returnDate)} Hari Kunjungan
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Jenis Tugas */}
                      <td className="py-4 px-4 text-center">
                        {(() => {
                          const aType = getAssignmentType(assignment.purpose);
                          return (
                            <span
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${aType.badgeClass}`}
                            >
                              <span>{aType.icon}</span>
                              <span>{aType.label}</span>
                            </span>
                          );
                        })()}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        {(() => {
                          const hasTugas = Boolean(assignment.suratTugasUrl);
                          const hasSppd = Boolean(assignment.sppdUrl);
                          const sBadge = getStatusBadge(assignment.status, hasTugas, hasSppd);
                          return (
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${sBadge.badgeClass}`}
                              >
                                {sBadge.label}
                              </span>
                              {(hasTugas || hasSppd) && (
                                <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-400">
                                  <span className={hasTugas ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                                    Tugas {hasTugas ? '✓' : '✗'}
                                  </span>
                                  <span>•</span>
                                  <span className={hasSppd ? 'text-teal-400 font-bold' : 'text-slate-500'}>
                                    SPPD {hasSppd ? '✓' : '✗'}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Dokumen & Cetak */}
                                            <td className="py-4 px-6">
                        <div className="flex flex-col space-y-3">
                          {/* 1. Surat Tugas */}
                          <div className="flex flex-col space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">1. Surat Tugas</span>
                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => setPreviewModal({ isOpen: true, type: 'SURAT_TUGAS', assignment, useTteTags: true })}
                                className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white text-[10px] font-bold border border-blue-500/30 transition-all cursor-pointer"
                                title="Pratinjau"
                              >
                                <Eye className="w-3 h-3" /> <span>Preview</span>
                              </button>
                              <a
                                href={`/api/pokja/monitoring/${assignment.id}/download-docx?type=tugas&tte=true`}
                                download
                                className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-600 text-blue-400 hover:text-white text-[10px] font-bold border border-blue-500/20 transition-all cursor-pointer"
                                title="Unduh DOCX"
                              >
                                <Download className="w-3 h-3" /> <span>DOCX</span>
                              </a>
                              {assignment.suratTugasUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDocViewerModal({
                                      isOpen: true,
                                      title: `Surat Tugas TTE - ${assignment.industry?.name || 'Industri'}`,
                                      url: assignment.suratTugasUrl!,
                                      subtitle: `Petugas: ${assignment.teacher?.name || 'Guru'}`,
                                    })
                                  }
                                  className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-600 text-emerald-400 hover:text-white text-[10px] font-bold border border-emerald-500/30 transition-all cursor-pointer"
                                  title="Lihat PDF TTE Resmi"
                                >
                                  <ShieldCheck className="w-3 h-3" /> <span>Hasil TTE</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 2. SPPD */}
                          <div className="flex flex-col space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2. SPPD</span>
                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => setPreviewModal({ isOpen: true, type: 'SPPD', assignment, useTteTags: true })}
                                className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-purple-600/15 hover:bg-purple-600 text-purple-400 hover:text-white text-[10px] font-bold border border-purple-500/30 transition-all cursor-pointer"
                                title="Pratinjau"
                              >
                                <Eye className="w-3 h-3" /> <span>Preview</span>
                              </button>
                              <a
                                href={`/api/pokja/monitoring/${assignment.id}/download-docx?type=sppd&tte=true`}
                                download
                                className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-600 text-purple-400 hover:text-white text-[10px] font-bold border border-purple-500/20 transition-all cursor-pointer"
                                title="Unduh DOCX"
                              >
                                <Download className="w-3 h-3" /> <span>DOCX</span>
                              </a>
                              {assignment.sppdUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDocViewerModal({
                                      isOpen: true,
                                      title: `SPPD TTE Resmi - ${assignment.industry?.name || 'Industri'}`,
                                      url: assignment.sppdUrl!,
                                      subtitle: `Petugas: ${assignment.teacher?.name || 'Guru'}`,
                                    })
                                  }
                                  className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-teal-500/15 hover:bg-teal-600 text-teal-400 hover:text-white text-[10px] font-bold border border-teal-500/30 transition-all cursor-pointer"
                                  title="Lihat PDF TTE Resmi"
                                >
                                  <ShieldCheck className="w-3 h-3" /> <span>Hasil TTE</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 3. Laporan Kunjungan */}
                          <div className="flex flex-col space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">3. Laporan Kunjungan</span>
                            <div className="flex items-center flex-wrap gap-1.5">
                              {/* Tombol Lihat Hasil Scan Unggahan (Jika sudah diunggah) */}
                              {assignment.laporanUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDocViewerModal({
                                      isOpen: true,
                                      title: `Hasil Scan Laporan - ${assignment.industry?.name || 'Industri'}`,
                                      url: assignment.laporanUrl!,
                                      subtitle: `Petugas: ${assignment.teacher?.name || 'Guru'} • Laporan Resmi Telah Diunggah`,
                                    })
                                  }
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer animate-in fade-in"
                                  title="Buka Dokumen Hasil Scan yang Telah Diunggah"
                                >
                                  <FileCheck2 className="w-3.5 h-3.5" /> <span>Hasil Scan</span>
                                </button>
                              )}

                              {/* Tombol Format Blanko Cetak A4 */}
                              <button
                                onClick={() => setPreviewModal({ isOpen: true, type: 'LAPORAN', assignment, useTteTags: false })}
                                className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-600 text-amber-500 hover:text-white text-[10px] font-bold border border-amber-500/30 transition-all cursor-pointer"
                                title="Pratinjau Format Blanko Cetak A4"
                              >
                                <Eye className="w-3 h-3" /> <span>{assignment.laporanUrl ? "Format A4" : "Preview"}</span>
                              </button>

                              {/* Tombol Unduh DOCX */}
                              <a
                                href={`/api/pokja/monitoring/${assignment.id}/download-docx?type=laporan&tte=false`}
                                download
                                className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-600 text-amber-500 hover:text-white text-[10px] font-bold border border-amber-500/20 transition-all cursor-pointer"
                                title="Unduh DOCX Format Laporan"
                              >
                                <Download className="w-3 h-3" /> <span>DOCX</span>
                              </a>
                            </div>
                          </div>

                          {/* 4. Dokumentasi Foto Kegiatan */}
                          <div className="flex flex-col space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">4. Foto Kegiatan</span>
                            <div className="flex items-center flex-wrap gap-1.5">
                              {(() => {
                                const rawPhotos = assignment.activityPhotos;
                                const photos: string[] = Array.isArray(rawPhotos)
                                  ? rawPhotos
                                  : (typeof rawPhotos === 'string'
                                    ? (() => { try { return JSON.parse(rawPhotos); } catch { return []; } })()
                                    : []);
                                const hasPhotos = photos.length > 0;
                                const isUploadingThis = uploadingRowPhotoId === assignment.id;

                                return (
                                  <>
                                    {/* Tombol Kelola & Upload Foto (Membuka Modal dengan Opsi Keterangan) */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUploadModal({
                                          isOpen: true,
                                          assignmentId: assignment.id!,
                                          industryName: assignment.industry?.name || 'Industri',
                                          teacherName: assignment.teacher?.name || 'Guru',
                                          type: 'LAPORAN',
                                          laporanUrl: assignment.laporanUrl || null,
                                          activityPhotos: photos,
                                          uploading: false,
                                          uploadingPhoto: false,
                                        });
                                      }}
                                      className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer bg-emerald-600/15 hover:bg-emerald-600 text-emerald-400 hover:text-white border-emerald-500/30 shadow-sm"
                                      title="Buka Modal Upload & Atur Keterangan Foto Kegiatan"
                                    >
                                      <Camera className="w-3 h-3" />
                                      <span>+ Foto ({photos.length})</span>
                                    </button>

                                    {/* Tombol Cetak Foto: AKTIF JIKA FOTO SUDAH DIUPLOAD */}
                                    {hasPhotos ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPreviewModal({
                                            isOpen: true,
                                            type: 'FOTO_DOKUMENTASI',
                                            assignment,
                                            useTteTags: false,
                                          })
                                        }
                                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-extrabold shadow-md shadow-indigo-600/30 transition-all cursor-pointer animate-in fade-in"
                                        title="Cetak Dokumentasi Kegiatan (Format F4, Maks 2 Foto/Halaman)"
                                      >
                                        <Printer className="w-3 h-3" />
                                        <span>Cetak Foto ({photos.length})</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled
                                        className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-800 text-slate-500 text-[10px] font-bold border border-slate-700/50 cursor-not-allowed opacity-60"
                                        title="Tombol cetak akan aktif setelah foto kegiatan diunggah"
                                      >
                                        <Printer className="w-3 h-3" />
                                        <span>Cetak Foto</span>
                                      </button>
                                    )}

                                    {/* Tombol Pratinjau / Galeri Foto */}
                                    {hasPhotos && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setGalleryModal({
                                            isOpen: true,
                                            title: `Dokumentasi Kunjungan: ${assignment.industry?.name || 'Monitoring'}`,
                                            photos,
                                            activeIndex: 0,
                                          })
                                        }
                                        className="inline-flex items-center space-x-1 px-1.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-600 text-teal-400 hover:text-white text-[10px] font-bold border border-teal-500/20 transition-all cursor-pointer"
                                        title="Lihat Galeri Foto Kegiatan"
                                      >
                                        <ImageIcon className="w-3 h-3" />
                                        <span>Lihat</span>
                                      </button>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Aksi Edit & Hapus */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              const rawPhotos = assignment.activityPhotos;
                              const photos: string[] = Array.isArray(rawPhotos)
                                ? rawPhotos
                                : (typeof rawPhotos === 'string'
                                  ? (() => { try { return JSON.parse(rawPhotos); } catch { return []; } })()
                                  : []);
                              setUploadModal({
                                isOpen: true,
                                assignmentId: assignment.id!,
                                industryName: assignment.industry?.name || 'Industri',
                                teacherName: assignment.teacher?.name || 'Guru',
                                type: 'LAPORAN',
                                laporanUrl: assignment.laporanUrl || null,
                                activityPhotos: photos,
                                uploading: false,
                                uploadingPhoto: false,
                              });
                            }}
                            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-sm border border-slate-200 dark:border-slate-700"
                            title="Unggah Dokumen & Foto Kegiatan"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                          
                          {assignment.laporanUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setDocViewerModal({
                                  isOpen: true,
                                  title: `Dokumen Hasil Scan - ${assignment.industry?.name || 'Industri'}`,
                                  url: assignment.laporanUrl!,
                                  subtitle: `Petugas: ${assignment.teacher?.name || 'Guru'}`,
                                })
                              }
                              className="p-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-600 text-emerald-400 hover:text-white transition-all cursor-pointer shadow-sm border border-emerald-500/30"
                              title="Buka Dokumen Hasil Scan (Unggahan)"
                            >
                              <FileCheck2 className="w-4 h-4" />
                            </button>
                          )}

                          {assignment.status !== 'MENUNGGU_TTE' &&
                            assignment.status !== 'PROSES_TTE' &&
                            assignment.status !== 'SELESAI_TTE' &&
                            assignment.status !== 'TERBIT_TTE' &&
                            !assignment.suratTugasUrl &&
                            !assignment.sppdUrl && (
                            <>
  
                              <button
                                onClick={async () => {
                                  if (!confirm('Anda yakin ingin mengirim penugasan ini ke Tata Usaha untuk di-TTE?')) return;
                                try {
                                  const res = await fetch('/api/pokja/monitoring/request-tte', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ ids: [assignment.id] })
                                  });
                                  if (res.ok) {
                                    alert('Berhasil mengirim permintaan TTE!');
                                    fetchData();
                                  }
                                } catch(e) {}
                              }}
                              className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-600 text-blue-500 hover:text-white transition-all cursor-pointer"
                              title="Minta TTE"
                            >
                              <FileSignature className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleOpenEditModal(assignment)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-all cursor-pointer"
                            title="Ubah Rincian Jadwal"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(assignment)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-all cursor-pointer"
                            title="Hapus Jadwal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====================================================================== */}
      {/* 🌟 MODAL FORM: JADWALKAN / EDIT MONITORING GURU */}
      {/* ====================================================================== */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-800/30 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {isEditing ? 'Ubah Rincian Monitoring Guru' : 'Jadwalkan Monitoring Baru'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tentukan industri tujuan, guru yang bertugas, dan parameter surat tugas & SPPD.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Form Fields */}
            <form onSubmit={handleSubmitForm} className="overflow-y-auto p-6 space-y-5 flex-1">
              {/* BARIS 1: PILIH INDUSTRI UTAMA (DROPDOWN + ALAMAT LANGSUNG DI SEBELAHNYA) */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Kolom Kiri: Dropdown Pilih Industri Mitra Utama */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Industri Mitra Tujuan Utama (DUDI) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={formIndustryId}
                      onChange={(e) => handleIndustryChange(e.target.value)}
                      className={`w-full px-4 py-3 rounded-2xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        theme === 'dark' ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      <option value="" disabled>
                        -- Pilih Industri Mitra Utama --
                      </option>
                      {industries.map((ind) => (
                        <option key={ind.id} value={ind.id}>
                          {ind.name} ({ind._count?.placements || 0} Siswa PKL)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Kolom Kanan: Alamat Industri Langsung Muncul di Sebelahnya */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Alamat Industri Tujuan
                      </label>
                      <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-full">
                        Dapat langsung diperbaiki jika kosong
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="Masukkan / perbaiki alamat industri lengkap..."
                      value={formIndustryAddress}
                      onChange={(e) => handleIndustryAddressChange(e.target.value)}
                      className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 ${
                        formIndustryId && (!formIndustryAddress || formIndustryAddress.trim() === '')
                          ? 'border-amber-500/80 bg-amber-500/10 text-amber-500 focus:ring-amber-500 placeholder-amber-400/70'
                          : theme === 'dark'
                          ? 'bg-slate-800/90 border-slate-700 text-white placeholder-slate-500 focus:ring-indigo-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-indigo-500'
                      }`}
                    />
                  </div>
                </div>

                {/* SUB-BARIS: INDUSTRI TAMBAHAN / RUTE KUNJUNGAN SEKALIGUS */}
                <div className="p-4 rounded-2xl border border-dashed border-indigo-500/30 bg-indigo-500/5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                        Industri Tambahan / Rute Sekaligus ({targetIndustries.length})
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={selectedAddIndustryId}
                        onChange={(e) => handleAddTargetIndustry(e.target.value)}
                        className={`text-xs px-2.5 py-1.5 rounded-xl border font-semibold ${
                          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="">+ Tambah Dari Mitra...</option>
                        {industries
                          .filter((ind) => ind.id !== formIndustryId && !targetIndustries.some((t) => t.id === ind.id))
                          .map((ind) => (
                            <option key={ind.id} value={ind.id}>
                              {ind.name}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddCustomTargetIndustry}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ketik Manual</span>
                      </button>
                    </div>
                  </div>

                  {targetIndustries.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      Belum ada industri rute tambahan. Jika monitoring mengunjungi beberapa industri sekaligus dalam 1 perjalanan, tambahkan di sini.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {targetIndustries.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50"
                        >
                          <span className="text-xs font-bold text-slate-400 px-1">{idx + 1}.</span>
                          <input
                            type="text"
                            placeholder="Nama Industri (PT / CV / Instansi)"
                            value={item.name}
                            onChange={(e) => handleUpdateTargetIndustry(idx, 'name', e.target.value)}
                            className={`flex-1 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                            }`}
                          />
                          <input
                            type="text"
                            placeholder="Alamat / Kota Industri"
                            value={item.address || ''}
                            onChange={(e) => handleUpdateTargetIndustry(idx, 'address', e.target.value)}
                            className={`flex-1 px-3 py-1.5 rounded-lg border text-xs ${
                              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveTargetIndustry(idx)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-all cursor-pointer self-end sm:self-center"
                            title="Hapus Industri Rute"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* BARIS 2: PILIH GURU UTAMA & PANGKAT / GOLONGAN */}
              <div className="space-y-1.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Guru Petugas Utama Monitoring <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={formTeacherId}
                      onChange={(e) => handleTeacherChange(e.target.value)}
                      className={`w-full px-4 py-3 rounded-2xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        theme === 'dark' ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      <option value="" disabled>
                        -- Pilih Guru Pembimbing / Petugas --
                      </option>
                      {teachers.map((tc) => (
                        <option key={tc.id} value={tc.id}>
                          {tc.name} {tc.nip ? `(NIP. ${tc.nip})` : tc.username ? `(${tc.username})` : ''} {tc.rank ? `[Gol: ${tc.rank}]` : ''} - {tc.department || tc.role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-56 space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Pangkat / Golongan</span>
                      <span className="text-[10px] font-normal text-indigo-400">(Muncul di SPPD)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Penata Muda / III a, IX, IV a"
                      value={formTeacherRank}
                      onChange={(e) => setFormTeacherRank(e.target.value)}
                      className={`w-full px-3.5 py-3 rounded-2xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        theme === 'dark' ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
                {formTeacherRank ? (
                  <p className="text-[11px] text-slate-400 italic">
                    Pangkat / Golongan: &quot;<span className="text-indigo-400 font-semibold">{formTeacherRank}</span>&quot; akan tercetak pada Poin 3 Lembar 1 SPPD.
                  </p>
                ) : formTeacherId ? (
                  <p className="text-[11px] text-amber-400 font-medium flex items-center gap-1.5 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Pangkat / Golongan guru ini belum terisi di profil. Silakan ketik langsung di kotak atas agar otomatis tersimpan dan tidak kosong di SPPD.</span>
                  </p>
                ) : null}
              </div>

              {/* BARIS 3: GURU PENDAMPING (OPSIONAL) */}
              <div className="p-4 rounded-2xl border border-dashed border-slate-700 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Guru Pendamping / Anggota Rombongan ({companions.length})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value=""
                      onChange={(e) => {
                        handleAddCompanionFromTeacher(e.target.value);
                      }}
                      className={`text-xs px-2.5 py-1.5 rounded-xl border font-semibold ${
                        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="">+ Tambah Dari Daftar Guru...</option>
                      {teachers
                        .filter((t) => t.id !== formTeacherId && !companions.some((c) => c.name === t.name))
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddCompanion}
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ketik Manual</span>
                    </button>
                  </div>
                </div>

                {companions.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Belum ada guru pendamping. Pilih guru dari daftar di atas atau klik &quot;Ketik Manual&quot; jika monitoring dilaksanakan bersama lebih dari satu guru (rombongan tim).
                  </p>
                ) : (
                  <div className="space-y-2">
                    {companions.map((comp, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50"
                      >
                        <span className="text-xs font-bold text-slate-400 px-1">{idx + 1}.</span>
                        <select
                          value={teachers.find((t) => t.name === comp.name)?.id || ''}
                          onChange={(e) => handleSelectCompanion(idx, e.target.value)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold max-w-[160px] ${
                            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                          }`}
                        >
                          <option value="">-- Pilih Guru --</option>
                          {teachers
                            .filter((t) => t.id !== formTeacherId)
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Nama Lengkap & Gelar Guru *"
                          value={comp.name}
                          onChange={(e) => handleUpdateCompanion(idx, 'name', e.target.value)}
                          className={`flex-1 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                          }`}
                        />
                        <input
                          type="text"
                          placeholder="NIP"
                          value={comp.nip || ''}
                          onChange={(e) => handleUpdateCompanion(idx, 'nip', e.target.value)}
                          className={`w-32 px-3 py-1.5 rounded-lg border text-xs ${
                            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                          }`}
                        />
                        <input
                          type="text"
                          placeholder="Pangkat/Gol (opsional)"
                          value={comp.rank || ''}
                          onChange={(e) => handleUpdateCompanion(idx, 'rank', e.target.value)}
                          className={`w-32 px-3 py-1.5 rounded-lg border text-xs ${
                            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                          }`}
                        />
                        <input
                          type="text"
                          placeholder="Jabatan"
                          value={comp.role || 'Guru'}
                          onChange={(e) => handleUpdateCompanion(idx, 'role', e.target.value)}
                          className={`w-24 px-3 py-1.5 rounded-lg border text-xs ${
                            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCompanion(idx)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-all cursor-pointer self-end sm:self-center"
                          title="Hapus Guru Pendamping"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* BARIS 4: TANGGAL MONITORING & TANGGAL HARUS KEMBALI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Tanggal Pelaksanaan / Berangkat <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formMonitoringDate}
                    onChange={(e) => {
                      setFormMonitoringDate(e.target.value);
                      if (!formReturnDate || formReturnDate < e.target.value) {
                        setFormReturnDate(e.target.value);
                      }
                    }}
                    className={`w-full px-4 py-3 rounded-2xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      theme === 'dark' ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Tanggal Harus Kembali (SPPD)
                  </label>
                  <input
                    type="date"
                    value={formReturnDate}
                    onChange={(e) => setFormReturnDate(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      theme === 'dark' ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* Banner Live Durasi */}
                {formMonitoringDate && (
                  <div className="sm:col-span-2 flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>
                      Durasi Monitoring: <strong>{calculateDurationDays(formMonitoringDate, formReturnDate)} Hari</strong>
                      {formReturnDate && formReturnDate !== formMonitoringDate && (
                        <> ({formatIndonesianDateRange(formMonitoringDate, formReturnDate)})</>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* BARIS 5: NOMOR SURAT TUGAS & NOMOR SPPD (DENGAN TTE TAG DEFAULT) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Nomor Surat Tugas
                    </label>
                    <span className="text-[10px] text-blue-400 font-mono">TTE: {'${nomor_naskah}'}</span>
                  </div>
                  <input
                    type="text"
                    value={formLetterNumber}
                    onChange={(e) => setFormLetterNumber(e.target.value)}
                    placeholder="800.1.11.1 /1000/2026 atau ${nomor_naskah}"
                    className={`w-full px-4 py-2.5 rounded-2xl border text-sm font-mono ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Nomor SPPD
                    </label>
                    <span className="text-[10px] text-blue-400 font-mono">TTE: {'${nomor_naskah}'}</span>
                  </div>
                  <input
                    type="text"
                    value={formSppdNumber}
                    onChange={(e) => setFormSppdNumber(e.target.value)}
                    placeholder="090/SPPD/2026 atau ${nomor_naskah}"
                    className={`w-full px-4 py-2.5 rounded-2xl border text-sm font-mono ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* BARIS 6: KENDARAAN & SUMBER ANGGARAN SPPD */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Maksud Perjalanan (Tujuan)</label>
                  <select
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-2xl border text-xs font-semibold ${theme === "dark" ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"}`}
                  >
                    <option value="Melaksanakan kegiatan Monitoring siswa Praktik Kerja Lapangan (PKL)">Monitoring PKL</option>
                    <option value="Melaksanakan kegiatan Penerjunan/Pengantaran siswa Praktik Kerja Lapangan (PKL)">Penerjunan / Pengantaran PKL</option>
                    <option value="Melaksanakan kegiatan Penarikan/Penjemputan siswa Praktik Kerja Lapangan (PKL)">Penarikan / Penjemputan PKL</option>
                  </select>
                </div>

                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Alat Angkut</label>
                  <select
                    value={formTransportType}
                    onChange={(e) => setFormTransportType(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-2xl border text-xs font-semibold ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="Mobil Dinas / Kendaraan Umum">Mobil Dinas / Kendaraan Umum</option>
                    <option value="Kendaraan Pribadi">Kendaraan Pribadi</option>
                    <option value="Sepeda Motor">Sepeda Motor</option>
                    <option value="Kendaraan Dinas">Kendaraan Dinas</option>
                    <option value="Kendaraan Umum">Kendaraan Umum</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Instansi Pembebanan</label>
                  <input
                    type="text"
                    value={formBudgetSource}
                    onChange={(e) => setFormBudgetSource(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-2xl border text-xs ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Akun Anggaran</label>
                  <input
                    type="text"
                    value={formBudgetAccount}
                    onChange={(e) => setFormBudgetAccount(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-2xl border text-xs ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* BARIS 7: STATUS & CATATAN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Status Penugasan</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-2xl border text-xs font-semibold ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="TERJADWAL">TERJADWAL</option>
                    <option value="SELESAI">SELESAI</option>
                    <option value="DIBATALKAN">DIBATALKAN</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Catatan Lain-Lain</label>
                  <input
                    type="text"
                    placeholder="Contoh: Bawa instrumen penilaian / format monitoring"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-2xl border text-xs ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-800/30 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{isEditing ? 'Simpan Perubahan' : 'Jadwalkan Penugasan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* 🌟 MODAL PREVIEW & CETAK DOKUMEN (SURAT TUGAS & SPPD) */}
      {/* ====================================================================== */}
      {previewModal.isOpen && previewModal.assignment && (
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
                  {previewModal.type === 'SURAT_TUGAS' ? (
                    <FileSignature className="w-5 h-5" />
                  ) : previewModal.type === 'SPPD' ? (
                    <FileText className="w-5 h-5" />
                  ) : previewModal.type === 'LAPORAN' ? (
                    <ClipboardCheck className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Camera className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {previewModal.type === 'SURAT_TUGAS'
                      ? 'Surat Perintah Tugas Monitoring'
                      : previewModal.type === 'SPPD'
                      ? 'Surat Perintah Perjalanan Dinas (SPPD)'
                      : previewModal.type === 'LAPORAN'
                      ? 'Laporan Hasil Kegiatan Monitoring'
                      : 'Dokumentasi Foto Kegiatan PKL (Ukuran F4)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tujuan: <strong className="text-white">{previewModal.assignment.industry.name}</strong> • Petugas:{' '}
                    <strong className="text-white">{previewModal.assignment.teacher.name}</strong>
                  </p>
                </div>
              </div>

              {/* Action Buttons: Toggle TTE, Print, New Tab, Tutup */}
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
                  onClick={() =>
                    handlePrintDocument(previewModal.type, previewModal.assignment!, previewModal.useTteTags)
                  }
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{previewModal.type === 'FOTO_DOKUMENTASI' ? 'Cetak F4 (Folio)' : 'Cetak A4'}</span>
                </button>

                {/* Download Real DOCX Button */}
                {previewModal.type !== 'FOTO_DOKUMENTASI' && (
                  <a
                    href={`/api/pokja/monitoring/${previewModal.assignment.id}/download-docx?type=${
                      previewModal.type === 'SURAT_TUGAS'
                        ? 'tugas'
                        : previewModal.type === 'SPPD'
                        ? 'sppd'
                        : 'laporan'
                    }&tte=${previewModal.useTteTags}`}
                    download
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                    title="Unduh berkas resmi Microsoft Word (.docx)"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh DOCX</span>
                  </a>
                )}

                {/* Open in New Tab */}
                <button
                  type="button"
                  onClick={() =>
                    handleOpenInNewTab(previewModal.type, previewModal.assignment!, previewModal.useTteTags)
                  }
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="Buka di Tab Baru"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>

                {/* Prominent Header Close Button */}
                <button
                  type="button"
                  onClick={() => setPreviewModal((prev) => ({ ...prev, isOpen: false }))}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold border border-rose-500/30 transition-all cursor-pointer shadow-sm ml-1"
                  title="Tutup Pratinjau (Esc)"
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

            {/* Modal Footer with Actions and Close Button */}
            <div className="px-6 py-3 border-t border-slate-800/30 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {previewModal.type === 'FOTO_DOKUMENTASI'
                    ? 'Dokumentasi Resmi SMK Negeri 1 Adiwerna • Ukuran F4 (Folio) • Maksimal 2 Foto / Halaman'
                    : 'Dokumen Resmi SMK Negeri 1 Adiwerna • Presisi 1 Halaman A4'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() =>
                    handlePrintDocument(previewModal.type, previewModal.assignment!, previewModal.useTteTags)
                  }
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold border border-indigo-500/30 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{previewModal.type === 'FOTO_DOKUMENTASI' ? 'Cetak F4 (Folio)' : 'Cetak A4'}</span>
                </button>
                {previewModal.type !== 'FOTO_DOKUMENTASI' && (
                  <a
                    href={`/api/pokja/monitoring/${previewModal.assignment.id}/download-docx?type=${
                      previewModal.type === 'SURAT_TUGAS'
                        ? 'tugas'
                        : previewModal.type === 'SPPD'
                        ? 'sppd'
                        : 'laporan'
                    }&tte=${previewModal.useTteTags}`}
                    download
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-xs font-semibold border border-blue-500/30 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh DOCX</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewModal((prev) => ({ ...prev, isOpen: false }))}
                  className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Tutup</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* ⚠️ MODAL KONFIRMASI HAPUS JADWAL */}
      {/* ====================================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center space-x-3 text-rose-500">
              <div className="p-3 rounded-2xl bg-rose-500/10">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Hapus Jadwal Monitoring?</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Apakah Anda yakin ingin membatalkan & menghapus penugasan monitoring guru{' '}
              <strong className="text-white">{deleteTarget.teacher.name}</strong> ke{' '}
              <strong className="text-white">{deleteTarget.industry.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    
        {/* MODAL UNGGAH HASIL KUNJUNGAN & FOTO DOKUMENTASI */}
        {uploadModal.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Hasil & Dokumentasi Monitoring</h3>
                    <p className="text-[11px] font-semibold text-slate-500 line-clamp-1">{uploadModal.teacherName} • {uploadModal.industryName}</p>
                  </div>
                </div>
                <button
                  onClick={() => !uploadModal.uploading && !uploadModal.uploadingPhoto && setUploadModal(prev => ({ ...prev, isOpen: false }))}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
                {/* BAGIAN 1: Dokumen Hasil Laporan (PDF / Berkas Scan) */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <span>Dokumen Hasil Laporan (PDF / Scan)</span>
                    </label>
                    {uploadModal.laporanUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setDocViewerModal({
                            isOpen: true,
                            title: `Dokumen Hasil Scan - ${uploadModal.industryName}`,
                            url: uploadModal.laporanUrl!,
                            subtitle: `Petugas: ${uploadModal.teacherName} • Berkas Tersimpan`,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white text-[11px] font-bold border border-indigo-500/30 transition-all cursor-pointer"
                        title="Lihat Berkas Hasil Scan"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Berkas</span>
                      </button>
                    )}
                  </div>

                  <label className="cursor-pointer flex flex-col items-center justify-center w-full py-4 px-3 border-2 border-dashed rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                    <Upload className={`w-6 h-6 mb-1.5 ${uploadModal.uploading ? 'text-indigo-400 animate-bounce' : 'text-slate-400'}`} />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center">
                      {uploadModal.uploading ? 'Sedang mengunggah...' : uploadModal.laporanUrl ? 'Ganti Berkas Laporan (PDF)' : 'Unggah Berkas Laporan (PDF/Scan)'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Format: PDF (Maks 10MB)</p>
                    <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} disabled={uploadModal.uploading} />
                  </label>
                </div>

                {/* BAGIAN 2: Upload Foto Dokumentasi Kegiatan (Maks 20 Foto, Format F4, Multi-PT) */}
                {(() => {
                  const activeUploadAssignment = assignments.find((a) => a.id === uploadModal.assignmentId);
                  const primaryInd = activeUploadAssignment?.industry?.name || uploadModal.industryName;
                  const addInds = activeUploadAssignment?.targetIndustries
                    ? parseTargetIndustries(activeUploadAssignment.targetIndustries).map((i: any) => i.name)
                    : [];
                  const visitedIndustries = Array.from(new Set([primaryInd, ...addInds].filter(Boolean)));
                  const photoList = uploadModal.activityPhotos || [];

                  return (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <Camera className="w-4 h-4 text-emerald-500" />
                          <span>Foto Dokumentasi Kegiatan (Format Cetak F4)</span>
                        </label>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                          {photoList.length} Foto
                        </span>
                      </div>

                      {/* Notifikasi / Info jika kunjungan ke beberapa PT dalam 1 SPPD */}
                      {visitedIndustries.length > 1 ? (
                        <div className="bg-indigo-500/10 border border-indigo-500/25 rounded-xl p-2.5 text-xs text-indigo-400 dark:text-indigo-300">
                          <div className="flex items-center gap-1.5 font-bold mb-0.5">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>Kunjungan Multi-Industri ({visitedIndustries.length} PT / DUDI)</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            Foto kegiatan di seluruh PT akan otomatis disatukan dalam 1 dokumen cetak F4 terpadu (maks. 2 foto/halaman). Anda dapat menyematkan nama PT pada keterangan foto (opsional).
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          Unggah dokumentasi foto saat kegiatan. Dokumen cetak F4 (Folio) akan otomatis membagi foto maksimal 2 per halaman dengan nomor surat di pojok kanan.
                        </p>
                      )}

                      {/* Grid Foto yang Sudah Diunggah */}
                      {photoList.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {photoList.map((photoItemRaw, slotIndex) => {
                            const photoUrl = typeof photoItemRaw === 'string' ? photoItemRaw : photoItemRaw?.url;
                            const photoCaption = typeof photoItemRaw === 'object' ? (photoItemRaw?.caption || '') : '';
                            const isEditingThis = editingPhotoIndex === slotIndex;

                            return (
                              <div
                                key={slotIndex}
                                className="flex flex-col rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-sm"
                              >
                                {/* Thumbnail Foto */}
                                <div className="relative group aspect-video overflow-hidden bg-slate-950 flex items-center justify-center">
                                  <img
                                    src={getSafeFileUrl(photoUrl)}
                                    alt={`Foto Kegiatan ${slotIndex + 1}`}
                                    className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                                    onClick={() =>
                                      setGalleryModal({
                                        isOpen: true,
                                        title: `Dokumentasi: ${uploadModal.industryName}`,
                                        photos: photoList,
                                        activeIndex: slotIndex,
                                      })
                                    }
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePhoto(photoUrl)}
                                    disabled={uploadModal.uploadingPhoto}
                                    className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-rose-600/90 text-white hover:bg-rose-600 transition-all cursor-pointer opacity-90 group-hover:opacity-100 shadow"
                                    title="Hapus foto ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/60 text-white backdrop-blur-sm">
                                    Foto {slotIndex + 1}
                                  </span>
                                </div>

                                {/* Keterangan Foto & Aksi Edit */}
                                <div className="p-2.5 flex flex-col justify-between flex-1 gap-1.5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800">
                                  {isEditingThis ? (
                                    <div className="space-y-1.5">
                                      <input
                                        type="text"
                                        value={editCaptionValue}
                                        onChange={(e) => setEditCaptionValue(e.target.value)}
                                        placeholder="Keterangan foto (opsional)..."
                                        className="w-full text-xs px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        autoFocus
                                      />
                                      {visitedIndustries.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {visitedIndustries.map((indName, idx) => (
                                            <button
                                              key={idx}
                                              type="button"
                                              onClick={() => setEditCaptionValue(`Kegiatan di ${indName}`)}
                                              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 hover:bg-indigo-500/20 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                            >
                                              {indName}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                      <div className="flex items-center justify-end gap-1.5 pt-0.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingPhotoIndex(null);
                                            setEditCaptionValue('');
                                          }}
                                          className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer"
                                        >
                                          Batal
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSavePhotoCaption(photoUrl, editCaptionValue)}
                                          disabled={savingCaption}
                                          className="px-2.5 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all cursor-pointer"
                                        >
                                          {savingCaption ? 'Menyimpan...' : 'Simpan'}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between gap-1.5">
                                      <div className="text-[11px] leading-snug truncate">
                                        {photoCaption ? (
                                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            {photoCaption}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 italic text-[10px]">
                                            Tanpa keterangan khusus
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingPhotoIndex(slotIndex);
                                          setEditCaptionValue(photoCaption);
                                        }}
                                        className="shrink-0 p-1 rounded-md text-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                                        title="Ubah / Tambah Keterangan"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center text-slate-400">
                          <Camera className="w-8 h-8 mx-auto mb-1.5 opacity-40" />
                          <p className="text-xs font-semibold">Belum ada foto kegiatan yang diunggah</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Gunakan form di bawah untuk memilih foto</p>
                        </div>
                      )}

                      {/* Input Keterangan Opsional & Upload Foto Baru */}
                      {photoList.length < 20 && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-2">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                Keterangan / Nama PT untuk Foto Berikutnya:
                              </label>
                              <span className="text-[10px] text-slate-400">Tidak wajib isi (opsional)</span>
                            </div>
                            <input
                              type="text"
                              value={photoUploadCaption}
                              onChange={(e) => setPhotoUploadCaption(e.target.value)}
                              placeholder="Misal: Foto kunjungan monitoring di PT Serayu Multi Connection..."
                              className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            />
                            {visitedIndustries.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <span className="text-[10px] text-slate-400">Pilih cepat PT:</span>
                                {visitedIndustries.map((indName, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setPhotoUploadCaption(`Kegiatan di ${indName}`)}
                                    className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-transparent hover:border-emerald-500/30"
                                    title={`Gunakan: Kegiatan di ${indName}`}
                                  >
                                    {indName}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <label className="cursor-pointer flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all">
                            <Camera className={`w-4 h-4 ${uploadModal.uploadingPhoto ? 'animate-bounce' : ''}`} />
                            <span>{uploadModal.uploadingPhoto ? 'Sedang Mengunggah...' : '+ Pilih Foto Kegiatan (Bisa Lebih dari 1 Foto)'}</span>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              multiple
                              onChange={handlePhotoUpload}
                              disabled={uploadModal.uploadingPhoto}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  {uploadModal.activityPhotos && uploadModal.activityPhotos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const found = assignments.find((a) => a.id === uploadModal.assignmentId);
                        if (found) {
                          setPreviewModal({
                            isOpen: true,
                            type: 'FOTO_DOKUMENTASI',
                            assignment: found,
                            useTteTags: false,
                          });
                        }
                      }}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                      title="Cetak Dokumentasi Foto Kegiatan (Format F4)"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Cetak Dokumentasi F4</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setUploadModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Selesai / Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL LIGHTBOX / GALERI FOTO KEGIATAN */}
        {galleryModal.isOpen && galleryModal.photos.length > 0 && (() => {
          const activePhoto = galleryModal.photos[galleryModal.activeIndex];
          const activePhotoUrl = typeof activePhoto === 'string' ? activePhoto : activePhoto?.url || '';
          const activePhotoCaption = typeof activePhoto === 'object' ? activePhoto?.caption || '' : '';

          return (
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
              onClick={() => setGalleryModal(prev => ({ ...prev, isOpen: false }))}
            >
              <div className="relative max-w-4xl w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                <div className="w-full flex items-center justify-between text-white pb-3">
                  <div>
                    <h4 className="font-bold text-sm">{galleryModal.title}</h4>
                    <p className="text-xs text-slate-400">
                      Foto {galleryModal.activeIndex + 1} dari {galleryModal.photos.length}
                    </p>
                  </div>
                  <button
                    onClick={() => setGalleryModal(prev => ({ ...prev, isOpen: false }))}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="relative w-full max-h-[75vh] flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-black/50 border border-white/10 p-2">
                  <img
                    src={getSafeFileUrl(activePhotoUrl)}
                    alt={`Dokumentasi ${galleryModal.activeIndex + 1}`}
                    className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl"
                  />

                  {activePhotoCaption && (
                    <div className="mt-2.5 text-center text-xs font-medium text-slate-200 bg-black/70 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-sm max-w-xl truncate">
                      {activePhotoCaption}
                    </div>
                  )}

                  {galleryModal.photos.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setGalleryModal(prev => ({
                            ...prev,
                            activeIndex: (prev.activeIndex - 1 + prev.photos.length) % prev.photos.length,
                          }))
                        }
                        className="absolute left-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white cursor-pointer transition-all border border-white/20"
                        title="Sebelumnya"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() =>
                          setGalleryModal(prev => ({
                            ...prev,
                            activeIndex: (prev.activeIndex + 1) % prev.photos.length,
                          }))
                        }
                        className="absolute right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white cursor-pointer transition-all border border-white/20"
                        title="Selanjutnya"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>

                {galleryModal.photos.length > 1 && (
                  <div className="flex items-center gap-2 mt-3 overflow-x-auto max-w-full pb-1">
                    {galleryModal.photos.map((p, idx) => {
                      const pUrl = typeof p === 'string' ? p : p?.url || '';
                      return (
                        <button
                          key={idx}
                          onClick={() => setGalleryModal(prev => ({ ...prev, activeIndex: idx }))}
                          className={`shrink-0 w-14 h-10 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                            galleryModal.activeIndex === idx ? 'border-indigo-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={getSafeFileUrl(pUrl)} alt="" className="w-full h-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* MODAL PRATINJAU DOKUMEN HASIL SCAN (PDF / GAMBAR) */}
        {docViewerModal.isOpen && docViewerModal.url && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setDocViewerModal((prev) => ({ ...prev, isOpen: false }))}
          >
            <div
              className={`w-full max-w-5xl h-[94vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-800/30 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{docViewerModal.title}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Dokumen Hasil Scan
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      {docViewerModal.subtitle || 'Berkas resmi yang telah diunggah untuk penugasan monitoring ini.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href={getSafeFileUrl(docViewerModal.url)}
                    download
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                    title="Unduh Berkas Scan"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh File</span>
                  </a>
                  <a
                    href={getSafeFileUrl(docViewerModal.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                    title="Buka di Tab Baru"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setDocViewerModal((prev) => ({ ...prev, isOpen: false }))}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold border border-rose-500/30 transition-all cursor-pointer shadow-sm ml-1"
                    title="Tutup (Esc)"
                  >
                    <X className="w-4 h-4" />
                    <span>Tutup</span>
                  </button>
                </div>
              </div>

              {/* Body: Viewer */}
              <div className="flex-1 bg-slate-900/90 p-3 sm:p-4 overflow-hidden flex justify-center items-center">
                {docViewerModal.url.toLowerCase().endsWith('.png') ||
                docViewerModal.url.toLowerCase().endsWith('.jpg') ||
                docViewerModal.url.toLowerCase().endsWith('.jpeg') ||
                docViewerModal.url.toLowerCase().endsWith('.webp') ||
                docViewerModal.url.startsWith('data:image/') ? (
                  <img
                    src={getSafeFileUrl(docViewerModal.url)}
                    alt="Dokumen Hasil Scan"
                    className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl border border-slate-700"
                  />
                ) : (
                  <iframe
                    src={getSafeFileUrl(docViewerModal.url)}
                    className="w-full h-full rounded-2xl bg-white shadow-2xl border border-slate-700"
                    title="Pratinjau Dokumen PDF"
                  />
                )}
              </div>
            </div>
          </div>
        )}
</div>
  );
}




