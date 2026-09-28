'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/app/theme-provider';
import { Truck, Printer, Search, Loader2, Users, Building2, Calendar, FileText, Upload, SendHorizontal, X, Eye } from 'lucide-react';

export default function SuratPenerjunanPage() {
  const { data: session } = useSession();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'PUBLISHED' | 'ALL'>('PENDING');

  // Upload Modal State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetGroup, setTargetGroup] = useState<any | null>(null);
  const [suratBase64, setSuratBase64] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchAcceptedGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pokja/groups?department=Semua Jurusan');
      const json = await res.json();
      if (json.success) {
        const acceptedStatuses = ['REQUEST_PENGANTARAN', 'MENUNGGU_PEMBERANGKATAN'];
        const acceptedGroups = json.data.filter((group: any) => 
          group.students.some((s: any) => acceptedStatuses.includes(s.status))
        ).map((group: any) => {
          return {
            ...group,
            students: group.students.filter((s: any) => acceptedStatuses.includes(s.status))
          };
        });
        setGroups(acceptedGroups);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcceptedGroups();
  }, []);

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

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetGroup) return;
    if (!suratBase64) {
      setErrorMsg('Silakan pilih berkas (PDF/Gambar)!');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const rawList = targetGroup.students || [];
    const placementIds = rawList.map((p: any) => p.placementId || p.id).filter(Boolean);

    try {
      const res = await fetch('/api/pokja/groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placementIds: placementIds,
          suratPengantaranUrl: suratBase64,
          status: 'MENUNGGU_PEMBERANGKATAN'
        })
      });

      const json = await res.json();
      if (res.ok) {
        setSuccessMsg('Surat Pengantaran berhasil diunggah!');
        setTimeout(() => {
          setTargetGroup(null);
          setSuratBase64('');
          setSelectedFileName('');
          fetchAcceptedGroups();
        }, 1500);
      } else {
        setErrorMsg(json.error || 'Gagal menyimpan surat');
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredGroups = groups.filter(g => {
    const matchSearch = g.industryName.toLowerCase().includes(searchQuery.toLowerCase()) || g.departmentName.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Check status
    const isPending = g.students.some((s: any) => s.status === 'REQUEST_PENGANTARAN');
    const isPublished = g.students.some((s: any) => s.status === 'MENUNGGU_PEMBERANGKATAN');
    
    let matchStatus = true;
    if (statusFilter === 'PENDING') matchStatus = isPending;
    if (statusFilter === 'PUBLISHED') matchStatus = isPublished;

    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Surat Penerjunan</h1>
            <p className="text-sm font-medium text-slate-500">Cetak & Upload surat tugas penerjunan (pengantaran) siswa ke industri.</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === 'PENDING' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Menunggu Pengantaran
            </button>
            <button
              onClick={() => setStatusFilter('PUBLISHED')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === 'PUBLISHED' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Menunggu Pemberangkatan
            </button>
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Cari industri..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border outline-none text-sm font-semibold w-full sm:w-48 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-emerald-500 transition-colors"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,image/*" className="hidden" />

      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-400 mt-4">Memuat data kelompok...</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">Tidak ada kelompok yang sesuai filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredGroups.map((group, idx) => {
            const isPublished = group.students.some((s: any) => s.status === 'MENUNGGU_PEMBERANGKATAN');
            return (
              <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-500" />
                        {group.industryName}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-1">
                        <Users className="w-3 h-3" /> {group.departmentName}
                      </p>
                    </div>
                    
                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border ${isPublished ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                      {isPublished ? 'Menunggu Pemberangkatan' : 'Menunggu Pengantaran'}
                    </span>
                  </div>

                  <div className="mb-6 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> 
                      Jadwal PKL: {group.startDate ? new Date(group.startDate).toLocaleDateString('id-ID') : '-'} s.d. {group.endDate ? new Date(group.endDate).toLocaleDateString('id-ID') : '-'}
                    </p>
                    <ul className="text-xs font-semibold text-slate-500 space-y-1.5 pl-5 list-disc mt-3">
                      {group.students.map((s: any) => (
                        <li key={s.id}>{s.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-auto">
                  <button
                    onClick={() => {
                      const printUrl = `/api/letters/penerjunan?industryId=${group.industryId}&department=${encodeURIComponent(group.departmentName)}&periodId=${group.periodId}`;
                      window.open(printUrl, '_blank');
                    }}
                    className="flex-1 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-400 font-bold rounded-xl text-xs flex justify-center items-center gap-2 transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak DOCX
                  </button>
                  <button
                    onClick={() => {
                      setTargetGroup(group);
                      fileInputRef.current?.click();
                    }}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex justify-center items-center gap-2 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    {isPublished ? 'Ganti Surat' : 'Upload Pengantaran'}
                  </button>
                  
                  {isPublished && group.students[0]?.suratPengantaranUrl && (
                    <button
                      onClick={() => window.open(group.students[0].suratPengantaranUrl, '_blank')}
                      className="p-2.5 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      title="Lihat Surat Pengantaran"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {targetGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20">
              <h3 className="font-extrabold text-base text-indigo-800 dark:text-indigo-400 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Surat Pengantaran
              </h3>
              <button onClick={() => { setTargetGroup(null); setSuratBase64(''); setSelectedFileName(''); }} className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-5">
              <div className="text-center p-6 border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                <FileText className="w-10 h-10 mx-auto text-indigo-500 mb-2" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {suratBase64 ? selectedFileName : 'Pilih dokumen dari tombol sebelumnya'}
                </p>
                {suratBase64 && <p className="text-xs text-emerald-600 mt-1 font-semibold">File siap diunggah</p>}
              </div>

              {errorMsg && <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 text-xs font-bold rounded-xl text-center">{errorMsg}</div>}
              {successMsg && <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 text-xs font-bold rounded-xl text-center">{successMsg}</div>}

              <button
                type="submit"
                disabled={submitting || !suratBase64}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex justify-center items-center gap-2 transition-all disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
                <span>Simpan & Update Status</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
