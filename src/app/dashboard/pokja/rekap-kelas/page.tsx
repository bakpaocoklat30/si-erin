'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/app/theme-provider';
import { useSession } from 'next-auth/react';
import { 
  Loader2, Users, Search, AlertCircle, BarChart3, Filter, ArrowUpDown, ArrowUp, ArrowDown,
  Download, FileSpreadsheet, CheckCircle2
} from 'lucide-react';

const BELUM_MENDAFTAR = ['BELUM_MENDAFTAR'];
const MENGAJUKAN = ['PENGAJUAN_DIKIRIM', 'REVIEW_POKJA', 'PEMBUATAN_SURAT', 'SURAT_DITERBITKAN', 'LETTER_ISSUED'];
const MENUNGGU_BALASAN = ['KIRIM_SURAT', 'SENT_DUDI'];
const DITERIMA = ['DISETUJUI_INDUSTRI', 'REQUEST_PENGANTARAN', 'MENUNGGU_PEMBERANGKATAN', 'PENGANTARAN_DITERBITKAN', 'REQUEST_PENARIKAN', 'MENUNGGU_PENARIKAN', 'PENARIKAN_DITERBITKAN', 'DITERIMA', 'DITERIMA_INDUSTRI', 'COMPLETED', 'SELESAI_PKL'];

