// 📋 CHANGELOG:
// ✅ Perubahan: Memperbarui seluruh narasi dan copywriting pada komponen halaman Kelompok Pokja dari "Surat Tugas" menjadi "Surat Permohonan" / "Surat Permohonan ke Industri".
// ✨ Fitur Baru: Precision Wording Alignment for Official Industrial Application Letters with Theme-Adaptive Modal & Live Document Viewer.
// 🎨 UI/UX Update: Wording tombol aksi, status badge, dan modal konfirmasi lebih komunikatif serta konsisten dengan alur tata naskah dinas SMK.
// 🔧 Bug Fix: Penanganan data tangguh (dual-mapping `placements` / `students`) untuk mencegah error rendering saat membaca payload dari `/api/pokja/groups`.
// 🚀 Inovasi: Standardized Enterprise School-to-Industry Letter Workflow Dispatcher.

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, 
  Calendar, 
  Users, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Eye, 
  X, 
  ExternalLink, 
  Loader2, 
  RefreshCw, 
  Search, 
  SendHorizontal, 
  AlertCircle,
  FileCheck2,
  Clock,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

export default function PokjaKelompokPage() {
  const { status } = useSession();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [verifiedGroups, setVerifiedGroups] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Target Kelompok yang akan Diunggah Suratnya
  const [targetGroup, setTargetGroup] = useState<any | null>(null);
  const [suratBase64, setSuratBase64] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  // State Modal Live Preview Dokumen
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [activePreviewTitle, setActivePreviewTitle] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchVerifiedGroups = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/pokja/groups');
      const json = await res.json();

      if (res.ok && json.success) {
        setVerifiedGroups(json.data || []);
      } else {
        setErrorMsg(json.error || 'Gagal memuat kelompok terverifikasi.');
      }
    } catch (err: any) {
      console.error('Error fetching verified groups:', err);
      setErrorMsg('Terjadi kesalahan jaringan saat mengambil data kelompok.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchVerifiedGroups();
    }
  }, [status]);

  // Filter Search berdasarkan Nama Industri, Periode, atau Nama/NIS/Kelas Siswa
  const filteredGroups = useMemo(() => {
    return verifiedGroups.filter((g) => {
      const matchInd = g.industryName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPeriod = g.periodName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const studentsList = g.students || g.placements || [];
      const matchStudent = studentsList.some((p: any) => {
        const studentObj = p.student || p;
        const name = studentObj.name || studentObj.studentName || '';
        const nis = studentObj.nis || '';
        const className = studentObj.className || '';
        return (
          name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
          className.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });

      return matchInd || matchPeriod || matchStudent;
    });
  }, [verifiedGroups, searchTerm]);

  // Handler Pilih File Surat Permohonan PDF/Gambar
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file maksimal adalah 5MB!');
      return;
    }

    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSuratBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Upload Surat Permohonan Kelompok
  const handleUploadSuratGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetGroup || !suratBase64) {
      setErrorMsg('Silakan pilih file Surat Permohonan terlebih dahulu!');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Dapatkan array ID penempatan (placementIds)
    const rawList = targetGroup.placements || targetGroup.students || [];
    const placementIds = rawList.map((p: any) => p.id || p.placementId).filter(Boolean);

    try {
      const res = await fetch('/api/pokja/groups', {
        method: targetGroup.groupId ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: targetGroup.groupId,
          industryId: targetGroup.industryId,
          placementIds: placementIds,
          suratTugasUrl: suratBase64 // Tetap menggunakan key payload universal yang diterima backend
        })
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setSuccessMsg(json.message || `Surat Permohonan ke ${targetGroup.industryName} berhasil diterbitkan!`);
        setTargetGroup(null);
        setSuratBase64('');
        setSelectedFileName('');
        fetchVerifiedGroups();
      } else {
        setErrorMsg(json.error || 'Gagal mengunggah Surat Permohonan.');
      }
    } catch (err: any) {
      console.error('Error uploading group letter:', err);
      setErrorMsg('Terjadi kesalahan koneksi saat mengunggah berkas.');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-screen p-8 flex flex-col justify-center items-center space-y-4 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          Memuat Kelompok Prakerin & Status Surat Permohonan...
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-900'
    }`}>
      
      {/* BANNER HEADER */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all ${
        theme === 'dark' 
          ? 'bg-slate-900 border-slate-800 text-slate-100' 
          : 'bg-white border-slate-200/80 text-slate-900 shadow-slate-200/50'
      }`}>
        <div className="space-y-2">
          <span className={`px-3.5 py-1 rounded-full text-xs font-bold border flex items-center space-x-1.5 w-fit ${
            theme === 'dark'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Kelompok Prakerin Terverifikasi Pokja</span>
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Kelompok Prakerin 👥</h1>
          <p className={`text-sm max-w-2xl font-medium ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Unggah Surat Permohonan resmi ke kelompok siswa yang telah lolos verifikasi agar dapat langsung diunduh oleh siswa dan diserahkan ke pihak industri.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchVerifiedGroups}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer border shadow-sm ${
            theme === 'dark'
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* ALERT NOTIFIKASI */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* SEARCH BAR & FILTER STATISTIK */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari Industri, Periode, atau Nama Siswa..."
            className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all ${
              theme === 'dark' 
                ? 'bg-slate-900 border-slate-800 text-slate-100 focus:border-indigo-500' 
                : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 shadow-sm'
            }`}
          />
        </div>

        <span className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          Total Kelompok Terdaftar: <strong className="text-indigo-600 dark:text-indigo-400">{filteredGroups.length} Kelompok</strong>
        </span>
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
            const hasSurat = Boolean(group.suratTugasUrl);
            const studentList = group.students || group.placements || [];

            return (
              <div
                key={group.groupId || group.groupKey || group.industryId}
                className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200/80 shadow-slate-200/50 hover:border-indigo-200'
                }`}
              >
                {/* HEADER KELOMPOK INDUSTRI */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-inherit pb-5">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <h3 className={`text-xl font-black ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`}>
                        {group.industryName}
                      </h3>
                      {group.periodName && (
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{group.periodName}</span>
                        </span>
                      )}
                    </div>
                    <p className={`text-xs font-medium ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {group.industryAddress || 'Alamat Industri Belum Terdaftar'}
                    </p>
                  </div>

                  {/* STATUS SURAT & TOMBOL AKSI UTAMA DENGAN NARASI PRESISI */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* BADGE STATUS */}
                    <span className={`px-3.5 py-1.5 rounded-2xl text-xs font-extrabold border flex items-center space-x-1.5 ${
                      hasSurat
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                    }`}>
                      {hasSurat ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>Surat Permohonan Diterbitkan</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                          <span>Belum Ada Surat Permohonan</span>
                        </>
                      )}
                    </span>

                    {/* TOMBOL AKSI UTAMA: "UNGGAH SURAT PERMOHONAN KE INDUSTRI" */}
                    <button
                      type="button"
                      onClick={() => {
                        setTargetGroup(group);
                        setSuratBase64('');
                        setSelectedFileName('');
                        fileInputRef.current?.click();
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center space-x-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{hasSurat ? 'Ganti Surat Permohonan' : 'Unggah Surat Permohonan ke Industri'}</span>
                    </button>

                    {hasSurat && (
                      <button
                        type="button"
                        onClick={() => {
                          setActivePreviewUrl(group.suratTugasUrl);
                          setActivePreviewTitle(`Surat Permohonan PKL - ${group.industryName}`);
                        }}
                        className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                            : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                        }`}
                        title="Pratinjau Surat Permohonan"
                      >
                        <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ANGGOTA KELOMPOK SISWA */}
                <div className="space-y-3">
                  <h4 className={`text-xs font-extrabold uppercase tracking-wider flex items-center space-x-1.5 ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Anggota Siswa Kelompok ({studentList.length} Orang):</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {studentList.map((item: any, idx: number) => {
                      const student = item.student || item;
                      return (
                        <div
                          key={item.id || item.placementId || idx}
                          className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                            theme === 'dark'
                              ? 'bg-slate-950/60 border-slate-800'
                              : 'bg-slate-50 border-slate-200/80'
                          }`}
                        >
                          <div className="space-y-1 overflow-hidden">
                            <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 block truncate">
                              {student.name || student.studentName || 'Nama Siswa'}
                            </span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              NIS: {student.nis || '-'} • {student.className || '-'}
                            </p>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block truncate">
                              {student.department || student.departmentName || 'Teknik Komputer dan Jaringan'}
                            </span>
                          </div>

                          <span className={`p-1.5 rounded-xl text-xs shrink-0 ${
                            item.status === 'DISETUJUI_INDUSTRI'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-indigo-500/10 text-indigo-500'
                          }`}>
                            <UserCheck className="w-4 h-4" />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            );
          })
        ) : (
          <div className={`p-12 text-center rounded-3xl border space-y-3 ${
            theme === 'dark' ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            <Users className="w-10 h-10 mx-auto text-slate-400" />
            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Belum Ada Kelompok Prakerin Terdaftar</p>
            <p className="text-xs max-w-md mx-auto">
              Kelompok akan terbentuk secara otomatis setelah siswa mengajukan tempat PKL dan disetujui pada menu Verifikasi Pengajuan Pokja.
            </p>
          </div>
        )}
      </div>

      {/* POP-UP MODAL KONFIRMASI UPLOAD SURAT PERMOHONAN */}
      {targetGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-all ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-6 border-b border-inherit flex justify-between items-center bg-indigo-500/10">
              <h3 className="font-extrabold text-base text-indigo-700 dark:text-indigo-400 flex items-center space-x-2">
                <FileCheck2 className="w-5 h-5" />
                <span>Unggah Surat Permohonan PKL</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setTargetGroup(null);
                  setSuratBase64('');
                  setSelectedFileName('');
                }}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSuratGroup} className="p-6 space-y-6 text-xs">
              <div className="space-y-2">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-indigo-200">
                  Terbitkan Surat Permohonan Resmi Ke Industri Mitra
                </h4>
                <p className="text-slate-600 dark:text-slate-400 text-xs font-medium leading-relaxed">
                  Surat Permohonan PKL yang Anda unggah akan secara otomatis diteruskan ke seluruh anggota kelompok siswa di <strong>{targetGroup.industryName}</strong> untuk diunduh dan diserahkan ke perusahaan.
                </p>
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 font-medium ${
                theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Industri Tujuan:</span>
                  <strong className="text-indigo-900 dark:text-indigo-300">{targetGroup.industryName}</strong>
                </div>
                {selectedFileName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Nama Berkas:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 truncate max-w-[200px]">{selectedFileName}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Jumlah Siswa Penerima:</span>
                  <strong className="text-slate-900 dark:text-slate-200">
                    {(targetGroup.students || targetGroup.placements || []).length} Siswa
                  </strong>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-500 dark:text-slate-400 uppercase">Pilih File Surat Permohonan (PDF / Gambar):</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50 dark:bg-slate-950/40 text-center space-y-2 cursor-pointer transition-all"
                >
                  <FileText className="w-8 h-8 mx-auto text-indigo-600 dark:text-indigo-400" />
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {suratBase64 ? 'File Surat Berhasil Dipilih (Klik untuk mengganti)' : 'Klik di sini untuk memilih Surat Permohonan'}
                  </p>
                  <p className="text-[10px] text-slate-500">Format: PDF, PNG, JPG (Maksimal 5MB)</p>
                </button>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setTargetGroup(null);
                    setSuratBase64('');
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
                  disabled={submitting || !suratBase64}
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

      {/* MODAL LIVE PREVIEW DOKUMEN SURAT PERMOHONAN */}
      {activePreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-5 border-b border-inherit flex justify-between items-center">
              <h3 className="font-bold text-sm text-indigo-600 dark:text-indigo-400 flex items-center space-x-2">
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
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}