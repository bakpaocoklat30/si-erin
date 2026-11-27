'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Camera,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Building2,
  Eye,
  X,
  Briefcase,
  Truck,
  ClipboardCheck,
  Award,
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

type PhotoCategory = 'KEGIATAN' | 'PENERJUNAN' | 'MONITORING' | 'PENARIKAN';

const CATEGORY_META: Array<{
  key: PhotoCategory;
  label: string;
  desc: string;
  icon: any;
  minRequired?: number;
}> = [
  {
    key: 'KEGIATAN',
    label: 'Foto Kegiatan PKL',
    desc: 'Dokumentasi aktivitas kerja/praktik sehari-hari di industri (Wajib minimal 4 foto).',
    icon: Briefcase,
    minRequired: 4,
  },
  {
    key: 'PENERJUNAN',
    label: 'Foto Penerjunan',
    desc: 'Dokumentasi saat pengantaran & serah terima siswa ke pihak industri.',
    icon: Truck,
  },
  {
    key: 'MONITORING',
    label: 'Foto Monitoring',
    desc: 'Dokumentasi saat kunjungan monitoring oleh guru pembimbing sekolah.',
    icon: ClipboardCheck,
  },
  {
    key: 'PENARIKAN',
    label: 'Foto Penarikan',
    desc: 'Dokumentasi saat penjemputan/penarikan selesai PKL bersama pembimbing industri.',
    icon: Award,
  },
];

