// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: 
//    1. Mengintegrasikan Filter Periode PKL (dropdown selector) pada header dashboard Pokja.
//    2. Menambahkan fitur & modal konfirmasi "Hapus Kelompok" dan "Keluarkan Siswa" untuk mereset status siswa kembali awal.
// ✨ Fitur Baru:
//    - Period Filter Selector Engine.
//    - Interactive Group Deletion & Reset Student Status Workflow.
//    - Single Student Removal from Group.
// 🎨 UI/UX Update: Tombol hapus kelompok berwarna rose-500 dengan modal konfirmasi anti-overflow & badge periode.
// 🔧 Bug Fix: Menyelesaikan isu kelompok dummy/seed yang mengunci pendaftaran siswa.
// 🚀 Inovasi: Complete Group Lifecycle Management for Pokja SI-ERIN.
// ----------------------------------------------------------------------

'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/app/theme-provider';

import {
  Users,
  Building2,
  Calendar,
  CheckCircle2,
  FileText,
  Upload,
  Eye,
  Search,
  X,
  Loader2,
  Database,
  RefreshCw,
  User,
  Clock,
  SendHorizontal,
  FileCheck2,
  ExternalLink,
  AlertCircle,
  Hash,
  GraduationCap,
  CalendarDays,
  ShieldCheck,
  Building,
  Download,
  Trash2,
  ShieldAlert,
  MessageCircle,
  UserCheck,
  Printer,
  FileSignature,
  Sparkles,
  Edit3,
  Check
} from 'lucide-react';
import { detectDateFromPdfSource } from '@/lib/pdf-date-detector';

interface TeacherItem {
  id: string;
  name: string;
  username?: string;
}

interface StudentItem {
  id?: string;
  placementId?: string;
  name?: string;
  studentName?: string;
  nis?: string;
  className?: string;
  department?: string;
  departmentName?: string;
  teacher?: TeacherItem | null;
  teacherName?: string;
  startDate?: string;
  endDate?: string;
  letterNumber?: string;
  student?: any;
}

interface GroupItem {
  groupId?: string;
  groupKey?: string;
  industryId?: string;
  industryName?: string;
  industryAddress?: string;
  rawAddress?: string;
  jalan?: string;
  rt?: string;
  rw?: string;
  dusun?: string;
  desaKelurahan?: string;
  subDistrict?: string;
  regency?: string;
  postalCode?: string;
  province?: string;
  fullAddress?: string;
  industryPhone?: string;
  departmentName?: string;
  periodId?: string;
  periodName?: string;
  startDate?: string;
  endDate?: string;
  suratTugasUrl?: string;
  suratBalasanUrl?: string;
  letterNumber?: string;
  letterUploadedBy?: string;
  letterUploadedAt?: string;
  students?: StudentItem[];
  placements?: StudentItem[];
}

interface PeriodItem {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export default function PokjaKelompokPrakerinPage() {
  const { status, data: session } = useSession();
  const { theme } = useTheme();

  const userRole = (session?.user as any)?.role || 'POKJA';
  const pokjaDepartment = (session?.user as any)?.department || 'Teknik Komputer dan Jaringan';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [periods, setPeriods] = useState<PeriodItem[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Target Kelompok untuk Upload Surat & Input Nomor Surat Pokja
  const [targetGroup, setTargetGroup] = useState<GroupItem | null>(null);
  const [inputLetterNumber, setInputLetterNumber] = useState<string>('');
  const [inputLetterDate, setInputLetterDate] = useState<string>('');
  const [dateDetectedNotice, setDateDetectedNotice] = useState<string>('');
  const [suratBase64, setSuratBase64] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  // Target Kelompok / Siswa untuk Dihapus (Reset Placement)
  const [deleteTargetGroup, setDeleteTargetGroup] = useState<GroupItem | null>(null);
  const [deleteTargetStudent, setDeleteTargetStudent] = useState<StudentItem | null>(null);

  // Modal State untuk Pratinjau Dokumen & Detail Kelompok
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [activePreviewTitle, setActivePreviewTitle] = useState<string>('');
  const [detailModalGroup, setDetailModalGroup] = useState<GroupItem | null>(null);

  // 🌟 State Generator Lembar Konfirmasi Pengajuan PKL (Balasan DUDI)
  const [confirmationGroup, setConfirmationGroup] = useState<GroupItem | null>(null);
  const [confirmationForm, setConfirmationForm] = useState({
    letterNumber: '',
    letterDate: '',
    durationMonths: '……',
    startDate: '',
    endDate: '',
    competencies: 'Jaringan Komputer / Fiber Optik / Cloud Computing / Administrasi Server / Programming / Lainnya',
    city: 'Kabupaten Tegal',
    schoolName: 'SMKN 1 Adiwerna',
    isDateAutoDetected: false,
    detectingDate: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formatter Tanggal Indonesia
  const formatDateIndonesia = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Fetch Data Kelompok dari API Pokja (Dukung query periodId & status)
  const fetchGroupsData = useCallback(async (periodId = selectedPeriodId, status = selectedStatus) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      if (periodId && periodId !== 'ALL') params.set('periodId', periodId);
      if (status && status !== 'ALL') params.set('status', status);
      const queryString = params.toString();
      const url = queryString ? `/api/pokja/groups?${queryString}` : '/api/pokja/groups';

      const res = await fetch(url);
      const json = await res.json();

      if (res.ok && json.success) {
        setGroups(json.data || []);
        if (Array.isArray(json.periods)) {
          setPeriods(json.periods);
        }
      } else {
        setGroups([]);
        setErrorMsg(json.error || 'Gagal memuat data kelompok.');
      }
    } catch (err) {
      console.error('Error fetching Pokja groups:', err);
      setErrorMsg('Terjadi kesalahan koneksi saat mengambil data kelompok.');
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodId, selectedStatus]);

  useEffect(() => {
    fetchGroupsData();
  }, [fetchGroupsData]);

  // Handler Ganti Filter Periode & Status
  const handlePeriodChange = (newPeriodId: string) => {
    setSelectedPeriodId(newPeriodId);
    fetchGroupsData(newPeriodId, selectedStatus);
  };

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus);
    fetchGroupsData(selectedPeriodId, newStatus);
  };

  // Filter Pencarian Berdasarkan Kata Kunci (Industri, Periode, Nomor Surat, Nama Siswa, NIS)
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const matchInd = g.industryName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPeriod = g.periodName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSurat = g.letterNumber?.toLowerCase().includes(searchTerm.toLowerCase());

