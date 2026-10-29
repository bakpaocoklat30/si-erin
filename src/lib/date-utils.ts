// ----------------------------------------------------------------------
// 📅 UTILITY: DATE UTILS FOR SI-ERIN
// Robust parsing & formatting of Indonesian and ISO dates to prevent RangeError
// ----------------------------------------------------------------------

const INDO_MONTHS_MAP: Record<string, string> = {
  januari: 'January',
  februari: 'February',
  maret: 'March',
  april: 'April',
  mei: 'May',
  juni: 'June',
  juli: 'July',
  agustus: 'August',
  september: 'September',
  oktober: 'October',
  november: 'November',
  desember: 'December',
  // Singkatan
  jan: 'January',
  feb: 'February',
  mar: 'March',
  apr: 'April',
  jun: 'June',
  jul: 'July',
  agu: 'August',
  agt: 'August',
  sep: 'September',
  okt: 'October',
  nov: 'November',
  des: 'December'
};

/**
 * Mengubah string tanggal (termasuk format Indonesia seperti "29 Oktober 2026")
 * menjadi objek Date JavaScript yang valid tanpa melempar RangeError.
 */
export function parseSafeDate(dateStr?: string | null): Date {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  
  const trimmed = dateStr.trim();
  if (!trimmed) return new Date();

  // Coba parse native terlebih dahulu (ISO, YYYY-MM-DD, dsb.)
  const native = new Date(trimmed);
  if (!isNaN(native.getTime())) return native;

  // Ganti nama bulan bahasa Indonesia ke bahasa Inggris agar dipahami V8 engine
  let normalized = trimmed;
  for (const [indo, eng] of Object.entries(INDO_MONTHS_MAP)) {
    const regex = new RegExp(`\\b${indo}\\b`, 'i');
    if (regex.test(normalized)) {
      normalized = normalized.replace(regex, eng);
      break;
    }
  }

  const parsed = new Date(normalized);
  if (!isNaN(parsed.getTime())) return parsed;

  return new Date();
}

/**
 * Menghasilkan ISO String (misal: "2026-10-29T00:00:00.000Z") secara aman
 * tanpa risiko melempar RangeError: Invalid time value.
 */
export function toSafeIsoString(dateStr?: string | null): string {
  try {
    return parseSafeDate(dateStr).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Format tanggal ke format resmi Bahasa Indonesia (misal: "29 Oktober 2026").
 */
export function formatDateIndonesia(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = parseSafeDate(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return String(dateStr);
  }
}

/**
 * Menghitung selisih durasi bulan secara aman.
 */
export function calculateDurationMonths(startDateStr?: string | null, endDateStr?: string | null): { months: number; text: string } {
  if (!startDateStr || !endDateStr) return { months: 4, text: 'Empat' };
  try {
    const s = parseSafeDate(startDateStr);
    const e = parseSafeDate(endDateStr);
    
    let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    if (e.getDate() >= 25 || e.getDate() - s.getDate() >= 20) {
      months += 1;
    }
    if (months <= 0) months = 1;

    const words = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas', 'Dua Belas'];
    const text = words[months] || String(months);
    return { months, text };
  } catch {
    return { months: 4, text: 'Empat' };
  }
}
