'use client';
import { PDFDocument } from 'pdf-lib';


import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/app/theme-provider';
import { Truck, Printer, Search, Loader2, Users, Building2, Calendar, FileText, Upload, SendHorizontal, X, Eye , UploadCloud, FileCheck2, Trash2, Hash} from 'lucide-react';

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
  const [promptAction, setPromptAction] = useState<'nomor_tunggal' | 'nomor_bulk' | null>(null);
  const [promptGroup, setPromptGroup] = useState<any>(null);
  const [promptNomor, setPromptNomor] = useState('');
  const [showBulkUploadModal, setShowBulkUploadModal] = useState<boolean>(false);
  const [bulkPdfBytes, setBulkPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);
  const [pageMapping, setPageMapping] = useState<Record<string, number>>({});
  const [showPdfPreview, setShowPdfPreview] = useState<boolean>(true);
  const [bulkPdfPreviewUrl, setBulkPdfPreviewUrl] = useState<string>('');
  
  const handleBulkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    
    try {
      const url = URL.createObjectURL(file);
      setBulkPdfPreviewUrl(url);
      
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setBulkPdfBytes(bytes);
      
      if (file.type === 'application/pdf') {
        const pdfDoc = await PDFDocument.load(bytes);
        const count = pdfDoc.getPageCount();
        setPdfPageCount(count);

        const newMapping: Record<string, number> = {};
        const selectedGroups = filteredGroups.filter(g => selectedGroupIds.includes(g.groupId || (g.industryId + g.departmentName)));
        selectedGroups.forEach((g, index) => {
           newMapping[g.groupId || (g.industryId + g.departmentName)] = Math.min(index + 1, count);
        });
        setPageMapping(newMapping);
      } else {
        setPdfPageCount(1);
        const newMapping: Record<string, number> = {};
        filteredGroups.filter(g => selectedGroupIds.includes(g.groupId || (g.industryId + g.departmentName))).forEach(g => {
           newMapping[g.groupId || (g.industryId + g.departmentName)] = 1;
        });
        setPageMapping(newMapping);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal membaca dokumen PDF.');
    }
  };

  const handleBulkUploadSurat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkPdfBytes) {
      setErrorMsg('Silakan pilih berkas Surat (PDF)!');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const selectedGroups = filteredGroups.filter(g => selectedGroupIds.includes(g.groupId || (g.industryId + g.departmentName)));
      
      let sourcePdf: PDFDocument | null = null;
      if (pdfPageCount > 1) {
         sourcePdf = await PDFDocument.load(bulkPdfBytes);
      }

      let successCount = 0;

      for (const group of selectedGroups) {
        const mappedPage = pageMapping[group.groupId || (group.industryId + group.departmentName)] || 1;
        
        let finalBase64 = '';
        const toBase64 = (arr: Uint8Array) => {
          let binary = '';
          for (let i = 0; i < arr.byteLength; i++) {
            binary += String.fromCharCode(arr[i]);
          }
          return window.btoa(binary);
        };

        if (sourcePdf && pdfPageCount > 1) {
           const newPdf = await PDFDocument.create();
           const [copiedPage] = await newPdf.copyPages(sourcePdf, [mappedPage - 1]);
           newPdf.addPage(copiedPage);
           const newBytes = await newPdf.save();
           finalBase64 = 'data:application/pdf;base64,' + toBase64(newBytes);
        } else {
           const mime = selectedFileName.toLowerCase().endsWith('pdf') ? 'application/pdf' : 'image/jpeg';
           finalBase64 = 'data:' + mime + ';base64,' + toBase64(bulkPdfBytes);
        }

        const rawList = group.placements || group.students || [];
        const placementIds = rawList.map((p: any) => p.id || p.placementId).filter(Boolean);

        const res = await fetch('/api/pokja/groups', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            placementIds: placementIds,
            suratPenarikanUrl: finalBase64,
            status: 'MENUNGGU_PENARIKAN'
          })
        });

        if (res.ok) {
           successCount++;
        }
      }

      if (successCount > 0) {
        setSuccessMsg('Berhasil memetakan dan mengunggah untuk ' + successCount + ' kelompok!');
        setTimeout(() => {
          setShowBulkUploadModal(false);
          setSelectedGroupIds([]);
          setBulkPdfBytes(null);
          setSelectedFileName('');
          if (bulkPdfPreviewUrl) URL.revokeObjectURL(bulkPdfPreviewUrl);
          setBulkPdfPreviewUrl('');
          setPdfPageCount(0);
          setPageMapping({});
          fetchAcceptedGroups();
        }, 2000);
      } else {
        setErrorMsg('Gagal mengunggah untuk semua kelompok.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan saat upload massal.');
    } finally {
      setSubmitting(false);
    }
  };
  

    const saveNumber = async (group: any, nomor: string) => {
    try {
      const placementIds = group.students.map((s: any) => s.placementId).filter(Boolean);
      await fetch('/api/pokja/groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placementIds,
          nomorPenarikan: nomor
        })
      });
      fetchAcceptedGroups();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptNomor.trim()) {
      alert('Nomor Surat wajib diisi!');
      return;
    }
    
    if (promptAction === 'nomor_tunggal' && promptGroup) {
      await saveNumber(promptGroup, promptNomor);
      setPromptAction(null);
      setPromptGroup(null);
      setPromptNomor('');
    } else if (promptAction === 'nomor_bulk') {
      const selectedGroupsData = filteredGroups.filter(g => selectedGroupIds.includes(g.groupId || (g.industryId + g.departmentName)));
      for (const group of selectedGroupsData) {
        await saveNumber(group, promptNomor);
      }
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
        const deptLabel = g.departmentName || 'Teknik Komputer dan Jaringan';
    
    return `
      <div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: black; max-width: 100%; word-wrap: break-word;">
        <!-- KOP SURAT -->
        <div style="text-align: center;  margin-bottom: 20px;">
          <img src="/images/kop-surat-tugas.png" alt="Kop Surat" style="width: 100%; height: auto; object-fit: contain; display: block; margin: 0 auto;" />
        </div>

        <!-- HEADER SURAT -->
        <table style="width: 100%; border: none;">
          <tr>
            <td style="width: 60%; vertical-align: top;">
              <div>Nomor&nbsp;&nbsp;&nbsp;: ${g.inputNomor || '${nomor_naskah}'}</div>
              <div>Lamp.&nbsp;&nbsp;&nbsp;: -</div>
              <div>Hal&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <b><i><span style="text-decoration: underline;">Penarikan Siswa/Siswi Praktik</span></i></b></div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b><i><span style="text-decoration: underline;">Kerja Lapangan (PKL)</span></i></b></div>
            </td>
            <td style="width: 40%; text-align: right; vertical-align: top;">
              Adiwerna, \${tanggal_naskah}
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
          <div>\${jabatan_pengirim}</div>
          <br/><br/><br/>
          <div><b><span style="text-decoration: underline;">\${nama_pengirim}</span></b></div>
          <div>NIP \${nip_pengirim}</div>
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

  
  const handleDirectPrint = () => {
    if (!docxPreviewGroup) return;
    const htmlContent = generatePenarikanHtml(docxPreviewGroup);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cetak Surat</title>
            <style>
              @page { size: 215.9mm 330.2mm; margin: 15mm; }
              body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 0; color: black; background: white; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid black; padding: 5px; }
              #print-content { max-width: 100% !important; padding: 0 !important; }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 700);
    }
  };

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
                Belum Terbit
              </button>
              <button
                onClick={() => setStatusFilter('PUBLISHED')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === 'PUBLISHED' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Sudah Terbit
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
                      {isPublished ? 'Surat Siap' : 'Menunggu Diproses'}
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

                
                  
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nomor Surat Khusus Kelompok Ini</label>
                      <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        Tersimpan: {group.students[0]?.nomorPenarikan ? <span className="bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-300">{group.students[0].nomorPenarikan}</span> : <span className="text-rose-500">Belum Ada</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ketik & Enter/Klik Simpan"
                        key={group.students[0]?.nomorPenarikan || 'empty'} defaultValue={group.students[0]?.nomorPenarikan || ''}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            saveNumber(group, (e.target as HTMLInputElement).value);
                          }
                        }}
                        onBlur={(e) => saveNumber(group, e.target.value)}
                        className="flex-1 px-3 py-2 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:border-indigo-500 outline-none"
                      />
                      <button 
                        type="button"
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          saveNumber(group, input.value);
                        }}
                        className="px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 font-bold text-xs rounded-xl transition-all"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
    
                  
                  <div className="flex flex-col sm:flex-row gap-2 mt-auto">
                  <button
                      onClick={() => setDocxPreviewGroup({...group, inputNomor: group.students[0]?.nomorPenarikan || ''})}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs flex justify-center items-center gap-2 transition-all cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      Preview
                    </button>
                    
                <button 
                  onClick={() => {
                    const printUrl = `/api/letters/penarikan?industryId=${group.industryId}&department=${encodeURIComponent(group.departmentName)}&periodId=${group.periodId}&nomorSurat=${encodeURIComponent(group.students[0]?.nomorPenarikan || '')}`;
                        window.open(printUrl, '_blank');
                      }}
                      className="flex-1 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-400 font-bold rounded-xl text-xs flex justify-center items-center gap-2 transition-all cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />Unduh DOCX</button>
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
                <Printer className="w-4 h-4" />Unduh DOCX Asli</button>
            </div>
          </div>
        </div>
      )}

      
      
      {/* MODAL BULK UPLOAD */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`bg-white dark:bg-slate-900 w-full rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-all ${bulkPdfPreviewUrl && showPdfPreview ? 'max-w-6xl' : 'max-w-lg'}`}>
            <div className="flex items-center justify-between p-6 border-b border-inherit bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center space-x-2">
                  <UploadCloud className="w-6 h-6 text-indigo-500" />
                  <span>Upload Massal - {selectedGroupIds.length} Kelompok</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBulkUploadModal(false);
                  if (bulkPdfPreviewUrl) URL.revokeObjectURL(bulkPdfPreviewUrl);
                  setBulkPdfPreviewUrl('');
                }}
                className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <div className={`grid grid-cols-1 ${bulkPdfPreviewUrl && showPdfPreview ? 'lg:grid-cols-12 gap-8' : ''}`}>
                {/* Left Panel: Form */}
                <form onSubmit={handleBulkUploadSurat} className={`space-y-6 ${bulkPdfPreviewUrl && showPdfPreview ? 'lg:col-span-7' : 'col-span-1'}`}>
                  
                  {/* File Input */}
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                      Pilih Berkas Gabungan (PDF)
                    </label>
                    <div className="relative border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 rounded-2xl p-6 bg-slate-50 dark:bg-slate-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors text-center group cursor-pointer" onClick={() => document.getElementById('bulkFileInput')?.click()}>
                      <input
                        type="file"
                        id="bulkFileInput"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={handleBulkFileChange}
                      />
                      <FileCheck2 className="w-12 h-12 text-indigo-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {selectedFileName || 'Klik untuk memilih dokumen (PDF)'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Maks. ukuran berkas 10MB</p>
                    </div>
                  </div>

                  {/* Mapping Pages */}
                  {pdfPageCount > 1 && (
                    <div className="space-y-4">
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl">
                        <p className="text-xs text-amber-800 dark:text-amber-400 font-bold mb-2">
                          PDF ini memiliki {pdfPageCount} halaman. Silakan tentukan halaman mana untuk kelompok mana.
                        </p>
                      </div>
                      
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
                        {filteredGroups.filter(g => selectedGroupIds.includes(g.groupId || (g.industryId + g.departmentName))).map((g, i) => (
                          <div key={g.groupId || (g.industryId + g.departmentName)} className="flex items-center justify-between p-4">
                            <div className="flex-1 min-w-0 pr-4">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{g.industryName}</p>
                              <p className="text-[10px] font-medium text-slate-500 truncate">{g.departmentName} - {g.students.length} Siswa</p>
                            </div>
                            <div className="flex items-center space-x-3 bg-white dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                              <span className="text-xs font-bold text-slate-500">Hal.</span>
                              <input 
                                type="number" 
                                min={1} 
                                max={pdfPageCount}
                                value={pageMapping[g.groupId || (g.industryId + g.departmentName)] || 1}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  setPageMapping(prev => ({...prev, [g.groupId || (g.industryId + g.departmentName)]: val}));
                                }}
                                className="w-16 text-center text-sm font-black bg-transparent border-none outline-none focus:ring-0 p-0 text-indigo-600 dark:text-indigo-400"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {errorMsg && <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 border border-rose-200 dark:border-rose-900/50 text-sm font-bold rounded-xl">{errorMsg}</div>}
                  {successMsg && <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-200 dark:border-emerald-900/50 text-sm font-bold rounded-xl">{successMsg}</div>}

                  <div className="flex items-center gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowBulkUploadModal(false);
                        if (bulkPdfPreviewUrl) URL.revokeObjectURL(bulkPdfPreviewUrl);
                        setBulkPdfPreviewUrl('');
                      }}
                      className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-[2] py-3 rounded-xl font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex justify-center items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                      <span>Unggah & Eksekusi {selectedGroupIds.length} Kelompok</span>
                    </button>
                  </div>
                </form>

                {/* Right Panel: Live PDF Viewer */}
                {bulkPdfPreviewUrl && showPdfPreview && (
                  <div className="lg:col-span-5 h-[550px] bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-inner">
                    <div className="px-3.5 py-2.5 bg-slate-200/70 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        <span>Pratinjau PDF Asli</span>
                      </div>
                    </div>
                    <object
                      data={`${bulkPdfPreviewUrl}#toolbar=1&navpanes=1&view=FitH`}
                      type="application/pdf"
                      className="w-full flex-1 border-0"
                    >
                      <iframe
                        src={bulkPdfPreviewUrl}
                        title="PDF Preview"
                        className="w-full h-full border-0"
                      />
                    </object>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    
      {/* MODAL INPUT NOMOR SURAT */}
      {promptAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form onSubmit={handlePromptSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-lg mb-2 dark:text-white">Input Nomor Surat</h3>
            <p className="text-xs text-slate-500 mb-4">Silakan masukkan nomor surat resmi untuk {promptAction === 'nomor_bulk' ? 'semua kelompok yang dipilih' : 'kelompok ini'}.</p>
            
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
                  onClick={() => executeBulkDownload('')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Unduh Gabung (DOCX)</span>
                </button>
                <button
                  onClick={() => { setPromptAction('nomor_bulk'); setPromptNomor(''); }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Hash className="w-4 h-4" />
                  <span>Beri Nomor</span>
                </button>
              <button
                onClick={() => {
                  setErrorMsg('');
                  setSuccessMsg('');
                  setSelectedFileName('');
                  setBulkPdfBytes(null);
                  if (bulkPdfPreviewUrl) URL.revokeObjectURL(bulkPdfPreviewUrl);
                  setBulkPdfPreviewUrl('');
                  setPdfPageCount(0);
                  setPageMapping({});
                  setShowBulkUploadModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Massal</span>
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