export default function StudentFotoKegiatanPage() {
  const { status } = useSession();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [student, setStudent] = useState<any>(null);
  const [placement, setPlacement] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<PhotoCategory, number>>({
    KEGIATAN: 0,
    PENERJUNAN: 0,
    MONITORING: 0,
    PENARIKAN: 0,
  });

  const [activeCategory, setActiveCategory] = useState<PhotoCategory>('KEGIATAN');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<any>(null);

  const fetchPhotos = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/students/foto-kegiatan?t=${Date.now()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setStudent(json.data.student);
        setPlacement(json.data.placement);
        setPhotos(json.data.photos || []);
        setCounts(
          json.data.counts || {
            KEGIATAN: 0,
            PENERJUNAN: 0,
            MONITORING: 0,
            PENARIKAN: 0,
          }
        );
      } else {
        setErrorMsg(json.error || 'Gagal memuat galeri foto kegiatan.');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan saat memuat data foto.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPhotos();
    }
  }, [status]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (selectedFiles.length === 0) {
      setErrorMsg('Pilih minimal satu file foto terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('category', activeCategory);
      if (caption.trim()) fd.append('caption', caption.trim());
      selectedFiles.forEach((f) => fd.append('files', f));

      const res = await fetch('/api/students/foto-kegiatan', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setSelectedFiles([]);
        setCaption('');
        setSuccessMsg(json.message || 'Foto berhasil diunggah!');
        await fetchPhotos();
      } else {
        setErrorMsg(json.error || 'Gagal mengunggah foto.');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan saat mengunggah foto.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus foto ini?')) return;
    setDeletingId(id);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/students/foto-kegiatan?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg('Foto berhasil dihapus.');
        await fetchPhotos();
      } else {
        setErrorMsg(json.error || 'Gagal menghapus foto.');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan saat menghapus foto.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs font-bold text-slate-400">Memuat galeri foto PKL...</p>
      </div>
    );
  }

  const activeMeta = CATEGORY_META.find((c) => c.key === activeCategory)!;
  const filteredPhotos = photos.filter((p) => p.category === activeCategory);
  const kegiatanCount = counts.KEGIATAN || 0;
  const minMet = kegiatanCount >= 4;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
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
            <Camera className="w-7 h-7 text-indigo-500" />
            <span>Upload Foto Kegiatan &amp; Dokumentasi PKL</span>
          </h1>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Unggah dokumentasi foto kegiatan PKL (minimal 4 foto kegiatan) serta foto penerjunan, monitoring, dan penarikan.
          </p>
        </div>

        <div
          className={`px-4 py-2 rounded-2xl text-xs font-black border flex items-center space-x-2 shrink-0 ${
            minMet
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
          }`}
        >
          {minMet ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>Foto Kegiatan: {kegiatanCount} / 4 Minimal</span>
        </div>
      </div>

      {!placement ? (
        <div
          className={`p-8 rounded-3xl border text-center space-y-3 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="text-lg font-extrabold">Belum Ada Penempatan PKL</h2>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Menu upload foto kegiatan aktif setelah Anda memiliki penempatan industri PKL.
          </p>
        </div>
      ) : (
        <>
          {/* Kartu Kategori */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CATEGORY_META.map((cat) => {
              const Icon = cat.icon;
              const isSelected = activeCategory === cat.key;
              const count = counts[cat.key] || 0;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.key);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-indigo-600/10 border-indigo-500 ring-2 ring-indigo-500/20'
                      : theme === 'dark'
                      ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`p-2 rounded-xl ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-500/10 text-slate-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                        cat.minRequired
                          ? count >= cat.minRequired
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'bg-amber-500/15 text-amber-500'
                          : 'bg-slate-500/15 text-slate-500 dark:text-slate-300'
                      }`}
                    >
                      {cat.minRequired ? `${count} / ${cat.minRequired}` : `${count} Foto`}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-extrabold">{cat.label}</div>
                    <div className={`text-[11px] mt-0.5 line-clamp-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {cat.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

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

          {/* Form Upload */}
          <form
            onSubmit={handleUpload}
            className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold">{activeMeta.label}</h2>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {activeMeta.desc}
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-500">
                {student?.name} • {placement?.industry?.name}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label
                className={`flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-2xl cursor-pointer hover:border-indigo-500 transition-colors text-center ${
                  theme === 'dark' ? 'border-slate-700 bg-slate-800/40' : 'border-slate-300 bg-slate-50'
                }`}
              >
                <Upload className="w-6 h-6 text-indigo-500 mb-1.5" />
                <span className="text-xs font-bold">
                  {selectedFiles.length > 0
                    ? `${selectedFiles.length} foto dipilih (${selectedFiles.map((f) => f.name).join(', ')})`
                    : `Pilih Foto ${activeMeta.label} (Bisa lebih dari 1)`}
                </span>
                <span className="text-[10px] text-slate-400 mt-1">Format JPG/PNG/WEBP • Maksimal 5 MB per foto</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                />
              </label>

              <div className="flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold">Keterangan Foto (Opsional)</label>
                  <textarea
                    rows={3}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder={`Contoh: Instalasi jaringan LAN di ruang server / Penerjunan bersama pembimbing...`}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-indigo-500 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || selectedFiles.length === 0}
                  className="w-full py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 cursor-pointer transition-all"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>{submitting ? 'Mengunggah...' : `Unggah ke ${activeMeta.label}`}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Galeri Foto Kategori Aktif */}
          <div
            className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold">
                Galeri {activeMeta.label} ({filteredPhotos.length})
              </h3>
            </div>

            {filteredPhotos.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                Belum ada foto yang diunggah pada kategori <strong>{activeMeta.label}</strong>.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredPhotos.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl overflow-hidden border flex flex-col justify-between ${
                      theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div
                      onClick={() => setPreviewPhoto(item)}
                      className="relative aspect-video bg-black/10 overflow-hidden cursor-pointer group"
                    >
                      <img
                        src={item.photoUrl}
                        alt={item.caption || activeMeta.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="p-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">
                          {item.caption || activeMeta.label}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={deletingId === item.id}
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                        title="Hapus Foto"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Preview Foto */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-3xl rounded-3xl overflow-hidden border shadow-2xl ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between p-4 border-b border-inherit">
              <div>
                <h3 className="text-sm font-extrabold">{activeMeta.label}</h3>
                {previewPhoto.caption && (
                  <p className="text-xs text-slate-400">{previewPhoto.caption}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[75vh] overflow-auto flex items-center justify-center bg-black/10">
              <img
                src={previewPhoto.photoUrl}
                alt={previewPhoto.caption || activeMeta.label}
                className="max-w-full max-h-[68vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
