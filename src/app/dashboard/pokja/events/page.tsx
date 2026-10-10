'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Calendar, Users, MapPin, Search, CheckCircle2, ChevronLeft, Save, Plus, Trash2, FileText, X, CheckSquare, Printer, Edit, Eye, Download } from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';
import { PDFDocument } from 'pdf-lib';


const generateSuratEventHtml = (data: any, useTte: boolean) => {
  if(!data) return '';
  const { event, school, letters } = data;
  
  const tanggalNaskah = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const suratIntro = event?.letterIntro || 'Sehubungan dengan adanya program sekolah untuk memfasilitasi peserta didik dalam kegiatan Tes Kompetensi Akademik (TKA) bagi siswa kelas XII SMK Negeri 1 Adiwerna, bersama surat ini kami bermaksud memohon izin bagi siswa tersebut untuk sementara waktu tidak dapat mengikuti kegiatan Praktik Kerja Lapangan (PKL) di perusahaan yang Bapak/Ibu pimpin.';

  let html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Preview Surat Izin Kegiatan</title>
<style>
  @page { size: 215.9mm 330.2mm; margin: 10mm 15mm 10mm 15mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; background: #fff; margin: 0; padding: 0; }
  .page { page-break-after: always; padding: 10mm 15mm; }
  @media print { body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { padding: 0; } }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #000; padding: 4px 6px; }
  .no-border th, .no-border td { border: none; padding: 2px 0; }
  .text-center { text-align: center; }
</style>
</head>
<body>`;

  if(!letters || letters.length === 0) {
     html += `<div class="page" style="text-align:center; padding-top: 50px;">Belum ada surat yang bisa di-generate. Pastikan ada siswa di kelompok yang ber-PKL.</div></body></html>`;
     return html;
  }

  letters.forEach((letter: any) => {
    let studentRows = letter.students.map((s: any, i: number) => {
      const start = s.participantStartDate ? new Date(s.participantStartDate).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : (event.startDate ? new Date(event.startDate).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : '');
      const end = s.participantEndDate ? new Date(s.participantEndDate).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : (event.endDate ? new Date(event.endDate).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : '');
      const loc = s.participantLocation || event.location || '';
      return `<tr>
        <td style="text-align: center;">${i + 1}</td>
        <td>${s.name.toUpperCase()}</td>
        <td style="text-align: center;">${s.nis}</td>
        <td style="text-align: center;">${s.className}</td>
        <td style="text-align: center; font-size: 11pt;">${start} s.d. ${end}</td>
        <td style="text-align: center; font-size: 11pt;">${loc}</td>
      </tr>`;
    }).join('');

    html += `
<div class="page">
  <!-- KOP SURAT RESMI -->
  <div style="text-align: center; margin-bottom: 8px;">
    <img src="/images/kop-surat-tugas.png" alt="Kop Surat Resmi SMKN 1 Adiwerna" style="width: 100%; max-width: 720px; height: auto; display: block; margin: 0 auto;" onerror="this.onerror=null; this.src='/images/kop-jateng-smkn1adw.png';" />
  </div>
  
  <!-- NOMOR & TANGGAL SURAT -->
  <table style="width: 100%; margin-bottom: 12px; border: none; font-size: 12pt;">
    <tr>
      <td style="width: 60%; vertical-align: top; border: none; padding: 0;">
        <div>Nomor : ${useTte ? '\\${nomor_naskah}' : '400.14.5.4/.../2026'}</div>
        <div>Hal.    : <strong><em>Permohonan Izin Kegiatan</em></strong></div>
      </td>
      <td style="width: 40%; vertical-align: top; text-align: right; border: none; padding: 0;">
        ${school?.city || 'Adiwerna'}, ${useTte ? '\\${tanggal_naskah}' : tanggalNaskah}
      </td>
    </tr>
  </table>

  <!-- KEPADA INDUSTRI -->
  <div style="margin-bottom: 12px; font-size: 12pt; line-height: 1.3;">
    <div style="font-weight: bold;">Kepada</div>
    <div style="font-weight: bold;">Yth.Pimpinan ${letter.industry.name}</div>
    <div>${letter.industry.address}</div>
  </div>

  <div style="margin-bottom: 6px; font-size: 12pt;">Dengan hormat,</div>
  <p class="text-justify" style="margin: 0 0 8px 0; font-size: 12pt; text-indent: 0; line-height: 1.38; white-space: pre-wrap;">${suratIntro}</p>
  <div style="margin-bottom: 8px; font-size: 12pt;">Adapun identitas siswa yang bersangkutan adalah sebagai berikut:</div>

  <table style="width: 100%; margin-bottom: 16px; font-size: 11pt;">
    <thead>
      <tr style="background: #f8fafc;">
        <th style="width: 5%;">NO</th>
        <th style="width: 25%;">Nama Siswa</th>
        <th style="width: 15%;">NIS</th>
        <th style="width: 15%;">Kelas</th>
        <th style="width: 25%;">Tanggal Pelaksanaan</th>
        <th style="width: 15%;">Tempat</th>
      </tr>
    </thead>
    <tbody>
      ${studentRows}
    </tbody>
  </table>

  <p style="margin-bottom: 12px; text-align: justify; line-height: 1.35; font-size: 12pt;">
    Kami sampaikan pula bahwa setelah kegiatan ${event.name} tersebut selesai, siswa yang bersangkutan akan kembali melanjutkan kegiatan PKL di ${letter.industry.name} hingga batas waktu yang telah disepakati bersama sebelumnya.
  </p>

  <p style="margin-bottom: 32px; text-align: justify; line-height: 1.35; font-size: 12pt;">
    Demikian permohonan izin ini kami sampaikan. Atas perhatian, pengertian, dan kerja sama yang baik dari Bapak/Ibu pimpinan, kami ucapkan terima kasih.
  </p>

  <div style="display: flex; justify-content: flex-end;">
    <div style="width: 48%; text-align: left;">
      ${useTte ? `
        <div>\${jabatan_pengirim}</div>
        <div style="height: 64px;"></div>
        <div style="height: 60px; line-height: 60px;">\${ttd_pengirim}</div>
        <div style="height: 40px;"></div>
        <div style="font-weight: bold;">\${nama_pengirim}</div>
        <div>Pembina Utama Muda. IV/c</div>
        <div>NIP \${nip_pengirim}</div>
      ` : `
        <div>Kepala Sekolah</div>
        <div style="height: 65px;"></div>
        <div style="font-weight: bold;">${school?.headmasterName || 'Joko Pramono, S.Pd., M.Ds'}</div>
        <div>Pembina Utama Muda. IV/c</div>
        <div>NIP ${school?.headmasterNip || '19690316 199802 1 004'}</div>
      `}
    </div>
  </div>
</div>`;
  });

  html += `</body></html>`;
  return html;
};

export default function PokjaEventsPage() {
  const { status } = useSession();
  const { theme } = useTheme();

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Menginisialisasi...');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Create Event
  const [showEventForm, setShowEventForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formIntro, setFormIntro] = useState('Sehubungan dengan adanya program sekolah untuk memfasilitasi peserta didik dalam kegiatan Tes Kompetensi Akademik (TKA) bagi siswa kelas XII SMK Negeri 1 Adiwerna, bersama surat ini kami bermaksud memohon izin bagi siswa tersebut untuk sementara waktu tidak dapat mengikuti kegiatan Praktik Kerja Lapangan (PKL) di perusahaan yang Bapak/Ibu pimpin.');
  const [creatingEvent, setCreatingEvent] = useState(false);

  // Selected Event State
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventStudents, setEventStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Form Add Student to Event
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [addingStudents, setAddingStudents] = useState(false);

  const [editingParticipant, setEditingParticipant] = useState<any>(null);
  const [editPartStart, setEditPartStart] = useState('');
  const [editPartEnd, setEditPartEnd] = useState('');
  const [editPartLocation, setEditPartLocation] = useState('');
  const [savingParticipant, setSavingParticipant] = useState(false);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [useTte, setUseTte] = useState(true);

  const [showSplitPdf, setShowSplitPdf] = useState(false);
  const [splitPdfFile, setSplitPdfFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);
  const [pageMapping, setPageMapping] = useState<Record<number, { industry: string; group: string }>>({});
  const [splittingPdf, setSplittingPdf] = useState(false);
  const [industriesList, setIndustriesList] = useState<string[]>([]);
  const [splitPdfLetters, setSplitPdfLetters] = useState<any[]>([]);
  const [dbGroups, setDbGroups] = useState<any[]>([]);

  const openSplitPdfModal = async () => {
    setShowSplitPdf(true);
    setSplitPdfFile(null);
    setPdfPreviewUrl(null);
    setPdfPageCount(0);
    setPageMapping({});
    setIndustriesList([]);
    setSplitPdfLetters([]);
    setDbGroups([]);
    try {
      const [resLetters, resGroups] = await Promise.all([
        fetch(`/api/pokja/events/${selectedEvent.id}/letters`),
        fetch(`/api/pokja/groups`)
      ]);
      const data = await resLetters.json();
      const groupsData = await resGroups.json();
      if (data.success) {
        setSplitPdfLetters(data.letters);
        const indList = data.letters.map((l: any) => l.industry.name);
        setIndustriesList(indList);
      }
      if (groupsData.success) {
        setDbGroups(groupsData.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    setSplitPdfFile(file);
    if (file) {
      const url = window.URL.createObjectURL(file);
      setPdfPreviewUrl(url);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const count = pdfDoc.getPageCount();
        setPdfPageCount(count);
        
        // Auto map sequential pages to industries
        const newMap: Record<number, { industry: string; group: string }> = {};
        for (let i = 1; i <= count; i++) {
          newMap[i] = { industry: industriesList[i - 1] || '', group: '' };
        }
        setPageMapping(newMap);
      } catch (err) {
        console.error("Error loading PDF:", err);
      }
    } else {
      setPdfPreviewUrl(null);
      setPdfPageCount(0);
      setPageMapping({});
    }
  };

  const handleSplitPdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!splitPdfFile) {
      setErrorMsg("Pilih file PDF terlebih dahulu");
      return;
    }
    setSplittingPdf(true);
    setErrorMsg('');
    try {
      // Convert mapping object to array grouped by industry and group
      const groups: Record<string, number[]> = {};
      Object.entries(pageMapping).forEach(([pageStr, mapping]) => {
        if (mapping && mapping.industry) {
          const key = mapping.group ? `${mapping.industry} - ${mapping.group}` : mapping.industry;
          if (!groups[key]) groups[key] = [];
          groups[key].push(parseInt(pageStr));
        }
      });
      const mappingArray = Object.entries(groups).map(([industryName, pages]) => ({ industryName, pages }));

      const formData = new FormData();
      formData.append('file', splitPdfFile);
      formData.append('mapping', JSON.stringify(mappingArray));

      const res = await fetch(`/api/pokja/events/${selectedEvent.id}/split-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Terjadi kesalahan saat memisahkan PDF');
      }

      const resData = await res.json();
      
      setSuccessMsg(resData.message || "PDF berhasil dipisah dan disimpan di server!");
      setShowSplitPdf(false);
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setSplittingPdf(false);
    }
  };

  const openPreview = async () => {
    setLoadingPreview(true);
    setShowPreview(true);
    try {
      const res = await fetch(`/api/pokja/events/${selectedEvent.id}/letters`);
      const data = await res.json();
      if(data.success) {
        setPreviewData(data);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handlePrint = () => {
    const html = generateSuratEventHtml(previewData, useTte);
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
      }, 400);
    }
  };

  const handleOpenDocxPreviewInNewTab = () => {
    const html = generateSuratEventHtml(previewData, useTte);
    const newWin = window.open('', '_blank');
    if (newWin) {
      newWin.document.open();
      newWin.document.write(html);
      newWin.document.close();
    }
  };


  const fetchEvents = async (showProgress: boolean = false) => {
    try {
      if (showProgress) setLoadingText('Membangun koneksi ke server untuk memuat agenda...');
      const res = await fetch('/api/pokja/events');
      
      if (showProgress) {
        const contentLength = res.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        const reader = res.body?.getReader();
        let json;

        if (!reader) {
          setLoadingText('Memproses JSON agenda (Stream tidak didukung)...');
          json = await res.json();
        } else {
          let receivedLength = 0;
          const chunks = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            receivedLength += value.length;
            if (total) {
              const percent = Math.round((receivedLength / total) * 100);
              setLoadingText(`Mengunduh agenda kegiatan... ${percent}%`);
            } else {
              setLoadingText(`Mengunduh agenda kegiatan... ${(receivedLength / 1024 / 1024).toFixed(2)} MB`);
            }
          }
          setLoadingText('Mengekstrak paket JSON agenda...');
          const chunksAll = new Uint8Array(receivedLength);
          let position = 0;
          for (let chunk of chunks) {
            chunksAll.set(chunk, position);
            position += chunk.length;
          }
          const result = new TextDecoder("utf-8").decode(chunksAll);
          setLoadingText('Parsing struktur data UI agenda...');
          json = JSON.parse(result);
        }
        if(json.success) setEvents(json.data);
      } else {
        const data = await res.json();
        if(data.success) setEvents(data.data);
      }
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingText('Membangun koneksi ke server untuk memuat data siswa...');
        const stuRes = await fetch('/api/pokja/students');
        
        const contentLength = stuRes.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        const reader = stuRes.body?.getReader();
        let stuJson;

        if (!reader) {
          setLoadingText('Memproses JSON siswa (Stream tidak didukung)...');
          stuJson = await stuRes.json();
        } else {
          let receivedLength = 0;
          const chunks = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            receivedLength += value.length;
            if (total) {
              const percent = Math.round((receivedLength / total) * 100);
              setLoadingText(`Mengunduh data siswa... ${percent}%`);
            } else {
              setLoadingText(`Mengunduh data siswa... ${(receivedLength / 1024 / 1024).toFixed(2)} MB`);
            }
          }
          setLoadingText('Mengekstrak paket JSON siswa...');
          const chunksAll = new Uint8Array(receivedLength);
          let position = 0;
          for (let chunk of chunks) {
            chunksAll.set(chunk, position);
            position += chunk.length;
          }
          const result = new TextDecoder("utf-8").decode(chunksAll);
          setLoadingText('Parsing struktur data UI siswa...');
          stuJson = JSON.parse(result);
        }

        if (stuJson.success) {
          setAllStudents(stuJson.data.filter((s: any) => s.placement && s.placement.industryId));
        }

        await fetchEvents(true);
      } catch (err) {
        console.error(err);
        setErrorMsg('Gagal memuat data awal.');
      } finally {
        setLoadingText('');
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingEvent(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/pokja/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          startDate: formStart,
          endDate: formEnd,
          location: formLocation,
            letterIntro: formIntro,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
      
      setSuccessMsg('Kegiatan berhasil dibuat!');
      setShowEventForm(false);
      setFormName(''); setFormStart(''); setFormEnd(''); setFormLocation(''); setFormIntro('Sehubungan dengan adanya program sekolah untuk memfasilitasi peserta didik dalam kegiatan Tes Kompetensi Akademik (TKA) bagi siswa kelas XII SMK Negeri 1 Adiwerna, bersama surat ini kami bermaksud memohon izin bagi siswa tersebut untuk sementara waktu tidak dapat mengikuti kegiatan Praktik Kerja Lapangan (PKL) di perusahaan yang Bapak/Ibu pimpin.');
      fetchEvents();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if(!confirm('Yakin hapus kegiatan ini?')) return;
    try {
      await fetch(`/api/pokja/events/${id}`, { method: 'DELETE' });
      if(selectedEvent?.id === id) setSelectedEvent(null);
      fetchEvents();
    } catch(e) {
      console.error(e);
    }
  };

  const loadEventStudents = async (ev: any) => {
    setSelectedEvent(ev);
    setLoadingStudents(true);
    setShowAddStudentForm(false);
    setSelectedStudentIds([]);
    try {
      const res = await fetch(`/api/pokja/events/${ev.id}/students`);
      const data = await res.json();
      if(data.success) setEventStudents(data.data);
    } catch(e) {
      console.error(e);
    } finally {
      setLoadingStudents(false);
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const handleAddStudents = async () => {
    if (selectedStudentIds.length === 0) return;
    setAddingStudents(true);
    try {
      const res = await fetch(`/api/pokja/events/${selectedEvent.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedStudentIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
      
      setSuccessMsg('Siswa berhasil ditambahkan ke kegiatan.');
      setShowAddStudentForm(false);
      setSelectedStudentIds([]);
      loadEventStudents(selectedEvent);
      fetchEvents(); // refresh counts
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setAddingStudents(false);
    }
  };

    const handleRemoveStudent = async (participantId: string) => {
    if(!confirm('Hapus siswa dari kegiatan ini?')) return;
    try {
      await fetch(`/api/pokja/events/${selectedEvent.id}/students?participantId=${participantId}`, { method: 'DELETE' });
      loadEventStudents(selectedEvent);
      fetchEvents();
    } catch(e) {
      console.error(e);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEvent(true);
    try {
      const res = await fetch(`/api/pokja/events/${selectedEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          startDate: formStart,
          endDate: formEnd,
          location: formLocation,
          letterIntro: formIntro
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
      
      setSuccessMsg('Kegiatan berhasil diperbarui.');
      setShowEditEvent(false);
      fetchEvents();
      setSelectedEvent(data.data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSavingEvent(false);
    }
  };

  const openEditEvent = () => {
    setFormName(selectedEvent.name);
    setFormStart(selectedEvent.startDate.split('T')[0]);
    setFormEnd(selectedEvent.endDate.split('T')[0]);
    setFormLocation(selectedEvent.location || '');
    setFormIntro(selectedEvent.letterIntro || 'Maka dengan ini kami memohonkan izin kepada Bapak/Ibu Pimpinan agar siswa/i kami yang sedang melaksanakan Praktik Kerja Lapangan (PKL) di instansi yang Bapak/Ibu pimpin dapat diberikan izin untuk mengikuti kegiatan tersebut.');
    setShowEditEvent(true);
  };

  const handleUpdateParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant) return;
    setSavingParticipant(true);
    try {
      const res = await fetch(`/api/pokja/events/${selectedEvent.id}/students`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: editingParticipant.participantId,
          startDate: editPartStart,
          endDate: editPartEnd,
          location: editPartLocation
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
      
      setSuccessMsg('Jadwal siswa berhasil diperbarui.');
      setEditingParticipant(null);
      loadEventStudents(selectedEvent);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSavingParticipant(false);
    }
  };

  const filteredAllStudents = allStudents.filter(s => 
    !eventStudents.find(es => es.id === s.id) &&
    (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.nis && s.nis.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-indigo-600 font-medium animate-pulse">{loadingText}</p>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-6 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/dashboard/pokja" className="inline-flex items-center text-sm text-indigo-500 hover:text-indigo-600 mb-2">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Kembali ke Dashboard
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <Calendar className="w-8 h-8 text-indigo-500" />
            Perizinan Kegiatan Sekolah
          </h1>
          <p className={`mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Buat kegiatan, masukkan siswa yang berhalangan PKL, lalu generate surat izin per industri otomatis.
          </p>
        </div>
        <button
          onClick={() => setShowEventForm(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md shadow-indigo-200 dark:shadow-none"
        >
          <Plus className="w-5 h-5" />
          Buat Kegiatan Baru
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-100 text-red-700 border border-red-200 rounded-xl flex items-center gap-3">
          <span className="font-semibold">Error:</span> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-semibold">Sukses:</span> {successMsg}
          <button onClick={() => setSuccessMsg('')} className="ml-auto"><X className="w-4 h-4"/></button>
        </div>
      )}

      {showEventForm && (
        <div className={`p-6 rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2"><Calendar className="w-5 h-5 text-indigo-500"/> Form Buat Kegiatan</h2>
            <button onClick={() => setShowEventForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
          </div>
          <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nama Kegiatan</label>
              <input type="text" required placeholder="Misal: Ujian Sekolah" value={formName} onChange={e => setFormName(e.target.value)} className={`w-full p-2.5 rounded-xl border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tgl Mulai</label>
              <input type="date" required value={formStart} onChange={e => setFormStart(e.target.value)} className={`w-full p-2.5 rounded-xl border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tgl Selesai</label>
              <input type="date" required value={formEnd} onChange={e => setFormEnd(e.target.value)} className={`w-full p-2.5 rounded-xl border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tempat</label>
              <input type="text" placeholder="Misal: Sekolah" value={formLocation} onChange={e => setFormLocation(e.target.value)} className={`w-full p-2.5 rounded-xl border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
            </div>
            <div className="lg:col-span-4">
              <label className="block text-sm font-medium mb-1">Dasar Kegiatan / Narasi Surat</label>
              <textarea rows={3} required value={formIntro} onChange={e => setFormIntro(e.target.value)} className={`w-full p-2.5 rounded-xl border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
            </div>
            <div className="lg:col-span-4 flex justify-end">
              <button type="submit" disabled={creatingEvent} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-medium disabled:opacity-70">
                {creatingEvent ? 'Menyimpan...' : 'Simpan Kegiatan'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div>
        {!selectedEvent ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-700 dark:text-slate-200"><FileText className="w-6 h-6 text-indigo-500" /> Daftar Kegiatan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.length === 0 ? (
                <p className="text-slate-500 py-6 col-span-full">Belum ada kegiatan. Buat baru di atas.</p>
              ) : events.map(ev => (
                <div key={ev.id} onClick={() => loadEventStudents(ev)} className={`p-6 rounded-2xl border cursor-pointer transition-all ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-lg'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg line-clamp-1" title={ev.name}>{ev.name}</h3>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev.id); }} className="text-red-500 hover:text-red-700 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg shrink-0"><Trash2 className="w-4 h-4"/></button>
                  </div>
                  <p className={`text-sm flex items-center gap-2 mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    <Calendar className="w-4 h-4 text-indigo-400"/> {formatDate(ev.startDate)} s.d. {formatDate(ev.endDate)}
                  </p>
                  {ev.location && (
                     <p className={`text-sm flex items-center gap-2 mb-4 line-clamp-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      <MapPin className="w-4 h-4 text-emerald-400"/> {ev.location}
                    </p>
                  )}
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-sm">
                    <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full font-medium">{ev._count?.participants || 0} Siswa Terdaftar</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center">Kelola &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`p-6 rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <button onClick={() => setSelectedEvent(null)} className="mb-6 inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors">
               <ChevronLeft className="w-4 h-4 mr-1"/> Kembali ke Daftar Kegiatan
            </button>
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    {selectedEvent.name}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">{formatDate(selectedEvent.startDate)} s.d. {formatDate(selectedEvent.endDate)} | {selectedEvent.location}</p>
                </div>
                <div className="flex gap-2">
                                      <button
                      onClick={openEditEvent}
                      className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4"/> Edit Kegiatan & Narasi
                    </button>
                    <button
                      onClick={() => setShowAddStudentForm(!showAddStudentForm)}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2"
                  >
                    {showAddStudentForm ? <X className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                    {showAddStudentForm ? 'Tutup' : 'Tambah Siswa'}
                  </button>
                                      <button onClick={openPreview} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2">
                      <Eye className="w-4 h-4"/> Preview Surat
                    </button>
                    <button onClick={() => window.open(`/api/pokja/events/${selectedEvent.id}/download-docx?tte=${useTte}`, '_blank')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2">
                      <Download className="w-4 h-4"/> Download DOCX
                    </button>
                    <button onClick={openSplitPdfModal} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2">
                      Pisah PDF TTE
                    </button>
                </div>
              </div>

              {showSplitPdf && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50">
                  <div className={`w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl p-6 shadow-xl ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}`}>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg">Upload & Pisah PDF TTE</h3>
                      <button onClick={() => setShowSplitPdf(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Pilih File PDF TTE (Telah Ditandatangani)</label>
                      <input 
                        type="file" 
                        accept="application/pdf"
                        required
                        onChange={handlePdfFileChange}
                        className={`w-full max-w-sm p-2 border rounded-xl text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`} 
                      />
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[50vh] overflow-hidden">
                      {/* Left: Preview PDF */}
                      <div className={`border rounded-2xl overflow-hidden flex flex-col ${theme === 'dark' ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-100'}`}>
                        {pdfPreviewUrl ? (
                          <iframe src={pdfPreviewUrl} className="w-full h-full" title="PDF Preview" />
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                            <FileText className="w-12 h-12 mb-2 opacity-50" />
                            <p>Pilih file PDF untuk melihat pratinjau dokumen di sini.</p>
                          </div>
                        )}
                      </div>

                      {/* Right: Mapping */}
                      <div className="flex flex-col h-full overflow-hidden">
                        <h4 className="font-semibold text-sm mb-1 text-indigo-500 flex items-center justify-between">
                          <span>Mapping Halaman ke Industri</span>
                          {pdfPageCount > 0 && <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded text-xs">Total: {pdfPageCount} Halaman</span>}
                        </h4>
                        <p className="text-xs text-slate-500 mb-3">Tentukan industri yang sesuai untuk setiap halaman PDF di bawah ini.</p>
                        
                        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                          {!pdfPreviewUrl && (
                             <p className="text-sm text-slate-400 italic">Menunggu file PDF...</p>
                          )}
                          {Array.from({ length: pdfPageCount }).map((_, i) => {
                            const pageNum = i + 1;
                            return (
                              <div key={pageNum} className={`flex flex-col gap-3 p-3 rounded-xl border ${theme === 'dark' ? 'border-slate-800 bg-slate-800/30' : 'border-slate-200 bg-white'}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                  <div className="font-bold text-sm bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg shrink-0 w-24 text-center">
                                    Halaman {pageNum}
                                  </div>
                                  <select
                                    value={pageMapping[pageNum]?.industry || ''}
                                    onChange={(e) => {
                                      setPageMapping(prev => ({ 
                                        ...prev, 
                                        [pageNum]: { industry: e.target.value, group: '' } 
                                      }));
                                    }}
                                    className={`flex-1 p-2 rounded-lg border text-sm ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
                                  >
                                    <option value="">-- Pilih Industri (Abaikan) --</option>
                                    {industriesList.map(ind => (
                                      <option key={ind} value={ind}>{ind}</option>
                                    ))}
                                  </select>
                                </div>
                                {(() => {
                                  const selectedInd = pageMapping[pageNum]?.industry;
                                  
                                  let options: { label: string, value: string }[] = [];
                                  if (selectedInd) {
                                    const matchingGroups = dbGroups.filter((g: any) => g.industryName === selectedInd);
                                    
                                    if (matchingGroups.length > 0) {
                                      options = matchingGroups.map((g: any) => {
                                        const studentsList = g.students || g.placements || [];
                                        const names = studentsList.map((s: any) => {
                                          const stu = s.student || s;
                                          return (stu.name || '').split(' ')[0];
                                        });
                                        const studentIds = studentsList.map((s: any) => s.studentId || (s.student && s.student.id) || s.id);
                                        const label = `${names.join(', ')} (${g.periodName || 'Tanpa Periode'})`;
                                        return { label, value: JSON.stringify({ label, studentIds }) };
                                      });
                                    } else {
                                      const letter = splitPdfLetters.find(l => l.industry.name === selectedInd);
                                      if (letter && letter.students) {
                                        const groupsMap = new Map<string, { names: string[], studentIds: string[] }>();
                                        letter.students.forEach((s: any) => {
                                          const pStart = s.participantStartDate ? new Date(s.participantStartDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-';
                                          const pEnd = s.participantEndDate ? new Date(s.participantEndDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-';
                                          const key = `${pStart} - ${pEnd}`;
                                          
                                          if (!groupsMap.has(key)) groupsMap.set(key, { names: [], studentIds: [] });
                                          groupsMap.get(key)!.names.push((s.name || '').split(' ')[0]);
                                          groupsMap.get(key)!.studentIds.push(s.id);
                                        });
                                        options = Array.from(groupsMap.entries()).map(([period, data]) => {
                                          const label = `${data.names.join(', ')} (${period})`;
                                          return { label, value: JSON.stringify({ label, studentIds: data.studentIds }) };
                                        });
                                      }
                                    }
                                  }

                                  if (!selectedInd || options.length === 0) return null;

                                  return (
                                    <div className="pl-1 sm:pl-28 flex flex-col gap-1.5">
                                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pilih Kelompok PKL:</div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {options.map((opt, idx) => {
                                          const isSelected = pageMapping[pageNum]?.group === opt.value;
                                          return (
                                            <label 
                                              key={idx} 
                                              className={`cursor-pointer border rounded-lg p-2.5 text-sm flex items-start gap-2.5 transition ${
                                                isSelected 
                                                  ? 'bg-purple-50 border-purple-500 dark:bg-purple-900/30 dark:border-purple-500/70 text-purple-900 dark:text-purple-100' 
                                                  : 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700/50'
                                              }`}
                                            >
                                              <input 
                                                type="radio" 
                                                className="mt-0.5 shrink-0" 
                                                name={`group-${pageNum}`} 
                                                value={opt.value} 
                                                checked={isSelected}
                                                onChange={(e) => {
                                                  setPageMapping(prev => ({ 
                                                    ...prev, 
                                                    [pageNum]: { industry: prev[pageNum]?.industry || '', group: e.target.value } 
                                                  }));
                                                }}
                                              />
                                              <span className="leading-snug">{opt.label}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 shrink-0">
                      <button type="button" onClick={() => setShowSplitPdf(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition">Batal</button>
                      <button type="button" onClick={handleSplitPdfSubmit} disabled={splittingPdf || !splitPdfFile || pdfPageCount === 0} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-70 transition flex items-center gap-2">
                        {splittingPdf ? 'Memproses...' : 'Pisahkan & Download ZIP'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showAddStudentForm && (
                <div className={`mb-6 p-4 rounded-xl border ${theme === 'dark' ? 'border-indigo-900/50 bg-indigo-900/10' : 'border-indigo-100 bg-indigo-50/50'}`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                    <h3 className="font-bold">Pilih Siswa ({selectedStudentIds.length} terpilih)</h3>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" placeholder="Cari nama/NIS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto border rounded-xl mb-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 shadow-sm">
                        <tr>
                          <th className="px-4 py-2 w-10 text-center"><CheckSquare className="w-4 h-4 mx-auto"/></th>
                          <th className="px-4 py-2">Nama</th>
                          <th className="px-4 py-2">Kelas</th>
                          <th className="px-4 py-2">Industri Saat Ini</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredAllStudents.map(s => (
                          <tr key={s.id} onClick={() => toggleStudent(s.id)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                            <td className="px-4 py-2 text-center">
                              <input type="checkbox" checked={selectedStudentIds.includes(s.id)} readOnly className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                            </td>
                            <td className="px-4 py-2 font-medium">{s.name} <br/><span className="text-xs text-slate-500">{s.nis}</span></td>
                            <td className="px-4 py-2">{s.className || '-'}</td>
                            <td className="px-4 py-2 text-xs">{s.placement?.industry?.name || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button onClick={handleAddStudents} disabled={addingStudents || selectedStudentIds.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl font-medium disabled:opacity-70">
                    {addingStudents ? 'Menyimpan...' : `Simpan ${selectedStudentIds.length} Siswa ke Kegiatan`}
                  </button>
                </div>
              )}

              <div className="mt-4">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-3">Siswa yang Ikut Serta ({eventStudents.length})</h3>
                {loadingStudents ? (
                  <p className="text-slate-500">Memuat siswa...</p>
                ) : eventStudents.length === 0 ? (
                  <p className="text-slate-500 text-sm">Belum ada siswa yang ditambahkan ke kegiatan ini.</p>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                          <th className="px-4 py-3">Nama Siswa</th>
                          <th className="px-4 py-3">Kelas</th>
                          <th className="px-4 py-3">Industri PKL</th>
                          <th className="px-4 py-3">Detail Kegiatan</th><th className="px-4 py-3 w-28 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {eventStudents.map(s => (
                          <tr key={s.id}>
                            <td className="px-4 py-3 font-medium">{s.name}<br/><span className="text-xs font-normal text-slate-500">{s.nis}</span></td>
                            <td className="px-4 py-3">
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {s.className || '-'}
                              </span>
                            </td>
                                                          <td className="px-4 py-3 text-xs">{s.placement?.industry?.name || '-'}</td>
                              <td className="px-4 py-3 text-xs">
                                <div className="text-slate-600 dark:text-slate-400">
                                  <Calendar className="w-3 h-3 inline mr-1"/>
                                  {s.participantStartDate ? formatDate(s.participantStartDate) : formatDate(selectedEvent.startDate)} - {s.participantEndDate ? formatDate(s.participantEndDate) : formatDate(selectedEvent.endDate)}
                                </div>
                                <div className="text-slate-500 mt-1 line-clamp-1" title={s.participantLocation || selectedEvent.location}>
                                  <MapPin className="w-3 h-3 inline mr-1"/>
                                  {s.participantLocation || selectedEvent.location || '-'}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                                <button onClick={() => {
                                  setEditingParticipant(s);
                                  setEditPartStart(s.participantStartDate ? s.participantStartDate.split('T')[0] : selectedEvent.startDate.split('T')[0]);
                                  setEditPartEnd(s.participantEndDate ? s.participantEndDate.split('T')[0] : selectedEvent.endDate.split('T')[0]);
                                  setEditPartLocation(s.participantLocation || selectedEvent.location || '');
                                }} className="text-blue-500 hover:text-blue-700 p-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg" title="Edit Jadwal Siswa">
                                  <Edit className="w-4 h-4"/>
                                </button>
                                <button onClick={() => handleRemoveStudent(s.participantId)} className="text-red-500 hover:text-red-700 p-1 bg-red-50 dark:bg-red-900/20 rounded-lg" title="Hapus dari Kegiatan">
                                  <Trash2 className="w-4 h-4"/>
                                </button>
                              </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🌟 MODAL PRATINJAU SURAT Izin Kegiatan */}
      {showPreview && (
        <div 
          className="fixed inset-0 z-[999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowPreview(false)}
        >
          <div
            className={`w-full max-w-5xl h-[95vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-inherit flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <FileText className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>Pratinjau Surat Izin Kegiatan</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Kegiatan: <strong className="text-slate-900 dark:text-white">{selectedEvent?.name}</strong>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setUseTte(!useTte)}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    useTte
                      ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 shadow-inner'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{useTte ? 'Mode TTE: AKTIF' : 'Mode Langsung'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={loadingPreview}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak A4</span>
                </button>

                {/* Open in New Tab */}
                <button
                  type="button"
                  onClick={handleOpenDocxPreviewInNewTab}
                  disabled={loadingPreview}
                  className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                  title="Buka di Tab Baru"
                >
                  <Eye className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-600 dark:text-rose-300 hover:text-white text-xs font-bold border border-rose-500/30 transition-all cursor-pointer shadow-sm ml-1"
                >
                  <X className="w-4 h-4" />
                  <span>Tutup</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 bg-slate-200/90 dark:bg-slate-950 p-4 overflow-hidden flex justify-center">
              {loadingPreview ? (
                <div className="flex items-center justify-center text-slate-500 h-full">Memuat data surat...</div>
              ) : (
                <iframe
                  title="Document Preview"
                  srcDoc={generateSuratEventHtml(previewData, useTte)}
                  className="w-full max-w-4xl h-full rounded-2xl bg-white shadow-2xl border border-slate-300 dark:border-slate-800"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-inherit flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
              <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span>Format Dokumen F4 / Folio</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={loadingPreview}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {showEditEvent && (
          <div className="fixed inset-0 bg-black/50 z-[999] flex items-center justify-center p-4">
              <div className={`w-full max-w-lg rounded-2xl p-6 shadow-xl ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">Edit Kegiatan & Pengantar Surat</h3>
                  <button onClick={() => setShowEditEvent(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                </div>
                <form onSubmit={handleUpdateEvent} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Nama Kegiatan</label>
                    <input type="text" required value={formName} onChange={e => setFormName(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1">Tanggal Mulai</label>
                      <input type="date" required value={formStart} onChange={e => setFormStart(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Tanggal Selesai</label>
                      <input type="date" required value={formEnd} onChange={e => setFormEnd(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Lokasi</label>
                    <input type="text" value={formLocation} onChange={e => setFormLocation(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Pengantar Surat / Dasar Kegiatan</label>
                    <textarea required rows={4} value={formIntro} onChange={e => setFormIntro(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
                  </div>
                  <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => setShowEditEvent(false)} className="px-4 py-2 rounded-lg font-medium bg-slate-200 text-slate-700 hover:bg-slate-300">Batal</button>
                    <button type="submit" disabled={savingEvent} className="px-4 py-2 rounded-lg font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-70">
                      {savingEvent ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </form>
              </div>
          </div>
        )}

      {editingParticipant && (
        <div className="fixed inset-0 bg-black/50 z-[999] flex items-center justify-center p-4">
            <div className={`w-full max-w-md rounded-2xl p-6 shadow-xl ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Edit Detail Siswa</h3>
                <button onClick={() => setEditingParticipant(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
              </div>
              <p className="text-sm mb-4">Siswa: <span className="font-semibold">{editingParticipant.name}</span></p>
              <form onSubmit={handleUpdateParticipant} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Tanggal Mulai</label>
                    <input type="date" required value={editPartStart} onChange={e => setEditPartStart(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Tanggal Selesai</label>
                    <input type="date" required value={editPartEnd} onChange={e => setEditPartEnd(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Lokasi</label>
                  <input type="text" value={editPartLocation} onChange={e => setEditPartLocation(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} placeholder="Opsional" />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setEditingParticipant(null)} className="px-4 py-2 rounded-lg font-medium bg-slate-200 text-slate-700 hover:bg-slate-300">Batal</button>
                  <button type="submit" disabled={savingParticipant} className="px-4 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-70">
                    {savingParticipant ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }