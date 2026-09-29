'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/app/theme-provider';
import { Truck, Printer, Search, Loader2, Users, Building2, Calendar, FileText, Upload, SendHorizontal, X, Eye } from 'lucide-react';

export default function SuratPenarikanPage() {
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
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [docxPreviewGroup, setDocxPreviewGroup] = useState<any>(null);
  const [promptAction, setPromptAction] = useState<'preview' | 'cetak' | 'bulk' | null>(null);
  const [promptGroup, setPromptGroup] = useState<any>(null);
  const [promptNomor, setPromptNomor] = useState('');

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptNomor.trim()) {
      alert('Nomor Surat wajib diisi!');
      return;
    }
    
    if (promptAction === 'preview' && promptGroup) {
      setDocxPreviewGroup({ ...promptGroup, inputNomor: promptNomor });
      setPromptAction(null);
      setPromptGroup(null);
    } else if (promptAction === 'cetak' && promptGroup) {
      const printUrl = `/api/letters/penarikan?industryId=${promptGroup.industryId}&department=${encodeURIComponent(promptGroup.departmentName)}&periodId=${promptGroup.periodId}&nomorSurat=${encodeURIComponent(promptNomor)}`;
      window.open(printUrl, '_blank');
      setPromptAction(null);
      setPromptGroup(null);
      setPromptNomor('');
    } else if (promptAction === 'bulk') {
      executeBulkDownload(promptNomor);
      setPromptAction(null);
      setPromptNomor('');
    }
  };

  const executeBulkDownload = async (nomorSurat: string) => {
    try {
      const selectedData = filteredGroups.filter(g => selectedGroupIds.includes(g.groupId || (g.industryId + g.departmentName)));
      const res = await fetch(`/api/letters/penarikan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: selectedData, nomorSurat })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const link = document.createElement('a');
        link.href = json.data;
        link.download = `Bulk_Surat_Penarikan.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Gagal mengunduh dokumen: ' + json.error);
      }
    } catch (e) {
      alert('Error saat mengunduh dokumen gabungan');
    }
  };
  
  
  const generatePenarikanHtml = (g: any) => {
    const students = g.students || [];
    const endDate = students[0]?.endDate ? new Date(students[0].endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric'}) : '[Tanggal Selesai]';
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric'});
    const deptLabel = g.departmentName || 'Teknik Komputer dan Jaringan';
    
    return `
      <div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: black; max-width: 100%; word-wrap: break-word;">
        <!-- KOP SURAT -->
        <div style="text-align: center; border-bottom: 3px solid black; padding-bottom: 10px; margin-bottom: 20px;">
          <div style="font-size: 14pt;">PEMERINTAH PROVINSI JAWA TENGAH</div>
          <div style="font-size: 14pt;">DINAS PENDIDIKAN</div>
          <div style="font-size: 16pt; font-weight: bold;">SEKOLAH MENENGAH KEJURUAN NEGERI 1 ADIWERNA</div>
          <div style="font-size: 10pt;">Jl. Raya 2 PO BOX 24 Adiwerna, Kabupaten Tegal, Jawa Tengah Kode Pos 52194</div>
          <div style="font-size: 10pt;">Telepon (0283) 443768, Fax. (0283) 445494</div>
          <div style="font-size: 10pt;">Laman <span style="text-decoration: underline;">https://smkn1adw.sch.id</span> Pos-el: mail@smkn1adw.sch.id</div>
        </div>

        <!-- HEADER SURAT -->
        <table style="width: 100%; border: none;">
          <tr>
            <td style="width: 60%; vertical-align: top;">
              <div>Nomor&nbsp;&nbsp;&nbsp;: ${g.inputNomor || '...............'}</div>
              <div>Lamp.&nbsp;&nbsp;&nbsp;: -</div>
              <div>Hal&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <b><i><span style="text-decoration: underline;">Penarikan Siswa/Siswi Praktik</span></i></b></div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b><i><span style="text-decoration: underline;">Kerja Lapangan (PKL)</span></i></b></div>
            </td>
            <td style="width: 40%; text-align: right; vertical-align: top;">
              Adiwerna, ${today}
            </td>
          </tr>
        </table>

        <!-- TUJUAN -->
        <div style="margin-top: 30px; margin-left: 50%;">
          Kepada Yth. Pimpinan<br/>
          <b>${g.industryName || 'Perusahaan'}</b><br/>
          ${g.industryAddress || 'Alamat Perusahaan'}<br/>
          di<br/>
          &nbsp;&nbsp;&nbsp;Tempat
        </div>

        <!-- ISI SURAT -->
        <div style="margin-top: 25px; text-indent: 40px;">
          Dengan hormat,
        </div>
        <div style="text-align: justify; text-indent: 40px; margin-top: 5px;">
          Menindaklanjuti pelaksanaan kegiatan Praktik Kerja Lapangan (PKL) peserta didik kelas XII untuk Konsentrasi Keahlian ${deptLabel} tahun pelajaran 2025/2026 telah berjalan di <b>${g.industryName}</b> yang Bapak/Ibu pimpin.
        </div>
        <div style="text-align: justify; text-indent: 40px; margin-top: 5px;">
          Selanjutnya kami sampaikan penghargaan dan terimakasih atas kesempatan yang telah diberikan kepada siswa/siswi kami yang telah melaksanakan kegiatan PKL di <b>${g.industryName}</b>, sehingga kegiatan ini dapat terlaksana sebagaimana mestinya. Apabila selama pelaksanaan PKL ada hal-hal yang kurang berkenan kami mohon maaf sebesar-besarnya. Kami harap, kerjasama yang telah terjalin dengan baik selama ini dapat terus berlangsung, sehingga untuk periode yang akan datang siswa/siswi kami dapat melaksanakan kegiatan PKL di <b>${g.industryName}</b>.
        </div>
        <div style="text-align: justify; text-indent: 40px; margin-top: 5px;">
          Sebagai tambahan informasi pelaksanaan PKL akan berakhir di tanggal <b>${endDate}</b> sesuai dengan surat permohonan yang sebelumnya kami ajukan. Apabila dalam kegiatan PKL ini, Perusahaan dirasa perlu menambah durasi waktu pelaksanaan kami pihak sekolah mengizinkan siswa/siswa untuk diperpanjang sesuai dengan kebutuhan dari Perusahaan dan mohon untuk dibuatkan surat pemberitahuannya kepada kami dengan menghubungi nomor WhatsApp [No HP] a.n [Nama Pokja] selaku Pokja PKL ${deptLabel} SMKN 1 Adiwerna, atau dapat melalui alamat surel <span style="text-decoration: underline;">tkj@smkn1adw.sch.id</span>.
        </div>
        <div style="text-align: justify; text-indent: 40px; margin-top: 15px;">
          Demikian surat ini kami sampaikan, atas perhatian dan kerjasamanya disampaikan terimakasih.
        </div>

        <!-- TTD -->
        <div style="margin-top: 40px; text-align: center; float: right; width: 300px;">
          <div>Kepala Sekolah,</div>
          <br/><br/><br/>
          <div><b><span style="text-decoration: underline;">${nama_pengirim}</span></b></div>
          <div>NIP ${nip_pengirim}</div>
        </div>
        <div style="clear: both;"></div>
      </div>
    `;
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroupIds(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]);
  };
  const toggleAllGroups = (currentGroupIds: string[]) => {
    if (selectedGroupIds.length === currentGroupIds.length) {
      setSelectedGroupIds([]);
    } else {
      setSelectedGroupIds(currentGroupIds);
    }
  };
  const handleBulkDownload = () => {
    setPromptAction('bulk');
    setPromptNomor('');
  };

  const fetchAcceptedGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pokja/groups?department=Semua Jurusan');
      const json = await res.json();
      if (json.success) {
        const acceptedStatuses = ['REQUEST_PENARIKAN', 'MENUNGGU_PENARIKAN'];
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
          suratPenarikanUrl: suratBase64,
          status: 'MENUNGGU_PENARIKAN'
        })
      });

      const json = await res.json();
      if (res.ok) {
        setSuccessMsg('Surat Penarikan berhasil diunggah!');
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
    const isPending = g.students.some((s: any) => s.status === 'REQUEST_PENARIKAN');
    const isPublished = g.students.some((s: any) => s.status === 'MENUNGGU_PENARIKAN');
    
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
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Surat Penarikan</h1>
            <p className="text-sm font-medium text-slate-500">Cetak & Upload surat tugas penarikan (penarikan) siswa ke industri.</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === 'PENDING' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Menunggu Penarikan
            </button>
            <button
              onClick={() => setStatusFilter('PUBLISHED')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === 'PUBLISHED' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Menunggu Penarikan
            </button>
          </div>
          
          <div className="flex items-center space-x-3 mr-2">
            <label className="flex items-center space-x-2 cursor-pointer bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl">
              <input
                type="checkbox"
                checked={selectedGroupIds.length === filteredGroups.length && filteredGroups.length > 0}
                onChange={() => toggleAllGroups(filteredGroups.map(g => g.groupId || (g.industryId + g.departmentName)))}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih Semua</span>
            </label>
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
            const isPublished = group.students.some((s: any) => s.status === 'MENUNGGU_PENARIKAN');
            return (
              <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedGroupIds.includes(group.groupId || (group.industryId + group.departmentName))}
                          onChange={() => toggleGroupSelection(group.groupId || (group.industryId + group.departmentName))}
                          className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer transition-transform hover:scale-110"
                        />
                        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-emerald-500" />
                          {group.industryName}
                        </h3>
                      </div>
                      <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-1">
                        <Users className="w-3 h-3" /> {group.departmentName}
                      </p>
                    </div>
                    
                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border ${isPublished ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                      {isPublished ? 'Menunggu Penarikan' : 'Menunggu Penarikan'}
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
                      onClick={() => { setPromptAction('preview'); setPromptGroup(group); setPromptNomor(''); }}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs flex justify-center items-center gap-2 transition-all cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      Preview
                    </button>
                    <button
                      onClick={() => { setPromptAction('cetak'); setPromptGroup(group); setPromptNomor(''); }}
                      className="flex-1 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-400 font-bold rounded-xl text-xs flex justify-center items-center gap-2 transition-all cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      Cetak
                    </button>
                  <button
                    onClick={() => {
                      setTargetGroup(group);
                      fileInputRef.current?.click();
                    }}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex justify-center items-center gap-2 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    {isPublished ? 'Ganti Surat' : 'Upload Penarikan'}
                  </button>
                  
                  {isPublished && group.students[0]?.suratPenarikanUrl && (
                    <button
                      onClick={() => window.open(group.students[0].suratPenarikanUrl, '_blank')}
                      className="p-2.5 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      title="Lihat Surat Penarikan"
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
                Upload Surat Penarikan
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
    
      
      {docxPreviewGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="p-5 border-b border-inherit flex justify-between items-center">
              <h3 className="font-bold text-sm text-indigo-600 dark:text-indigo-400 flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Preview DOCX - {docxPreviewGroup.industryName}</span>
              </h3>
              <button onClick={() => setDocxPreviewGroup(null)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 dark:bg-slate-950 flex justify-center">
              <div 
                className="bg-white text-black shadow-xl w-full max-w-[21.59cm] min-h-[33.02cm] p-[2.54cm] docx-preview-content"
                dangerouslySetInnerHTML={{
                  __html: generatePenarikanHtml(docxPreviewGroup)
                }}
              />
            </div>
            <div className="p-4 border-t border-inherit flex justify-end gap-2">
              <button 
                onClick={() => {
                  const printUrl = `/api/letters/penarikan?industryId=${docxPreviewGroup.industryId}&department=${encodeURIComponent(docxPreviewGroup.departmentName)}&periodId=${docxPreviewGroup.periodId}&nomorSurat=${encodeURIComponent(docxPreviewGroup.inputNomor || '')}`;
                  window.open(printUrl, '_blank');
                  setDocxPreviewGroup(null);
                }} 
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Cetak DOCX Asli
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* MODAL INPUT NOMOR SURAT */}
      {promptAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form onSubmit={handlePromptSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-lg mb-2 dark:text-white">Input Nomor Surat</h3>
            <p className="text-xs text-slate-500 mb-4">Silakan masukkan nomor surat sebelum {promptAction === 'preview' ? 'melihat pratinjau' : 'mencetak dokumen'}.</p>
            
            <input 
              type="text" 
              autoFocus
              value={promptNomor}
              onChange={(e) => setPromptNomor(e.target.value)}
              placeholder="Contoh: 400.14.5.4 / 299 / 2026"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none mb-6 text-sm font-bold"
            />

            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => { setPromptAction(null); setPromptGroup(null); }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Batal
              </button>
              <button 
                type="submit" 
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
              >
                Lanjutkan
              </button>
            </div>
          </form>
        </div>
      )}
    
      {selectedGroupIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 px-6 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-200 dark:border-slate-800 flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-sm">
                {selectedGroupIds.length}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-black text-slate-800 dark:text-white">Kelompok Terpilih</p>
                <p className="text-[10px] text-slate-500">Siap diproses massal</p>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkDownload}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Unduh Gabung (DOCX)</span>
              </button>
              <button
                onClick={() => setSelectedGroupIds([])}
                className="p-2 text-slate-400 hover:text-rose-500 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
  
    </div>
  );
}
