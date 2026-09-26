'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/app/theme-provider';
import { Truck, FileText, CheckCircle2, Search, Loader2, Download, Upload, Eye } from 'lucide-react';

export default function PersuratanSppdPage() {
  const { data: session } = useSession();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Upload modal state
  const [uploadModal, setUploadModal] = useState<{ isOpen: boolean; task: any; type: 'TUGAS' | 'SPPD' | null }>({
    isOpen: false,
    task: null,
    type: null
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/persuratan/sppd');
      const json = await res.json();
      if (json.success) {
        setTasks(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || !uploadModal.task || !uploadModal.type) return;

    setUploading(true);
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('id', uploadModal.task.id);
      formData.append('type', uploadModal.type);

      const res = await fetch('/api/persuratan/sppd/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (res.ok && json.success) {
        alert(`Berhasil mengunggah dokumen ${uploadModal.type}`);
        setUploadModal({ isOpen: false, task: null, type: null });
        setSelectedFile(null);
        fetchTasks();
      } else {
        alert(json.error || 'Gagal mengunggah dokumen');
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan jaringan');
    } finally {
      setUploading(false);
    }
  };

  const filteredTasks = tasks.filter(t => 
    t.industry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.teacher.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Surat Tugas & SPPD (TTE)</h1>
            <p className="text-sm font-medium text-slate-500">Unduh dokumen Word untuk di-TTE, lalu unggah file PDF yang sudah tertanda-tangani.</p>
          </div>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Cari guru atau industri..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2.5 rounded-xl border outline-none text-sm font-semibold w-full md:w-64 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 transition-colors"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-400 mt-4">Memuat data penugasan...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
            <CheckCircle2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">Belum ada antrean penugasan yang menunggu TTE.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTasks.map((task) => (
              <div key={task.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{task.teacher.name}</h3>
                    <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-1">
                      Tujuan: {task.industry.name}
                    </p>
                  </div>
                  <span className={`text-xs font-black px-2.5 py-1 rounded-full ${task.status === 'SELESAI_TTE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'}`}>
                    {task.status === 'SELESAI_TTE' ? 'SELESAI TTE' : 'MENUNGGU TTE'}
                  </span>
                </div>

                <div className="mb-4 text-xs font-semibold text-slate-600 dark:text-slate-400 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <p className="mb-1 text-slate-500">Maksud Perjalanan:</p>
                  <p>{task.purpose}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="space-y-2 border-r border-slate-200 dark:border-slate-800 pr-3">
                    <p className="text-[10px] uppercase font-bold text-slate-400 text-center tracking-wider">Surat Tugas</p>
                    <a
                      href={`/api/pokja/monitoring/${task.id}/download-docx?type=tugas&tte=true`}
                      download
                      className="w-full py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold rounded-xl text-xs flex justify-center items-center gap-2 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh DOCX
                    </a>
                    {task.suratTugasUrl ? (
                      <a href={task.suratTugasUrl} target="_blank" className="w-full py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 font-bold rounded-xl text-xs flex justify-center items-center gap-2">
                        <Eye className="w-3.5 h-3.5" /> Lihat PDF TTE
                      </a>
                    ) : (
                      <button
                        onClick={() => setUploadModal({ isOpen: true, task, type: 'TUGAS' })}
                        className="w-full py-2 border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold rounded-xl text-xs flex justify-center items-center gap-2 transition-all"
                      >
                        <Upload className="w-3.5 h-3.5" /> Unggah PDF TTE
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2 pl-3">
                    <p className="text-[10px] uppercase font-bold text-slate-400 text-center tracking-wider">SPPD</p>
                    <a
                      href={`/api/pokja/monitoring/${task.id}/download-docx?type=sppd&tte=true`}
                      download
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl text-xs flex justify-center items-center gap-2 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh DOCX
                    </a>
                    {task.sppdUrl ? (
                      <a href={task.sppdUrl} target="_blank" className="w-full py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 font-bold rounded-xl text-xs flex justify-center items-center gap-2">
                        <Eye className="w-3.5 h-3.5" /> Lihat PDF TTE
                      </a>
                    ) : (
                      <button
                        onClick={() => setUploadModal({ isOpen: true, task, type: 'SPPD' })}
                        className="w-full py-2 border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold rounded-xl text-xs flex justify-center items-center gap-2 transition-all"
                      >
                        <Upload className="w-3.5 h-3.5" /> Unggah PDF TTE
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {uploadModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold mb-1">Unggah PDF {uploadModal.type}</h2>
            <p className="text-xs text-slate-500 mb-6">Penugasan: {uploadModal.task.teacher.name} ke {uploadModal.task.industry.name}</p>
            
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors mb-6"
            >
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              {selectedFile ? (
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{selectedFile.name}</p>
              ) : (
                <p className="text-sm font-bold text-slate-500">Klik untuk memilih file PDF</p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => {
                  setUploadModal({ isOpen: false, task: null, type: null });
                  setSelectedFile(null);
                }}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={handleUploadSubmit}
                disabled={!selectedFile || uploading}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Unggah Dokumen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
