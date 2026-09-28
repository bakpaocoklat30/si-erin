// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Pembuatan Parser Cerdas CSV Khusus Data Guru & Pegawai SI-ERIN.
// ✨ Fitur Baru:
//    1. RFC 4180 Quote-Aware Tokenizer (Mendukung tanda kutip tunggal dan ganda).
//    2. Auto-Detect Delimiter (Koma `,`, Titik Koma `;` khas Excel Indonesia, atau Tab `\t`).
//    3. Intelligent Auto-Healing untuk nama bergelar (misal: "Erva Agus Tiyarini, M.Pd" tanpa tanda kutip)
//       agar gelar tidak terpotong menjadi kolom NIP.
//    4. Pembersihan BOM UTF-8 Excel dan sanitasi trailing delimiter.
// 🔧 Bug Fix: Menyelesaikan masalah pergeseran kolom CSV saat nama guru memiliki koma gelar akademik
//             dan perbaikan deteksi regex header WhatsApp agar tidak bertabrakan dengan kata 'kepegawaian'.
// 🚀 Inovasi: High-Tolerance Resilient CSV Parsing Engine for Indonesian Educators.
// ----------------------------------------------------------------------

export interface ParsedTeacherRow {
  name: string;
  nip: string;
  employeeType: string;
  jobTitle: string;
  rank: string;
  golongan: string;
  phone: string;
  department: string;
  subject?: string;
  role: string;
}

export function sanitizePhone(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  let p = String(rawPhone).replace(/[^0-9+]/g, '').trim();
  if (p.startsWith('0')) {
    p = '62' + p.substring(1);
  } else if (p.startsWith('+62')) {
    p = p.substring(1);
  }
  // Hanya kembalikan jika memiliki setidaknya 8 digit angka
  return p && p.length >= 8 ? p : '';
}

/**
 * 🧠 Tokenizer satu baris CSV yang memahami tanda kutip tunggal/ganda dan escaped quotes
 */
