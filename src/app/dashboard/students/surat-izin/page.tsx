'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FileText, Download, Calendar, ExternalLink, Eye, Upload } from 'lucide-react';

export default function SuratIzinSiswaPage() {
  const { data: session } = useSession();
  const [otherLetters, setOtherLetters] = useState<any[]>([]);
  const [pklDocuments, setPklDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetch('/api/students/surat-izin')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOtherLetters(data.otherLetters || []);
          setPklDocuments(data.pklDocuments || []);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Memuat data surat izin...</div>;
  }

  const renderEmptyState = (title: string, desc: string) => (
    <div className="p-8 rounded-2xl border flex flex-col items-center justify-center text-center bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-800">
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm">
        {desc}
      </p>
    </div>
  );

  const handlePreview = (url: string) => {
    if (url.startsWith('data:')) {
      const arr = url.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } else {
      window.open(url, '_blank');
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const res = await fetch('/api/students/surat-izin', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        alert('Berhasil mengunggah dokumen!');
        window.location.reload();
      } else {
        alert('Gagal mengunggah: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat mengunggah.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Dokumen Persuratan
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Daftar dokumen persuratan yang terkait dengan PKL dan kegiatan lainnya.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b pb-2 dark:border-slate-800">
          Dokumen Surat PKL
        </h2>
        {pklDocuments.length === 0 ? (
          renderEmptyState("Belum Ada Dokumen PKL", "Saat ini belum ada dokumen PKL (Permohonan, Balasan, dll) yang tersedia.")
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {pklDocuments.map((doc, idx) => (
              <div key={idx} className="flex flex-col p-5 rounded-2xl border transition hover:shadow-lg bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    doc.url 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {doc.status}
                  </span>
                </div>
                
                <h3 className="font-bold text-base leading-tight mb-4 flex-1">{doc.type}</h3>
                
                <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                  {doc.url ? (
                    <>
                      <button 
                        onClick={() => handlePreview(doc.url)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/60 dark:text-indigo-300 rounded-xl text-sm font-medium transition"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </button>
                      <button 
                        onClick={() => handleDownload(doc.url, `${doc.type.replace(/\s+/g, '_')}.pdf`)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition"
                      >
                        <Download className="w-4 h-4" />
                        Unduh
                      </button>
                    </>
                  ) : (
                    <>
                      {doc.type === 'Surat Balasan Industri' ? (
                        <label className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 rounded-xl text-sm font-medium transition cursor-pointer ${isUploading ? 'opacity-50 cursor-wait' : ''}`}>
                          <Upload className="w-4 h-4" />
                          {isUploading ? 'Mengunggah...' : 'Unggah Surat'}
                          <input 
                            type="file" 
                            accept=".pdf" 
                            className="hidden" 
                            disabled={isUploading}
                            onChange={(e) => handleUpload(e, doc.type)} 
                          />
                        </label>
                      ) : (
                        <button 
                          disabled
                          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 rounded-xl text-sm font-medium cursor-not-allowed"
                        >
                          Belum Tersedia
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b pb-2 dark:border-slate-800">
          Surat Lain
        </h2>
        {otherLetters.length === 0 ? (
          renderEmptyState("Belum Ada Surat Lain", "Saat ini belum ada dokumen persuratan lain (seperti surat izin kegiatan) untuk Anda.")
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherLetters.map((letter, idx) => (
              <div key={idx} className="flex flex-col p-5 rounded-2xl border transition hover:shadow-lg bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-500/50">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Resmi
                  </span>
                </div>
                
                <h3 className="font-bold text-lg leading-tight mb-2">{letter.eventName}</h3>
                
                <div className="space-y-2 mb-6 flex-1">
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(letter.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} 
                      {' - '}
                      {new Date(letter.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    onClick={() => handlePreview(letter.letterUrl)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 dark:text-purple-300 rounded-xl text-sm font-medium transition"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  <button 
                    onClick={() => handleDownload(letter.letterUrl, `Surat_Izin_${letter.eventName.replace(/\s+/g, '_')}.pdf`)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition"
                  >
                    <Download className="w-4 h-4" />
                    Unduh
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
