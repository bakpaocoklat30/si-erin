// 📋 CHANGELOG:
// ✅ Perubahan: Menyederhanakan tombol aksi verifikasi Pokja menjadi 2 tombol utama: "Verifikasi Ajuan, Proses Pembuatan Surat" dan "Tolak Ajuan".
// ✨ Fitur Baru: Focused Dual-Action Approval Dock, Grouped Industry-Period Card Matrix, & Live Student Document Lightbox.
// 🎨 UI/UX Update: Micro-animations, theme-adaptive dark/light mode, status badges, & floating action dock.
// 🔧 Bug Fix: Otomatis menyembunyikan siswa yang sudah diverifikasi agar langsung berpindah ke menu Kelompok Prakerin.
// 🚀 Inovasi: Clean Focused Verification Center.

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, 
  Square, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  Calendar, 
  Search, 
  Eye, 
  FileText, 
  X, 
  ExternalLink, 
  Loader2, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  FileCheck2,
  SendHorizontal,
  Layers
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

export default function PokjaVerifikasiPage() {
  const { status } = useSession();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [groupedData, setGroupedData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // State Array ID Pengajuan Siswa yang Dicentang
  const [selectedPlacementIds, setSelectedPlacementIds] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // State Lightbox Modal Preview Dokumen
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [activePreviewTitle, setActivePreviewTitle] = useState<string>('');

  const fetchGroupedPlacements = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/pokja/placements/bulk');
      const json = await res.json();

      if (res.ok && json.success) {
        setGroupedData(json.data || []);
        
        const initialExpand: Record<string, boolean> = {};
        (json.data || []).forEach((g: any) => {
          initialExpand[g.groupKey] = true;
        });
        setExpandedGroups(initialExpand);
      } else {
        setErrorMsg(json.error || 'Gagal memuat data verifikasi pengajuan.');
      }
    } catch (err: any) {
      console.error('Error fetching grouped placements:', err);
      setErrorMsg('Terjadi kesalahan jaringan saat mengambil data verifikasi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchGroupedPlacements();
    }
  }, [status]);

  const toggleGroupExpand = (groupKey: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const filteredGroupedData = useMemo(() => {
    return groupedData.map(group => {
      const filteredPlacements = group.placements.filter((p: any) => {
        const matchName = p.student?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchNis = p.student?.nis?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchDept = p.student?.department?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchInd = group.industryName?.toLowerCase().includes(searchTerm.toLowerCase());

        return matchName || matchNis || matchDept || matchInd;
      });

      return { ...group, placements: filteredPlacements };
    }).filter(group => group.placements.length > 0);
  }, [groupedData, searchTerm]);

  const handleSelectIndividual = (id: string) => {
    setSelectedPlacementIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectGroupAll = (groupPlacements: any[]) => {
    const groupIds = groupPlacements.map((p: any) => p.id);
    const isAllSelected = groupIds.every(id => selectedPlacementIds.includes(id));

    if (isAllSelected) {
      setSelectedPlacementIds(prev => prev.filter(id => !groupIds.includes(id)));
    } else {
      setSelectedPlacementIds(prev => Array.from(new Set([...prev, ...groupIds])));
    }
  };

  const handleSelectMasterAll = () => {
    const allVisibleIds = filteredGroupedData.flatMap(g => g.placements.map((p: any) => p.id));
    const isMasterAllSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedPlacementIds.includes(id));

    if (isMasterAllSelected) {
      setSelectedPlacementIds([]);
    } else {
      setSelectedPlacementIds(allVisibleIds);
    }
  };

  // Eksekusi Verifikasi
  const handleBulkAction = async (targetStatus: 'PEMBUATAN_SURAT' | 'DITOLAK_INDUSTRI') => {
    if (selectedPlacementIds.length === 0) {
      setErrorMsg('Pilih minimal satu siswa untuk diverifikasi!');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/pokja/placements/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placementIds: selectedPlacementIds,
          targetStatus
        })
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setSuccessMsg(json.message);
        setSelectedPlacementIds([]);
        fetchGroupedPlacements();
      } else {
        setErrorMsg(json.error || 'Gagal memproses verifikasi.');
      }
    } catch (err: any) {
      console.error('Error executing bulk action:', err);
      setErrorMsg('Terjadi kesalahan koneksi saat memproses verifikasi.');
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
        <p className="text-sm font-semibold text-slate-400">Memuat Ajuan Masuk Pokja...</p>
      </div>
    );
  }

  const allVisibleIds = filteredGroupedData.flatMap(g => g.placements.map((p: any) => p.id));
  const isMasterAllSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedPlacementIds.includes(id));

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* BANNER HEADER */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center space-x-1.5 w-fit">
            <Layers className="w-3.5 h-3.5" />
            <span>Pusat Verifikasi Ajuan Masuk</span>
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Verifikasi Ajuan Prakerin 📋</h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Verifikasi ajuan siswa berdasarkan kelompok **Industri & Periode**. Ajuan yang diverifikasi akan secara otomatis masuk ke menu **Kelompok Prakerin**.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchGroupedPlacements}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer shadow-md"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* ALERT NOTIFIKASI */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className={`p-6 rounded-3xl border shadow-lg flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 ${
        theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <button
          type="button"
          onClick={handleSelectMasterAll}
          className={`px-4 py-3 rounded-2xl border text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
            isMasterAllSelected
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          {isMasterAllSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          <span>{isMasterAllSelected ? 'Batal Centang Semua Halaman' : 'Centang Semua Siswa di Halaman'}</span>
        </button>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari Siswa, NIS, Industri, atau Periode..."
            className={`w-full pl-11 pr-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all ${
              theme === 'dark' ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
            }`}
          />
        </div>
      </div>

      {/* LIST KARTU KELOMPOK PENGAJUAN */}
      <div className="space-y-6">
        {filteredGroupedData.length > 0 ? (
          filteredGroupedData.map((group) => {
            const isExpanded = expandedGroups[group.groupKey] ?? true;
            const groupPlacements = group.placements;
            const groupIds = groupPlacements.map((p: any) => p.id);
            const isGroupAllSelected = groupIds.length > 0 && groupIds.every(id => selectedPlacementIds.includes(id));
            const selectedInGroupCount = groupIds.filter(id => selectedPlacementIds.includes(id)).length;

            return (
              <div
                key={group.groupKey}
                className={`rounded-3xl border shadow-xl overflow-hidden transition-all ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                {/* HEADER KELOMPOK */}
                <div className={`p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors ${
                  theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
                }`}>
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={() => handleSelectGroupAll(groupPlacements)}
                      className="p-1.5 rounded-xl hover:bg-indigo-500/10 text-indigo-400 transition-all cursor-pointer"
                      title="Centang Seluruh Siswa di Kelompok Ini"
                    >
                      {isGroupAllSelected ? (
                        <CheckSquare className="w-5 h-5 text-indigo-500" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-500" />
                      )}
                    </button>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                        <h3 className="font-extrabold text-base text-indigo-400">{group.industryName}</h3>
                        <span className="px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{group.periodName}</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{group.industryAddress}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 self-end md:self-auto text-xs">
                    <span className="text-slate-400 font-semibold">
                      Terpilih: <strong className="text-indigo-400">{selectedInGroupCount}</strong>/{groupPlacements.length} Siswa
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleGroupExpand(group.groupKey)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* TABEL ANGGOTA SISWA */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className={`border-b text-[10px] uppercase font-bold tracking-wider ${
                        theme === 'dark' ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}>
                        <tr>
                          <th className="p-4 pl-6 w-12 text-center">Pilih</th>
                          <th className="p-4">Siswa</th>
                          <th className="p-4">Kelas & Jurusan</th>
                          <th className="p-4">Berkas Syarat (CV & BPJS)</th>
                          <th className="p-4 pr-6 text-center">Pratinjau</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-inherit">
                        {groupPlacements.map((p: any) => {
                          const isSelected = selectedPlacementIds.includes(p.id);

                          return (
                            <tr
                              key={p.id}
                              className={`transition-colors ${isSelected ? 'bg-indigo-500/10' : 'hover:bg-indigo-500/5'}`}
                            >
                              <td className="p-4 pl-6 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleSelectIndividual(p.id)}
                                  className="p-1 rounded-lg hover:bg-indigo-500/10 transition-all cursor-pointer"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-indigo-400" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-600" />
                                  )}
                                </button>
                              </td>

                              <td className="p-4 font-semibold">
                                <div className="font-bold text-sm text-indigo-300">{p.student?.name}</div>
                                <div className="text-[11px] text-slate-400 font-mono">NIS: {p.student?.nis}</div>
                              </td>

                              <td className="p-4">
                                <div className="font-bold">{p.student?.className}</div>
                                <div className="text-[11px] text-slate-400">{p.student?.department}</div>
                              </td>

                              <td className="p-4">
                                <div className="flex items-center space-x-2">
                                  {p.student?.cvUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActivePreviewUrl(p.student.cvUrl);
                                        setActivePreviewTitle(`CV - ${p.student.name}`);
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold transition-all cursor-pointer"
                                    >
                                      CV
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 italic">No CV</span>
                                  )}

                                  {p.student?.bpjsUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActivePreviewUrl(p.student.bpjsUrl);
                                        setActivePreviewTitle(`BPJS - ${p.student.name}`);
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold transition-all cursor-pointer"
                                    >
                                      BPJS
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 italic">No BPJS</span>
                                  )}
                                </div>
                              </td>

                              <td className="p-4 pr-6 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleSelectIndividual(p.id)}
                                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                                  title="Pilih Siswa Ini"
                                >
                                  <Eye className="w-4 h-4 text-indigo-400" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center text-slate-400 rounded-3xl border border-slate-800 bg-slate-900/40">
            Tidak ada ajuan prakerin baru yang perlu diverifikasi saat ini.
          </div>
        )}
      </div>

      {/* FLOATING ACTION DOCK (HANYA 2 TOMBOL SESUAI INSTRUKSI) */}
      {selectedPlacementIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="p-4 rounded-3xl bg-slate-900/95 border border-indigo-500/40 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <span className="px-3.5 py-1.5 rounded-full bg-indigo-600 text-white font-extrabold text-xs">
              {selectedPlacementIds.length} Siswa Dicentang
            </span>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              {/* TOMBOL 1: VERIFIKASI AJUAN & PROSES PEMBUATAN SURAT */}
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleBulkAction('PEMBUATAN_SURAT')}
                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-5 rounded-2xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verifikasi Ajuan, Proses Pembuatan Surat</span>
                  </>
                )}
              </button>

              {/* TOMBOL 2: TOLAK AJUAN */}
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleBulkAction('DITOLAK_INDUSTRI')}
                className="flex-1 sm:flex-none bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-2xl transition-all shadow-lg shadow-red-600/30 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Tolak Ajuan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LIVE PREVIEW DOKUMEN */}
      {activePreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-5 border-b border-inherit flex justify-between items-center">
              <h3 className="font-bold text-sm text-indigo-400 flex items-center space-x-2">
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
                <iframe src={activePreviewUrl} className="w-full h-[550px] rounded-2xl border border-slate-800" title="PDF Preview" />
              ) : (
                <img src={activePreviewUrl} alt="Preview" className="max-w-full max-h-[550px] object-contain rounded-2xl border border-slate-800 shadow-lg" />
              )}
            </div>

            <div className="p-4 border-t border-inherit flex justify-end space-x-3">
              <a
                href={activePreviewUrl}
                download="berkas_prakerin_sierin"
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
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
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