export function tokenizeCsvLine(line: string, delim: string = ','): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
    } else if (inQuotes && char === quoteChar) {
      if (i + 1 < line.length && line[i + 1] === quoteChar) {
        current += char;
        i++; // lewati escaped quote
      } else {
        inQuotes = false;
        quoteChar = '';
      }
    } else if (!inQuotes && char === delim) {
      tokens.push(current.trim().replace(/^["'](.*)["']$/, '$1').trim());
      current = '';
    } else {
      current += char;
    }
  }
  tokens.push(current.trim().replace(/^["'](.*)["']$/, '$1').trim());
  return tokens;
}

/**
 * 🔎 Deteksi otomatis delimiter CSV berdasarkan baris header
 */
export function detectCsvDelimiter(headerLine: string): string {
  const countSemicolon = (headerLine.match(/;/g) || []).length;
  const countTab = (headerLine.match(/\t/g) || []).length;
  const countComma = (headerLine.match(/,/g) || []).length;

  if (countTab > countComma && countTab > countSemicolon) {
    return '\t';
  }
  if (countSemicolon > countComma) {
    return ';';
  }
  return ',';
}

/**
 * 🚀 FUNGSI UTAMA: Parsing teks CSV guru secara cerdas dengan pemulihan otomatis nama bergelar
 */
export function parseTeachersCsv(csvText: string): ParsedTeacherRow[] {
  if (!csvText || typeof csvText !== 'string' || !csvText.trim()) {
    return [];
  }

  // Bersihkan BOM (Byte Order Mark) jika file diekspor dari Excel
  const cleanedText = csvText.replace(/^\uFEFF/, '').trim();
  const lines = cleanedText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) {
    return [];
  }

  const headerLine = lines[0];
  const delimiter = detectCsvDelimiter(headerLine);
  const rawHeaders = tokenizeCsvLine(headerLine, delimiter);
  
  // Bersihkan kolom kosong di akhir header (misal akibat trailing comma pada header)
  while (rawHeaders.length > 0 && rawHeaders[rawHeaders.length - 1].trim() === '') {
    rawHeaders.pop();
  }

  const headers = rawHeaders.map(h => h.trim().toLowerCase());
  const expectedCols = headers.length;

  // Pemetaan index kolom berdasarkan nama header yang fleksibel
  const nameIdx = headers.findIndex(h => h.includes('nama') || h.includes('name'));
  const nipIdx = headers.findIndex(h => h.includes('nip') || h.includes('nomor induk'));
  const empTypeIdx = headers.findIndex(h => h.includes('kepegawaian') || h.includes('status'));
  const jobTitleIdx = headers.findIndex(h => h.includes('jabatan') || h.includes('fungsional') || h.includes('jobtitle'));
  const rankIdx = headers.findIndex(h => h.includes('pangkat') || h.includes('rank'));
  const golIdx = headers.findIndex(h => h.includes('golongan') || h.includes('ruang') || /(?:^|[\s_.-])gol(?:[\s_.-]|$)/i.test(h));
  
  // Deteksi nomor telepon/WA yang aman dari tabrakan kata 'kepegawaian'
  const phoneIdx = headers.findIndex(h => 
    h.includes('whatsapp') || 
    /(?:^|[\s_.-])wa(?:[\s_.-]|$)/i.test(h) || 
    h.includes('telepon') || 
    h.includes('telp') || 
    h.includes('phone') || 
    /(?:^|[\s_.-])hp(?:[\s_.-]|$)/i.test(h)
  );
  
  const deptIdx = headers.findIndex(h => h.includes('mapel') || h.includes('jurusan') || h.includes('mata pelajaran') || h.includes('department') || h.includes('kompetensi'));
  const roleIdx = headers.findIndex(h => h.includes('role') || h.includes('peran'));

  const hasNewFormat = empTypeIdx !== -1 || jobTitleIdx !== -1 || expectedCols >= 9;

  const result: ParsedTeacherRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    let tokens = tokenizeCsvLine(line, delimiter);
    if (tokens.every(t => t === '')) continue;

    // Bersihkan trailing empty tokens jika kolom terpecah melebihi expectedCols
    while (tokens.length > expectedCols && tokens[tokens.length - 1].trim() === '') {
      tokens.pop();
    }

    // 🛡️ HEURISTIC AUTO-HEALING UNTUK NAMA BERGELAR AKADEMIK
    // Jika delimiter adalah koma dan kolom terpecah melebihi jumlah kolom header yang diharapkan
    if (delimiter === ',' && tokens.length > expectedCols) {
      while (tokens.length > expectedCols && tokens.length >= 3) {
        const token1 = tokens[1].trim();
        const token2 = tokens[2].trim();
        const rawToken2Digits = token2.replace(/[\s-]/g, '');

        // Cek apakah token[2] adalah NIP sesungguhnya (angka 8-25 digit atau tanda '-' untuk honorer)
        const isToken2Nip = /^\d{8,25}$/.test(rawToken2Digits) || 
                            (token2 === '-' && (
                              ['PNS', 'PPPK', 'HONORER'].includes(tokens[3]?.toUpperCase().trim()) ||
                              tokens.length - 1 === expectedCols
                            ));
        
        // Cek apakah token[1] adalah gelar akademik (misal: "M.Pd", "S.Pd.", "S.Kom", dll.)
        const isToken1Gelar = !/^\d{8,25}$/.test(token1.replace(/[\s-]/g, '')) && 
                              (token1.includes('.') || 
                               /^(s\.?pd|m\.?pd|s\.?kom|m\.?kom|s\.?t|m\.?t|s\.?si|m\.?si|s\.?e|m\.?e|s\.?sos|s\.?ag|m\.?ag|m\.?m|dr|drs|dra|a\.?md|a\.?ma|gr\.?|h\.?|hj\.?|m\.?ds|s\.?sn|m\.?sn|prof)/i.test(token1) ||
                               isToken2Nip);

        if (isToken1Gelar || isToken2Nip) {
          // Satukan kembali token[0] dan token[1] sebagai nama lengkap yang utuh
          tokens[0] = `${tokens[0]}, ${tokens[1]}`.trim();
          tokens.splice(1, 1);
        } else {
          break;
        }
      }
    }

    if (tokens.length === 0 || !tokens[0]) continue;

    // Ekstraksi nilai berdasarkan index header atau urutan posisi kolom
    let name = '';
    let nip = '';
    let employeeType = '';
    let jobTitle = 'Guru';
    let rank = '';
    let golongan = '';
    let phone = '';
    let department = 'Umum';
    let role = 'GURU';

    if (nameIdx !== -1 && tokens[nameIdx] !== undefined) {
      name = tokens[nameIdx];
      nip = nipIdx !== -1 && tokens[nipIdx] !== undefined ? tokens[nipIdx] : (tokens[1] || '');
      employeeType = empTypeIdx !== -1 && tokens[empTypeIdx] !== undefined ? tokens[empTypeIdx] : '';
      jobTitle = jobTitleIdx !== -1 && tokens[jobTitleIdx] !== undefined ? tokens[jobTitleIdx] : 'Guru';
      rank = rankIdx !== -1 && tokens[rankIdx] !== undefined ? tokens[rankIdx] : '';
      golongan = golIdx !== -1 && tokens[golIdx] !== undefined ? tokens[golIdx] : '';
      phone = phoneIdx !== -1 && tokens[phoneIdx] !== undefined ? tokens[phoneIdx] : '';
      department = deptIdx !== -1 && tokens[deptIdx] !== undefined ? tokens[deptIdx] : 'Umum';
      role = roleIdx !== -1 && tokens[roleIdx] !== undefined ? tokens[roleIdx] : 'GURU';
    } else {
      // Positional fallback
      name = tokens[0] || '';
      nip = tokens[1] || '';

      if (hasNewFormat || tokens.length >= 9) {
        employeeType = tokens[2] || '';
        jobTitle = tokens[3] || 'Guru';
        rank = tokens[4] || '';
        golongan = tokens[5] || '';
        phone = tokens[6] || '';
        department = tokens[7] || 'Umum';
        role = tokens[8] || 'GURU';
      } else {
        rank = tokens[2] || '';
        golongan = tokens[3] || '';
        phone = tokens[4] || '';
        department = tokens[5] || 'Umum';
        role = tokens[6] || 'GURU';
      }
    }

    // Normalisasi NIP
    const cleanNip = (nip && nip !== '-' && nip !== 'null') ? nip.trim() : '';

    // Normalisasi Jenis Kepegawaian
    let cleanEmpType = employeeType.toUpperCase().trim();
    if (!['PNS', 'PPPK', 'HONORER'].includes(cleanEmpType)) {
      if (golongan && golongan.toUpperCase().includes('IX')) {
        cleanEmpType = 'PPPK';
      } else if (cleanNip) {
        cleanEmpType = 'PNS';
      } else {
        cleanEmpType = 'HONORER';
      }
    }

    // Normalisasi Jabatan Fungsional
    let cleanJobTitle = jobTitle.trim();
    if (cleanJobTitle.toLowerCase().includes('tata usaha') || cleanJobTitle.toLowerCase() === 'tu') {
      cleanJobTitle = 'Tata Usaha';
    } else if (cleanJobTitle.toLowerCase().includes('staff') || cleanJobTitle.toLowerCase().includes('staf')) {
      cleanJobTitle = 'Staff';
    } else {
      cleanJobTitle = 'Guru';
    }

    // Normalisasi Role
    const rawRole = role.toUpperCase().trim();
    const cleanRole = ['POKJA', 'PEMBIMBING', 'ADMIN', 'TATA_USAHA'].includes(rawRole) ? rawRole : 'GURU';

    result.push({
      name: name.trim(),
      nip: cleanNip || '-',
      employeeType: cleanEmpType,
      jobTitle: cleanJobTitle,
      rank: rank.trim(),
      golongan: golongan.trim(),
      phone: sanitizePhone(phone),
      department: department.trim() || 'Umum',
      subject: department.trim() || 'Umum',
      role: cleanRole,
    });
  }

  return result;
}
