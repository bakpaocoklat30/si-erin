// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✨ Fitur Baru: Real DOCX Generator dari Template Resmi SMKN 1 Adiwerna.
// 🔧 Fitur:
//    - Surat Tugas Monitoring PKL (.docx) direct template injection.
//    - SPPD TTE Jateng (.docx) direct template injection.
//    - Preserves ${nomor_naskah}, ${ttd_pengirim}, dll for TTE Jateng.
//    - Exact visual replica matching Microsoft Word layout.
// ----------------------------------------------------------------------

import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import {
  MonitoringAssignmentData,
  GeneratorOptions,
  formatIndonesianDate,
  formatIndonesianDateRange,
  formatIndonesianDayAndDateRange,
  calculateDurationDays,
  CompanionTeacher,
  parseCompanionTeachers,
  parseTargetIndustries,
  formatSppdDateRange,
} from './monitoring-templates';

function escapeXml(unsafe: any): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * 📜 GENERATE SURAT TUGAS MONITORING PKL (.docx)
 * Injects teacher data, dates, and industry details directly into template/Surat Tugas Monitoring PKL.docx
 */
export async function generateSuratTugasDocx(
  assignment: MonitoringAssignmentData,
  options?: GeneratorOptions
): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), 'template', 'Surat Tugas Monitoring PKL.docx');
  if (!fs.existsSync(templatePath)) {
    throw new Error(`File template tidak ditemukan di: ${templatePath}`);
  }

  const zip = new AdmZip(templatePath);
  let xml = zip.readAsText('word/document.xml');

  const useTte = options?.useTteTags !== false;
  const letterNo =
    assignment.letterNumber && assignment.letterNumber.trim() !== ''
      ? assignment.letterNumber
      : useTte
      ? '${nomor_naskah}'
      : '800.1.11.1 /1000/2026';

  // 1. Rentang Hari & Tanggal Dinamis (contoh: pada hari Selasa - Rabu tanggal 1 – 2 September 2026)
  const dayAndDateStr = formatIndonesianDayAndDateRange(assignment.monitoringDate, assignment.returnDate);
  const signatureDate = formatIndonesianDate(assignment.monitoringDate);

  // 2. Daftar Guru (Jabatan ditulis 'Guru' sesuai format resmi)
  const mainTeacher = assignment.teacher;
  const companionList = parseCompanionTeachers(assignment.companionTeachers);

  const allTeachers = [
    {
      name: mainTeacher.name || '-',
      nip: mainTeacher.nip || mainTeacher.username || '-',
      role: 'Guru',
    },
    ...companionList.map((c) => ({
      name: c.name,
      nip: c.nip || '-',
      role: 'Guru',
    })),
  ];

  // 3. Daftar Industri Tujuan (Bisa 1 Industri atau Beberapa Industri Rute)
  const rawTargetIndustries = parseTargetIndustries(assignment.targetIndustries);

  const allIndustries = [
    {
      name: assignment.industry.name,
      address: assignment.industry.address || assignment.industry.regency || '',
    },
    ...rawTargetIndustries.map((ind: any) => ({
      name: ind.name,
      address: ind.address || ind.regency || '',
    })),
  ];

  // 4. Pengaturan Kertas F4 (Folio 215mm x 330mm = 12189 x 18709 dxa) & Margin
  xml = xml.replace(
    /<w:pgSz\b[^>]*\/>/,
    '<w:pgSz w:w="12189" w:h="18709" w:code="0"/>'
  );
  xml = xml.replace(
    /<w:pgMar\b[^>]*\/>/,
    '<w:pgMar w:top="567" w:right="1134" w:bottom="720" w:left="1134" w:header="720" w:footer="720" w:gutter="0"/>'
  );

  const isCompact = allIndustries.length >= 4 || allTeachers.length >= 2;

  // 4. Nomor Surat
  xml = xml.replace(
    /<w:t xml:space="preserve">\s*800\.1\.11\.1 \/1000\/<\/w:t>[\s\S]*?<w:t>26<\/w:t><\/w:r>/,
    `<w:t xml:space="preserve"> ${escapeXml(letterNo)}</w:t></w:r>`
  );

  // 5. Injeksi Guru (Kepada : ...)
  if (allTeachers.length === 1) {
    // 1 GURU: Pertahankan tata letak template asli secara presisi dengan Jabatan Guru
    xml = xml.replace(
      /(<w:p w14:paraId="098F8A9B"[\s\S]*?<w:t xml:space="preserve">: <\/w:t><\/w:r>)[\s\S]*?(<\/w:p>)/,
      `$1<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>${escapeXml(
        allTeachers[0].name
      )}</w:t></w:r>$2`
    );

    xml = xml.replace(
      /(<w:p w14:paraId="3A75E85B"[\s\S]*?<w:t xml:space="preserve">: <\/w:t><\/w:r>)[\s\S]*?(<\/w:p>)/,
      `$1<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>${escapeXml(
        allTeachers[0].nip
      )}</w:t></w:r>$2`
    );

    xml = xml.replace(
      /(<w:p w14:paraId="7A9F8AC2"[\s\S]*?<w:t xml:space="preserve">\s*:<\/w:t><\/w:r>)[\s\S]*?(<\/w:p>)/,
      `$1<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve"> Guru</w:t></w:r>$2`
    );
  } else {
    // LEBIH DARI 1 GURU: Format daftar bernomor rapi untuk setiap guru (Jabatan: Guru)
    const fontSize = isCompact ? '23' : '24';
    const lineSpacing = isCompact ? '240' : '276';
    const gapAfter = isCompact ? '30' : '80';

    const multiTeachersXml = allTeachers
      .map(
        (t, idx) => `
      <w:p><w:pPr><w:spacing w:after="0" w:line="${lineSpacing}" w:lineRule="auto"/><w:ind w:left="1860" w:hanging="460"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t xml:space="preserve">${idx + 1}. Nama</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:tab/><w:tab/><w:t xml:space="preserve">      : </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t>${escapeXml(
          t.name
        )}</w:t></w:r></w:p>
      <w:p><w:pPr><w:spacing w:after="0" w:line="${lineSpacing}" w:lineRule="auto"/><w:ind w:left="1860"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t>NIP</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:tab/><w:tab/><w:t xml:space="preserve">       : </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t>${escapeXml(
          t.nip
        )}</w:t></w:r></w:p>
      <w:p><w:pPr><w:spacing w:after="${idx < allTeachers.length - 1 ? gapAfter : '0'}" w:line="${lineSpacing}" w:lineRule="auto"/><w:ind w:left="1860"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t>Jabatan</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:tab/><w:tab/><w:t xml:space="preserve">  : </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t>Guru</w:t></w:r></w:p>
    `
      )
      .join('');

    xml = xml.replace(
      /<w:p w14:paraId="098F8A9B"[\s\S]*?<w:p w14:paraId="7A9F8AC2"[\s\S]*?<\/w:p>/,
      multiTeachersXml
    );
  }

  // 6. Klausul Penugasan ("Untuk : ...")
  let replacementP = '';
  if (allIndustries.length === 1) {
    const singleClause = `Melaksanakan kegiatan Monitoring murid Praktik Kerja Lapangan ${dayAndDateStr} di ${allIndustries[0].name} yang beralamat di ${allIndustries[0].address || '-'}.`;
    replacementP = `<w:p w14:paraId="40DDC871" w:rsidR="00012339" w:rsidRPr="00F63D45" w:rsidRDefault="003A3B6A" w:rsidP="0034658A"><w:pPr><w:spacing w:after="0" w:line="276" w:lineRule="auto"/><w:ind w:left="1560" w:hanging="1560"/><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Untuk</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:tab/><w:t xml:space="preserve">:  </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>${escapeXml(
      singleClause
    )}</w:t></w:r></w:p>`;
  } else {
    // MULTI-INDUSTRI: Sesuai contoh dokumen resmi, dibuat baris pembuka "di :" lalu daftar bernomor
    const fontSize = isCompact ? '23' : '24';
    const lineSpacing = isCompact ? '240' : '276';
    const headerP = `<w:p w14:paraId="40DDC871" w:rsidR="00012339" w:rsidRPr="00F63D45" w:rsidRDefault="003A3B6A" w:rsidP="0034658A"><w:pPr><w:spacing w:after="${isCompact ? '30' : '60'}" w:line="${lineSpacing}" w:lineRule="auto"/><w:ind w:left="1560" w:hanging="1560"/><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t>Untuk</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:tab/><w:t xml:space="preserve">:  </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t>Melaksanakan kegiatan Monitoring murid Praktik Kerja Lapangan ${escapeXml(
      dayAndDateStr
    )} di :</w:t></w:r></w:p>`;

    const industriesXml = allIndustries
      .map(
        (ind, idx) => `
      <w:p><w:pPr><w:spacing w:after="${isCompact ? '20' : '40'}" w:line="${lineSpacing}" w:lineRule="auto"/><w:ind w:left="1560" w:hanging="360"/><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t xml:space="preserve">${idx + 1}. </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t>${escapeXml(
          ind.name
        )}${ind.address ? ' ' + escapeXml(ind.address) : ''}</w:t></w:r></w:p>
    `
      )
      .join('');

    replacementP = `${headerP}${industriesXml}`;
  }

  xml = xml.replace(
    /<w:p w14:paraId="40DDC871"[\s\S]*?<\/w:p>\s*<w:p w14:paraId="269D67DC"[\s\S]*?<\/w:p>\s*<w:p w14:paraId="262E2542"[\s\S]*?<\/w:p>\s*<w:p w14:paraId="74D1F132"[\s\S]*?<\/w:p>/,
    replacementP
  );

  // Jika kompak, hilangkan paragraf kosong sebelum "Demikian..."
  if (isCompact) {
    xml = xml.replace(/<w:p w14:paraId="51F40838"[\s\S]*?<\/w:p>/, '');
  }

  // 7. Tanggal Surat pada Tanda Tangan
  xml = xml.replace(
    /<w:t>Adiwerna, 14 September 2026<\/w:t>/,
    `<w:t>Adiwerna, ${escapeXml(signatureDate)}</w:t>`
  );

  // 8. Penanganan TTE Tags vs Mode Langsung
  if (!useTte) {
    const headmasterName = options?.schoolSetting?.headmaster || 'Joko Pramono, S.Pd., M.Ds';
    const headmasterNip = options?.schoolSetting?.headmasterNip || '19690316 199802 1 004';

    xml = xml.replace(
      /<w:t>\${<\/w:t>[\s\S]*?<w:t>jabatan_pengirim<\/w:t>[\s\S]*?<w:t>}<\/w:t>/,
      '<w:t>Kepala SMK Negeri 1 Adiwerna,</w:t>'
    );
    xml = xml.replace(
      /<w:t xml:space="preserve">\s*\${<\/w:t>[\s\S]*?<w:t>ttd_pengirim<\/w:t>[\s\S]*?<w:t>}<\/w:t>/,
      '<w:t xml:space="preserve"> </w:t>'
    );
    xml = xml.replace(
      /<w:t>\${<\/w:t>[\s\S]*?<w:t>nama_pengirim<\/w:t>[\s\S]*?<w:t>}<\/w:t>/,
      `<w:t>${escapeXml(headmasterName)}</w:t>`
    );
    xml = xml.replace(
      /<w:t xml:space="preserve">NIP <\/w:t>[\s\S]*?<w:t>nip_pengirim<\/w:t>[\s\S]*?<w:t>}<\/w:t>/,
      `<w:t xml:space="preserve">NIP ${escapeXml(headmasterNip)}</w:t>`
    );
  }

  zip.updateFile('word/document.xml', Buffer.from(xml, 'utf8'));
  return zip.toBuffer();
}

