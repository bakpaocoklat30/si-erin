const fs = require('fs');
const path = 'd:\\project\\pkl tkj rev\\si-erin\\src\\app\\dashboard\\pokja\\events\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add generateSuratEventHtml function before the component
const helperFunc = `
const generateSuratEventHtml = (data: any, useTte: boolean) => {
  if(!data) return '';
  const { event, school, letters } = data;
  
  const tanggalNaskah = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const suratIntro = event?.letterIntro || 'Sehubungan dengan adanya program sekolah untuk memfasilitasi peserta didik dalam kegiatan Tes Kompetensi Akademik (TKA) bagi siswa kelas XII SMK Negeri 1 Adiwerna, bersama surat ini kami bermaksud memohon izin bagi siswa tersebut untuk sementara waktu tidak dapat mengikuti kegiatan Praktik Kerja Lapangan (PKL) di perusahaan yang Bapak/Ibu pimpin.';

  let html = \`<!DOCTYPE html>
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
<body>\`;

  if(!letters || letters.length === 0) {
     html += \`<div class="page" style="text-align:center; padding-top: 50px;">Belum ada surat yang bisa di-generate. Pastikan ada siswa di kelompok yang ber-PKL.</div></body></html>\`;
     return html;
  }

  letters.forEach((letter: any) => {
    let studentRows = letter.students.map((s: any, i: number) => {
      const start = s.participantStartDate ? new Date(s.participantStartDate).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : (event.startDate ? new Date(event.startDate).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : '');
      const end = s.participantEndDate ? new Date(s.participantEndDate).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : (event.endDate ? new Date(event.endDate).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : '');
      const loc = s.participantLocation || '';
      return \`<tr>
        <td style="text-align: center;">\${i + 1}.</td>
        <td>\${s.name.toUpperCase()}</td>
        <td style="text-align: center;">\${s.nis}</td>
        <td style="text-align: center;">\${s.className}</td>
        <td style="text-align: center; font-size: 11pt;">\${start} s.d. \${end}\${loc ? '<br/>di ' + loc : ''}</td>
        <td style="text-align: center;">\${s.phone || '-'}</td>
      </tr>\`;
    }).join('');

    html += \`
<div class="page">
  <div style="text-align: center; margin-bottom: 20px;">
    <img src="/images/kop-surat-tugas.png" style="width: 100%; max-width: 720px;" onerror="this.src='/images/kop-jateng-smkn1adw.png';" />
  </div>
  
  <table class="no-border" style="width: 100%; margin-bottom: 24px;">
    <tr>
      <td style="width: 60%; vertical-align: top;">
        Nomor : \${useTte ? '\\\${nomor_naskah}' : '400.14.5.4/.../2026'}<br/>
        Lamp. : -<br/>
        Hal : <strong><em>Permohonan Izin Kegiatan</em></strong>
      </td>
      <td style="width: 40%; vertical-align: top; text-align: right;">
        \${school?.city || 'Adiwerna'}, \${useTte ? '\\\${tanggal_naskah}' : tanggalNaskah}
      </td>
    </tr>
  </table>

  <div style="margin-bottom: 20px; line-height: 1.3;">
    <strong>Kepada</strong><br/>
    <strong>Yth.Pimpinan \${letter.industry.name}</strong><br/>
    \${letter.industry.address}
  </div>

  <div style="margin-bottom: 16px; text-align: justify; line-height: 1.38;">
    <p style="margin-bottom: 16px;">Dengan hormat,</p>
    <p style="margin-bottom: 16px; white-space: pre-wrap;">\${suratIntro}</p>
    <p style="margin-bottom: 16px;">Adapun identitas siswa yang bersangkutan adalah sebagai berikut:</p>
  </div>

  <table style="width: 100%; margin-bottom: 24px;">
    <thead>
      <tr style="background: #f8fafc;">
        <th style="width: 5%;">No.</th>
        <th style="width: 25%;">Nama Siswa</th>
        <th style="width: 12%;">NIS</th>
        <th style="width: 12%;">Kelas</th>
        <th style="width: 31%;">Waktu & Tempat Kegiatan</th>
        <th style="width: 15%;">No Hp</th>
      </tr>
    </thead>
    <tbody>
      \${studentRows}
    </tbody>
  </table>

  <p style="margin-bottom: 32px; text-align: justify; line-height: 1.35;">
    Demikian permohonan kami, atas perhatian dan kerjasamanya kami sampaikan terimakasih.
  </p>

  <div style="display: flex; justify-content: flex-end;">
    <div style="width: 48%; text-align: left;">
      \${useTte ? \`
        <div>\\\${jabatan_pengirim}</div>
        <div style="height: 64px;"></div>
        <div style="height: 60px; line-height: 60px;">\\\${ttd_pengirim}</div>
        <div style="height: 40px;"></div>
        <div style="font-weight: bold;">\\\${nama_pengirim}</div>
        <div>Pembina Utama Muda. IV/c</div>
        <div>NIP \\\${nip_pengirim}</div>
      \` : \`
        <div>Kepala Sekolah</div>
        <div style="height: 65px;"></div>
        <div style="font-weight: bold;">\${school?.headmasterName || 'Joko Pramono, S.Pd., M.Ds'}</div>
        <div>Pembina Utama Muda. IV/c</div>
        <div>NIP \${school?.headmasterNip || '19690316 199802 1 004'}</div>
      \`}
    </div>
  </div>
</div>\`;
  });

  html += \`</body></html>\`;
  return html;
};
\nexport default function PokjaEventsPage() {\n`;

content = content.replace('export default function PokjaEventsPage() {\n', helperFunc);

// 2. Add previewData state and methods
const hooksAdd = `  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [useTte, setUseTte] = useState(true);

  const openPreview = async () => {
    setLoadingPreview(true);
    setShowPreview(true);
    try {
      const res = await fetch(\`/api/pokja/events/\${selectedEvent.id}/letters\`);
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
`;

// Insert after "const [showPreview, setShowPreview] = useState(false);"
content = content.replace(
  'const [showPreview, setShowPreview] = useState(false);',
  'const [showPreview, setShowPreview] = useState(false);\n' + hooksAdd
);

// 3. Update the button that opens preview
content = content.replace(
  'onClick={() => setShowPreview(true)}',
  'onClick={openPreview}'
);

// 4. Update the modal UI to look like kelompok
const newModal = `      {/* 🌟 MODAL PRATINJAU SURAT Izin Kegiatan */}
      {showPreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowPreview(false)}
        >
          <div
            className={\`w-full max-w-5xl h-[95vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden \${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }\`}
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
                  className={\`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer \${
                    useTte
                      ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 shadow-inner'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }\`}
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
                <div className="flex items-center justify-center text-slate-500">Memuat data surat...</div>
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
      )}`;

// We need to replace the old showPreview block
const oldModalRegex = /\{\s*showPreview\s*&&\s*\(\s*<div className="fixed inset-0 bg-black\/70.*?<\/iframe>\s*<\/div>\s*<\/div>\s*\)\s*\}/s;
content = content.replace(oldModalRegex, newModal);

fs.writeFileSync(path, content, 'utf8');

