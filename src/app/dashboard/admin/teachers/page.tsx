// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✨ Fitur Baru: Halaman Manajemen Data Guru & Tenaga Pendidik (Admin).
// 🔧 Fitur Lengkap:
//    - Tabel lengkap: Nama Lengkap & Gelar, NIP, Pangkat, Golongan, Nomor WhatsApp, Jurusan/Mapel.
//    - Direct WhatsApp Click-to-Chat (wa.me) & copy nomor.
//    - Filter pencarian cerdas (Nama, NIP, Pangkat, Golongan, WA, Mapel) & filter role/kepegawaian.
//    - Modal Tambah Guru & Modal Edit Guru dengan pilihan cepat Pangkat & Golongan kepegawaian.
//    - Unduh Template CSV 1-Klik & Modal Import CSV cepat dengan live preview.
//    - Ekspor data guru ke format CSV.
//    - Kartu statistik cepat (Total Guru, PNS, PPPK, Kontak WA).
// 🎨 UI/UX Update: Tema Glassmorphic modern dark/light mode SI-ERIN v2.0.
// 🚀 Inovasi: Terintegrasi penuh sebagai data acuan Surat Tugas & SPPD TTE.
// ----------------------------------------------------------------------

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';
import {
  GraduationCap,
  Users,
  Search,
  Plus,
  Edit3,
  Trash2,
  FileSpreadsheet,
  Download,
  UploadCloud,
  Phone,
  MessageCircle,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Eye,
  Award,
  ShieldCheck,
  Building,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Send,
  FileText
} from 'lucide-react';

interface TeacherItem {
  id: string;
  name: string;
  username: string;
  nip: string | null;
  rank: string | null;       // Pangkat (e.g. Penata Muda, Pembina)
  golongan: string | null;   // Golongan ruang (e.g. III/a, IV/a, IX)
  phone: string | null;      // Nomor WhatsApp
  role: string;
  department: string | null;
  jobTitle: string | null;   // Guru, Tata Usaha, Staff
  employeeType: string | null; // PNS, PPPK, HONORER
  createdAt?: string;
  _count?: {
    supervisedStudents?: number;
    monitoringAssignments?: number;
  };
}

const KEPEGAWAIAN_OPTIONS = [
  { value: 'PNS', label: 'PNS (Pegawai Negeri Sipil)' },
  { value: 'PPPK', label: 'PPPK (Perjanjian Kerja)' },
  { value: 'HONORER', label: 'Honorer / Non-PNS' },
];

const JABATAN_OPTIONS = [
  { value: 'Guru', label: 'Guru' },
  { value: 'Tata Usaha', label: 'Tata Usaha' },
  { value: 'Staff', label: 'Staff' },
];

const PANGKAT_OPTIONS = [
  'Pengatur Muda (II/a)',
  'Pengatur Muda Tingkat I (II/b)',
  'Pengatur (II/c)',
  'Pengatur Tingkat I (II/d)',
  'Penata Muda (III/a)',
  'Penata Muda Tingkat I (III/b)',
  'Penata (III/c)',
  'Penata Tingkat I (III/d)',
  'Pembina (IV/a)',
  'Pembina Tingkat I (IV/b)',
  'Pembina Utama Muda (IV/c)',
  'Ahli Pertama',
  'Ahli Muda',
  'Ahli Madya',
];

const GOLONGAN_OPTIONS = [
  'II/a',
  'II/b',
  'II/c',
  'II/d',
  'III/a',
  'III/b',
  'III/c',
  'III/d',
  'IV/a',
  'IV/b',
  'IV/c',
  'IV/d',
  'IX', // PPPK
  'X',  // PPPK
  'XI', // PPPK
];

