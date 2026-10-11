// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✨ Fitur Baru: Halaman Penugasan Guru Pembimbing (Surat Tugas & SPPD TTE Resmi).
// 🔧 Fitur:
//    - Menampilkan dokumen yang sudah di-TTE oleh Tata Usaha (Penerjunan, Monitoring, Penarikan).
//    - Unduh Surat Tugas TTE & SPPD TTE resmi langsung dalam format PDF kedinasan.
//    - Aksi unggah Laporan Kegiatan / Hasil Monitoring oleh guru pembimbing.
//    - Filter pencarian dan indikator status pengunggahan laporan.
// 🎨 UI/UX: Glassmorphism, Theme-Aware (Dark & Light), responsif & modern.
// ----------------------------------------------------------------------

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/app/theme-provider';
import { 
  FileCheck, FileText, Download, Upload, CheckCircle2, AlertCircle, 
  Search, Building2, Calendar, MapPin, Loader2, ArrowRight, X, 
  ExternalLink, Clock, Sparkles, ShieldCheck, CheckSquare, UploadCloud
} from 'lucide-react';
import Link from 'next/link';

function getAssignmentBadge(purpose?: string | null) {
  const p = (purpose || '').toLowerCase();
  if (p.includes('penerjunan') || p.includes('pengantaran')) {
    return {
      type: 'PENERJUNAN',
      label: 'Penerjunan',
      icon: '🚚',
      badgeClass: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
    };
  }
  if (p.includes('penarikan') || p.includes('penjemputan')) {
    return {
      type: 'PENARIKAN',
      label: 'Penarikan',
      icon: '🎓',
      badgeClass: 'bg-purple-500/10 text-purple-500 border border-purple-500/30'
    };
  }
  return {
    type: 'MONITORING',
    label: 'Monitoring',
    icon: '📋',
    badgeClass: 'bg-blue-500/10 text-blue-500 border border-blue-500/30'
  };
}