      const studentsList = g.students || g.placements || [];
      const matchStudent = studentsList.some((p: any) => {
        const studentObj = p.student || p;
        const name = studentObj.name || studentObj.studentName || '';
        const nis = studentObj.nis || '';
        const className = studentObj.className || '';
        const teacherName = studentObj.teacher?.name || studentObj.teacherName || '';
        return (
          name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
          className.toLowerCase().includes(searchTerm.toLowerCase()) ||
          teacherName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });

      return matchInd || matchPeriod || matchSurat || matchStudent;
    });
  }, [groups, searchTerm]);

  // ----------------------------------------------------------------------
  // 🌟 FUNGSI EKSPOR CSV DATA KELOMPOK PRAKERIN
  // Format Kolom Lengkap: pembimbing, industri, jalan, rt, rw, kelurahan, kecamatan, kabupaten, kodepos, alamat lengkap, tanggal, siswa, nis, kelas, hp
  // ----------------------------------------------------------------------
  const handleExportCSV = () => {
    if (!filteredGroups || filteredGroups.length === 0) {
      setErrorMsg('Tidak ada data kelompok untuk diekspor!');
      return;
    }

    const headers = [
      'nama pembimbing',
      'nama industri',
      'jalan',
      'rt',
      'rw',
      'kelurahan',
      'kecamatan',
      'kabupaten',
      'kodepos',
      'alamat lengkap',
      'tanggal mulai',
      'tanggal selesai',
      'nama siswa',
      'nis',
      'kelas',
      'no hp'
    ];
    const rows: string[][] = [];

    filteredGroups.forEach((group) => {
      const industryName = group.industryName || '-';
      const jalan = group.jalan || group.rawAddress || group.industryAddress || '-';
      const rt = group.rt || '-';
      const rw = group.rw || '-';
      const kelurahan = group.desaKelurahan || '-';
      const kecamatan = group.subDistrict || '-';
      const kabupaten = group.regency || '-';
      const kodepos = group.postalCode || '-';
      const fullAddress = group.fullAddress || group.industryAddress || '-';
      const startDateFormatted = formatDateIndonesia(group.startDate);
      const endDateFormatted = formatDateIndonesia(group.endDate);
      const studentList = group.students || group.placements || [];

      studentList.forEach((item: StudentItem) => {
        const student = item.student || item;
        const studentName = student.name || student.studentName || '-';
        const nis = student.nis || '-';
        const className = student.className || '-';
        const phone = student.phone || student.parentPhone || '-';
        const teacherName = student.teacher?.name || student.teacherName || 'Belum Di-assign';

        rows.push([
          teacherName,
          industryName,
          jalan,
          rt,
          rw,
          kelurahan,
          kecamatan,
          kabupaten,
          kodepos,
          fullAddress,
          startDateFormatted,
          endDateFormatted,
          studentName,
          nis,
          className,
          phone
        ]);
      });
    });

    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const timeStamp = new Date().toISOString().slice(0, 10);
    const sanitizedDept = pokjaDepartment.replace(/[^a-zA-Z0-9]/g, '_');
    
    link.href = url;
    link.setAttribute('download', `Kelompok_Prakerin_${sanitizedDept}_${timeStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccessMsg('Data kelompok prakerin dengan rincian alamat lengkap berhasil diekspor ke format CSV!');
  };

  // 🌟 EKSPOR 1 KELOMPOK KE TAB BARU (HTML TABLE UNTUK SPREADSHEET DENGAN ALAMAT LENGKAP)
  const handleExportGroupToNewTab = (group: GroupItem) => {
    const industryName = group.industryName || '-';
    const jalan = group.jalan || group.rawAddress || group.industryAddress || '-';
    const rt = group.rt || '-';
    const rw = group.rw || '-';
    const kelurahan = group.desaKelurahan || '-';
    const kecamatan = group.subDistrict || '-';
    const kabupaten = group.regency || '-';
    const kodepos = group.postalCode || '-';
    const fullAddress = group.fullAddress || group.industryAddress || '-';
    const periodName = group.periodName || '-';
    const studentList = group.students || group.placements || [];

    let tableRows = '';
    
    studentList.forEach((item: StudentItem) => {
      const student = item.student || item;
      const studentName = student.name || student.studentName || '-';
      const nis = student.nis || '-';
      const className = student.className || '-';
      const phone = student.phone || student.parentPhone || '-'; 
      const teacherName = student.teacher?.name || student.teacherName || 'Belum Di-assign';
      
      tableRows += `
        <tr>
          <td>${industryName}</td>
          <td>${jalan}</td>
          <td>&nbsp;${rt}</td>
          <td>&nbsp;${rw}</td>
          <td>${kelurahan}</td>
          <td>${kecamatan}</td>
          <td>${kabupaten}</td>
          <td>&nbsp;${kodepos}</td>
          <td>${fullAddress}</td>
          <td>${periodName}</td>
          <td>${studentName}</td>
          <td>&nbsp;${nis}</td>
          <td>${className}</td>
          <td>&nbsp;${phone}</td>
          <td>${teacherName}</td>
        </tr>
      `;
    });

    const htmlContent = `
      <html>
        <head>
          <title>Export Kelompok - ${industryName}</title>
          <style>
            body { padding: 24px; font-family: sans-serif; font-size: 13px; color: #0f172a; }
            h2 { margin-bottom: 4px; color: #1e293b; }
            .meta { margin-bottom: 16px; color: #475569; font-size: 13px; }
            table { border-collapse: collapse; width: 100%; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: 700; color: #334155; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .tip { background: #e0f2fe; border: 1px solid #bae6fd; padding: 10px 14px; border-radius: 8px; color: #0369a1; margin-bottom: 16px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h2>Data Kelompok Prakerin: ${industryName}</h2>
          <div class="meta">
            <p><strong>Alamat Lengkap:</strong> ${fullAddress}</p>
            <p><strong>Rincian Wilayah:</strong> Jalan: ${jalan} • RT/RW: ${rt}/${rw} • Kelurahan: ${kelurahan} • Kecamatan: ${kecamatan} • Kabupaten/Kota: ${kabupaten} • Kode Pos: ${kodepos}</p>
          </div>
          <div class="tip">
            💡 <strong>Petunjuk:</strong> Tekan <strong>Ctrl + A</strong> lalu <strong>Ctrl + C</strong> pada halaman ini, kemudian <strong>Paste (Ctrl + V)</strong> langsung ke Spreadsheet / Microsoft Excel Anda.
          </div>
          <table>
            <thead>
              <tr>
                <th>Nama Industri</th>
                <th>Jalan</th>
                <th>RT</th>
                <th>RW</th>
                <th>Kelurahan/Desa</th>
                <th>Kecamatan</th>
                <th>Kabupaten/Kota</th>
                <th>Kode Pos</th>
                <th>Alamat Lengkap</th>
                <th>Periode</th>
                <th>Nama Siswa</th>
                <th>NIS</th>
                <th>Kelas</th>
                <th>Nomor HP</th>
                <th>Guru Pembimbing</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    }
  };

  // Picker Berkas Surat dengan Auto-Detection Tanggal Resmi dari PDF
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file maksimal adalah 5MB!');
      return;
    }

    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const b64 = event.target?.result as string;
      setSuratBase64(b64);

      // Coba auto-detect tanggal jika berkas berupa PDF
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const detected = await detectDateFromPdfSource(b64);
          if (detected.isDetected && detected.dateStr) {
            setInputLetterDate(detected.dateStr);
            setDateDetectedNotice(`✨ Tanggal surat terdeteksi otomatis dari PDF: ${detected.dateStr}`);
          }
        } catch (err) {
          console.warn('Gagal membaca tanggal dari PDF:', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Upload Surat & SIMPAN NOMOR SURAT (`letterNumber`) & TANGGAL KE PRISMA DB
  const handleUploadSuratGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetGroup) return;

    if (!inputLetterNumber.trim()) {
      setErrorMsg('Silakan masukkan Nomor Surat resmi terlebih dahulu!');
      return;
    }

    if (!suratBase64) {
      setErrorMsg('Silakan pilih berkas Surat (PDF/Gambar)!');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const rawList = targetGroup.placements || targetGroup.students || [];
    const placementIds = rawList.map((p: any) => p.placementId || p.id).filter(Boolean);

    try {
      const res = await fetch('/api/pokja/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: targetGroup.groupId,
          industryId: targetGroup.industryId,
          placementIds: placementIds,
          letterNumber: inputLetterNumber.trim(),
          letterDate: inputLetterDate.trim(),
          suratTugasUrl: suratBase64 
        })
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setGroups(prev => prev.map(item => (item.groupId === targetGroup.groupId || item.groupKey === targetGroup.groupKey) ? { 
          ...item, 
          suratTugasUrl: suratBase64,
          letterNumber: inputLetterNumber.trim(),
          letterUploadedAt: inputLetterDate ? new Date(inputLetterDate).toISOString() : new Date().toISOString()
        } : item));

        setSuccessMsg(json.message || `Surat No. ${inputLetterNumber} berhasil diperbarui & tersimpan di database!`);
        setTargetGroup(null);
        setSuratBase64('');
        setInputLetterNumber('');
        setInputLetterDate('');
        setDateDetectedNotice('');
        setSelectedFileName('');
        fetchGroupsData();
      } else {
        setErrorMsg(json.error || 'Gagal menyimpan Nomor Surat ke database.');
      }
    } catch (err) {
      console.error('Error uploading group letter:', err);
      setErrorMsg('Terjadi kesalahan koneksi saat menyimpan berkas ke database.');
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------
  // 🌟 GENERATOR LEMBAR KONFIRMASI PENGAJUAN PKL (BALASAN DUDI)
  // ----------------------------------------------------------------------
  const handleOpenConfirmationModal = async (group: GroupItem) => {
    setConfirmationGroup(group);

    // 1. Nomor Surat Permohonan
    const lNumber = group.letterNumber || '400.14.5.4 / 420 / 2026';

    // 2. Default Tanggal Surat dari database atau hari ini
    let initialDate = formatDateIndonesia(group.letterUploadedAt);
    if (!initialDate || initialDate === '-') {
      initialDate = formatDateIndonesia(new Date().toISOString());
    }

    // 3. Durasi Bulan Pelaksanaan & Tanggal Mulai/Selesai: Dibiarkan kosong (titik-titik) agar fleksibel diisi industri
    const defaultMonths = '……';
    const defaultStartDate = '………………………….';
    const defaultEndDate = '……………………..';

    // 4. Kota Penandatangan (Ambil Kabupaten dari industri atau fallback Kabupaten Tegal)
    let citySign = group.regency || '';
    if (!citySign || citySign === '-') {
      citySign = 'Kabupaten Tegal';
    }

    // 5. Keilmuan / Materi Default (sesuai jurusan Pokja TKJ)
    const competenciesDefault = 'Jaringan Komputer / Fiber Optik / Cloud Computing / Administrasi Server / Programming / Lainnya';

    setConfirmationForm({
      letterNumber: lNumber,
      letterDate: initialDate,
      durationMonths: defaultMonths,
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      competencies: competenciesDefault,
      city: citySign,
      schoolName: 'SMKN 1 Adiwerna',
      isDateAutoDetected: false,
      detectingDate: Boolean(group.suratTugasUrl)
    });

    // 7. 🌟 DETEKSI OTOMATIS TANGGAL DARI PDF SURAT PENGAJUAN (JIKA ADA TEXT LAYER)
    if (group.suratTugasUrl) {
      try {
        const detected = await detectDateFromPdfSource(group.suratTugasUrl);
        if (detected.isDetected && detected.dateStr) {
          setConfirmationForm(prev => ({
            ...prev,
            letterDate: detected.dateStr!,
            isDateAutoDetected: true,
            detectingDate: false
          }));
          return;
        }
      } catch (err) {
        console.warn('Gagal membaca tanggal dari PDF surat pengajuan:', err);
      }
    }

    setConfirmationForm(prev => ({
      ...prev,
      detectingDate: false
    }));
  };

  // Helper Pembuat Template HTML Standalone Kertas A4 yang Presisi
  const getConfirmationLetterHtml = (group: GroupItem, form: typeof confirmationForm) => {
    const studentList = group.students || group.placements || [];
    const studentRows = studentList.map((item, idx) => {
      const student = item.student || item;
      const nis = student.nis || '-';
      const name = (student.name || student.studentName || '-').toUpperCase();
      return `
        <tr>
          <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; font-size: 11pt;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; font-size: 11pt;">${nis}</td>
          <td style="border: 1px solid #000; padding: 6px 8px; text-align: left; font-size: 11pt; font-weight: 500;">${name}</td>
          <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; font-size: 11pt; white-space: nowrap;">Diterima / Ditolak *</td>
        </tr>
      `;
    }).join('');

    const currentYear = new Date().getFullYear();

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Konfirmasi Pengajuan PKL - ${group.industryName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 20mm 15mm 20mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000000;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
    }
    .a4-page {
      width: 100%;
      max-width: 170mm;
      margin: 0 auto;
      padding: 0;
    }
    .title-block {
      text-align: center;
      margin-bottom: 24px;
    }
    .title-block h1 {
      font-size: 14pt;
      font-weight: bold;
      margin: 0;
      letter-spacing: 0.5px;
    }
    .title-block h2 {
      font-size: 12.5pt;
      font-weight: bold;
      margin: 4px 0 0 0;
      letter-spacing: 0.2px;
    }
    .recipient-block {
      margin-left: 55%;
      margin-bottom: 22px;
      line-height: 1.35;
      font-size: 12pt;
    }
    .paragraph {
      text-align: justify;
      line-height: 1.6;
      margin-bottom: 16px;
      text-justify: inter-word;
    }
    .students-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      margin-bottom: 16px;
    }
    .students-table th {
      border: 1px solid #000;
      padding: 6px 8px;
      font-weight: bold;
      text-align: center;
      font-size: 11pt;
      background-color: #fafafa;
    }
    .students-table td {
      border: 1px solid #000;
      padding: 6px 8px;
    }
    .competency-block {
      text-align: justify;
      line-height: 1.6;
      margin-bottom: 16px;
    }
    .closing-block {
      text-align: justify;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .signature-block {
      margin-left: 55%;
      text-align: left;
      line-height: 1.4;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .signature-space {
      height: 70px;
    }
    .signature-line {
      border-bottom: 1px solid #000;
      width: 220px;
      margin-bottom: 4px;
    }
    .footnote-block {
      font-size: 9pt;
      font-style: italic;
      line-height: 1.4;
      margin-top: 15px;
      border-top: 1px dashed #ccc;
      padding-top: 8px;
      page-break-inside: avoid;
    }
    @media print {
      body {
        background: transparent;
        padding: 0;
      }
      .a4-page {
        max-width: 100%;
      }
      .footnote-block {
        border-top: none;
      }
    }
  </style>
</head>
<body>
  <div class="a4-page">
    <div class="title-block">
      <h1>KONFIRMASI</h1>
      <h2>PENGAJUAN KEGIATAN PRAKTEK KERJA LAPANGAN(PKL)</h2>
    </div>

    <div class="recipient-block">
      <div>Kepada Yth.</div>
      <div style="font-weight: bold;">Kepala ${form.schoolName}</div>
      <div>di _</div>
      <div style="padding-left: 24px;">Tempat</div>
    </div>

    <div class="paragraph">
      Berdasarkan dengan surat permohonan Prakerin dari ${form.schoolName} sesuai dengan nomor ajuan <strong>${form.letterNumber}</strong> tanggal <strong>${form.letterDate}</strong>. Maka dengan ini kami <strong>MENERIMA / MENOLAK *</strong> untuk melaksanakan kegiatan tersebut sesuai dengan syarat dan ketentuan yang berlaku di Perusahaan/Instansi <strong>${group.industryName}</strong> yang beralamat di ${group.fullAddress || group.industryAddress || '-'} selama <strong>${form.durationMonths}</strong> bulan dan terhitung mulai <strong>${form.startDate}</strong> sampai <strong>${form.endDate}</strong>.
    </div>

    <div style="margin-bottom: 6px;">
      Adapun peserta dalam kegiatan PKL di Instansi/Perusahan kami adalah:
    </div>

    <table class="students-table">
      <thead>
        <tr>
          <th style="width: 40px;">No</th>
          <th style="width: 120px;">NIS</th>
          <th>Nama</th>
          <th style="width: 170px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${studentRows}
      </tbody>
    </table>

    <div class="competency-block">
      Dengan bidang keilmuan / materi selama kegiatan Prakerin adalah di bidang <strong>${form.competencies}</strong><br/>
      …………………………………………………………………… *
    </div>

    <div class="closing-block">
      Demikian surat keteragan ini kami buat atas perhatian dan kerjasamanya kami ucapakan terimakasih.
    </div>

    <div class="signature-block">
      <div>…………….., ……………….. ${currentYear}</div>
      <div style="font-weight: bold; margin-top: 2px;">a.n ${group.industryName}</div>
      <div class="signature-space"></div>
      <div class="signature-line"></div>
      <div>Jabatan:</div>
    </div>

    <div class="footnote-block">
      <div>*) Coret yang tidak perlu</div>
      <div>**) Jumlah siswa yang di terima menyesuaikan kebijakan Instansi/Perusahaan</div>
    </div>
  </div>
</body>
</html>`;
  };

  // Handler Print Langsung Lembar Konfirmasi A4
  const handlePrintConfirmationLetter = () => {
    if (!confirmationGroup) return;
    const html = getConfirmationLetterHtml(confirmationGroup, confirmationForm);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 350);
    }
  };

  // Handler Buka di Tab Baru Standalone HTML
  const handleOpenConfirmationInNewTab = () => {
    if (!confirmationGroup) return;
    const html = getConfirmationLetterHtml(confirmationGroup, confirmationForm);
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.open();
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  // ----------------------------------------------------------------------
  // 🌟 EKSEKUSI HAPUS KELOMPOK (RESET STATUS PENEMPATAN ANGGOTA KELOMPOK)
  // ----------------------------------------------------------------------
  const confirmDeleteGroup = async () => {
    if (!deleteTargetGroup) return;

    setDeleting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const rawList = deleteTargetGroup.placements || deleteTargetGroup.students || [];
    const placementIds = rawList.map((p: any) => p.placementId || p.id).filter(Boolean);

    try {
      let queryParam = '';
      if (placementIds.length > 0) {
        queryParam = `placementIds=${encodeURIComponent(placementIds.join(','))}`;
      } else if (deleteTargetGroup.industryId) {
        queryParam = `industryId=${encodeURIComponent(deleteTargetGroup.industryId)}`;
      }

      const res = await fetch(`/api/pokja/groups?${queryParam}`, {
        method: 'DELETE'
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setSuccessMsg(json.message || 'Kelompok berhasil dihapus. Status siswa telah di-reset!');
        setDeleteTargetGroup(null);
        fetchGroupsData();
      } else {
        setErrorMsg(json.error || 'Gagal menghapus kelompok.');
      }
    } catch (err) {
      console.error('Error deleting group:', err);
      setErrorMsg('Terjadi kesalahan koneksi saat menghapus kelompok.');
    } finally {
      setDeleting(false);
    }
  };

  // ----------------------------------------------------------------------
  // 🌟 EKSEKUSI HAPUS SISWA INDIVIDUAL DARI KELOMPOK
  // ----------------------------------------------------------------------
  const confirmDeleteStudent = async () => {
    if (!deleteTargetStudent) return;

    setDeleting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const targetPlacementId = deleteTargetStudent.placementId || deleteTargetStudent.id;

    if (!targetPlacementId) {
      setErrorMsg('ID Penempatan siswa tidak valid.');
      setDeleting(false);
      return;
    }

    try {
      const res = await fetch(`/api/pokja/groups?placementId=${encodeURIComponent(targetPlacementId)}`, {
        method: 'DELETE'
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setSuccessMsg(json.message || 'Siswa berhasil dikeluarkan dari kelompok & statusnya di-reset.');
        setDeleteTargetStudent(null);
        fetchGroupsData();
      } else {
        setErrorMsg(json.error || 'Gagal mengeluarkan siswa dari kelompok.');
      }
    } catch (err) {
      console.error('Error deleting student placement:', err);
      setErrorMsg('Terjadi kesalahan koneksi saat mengeluarkan siswa.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen p-8 flex flex-col justify-center items-center space-y-4 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm font-bold text-slate-800 dark:text-slate-300">
          Memuat data kelompok prakerin & nomor surat Pokja...
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/80 text-slate-900'
    }`}>

      {/* HEADER BANNER - BADGE JURUSAN & TOMBOL ACTION */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Modul Pokja Prakerin — {userRole}</span>
            </span>

            {/* BADGE JURUSAN TERIKAT */}
            <span className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Jurusan: {pokjaDepartment}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Kelompok Prakerin & Pembimbing Industri 👥
          </h1>
          <p className="text-xs text-slate-700 dark:text-slate-400 max-w-2xl font-medium">
            Halaman ini menampilkan kelompok siswa terverifikasi khusus untuk <strong>{pokjaDepartment}</strong>. Kelola pembimbing industri, nomor surat permohonan, filter periode, serta hapus kelompok dummy jika diperlukan.
          </p>
        </div>

        {/* GROUP ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* 🌟 TOMBOL EKSPOR CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-5 py-3 rounded-2xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center space-x-2 shadow-lg shadow-emerald-600/30 cursor-pointer border border-emerald-500/30"
            title="Ekspor Data Kelompok ke Format CSV Excel"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={() => fetchGroupsData()}
            className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer border shadow-md ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* ALERT NOTIFIKASI */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* SEARCH BAR & FILTER PERIODE/STATUS SECTION */}
      <div className={`p-6 rounded-3xl border shadow-xl flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 transition-all ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-slate-200/50'
      }`}>
        {/* 🌟 DROPDOWN FILTER PERIODE PKL & STATUS */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* FILTER PERIODE */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Periode:
            </span>
            <select
              value={selectedPeriodId}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold border outline-none cursor-pointer transition-all ${
                theme === 'dark'
                  ? 'bg-slate-950 border-slate-800 text-indigo-300 focus:border-indigo-500'
                  : 'bg-slate-50 border-slate-300 text-indigo-900 focus:border-indigo-600 shadow-sm'
              }`}
            >
              <option value="ALL">Semua Periode</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isActive ? '(AKTIF)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* FILTER STATUS TERVERIFIKASI */}
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Status:
            </span>
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold border outline-none cursor-pointer transition-all ${
                theme === 'dark'
                  ? 'bg-slate-950 border-slate-800 text-emerald-300 focus:border-emerald-500'
                  : 'bg-slate-50 border-slate-300 text-emerald-900 focus:border-emerald-600 shadow-sm'
              }`}
            >
              <option value="ALL">Semua Status Terverifikasi</option>
              <option value="PEMBUATAN_SURAT">Pembuatan Surat (Menunggu No/File Surat)</option>
              <option value="SURAT_DITERBITKAN">Surat Diterbitkan</option>
              <option value="DISETUJUI_INDUSTRI">Disetujui Industri</option>
            </select>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari Industri, Periode, No Surat, Siswa..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs font-semibold border outline-none transition-all ${
              theme === 'dark' 
                ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-indigo-500' 
                : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 shadow-sm'
            }`}
          />
        </div>
      </div>

      {/* STATISTIK KELOMPOK */}
      <div className="flex flex-wrap justify-between items-center gap-2 text-xs font-extrabold text-slate-700 dark:text-slate-300 px-2">
        <span>Menampilkan <strong>{filteredGroups.length}</strong> Kelompok Terverifikasi ({pokjaDepartment})</span>
        <span>Total Siswa Terverifikasi: <strong>{filteredGroups.reduce((acc, g) => acc + (g.students || g.placements || []).length, 0)}</strong> Orang</span>
      </div>

      {/* INPUT FILE HIDDEN UNTUK PICKER */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,image/*"
        className="hidden"
      />

      {/* DAFTAR KARTU KELOMPOK SISWA PER INDUSTRI */}
      <div className="space-y-6">
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group) => {
            const hasSurat = Boolean(group.suratTugasUrl || group.letterNumber);
            const studentList = group.students || group.placements || [];
            const groupDeptName = group.departmentName || pokjaDepartment;

            return (
              <div
                key={group.groupId || group.groupKey || group.industryId}
                className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200/90 shadow-slate-200/50 hover:border-indigo-300'
                }`}
              >
                {/* HEADER KELOMPOK INDUSTRI */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-inherit pb-5">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">
                        {group.industryName}
                      </h3>

                      {/* BADGE JURUSAN */}
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30 flex items-center space-x-1.5">
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>{groupDeptName}</span>
                      </span>

                      {group.periodName && (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{group.periodName}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-bold text-slate-700 dark:text-slate-400">
                      {group.industryAddress || 'Alamat Industri Terdaftar di Sistem Pokja'}
                    </p>

                    {/* PENAMPILAN NOMOR SURAT RESMI (letterNumber) YANG DI-INPUT TATA USAHA / POKJA */}
                    {group.letterNumber ? (
                      <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                        <Hash className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>No. Surat Resmi (TU/Pokja): <strong className="font-mono text-emerald-950 dark:text-emerald-300">{group.letterNumber}</strong></span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/30 text-xs font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
                        <span>Nomor Surat: <strong>Belum Di-input (Menunggu Penerbitan TU/Pokja)</strong></span>
                      </div>
                    )}
                  </div>

                  {/* STATUS & TOMBOL AKSI UTAMA POKJA */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <span className={`px-3.5 py-1.5 rounded-2xl text-xs font-extrabold border flex items-center space-x-1.5 ${
                      hasSurat
                        ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/30'
                    }`}>
                      {hasSurat ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                          <span>Surat Permohonan Terbit</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-500 animate-pulse" />
                          <span>Menunggu Unggah Surat</span>
                        </>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() => setDetailModalGroup(group)}
                      className={`px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300'
                      }`}
                    >
                      <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-500" />
                      <span>Detail</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportGroupToNewTab(group)}
                      className={`px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-emerald-900/30 hover:bg-emerald-800/40 text-emerald-400 border-emerald-800'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                      }`}
                      title="Export Kelompok ke Spreadsheet"
                    >
                      <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                      <span>Export</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTargetGroup(group);
                        setInputLetterNumber(group.letterNumber || '');
                        setInputLetterDate(formatDateIndonesia(group.letterUploadedAt) !== '-' ? formatDateIndonesia(group.letterUploadedAt) : formatDateIndonesia(new Date().toISOString()));
                        setDateDetectedNotice('');
                        setSuratBase64('');
                        setSelectedFileName('');
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center space-x-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{hasSurat ? 'Ganti Surat & Nomor' : 'Upload Surat'}</span>
                    </button>

                    {/* 🌟 TOMBOL GENERATOR LEMBAR KONFIRMASI (BALASAN DUDI) - HANYA SAAT hasSurat = true */}
                    {hasSurat && (
                      <button
                        type="button"
                        onClick={() => handleOpenConfirmationModal(group)}
                        className="px-4 py-2.5 rounded-2xl border text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 border-purple-500"
                        title="Cetak Format Balasan / Lembar Konfirmasi DUDI"
                      >
                        <FileSignature className="w-4 h-4" />
                        <span>Format Balasan DUDI</span>
                      </button>
                    )}

                    {/* 🌟 TOMBOL HAPUS KELOMPOK */}
                    <button
                      type="button"
                      onClick={() => setDeleteTargetGroup(group)}
                      className="px-4 py-2.5 rounded-2xl text-xs font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm"
                      title="Hapus Kelompok & Reset Status Penempatan Siswa"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Hapus Kelompok</span>
                    </button>

                    {hasSurat && group.suratTugasUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setActivePreviewUrl(group.suratTugasUrl || null);
                          setActivePreviewTitle(`Surat Permohonan PKL (No: ${group.letterNumber || '-'}) - ${group.industryName}`);
                        }}
                        className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                            : 'bg-white hover:bg-slate-100 text-slate-900 border-slate-300 shadow-sm'
                        }`}
                        title="Pratinjau Surat Permohonan"
                      >
                        <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </button>
                    )}

                    {(group.suratBalasanUrl || (group.placements && group.placements.some(p => p.suratBalasanUrl))) && (() => {
                      const balasanUrl = group.suratBalasanUrl || group.placements?.find(p => p.suratBalasanUrl)?.suratBalasanUrl;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setActivePreviewUrl(balasanUrl || null);
                            setActivePreviewTitle(`Surat Balasan Industri - ${group.industryName}`);
                          }}
                          className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                            theme === 'dark'
                              ? 'bg-sky-900/30 hover:bg-sky-800/40 text-sky-400 border-sky-800'
                              : 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200 shadow-sm'
                          }`}
                          title="Pratinjau Surat Balasan Industri"
                        >
                          <FileCheck2 className="w-4 h-4 text-sky-600 dark:text-sky-500" />
                        </button>
                      );
                    })()}
                  </div>
                </div>

                {/* ANGGOTA KELOMPOK SISWA & GURU PEMBIMBING */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider flex items-center space-x-1.5 text-slate-800 dark:text-slate-400">
                    <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Daftar Anggota Siswa Kelompok ({studentList.length} Orang):</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {studentList.map((item: StudentItem, idx: number) => {
                      const student = item.student || item;
                      const teacherName = student.teacher?.name || student.teacherName || null;

                      return (
                        <div
                          key={item.id || item.placementId || idx}
                          className={`p-4 rounded-2xl border transition-all space-y-3 flex flex-col justify-between relative group ${
                            theme === 'dark'
                              ? 'bg-slate-950/60 border-slate-800'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="space-y-1.5 overflow-hidden pr-6">
                            <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 block truncate">
                              {student.name || student.studentName || 'Nama Siswa'}
                            </span>
                            <p className="text-[11px] text-slate-700 dark:text-slate-400 font-bold">
                              NIS: {student.nis || '-'} • {student.className || '-'}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-black truncate max-w-[120px]">
                                {student.department || student.departmentName || groupDeptName}
                              </span>
                              {(() => {
                                const st = (student as any).status || (item as any).status;
                                if (st === 'PEMBUATAN_SURAT') {
                                  return (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
                                      SIAP SURAT
                                    </span>
                                  );
                                }
                                if (st === 'SURAT_DITERBITKAN' || st === 'LETTER_ISSUED') {
                                  return (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                                      SURAT TERBIT
                                    </span>
                                  );
                                }
                                if (st === 'DISETUJUI_INDUSTRI' || st === 'DITERIMA' || st === 'DITERIMA_INDUSTRI') {
                                  return (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 whitespace-nowrap">
                                      DISETUJUI DUDI
                                    </span>
                                  );
                                }
                                if (st) {
                                  return (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/30 whitespace-nowrap">
                                      {st.replace(/_/g, ' ')}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>

                          {/* TOMBOL KELUARKAN SISWA INDIVIDUAL */}
                          <button
                            type="button"
                            onClick={() => setDeleteTargetStudent(item)}
                            className="absolute top-3 right-3 p-1 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition-all cursor-pointer"
                            title="Keluarkan Siswa dari Kelompok ini"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {/* TOMBOL WHATSAPP SISWA */}
                          {student.phone && (
                            <a
                              href={`https://wa.me/${student.phone.replace(/\D/g, '').replace(/^0/, '62')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute top-3 right-10 p-1 rounded-xl text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 transition-all cursor-pointer"
                              title={`Hubungi ${student.name || 'Siswa'} via WhatsApp`}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}

                          {/* GURU PEMBIMBING ASSIGNMENT */}
                          <div className="pt-2.5 border-t border-slate-300 dark:border-slate-800 flex items-center justify-between text-[11px]">
                            <span className="text-[10px] text-slate-700 dark:text-slate-400 font-bold uppercase">Pembimbing:</span>
                            <span className={`font-bold px-2 py-0.5 rounded-lg text-[10px] flex items-center space-x-1 truncate max-w-[130px] ${
                              teacherName 
                                ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30' 
                                : 'bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/30'
                            }`} title={teacherName || 'Belum Di-assign'}>
                              <User className="w-3 h-3 shrink-0" />
                              <span className="truncate">{teacherName || 'Belum Di-assign'}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            );
          })
        ) : (
          <div className={`p-12 text-center rounded-3xl border space-y-4 ${
            theme === 'dark' ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-700'
          }`}>
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center border border-indigo-500/20">
              <Users className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <p className="font-black text-base text-slate-900 dark:text-slate-200">
                Tidak Ada Kelompok Terverifikasi untuk {pokjaDepartment}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                Hanya siswa yang telah diverifikasi oleh Tim Pokja yang ditampilkan pada halaman ini. Siswa yang baru mengajukan tempat PKL dapat Anda tinjau dan setujui terlebih dahulu pada menu <strong>Verifikasi Pengajuan PKL</strong>.
              </p>
            </div>
            <div className="pt-2">
              <a
                href="/dashboard/pokja/verifikasi"
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Buka Menu Verifikasi Pengajuan</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* 🌟 MODAL KONFIRMASI HAPUS SELURUH KELOMPOK */}
      {deleteTargetGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-all ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-6 border-b border-inherit flex justify-between items-center bg-rose-500/10">
              <h3 className="font-extrabold text-base text-rose-700 dark:text-rose-400 flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5" />
                <span>Konfirmasi Hapus Kelompok</span>
              </h3>
              <button
                type="button"
                onClick={() => setDeleteTargetGroup(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              <div className="space-y-2 text-center">
                <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-rose-600/30">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Hapus Kelompok "{deleteTargetGroup.industryName}"?
                </h4>
                <p className="text-slate-600 dark:text-slate-400 text-xs font-medium leading-relaxed">
                  Tindakan ini akan menghapus data penempatan <strong>{(deleteTargetGroup.students || deleteTargetGroup.placements || []).length} Siswa</strong> pada kelompok ini.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-[11px] font-semibold flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Status pendaftaran seluruh siswa di kelompok ini akan <strong>DI-RESET</strong>, sehingga mereka bisa memilih kembali DUDI lain di katalog siswa.</span>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setDeleteTargetGroup(null)}
                  className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteGroup}
                  disabled={deleting}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-lg shadow-rose-600/30 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>Ya, Hapus Kelompok</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 MODAL KONFIRMASI KELUARKAN SISWA INDIVIDUAL */}
      {deleteTargetStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-all ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-6 border-b border-inherit flex justify-between items-center bg-rose-500/10">
              <h3 className="font-extrabold text-base text-rose-700 dark:text-rose-400 flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5" />
                <span>Keluarkan Siswa dari Kelompok</span>
              </h3>
              <button
                type="button"
                onClick={() => setDeleteTargetStudent(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              <div className="space-y-2 text-center">
                <h4 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Keluarkan {deleteTargetStudent.student?.name || deleteTargetStudent.name || deleteTargetStudent.studentName}?
                </h4>
                <p className="text-slate-600 dark:text-slate-400 text-xs font-medium">
                  NIS: {deleteTargetStudent.student?.nis || deleteTargetStudent.nis || '-'} • Kelas: {deleteTargetStudent.student?.className || deleteTargetStudent.className || '-'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-[11px] font-semibold">
                Status siswa ini akan di-reset dari kelompok penempatan, dan siswa dapat mendaftar kembali di DUDI lain.
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setDeleteTargetStudent(null)}
                  className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteStudent}
                  disabled={deleting}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-lg shadow-rose-600/30 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>Keluarkan Siswa</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL KELOMPOK */}
      {detailModalGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-3xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="p-6 border-b border-inherit flex justify-between items-center bg-indigo-500/10">
              <div className="space-y-1">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Detail Informasi Kelompok & Tanggal Prakerin</span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">{detailModalGroup.industryName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalGroup(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <span className="text-slate-700 dark:text-slate-400 font-bold block">Jurusan Kelompok:</span>
                  <p className="font-extrabold text-indigo-700 dark:text-indigo-400 text-sm">{detailModalGroup.departmentName || pokjaDepartment}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-700 dark:text-slate-400 font-bold block">Periode Pelaksanaan:</span>
                  <p className="font-bold text-slate-900 dark:text-slate-200">{detailModalGroup.periodName || 'Periode Standar'}</p>
                </div>

                <div className="space-y-1 sm:col-span-2 pt-2 border-t border-slate-300 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center space-x-2">
                    <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-slate-800 dark:text-slate-400 font-bold">Jadwal Mulai s/d Selesai PKL:</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 font-mono font-bold text-xs border border-emerald-500/30">
                    {formatDateIndonesia(detailModalGroup.startDate)} s/d {formatDateIndonesia(detailModalGroup.endDate)}
                  </div>
                </div>

                {/* 🌟 RINCIAN ALAMAT LENGKAP INDUSTRI */}
                <div className="space-y-1.5 sm:col-span-2 pt-2 border-t border-slate-300 dark:border-slate-800/60">
                  <span className="text-slate-800 dark:text-slate-300 font-extrabold block">Alamat Lengkap Industri:</span>
                  <p className="font-bold text-slate-900 dark:text-slate-100 leading-relaxed bg-slate-100 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    {detailModalGroup.fullAddress || detailModalGroup.industryAddress || '-'}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
                    <div>Jalan: <strong className="text-slate-900 dark:text-slate-200">{detailModalGroup.jalan || detailModalGroup.rawAddress || '-'}</strong></div>
                    <div>RT / RW: <strong className="text-slate-900 dark:text-slate-200">{detailModalGroup.rt || '-'}/{detailModalGroup.rw || '-'}</strong></div>
                    <div>Kelurahan/Desa: <strong className="text-slate-900 dark:text-slate-200">{detailModalGroup.desaKelurahan || '-'}</strong></div>
                    <div>Kecamatan: <strong className="text-slate-900 dark:text-slate-200">{detailModalGroup.subDistrict || '-'}</strong></div>
                    <div>Kabupaten/Kota: <strong className="text-slate-900 dark:text-slate-200">{detailModalGroup.regency || '-'}</strong></div>
                    <div>Kode Pos: <strong className="text-slate-900 dark:text-slate-200">{detailModalGroup.postalCode || '-'}</strong></div>
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2 pt-2 border-t border-slate-300 dark:border-slate-800/60 flex items-center justify-between">
                  <span className="text-slate-800 dark:text-slate-400 font-bold flex items-center space-x-1.5">
                    <Hash className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Nomor Surat Permohonan (letterNumber):</span>
                  </span>
                  {detailModalGroup.letterNumber ? (
                    <strong className="text-indigo-700 dark:text-indigo-400 font-mono text-sm px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                      {detailModalGroup.letterNumber}
                    </strong>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-bold italic">Belum Di-input</span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-900 dark:text-slate-200 text-sm flex items-center space-x-2">
                  <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Daftar Siswa Anggota Kelompok ({(detailModalGroup.students || detailModalGroup.placements || []).length} Siswa):</span>
                </h4>

                <div className="space-y-2.5">
                  {(detailModalGroup.students || detailModalGroup.placements || []).map((item: StudentItem, idx: number) => {
                    const student = item.student || item;
                    const teacherName = student.teacher?.name || student.teacherName || 'Belum Di-assign';

                    return (
                      <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1">
                          <span className="font-black text-slate-900 dark:text-slate-100 text-sm block">
                            {idx + 1}. {student.name || student.studentName}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-700 dark:text-slate-400 font-bold">
                            <span>NIS: <strong>{student.nis || '-'}</strong></span>
                            <span>•</span>
                            <span>Kelas: <strong>{student.className || '-'}</strong></span>
                            <span>•</span>
                            <span className="text-indigo-700 dark:text-indigo-400">{student.department || student.departmentName || pokjaDepartment}</span>
                          </div>
                        </div>

                        <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold border border-emerald-500/30 shrink-0">
                          Pembimbing: {teacherName}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-inherit flex justify-end">
              <button
                type="button"
                onClick={() => setDetailModalGroup(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all cursor-pointer"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UPLOAD SURAT DENGAN INPUT NOMOR SURAT POKJA */}
      {targetGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-all ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-6 border-b border-inherit flex justify-between items-center bg-indigo-500/10">
              <h3 className="font-extrabold text-base text-indigo-800 dark:text-indigo-400 flex items-center space-x-2">
                <FileCheck2 className="w-5 h-5" />
                <span>Upload Surat & Input Nomor Surat</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setTargetGroup(null);
                  setSuratBase64('');
                  setInputLetterNumber('');
                  setSelectedFileName('');
                }}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSuratGroup} className="p-6 space-y-5 text-xs">
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-indigo-200">
                  Terbitkan / Perbarui Surat Permohonan Ke Industri
                </h4>
                <p className="text-slate-700 dark:text-slate-400 text-xs font-medium leading-relaxed">
                  Input nomor surat dan unggah berkas ke <strong>{targetGroup.industryName}</strong> untuk disimpan di database.
                </p>
              </div>

              {/* FIELD INPUT NOMOR SURAT RESMI POKJA */}
              <div className="space-y-2">
                <label className="font-extrabold text-slate-800 dark:text-slate-300 uppercase flex items-center space-x-1.5">
                  <Hash className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Nomor Surat Resmi Permohonan PKL: *</span>
                </label>
                <input
                  type="text"
                  required
                  value={inputLetterNumber}
                  onChange={(e) => setInputLetterNumber(e.target.value)}
                  placeholder="Contoh: 421.5/450/SMK-2026"
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-mono font-bold border outline-none transition-all ${
                    theme === 'dark' 
                      ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600 shadow-sm'
                  }`}
                />
              </div>

              {/* FIELD INPUT TANGGAL SURAT RESMI */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-extrabold text-slate-800 dark:text-slate-300 uppercase flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Tanggal Surat Permohonan:</span>
                  </label>
                  {dateDetectedNotice && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1 animate-pulse">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>{dateDetectedNotice}</span>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={inputLetterDate}
                  onChange={(e) => setInputLetterDate(e.target.value)}
                  placeholder="Contoh: 29 April 2026 atau tanggal hari ini"
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none transition-all ${
                    theme === 'dark' 
                      ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600 shadow-sm'
                  }`}
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Tanggal ini otomatis mendeteksi dari PDF surat atau gunakan tanggal terbit resmi untuk konfirmasi DUDI.
                </p>
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 font-medium ${
                theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400 font-bold">Industri Tujuan:</span>
                  <strong className="text-indigo-950 dark:text-indigo-300 font-black">{targetGroup.industryName}</strong>
                </div>
                {selectedFileName && (
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400 font-bold">Nama Berkas:</span>
                    <strong className="text-emerald-700 dark:text-emerald-400 truncate max-w-[200px]">{selectedFileName}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400 font-bold">Jumlah Siswa Penerima:</span>
                  <strong className="text-slate-950 dark:text-slate-200 font-black">
                    {(targetGroup.students || targetGroup.placements || []).length} Siswa
                  </strong>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-700 dark:text-slate-400 uppercase">Pilih File Surat Permohonan (PDF / Gambar):</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50 dark:bg-slate-950/40 text-center space-y-2 cursor-pointer transition-all"
                >
                  <FileText className="w-7 h-7 mx-auto text-indigo-600 dark:text-indigo-400" />
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {suratBase64 ? 'File Surat Berhasil Dipilih (Klik untuk mengganti)' : 'Klik di sini untuk memilih Surat Permohonan'}
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-500 font-semibold">Format: PDF, PNG, JPG (Maksimal 5MB)</p>
                </button>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setTargetGroup(null);
                    setSuratBase64('');
                    setInputLetterNumber('');
                    setSelectedFileName('');
                  }}
                  className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !suratBase64 || !inputLetterNumber.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
                  <span>Simpan & Terbitkan Surat</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRATINJAU DOKUMEN */}
      {activePreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-5 border-b border-inherit flex justify-between items-center">
              <h3 className="font-bold text-sm text-indigo-700 dark:text-indigo-400 flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>{activePreviewTitle}</span>
              </h3>
              <button
                type="button"
                onClick={() => setActivePreviewUrl(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-auto flex justify-center items-center bg-slate-950/60 min-h-[400px]">
              {activePreviewUrl.startsWith('data:application/pdf') || activePreviewUrl.endsWith('.pdf') ? (
                <iframe src={activePreviewUrl} className="w-full h-[550px] rounded-2xl border border-slate-800" title="Document PDF Preview" />
              ) : (
                <img src={activePreviewUrl} alt="Preview Document" className="max-w-full max-h-[550px] object-contain rounded-2xl border border-slate-800 shadow-lg" />
              )}
            </div>

            <div className="p-4 border-t border-inherit flex justify-end space-x-3">
              <a
                href={activePreviewUrl}
                download="surat_permohonan_pkl_sierin"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Unduh Berkas</span>
              </a>
              <button
                type="button"
                onClick={() => setActivePreviewUrl(null)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                }`}
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GENERATOR LEMBAR KONFIRMASI PENGAJUAN PKL (BALASAN DUDI) */}
      {confirmationGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-6xl max-h-[96vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* HEADER MODAL */}
            <div className="p-4 sm:p-6 border-b border-inherit flex flex-wrap justify-between items-center gap-4 bg-purple-500/10">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-600 text-white flex items-center space-x-1">
                    <FileSignature className="w-3 h-3" />
                    <span>Generator Surat Balasan DUDI</span>
                  </span>
                  {confirmationForm.isDateAutoDetected && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      <span>Tanggal Terdeteksi Otomatis dari PDF</span>
                    </span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>Lembar Konfirmasi: {confirmationGroup.industryName}</span>
                </h3>
              </div>

              {/* ACTION BUTTONS HEADER */}
              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={handleOpenConfirmationInNewTab}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 cursor-pointer ${
                    theme === 'dark' 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  }`}
                  title="Buka format cetak di tab browser baru"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden sm:inline">Buka di Tab Baru</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintConfirmationLetter}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-all flex items-center space-x-1.5 cursor-pointer"
                  title="Cetak Langsung Lembar A4 (Print / Save PDF)"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Lembar Konfirmasi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmationGroup(null)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* BODY: SPLIT VIEW (SETTINGS SIDEBAR & A4 LIVE PREVIEW) */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              {/* SIDEBAR PENGATURAN KUSTOMISASI SURAT */}
              <div className={`w-full lg:w-[360px] border-b lg:border-b-0 lg:border-r border-inherit p-5 overflow-y-auto space-y-4 shrink-0 text-xs ${
                theme === 'dark' ? 'bg-slate-900/60' : 'bg-slate-50'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-inherit">
                  <span className="font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <Edit3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Pengaturan Dokumen</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Live Updated</span>
                </div>

                {/* NOMOR SURAT */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                    <Hash className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Nomor Surat Permohonan:</span>
                  </label>
                  <input
                    type="text"
                    value={confirmationForm.letterNumber}
                    onChange={(e) => setConfirmationForm({ ...confirmationForm, letterNumber: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border outline-none ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* TANGGAL SURAT DENGAN STATUS DETEKSI OTOMATIS */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-purple-500" />
                      <span>Tanggal Surat Permohonan:</span>
                    </label>
                    {confirmationForm.detectingDate ? (
                      <span className="text-[10px] text-indigo-500 flex items-center space-x-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Mendeteksi PDF...</span>
                      </span>
                    ) : confirmationForm.isDateAutoDetected ? (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center space-x-0.5">
                        <Check className="w-3 h-3" />
                        <span>Auto-Detect</span>
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    value={confirmationForm.letterDate}
                    onChange={(e) => setConfirmationForm({ ...confirmationForm, letterDate: e.target.value, isDateAutoDetected: false })}
                    placeholder="Contoh: 29 April 2026"
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {confirmationForm.isDateAutoDetected
                      ? '✨ Berhasil dideteksi langsung dari teks PDF surat permohonan.'
                      : 'Tanggal yang tertera pada surat permohonan sekolah ke industri.'}
                  </p>
                </div>

                {/* DURASI BULAN & JADWAL MULAI / SELESAI */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <label className="font-extrabold text-slate-700 dark:text-slate-300">Durasi (Bulan):</label>
                    <input
                      type="text"
                      value={confirmationForm.durationMonths}
                      onChange={(e) => setConfirmationForm({ ...confirmationForm, durationMonths: e.target.value })}
                      placeholder="Contoh: 6 atau ……"
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none text-center ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-extrabold text-slate-700 dark:text-slate-300">Nama Sekolah:</label>
                    <input
                      type="text"
                      value={confirmationForm.schoolName}
                      onChange={(e) => setConfirmationForm({ ...confirmationForm, schoolName: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 dark:text-slate-300">Tanggal Mulai PKL:</label>
                  <input
                    type="text"
                    value={confirmationForm.startDate}
                    onChange={(e) => setConfirmationForm({ ...confirmationForm, startDate: e.target.value })}
                    placeholder="Contoh: 1 Juli 2026"
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 dark:text-slate-300">Tanggal Selesai PKL:</label>
                  <input
                    type="text"
                    value={confirmationForm.endDate}
                    onChange={(e) => setConfirmationForm({ ...confirmationForm, endDate: e.target.value })}
                    placeholder="Contoh: 31 Desember 2026"
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* BIDANG KEILMUAN / MATERI */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 dark:text-slate-300">Bidang Keilmuan / Materi:</label>
                  <textarea
                    rows={3}
                    value={confirmationForm.competencies}
                    onChange={(e) => setConfirmationForm({ ...confirmationForm, competencies: e.target.value })}
                    className={`w-full p-2.5 rounded-xl text-xs font-semibold border outline-none ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* KOTA PENANDATANGAN */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 dark:text-slate-300">Kota Penandatangan DUDI:</label>
                  <input
                    type="text"
                    value={confirmationForm.city}
                    onChange={(e) => setConfirmationForm({ ...confirmationForm, city: e.target.value })}
                    placeholder="Contoh: Kabupaten Tegal"
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handlePrintConfirmationLetter}
                    className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Lembar Konfirmasi</span>
                  </button>
                </div>
              </div>

              {/* LIVE PREVIEW SIMULASI KERTAS A4 */}
              <div className="flex-1 bg-slate-300 dark:bg-slate-950 p-4 sm:p-8 overflow-y-auto flex justify-center">
                <div className="bg-white text-slate-950 shadow-2xl p-8 sm:p-12 w-full max-w-[210mm] min-h-[297mm] font-serif text-[12pt] leading-relaxed border border-slate-400 select-text flex flex-col justify-between">
                  <div>
                    {/* JUDUL */}
                    <div className="text-center mb-6">
                      <h1 className="text-[14pt] font-black uppercase tracking-wider text-black m-0">KONFIRMASI</h1>
                      <h2 className="text-[12.5pt] font-bold uppercase tracking-tight text-black mt-1 mb-0">PENGAJUAN KEGIATAN PRAKTEK KERJA LAPANGAN(PKL)</h2>
                    </div>

                    {/* TUJUAN SURAT (SEBELAH KANAN) */}
                    <div className="flex justify-end mb-5">
                      <div className="w-64 text-left leading-normal text-[11.5pt] text-black">
                        <p className="m-0">Kepada Yth.</p>
                        <p className="m-0 font-bold">Kepala {confirmationForm.schoolName}</p>
                        <p className="m-0">di _</p>
                        <p className="m-0 pl-6">Tempat</p>
                      </div>
                    </div>

                    {/* PARAGRAF UTAMA */}
                    <p className="text-justify leading-relaxed mb-4 text-black indent-0 text-[11.5pt]">
                      Berdasarkan dengan surat permohonan Prakerin dari {confirmationForm.schoolName} sesuai dengan nomor ajuan <strong>{confirmationForm.letterNumber}</strong> tanggal <strong>{confirmationForm.letterDate}</strong>. Maka dengan ini kami <strong>MENERIMA / MENOLAK *</strong> untuk melaksanakan kegiatan tersebut sesuai dengan syarat dan ketentuan yang berlaku di Perusahaan/Instansi <strong>{confirmationGroup.industryName}</strong> yang beralamat di {confirmationGroup.fullAddress || confirmationGroup.industryAddress || '-'} selama <strong>{confirmationForm.durationMonths}</strong> bulan dan terhitung mulai <strong>{confirmationForm.startDate}</strong> sampai <strong>{confirmationForm.endDate}</strong>.
                    </p>

                    <p className="mb-2 text-black text-[11.5pt]">
                      Adapun peserta dalam kegiatan PKL di Instansi/Perusahan kami adalah:
                    </p>

                    {/* TABEL SISWA */}
                    <table className="w-full border-collapse mb-4 text-black text-[11pt]">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="border border-black p-1.5 text-center font-bold w-10">No</th>
                          <th className="border border-black p-1.5 text-center font-bold w-28">NIS</th>
                          <th className="border border-black p-1.5 text-left font-bold">Nama</th>
                          <th className="border border-black p-1.5 text-center font-bold w-40">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(confirmationGroup.students || confirmationGroup.placements || []).map((item, idx) => {
                          const student = item.student || item;
                          return (
                            <tr key={idx}>
                              <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                              <td className="border border-black p-1.5 text-center">{student.nis || '-'}</td>
                              <td className="border border-black p-1.5 uppercase font-medium">{student.name || student.studentName || '-'}</td>
                              <td className="border border-black p-1.5 text-center whitespace-nowrap">Diterima / Ditolak *</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* BIDANG KEILMUAN */}
                    <div className="leading-relaxed mb-4 text-black text-justify text-[11.5pt]">
                      Dengan bidang keilmuan / materi selama kegiatan Prakerin adalah di bidang <strong>{confirmationForm.competencies}</strong><br />
                      …………………………………………………………………… *
                    </div>

                    {/* PARAGRAF PENUTUP */}
                    <p className="leading-relaxed mb-6 text-black text-justify text-[11.5pt]">
                      Demikian surat keteragan ini kami buat atas perhatian dan kerjasamanya kami ucapakan terimakasih.
                    </p>

                    {/* BLOK TANDA TANGAN (SEBELAH KANAN) */}
                    <div className="flex justify-end mb-4">
                      <div className="w-72 text-left leading-snug text-black text-[11.5pt]">
                        <p className="m-0">…………….., ……………….. {new Date().getFullYear()}</p>
                        <p className="m-0 font-bold mt-0.5">a.n {confirmationGroup.industryName}</p>
                        <div className="h-20" />
                        <div className="border-b border-black w-56 mb-1" />
                        <p className="m-0">Jabatan:</p>
                      </div>
                    </div>
                  </div>

                  {/* CATATAN KAKI */}
                  <div className="text-[9.5pt] italic text-slate-800 border-t border-dashed border-slate-400 pt-2 leading-tight">
                    <p className="m-0">*) Coret yang tidak perlu</p>
                    <p className="m-0">**) Jumlah siswa yang di terima menyesuaikan kebijakan Instansi/Perusahaan</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER MODAL */}
            <div className="p-4 border-t border-inherit flex flex-wrap justify-between items-center gap-3 bg-slate-50 dark:bg-slate-900/60">
              <span className="text-xs text-slate-500 font-medium">
                💡 Format cetak siap A4 portrait standar resmi. Siswa/Pokja tinggal menyerahkan lembar ini ke DUDI.
              </span>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setConfirmationGroup(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handlePrintConfirmationLetter}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Lembar Konfirmasi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}