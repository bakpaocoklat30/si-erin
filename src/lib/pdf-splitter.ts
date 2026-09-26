import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

/**
 * Ekstraksi teks langsung dari stream PDF via zlib (Fallback murni Node.js tanpa worker)
 */
function extractTextFromPdfStreamBuffer(buffer: Buffer): string {
  const str = buffer.toString('latin1');
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let match: RegExpExecArray | null;
  let text = '';

  while ((match = streamRegex.exec(str)) !== null) {
    try {
      const raw = Buffer.from(match[1], 'latin1');
      let decomp: string;
      try {
        decomp = zlib.inflateSync(raw).toString('latin1');
      } catch {
        decomp = raw.toString('latin1');
      }

      // 1. Ekstrak string format (teks) Tj
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tjMatch: RegExpExecArray | null;
      while ((tjMatch = tjRegex.exec(decomp)) !== null) {
        text += ' ' + tjMatch[1];
      }

      // 2. Ekstrak string hex format <48656C6C6F> Tj
      const hexTjRegex = /<([0-9a-fA-F]+)>\s*Tj/g;
      let hexMatch: RegExpExecArray | null;
      while ((hexMatch = hexTjRegex.exec(decomp)) !== null) {
        try {
          text += ' ' + Buffer.from(hexMatch[1], 'hex').toString('latin1');
        } catch {
          // ignore
        }
      }

      // 3. Ekstrak array format [(teks) 10 (lanjutan)] TJ
      const arrayTjRegex = /\[([^\]]*)\]\s*TJ/g;
      let arrMatch: RegExpExecArray | null;
      while ((arrMatch = arrayTjRegex.exec(decomp)) !== null) {
        const innerRegex = /\(([^)]*)\)/g;
        let inner: RegExpExecArray | null;
        while ((inner = innerRegex.exec(arrMatch[1])) !== null) {
          text += ' ' + inner[1];
        }
      }
    } catch {
      // lanjut ke stream berikutnya
    }
  }

  return text.replace(/\\([()\\])/g, '$1').replace(/\s+/g, ' ').trim();
}

/**
 * Ekstraksi teks dari setiap halaman PDF dengan dukungan PDF terenkripsi/TTE menggunakan pdf-lib & zlib stream
 */
export async function parsePdfPages(buffer: Buffer): Promise<Array<{ pageNum: number; text: string }>> {
  // 1. Dapatkan jumlah halaman yang akurat via pdf-lib (dengan ignoreEncryption & throwOnInvalidObject: false)
  let totalPages = 1;
  let pdfLibDoc: PDFDocument | null = null;
  try {
    pdfLibDoc = await PDFDocument.load(buffer, { ignoreEncryption: true, throwOnInvalidObject: false });
    totalPages = pdfLibDoc.getPageCount();
  } catch (err) {
    console.warn('pdf-lib failed to load document directly:', err);
  }

  // 2. Ekstraksi halaman per halaman secara presisi
  if (pdfLibDoc && totalPages > 0) {
    try {
      const pages: Array<{ pageNum: number; text: string }> = [];
      for (let i = 0; i < totalPages; i++) {
        try {
          const singleDoc = await PDFDocument.create();
          const [copiedPage] = await singleDoc.copyPages(pdfLibDoc, [i]);
          singleDoc.addPage(copiedPage);
          const singleBytes = await singleDoc.save();
          const pageText = extractTextFromPdfStreamBuffer(Buffer.from(singleBytes));
          pages.push({
            pageNum: i + 1,
            text: pageText,
          });
        } catch (pageErr) {
          console.warn(`Error extracting text on page ${i + 1}:`, pageErr);
          pages.push({ pageNum: i + 1, text: '' });
        }
      }
      return pages;
    } catch (streamErr) {
      console.error('Stream extraction failed:', streamErr);
    }
  }

  // Fallback: ekstraksi seluruh buffer
  const globalText = extractTextFromPdfStreamBuffer(buffer);
  return [{ pageNum: 1, text: globalText }];
}

export interface DocumentSegment {
  docType: 'TUGAS' | 'SPPD';
  pageIndices: number[]; // 0-indexed
  pageNumbers: number[]; // 1-indexed (untuk tampilan UI)
  combinedText: string;
}

export interface MatchedResultItem {
  segment: DocumentSegment;
  assignment: any | null;
  score: number;
  matchReasons: string[];
  savedFileUrl?: string;
  savedFileName?: string;
}

export interface BulkUploadAnalysis {
  totalPages: number;
  totalSegments: number;
  matchedCount: number;
  unmatchedCount: number;
  results: MatchedResultItem[];
}

/**
 * Pembersih NIP (hanya angka)
 */
export function cleanNip(nip?: string | null): string {
  return (nip || '').replace(/\D/g, '');
}

/**
 * Pembersih nama dari gelar akademis dan tanda baca
 */