// Helper Angka Romawi untuk Lembar 2 SPPD
function toRoman(num: number): string {
  const map: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let res = '';
  for (const [val, roman] of map) {
    while (num >= val) {
      res += roman;
      num -= val;
    }
  }
  return res;
}


/**
 * 🚙 GENERATE SPPD TTE JATENG (.docx)
 * Dinamis mendukung banyak guru yang ditugaskan, banyak industri tujuan, dan banyak hari.
 * Mengikuti format resmi dokumen fisik Pemerintah Provinsi Jawa Tengah & SMKN 1 Adiwerna.
 */
export async function generateSppdDocx(
  assignment: MonitoringAssignmentData,
  options?: GeneratorOptions
): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), 'template', 'SPPD TTE.docx');
  if (!fs.existsSync(templatePath)) {
    throw new Error(`File template SPPD tidak ditemukan di: ${templatePath}`);
  }

  const zip = new AdmZip(templatePath);
  let xml = zip.readAsText('word/document.xml');

  const useTte = options?.useTteTags !== false;
  const sppdNo =
    assignment.sppdNumber && assignment.sppdNumber.trim() !== ''
      ? assignment.sppdNumber
      : useTte
      ? '${nomor_naskah}'
      : '090/SPPD/2026';

  const formattedDate = formatIndonesianDate(assignment.monitoringDate);
  const formattedReturnDate = formatIndonesianDate(assignment.returnDate || assignment.monitoringDate);
  const durationDays = calculateDurationDays(assignment.monitoringDate, assignment.returnDate);
  const sppdDateRange = formatSppdDateRange(assignment.monitoringDate, assignment.returnDate);

  // 1. Daftar Guru (Guru Utama + Pendamping)
  const mainTeacher = assignment.teacher;
  const companionList = parseCompanionTeachers(assignment.companionTeachers);

  const allTeachers = [
    {
      name: mainTeacher.name,
      nip: mainTeacher.nip || mainTeacher.username || '-',
      role: 'Guru',
    },
    ...companionList.map((c) => ({
      name: c.name,
      nip: c.nip || '-',
      role: 'Guru',
    })),
  ];

  // 2. Daftar Industri Tujuan (Bisa 1 atau beberapa industri)
  const rawTargetIndustries = parseTargetIndustries(assignment.targetIndustries);

  const allIndustries = [
    {
      name: assignment.industry.name,
      address: assignment.industry.address || assignment.industry.regency || '',
    },
    ...rawTargetIndustries.map((ind: any) => ({
      name: ind.name,
      address: ind.address || ind.regency || '',
    })),
  ];

  const purpose =
    assignment.purpose || 'Monitoring murid Praktik Kerja Lapangan';
  const transport = assignment.transportType || 'Kendaraan Pribadi';
  const departure = assignment.departurePlace || 'SMK Negeri 1 Adiwerna';
  const budgetSource = assignment.budgetSource || 'SMK Negeri 1 Adiwerna';
  const budgetAccount = assignment.budgetAccount || 'Dana BOS';

  // ==========================================================================
  // LEMBAR 1: TABEL UTAMA SPPD
  // ==========================================================================

  // 0. Pengaturan Kertas F4 (Folio 215mm x 330mm = 12189 x 18709 dxa) & Margin
  xml = xml.replace(
    /<w:pgSz\b[^>]*\/>/g,
    '<w:pgSz w:w="12189" w:h="18709" w:code="0"/>'
  );
  xml = xml.replace(
    /<w:pgMar\b[^>]*\/>/g,
    '<w:pgMar w:top="567" w:right="1134" w:bottom="567" w:left="1134" w:header="720" w:footer="720" w:gutter="0"/>'
  );

  const isMany = true; // Selalu gunakan pengaturan tinggi dan spasi kompak agar 4 slot tujuan muat presisi di kertas F4

  // 1. Nomor SPPD
  xml = xml.replace(/\${nomor_naskah}/, escapeXml(sppdNo));

  // 2. Poin 2: Daftar Guru yang melaksanakan tugas (Multi-Guru berurutan)
  const teacherCellRegex = /<w:p\b[^>]*>(?:(?!<w:p\b)[\s\S])*?<w:t>Mif Pahrudin<\/w:t>[\s\S]*?197104062010011002<\/w:t><\/w:r><\/w:p>/;
  let teacherXmlReplacement = '';
  if (allTeachers.length === 1) {
    teacherXmlReplacement = `
      <w:p w:rsidR="00664EFB" w:rsidRPr="00664EFB" w:rsidRDefault="00664EFB" w:rsidP="00664EFB">
        <w:pPr><w:spacing w:line="276" w:lineRule="auto"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${escapeXml(allTeachers[0].name)}</w:t></w:r>
      </w:p>
      <w:p w:rsidR="00664EFB" w:rsidRPr="00664EFB" w:rsidRDefault="00664EFB" w:rsidP="00664EFB">
        <w:pPr><w:spacing w:line="276" w:lineRule="auto"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${escapeXml(allTeachers[0].nip || '-')}</w:t></w:r>
      </w:p>
    `.trim();
  } else {
    teacherXmlReplacement = allTeachers
      .map(
        (t, idx) => `
      <w:p w:rsidR="00664EFB" w:rsidRPr="00664EFB" w:rsidRDefault="00664EFB" w:rsidP="00664EFB">
        <w:pPr><w:spacing w:line="276" w:lineRule="auto"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${idx + 1}. ${escapeXml(t.name)}</w:t></w:r>
      </w:p>
      <w:p w:rsidR="00664EFB" w:rsidRPr="00664EFB" w:rsidRDefault="00664EFB" w:rsidP="00664EFB">
        <w:pPr><w:spacing w:line="276" w:lineRule="auto"/><w:ind w:left="240"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${escapeXml(t.nip || '-')}</w:t></w:r>
      </w:p>
    `.trim()
      )
      .join('');
  }
  xml = xml.replace(teacherCellRegex, teacherXmlReplacement);

  // 3. Poin 3: Pangkat & Jabatan (Jabatan selalu 'Guru')
  xml = xml.replace(/<w:t xml:space="preserve"> II\/D<\/w:t>/, `<w:t xml:space="preserve"> ${escapeXml(mainTeacher.rank || '-')}</w:t>`);
  xml = xml.replace(/<w:t xml:space="preserve">Staf <\/w:t>/, `<w:t xml:space="preserve">Guru <\/w:t>`);

  // 4. Poin 4: Maksud Perjalanan Dinas
  xml = xml.replace(/Bimtek SRIKANDI/, escapeXml(purpose));

  // 5. Poin 5: Alat Angkutan
  xml = xml.replace(/Mobil Dinas \/ Kendaraan Umum/, escapeXml(transport));

  // 6. Poin 6: Tempat Berangkat & Tempat Tujuan (Multi-Industri)
  const destParagraphRegex = /<w:p\b[^>]*>(?:(?!<w:p\b)[\s\S])*?<w:t>b\.<\/w:t>(?:(?!<w:p\b)[\s\S])*?<w:t>SMK Negeri 3 Pekalongan<\/w:t><\/w:r><\/w:p>/;
  let destXmlReplacement = '';
  if (allIndustries.length === 1) {
    destXmlReplacement = `
      <w:p w:rsidR="00362665" w:rsidRPr="000B3D30" w:rsidRDefault="00362665" w:rsidP="00362665">
        <w:pPr><w:spacing w:after="40" w:line="260" w:lineRule="auto"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr>
        <w:r w:rsidRPr="000B3D30"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>b.</w:t></w:r>
        <w:r w:rsidR="00664EFB"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve"> ${escapeXml(allIndustries[0].name)}${allIndustries[0].address ? ' ' + escapeXml(allIndustries[0].address) : ''}</w:t></w:r>
      </w:p>
    `.trim();
  } else {
    const p1 = `
      <w:p w:rsidR="00362665" w:rsidRPr="000B3D30" w:rsidRDefault="00362665" w:rsidP="00362665">
        <w:pPr><w:spacing w:after="30" w:line="260" w:lineRule="auto"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr>
        <w:r w:rsidRPr="000B3D30"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>b.</w:t></w:r>
        <w:r w:rsidR="00664EFB"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve"> 1. ${escapeXml(allIndustries[0].name)}${allIndustries[0].address ? ' ' + escapeXml(allIndustries[0].address) : ''}</w:t></w:r>
      </w:p>
    `.trim();
    const rest = allIndustries
      .slice(1)
      .map(
        (ind, idx) => `
      <w:p w:rsidR="00362665" w:rsidRPr="000B3D30" w:rsidRDefault="00362665" w:rsidP="00362665">
        <w:pPr><w:spacing w:after="30" w:line="260" w:lineRule="auto"/><w:ind w:left="240"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr>
        <w:r w:rsidR="00664EFB"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${idx + 2}. ${escapeXml(ind.name)}${ind.address ? ' ' + escapeXml(ind.address) : ''}</w:t></w:r>
      </w:p>
    `.trim()
      )
      .join('');
    destXmlReplacement = p1 + rest;
  }
  xml = xml.replace(destParagraphRegex, destXmlReplacement);

  // 7. Poin 7: Lamanya Perjalanan Dinas & Tanggal
  xml = xml.replace(/1 Hari/, `${durationDays} Hari`);
  let dateOccurrence = 0;
  xml = xml.replace(/22 September 2026/g, () => {
    dateOccurrence++;
    return dateOccurrence === 1 ? escapeXml(formattedDate) : escapeXml(formattedReturnDate);
  });

  // 8. Poin 9: Pembebanan Anggaran
  xml = xml.replace(/Dana BOS/, escapeXml(budgetAccount));

  // ==========================================================================
  // LEMBAR 2: RIWAYAT BERANGKAT & TIBA (SESUAI GAMBAR DOKUMEN RESMI)
  // ==========================================================================
  const parts = xml.split('</w:tbl>');
  if (parts.length >= 3) {
    let t2Part = parts[2];
    const t2Start = t2Part.indexOf('<w:tbl');
    if (t2Start !== -1) {
      let beforeT2 = t2Part.substring(0, t2Start);
      let t2Xml = t2Part.substring(t2Start);

      const rows = t2Xml.match(/<w:tr\b[\s\S]*?<\/w:tr>/g);
      if (rows && rows.length >= 5) {
        const r0 = rows[0];
        const r1 = rows[1]; // Template baris kunjungan industri
        const r3 = rows[3]; // Baris kembali ke tempat kedudukan (aslinya IV)
        const r4 = rows[4]; // Baris Catatan Lain-Lain (aslinya VII)

        const fontSize = isMany ? '18' : '20';
        const lineSpacing = isMany ? '220' : '254';

        let r0DestListXml = '';
        if (allIndustries.length === 1) {
          r0DestListXml = `
            <w:p w:rsidR="0004024E" w:rsidRPr="00BF6521" w:rsidRDefault="0004024E" w:rsidP="000C6043">
              <w:pPr><w:spacing w:line="${lineSpacing}" w:lineRule="auto"/><w:ind w:left="286"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr></w:pPr>
              <w:r w:rsidRPr="00BF6521"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t xml:space="preserve">Ke : ${escapeXml(allIndustries[0].name)}${allIndustries[0].address ? ' ' + escapeXml(allIndustries[0].address) : ''}</w:t></w:r>
            </w:p>
          `.trim();
        } else {
          const pKe = `
            <w:p w:rsidR="0004024E" w:rsidRPr="00BF6521" w:rsidRDefault="0004024E" w:rsidP="000C6043">
              <w:pPr><w:spacing w:line="${lineSpacing}" w:lineRule="auto"/><w:ind w:left="286"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr></w:pPr>
              <w:r w:rsidRPr="00BF6521"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t xml:space="preserve">Ke :</w:t></w:r>
            </w:p>
          `.trim();
          const pItems = allIndustries
            .map(
              (ind, idx) => `
            <w:p w:rsidR="0004024E" w:rsidRPr="00BF6521" w:rsidRDefault="0004024E" w:rsidP="000C6043">
              <w:pPr><w:spacing w:line="${lineSpacing}" w:lineRule="auto"/><w:ind w:left="400"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr></w:pPr>
              <w:r w:rsidRPr="00BF6521"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t>${idx + 1}. ${escapeXml(ind.name)}${ind.address ? ' ' + escapeXml(ind.address) : ''}</w:t></w:r>
            </w:p>
          `.trim()
            )
            .join('');
          r0DestListXml = pKe + pItems;
        }

        const signatureBlockR0 = isMany
          ? `
            <w:p w:rsidR="0004024E" w:rsidRPr="0004024E" w:rsidRDefault="0004024E" w:rsidP="0004024E">
              <w:pPr><w:spacing w:line="${lineSpacing}" w:lineRule="auto"/><w:ind w:left="400" w:hanging="141"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr></w:pPr>
              <w:r w:rsidRPr="0004024E"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t>\${jabatan_pengirim}</w:t></w:r>
            </w:p>
            <w:p w:rsidR="0004024E" w:rsidRPr="0004024E" w:rsidRDefault="0004024E" w:rsidP="0004024E">
              <w:pPr><w:spacing w:line="${lineSpacing}" w:lineRule="auto"/><w:ind w:left="400" w:hanging="141"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr></w:pPr>
              <w:r w:rsidRPr="0004024E"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t xml:space="preserve">        \${ttd_pengirim}</w:t></w:r>
            </w:p>
            <w:p w:rsidR="0004024E" w:rsidRPr="0004024E" w:rsidRDefault="0004024E" w:rsidP="0004024E">
              <w:pPr><w:spacing w:line="${lineSpacing}" w:lineRule="auto"/><w:ind w:left="400" w:hanging="141"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:bCs/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr></w:pPr>
              <w:r w:rsidRPr="0004024E"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:bCs/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t>\${nama_pengirim}</w:t></w:r>
            </w:p>
            <w:p w:rsidR="0004024E" w:rsidRPr="0004024E" w:rsidRDefault="0004024E" w:rsidP="0004024E">
              <w:pPr><w:spacing w:line="${lineSpacing}" w:lineRule="auto"/><w:ind w:left="400" w:hanging="141"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:bCs/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr></w:pPr>
              <w:r w:rsidRPr="0004024E"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:bCs/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t>Pembina Utama Muda. IV/c</w:t></w:r>
            </w:p>
            <w:p w:rsidR="0004024E" w:rsidRPr="0004024E" w:rsidRDefault="0004024E" w:rsidP="0004024E">
              <w:pPr><w:spacing w:line="${lineSpacing}" w:lineRule="auto"/><w:ind w:left="400" w:hanging="141"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr></w:pPr>
              <w:r w:rsidRPr="0004024E"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t xml:space="preserve">NIP </w:t></w:r>
              <w:r w:rsidRPr="0004024E"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:bCs/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t>\${nip_pengirim}</w:t></w:r>
            </w:p>
          `
          : `
            <w:p w:rsidR="0004024E" w:rsidRPr="0004024E" w:rsidRDefault="0004024E" w:rsidP="0004024E">
              <w:pPr><w:spacing w:line="254" w:lineRule="auto"/><w:ind w:left="400" w:hanging="141"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr>
              <w:r w:rsidRPr="0004024E"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>\${jabatan_pengirim}</w:t></w:r>
            </w:p>
            <w:p w:rsidR="0004024E" w:rsidRPr="0004024E" w:rsidRDefault="0004024E" w:rsidP="0004024E">
              <w:pPr><w:spacing w:line="254" w:lineRule="auto"/><w:ind w:left="400" w:hanging="141"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr>
              <w:r w:rsidRPr="0004024E"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>
            </w:p>
            <w:p w:rsidR="0004024E" w:rsidRPr="0004024E" w:rsidRDefault="0004024E" w:rsidP="0004024E">
              <w:pPr><w:spacing w:line="254" w:lineRule="auto"/><w:ind w:left="400" w:hanging="141"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr>
              <w:r w:rsidRPr="0004024E"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">        \${ttd_pengirim}</w:t></w:r>
            </w:p>
            <w:p w:rsidR="0004024E" w:rsidRPr="0004024E" w:rsidRDefault="0004024E" w:rsidP="0004024E">
              <w:pPr><w:spacing w:line="254" w:lineRule="auto"/><w:ind w:left="400" w:hanging="141"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:bCs/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr>
              <w:r w:rsidRPr="0004024E"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:bCs/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>\${nama_pengirim}</w:t></w:r>
            </w:p>
            <w:p w:rsidR="0004024E" w:rsidRPr="0004024E" w:rsidRDefault="0004024E" w:rsidP="0004024E">
              <w:pPr><w:spacing w:line="254" w:lineRule="auto"/><w:ind w:left="400" w:hanging="141"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:bCs/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>Pembina Utama Muda. IV/c</w:t></w:r>
            </w:p>
            <w:p w:rsidR="0004024E" w:rsidRPr="0004024E" w:rsidRDefault="0004024E" w:rsidP="0004024E">
              <w:pPr><w:spacing w:line="254" w:lineRule="auto"/><w:ind w:left="400" w:hanging="141"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr>
              <w:r w:rsidRPr="0004024E"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">NIP </w:t></w:r>
              <w:r w:rsidRPr="0004024E"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:bCs/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>\${nip_pengirim}</w:t></w:r>
            </w:p>
          `;

        const newR0RightCell = `
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="4678" w:type="dxa"/>
              <w:gridSpan w:val="2"/>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              </w:tcBorders>
            </w:tcPr>
            <w:p w:rsidR="0004024E" w:rsidRPr="00BF6521" w:rsidRDefault="0004024E" w:rsidP="000C6043">
              <w:pPr><w:spacing w:line="${lineSpacing}" w:lineRule="auto"/><w:ind w:left="51"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr></w:pPr>
              <w:r w:rsidRPr="00BF6521"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t xml:space="preserve">I.  Berangkat dari : ${escapeXml(departure)}</w:t></w:r>
            </w:p>
            <w:p w:rsidR="0004024E" w:rsidRPr="00BF6521" w:rsidRDefault="0004024E" w:rsidP="000C6043">
              <w:pPr><w:spacing w:line="${lineSpacing}" w:lineRule="auto"/><w:ind w:left="286"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr></w:pPr>
              <w:r w:rsidRPr="00BF6521"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t xml:space="preserve">((tempat kedudukan))</w:t></w:r>
            </w:p>
            ${r0DestListXml}
            <w:p w:rsidR="0004024E" w:rsidRPr="00BF6521" w:rsidRDefault="0004024E" w:rsidP="000C6043">
              <w:pPr><w:spacing w:line="${lineSpacing}" w:lineRule="auto"/><w:ind w:left="286"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr></w:pPr>
              <w:r w:rsidRPr="00BF6521"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t xml:space="preserve">Pada Tanggal : ${escapeXml(sppdDateRange)}</w:t></w:r>
            </w:p>
            ${signatureBlockR0}
          </w:tc>
        `.trim();

        const r0Cells = r0.match(/<w:tc\b[\s\S]*?<\/w:tc>/g);
        if (r0Cells && r0Cells.length >= 3) {
          let updatedR0 = r0.replace(
            r0Cells[1] + r0Cells[2],
            newR0RightCell
          );
          if (isMany) {
            updatedR0 = updatedR0.replace(/<w:trHeight\b[^>]*\/>/, '<w:trHeight w:val="1800"/>');
          }

          // Jumlah slot baris antara (minimal 4 slot agar menampung 4 tujuan perjalanan sekaligus, dan jika 1 tujuan tersisa 3 slot kosong di bawahnya)
          const effectiveCount = Math.max(4, allIndustries.length);

          // Baris Antara Kunjungan Industri (II, III, IV, ...)
          let intermediateRowsXml = '';
          for (let idx = 0; idx < effectiveCount; idx++) {
            const roman = toRoman(idx + 2);
            let rowXml = r1.replace(
              /<w:t xml:space="preserve">II\.\s*<\/w:t>/,
              `<w:t xml:space="preserve">${roman}. </w:t>`
            );
            if (isMany) {
              rowXml = rowXml
                .replace(/<w:trHeight\b[^>]*\/>/g, '<w:trHeight w:val="680"/>')
                .replace(/w:after="300"/g, 'w:after="60"')
                .replace(/w:after="240"/g, 'w:after="60"')
                .replace(/w:sz w:val="20"/g, 'w:sz w:val="18"')
                .replace(/w:szCs w:val="20"/g, 'w:szCs w:val="18"');
            }
            intermediateRowsXml += rowXml;
          }

          // Baris Tiba Kembali di Tempat Kedudukan
          const returnRoman = toRoman(effectiveCount + 2);
          let updatedR3 = r3.replace(/<w:t>IV<\/w:t>/, `<w:t>${returnRoman}</w:t>`);
          if (isMany) {
            updatedR3 = updatedR3
              .replace(/<w:trHeight\b[^>]*\/>/g, '<w:trHeight w:val="1350"/>')
              .replace(/w:sz w:val="20"/g, 'w:sz w:val="18"')
              .replace(/w:szCs w:val="20"/g, 'w:szCs w:val="18"');
          }

          // Baris Catatan Lain-Lain
          const catatanRoman = toRoman(effectiveCount + 3);
          let updatedR4 = r4.replace(
            /<w:t xml:space="preserve">VII\.\s*<\/w:t>/,
            `<w:t xml:space="preserve">${catatanRoman}. </w:t>`
          );
          if (isMany) {
            updatedR4 = updatedR4
              .replace(/<w:trHeight\b[^>]*\/>/g, '<w:trHeight w:val="220"/>')
              .replace(/w:sz w:val="20"/g, 'w:sz w:val="18"')
              .replace(/w:szCs w:val="20"/g, 'w:szCs w:val="18"');
          }

          // Mengganti blok baris dan meniadakan baris VIII PERHATIAN agar presisi sesuai dokumen resmi dan muat di F4
          const oldRowsBlock = r0 + rows[1] + rows[2] + r3 + r4 + (rows.length >= 6 ? rows[5] : '');
          const newRowsBlock = updatedR0 + intermediateRowsXml + updatedR3 + updatedR4;

          t2Xml = t2Xml.replace(oldRowsBlock, newRowsBlock);
          parts[2] = beforeT2 + t2Xml;
          xml = parts.join('</w:tbl>');
        }
      }
    }
  }

  // ==========================================================================
  // MODE DIRECT PRINT NON-TTE (JIKA DIMINTA TANPA TAGS TTE JATENG)
  // ==========================================================================
  if (!useTte) {
    const headmasterName = options?.schoolSetting?.headmaster || 'Joko Pramono, S.Pd., M.Ds';
    const headmasterNip = options?.schoolSetting?.headmasterNip || '19690316 199802 1 004';

    xml = xml.replace(/\${tanggal_naskah}/g, escapeXml(formattedDate));
    xml = xml.replace(/\${jabatan_pengirim}/g, 'Kepala SMK Negeri 1 Adiwerna');
    xml = xml.replace(/\${ttd_pengirim}/g, '');
    xml = xml.replace(/\${nama_pengirim}/g, escapeXml(headmasterName));
    xml = xml.replace(/\${nip_pengirim}/g, escapeXml(headmasterNip));
  }

  zip.updateFile('word/document.xml', Buffer.from(xml, 'utf8'));
  return zip.toBuffer();
}