export default function PokjaRekapKelasPage() {
  const { theme } = useTheme();
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [students, setStudents] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classRooms, setClassRooms] = useState<any[]>([]);
  
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('ALL');
  const [selectedClassRoom, setSelectedClassRoom] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [exporting, setExporting] = useState<'csv' | 'excel' | null>(null);
  const [exportSuccessMsg, setExportSuccessMsg] = useState('');

  const handleSort = (field: string) => {
    if (sortField !== field) {
      setSortField(field);
      setSortDirection('asc');
    } else {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    }
  };

  useEffect(() => {
    fetchData(selectedAcademicYear, selectedClassRoom);
  }, [selectedAcademicYear, selectedClassRoom]);

  const fetchData = async (academicYearId: string, className: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      if (academicYearId && academicYearId !== 'ALL') params.set('academicYearId', academicYearId);
      if (className && className !== 'ALL') params.set('className', className);
      
      const res = await fetch(`/api/pokja/rekap-kelas?${params.toString()}`);
      const json = await res.json();
      
      if (res.ok && json.success) {
        setStudents(json.data || []);
        if (json.filters) {
          if (academicYears.length === 0) setAcademicYears(json.filters.academicYears || []);
          setClassRooms(json.filters.classRooms || []);
        }
      } else {
        setErrorMsg(json.error || 'Gagal memuat rekap kelas');
      }
    } catch (e: any) {
      setErrorMsg('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  };

  const filteredClassRooms = useMemo(() => {
    if (selectedAcademicYear === 'ALL') return classRooms;
    return classRooms.filter(c => c.academicYearId === selectedAcademicYear);
  }, [classRooms, selectedAcademicYear]);

  const filteredStudents = useMemo(() => {
    let result = students;

    // Filter status
    if (selectedStatus !== 'ALL') {
      result = result.filter(s => {
        const status = s.placement?.status;
        if (selectedStatus === 'BELUM_MENDAFTAR') {
          return !s.placement || !status || BELUM_MENDAFTAR.includes(status);
        } else if (selectedStatus === 'MENGAJUKAN') {
          return status && MENGAJUKAN.includes(status);
        } else if (selectedStatus === 'MENUNGGU_BALASAN') {
          return status && MENUNGGU_BALASAN.includes(status);
        } else if (selectedStatus === 'DITERIMA') {
          return status && DITERIMA.includes(status);
        }
        return true;
      });
    }

    // Filter pencarian (Nama, NIS, Industri, dan Guru Pembimbing)
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(s => {
        const nameMatch = s.name?.toLowerCase().includes(lowerSearch);
        const nisMatch = s.nis?.toLowerCase().includes(lowerSearch);
        const indMatch = s.placement?.industry?.name?.toLowerCase().includes(lowerSearch);
        const teacherMatch = s.teacher?.name?.toLowerCase().includes(lowerSearch);
        return Boolean(nameMatch || nisMatch || indMatch || teacherMatch);
      });
    }

    // Pengurutan (Sort) Kolom
    if (sortField && sortDirection) {
      result = [...result].sort((a, b) => {
        let valA = '';
        let valB = '';

        if (sortField === 'nis') {
          valA = a.nis || '';
          valB = b.nis || '';
        } else if (sortField === 'name') {
          valA = a.name || '';
          valB = b.name || '';
        } else if (sortField === 'className') {
          valA = a.className || '';
          valB = b.className || '';
        } else if (sortField === 'status') {
          valA = formatStatus(a.placement?.status) || '';
          valB = formatStatus(b.placement?.status) || '';
        } else if (sortField === 'industry') {
          valA = a.placement?.industry?.name || '';
          valB = b.placement?.industry?.name || '';
        } else if (sortField === 'teacher') {
          valA = a.teacher?.name || '';
          valB = b.teacher?.name || '';
        }

        const comp = valA.localeCompare(valB, 'id', { sensitivity: 'base', numeric: true });
        return sortDirection === 'asc' ? comp : -comp;
      });
    }

    return result;
  }, [students, selectedStatus, searchTerm, sortField, sortDirection]);

  // Statistik
  const stats = useMemo(() => {
    let belumMendaftar = 0;
    let mengajukan = 0;
    let menunggu = 0;
    let diterima = 0;

    students.forEach(s => {
      const status = s.placement?.status;
      if (!s.placement || !status || BELUM_MENDAFTAR.includes(status)) {
        belumMendaftar++;
      } else if (MENGAJUKAN.includes(status)) {
        mengajukan++;
      } else if (MENUNGGU_BALASAN.includes(status)) {
        menunggu++;
      } else if (DITERIMA.includes(status)) {
        diterima++;
      } else {
        belumMendaftar++; // Fallback
      }
    });

    const total = students.length || 1; // avoid div by 0
    return {
      total: students.length,
      belumMendaftar,
      mengajukan,
      menunggu,
      diterima,
      pctBelumMendaftar: (belumMendaftar / total) * 100,
      pctMengajukan: (mengajukan / total) * 100,
      pctMenunggu: (menunggu / total) * 100,
      pctDiterima: (diterima / total) * 100,
    };
  }, [students]);

  const formatStatus = (status?: string) => {
    if (!status || BELUM_MENDAFTAR.includes(status)) return 'Belum Mendaftar PKL';
    if (MENGAJUKAN.includes(status)) return 'Mengajukan PKL';
    if (MENUNGGU_BALASAN.includes(status)) return 'Menunggu Balasan PKL';
    if (DITERIMA.includes(status)) return 'Diterima Industri';
    return status.replace(/_/g, ' ');
  };

  const getStatusColor = (status?: string) => {
    if (!status || BELUM_MENDAFTAR.includes(status)) return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300';
    if (MENGAJUKAN.includes(status)) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200';
    if (MENUNGGU_BALASAN.includes(status)) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200';
    if (DITERIMA.includes(status)) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getExportFilename = (extension: 'csv' | 'xls') => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const parts = ['Rekap_Siswa_PKL'];
    
    if (selectedAcademicYear !== 'ALL') {
      const ay = academicYears.find(a => a.id === selectedAcademicYear);
      if (ay) parts.push(ay.year.replace(/[^a-zA-Z0-9]/g, '_'));
    }
    
    if (selectedClassRoom !== 'ALL') {
      parts.push(selectedClassRoom.replace(/[^a-zA-Z0-9]/g, '_'));
    }
    
    if (selectedStatus !== 'ALL') {
      parts.push(selectedStatus.toLowerCase());
    }

    parts.push(timestamp);
    return `${parts.join('_')}.${extension}`;
  };

  const handleExportCSV = () => {
    if (filteredStudents.length === 0) {
      alert('Tidak ada data siswa untuk diekspor.');
      return;
    }

    setExporting('csv');
    try {
      const headers = [
        'No',
        'NIS',
        'NISN',
        'Nama Siswa',
        'Kelas',
        'Jurusan',
        'No. Telepon',
        'Status Penempatan PKL',
        'Industri / Instansi Penempatan',
        'Guru Pembimbing'
      ];

      const rows = filteredStudents.map((s, idx) => [
        String(idx + 1),
        s.nis || '-',
        s.nisn || '-',
        s.name || '-',
        s.className || '-',
        s.department || '-',
        s.phone || '-',
        formatStatus(s.placement?.status),
        s.placement?.industry?.name || 'Belum ada instansi',
        s.teacher?.name || 'Belum ada pembimbing'
      ]);

      const csvContent = [
        headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\r\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', getExportFilename('csv'));
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccessMsg(`Berhasil mengekspor ${filteredStudents.length} data siswa ke format CSV!`);
      setTimeout(() => setExportSuccessMsg(''), 4000);
    } catch (err) {
      alert('Terjadi kesalahan saat mengekspor data CSV.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = () => {
    if (filteredStudents.length === 0) {
      alert('Tidak ada data siswa untuk diekspor.');
      return;
    }

    setExporting('excel');
    try {
      const academicYearLabel = selectedAcademicYear !== 'ALL' 
        ? academicYears.find(a => a.id === selectedAcademicYear)?.year || selectedAcademicYear 
        : 'Semua Tahun Pelajaran';
      const classLabel = selectedClassRoom !== 'ALL' ? selectedClassRoom : 'Semua Kelas';
      const statusLabel = selectedStatus !== 'ALL' ? formatStatus(selectedStatus) : 'Semua Status';
      const exportDate = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      let excelHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"/>
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Rekap Siswa PKL</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            .header-title { font-size: 16pt; font-weight: bold; color: #1E1B4B; text-align: center; }
            th { background-color: #4338CA; color: #FFFFFF; font-weight: bold; border: 1px solid #94A3B8; padding: 10px; font-size: 11pt; text-align: center; }
            td { border: 1px solid #CBD5E1; padding: 8px; font-size: 10pt; vertical-align: middle; }
            .center { text-align: center; }
            .text-num { mso-number-format:"\\@"; text-align: center; }
            .status-diterima { background-color: #D1FAE5; color: #065F46; font-weight: bold; text-align: center; }
            .status-menunggu { background-color: #FEF3C7; color: #92400E; font-weight: bold; text-align: center; }
            .status-mengajukan { background-color: #DBEAFE; color: #1E40AF; font-weight: bold; text-align: center; }
            .status-belum { background-color: #F1F5F9; color: #475569; font-weight: bold; text-align: center; }
          </style>
        </head>
        <body>
          <table style="width: 100%; margin-bottom: 20px;">
            <tr>
              <td colspan="10" class="header-title">REKAPITULASI PROGRES PENEMPATAN SISWA PKL</td>
            </tr>
            <tr>
              <td colspan="10" style="text-align: center; font-size: 10pt; color: #64748B;">Sistem Informasi Prakerin (SI-ERIN)</td>
            </tr>
            <tr><td colspan="10"></td></tr>
            <tr>
              <td colspan="2"><strong>Tahun Pelajaran:</strong></td>
              <td colspan="3">${academicYearLabel}</td>
              <td colspan="2"><strong>Waktu Ekspor:</strong></td>
              <td colspan="3">${exportDate}</td>
            </tr>
            <tr>
              <td colspan="2"><strong>Filter Kelas:</strong></td>
              <td colspan="3">${classLabel}</td>
              <td colspan="2"><strong>Filter Status:</strong></td>
              <td colspan="3">${statusLabel}</td>
            </tr>
            <tr>
              <td colspan="2"><strong>Total Siswa Terfilter:</strong></td>
              <td colspan="8"><strong>${filteredStudents.length} Siswa</strong> (Diterima: ${stats.diterima}, Menunggu: ${stats.menunggu}, Mengajukan: ${stats.mengajukan}, Belum Mendaftar: ${stats.belumMendaftar})</td>
            </tr>
          </table>

          <table border="1" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="width: 40px;">No</th>
                <th style="width: 100px;">NIS</th>
                <th style="width: 110px;">NISN</th>
                <th style="width: 220px;">Nama Siswa</th>
                <th style="width: 100px;">Kelas</th>
                <th style="width: 180px;">Jurusan</th>
                <th style="width: 120px;">No. Telepon</th>
                <th style="width: 160px;">Status Penempatan PKL</th>
                <th style="width: 240px;">Industri / Instansi Penempatan</th>
                <th style="width: 200px;">Guru Pembimbing</th>
              </tr>
            </thead>
            <tbody>
      `;

      filteredStudents.forEach((s, idx) => {
        const status = s.placement?.status;
        let statusClass = 'status-belum';
        if (DITERIMA.includes(status)) statusClass = 'status-diterima';
        else if (MENUNGGU_BALASAN.includes(status)) statusClass = 'status-menunggu';
        else if (MENGAJUKAN.includes(status)) statusClass = 'status-mengajukan';

        const rowBg = idx % 2 === 1 ? 'style="background-color: #F8FAFC;"' : '';

        excelHtml += `
          <tr ${rowBg}>
            <td class="center">${idx + 1}</td>
            <td class="text-num">${s.nis || '-'}</td>
            <td class="text-num">${s.nisn || '-'}</td>
            <td><strong>${s.name || '-'}</strong></td>
            <td class="center">${s.className || '-'}</td>
            <td>${s.department || '-'}</td>
            <td class="text-num">${s.phone || '-'}</td>
            <td class="${statusClass}">${formatStatus(s.placement?.status)}</td>
            <td>${s.placement?.industry?.name ? `<strong>${s.placement.industry.name}</strong>` : '<em>Belum ada instansi</em>'}</td>
            <td>${s.teacher?.name || '<em>Belum ada pembimbing</em>'}</td>
          </tr>
        `;
      });

      excelHtml += `
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob(['\uFEFF' + excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', getExportFilename('xls'));
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccessMsg(`Berhasil mengekspor ${filteredStudents.length} data siswa ke format Excel!`);
      setTimeout(() => setExportSuccessMsg(''), 4000);
    } catch (err) {
      alert('Terjadi kesalahan saat mengekspor data Excel.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/80 text-slate-900'
    }`}>
      
      {/* HEADER */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center space-x-3">
            <div className="p-3 bg-indigo-600/10 rounded-2xl">
              <BarChart3 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Rekapitulasi Siswa Per Kelas
            </span>
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Pantau progres penempatan PKL siswa berdasarkan tahun pelajaran dan kelas.
          </p>
        </div>

        {/* TOMBOL EKSPOR DATA KE CSV DAN EXCEL */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredStudents.length === 0 || exporting !== null}
            className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            title="Unduh data dalam format Microsoft Excel (.xls)"
          >
            {exporting === 'excel' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            <span>{exporting === 'excel' ? 'Mengekspor...' : 'Ekspor Excel'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredStudents.length === 0 || exporting !== null}
            className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            title="Unduh data dalam format CSV (.csv)"
          >
            {exporting === 'csv' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{exporting === 'csv' ? 'Mengekspor...' : 'Ekspor CSV'}</span>
          </button>
        </div>
      </div>

      {exportSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{exportSuccessMsg}</span>
        </div>
      )}

      {/* FILTER BOX */}
      <div className={`p-6 rounded-2xl border shadow-sm ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Tahun Pelajaran</label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => {
                setSelectedAcademicYear(e.target.value);
                setSelectedClassRoom('ALL');
              }}
              className={`w-full p-2.5 rounded-xl text-sm border focus:ring-2 focus:ring-indigo-500 transition-all ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <option value="ALL">-- Semua Tahun Pelajaran --</option>
              {academicYears.map(ay => (
                <option key={ay.id} value={ay.id}>{ay.year}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Nama Kelas</label>
            <select
              value={selectedClassRoom}
              onChange={(e) => setSelectedClassRoom(e.target.value)}
              className={`w-full p-2.5 rounded-xl text-sm border focus:ring-2 focus:ring-indigo-500 transition-all ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <option value="ALL">-- Semua Kelas --</option>
              {filteredClassRooms.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Status Penempatan PKL</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={`w-full p-2.5 rounded-xl text-sm border focus:ring-2 focus:ring-indigo-500 transition-all ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <option value="ALL">-- Semua Status --</option>
              <option value="BELUM_MENDAFTAR">Belum Mendaftar PKL</option>
              <option value="MENGAJUKAN">Mengajukan PKL</option>
              <option value="MENUNGGU_BALASAN">Menunggu Balasan PKL</option>
              <option value="DITERIMA">Diterima Industri</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Cari Siswa / NIS / Industri</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari nama, NIS, atau industri..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border focus:ring-2 focus:ring-indigo-500 transition-all ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-semibold">{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="font-bold text-slate-500">Memuat rekapitulasi kelas...</p>
        </div>
      ) : (
        <>
          {/* PROGRESS BAR & STATS */}
          <div className={`p-6 rounded-2xl border shadow-sm ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className="font-bold mb-4 text-lg">Statistik Kelas ({stats.total} Siswa)</h3>
            
            <div className="w-full h-6 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner mb-6">
              <div style={{ width: `${stats.pctDiterima}%` }} className="h-full bg-emerald-500 transition-all duration-500" title="Diterima Industri"></div>
              <div style={{ width: `${stats.pctMenunggu}%` }} className="h-full bg-amber-500 transition-all duration-500" title="Menunggu Balasan PKL"></div>
              <div style={{ width: `${stats.pctMengajukan}%` }} className="h-full bg-blue-500 transition-all duration-500" title="Mengajukan PKL"></div>
              <div style={{ width: `${stats.pctBelumMendaftar}%` }} className="h-full bg-slate-300 dark:bg-slate-600 transition-all duration-500" title="Belum Mendaftar PKL"></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 flex flex-col">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Belum Mendaftar</span>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-slate-700 dark:text-slate-300">{stats.belumMendaftar}</span>
                  <span className="text-sm font-medium text-slate-400 mb-1">({stats.pctBelumMendaftar.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="p-4 rounded-xl border bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 flex flex-col">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Mengajukan PKL</span>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-blue-700 dark:text-blue-300">{stats.mengajukan}</span>
                  <span className="text-sm font-medium text-blue-500 mb-1">({stats.pctMengajukan.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="p-4 rounded-xl border bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30 flex flex-col">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Menunggu Balasan</span>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-amber-700 dark:text-amber-300">{stats.menunggu}</span>
                  <span className="text-sm font-medium text-amber-500 mb-1">({stats.pctMenunggu.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="p-4 rounded-xl border bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 flex flex-col">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Diterima Industri</span>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{stats.diterima}</span>
                  <span className="text-sm font-medium text-emerald-500 mb-1">({stats.pctDiterima.toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* TABEL SISWA */}
          <div className={`rounded-2xl border shadow-sm overflow-hidden ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className={`bg-slate-50 dark:bg-slate-800/50 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                  <tr>
                    <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 w-16 text-center">No</th>
                    
                    {/* NIS */}
                    <th 
                      onClick={() => handleSort('nis')}
                      className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-indigo-600 transition-colors"
                      title="Klik untuk mengurutkan NIS"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>NIS</span>
                        {sortField === 'nis' && sortDirection === 'asc' ? (
                          <ArrowUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : sortField === 'nis' && sortDirection === 'desc' ? (
                          <ArrowDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
                        )}
                      </div>
                    </th>

                    {/* Nama Siswa */}
                    <th 
                      onClick={() => handleSort('name')}
                      className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-indigo-600 transition-colors"
                      title="Klik untuk mengurutkan Nama Siswa"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Nama Siswa</span>
                        {sortField === 'name' && sortDirection === 'asc' ? (
                          <ArrowUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : sortField === 'name' && sortDirection === 'desc' ? (
                          <ArrowDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
                        )}
                      </div>
                    </th>

                    {/* Kelas */}
                    <th 
                      onClick={() => handleSort('className')}
                      className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-indigo-600 transition-colors text-center"
                      title="Klik untuk mengurutkan Kelas"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Kelas</span>
                        {sortField === 'className' && sortDirection === 'asc' ? (
                          <ArrowUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : sortField === 'className' && sortDirection === 'desc' ? (
                          <ArrowDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
                        )}
                      </div>
                    </th>

                    {/* Status Terakhir */}
                    <th 
                      onClick={() => handleSort('status')}
                      className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-indigo-600 transition-colors"
                      title="Klik untuk mengurutkan Status"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Status Terakhir</span>
                        {sortField === 'status' && sortDirection === 'asc' ? (
                          <ArrowUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : sortField === 'status' && sortDirection === 'desc' ? (
                          <ArrowDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
                        )}
                      </div>
                    </th>

                    {/* Industri / Instansi Penempatan */}
                    <th 
                      onClick={() => handleSort('industry')}
                      className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-indigo-600 transition-colors"
                      title="Klik untuk mengurutkan Industri / Instansi Penempatan"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Industri / Instansi Penempatan</span>
                        {sortField === 'industry' && sortDirection === 'asc' ? (
                          <ArrowUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : sortField === 'industry' && sortDirection === 'desc' ? (
                          <ArrowDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
                        )}
                      </div>
                    </th>

                    {/* Guru Pembimbing */}
                    <th 
                      onClick={() => handleSort('teacher')}
                      className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-indigo-600 transition-colors"
                      title="Klik untuk mengurutkan Guru Pembimbing"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Guru Pembimbing</span>
                        {sortField === 'teacher' && sortDirection === 'asc' ? (
                          <ArrowUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : sortField === 'teacher' && sortDirection === 'desc' ? (
                          <ArrowDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student, idx) => (
                      <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 text-center font-medium">{idx + 1}</td>
                        <td className="px-6 py-4 font-mono text-xs">{student.nis}</td>
                        <td className="px-6 py-4 font-bold">{student.name}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
                            {student.className}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(student.placement?.status)}`}>
                            {formatStatus(student.placement?.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {student.placement?.industry?.name ? (
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                              {student.placement.industry.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Belum ada instansi</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {student.teacher?.name ? (
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {student.teacher.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Belum ada pembimbing</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        Tidak ada data siswa yang sesuai filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

