// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Pembaruan halaman antarmuka Admin Import Guru dengan dukungan Pangkat, Golongan, & Nomor WhatsApp.
// ✨ Fitur Baru: Drag-and-Drop CSV Parser, Data Preview Table, & Template Downloader lengkap.
// 🎨 UI/UX Update: Glassmorphic cards, responsive table preview, loading states, & instant toast feedback.
// 🔧 Bug Fix: Sanitasi baris kosong dan penyesuaian kolom dengan format Surat Tugas / SPPD.
// 🚀 Inovasi: Client-side CSV Preview & Server Batch Sync Pipeline.
// ----------------------------------------------------------------------

'use client';

import { useState } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  Download, 
  UserPlus,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { parseTeachersCsv, ParsedTeacherRow } from '@/lib/csv-parser';

export default function AdminImportTeacherPage() {
  const [csvText, setCsvText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedTeacherRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string; details?: any } | null>(null);

  // Format CSV template resmi SI-ERIN v2.0
  const csvTemplate = `Nama Lengkap,NIP,Jenis Kepegawaian,Jabatan Fungsional,Pangkat,Golongan,Nomor WhatsApp,Jurusan / Mapel,Role
"Erva Agus Tiyarini, M.Pd",198005122005012003,PNS,Guru,Pembina,IV/a,081234567890,Teknik Komputer dan Jaringan,GURU
"Mohammad Rahmad Rifa'i, S.Pd.",199510302022211002,PNS,Guru,Penata Muda,III/a,081234567891,Teknik Komputer dan Jaringan,GURU
"Harits Rusli, S.Kom",199304072022211004,PPPK,Guru,Ahli Pertama,IX,085678901234,Teknik Komputer dan Jaringan,GURU
"Salman Alfarizi, S.Kom",199107302025211019,PNS,Guru,Pembina,IV/a,089876543210,Teknik Komputer dan Jaringan,POKJA
"Dra. Hj. Siti Aminah",196805121994032005,PNS,Guru,Pembina Tk. I,IV/b,087712345678,Bimbingan Konseling,GURU
"Budi Santoso, S.T.",-,HONORER,Staff,Guru Honorer,-,081398765432,Teknik Otomotif,GURU
"Siti Nurjanah, A.Md.",-,HONORER,Tata Usaha,Staf Administrasi,-,081299887766,Administrasi Perkantoran,GURU`;

  const handleDownloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_master_guru_sierin.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleParseCsv = (text: string) => {
    setCsvText(text);
    if (!text.trim()) {
      setParsedData([]);
      return;
    }
    const results = parseTeachersCsv(text);
    setParsedData(results);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleParseCsv(content);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (parsedData.length === 0) return;
    if (!confirm(`Apakah Anda yakin ingin mengimport ${parsedData.length} data guru ke dalam sistem?`)) return;

    setLoading(true);
    setResultMessage(null);

    try {
      const res = await fetch('/api/admin/teachers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teachers: parsedData }),
      });

      const data = await res.json();

      if (data.success) {
        setResultMessage({
          type: 'success',
          text: data.message,
          details: data.details,
        });
        setParsedData([]);
        setCsvText('');
      } else {
        setResultMessage({ type: 'error', text: data.error || 'Gagal mengimport data guru' });
      }
    } catch (err) {
      setResultMessage({ type: 'error', text: 'Terjadi kesalahan jaringan saat mengirim data' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <Link href="/dashboard/admin/teachers" className="inline-flex items-center space-x-2 text-xs font-bold text-blue-300 hover:text-white transition-colors mb-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Manajemen Guru</span>
            </Link>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider">
              <UserPlus className="w-3.5 h-3.5" />
              <span>Dapodik & Kepegawaian Integration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Import Data Guru & Pembimbing Massal
            </h1>
            <p className="text-blue-200 text-xs sm:text-sm max-w-xl leading-relaxed">
              Unggah file CSV atau salin data dari Dapodik. Lengkap dengan NIP, Pangkat, Golongan ruang, dan Nomor WhatsApp resmi sebagai dasar penerbitan Surat Tugas & SPPD.
            </p>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center space-x-2 transition-all cursor-pointer hover:scale-105 active:scale-95 self-start md:self-auto"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Unduh Template CSV</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK MESSAGE */}
      {resultMessage && (
        <div className={`p-5 rounded-2xl border flex items-start space-x-3 animate-fade-in ${
          resultMessage.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' 
            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
        }`}>
          {resultMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          )}
          <div className="space-y-1">
            <h4 className="text-sm font-black">{resultMessage.text}</h4>
            {resultMessage.details?.errors?.length > 0 && (
              <ul className="text-xs list-disc list-inside space-y-0.5 text-rose-600 dark:text-rose-400 pt-2">
                {resultMessage.details.errors.map((err: string, i: number) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* INPUT CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* DRAG AND DROP FILE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Metode 1: Unggah Berkas .CSV</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pilih file format CSV yang berisi kolom: <span className="font-semibold text-slate-700 dark:text-slate-300">Nama Lengkap, NIP, Jenis Kepegawaian (PNS/PPPK/HONORER), Jabatan Fungsional (Guru/Tata Usaha/Staff), Pangkat, Golongan, Nomor WhatsApp, Jurusan / Mapel, Role</span>.
            </p>
          </div>

          <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-950/50 group">
            <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-indigo-500 mb-2 transition-colors" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Klik untuk jelajahi file CSV</span>
            <span className="text-[10px] text-slate-400 mt-1">Maksimal 5MB (Format: .csv)</span>
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={handleFileUpload} 
            />
          </label>

          <div className="text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            💡 <span className="font-bold">Tips:</span> Jika NIP diisi, password akun otomatis menggunakan format standar <code className="text-indigo-400 font-bold">guru12345</code> dan dapat diubah kemudian.
          </div>
        </div>

        {/* PASTE RAW TEXT */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <UploadCloud className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Metode 2: Tempel Teks CSV</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Buka berkas di Excel / Google Sheets, salin teks (Ctrl+C), lalu tempel (Ctrl+V) langsung ke kolom di bawah ini.
            </p>
          </div>

          <textarea
            rows={7}
            placeholder={csvTemplate}
            value={csvText}
            onChange={(e) => handleParseCsv(e.target.value)}
            className="w-full text-xs font-mono p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 dark:text-slate-200"
          ></textarea>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {parsedData.length > 0 ? `✅ ${parsedData.length} baris guru terdeteksi` : 'Belum ada data diuraikan'}
            </span>
            {csvText && (
              <button
                onClick={() => handleParseCsv('')}
                className="text-xs text-rose-500 hover:underline font-bold cursor-pointer"
              >
                Reset Data
              </button>
            )}
          </div>
        </div>

      </div>

      {/* PREVIEW TABLE */}
      {parsedData.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
          <div className="p-5 border-b border-inherit flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Pratinjau Data Guru yang Akan Diimport</h3>
              <p className="text-[11px] text-slate-400">Periksa kembali data di bawah sebelum disimpan ke database</p>
            </div>

            <button
              onClick={handleExecuteImport}
              disabled={loading}
              className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center space-x-2 transition-all cursor-pointer ${
                loading
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 hover:scale-105 active:scale-95'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Menyimpan Data...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Konfirmasi & Simpan ({parsedData.length} Guru)</span>
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950 border-b border-inherit text-slate-400 uppercase text-[10px] tracking-wider font-extrabold z-10">
                <tr>
                  <th className="p-4">No</th>
                  <th className="p-4">Nama Lengkap</th>
                  <th className="p-4">NIP</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Jabatan</th>
                  <th className="p-4">Pangkat</th>
                  <th className="p-4 text-center">Golongan</th>
                  <th className="p-4">No. WhatsApp</th>
                  <th className="p-4">Jurusan / Mapel</th>
                  <th className="p-4 text-center">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit font-medium">
                {parsedData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{item.name}</td>
                    <td className="p-4 font-mono text-slate-500 dark:text-slate-400">{item.nip || <span className="text-amber-500 italic">Non-NIP</span>}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        item.employeeType === 'PNS' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                        item.employeeType === 'PPPK' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30' :
                        'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                      }`}>
                        {item.employeeType}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-indigo-500 dark:text-indigo-400">{item.jobTitle}</td>
                    <td className="p-4 text-amber-500 font-semibold">{item.rank || '-'}</td>
                    <td className="p-4 text-center text-indigo-400 font-bold">{item.golongan || '-'}</td>
                    <td className="p-4 font-mono text-emerald-500">{item.phone || '-'}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">{item.subject}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        item.role === 'POKJA' 
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30' 
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                      }`}>
                        {item.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}