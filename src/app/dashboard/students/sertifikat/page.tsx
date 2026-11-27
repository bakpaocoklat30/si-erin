'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Award,
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  X,
  ArrowLeft,
  Lock,
  Building2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

export default function StudentSertifikatPage() {
  const { status } = useSession();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasSuratPenarikan, setHasSuratPenarikan] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [placement, setPlacement] = useState<any>(null);

  const [sertifikatType, setSertifikatType] = useState<'IMAGE' | 'PDF'>('IMAGE');
  const [nilaiAkhirIndustri, setNilaiAkhirIndustri] = useState<string>('');

  // File inputs
  const [depanFile, setDepanFile] = useState<File | null>(null);
  const [belakangFile, setBelakangFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [nilaiFile, setNilaiFile] = useState<File | null>(null);

  // Local preview URLs for newly selected files
  const [depanLocalPreview, setDepanLocalPreview] = useState<string | null>(null);
  const [belakangLocalPreview, setBelakangLocalPreview] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [previewModal, setPreviewModal] = useState<{ url: string; title: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/students/sertifikat?t=${Date.now()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setHasSuratPenarikan(Boolean(json.hasSuratPenarikan));
        setStudent(json.data?.student || null);
        const pl = json.data?.placement || null;
        setPlacement(pl);
        if (pl) {
          if (pl.sertifikatType === 'PDF') setSertifikatType('PDF');
          else if (pl.sertifikatType === 'IMAGE') setSertifikatType('IMAGE');
          if (pl.nilaiAkhirIndustri !== null && pl.nilaiAkhirIndustri !== undefined) {
            setNilaiAkhirIndustri(String(pl.nilaiAkhirIndustri));
          }
        }
      } else {
        setErrorMsg(json.error || 'Gagal memuat data sertifikat.');
      }
    } catch (err: any) {
      setErrorMsg('Terjadi kesalahan jaringan saat memuat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  const handleFilePick = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (f: File | null) => void,
    previewSetter?: (url: string | null) => void
  ) => {
    const file = e.target.files?.[0] || null;
    setter(file);
    if (previewSetter) {
      if (file && file.type.startsWith('image/')) {
        previewSetter(URL.createObjectURL(file));
      } else {
        previewSetter(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const parsedScore = Number(nilaiAkhirIndustri.replace(',', '.'));
    if (!nilaiAkhirIndustri.trim() || isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
      setErrorMsg('Nilai akhir dari industri wajib diisi dengan angka antara 0 hingga 100.');
      return;
    }

    if (sertifikatType === 'IMAGE') {
      const hasDepan = Boolean(depanFile || placement?.sertifikatDepanUrl);
      const hasBelakang = Boolean(belakangFile || placement?.sertifikatBelakangUrl);
      if (!hasDepan || !hasBelakang) {
        setErrorMsg('Harap unggah foto sertifikat bagian depan DAN bagian belakang.');
        return;
      }
    } else {
      const hasPdf = Boolean(pdfFile || placement?.sertifikatPdfUrl);
      if (!hasPdf) {
        setErrorMsg('Harap unggah file PDF sertifikat PKL.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('sertifikatType', sertifikatType);
      fd.append('nilaiAkhirIndustri', String(parsedScore));
      if (sertifikatType === 'IMAGE') {
        if (depanFile) fd.append('depanFile', depanFile);
        if (belakangFile) fd.append('belakangFile', belakangFile);
      } else {
        if (pdfFile) fd.append('pdfFile', pdfFile);
      }
      if (nilaiFile) fd.append('nilaiFile', nilaiFile);

      const res = await fetch('/api/students/sertifikat', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setPlacement(json.data);
        setDepanFile(null);
        setBelakangFile(null);
        setPdfFile(null);
        setNilaiFile(null);
        setDepanLocalPreview(null);
        setBelakangLocalPreview(null);
        setSuccessMsg('Sertifikat PKL dan nilai akhir industri berhasil disimpan!');
      } else {
        setErrorMsg(json.error || 'Gagal menyimpan sertifikat.');
      }
    } catch (err: any) {
      setErrorMsg('Terjadi kesalahan jaringan saat mengunggah berkas.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs font-bold text-slate-400">Memuat status sertifikat PKL...</p>
      </div>
    );
  }

  const isUploaded = Boolean(
    placement &&
      (placement.sertifikatPdfUrl || (placement.sertifikatDepanUrl && placement.sertifikatBelakangUrl)) &&
      placement.nilaiAkhirIndustri !== null &&
      placement.nilaiAkhirIndustri !== undefined
  );

  const depanDisplayUrl = depanLocalPreview || placement?.sertifikatDepanUrl || null;
  const belakangDisplayUrl = belakangLocalPreview || placement?.sertifikatBelakangUrl || null;
  const pdfDisplayUrl = placement?.sertifikatPdfUrl || null;
  const nilaiFileDisplayUrl = placement?.nilaiAkhirFileUrl || null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/dashboard/students"
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-indigo-500 hover:text-indigo-400 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Dashboard</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center space-x-2.5">
            <Award className="w-7 h-7 text-amber-500" />
            <span>Upload Sertifikat &amp; Nilai Akhir PKL</span>
          </h1>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Unggah sertifikat PKL (foto depan &amp; belakang atau PDF) beserta nilai akhir yang diberikan oleh industri mitra.
          </p>
        </div>

        {hasSuratPenarikan && (
          <div
            className={`px-4 py-2 rounded-2xl text-xs font-black border flex items-center space-x-2 shrink-0 ${
              isUploaded
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
            }`}
          >
            {isUploaded ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{isUploaded ? 'Sertifikat & Nilai Tersimpan' : 'Belum Diunggah'}</span>
          </div>
        )}
      </div>

      {!hasSuratPenarikan ? (
        <div
          className={`p-8 rounded-3xl border shadow-xl text-center space-y-4 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-extrabold">Menu Belum Tersedia</h2>
          <p className={`text-sm max-w-md mx-auto ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Fitur unggah sertifikat dan nilai akhir industri hanya terbuka secara otomatis setelah{' '}
            <strong>Surat Penarikan PKL</strong> Anda diterbitkan oleh Tata Usaha.
          </p>
          <Link
            href="/dashboard/students"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </Link>
        </div>
      ) : (
        <>
          {/* Info Industri */}
          {placement?.industry && (
            <div
              className={`p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                theme === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-indigo-50/60 border-indigo-200/70'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">
                    Industri Mitra PKL
                  </div>
                  <div className="text-base font-extrabold">{placement.industry.name}</div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {student?.name} ({student?.nis}) — {student?.className}
                  </div>
                </div>
              </div>
              {placement.sertifikatUploadedAt && (
                <div className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Terakhir diperbarui:{' '}
                  <span className="font-bold">
                    {new Date(placement.sertifikatUploadedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            {/* Pilih Format Sertifikat */}
            <div className="space-y-3">
              <label className="block text-sm font-extrabold">
                1. Pilih Format Upload Sertifikat
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSertifikatType('IMAGE')}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start space-x-3 cursor-pointer ${
                    sertifikatType === 'IMAGE'
                      ? 'bg-indigo-600/10 border-indigo-500 ring-2 ring-indigo-500/20'
                      : theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <ImageIcon className={`w-5 h-5 mt-0.5 shrink-0 ${sertifikatType === 'IMAGE' ? 'text-indigo-500' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-extrabold">Foto Depan &amp; Belakang</div>
                    <div className={`text-[11px] mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Unggah 2 foto (JPG/PNG/WEBP), halaman depan dan halaman belakang sertifikat.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSertifikatType('PDF')}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start space-x-3 cursor-pointer ${
                    sertifikatType === 'PDF'
                      ? 'bg-indigo-600/10 border-indigo-500 ring-2 ring-indigo-500/20'
                      : theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <FileText className={`w-5 h-5 mt-0.5 shrink-0 ${sertifikatType === 'PDF' ? 'text-indigo-500' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-extrabold">File PDF Sertifikat</div>
                    <div className={`text-[11px] mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Unggah 1 dokumen PDF yang sudah menggabungkan halaman depan &amp; belakang.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Area Upload Sertifikat */}
            {sertifikatType === 'IMAGE' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Foto Depan */}
                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold">Foto Sertifikat Depan *</span>
                    {depanDisplayUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewModal({ url: depanDisplayUrl, title: 'Sertifikat Depan' })}
                        className="text-xs font-bold text-indigo-500 hover:text-indigo-400 inline-flex items-center space-x-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat</span>
                      </button>
                    )}
                  </div>
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-indigo-500 transition-colors text-center">
                    <Upload className="w-6 h-6 text-indigo-500 mb-1.5" />
                    <span className="text-xs font-bold">
                      {depanFile ? depanFile.name : placement?.sertifikatDepanUrl ? 'Ganti Foto Depan' : 'Pilih Foto Depan (JPG/PNG)'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Maksimal 5 MB</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleFilePick(e, setDepanFile, setDepanLocalPreview)}
                    />
                  </label>
                  {depanDisplayUrl && (
                    <div className="text-[11px] font-bold text-emerald-500 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{depanFile ? 'Siap diunggah' : 'Sudah tersimpan di server'}</span>
                    </div>
                  )}
                </div>

                {/* Foto Belakang */}
                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold">Foto Sertifikat Belakang *</span>
                    {belakangDisplayUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewModal({ url: belakangDisplayUrl, title: 'Sertifikat Belakang' })}
                        className="text-xs font-bold text-indigo-500 hover:text-indigo-400 inline-flex items-center space-x-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat</span>
                      </button>
                    )}
                  </div>
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-indigo-500 transition-colors text-center">
                    <Upload className="w-6 h-6 text-indigo-500 mb-1.5" />
                    <span className="text-xs font-bold">
                      {belakangFile ? belakangFile.name : placement?.sertifikatBelakangUrl ? 'Ganti Foto Belakang' : 'Pilih Foto Belakang (JPG/PNG)'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Maksimal 5 MB</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleFilePick(e, setBelakangFile, setBelakangLocalPreview)}
                    />
                  </label>
                  {belakangDisplayUrl && (
                    <div className="text-[11px] font-bold text-emerald-500 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{belakangFile ? 'Siap diunggah' : 'Sudah tersimpan di server'}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                className={`p-5 rounded-2xl border space-y-3 ${
                  theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold">File PDF Sertifikat PKL *</span>
                  {pdfDisplayUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewModal({ url: pdfDisplayUrl, title: 'Sertifikat PKL (PDF)' })}
                      className="text-xs font-bold text-indigo-500 hover:text-indigo-400 inline-flex items-center space-x-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat PDF</span>
                    </button>
                  )}
                </div>
                <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-indigo-500 transition-colors text-center">
                  <FileText className="w-7 h-7 text-indigo-500 mb-1.5" />
                  <span className="text-xs font-bold">
                    {pdfFile ? pdfFile.name : pdfDisplayUrl ? 'Ganti File PDF Sertifikat' : 'Pilih File PDF Sertifikat'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Format PDF, Maksimal 10 MB</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => handleFilePick(e, setPdfFile)}
                  />
                </label>
                {(pdfFile || pdfDisplayUrl) && (
                  <div className="text-[11px] font-bold text-emerald-500 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{pdfFile ? 'File PDF siap diunggah' : 'File PDF sudah tersimpan di server'}</span>
                  </div>
                )}
              </div>
            )}

            {/* Nilai Akhir Industri */}
            <div className="space-y-4 pt-2 border-t border-inherit">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <label className="text-sm font-extrabold">2. Nilai Akhir dari Industri</label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold">Nilai Akhir Industri (Angka 0 - 100) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={nilaiAkhirIndustri}
                    onChange={(e) => setNilaiAkhirIndustri(e.target.value)}
                    placeholder="Contoh: 92.5"
                    className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <p className="text-[11px] text-slate-400">
                    Masukkan nilai rata-rata / nilai akhir yang tertera pada sertifikat atau lembar penilaian industri.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold">Lembar Nilai Terpisah (Opsional)</label>
                    {nilaiFileDisplayUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewModal({ url: nilaiFileDisplayUrl, title: 'Lembar Nilai Akhir Industri' })}
                        className="text-xs font-bold text-indigo-500 hover:text-indigo-400 inline-flex items-center space-x-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat</span>
                      </button>
                    )}
                  </div>
                  <label
                    className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer hover:border-indigo-500 transition-colors ${
                      theme === 'dark' ? 'border-slate-700 bg-slate-800/40' : 'border-slate-300 bg-slate-50'
                    }`}
                  >
                    <Upload className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="text-xs font-bold truncate">
                      {nilaiFile
                        ? nilaiFile.name
                        : nilaiFileDisplayUrl
                        ? 'Ganti File Nilai Akhir'
                        : 'Unggah Foto/PDF Nilai (jika terpisah)'}
                    </span>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleFilePick(e, setNilaiFile)}
                    />
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Kosongkan jika nilai sudah tercantum di bagian belakang sertifikat.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-black shadow-lg shadow-indigo-600/30 flex items-center space-x-2 cursor-pointer transition-all"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{submitting ? 'Menyimpan...' : 'Simpan Sertifikat & Nilai Akhir'}</span>
              </button>
            </div>
          </form>
        </>
      )}

      {/* Modal Preview */}
      {previewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-4xl rounded-3xl overflow-hidden border shadow-2xl ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between p-4 border-b border-inherit">
              <h3 className="text-sm font-extrabold">{previewModal.title}</h3>
              <div className="flex items-center space-x-2">
                <a
                  href={previewModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-500 text-xs font-bold inline-flex items-center space-x-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Tab Baru</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewModal(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 max-h-[75vh] overflow-auto flex items-center justify-center bg-slate-950/10">
              {previewModal.url.toLowerCase().endsWith('.pdf') ? (
                <iframe src={previewModal.url} className="w-full h-[65vh] rounded-xl border-0" />
              ) : (
                <img
                  src={previewModal.url}
                  alt={previewModal.title}
                  className="max-w-full max-h-[68vh] object-contain rounded-xl shadow"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