export default function TeacherAssignmentsPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Modal Upload Laporan
  const [uploadModal, setUploadModal] = useState<{
    isOpen: boolean;
    assignment: any | null;
  }>({
    isOpen: false,
    assignment: null
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssignments = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/teacher/assignments?t=${timestamp}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setAssignments(json.data || []);
      } else {
        setErrorMsg(json.error || 'Gagal memuat daftar penugasan TTE.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAssignments();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status]);

  const handleOpenUpload = (item: any) => {
    setUploadModal({
      isOpen: true,
      assignment: item
    });
    setSelectedFile(null);
    setUploadSuccess('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        alert('File laporan wajib berformat PDF!');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || !uploadModal.assignment) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('id', uploadModal.assignment.id);
      formData.append('type', 'LAPORAN');

      const res = await fetch('/api/persuratan/sppd/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setUploadSuccess('Laporan kegiatan berhasil diunggah!');
        setTimeout(() => {
          setUploadModal({ isOpen: false, assignment: null });
          setSelectedFile(null);
          setUploadSuccess('');
          fetchAssignments();
        }, 1200);
      } else {
        alert(json.error || 'Gagal mengunggah laporan');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat mengunggah dokumen.');
    } finally {
      setUploading(false);
    }
  };

  const filteredList = useMemo(() => {
    return assignments.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        item.industry?.name?.toLowerCase().includes(q) ||
        item.purpose?.toLowerCase().includes(q) ||
        item.destinationPlace?.toLowerCase().includes(q) ||
        (item.letterNumber && item.letterNumber.toLowerCase().includes(q));

      const bType = getAssignmentBadge(item.purpose).type;
      const matchType = filterType === 'ALL' || bType === filterType;

      return matchSearch && matchType;
    });
  }, [assignments, searchQuery, filterType]);

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-[80vh] p-8 flex flex-col justify-center items-center space-y-4 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          Memuat Dokumen Penugasan TTE...
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-full p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-900'
    }`}>
      
      {/* HEADER BANNER */}
      <div className={`p-8 rounded-3xl border shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' 
          ? 'bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 border-indigo-500/30 text-white' 
          : 'bg-gradient-to-r from-indigo-50 via-white to-white border-indigo-200 text-slate-900 shadow-xl'
      }`}>
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-2 relative z-10">
          <div className={`inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-xs font-semibold border ${
            theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-indigo-100 border-indigo-200 text-indigo-700'
          }`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Dokumen Resmi Kedinasan Ter-TTE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Penugasan <span className="text-indigo-600 dark:text-indigo-400">Guru Pembimbing</span> 📝
          </h1>
          <p className={`text-sm max-w-2xl ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Daftar Surat Tugas dan SPPD yang telah disahkan melalui Tanda Tangan Elektronik (TTE) oleh Kepala Sekolah / Tata Usaha untuk kegiatan monitoring, penerjunan, dan penarikan siswa PKL.
          </p>
        </div>

        <div className="flex items-center space-x-4 relative z-10 bg-indigo-500/10 border border-indigo-500/30 p-4 rounded-2xl shrink-0">
          <FileCheck className="w-8 h-8 text-indigo-500 shrink-0" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Surat Tugas TTE</p>
            <p className="text-2xl font-black text-indigo-500">{assignments.length} <span className="text-xs font-normal">Dokumen</span></p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* FILTER & SEARCH */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 border-inherit">
          <div className="flex flex-wrap items-center gap-2">
            {['ALL', 'MONITORING', 'PENERJUNAN', 'PENARIKAN'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterType === t
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : theme === 'dark'
                    ? 'bg-slate-800 text-slate-400 hover:text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t === 'ALL' ? 'Semua Dokumen' : t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari DUDI, nomor surat tugas..."
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-medium border outline-none transition-all ${
                theme === 'dark' 
                  ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600'
              }`}
            />
          </div>
        </div>

        {/* LIST DOKUMEN PENUGASAN */}
        {filteredList.length === 0 ? (
          <div className="text-center py-14 space-y-3">
            <FileText className="w-12 h-12 text-slate-500 mx-auto opacity-50" />
            <p className="text-sm font-semibold text-slate-400">
              Belum ada surat tugas / SPPD yang diterbitkan (di-TTE) oleh Tata Usaha untuk akun Anda.
            </p>
            <p className="text-xs text-slate-500">
              Dokumen akan otomatis muncul di sini setelah disahkan dan diunggah hasil TTE-nya oleh Bagian Tata Usaha.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {filteredList.map((item) => {
              const badge = getAssignmentBadge(item.purpose);
              const mDate = item.monitoringDate ? new Date(item.monitoringDate).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              }) : '-';

              const hasLaporan = !!item.laporanDownloadUrl;

              return (
                <div
                  key={item.id}
                  className={`p-6 rounded-2xl border transition-all space-y-4 ${
                    theme === 'dark' 
                      ? 'bg-slate-950/60 border-slate-800 hover:border-indigo-500/40' 
                      : 'bg-slate-50/80 border-slate-200 hover:border-indigo-500/40 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1.5 ${badge.badgeClass}`}>
                        <span>{badge.icon}</span>
                        <span>{badge.label}</span>
                      </span>

                      <span className="text-xs font-mono text-slate-400">
                        {item.letterNumber || 'Nomor Belum Terisi'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{mDate}</span>
                    </div>
                  </div>

                  {/* KONTEN DUDI & TUJUAN */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Instansi / Mitra Tujuan:</p>
                      <h3 className="text-base font-extrabold flex items-center space-x-2 text-slate-900 dark:text-white">
                        <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span>{item.industry?.name || item.destinationPlace}</span>
                      </h3>
                      {item.industry?.address && (
                        <p className="text-xs text-slate-400 flex items-center space-x-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{item.industry.address}</span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Maksud Penugasan:</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {item.purpose || 'Melaksanakan kegiatan monitoring dan pembimbingan peserta PKL'}
                      </p>
                      {item.transportType && (
                        <p className="text-[11px] text-slate-400 font-mono">
                          Transportasi: {item.transportType}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* DOKUMEN DOWNLOAD & STATUS LAPORAN */}
                  <div className="pt-4 border-t border-inherit flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    {/* DOKUMEN TTE YANG BISA DIUNDUH */}
                    <div className="flex flex-wrap items-center gap-2">
                      {item.suratTugasDownloadUrl && (
                        <a
                          href={item.suratTugasDownloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center space-x-1.5 shadow-sm shadow-indigo-600/30"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh Surat Tugas TTE</span>
                        </a>
                      )}

                      {item.sppdDownloadUrl && (
                        <a
                          href={item.sppdDownloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center space-x-1.5 shadow-sm shadow-emerald-600/30"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh SPPD TTE</span>
                        </a>
                      )}

                      {hasLaporan && (
                        <a
                          href={item.laporanDownloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600/30 transition-all flex items-center space-x-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Lihat Laporan Unggahan</span>
                        </a>
                      )}
                    </div>

                    {/* STATUS LAPORAN & TOMBOL UPLOAD */}
                    <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
                      {hasLaporan ? (
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Laporan Sudah Diunggah</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          <Clock className="w-4 h-4" />
                          <span>Menunggu Laporan</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenUpload(item)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                          hasLaporan
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                        }`}
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>{hasLaporan ? 'Unggah Ulang Laporan' : 'Upload Laporan'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL UPLOAD LAPORAN */}
      {uploadModal.isOpen && uploadModal.assignment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-extrabold flex items-center space-x-2">
                  <UploadCloud className="w-5 h-5 text-indigo-500" />
                  <span>Unggah Laporan Hasil Penugasan</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Kegiatan ke {uploadModal.assignment.industry?.name || 'Industri'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUploadModal({ isOpen: false, assignment: null })}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-sm font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>{uploadSuccess}</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                    selectedFile
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : theme === 'dark'
                      ? 'border-slate-700 hover:border-indigo-500/50 bg-slate-950/60'
                      : 'border-slate-300 hover:border-indigo-500/50 bg-slate-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 text-indigo-500 mb-2" />
                  {selectedFile ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-indigo-400">{selectedFile.name}</p>
                      <p className="text-xs text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-300">Klik untuk memilih file PDF laporan</p>
                      <p className="text-[11px] text-slate-500">Maksimal 15 MB (Format PDF)</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setUploadModal({ isOpen: false, assignment: null })}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={!selectedFile || uploading}
                    onClick={handleUploadSubmit}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center space-x-2 shadow-md shadow-indigo-600/30 cursor-pointer"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Simpan Laporan</span>
                      </>
                    )}
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

