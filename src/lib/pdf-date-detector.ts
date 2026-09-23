// ----------------------------------------------------------------------
// 📄 UTILITY: PDF DATE DETECTOR FOR SI-ERIN
// Mendeteksi tanggal resmi surat dari berkas PDF (Text-layer & Content Streams)
// ----------------------------------------------------------------------

const MONTHS_MAP: Record<string, string> = {
  januari: 'Januari',
  februari: 'Februari',
  maret: 'Maret',
  april: 'April',
  mei: 'Mei',
  juni: 'Juni',
  juli: 'Juli',
  agustus: 'Agustus',
  september: 'September',
  oktober: 'Oktober',
  november: 'November',
  desember: 'Desember',
  // Singkatan
  jan: 'Januari',
  feb: 'Februari',
  mar: 'Maret',
  apr: 'April',
  jun: 'Juni',
  jul: 'Juli',
  agu: 'Agustus',
  agt: 'Agustus',
  sep: 'September',
  okt: 'Oktober',
  nov: 'November',
  des: 'Desember',
  // Versi English fallback
  january: 'Januari',
  february: 'Februari',
  march: 'Maret',
  may: 'Mei',
  june: 'Juni',
  july: 'Juli',
  august: 'Agustus',
  october: 'Oktober',
  december: 'Desember'
};

const INDO_MONTH_NAMES = Object.keys(MONTHS_MAP).join('|');

// Regex mencari tanggal dalam teks: "29 April 2026", "Adiwerna, 29 April 2026", "tanggal 29 April 2026"
const DATE_REGEX = new RegExp(
  `\\b([0-3]?[0-9])\\s+(${INDO_MONTH_NAMES})\\s+(20\\d{2})\\b`,
  'i'
);

// Regex numeric fallback: "29-04-2026" atau "29/04/2026"
const NUMERIC_DATE_REGEX = /([0-3]?[0-9])[-/.]([0-1]?[0-9])[-/.](20\d{2})/;

/**
 * Mencoba mengekstrak tanggal dari teks mentah
 */
export function findIndonesianDateInText(text: string): string | null {
  if (!text) return null;

  // 1. Cek pola tanggal bahasa Indonesia (misal: "29 April 2026")
  const match = text.match(DATE_REGEX);
  if (match) {
    const day = parseInt(match[1], 10);
    const rawMonth = match[2].toLowerCase();
    const year = match[3];
    const monthName = MONTHS_MAP[rawMonth] || rawMonth;
    if (day >= 1 && day <= 31) {
      return `${day} ${monthName} ${year}`;
    }
  }

  // 2. Cek pola numerik "29-04-2026" atau "29/04/2026"
  const numMatch = text.match(NUMERIC_DATE_REGEX);
  if (numMatch) {
    const day = parseInt(numMatch[1], 10);
    const monthNum = parseInt(numMatch[2], 10);
    const year = numMatch[3];
    const monthNamesList = [
      '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    if (day >= 1 && day <= 31 && monthNum >= 1 && monthNum <= 12) {
      return `${day} ${monthNamesList[monthNum]} ${year}`;
    }
  }

  return null;
}

/**
 * Ekstraksi dekompresi Flate (zlib deflate) pada browser
 */
async function decompressFlate(bytes: Uint8Array): Promise<string> {
  if (typeof DecompressionStream === 'undefined') {
    return new TextDecoder('latin1').decode(bytes);
  }

  try {
    const ds = new DecompressionStream('deflate');
    const writer = ds.writable.getWriter();
    writer.write(bytes);
    writer.close();

    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }

    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const c of chunks) {
      result.set(c, offset);
      offset += c.length;
    }
    return new TextDecoder('latin1').decode(result);
  } catch {
    return new TextDecoder('latin1').decode(bytes);
  }
}

/**
 * Deteksi tanggal resmi dari dokumen PDF (base64 data URI atau URL)
 */
export async function detectDateFromPdfSource(pdfSource?: string | null): Promise<{
  dateStr: string | null;
  isDetected: boolean;
}> {
  if (!pdfSource || typeof pdfSource !== 'string') {
    return { dateStr: null, isDetected: false };
  }

  try {
    let binaryData: Uint8Array | null = null;

    if (pdfSource.startsWith('data:application/pdf;base64,') || pdfSource.startsWith('data:;base64,')) {
      const base64 = pdfSource.split(',')[1];
      const binaryString = atob(base64);
      const len = binaryString.length;
      binaryData = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        binaryData[i] = binaryString.charCodeAt(i);
      }
    } else if (pdfSource.startsWith('http://') || pdfSource.startsWith('https://') || pdfSource.startsWith('/')) {
      const res = await fetch(pdfSource);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        binaryData = new Uint8Array(arrayBuf);
      }
    }

    if (!binaryData) {
      return { dateStr: null, isDetected: false };
    }

    // 1. Cek langsung pada representasi string latin1
    const rawPdfString = new TextDecoder('latin1').decode(binaryData);
    const directDate = findIndonesianDateInText(rawPdfString);
    if (directDate) {
      return { dateStr: directDate, isDetected: true };
    }

    // 2. Cari stream-stream di dalam PDF dan dekompresi
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match: RegExpExecArray | null;

    // Batasi hingga 15 stream pertama untuk kecepatan
    let count = 0;
    while ((match = streamRegex.exec(rawPdfString)) !== null && count < 15) {
      count++;
      try {
        const streamRawStr = match[1];
        const streamBytes = new Uint8Array(streamRawStr.length);
        for (let j = 0; j < streamRawStr.length; j++) {
          streamBytes[j] = streamRawStr.charCodeAt(j);
        }

        const decompressed = await decompressFlate(streamBytes);
        const detected = findIndonesianDateInText(decompressed);
        if (detected) {
          return { dateStr: detected, isDetected: true };
        }
      } catch {
        // Lanjutkan ke stream berikutnya
      }
    }

    return { dateStr: null, isDetected: false };
  } catch (err) {
    console.warn('Gagal mendeteksi tanggal dari PDF:', err);
    return { dateStr: null, isDetected: false };
  }
}