export function cleanName(name?: string | null): string {
  return (name || '')
    .toLowerCase()
    .replace(/\b(drs|dra|s\.pd|m\.pd|s\.t|m\.t|s\.kom|m\.kom|m\.ds|h\.|hj\.|prof|dr|s\.si|m\.si|b\.a)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pembersih nama DUDI/Industri dari prefix PT, CV, Bengkel, dll.
 */
export function cleanIndustryName(name?: string | null): string {
  return (name || '')
    .toLowerCase()
    .replace(/\b(pt|cv|ud|bengkel|klinik|kantor|toko|yayasan|lembaga|dudi|perum|persero)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


/**
 * Deteksi segmentasi dokumen (Surat Tugas vs SPPD) berdasarkan isi halaman
 */
export function detectDocumentSegments(
  pages: Array<{ pageNum: number; text: string }>,
  mode: 'AUTO' | 'TUGAS' | 'SPPD' = 'AUTO'
): DocumentSegment[] {
  const segments: DocumentSegment[] = [];
  const total = pages.length;

  if (mode === 'TUGAS') {
    // Mode Paksa Surat Tugas: Setiap 1 halaman = 1 dokumen Surat Tugas
    for (let i = 0; i < total; i++) {
      segments.push({
        docType: 'TUGAS',
        pageIndices: [i],
        pageNumbers: [i + 1],
        combinedText: pages[i].text,
      });
    }
    return segments;
  }

  if (mode === 'SPPD') {
    // Mode Paksa SPPD: Setiap 2 halaman = 1 dokumen SPPD
    for (let i = 0; i < total; i += 2) {
      const indices = [i];
      const nums = [i + 1];
      let txt = pages[i].text;

      if (i + 1 < total) {
        indices.push(i + 1);
        nums.push(i + 2);
        txt += '\n' + pages[i + 1].text;
      }

      segments.push({
        docType: 'SPPD',
        pageIndices: indices,
        pageNumbers: nums,
        combinedText: txt,
      });
    }
    return segments;
  }

  // MODE AUTO: Deteksi cerdas berdasarkan kata kunci di tiap halaman
  let i = 0;
  while (i < total) {
    const pCurrent = pages[i];
    const curLower = pCurrent.text.toLowerCase();

    const isSppdPage1 =
      curLower.includes('perjalanan dinas') ||
      curLower.includes('sppd') ||
      curLower.includes('pengguna anggaran') ||
      curLower.includes('tingkat menurut perjalanan');

    const isSuratTugas =
      curLower.includes('surat perintah tugas') ||
      curLower.includes('memerintahkan') ||
      curLower.includes('surat tugas');

    if (isSppdPage1 && !isSuratTugas) {
      // Cek apakah halaman berikutnya adalah lembar ke-2 SPPD
      if (i + 1 < total) {
        const nextLower = pages[i + 1].text.toLowerCase();
        const isNextSppdLembar2 =
          nextLower.includes('berangkat dari') ||
          nextLower.includes('tempat kedudukan') ||
          nextLower.includes('tiba di') ||
          nextLower.includes('telah diperiksa') ||
          (!nextLower.includes('surat perintah tugas') && !nextLower.includes('tingkat menurut perjalanan'));

        if (isNextSppdLembar2) {
          segments.push({
            docType: 'SPPD',
            pageIndices: [i, i + 1],
            pageNumbers: [i + 1, i + 2],
            combinedText: pCurrent.text + '\n' + pages[i + 1].text,
          });
          i += 2;
          continue;
        }
      }

      // Fallback jika hanya 1 halaman SPPD
      segments.push({
        docType: 'SPPD',
        pageIndices: [i],
        pageNumbers: [i + 1],
        combinedText: pCurrent.text,
      });
      i += 1;
      continue;
    }

    // Default: Surat Tugas (1 Halaman)
    segments.push({
      docType: 'TUGAS',
      pageIndices: [i],
      pageNumbers: [i + 1],
      combinedText: pCurrent.text,
    });
    i += 1;
  }

  return segments;
}

/**
 * Mencocokkan segment dokumen hasil TTE ke data Penugasan (MonitoringAssignment) di Database
 */
export function matchSegmentToAssignment(
  segment: DocumentSegment,
  assignments: any[]
): {
  assignment: any | null;
  score: number;
  matchReasons: string[];
} {
  const normText = segment.combinedText.toLowerCase();
  const digitsInText = segment.combinedText.replace(/\D/g, '');

  let bestAssignment: any = null;
  let highestScore = 0;
  let bestReasons: string[] = [];

  for (const assign of assignments) {
    let score = 0;
    const reasons: string[] = [];

    // 1. Pencocokan Nomor Surat / Naskah
    const targetNo = segment.docType === 'TUGAS' ? assign.letterNumber : assign.sppdNumber;
    if (targetNo && targetNo.trim() !== '' && targetNo !== '${nomor_naskah}') {
      const cleanNo = targetNo.trim().toLowerCase();
      // Cari potongan nomor resmi
      const parts = cleanNo.split(/[\/\s.-]+/).filter((p: string) => p.length >= 3);
      let numHits = 0;
      for (const p of parts) {
        if (normText.includes(p)) numHits++;
      }
      if (numHits >= 2 || normText.includes(cleanNo)) {
        score += 80;
        reasons.push(`Nomor Naskah Cocok (${targetNo})`);
      }
    }

    // 2. Pencocokan NIP Guru Utama
    const teacherNip = cleanNip(assign.teacher?.nip || assign.teacher?.username);
    if (teacherNip.length >= 8 && digitsInText.includes(teacherNip)) {
      score += 70;
      reasons.push(`NIP Guru Utama Cocok (${assign.teacher.nip || assign.teacher.username})`);
    }

    // 3. Pencocokan NIP Guru Pendamping
    let companionTeachers: any[] = [];
    try {
      if (typeof assign.companionTeachers === 'string') {
        companionTeachers = JSON.parse(assign.companionTeachers);
      } else if (Array.isArray(assign.companionTeachers)) {
        companionTeachers = assign.companionTeachers;
      }
    } catch {
      // ignore
    }

    for (const comp of companionTeachers) {
      const cNip = cleanNip(comp.nip);
      if (cNip.length >= 8 && digitsInText.includes(cNip)) {
        score += 40;
        reasons.push(`NIP Guru Pendamping Cocok (${comp.name} - ${comp.nip})`);
        break;
      }
    }

    // 4. Pencocokan Nama Guru Utama
    const cleanedTeacherName = cleanName(assign.teacher?.name);
    if (cleanedTeacherName.length >= 4) {
      const nameWords = cleanedTeacherName.split(/\s+/).filter((w) => w.length >= 3);
      const matchedWords = nameWords.filter((w) => normText.includes(w));
      if (matchedWords.length === nameWords.length && nameWords.length > 0) {
        score += 50;
        reasons.push(`Nama Guru Lengkap Cocok (${assign.teacher.name})`);
      } else if (matchedWords.length >= 1) {
        score += 25;
        reasons.push(`Bagian Nama Guru Cocok (${matchedWords.join(' ')})`);
      }
    }

    // 5. Pencocokan Nama DUDI / Industri Utama
    const cleanedInd = cleanIndustryName(assign.industry?.name);
    if (cleanedInd.length >= 3) {
      const indWords = cleanedInd.split(/\s+/).filter((w) => w.length >= 3);
      const matchedIndWords = indWords.filter((w) => normText.includes(w));
      if (matchedIndWords.length === indWords.length && indWords.length > 0) {
        score += 45;
        reasons.push(`DUDI Utama Cocok (${assign.industry.name})`);
      } else if (matchedIndWords.length >= 1) {
        score += 20;
        reasons.push(`Sebagian Nama DUDI Cocok (${matchedIndWords.join(' ')})`);
      }
    }

    // 6. Pencocokan Industri Rute Tambahan
    let targetIndustries: any[] = [];
    try {
      if (typeof assign.targetIndustries === 'string') {
        targetIndustries = JSON.parse(assign.targetIndustries);
      } else if (Array.isArray(assign.targetIndustries)) {
        targetIndustries = assign.targetIndustries;
      }
    } catch {
      // ignore
    }

    for (const tInd of targetIndustries) {
      const cTInd = cleanIndustryName(tInd.name);
      if (cTInd.length >= 3 && normText.includes(cTInd)) {
        score += 25;
        reasons.push(`Industri Rute Cocok (${tInd.name})`);
        break;
      }
    }

    // 7. Bonus jika jenis dokumen belum pernah diupload sebelumnya pada penugasan ini
    if (segment.docType === 'TUGAS' && !assign.suratTugasUrl) {
      score += 10;
    } else if (segment.docType === 'SPPD' && !assign.sppdUrl) {
      score += 10;
    }

    if (score > highestScore) {
      highestScore = score;
      bestAssignment = assign;
      bestReasons = reasons;
    }
  }

  // Ambang batas kecocokan minimum: skor 40 (misal: NIP cocok, atau nama + DUDI cocok)
  if (highestScore >= 35 && bestAssignment) {
    return {
      assignment: bestAssignment,
      score: highestScore,
      matchReasons: bestReasons,
    };
  }

  return {
    assignment: null,
    score: highestScore,
    matchReasons: bestReasons,
  };
}

/**
 * Memisahkan dan menyimpan halaman dokumen menjadi berkas PDF mandiri
 */
export async function extractAndSaveSegmentPdf(
  sourcePdfDoc: PDFDocument,
  segment: DocumentSegment,
  assignmentId: string
): Promise<{ fileName: string; fileUrl: string; buffer: Buffer }> {
  const newPdf = await PDFDocument.create();
  const pageCount = sourcePdfDoc.getPageCount();
  const validIndices = segment.pageIndices.filter((idx) => typeof idx === 'number' && idx >= 0 && idx < pageCount);
  const targetIndices = validIndices.length > 0 ? validIndices : [0];
  const copiedPages = await newPdf.copyPages(sourcePdfDoc, targetIndices);
  copiedPages.forEach((p) => newPdf.addPage(p));
  const pdfBytes = await newPdf.save();
  const buffer = Buffer.from(pdfBytes);

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fileName = `TTE_${segment.docType}_${assignmentId}_${Date.now()}.pdf`;
  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, buffer);

  return {
    fileName,
    fileUrl: `/uploads/${fileName}`,
    buffer,
  };
}
