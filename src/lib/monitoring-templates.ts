// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✨ Fitur Baru: Template Generator Surat Tugas Monitoring & SPPD TTE Jateng.
// 🔧 Fitur:
//    - Preserves TTE Jateng placeholder tags (${nomor_naskah}, ${tanggal_naskah}, ${ttd_pengirim}, dll).
//    - Standard A4 Page Layout with clean typography (Times New Roman / Arial Kedinasan).
//    - Lembar 1 & Lembar 2 SPPD (Rincian Biaya & Riwayat Berangkat-Tiba).
//    - Rincian Siswa Magang yang dimonitor di DUDI tujuan.
// ----------------------------------------------------------------------

export interface CompanionTeacher {
  name: string;
  nip?: string;
  rank?: string;
  role?: string;
}

export interface AdditionalIndustryItem {
  id?: string;
  name: string;
  address?: string | null;
  regency?: string | null;
}

export function parseCompanionTeachers(raw: any): CompanionTeacher[] {
  if (!raw) return [];
  let list = raw;
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list.filter((c: any) => c && typeof c.name === 'string' && c.name.trim() !== '');
}

export function parseTargetIndustries(raw: any): AdditionalIndustryItem[] {
  if (!raw) return [];
  let list = raw;
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list.filter((i: any) => i && typeof i.name === 'string' && i.name.trim() !== '');
}

export interface StudentPlacementItem {
  student: {
    id: string;
    name: string;
    nis?: string;
    className?: string;
    department?: string;
  };
}

export interface MonitoringAssignmentData {
  id?: string;
  industry: {
    id: string;
    name: string;
    address?: string | null;
    regency?: string | null;
    province?: string | null;
    phone?: string | null;
    contactPerson?: string | null;
    placements?: StudentPlacementItem[];
  };
  targetIndustries?: AdditionalIndustryItem[] | any;
  teacher: {
    id: string;
    name: string;
    username?: string;
    nip?: string | null;
    rank?: string | null;
    jobTitle?: string | null;
    phone?: string | null;
  };
  companionTeachers?: CompanionTeacher[] | any;
  period?: {
    id: string;
    name: string;
    startDate?: string | Date;
    endDate?: string | Date;
  } | null;
  monitoringDate: string | Date;
  returnDate?: string | Date | null;
  letterNumber?: string | null;
  sppdNumber?: string | null;
  purpose?: string | null;
  transportType?: string | null;
  departurePlace?: string | null;
  destinationPlace?: string | null;
  budgetSource?: string | null;
  budgetAccount?: string | null;
  suratTugasUrl?: string | null;
  sppdUrl?: string | null;
  status?: string;
  notes?: string | null;
}

export interface GeneratorOptions {
  schoolSetting?: {
    name?: string;
    shortName?: string;
    address?: string;
    phone?: string;
    email?: string;
    headmaster?: string;
    headmasterNip?: string;
  };
  useTteTags?: boolean; // default: true (mempertahankan ${...})
}

