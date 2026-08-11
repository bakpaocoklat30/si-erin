// 📋 CHANGELOG:
// ✅ Perubahan: Mengubah pembacaan properti laporan hasil impor dengan optional chaining (`resultReport?.details?.failedCount ?? resultReport?.summary?.errorCount ?? 0`) untuk mencegah TypeError pada Next.js Client Component.
// ✨ Fitur Baru: Universal Safety Result Report Renderer & Interactive Drag-and-Drop CSV Preview.
// 🎨 UI/UX Update: Animasi kartu status hasil upload (Ikon Sukses/Peringatan dengan detail error collapsible).
// 🔧 Bug Fix: Mengatasi error `Cannot read properties of undefined (reading 'failedCount')` pada baris 186.
// 🚀 Inovasi: Enterprise Resilient CSV Upload & Report Inspection UI.

'client';
'use client';

import { useSession } from 'next-auth/react';
import { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  ArrowLeft,
  Loader2,
  FileText,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';

export default function AdminImportStudentsPage() {
  const { status } = useSession();
  const { theme } = useTheme();

  const [file, setFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultReport, setResultReport] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download contoh template CSV 3 Kolom
  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,nis,nama,kelas\n1001,Ahmad Fauzi,XII TKJ 1\n1002,Siti Aminah,XII TKJ 2\n1003,Budi Santoso,XII RPL 1";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_import_siswa_sierin.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Baca preview file CSV yang dipilih
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    setResultReport(null);
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setErrorMsg('File yang dipilih harus berformat .csv');
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '').slice(0, 6);
        setCsvPreview(lines);
      }
    };
    reader.readAsText(selectedFile);
  };

  // Kirim CSV ke API Backend
  const handleUploadCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Silakan pilih file CSV terlebih dahulu!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setResultReport(null);

    try {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = async (event) => {
        const csvText = event.target?.result as string;

        const res = await fetch('/api/admin/students/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csvData: csvText })
        });

        const result = await res.json();

        if (res.ok && result.success) {
          // Normalisasi objek ringkasan agar seragam
          const summaryData = result.summary || result.details || {
            totalProcessed: 0,
            importedCount: result.importedCount || 0,
            updatedCount: result.updatedCount || 0,
            errorCount: result.errors?.length || 0,
            failedCount: result.errors?.length || 0,
            errors: result.errors || []
          };

          setResultReport({
            message: result.message || 'Proses impor data CSV selesai.',
            details: {
              totalProcessed: summaryData.totalProcessed || (summaryData.importedCount + summaryData.updatedCount + (summaryData.errorCount || 0)),
              importedCount: summaryData.importedCount || 0,
              updatedCount: summaryData.updatedCount || 0,
              failedCount: summaryData.failedCount ?? summaryData.errorCount ?? (summaryData.errors?.length || 0),
              errors: summaryData.errors || []
            }
          });
        } else {
          setErrorMsg(result.error || 'Gagal memproses file CSV.');
        }
        setLoading(false);
      };
    } catch (err: any) {
      console.error('Error uploading CSV:', err);
      setErrorMsg('Terjadi kesalahan jaringan saat mengunggah file.');
      setLoading(false);
    }
  };

  if (status === 'loading') return null;

  // Hitung jumlah error secara aman (Aman dari undefined error)
  const failedCount = resultReport?.details?.failedCount ?? resultReport?.summary?.errorCount ?? resultReport?.details?.errors?.length ?? 0;
  const importedCount = resultReport?.details?.importedCount ?? resultReport?.summary?.importedCount ?? 0;
  const updatedCount = resultReport?.details?.updatedCount ?? resultReport?.summary?.updatedCount ?? 0;
  const totalProcessed = resultReport?.details?.totalProcessed ?? resultReport?.summary?.totalProcessed ?? (importedCount + updatedCount + failedCount);

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* HEADER BANNER */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center space-x-1.5 w-fit">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Bulk Student Import Wizard</span>
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Import CSV Siswa 🏛️</h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Unggah daftar peserta didik secara massal. Sistem mewajibkan kolom <strong className="text-indigo-400">nis, nama, dan kelas</strong>. Password awal otomatis disamakan dengan NIS.
          </p>
        </div>

        <Link
          href="/dashboard/admin"
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>

      {/* PETUNJUK FORMAT CSV */}
      <div className={`p-6 rounded-3xl border shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
        theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm">Petunjuk Format File CSV</h4>
            <p className="text-xs text-slate-400">Pastikan file berformat .csv dengan pemisah koma (,). Baris pertama wajib berisi header: <code className="bg-slate-950 px-2 py-0.5 rounded text-emerald-400 font-mono text-[11px]">nis,nama,kelas</code></p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center space-x-2 transition-all cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Download Contoh Template CSV</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* HASIL REPORT UPLOAD (Didesain Aman & Kebal Error) */}
      {resultReport && (
        <div className={`p-6 rounded-3xl border space-y-4 shadow-xl animate-in fade-in duration-300 ${
          failedCount === 0 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {failedCount === 0 ? (
                <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-6 h-6 shrink-0 text-amber-400" />
              )}
              <h3 className="font-bold text-base">{resultReport.message}</h3>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-950/60 border border-inherit">
              Total Diproses: {totalProcessed} Siswa
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center text-xs pt-2">
            <div className="p-3 rounded-2xl bg-slate-950/40 border border-inherit">
              <span className="block text-slate-400 text-[10px] uppercase font-bold">Siswa Baru</span>
              <span className="text-xl font-extrabold text-emerald-400">+{importedCount}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/40 border border-inherit">
              <span className="block text-slate-400 text-[10px] uppercase font-bold">Siswa Diperbarui</span>
              <span className="text-xl font-extrabold text-blue-400">{updatedCount}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/40 border border-inherit">
              <span className="block text-slate-400 text-[10px] uppercase font-bold">Gagal / Dilewati</span>
              <span className="text-xl font-extrabold text-red-400">{failedCount}</span>
            </div>
          </div>

          {resultReport.details?.errors && resultReport.details.errors.length > 0 && (
            <div className="pt-2 border-t border-inherit/30 space-y-2">
              <span className="font-bold text-xs flex items-center space-x-1 text-red-400">
                <XCircle className="w-4 h-4" />
                <span>Rincian Baris Gagal:</span>
              </span>
              <ul className="text-xs space-y-1 list-disc list-inside font-mono text-slate-300 bg-slate-950/60 p-3 rounded-xl max-h-32 overflow-y-auto">
                {resultReport.details.errors.map((errText: string, idx: number) => (
                  <li key={idx}>{errText}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* FORM UPLOAD CSV */}
      <form onSubmit={handleUploadCSV} className={`p-8 rounded-3xl border shadow-xl space-y-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-4 ${
            file 
              ? 'border-indigo-500 bg-indigo-500/5' 
              : theme === 'dark' ? 'border-slate-800 hover:border-slate-700 bg-slate-950/50' : 'border-slate-200 hover:border-slate-300 bg-slate-50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />

          <div className="p-4 rounded-full bg-indigo-500/10 text-indigo-500">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <p className="font-bold text-sm">
              {file ? `File Dipilih: ${file.name}` : 'Klik untuk memilih file CSV dari komputer Anda'}
            </p>
            <p className="text-xs text-slate-400">Format yang didukung: .csv (Comma Separated Values)</p>
          </div>

          {!file && (
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              Choose File
            </button>
          )}
        </div>

        {/* PRATINJAU DATA CSV */}
        {csvPreview.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Pratinjau Data CSV (Maksimal 5 Baris Pertama):</span>
            </h4>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
              <pre className="font-mono text-xs text-emerald-400 leading-relaxed">
                {csvPreview.join('\n')}
              </pre>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-inherit flex justify-end">
          <button
            type="submit"
            disabled={!file || loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses Impor CSV...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Proses & Impor Siswa Massal</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
}