export default function AdminTeachersManagementPage() {
  const { data: session } = useSession();
  const { theme } = useTheme();

  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [kepegawaianFilter, setKepegawaianFilter] = useState('ALL');
  const [jabatanFilter, setJabatanFilter] = useState('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Alerts
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTeacher, setActiveTeacher] = useState<TeacherItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State (Add / Edit)
  const [formName, setFormName] = useState('');
  const [formNip, setFormNip] = useState('');
  const [formRank, setFormRank] = useState('');
  const [formGolongan, setFormGolongan] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formRole, setFormRole] = useState('GURU');
  const [formJobTitle, setFormJobTitle] = useState('Guru');
  const [formEmployeeType, setFormEmployeeType] = useState('PNS');
  const [formPassword, setFormPassword] = useState('');

  // Quick Import State
  const [importCsvText, setImportCsvText] = useState('');
  const [importParsedPreview, setImportParsedPreview] = useState<any[]>([]);

  // Fetch Teachers
  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/teachers');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTeachers(data.data);
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal memuat data guru.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan saat memuat data guru.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  // Copy to clipboard helper
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered Teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      // Role Filter
      if (roleFilter !== 'ALL' && t.role.toUpperCase() !== roleFilter.toUpperCase()) {
        return false;
      }

      // Jabatan Fungsional Filter
      if (jabatanFilter !== 'ALL' && (t.jobTitle || 'Guru').toLowerCase() !== jabatanFilter.toLowerCase()) {
        return false;
      }

      // Kepegawaian Filter
      if (kepegawaianFilter !== 'ALL') {
        const emp = (t.employeeType || (t.nip && t.nip !== '-' ? 'PNS' : 'HONORER')).toUpperCase();
        if (emp !== kepegawaianFilter.toUpperCase()) return false;
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = t.name.toLowerCase().includes(q);
        const matchNip = t.nip ? t.nip.toLowerCase().includes(q) : false;
        const matchRank = t.rank ? t.rank.toLowerCase().includes(q) : false;
        const matchGol = t.golongan ? t.golongan.toLowerCase().includes(q) : false;
        const matchPhone = t.phone ? t.phone.toLowerCase().includes(q) : false;
        const matchDept = t.department ? t.department.toLowerCase().includes(q) : false;
        const matchJob = t.jobTitle ? t.jobTitle.toLowerCase().includes(q) : false;
        const matchEmp = t.employeeType ? t.employeeType.toLowerCase().includes(q) : false;
        if (!matchName && !matchNip && !matchRank && !matchGol && !matchPhone && !matchDept && !matchJob && !matchEmp) {
          return false;
        }
      }

      return true;
    });
  }, [teachers, search, roleFilter, kepegawaianFilter, jabatanFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = teachers.length;
    const pnsCount = teachers.filter(t => (t.employeeType || (t.nip && t.nip.trim() !== '' && t.nip !== '-' ? 'PNS' : 'HONORER')) === 'PNS').length;
    const pppkCount = teachers.filter(t => (t.employeeType || '') === 'PPPK' || (!t.employeeType && ((t.golongan && t.golongan.toUpperCase().includes('IX')) || (t.rank && t.rank.toUpperCase().includes('IX'))))).length;
    const honorerCount = teachers.filter(t => (t.employeeType || (t.nip && t.nip.trim() !== '' && t.nip !== '-' ? 'PNS' : 'HONORER')) === 'HONORER').length;
    const waCount = teachers.filter(t => t.phone && t.phone.trim() !== '' && t.phone !== '-').length;
    return { total, pnsCount, pppkCount, honorerCount, waCount };
  }, [teachers]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage) || 1;
  const paginatedTeachers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTeachers.slice(start, start + itemsPerPage);
  }, [filteredTeachers, currentPage]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormName('');
    setFormNip('');
    setFormRank('');
    setFormGolongan('');
    setFormPhone('');
    setFormDepartment('Teknik Komputer dan Jaringan');
    setFormRole('GURU');
    setFormJobTitle('Guru');
    setFormEmployeeType('PNS');
    setFormPassword('');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (t: TeacherItem) => {
    setActiveTeacher(t);
    setFormName(t.name);
    setFormNip(t.nip || '');
    setFormRank(t.rank || '');
    setFormGolongan(t.golongan || '');
    setFormPhone(t.phone || '');
    setFormDepartment(t.department || '');
    setFormRole(t.role);
    setFormJobTitle(t.jobTitle || 'Guru');
    setFormEmployeeType(t.employeeType || (t.nip && t.nip !== '-' ? 'PNS' : 'HONORER'));
    setFormPassword('');
    setShowEditModal(true);
  };

  // Open Detail Modal
  const handleOpenDetail = (t: TeacherItem) => {
    setActiveTeacher(t);
    setShowDetailModal(true);
  };

  // Save New Teacher
  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Nama guru wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          nip: formNip.trim() || null,
          rank: formRank.trim() || null,
          golongan: formGolongan.trim() || null,
          phone: formPhone.trim() || null,
          department: formDepartment.trim() || null,
          role: formRole,
          jobTitle: formJobTitle.trim() || 'Guru',
          employeeType: formEmployeeType,
          password: formPassword.trim() || 'guru12345',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message || 'Guru berhasil ditambahkan.' });
        setShowAddModal(false);
        fetchTeachers();
      } else {
        alert(data.error || 'Gagal menambahkan guru.');
      }
    } catch (err: any) {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  // Save Edit Teacher
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeacher) return;
    if (!formName.trim()) {
      alert('Nama guru wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/teachers/${activeTeacher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          nip: formNip.trim() || null,
          rank: formRank.trim() || null,
          golongan: formGolongan.trim() || null,
          phone: formPhone.trim() || null,
          department: formDepartment.trim() || null,
          role: formRole,
          jobTitle: formJobTitle.trim() || 'Guru',
          employeeType: formEmployeeType,
          ...(formPassword.trim() && { password: formPassword.trim() }),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message || 'Data guru berhasil diperbarui.' });
        setShowEditModal(false);
        fetchTeachers();
      } else {
        alert(data.error || 'Gagal memperbarui data guru.');
      }
    } catch (err: any) {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Teacher
  const handleDelete = async (t: TeacherItem) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data guru "${t.name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/teachers/${t.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message || 'Guru berhasil dihapus.' });
        fetchTeachers();
      } else {
        alert(data.error || 'Gagal menghapus guru.');
      }
    } catch (err: any) {
      alert('Terjadi kesalahan jaringan saat menghapus guru.');
    }
  };

  // Download Sample CSV Template
  const handleDownloadTemplateCsv = () => {
    const sampleCsv = `Nama Lengkap,NIP,Jenis Kepegawaian,Jabatan Fungsional,Pangkat,Golongan,Nomor WhatsApp,Jurusan / Mapel,Role
Mohammad Rahmad Rifa'i, S.Pd.,199510302022211002,PNS,Guru,Penata Muda,III/a,081234567890,Teknik Komputer dan Jaringan,GURU
Harits Rusli, S.Kom,199304072022211004,PPPK,Guru,Ahli Pertama,IX,085678901234,Teknik Komputer dan Jaringan,GURU
Salman Alfarizi, S.Kom,199107302025211019,PNS,Guru,Pembina,IV/a,089876543210,Teknik Komputer dan Jaringan,POKJA
Dra. Hj. Siti Aminah,196805121994032005,PNS,Guru,Pembina Tk. I,IV/b,087712345678,Bimbingan Konseling,GURU
Budi Santoso, S.T.,-,HONORER,Staff,Guru Honorer,-,081398765432,Teknik Otomotif,GURU
Siti Nurjanah, A.Md.,-,HONORER,Tata Usaha,Staf Administrasi,-,081299887766,Administrasi Perkantoran,GURU`;

    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_master_guru_sierin.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export current teachers as CSV
  const handleExportCsv = () => {
    if (teachers.length === 0) {
      alert('Tidak ada data guru untuk diekspor.');
      return;
    }

    let csvContent = 'Nama Lengkap,NIP,Jenis Kepegawaian,Jabatan Fungsional,Pangkat,Golongan,Nomor WhatsApp,Jurusan / Mapel,Role\n';
    teachers.forEach((t) => {
      const row = [
        `"${(t.name || '').replace(/"/g, '""')}"`,
        `"${(t.nip || '').replace(/"/g, '""')}"`,
        `"${(t.employeeType || (t.nip && t.nip !== '-' ? 'PNS' : 'HONORER')).replace(/"/g, '""')}"`,
        `"${(t.jobTitle || 'Guru').replace(/"/g, '""')}"`,
        `"${(t.rank || '').replace(/"/g, '""')}"`,
        `"${(t.golongan || '').replace(/"/g, '""')}"`,
        `"${(t.phone || '').replace(/"/g, '""')}"`,
        `"${(t.department || '').replace(/"/g, '""')}"`,
        `"${(t.role || '').replace(/"/g, '""')}"`,
      ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `data_guru_smkn1adiwerna_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV text for quick modal
  const handleParseQuickCsv = (text: string) => {
    setImportCsvText(text);
    if (!text.trim()) {
      setImportParsedPreview([]);
      return;
    }

    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) {
      setImportParsedPreview([]);
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["'](.*)["']$/, '$1'));
    const previewItems: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^["'](.*)["']$/, '$1'));
      if (parts[0]) {
        const hasNewFormat = headers.some(h => h.includes('kepegawaian') || h.includes('jabatan'));
        let name = parts[0] || '';
        let nip = parts[1] || '-';
        let employeeType = 'HONORER';
        let jobTitle = 'Guru';
        let rank = '-';
        let golongan = '-';
        let phone = '-';

        if (hasNewFormat || parts.length >= 9) {
          employeeType = parts[2] || (nip !== '-' ? 'PNS' : 'HONORER');
          jobTitle = parts[3] || 'Guru';
          rank = parts[4] || '-';
          golongan = parts[5] || '-';
          phone = parts[6] || '-';
        } else {
          rank = parts[2] || '-';
          golongan = parts[3] || '-';
          phone = parts[4] || '-';
          employeeType = (golongan.toUpperCase().includes('IX') ? 'PPPK' : (nip !== '-' ? 'PNS' : 'HONORER'));
        }

        previewItems.push({
          name,
          nip,
          employeeType,
          jobTitle,
          rank,
          golongan,
          phone,
        });
      }
    }
    setImportParsedPreview(previewItems);
  };

  // Execute Quick Import
  const handleExecuteQuickImport = async () => {
    if (!importCsvText.trim()) {
      alert('Pilih file CSV atau tempelkan data CSV terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/teachers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText: importCsvText }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setShowImportModal(false);
        setImportCsvText('');
        setImportParsedPreview([]);
        fetchTeachers();
      } else {
        alert(data.error || 'Gagal mengimport data guru.');
      }
    } catch (err: any) {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper WA Link
  const getWhatsAppLink = (phone?: string | null) => {
    if (!phone) return null;
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.substring(1);
    } else if (clean.startsWith('8')) {
      clean = '62' + clean;
    }
    return `https://wa.me/${clean}`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HEADER SECTION */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-2xl border border-indigo-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold backdrop-blur-md">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Data Pokok Guru & Pembimbing</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Manajemen Data Guru
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Kelola basis data nama lengkap, NIP, <span className="text-amber-400 font-semibold">Pangkat</span>, <span className="text-indigo-400 font-semibold">Golongan</span>, dan <span className="text-emerald-400 font-semibold">Nomor WhatsApp</span> resmi pendidik sebagai dasar penerbitan Surat Tugas & SPPD TTE.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Guru</span>
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold backdrop-blur-md transition-all cursor-pointer active:scale-95"
              title="Import Massal dari Berkas CSV"
            >
              <UploadCloud className="w-4 h-4 text-emerald-400" />
              <span>Import CSV</span>
            </button>

            <button
              onClick={handleDownloadTemplateCsv}
              className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold backdrop-blur-md transition-all cursor-pointer active:scale-95"
              title="Unduh Contoh Format Berkas CSV"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Template CSV</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center space-x-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold backdrop-blur-md transition-all cursor-pointer active:scale-95"
              title="Ekspor Seluruh Guru ke CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              <span>Ekspor</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Guru & Staf */}
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          theme === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Guru & Staf</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-2xl sm:text-3xl font-extrabold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stats.total}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Pegawai ({stats.waCount} WA)</span>
          </div>
        </div>

        {/* Pegawai PNS */}
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          theme === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pegawai PNS</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-2xl sm:text-3xl font-extrabold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{stats.pnsCount}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">PNS Ber-NIP</span>
          </div>
        </div>

        {/* Pegawai PPPK */}
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          theme === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pegawai PPPK</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-2xl sm:text-3xl font-extrabold ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>{stats.pppkCount}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Perjanjian Kerja</span>
          </div>
        </div>

        {/* Pegawai Honorer */}
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          theme === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Honorer / Non-PNS</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-2xl sm:text-3xl font-extrabold ${theme === 'dark' ? 'text-sky-400' : 'text-sky-600'}`}>{stats.honorerCount}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Non-PNS & GTT/PTT</span>
          </div>
        </div>
      </div>

      {/* ALERT MESSAGE */}
      {message && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl border text-xs font-semibold ${
            message.type === 'success'
              ? (theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-800')
              : (theme === 'dark' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-800')
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="p-1 hover:opacity-75 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. FILTER & SEARCH BAR */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
        theme === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama guru, NIP, status kepegawaian, jabatan, pangkat, no. WA..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Kepegawaian Filter */}
          <select
            value={kepegawaianFilter}
            onChange={(e) => {
              setKepegawaianFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={`text-xs px-3 py-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="ALL">Semua Kepegawaian</option>
            <option value="PNS">PNS (Pegawai Negeri)</option>
            <option value="PPPK">PPPK (Perjanjian Kerja)</option>
            <option value="HONORER">Honorer / Non-PNS</option>
          </select>

          {/* Jabatan Fungsional Filter */}
          <select
            value={jabatanFilter}
            onChange={(e) => {
              setJabatanFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={`text-xs px-3 py-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="ALL">Semua Jabatan</option>
            <option value="Guru">Guru</option>
            <option value="Tata Usaha">Tata Usaha</option>
            <option value="Staff">Staff</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={`text-xs px-3 py-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="ALL">Semua Role</option>
            <option value="GURU">Guru Pengajar</option>
            <option value="POKJA">Tim Pokja</option>
            <option value="PEMBIMBING">Pembimbing</option>
          </select>

          {/* Refresh */}
          <button
            onClick={fetchTeachers}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
            }`}
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. MAIN TEACHERS TABLE */}
      <div className={`rounded-2xl border overflow-hidden shadow-sm ${
        theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                theme === 'dark' ? 'bg-slate-800/80 border-slate-700/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-5">Nama Lengkap & NIP</th>
                <th className="py-3.5 px-4">Status & Jabatan</th>
                <th className="py-3.5 px-4">Pangkat</th>
                <th className="py-3.5 px-4 text-center">Golongan</th>
                <th className="py-3.5 px-5">Nomor WhatsApp</th>
                <th className="py-3.5 px-4">Jurusan / Mapel</th>
                <th className="py-3.5 px-4 text-center">Role</th>
                <th className="py-3.5 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800/50' : 'divide-slate-100'}`}>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600 font-medium'}>Memuat data guru...</span>
                  </td>
                </tr>
              ) : paginatedTeachers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <GraduationCap className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-50" />
                    <p className={`font-semibold text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Tidak ada data guru yang cocok.</p>
                    <p className="text-xs text-slate-500 mt-1">Gunakan tombol &quot;Tambah Guru&quot; atau &quot;Import CSV&quot; untuk mendaftarkan guru.</p>
                  </td>
                </tr>
              ) : (
                paginatedTeachers.map((t, idx) => {
                  const itemIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  const waLink = getWhatsAppLink(t.phone);

                  return (
                    <tr
                      key={t.id}
                      className={`transition-colors ${
                        theme === 'dark'
                          ? 'hover:bg-slate-800/30 text-slate-200'
                          : 'hover:bg-slate-50/80 text-slate-700'
                      }`}
                    >
                      {/* No */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400 dark:text-slate-500">
                        {itemIndex}
                      </td>

                      {/* Nama & NIP */}
                      <td className="py-3.5 px-5">
                        <div className="space-y-0.5">
                          <span
                            className={`font-bold text-sm transition-colors cursor-pointer ${
                              theme === 'dark'
                                ? 'text-white hover:text-indigo-400'
                                : 'text-slate-900 hover:text-indigo-600'
                            }`}
                            onClick={() => handleOpenDetail(t)}
                          >
                            {t.name}
                          </span>
                          <div className="flex items-center space-x-1.5 text-[11px]">
                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>NIP:</span>
                            {t.nip && t.nip !== '-' ? (
                              <span className={`font-mono font-semibold ${
                                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                              }`}>{t.nip}</span>
                            ) : (
                              <span className="italic text-slate-400 dark:text-slate-500">Non-NIP / Honorer</span>
                            )}
                            {t.nip && t.nip !== '-' && (
                              <button
                                onClick={() => handleCopyText(t.nip!, `nip-${t.id}`)}
                                className={`p-0.5 cursor-pointer ${
                                  theme === 'dark' ? 'hover:text-white text-slate-400' : 'hover:text-slate-900 text-slate-400'
                                }`}
                                title="Salin NIP"
                              >
                                {copiedId === `nip-${t.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status Kepegawaian & Jabatan */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-1">
                          {/* Status Kepegawaian */}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                            (t.employeeType || (t.nip && t.nip !== '-' ? 'PNS' : 'HONORER')) === 'PNS'
                              ? (theme === 'dark' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border border-emerald-200')
                              : (t.employeeType || '') === 'PPPK'
                              ? (theme === 'dark' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-amber-50 text-amber-800 border border-amber-200')
                              : (theme === 'dark' ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30' : 'bg-sky-50 text-sky-800 border border-sky-200')
                          }`}>
                            {t.employeeType || (t.nip && t.nip !== '-' ? 'PNS' : 'HONORER')}
                          </span>

                          {/* Jabatan Fungsional */}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            (t.jobTitle || 'Guru') === 'Tata Usaha'
                              ? (theme === 'dark' ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30' : 'bg-teal-50 text-teal-800 border border-teal-200')
                              : (t.jobTitle || 'Guru') === 'Staff'
                              ? (theme === 'dark' ? 'bg-slate-700 text-slate-300 border border-slate-600' : 'bg-slate-100 text-slate-700 border border-slate-300')
                              : (theme === 'dark' ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-800 border border-indigo-200')
                          }`}>
                            {t.jobTitle || 'Guru'}
                          </span>
                        </div>
                      </td>

                      {/* Pangkat */}
                      <td className="py-3.5 px-4">
                        {t.rank && t.rank !== '-' ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold ${
                            theme === 'dark'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {t.rank}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic">-</span>
                        )}
                      </td>

                      {/* Golongan */}
                      <td className="py-3.5 px-4 text-center">
                        {t.golongan && t.golongan !== '-' ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            theme === 'dark'
                              ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {t.golongan}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic">-</span>
                        )}
                      </td>

                      {/* WhatsApp Phone */}
                      <td className="py-3.5 px-5">
                        {t.phone && t.phone !== '-' ? (
                          <div className="flex items-center space-x-2">
                            <span className={`font-mono text-xs font-semibold ${
                              theme === 'dark' ? 'text-slate-300' : 'text-slate-800'
                            }`}>{t.phone}</span>
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  theme === 'dark'
                                    ? 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30'
                                    : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200'
                                }`}
                                title="Kirim Pesan WhatsApp"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>Chat</span>
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic">Belum terdata</span>
                        )}
                      </td>

                      {/* Jurusan / Mapel */}
                      <td className="py-3.5 px-4">
                        <span className={`text-xs ${
                          theme === 'dark' ? 'text-slate-300' : 'text-slate-700 font-medium'
                        }`}>
                          {t.department || 'Umum'}
                        </span>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          t.role === 'POKJA'
                            ? (theme === 'dark' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' : 'bg-purple-50 text-purple-700 border border-purple-200')
                            : t.role === 'ADMIN'
                            ? (theme === 'dark' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-700 border border-rose-200')
                            : (theme === 'dark' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-700 border border-blue-200')
                        }`}>
                          {t.role}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleOpenDetail(t)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              theme === 'dark'
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200'
                            }`}
                            title="Detail Guru"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              theme === 'dark'
                                ? 'bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border-indigo-500/30'
                                : 'bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200'
                            }`}
                            title="Edit Data Guru"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(t)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              theme === 'dark'
                                ? 'bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30'
                                : 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200'
                            }`}
                            title="Hapus Guru"
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

        {/* PAGINATION BAR */}
        {filteredTeachers.length > 0 && (
          <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <div>
              Menampilkan <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{(currentPage - 1) * itemsPerPage + 1}</span> s/d{' '}
              <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{Math.min(currentPage * itemsPerPage, filteredTeachers.length)}</span> dari{' '}
              <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{filteredTeachers.length}</span> guru
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`p-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className={`px-3 py-1 font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`p-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. MODAL TAMBAH GURU */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className={`w-full max-w-xl rounded-3xl border shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-500">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Tambah Data Guru Baru</h3>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Daftarkan data guru untuk acuan Surat Tugas & SPPD.</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${theme === 'dark' ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
              {/* Nama Lengkap */}
              <div className="space-y-1.5">
                <label className={`font-bold uppercase tracking-wider text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Mohammad Rahmad Rifa'i, S.Pd."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* NIP */}
              <div className="space-y-1.5">
                <label className={`font-bold uppercase tracking-wider text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Nomor Induk Pegawai (NIP)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 19951030 202221 1 002 (Kosongkan jika honorer)"
                  value={formNip}
                  onChange={(e) => setFormNip(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
                <span className="text-[10px] text-slate-500">Jika NIP diisi, sistem akan otomatis menjadikannya sebagai ID login (username).</span>
              </div>

              {/* Grid: Jenis Kepegawaian & Jabatan Fungsional */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={`font-bold uppercase tracking-wider text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Jenis Kepegawaian <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formEmployeeType}
                    onChange={(e) => setFormEmployeeType(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="PNS">PNS (Pegawai Negeri Sipil)</option>
                    <option value="PPPK">PPPK (Perjanjian Kerja)</option>
                    <option value="HONORER">Honorer / Non-PNS</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className={`font-bold uppercase tracking-wider text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Jabatan Fungsional <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formJobTitle}
                    onChange={(e) => setFormJobTitle(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="Guru">Guru</option>
                    <option value="Tata Usaha">Tata Usaha</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
              </div>

              {/* Grid: Pangkat & Golongan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Pangkat */}
                <div className="space-y-1.5">
                  <label className={`font-bold uppercase tracking-wider text-[11px] flex justify-between ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span>Pangkat</span>
                    <span className={`${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'} font-normal`}>(Muncul di SPPD)</span>
                  </label>
                  <input
                    type="text"
                    list="pangkat-list"
                    placeholder="Contoh: Penata Muda / Pembina"
                    value={formRank}
                    onChange={(e) => setFormRank(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <datalist id="pangkat-list">
                    {PANGKAT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>

                {/* Golongan */}
                <div className="space-y-1.5">
                  <label className={`font-bold uppercase tracking-wider text-[11px] flex justify-between ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span>Golongan Ruang</span>
                    <span className={`${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} font-normal`}>(Muncul di SPPD)</span>
                  </label>
                  <input
                    type="text"
                    list="golongan-list"
                    placeholder="Contoh: III/a, IV/a, IX"
                    value={formGolongan}
                    onChange={(e) => setFormGolongan(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <datalist id="golongan-list">
                    {GOLONGAN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Grid: No WhatsApp & Jurusan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* No WhatsApp */}
                <div className="space-y-1.5">
                  <label className={`font-bold uppercase tracking-wider text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Nomor WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                {/* Jurusan / Mapel */}
                <div className="space-y-1.5">
                  <label className={`font-bold uppercase tracking-wider text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Jurusan / Mata Pelajaran
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Teknik Komputer dan Jaringan"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* Grid: Role & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={`font-bold uppercase tracking-wider text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Role Sistem
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="GURU">GURU (Pengajar)</option>
                    <option value="POKJA">POKJA (Tim Kerja Prakerin)</option>
                    <option value="PEMBIMBING">PEMBIMBING (Guru Pembimbing)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className={`font-bold uppercase tracking-wider text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Password Akun (Opsional)
                  </label>
                  <input
                    type="password"
                    placeholder="Default: guru12345"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              <div className={`flex items-center justify-end space-x-2.5 pt-4 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Data Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL EDIT GURU */}
      {showEditModal && activeTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className={`w-full max-w-xl rounded-3xl border shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-500">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Edit Data Guru</h3>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Perbarui data profil, pangkat, golongan, atau WhatsApp.</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${theme === 'dark' ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* Nama Lengkap */}
              <div className="space-y-1.5">
                <label className={`font-bold uppercase tracking-wider text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* NIP */}
              <div className="space-y-1.5">
                <label className={`font-bold uppercase tracking-wider text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Nomor Induk Pegawai (NIP)
                </label>
                <input
                  type="text"
                  value={formNip}
                  onChange={(e) => setFormNip(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* Grid: Jenis Kepegawaian & Jabatan Fungsional */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={`font-bold uppercase tracking-wider text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Jenis Kepegawaian <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formEmployeeType}
                    onChange={(e) => setFormEmployeeType(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="PNS">PNS (Pegawai Negeri Sipil)</option>
                    <option value="PPPK">PPPK (Perjanjian Kerja)</option>
                    <option value="HONORER">Honorer / Non-PNS</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className={`font-bold uppercase tracking-wider text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Jabatan Fungsional <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formJobTitle}
                    onChange={(e) => setFormJobTitle(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="Guru">Guru</option>
                    <option value="Tata Usaha">Tata Usaha</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
              </div>

              {/* Grid: Pangkat & Golongan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Pangkat */}
                <div className="space-y-1.5">
                  <label className={`font-bold uppercase tracking-wider text-[11px] flex justify-between ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span>Pangkat</span>
                    <span className={`${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'} font-normal`}>(Muncul di SPPD)</span>
                  </label>
                  <input
                    type="text"
                    list="pangkat-list-edit"
                    placeholder="Contoh: Penata Muda / Pembina"
                    value={formRank}
                    onChange={(e) => setFormRank(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                  <datalist id="pangkat-list-edit">
                    {PANGKAT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>

                {/* Golongan */}
                <div className="space-y-1.5">
                  <label className={`font-bold uppercase tracking-wider text-[11px] flex justify-between ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span>Golongan Ruang</span>
                    <span className={`${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} font-normal`}>(Muncul di SPPD)</span>
                  </label>
                  <input
                    type="text"
                    list="golongan-list-edit"
                    placeholder="Contoh: III/a, IV/a, IX"
                    value={formGolongan}
                    onChange={(e) => setFormGolongan(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                  <datalist id="golongan-list-edit">
                    {GOLONGAN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Grid: No WhatsApp & Jurusan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={`font-bold uppercase tracking-wider text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Nomor WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={`font-bold uppercase tracking-wider text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Jurusan / Mapel
                  </label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Grid: Role & Password Reset */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={`font-bold uppercase tracking-wider text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Role Sistem
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="GURU">GURU (Pengajar)</option>
                    <option value="POKJA">POKJA (Tim Kerja Prakerin)</option>
                    <option value="PEMBIMBING">PEMBIMBING (Guru Pembimbing)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className={`font-bold uppercase tracking-wider text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Ganti Password (Kosongkan jika tidak diubah)
                  </label>
                  <input
                    type="password"
                    placeholder="Masukkan password baru..."
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              <div className={`flex items-center justify-end space-x-2.5 pt-4 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Perbarui Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL DETAIL GURU */}
      {showDetailModal && activeTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-500">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Rincian Data Pendidik</h3>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Informasi lengkap profil dan riwayat penugasan.</p>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${theme === 'dark' ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className={`p-4 rounded-2xl border space-y-3 ${
                theme === 'dark' ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className={`font-bold text-base ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{activeTeacher.name}</h4>
                    <p className={`font-mono mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>NIP: {activeTeacher.nip || 'Non-NIP'}</p>
                  </div>
                  <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      (activeTeacher.employeeType || (activeTeacher.nip ? 'PNS' : 'HONORER')) === 'PNS'
                        ? (theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                        : (activeTeacher.employeeType || '') === 'PPPK'
                        ? (theme === 'dark' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-700 border border-amber-200')
                        : (theme === 'dark' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-sky-50 text-sky-700 border border-sky-200')
                    }`}>
                      {activeTeacher.employeeType || (activeTeacher.nip ? 'PNS' : 'HONORER')}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      theme === 'dark' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {activeTeacher.role}
                    </span>
                  </div>
                </div>

                <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t ${
                  theme === 'dark' ? 'border-slate-700/60' : 'border-slate-200'
                }`}>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-bold">Status Kepegawaian</span>
                    <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{activeTeacher.employeeType || (activeTeacher.nip ? 'PNS' : 'HONORER')}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-bold">Jabatan Fungsional</span>
                    <p className={`font-semibold ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-700'}`}>{activeTeacher.jobTitle || 'Guru'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-bold">Pangkat</span>
                    <p className={`font-semibold ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'}`}>{activeTeacher.rank || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-bold">Golongan</span>
                    <p className={`font-semibold ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-700'}`}>{activeTeacher.golongan || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-bold">WhatsApp</span>
                    <p className={`font-mono font-semibold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>{activeTeacher.phone || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-bold">Jurusan / Mapel</span>
                    <p className={`font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{activeTeacher.department || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Status Pembuatan Surat Tugas */}
              <div className={`p-3.5 rounded-xl border flex items-start space-x-2 ${
                theme === 'dark'
                  ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-900'
              }`}>
                <FileText className={`w-4 h-4 flex-shrink-0 mt-0.5 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <div className="space-y-0.5">
                  <span className="font-bold text-[11px]">Format Cetak di SPPD Lembar 1 Poin 3:</span>
                  <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Pangkat & Golongan: &quot;<span className={`font-semibold ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'}`}>{[activeTeacher.rank, activeTeacher.golongan].filter(Boolean).join(' / ') || '-'}</span>&quot;
                  </p>
                </div>
              </div>
            </div>

            <div className={`flex items-center justify-end pt-3 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                onClick={() => setShowDetailModal(false)}
                className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer text-xs ${
                  theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL IMPORT CSV CEPAT */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-500">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Import Data Guru via CSV</h3>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Unggah berkas CSV atau tempel teks data guru Dapodik / Sekolah.</p>
                </div>
              </div>
              <button onClick={() => setShowImportModal(false)} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${theme === 'dark' ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className={`flex items-center justify-between p-3 rounded-xl border ${
                theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'
              }`}>
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                  <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700 font-medium'}>Belum punya format file CSV?</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplateCsv}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Template</span>
                </button>
              </div>

              {/* Upload Input */}
              <div className="space-y-1.5">
                <label className={`font-bold uppercase tracking-wider text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Pilih File CSV
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const text = event.target?.result as string;
                      handleParseQuickCsv(text);
                    };
                    reader.readAsText(file);
                  }}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                />
              </div>

              {/* Atau Paste CSV Text */}
              <div className="space-y-1.5">
                <label className={`font-bold uppercase tracking-wider text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Atau Tempel (Paste) Teks CSV Langsung
                </label>
                <textarea
                  rows={4}
                  placeholder="Nama Lengkap,NIP,Pangkat,Golongan,Nomor WhatsApp,Jurusan / Mapel,Role..."
                  value={importCsvText}
                  onChange={(e) => handleParseQuickCsv(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Preview Table */}
              {importParsedPreview.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-slate-800'}`}>
                      Pratinjau Data Terdeteksi ({importParsedPreview.length} Baris):
                    </span>
                    <span className={`text-[10px] font-semibold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>Siap diproses</span>
                  </div>
                  <div className={`max-h-48 overflow-y-auto rounded-xl border ${
                    theme === 'dark' ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className={`border-b font-bold ${
                          theme === 'dark' ? 'border-slate-700 text-slate-400 bg-slate-800/80' : 'border-slate-200 text-slate-600 bg-slate-100'
                        }`}>
                          <th className="py-2 px-3">Nama</th>
                          <th className="py-2 px-3">NIP</th>
                          <th className="py-2 px-2.5">Status</th>
                          <th className="py-2 px-2.5">Jabatan</th>
                          <th className="py-2 px-3">Pangkat</th>
                          <th className="py-2 px-2.5 text-center">Gol</th>
                          <th className="py-2 px-3">No. WA</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-200'}`}>
                        {importParsedPreview.slice(0, 10).map((item, idx) => (
                          <tr key={idx} className={`transition-colors ${theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100/70'}`}>
                            <td className={`py-1.5 px-3 font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{item.name}</td>
                            <td className={`py-1.5 px-3 font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{item.nip}</td>
                            <td className="py-1.5 px-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                item.employeeType === 'PNS' ? 'bg-emerald-500/20 text-emerald-400' :
                                item.employeeType === 'PPPK' ? 'bg-amber-500/20 text-amber-400' : 'bg-sky-500/20 text-sky-400'
                              }`}>{item.employeeType}</span>
                            </td>
                            <td className={`py-1.5 px-2.5 font-medium ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700'}`}>{item.jobTitle}</td>
                            <td className={`py-1.5 px-3 font-medium ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'}`}>{item.rank}</td>
                            <td className={`py-1.5 px-2.5 text-center font-medium ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-700'}`}>{item.golongan}</td>
                            <td className={`py-1.5 px-3 font-mono ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>{item.phone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importParsedPreview.length > 10 && (
                    <p className="text-[10px] text-slate-500 italic">
                      + {importParsedPreview.length - 10} baris data lainnya...
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className={`flex items-center justify-end space-x-2.5 pt-4 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer text-xs ${
                  theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting || importParsedPreview.length === 0}
                onClick={handleExecuteQuickImport}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-40 text-xs"
              >
                {submitting ? 'Memproses Import...' : `Mulai Import (${importParsedPreview.length} Guru)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