// Helper format tanggal Indonesia
export function formatIndonesianDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// Helper format rentang tanggal Indonesia dinamis
export function formatIndonesianDateRange(
  startInput: string | Date | null | undefined,
  endInput?: string | Date | null | undefined
): string {
  if (!startInput) return '-';
  const start = new Date(startInput);
  if (isNaN(start.getTime())) return String(startInput);

  if (!endInput) return formatIndonesianDate(start);
  const end = new Date(endInput);
  if (isNaN(end.getTime())) return formatIndonesianDate(start);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) return formatIndonesianDate(start);

  const sameMonthYear =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();

  if (sameMonthYear) {
    return `${start.getDate()} s.d. ${end.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`;
  }

  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameYear) {
    return `${start.getDate()} ${months[start.getMonth()]} s.d. ${end.getDate()} ${months[end.getMonth()]} ${start.getFullYear()}`;
  }

  return `${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()} s.d. ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
}

// Helper format rentang tanggal ringkas resmi SPPD (contoh: 1 - 2 September 2026)
export function formatSppdDateRange(
  startInput: string | Date | null | undefined,
  endInput?: string | Date | null | undefined
): string {
  if (!startInput) return '';
  const start = new Date(startInput);
  if (isNaN(start.getTime())) return '';

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  if (!endInput) {
    return `${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`;
  }

  const end = new Date(endInput);
  if (isNaN(end.getTime())) {
    return `${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`;
  }

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) {
    return `${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`;
  }

  const sameMonthYear =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();

  if (sameMonthYear) {
    return `${start.getDate()} - ${end.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`;
  }

  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameYear) {
    return `${start.getDate()} ${months[start.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]} ${start.getFullYear()}`;
  }

  return `${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()} - ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
}

// Helper format hari dan rentang tanggal Indonesia (contoh: pada hari Selasa - Rabu tanggal 1 – 2 September 2026)
export function formatIndonesianDayAndDateRange(
  startInput: string | Date | null | undefined,
  endInput?: string | Date | null | undefined
): string {
  if (!startInput) return '';
  const start = new Date(startInput);
  if (isNaN(start.getTime())) return '';

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const startDay = days[start.getDay()];

  if (!endInput) {
    return `pada hari ${startDay} tanggal ${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`;
  }

  const end = new Date(endInput);
  if (isNaN(end.getTime())) {
    return `pada hari ${startDay} tanggal ${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`;
  }

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) {
    return `pada hari ${startDay} tanggal ${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`;
  }

  const endDay = days[end.getDay()];

  const sameMonthYear =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();

  if (sameMonthYear) {
    return `pada hari ${startDay} - ${endDay} tanggal ${start.getDate()} – ${end.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`;
  }

  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameYear) {
    return `pada hari ${startDay} - ${endDay} tanggal ${start.getDate()} ${months[start.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]} ${start.getFullYear()}`;
  }

  return `pada hari ${startDay} - ${endDay} tanggal ${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()} – ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
}

// Helper hitung jumlah hari perjalanan/kunjungan
export function calculateDurationDays(
  startInput: string | Date | null | undefined,
  endInput?: string | Date | null | undefined
): number {
  if (!startInput) return 1;
  const start = new Date(startInput);
  if (!endInput) return 1;
  const end = new Date(endInput);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return isNaN(diffDays) || diffDays < 1 ? 1 : diffDays;
}

// Helper angka ke terbilang kata Indonesia
export function numberToWordsIndonesian(n: number): string {
  const words = ['Nol', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  if (n <= 11) return words[n] || String(n);
  if (n < 20) return `${words[n - 10]} Belas`;
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return `${words[tens]} Puluh${ones > 0 ? ' ' + words[ones] : ''}`;
  }
  return String(n);
}

/**
 * 📄 KOP SURAT RESMI PEMERINTAH PROVINSI JAWA TENGAH & SMKN 1 ADIWERNA
 */
function getOfficialKopHtml(): string {
  return `
  <div class="kop-container" style="text-align: center; margin-bottom: 20px;">
    <img src="/images/kop-surat-tugas.png" alt="Kop Surat Resmi SMKN 1 Adiwerna" style="width: 100%; max-width: 720px; height: auto; display: block; margin: 0 auto;" onerror="this.onerror=null; this.src='/images/kop-jateng-smkn1adw.png';" />
  </div>
  `;
}

/**
 * 📜 GENERATOR SURAT TUGAS MONITORING PKL (DINAMIS MULTI-GURU, MULTI-INDUSTRI, MULTI-HARI)
 */
export function generateSuratTugasHtml(
  assignment: MonitoringAssignmentData,
  options?: GeneratorOptions
): string {
  const useTte = options?.useTteTags !== false;
  const letterNo = assignment.letterNumber && assignment.letterNumber.trim() !== '' 
    ? assignment.letterNumber 
    : (useTte ? '${nomor_naskah}' : '800.1.11.1 /1000/2026');

  // 1. Rentang Hari & Tanggal Dinamis (contoh: pada hari Selasa - Rabu tanggal 1 – 2 September 2026)
  const dayAndDateStr = formatIndonesianDayAndDateRange(assignment.monitoringDate, assignment.returnDate);
  const signatureDate = formatIndonesianDate(assignment.monitoringDate);

  // 2. Daftar Guru yang Ditugaskan (Jabatan ditulis 'Guru' sesuai arahan resmi)
  const mainTeacher = assignment.teacher;
  const companionList = parseCompanionTeachers(assignment.companionTeachers);

  const allTeachers = [
    {
      name: mainTeacher.name,
      nip: mainTeacher.nip || mainTeacher.username || '-',
      role: 'Guru', // Jabatan selalu 'Guru'
    },
    ...companionList.map((c) => ({
      name: c.name,
      nip: c.nip || '-',
      role: 'Guru', // Jabatan selalu 'Guru'
    })),
  ];

  // 3. Daftar Industri Tujuan (Bisa 1 Industri atau Beberapa Industri Sekaligus)
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

  // TTE Tanda Tangan
  const tteSignatureBlock = useTte
    ? `
      <div style="width: 270px; font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.35; text-align: left;">
        <p style="margin: 0;">Adiwerna, ${signatureDate}</p>
        <p style="margin: 2px 0 0 0;">\${jabatan_pengirim}</p>
        <div style="height: 55px; display: flex; align-items: center;">
          <span style="font-family: monospace; font-size: 9.5pt; color: #334155; background: #f8fafc; padding: 2px 8px; border: 1px dashed #cbd5e1; border-radius: 4px;">
            \${ttd_pengirim}
          </span>
        </div>
        <p style="margin: 0; font-weight: normal;">\${nama_pengirim}</p>
        <p style="margin: 0;">Pembina Utama Muda. IV/c</p>
        <p style="margin: 0;">NIP \${nip_pengirim}</p>
      </div>
    `
    : `
      <div style="width: 270px; font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.35; text-align: left;">
        <p style="margin: 0;">Adiwerna, ${signatureDate}</p>
        <p style="margin: 2px 0 0 0;">Kepala SMK Negeri 1 Adiwerna,</p>
        <div style="height: 55px;"></div>
        <p style="margin: 0; font-weight: bold; text-decoration: underline;">${options?.schoolSetting?.headmaster || 'Joko Pramono, S.Pd., M.Ds'}</p>
        <p style="margin: 0;">Pembina Utama Muda. IV/c</p>
        <p style="margin: 0;">NIP ${options?.schoolSetting?.headmasterNip || '19690316 199802 1 004'}</p>
      </div>
    `;

  const isCompact = allIndustries.length >= 4 || allTeachers.length >= 2;

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Surat Perintah Tugas Monitoring - ${allIndustries[0].name}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: ${isCompact ? '8mm 14mm 8mm 14mm' : '10mm 15mm 10mm 15mm'};
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: ${isCompact ? '11pt' : '11.5pt'};
      line-height: ${isCompact ? '1.32' : '1.45'};
      color: #000;
      background: #fff;
      margin: 0 auto;
      padding: 0;
      max-width: 175mm;
    }
    .text-center { text-align: center; }
    .text-justify { text-align: justify; }
    .font-bold { font-weight: bold; }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        padding: 0;
        max-width: 100%;
      }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>

  <!-- KOP SURAT RESMI -->
  <div class="kop-container" style="text-align: center; margin-bottom: ${isCompact ? '10px' : '20px'};">
    <img src="/images/kop-surat-tugas.png" alt="Kop Surat Resmi SMKN 1 Adiwerna" style="width: 100%; max-width: 720px; height: auto; display: block; margin: 0 auto;" onerror="this.onerror=null; this.src='/images/kop-jateng-smkn1adw.png';" />
  </div>

  <!-- JUDUL SURAT TUGAS & NOMOR -->
  <div style="text-align: center; margin-bottom: 22px;">
    <div style="font-family: 'Times New Roman', Times, serif; font-size: 14pt; font-weight: bold; text-decoration: underline; letter-spacing: 0.5px;">
      SURAT PERINTAH TUGAS
    </div>
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 11pt; margin-top: 3px;">
      Nomor : <span style="background-color: #cbd5e1; padding: 1px 6px;">${letterNo}</span>
    </div>
  </div>

  <!-- KEPALA SMK NEGERI 1 ADIWERNA -->
  <div style="font-family: 'Times New Roman', Times, serif; font-size: 11.5pt; margin-bottom: 16px;">
    Kepala SMK Negeri 1 Adiwerna :
  </div>

  <!-- MEMERINTAHKAN -->
  <div style="text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 12pt; font-weight: bold; letter-spacing: 1.5px; margin-bottom: 16px;">
    MEMERINTAHKAN
  </div>

  <!-- KEPADA (DINAMIS: 1 GURU ATAU BEBERAPA GURU) -->
  <div style="display: flex; margin-bottom: 18px; font-family: 'Times New Roman', Times, serif; font-size: 11.5pt; line-height: 1.45;">
    <div style="width: 100px; flex-shrink: 0;">Kepada</div>
    <div style="width: 25px; flex-shrink: 0;">:</div>
    <div style="flex: 1;">
      <table style="border-collapse: collapse; border: none; width: 100%; font-family: 'Times New Roman', Times, serif; font-size: 11.5pt;">
        <tbody>
          ${
            allTeachers.length === 1
              ? `
              <tr>
                <td style="width: 75px; padding: 1px 0; border: none; vertical-align: top;">Nama</td>
                <td style="width: 20px; padding: 1px 0; border: none; vertical-align: top;">:</td>
                <td style="padding: 1px 0; border: none; vertical-align: top;">${allTeachers[0].name}</td>
              </tr>
              <tr>
                <td style="padding: 1px 0; border: none; vertical-align: top;">NIP</td>
                <td style="padding: 1px 0; border: none; vertical-align: top;">:</td>
                <td style="padding: 1px 0; border: none; vertical-align: top;">${allTeachers[0].nip}</td>
              </tr>
              <tr>
                <td style="padding: 1px 0; border: none; vertical-align: top;">Jabatan</td>
                <td style="padding: 1px 0; border: none; vertical-align: top;">:</td>
                <td style="padding: 1px 0; border: none; vertical-align: top;">Guru</td>
              </tr>
              `
              : allTeachers
                  .map(
                    (t, idx) => `
              <tr>
                <td style="width: 24px; padding: ${idx > 0 ? '8px' : '1px'} 0 1px 0; border: none; vertical-align: top;">${idx + 1}.</td>
                <td style="width: 65px; padding: ${idx > 0 ? '8px' : '1px'} 0 1px 0; border: none; vertical-align: top;">Nama</td>
                <td style="width: 18px; padding: ${idx > 0 ? '8px' : '1px'} 0 1px 0; border: none; vertical-align: top;">:</td>
                <td style="padding: ${idx > 0 ? '8px' : '1px'} 0 1px 0; border: none; vertical-align: top;">${t.name}</td>
              </tr>
              <tr>
                <td></td>
                <td style="padding: 1px 0; border: none; vertical-align: top;">NIP</td>
                <td style="padding: 1px 0; border: none; vertical-align: top;">:</td>
                <td style="padding: 1px 0; border: none; vertical-align: top;">${t.nip}</td>
              </tr>
              <tr>
                <td></td>
                <td style="padding: 1px 0; border: none; vertical-align: top;">Jabatan</td>
                <td style="padding: 1px 0; border: none; vertical-align: top;">:</td>
                <td style="padding: 1px 0; border: none; vertical-align: top;">Guru</td>
              </tr>
              `
                  )
                  .join('')
          }
        </tbody>
      </table>
    </div>
  </div>

  <!-- UNTUK (DINAMIS: RENTANG HARI & TANGGAL, SERTA DAFTAR INDUSTRI) -->
  <div style="display: flex; margin-bottom: 20px; font-family: 'Times New Roman', Times, serif; font-size: 11.5pt; line-height: 1.5;">
    <div style="width: 100px; flex-shrink: 0;">Untuk</div>
    <div style="width: 25px; flex-shrink: 0;">:</div>
    <div style="flex: 1; text-align: justify;">
      
      ${
        allIndustries.length === 1
          ? `${assignment.purpose || 'Melaksanakan kegiatan Monitoring siswa Praktik Kerja Lapangan (PKL)'} ${dayAndDateStr} di ${allIndustries[0].name} yang beralamat di ${allIndustries[0].address || '-'}.`
          : `
            <p style="margin: 0 0 6px 0;">${assignment.purpose || 'Melaksanakan kegiatan Monitoring siswa Praktik Kerja Lapangan (PKL)'} ${dayAndDateStr} di :</p>

            <div style="padding-left: 8px;">
              <table style="border-collapse: collapse; border: none; width: 100%; font-family: 'Times New Roman', Times, serif; font-size: 11.5pt;">
                <tbody>
                  ${allIndustries
                    .map(
                      (ind, idx) => `
                    <tr>
                      <td style="width: 24px; padding: 2px 0; border: none; vertical-align: top;">${idx + 1}.</td>
                      <td style="padding: 2px 0; border: none; vertical-align: top; text-align: justify;">
                        ${ind.name}${ind.address ? ' ' + ind.address : ''}
                      </td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          `
      }
    </div>
  </div>

  <!-- PENUTUP -->
  <div style="font-family: 'Times New Roman', Times, serif; font-size: 11.5pt; line-height: 1.5; text-align: justify; margin-bottom: 45px;">
    Demikian untuk dilaksanakan dengan penuh tanggung jawab dan melaporkan hasil kegiatan selesai melaksanakan tugas.
  </div>

  <!-- KOLOM TANDA TANGAN (KIRI: DITERIMA, KANAN: TTE JATENG / KEPSEK) -->
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 30px;">
    <!-- Kolom Kiri: Diterima -->
    <div style="width: 260px; font-family: 'Times New Roman', Times, serif; font-size: 11.5pt; line-height: 1.4;">
      <p style="margin: 0;">Diterima ……………………….</p>
      <p style="margin: 45px 0 0 0;">……………………………………….</p>
    </div>

    <!-- Kolom Kanan: Tanda Tangan TTE Jateng / Manual -->
    ${tteSignatureBlock}
  </div>

</body>
</html>
`;
}

/**
 * 🚙 GENERATOR SURAT PERINTAH PERJALANAN DINAS (SPPD TTE JATENG)
 */
export function generateSppdHtml(
  assignment: MonitoringAssignmentData,
  options?: GeneratorOptions
): string {
  const useTte = options?.useTteTags !== false;
  const sppdNo = assignment.sppdNumber && assignment.sppdNumber.trim() !== ''
    ? assignment.sppdNumber
    : (useTte ? '${nomor_naskah}' : '090/SPPD/2026');

  const formattedDate = formatIndonesianDate(assignment.monitoringDate);
  const returnDateFormatted = formatIndonesianDate(assignment.returnDate || assignment.monitoringDate);

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

  const allTeachersHtml =
    allTeachers.length === 1
      ? `<div>${allTeachers[0].name}<br/>${allTeachers[0].nip || '-'}</div>`
      : allTeachers
          .map(
            (t, idx) => `
        <div style="margin-bottom: ${idx < allTeachers.length - 1 ? '6px' : '0'}; line-height: 1.35;">
          ${idx + 1}. ${t.name}<br/>
          &nbsp;&nbsp;&nbsp;&nbsp;${t.nip || '-'}
        </div>
      `
          )
          .join('');


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

  const durationDays = calculateDurationDays(assignment.monitoringDate, assignment.returnDate);
  const dateRangeStr = formatSppdDateRange(assignment.monitoringDate, assignment.returnDate);

  const isMany = true; // Selalu gunakan layout kompak F4 karena tabel menampung minimal 4 slot kunjungan

  // TTE Signature Lembar 1 & 2
  const tteSignatureSheet1 = useTte
    ? `
      <div style="width: 280px; text-align: left; font-family: 'Times New Roman', Times, serif; font-size: 9.5pt; line-height: 1.3;">
        <p style="margin: 0;">Dikeluarkan di Adiwerna</p>
        <p style="margin: 0;">Tanggal \${tanggal_naskah}</p>
        <p style="margin: 2px 0 0 0;">\${jabatan_pengirim}</p>
        <div style="height: 35px; display: flex; align-items: center;">
          <span style="color: #64748b; font-family: monospace; font-size: 8.5pt; background: #f8fafc; padding: 2px 6px; border: 1px dashed #cbd5e1; border-radius: 4px;">
            \${ttd_pengirim}
          </span>
        </div>
        <p style="margin: 0; font-weight: normal;">\${nama_pengirim}</p>
        <p style="margin: 0;">NIP \${nip_pengirim}</p>
      </div>
    `
    : `
      <div style="width: 280px; text-align: left; font-family: 'Times New Roman', Times, serif; font-size: 9.5pt; line-height: 1.3;">
        <p style="margin: 0;">Dikeluarkan di Adiwerna</p>
        <p style="margin: 0;">Tanggal ${formattedDate}</p>
        <p style="margin: 2px 0 0 0;">Kepala SMK Negeri 1 Adiwerna,</p>
        <div style="height: 35px;"></div>
        <p style="margin: 0; font-weight: bold; text-decoration: underline;">${options?.schoolSetting?.headmaster || 'Joko Pramono, S.Pd., M.Ds'}</p>
        <p style="margin: 0;">NIP ${options?.schoolSetting?.headmasterNip || '19690316 199802 1 004'}</p>
      </div>
    `;

  // Format Tempat Tujuan: jika hanya 1 industri, cukup tulis 1 tujuan saja tanpa nomor dan titik-titik
  const destinationFormatted =
    allIndustries.length === 1
      ? `${allIndustries[0].name}${allIndustries[0].address ? ' ' + allIndustries[0].address : ''}`
      : allIndustries
          .map(
            (ind, i) =>
              `${i + 1}. ${ind.name}${ind.address ? ' ' + ind.address : ''}`
          )
          .join('<br/>&nbsp;&nbsp;&nbsp;&nbsp;');

  // Helper Angka Romawi untuk Tabel Lembar 2
  const toRoman = (num: number): string => {
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
  };

  // Jumlah baris antara kunjungan (minimal 3 slot agar pas di halaman 2 kertas A4)
  const intermediateCount = Math.max(3, allIndustries.length);
  const intermediateRows = [];
  for (let idx = 0; idx < intermediateCount; idx++) {
    const roman = toRoman(idx + 2);
    const ind = allIndustries[idx];
    const tibaName = ind ? ind.name : '';
    const nextName = allIndustries[idx + 1]?.name || (idx + 1 === allIndustries.length ? 'SMKN 1 Adiwerna' : '');
    intermediateRows.push({ roman, tibaName, nextName });
  }

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>SPPD TTE - ${assignment.industry.name}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: ${isMany ? '6mm 10mm 5mm 10mm' : '8mm 12mm 6mm 12mm'};
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: ${isMany ? '9.5pt' : '10.5pt'};
      line-height: ${isMany ? '1.25' : '1.35'};
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
    }
    .text-center { text-align: center; }
    .text-justify { text-align: justify; }
    .font-bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }
    .page-break { page-break-after: always; }
    
    table.sppd-table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: ${isMany ? '6px' : '10px'};
    }
    table.sppd-table th, table.sppd-table td {
      border: 1px solid #000;
      padding: ${isMany ? '2px 5px' : '3.5px 7px'};
      vertical-align: top;
      font-size: ${isMany ? '8.5pt' : '10pt'};
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .page-break { page-break-after: always; }
    }
  </style>
</head>
<body>

  <!-- ====================================================================== -->
  <!-- 📄 HALAMAN 1: RINCIAN SURAT PERINTAH PERJALANAN DINAS (SPPD) -->
  <!-- ====================================================================== -->
  <div class="kop-container" style="text-align: center; margin-bottom: ${isMany ? '8px' : '16px'};">
    <img src="/images/kop-surat-tugas.png" alt="Kop Surat Resmi SMKN 1 Adiwerna" style="width: 100%; max-width: ${isMany ? '680px' : '720px'}; height: auto; display: block; margin: 0 auto;" onerror="this.onerror=null; this.src='/images/kop-jateng-smkn1adw.png';" />
  </div>

  <div class="text-center" style="margin-bottom: ${isMany ? '6px' : '10px'};">
    <h3 style="margin: 0; font-size: ${isMany ? '10.5pt' : '11.5pt'}; text-decoration: underline; letter-spacing: 0.5px;">SURAT PERINTAH PERJALANAN DINAS (SPPD)</h3>
  </div>

  <table class="sppd-table">
    <tbody>
      <tr>
        <td style="width: 25px; text-align: center;">1</td>
        <td style="width: 240px;">Pengguna Anggaran / Kuasa Pengguna Anggaran</td>
        <td>Kepala SMK Negeri 1 Adiwerna</td>
      </tr>
      <tr>
        <td style="text-align: center;">2</td>
        <td>Nama PNS dan NIP / Pegawai Non PNS / Siswa yang melaksanakan tugas</td>
        <td>${allTeachersHtml}</td>
      </tr>
      <tr>
        <td style="text-align: center;">3</td>
        <td>
          a. Pangkat dan Golongan<br/>
          b. Jabatan / Instansi<br/>
          c. Tingkat menurut perjalanan dinas
        </td>
        <td>
          a. ${mainTeacher.rank || '-'}<br/>
          b. Guru<br/>
          c. Dinas
        </td>
      </tr>
      <tr>
        <td style="text-align: center;">4</td>
        <td>Maksud Perjalanan Dinas</td>
        <td>${assignment.purpose || 'Monitoring murid Praktik Kerja Lapangan'}</td>
      </tr>
      <tr>
        <td style="text-align: center;">5</td>
        <td>Alat angkutan yang digunakan</td>
        <td>${assignment.transportType || 'Kendaraan Pribadi'}</td>
      </tr>
      <tr>
        <td style="text-align: center;">6</td>
        <td>
          a. Tempat berangkat<br/>
          b. Tempat tujuan
        </td>
        <td>
          a. ${assignment.departurePlace || 'SMK Negeri 1 Adiwerna'}<br/>
          b. &nbsp;${destinationFormatted}
        </td>
      </tr>
      <tr>
        <td style="text-align: center;">7</td>
        <td>
          a. Lamanya perjalanan dinas<br/>
          b. Tanggal berangkat<br/>
          c. Tanggal harus kembali
        </td>
        <td>
          a. ${durationDays} Hari<br/>
          b. ${formattedDate}<br/>
          c. ${returnDateFormatted}
        </td>
      </tr>
      <tr>
        <td style="text-align: center;">8</td>
        <td>Pengikut</td>
        <td></td>
      </tr>
      <tr>
        <td style="text-align: center;">9</td>
        <td>
          Pembebanan Anggaran :<br/>
          a. SKPD<br/>
          b. Akun
        </td>
        <td>
          <br/>
          a. ${assignment.budgetSource || 'SMK Negeri 1 Adiwerna'}<br/>
          b. ${assignment.budgetAccount || 'Dana BOS'}
        </td>
      </tr>
      <tr>
        <td style="text-align: center;">10</td>
        <td>Keterangan lain :</td>
        <td>${assignment.notes || ''}</td>
      </tr>
    </tbody>
  </table>

  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: ${isMany ? '3px' : '6px'};">
    <div style="font-size: ${isMany ? '8.5pt' : '9.5pt'}; font-family: 'Times New Roman', Times, serif;">
      Coret yang tidak perlu
    </div>
    ${tteSignatureSheet1}
  </div>

  <!-- PAGE BREAK KE HALAMAN 2 -->
  <div class="page-break"></div>

  <!-- ====================================================================== -->
  <!-- 📄 HALAMAN 2: LEMBAR PENGESAHAN BERANGKAT & TIBA (SESUAI DOKUMEN RESMI) -->
  <!-- ====================================================================== -->
  <div style="font-size: ${isMany ? '8.5pt' : '9.5pt'}; line-height: ${isMany ? '1.2' : '1.3'}; font-family: 'Times New Roman', Times, serif;">
    
    <table class="sppd-table" style="margin-top: ${isMany ? '2px' : '5px'}; width: 100%;">
      <tbody>
        <!-- POIN I: BERANGKAT DARI TEMPAT KEDUDUKAN -->
        <tr>
          <td style="width: 50%; padding: ${isMany ? '3px' : '6px'};"></td>
          <td style="width: 50%; padding: ${isMany ? '3px' : '6px'};">
            <table style="width: 100%; border: none; font-size: ${isMany ? '8.5pt' : '9.5pt'}; line-height: ${isMany ? '1.2' : '1.35'};">
              <tr>
                <td style="width: 120px; border: none; padding: 1px 0; vertical-align: top;">I. Berangkat dari</td>
                <td style="width: 10px; border: none; padding: 1px 0; vertical-align: top;">:</td>
                <td style="border: none; padding: 1px 0; vertical-align: top;">SMKN 1 Adiwerna</td>
              </tr>
              <tr>
                <td style="border: none; padding: 0; font-size: 8pt; color: #334155;" colspan="3">((tempat kedudukan))</td>
              </tr>
              <tr>
                <td style="border: none; padding: 2px 0; vertical-align: top;">Ke</td>
                <td style="border: none; padding: 2px 0; vertical-align: top;">:</td>
                <td style="border: none; padding: 2px 0; vertical-align: top;">
                  ${
                    allIndustries.length === 1
                      ? `${allIndustries[0].name}${allIndustries[0].address ? ' ' + allIndustries[0].address : ''}`
                      : allIndustries
                          .map((ind, i) => `${i + 1}. ${ind.name}${ind.address ? ' ' + ind.address : ''}`)
                          .join('<br/>')
                  }
                </td>
              </tr>
              <tr>
                <td style="border: none; padding: 2px 0; vertical-align: top;">Pada tanggal</td>
                <td style="border: none; padding: 2px 0; vertical-align: top;">:</td>
                <td style="border: none; padding: 2px 0; vertical-align: top;">${dateRangeStr}</td>
              </tr>
            </table>
            <div style="margin-top: ${isMany ? '3px' : '6px'};">
              ${tteSignatureSheet1}
            </div>
          </td>
        </tr>

        <!-- POIN II, III, IV...: TIBA DI INDUSTRI & BERANGKAT KE TUJUAN SELANJUTNYA -->
        ${intermediateRows
          .map(
            (row) => `
        <tr>
          <td style="width: 50%; padding: ${isMany ? '3px 6px' : '5px 7px'}; vertical-align: top;">
            <div><strong>${row.roman}. Tiba di</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${row.tibaName}</div>
            <div style="margin: ${isMany ? '1px 0' : '2px 0'};">Pada Tanggal &nbsp;&nbsp;: </div>
            <div style="margin: ${isMany ? '1px 0' : '2px 0'};">Kepala &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: </div>
            <div style="height: 42px;"></div>
            <div>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div>
            <div style="font-size: 8pt;">NIP. </div>
          </td>
          <td style="width: 50%; padding: ${isMany ? '3px 6px' : '5px 7px'}; vertical-align: top;">
            <div>Berangkat dari : ${row.tibaName}</div>
            <div>Ke &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${row.nextName}</div>
            <div style="margin: ${isMany ? '1px 0' : '2px 0'};">Pada Tanggal &nbsp;&nbsp;: </div>
            <div style="margin: ${isMany ? '1px 0' : '2px 0'};">Kepala &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: </div>
            <div style="height: 42px;"></div>
            <div>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div>
            <div style="font-size: 8pt;">NIP. </div>
          </td>
        </tr>
        `
          )
          .join('')}

        <!-- POIN AKHIR: TIBA DI TEMPAT KEDUDUKAN & PENGESAHAN TELAH DIPERIKSA -->
        <tr>
          <td style="width: 50%; padding: ${isMany ? '2.5px 5px' : '5px 7px'}; vertical-align: top;">
            <div><strong>${toRoman(intermediateCount + 2)}. Tiba di</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: </div>
            <div>(Tempat Kedudukan) : </div>
            <div style="margin: ${isMany ? '1px 0' : '2px 0'};">Pada Tanggal &nbsp;&nbsp;: </div>
            <div style="margin-top: ${isMany ? '2px' : '6px'};">
              ${tteSignatureSheet1}
            </div>
          </td>
          <td style="width: 50%; padding: ${isMany ? '2.5px 5px' : '5px 7px'}; vertical-align: top;">
            <div style="font-size: ${isMany ? '8pt' : '9pt'}; text-align: justify; line-height: 1.25;">
              Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintah pejabat yang berwenang dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya
            </div>
            <div style="margin-top: ${isMany ? '2px' : '6px'};">
              ${tteSignatureSheet1}
            </div>
          </td>
        </tr>

        <!-- POIN CATATAN LAIN-LAIN -->
        <tr>
          <td colspan="2" style="padding: ${isMany ? '2.5px 5px' : '5px 7px'};">
            <div><strong>${toRoman(intermediateCount + 3)}. Catatan Lain-Lain</strong></div>
          </td>
        </tr>
      </tbody>
    </table>

  </div>

</body>
</html>
  `;
}
