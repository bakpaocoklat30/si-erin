import { db } from '@/lib/db';

export interface PeriodContext {
  periods: any[];
  groupMap: Map<string, any>;
  classMap: Map<string, any>;
}

/**
 * Memuat konteks lengkap periode PKL, kelompok penempatan, dan kelas secara efisien.
 */
export async function loadPeriodContext(): Promise<PeriodContext> {
  const [periods, groups, classes] = await Promise.all([
    db.internshipPeriod.findMany({
      orderBy: { startDate: 'desc' }
    }),
    db.placementGroup.findMany(),
    db.classRoom.findMany()
  ]);

  const groupMap = new Map<string, any>(groups.map(g => [g.id, g]));
  const classMap = new Map<string, any>(classes.map(c => [c.name.toLowerCase().trim(), c]));

  return { periods, groupMap, classMap };
}

/**
 * Menentukan periode PKL yang tepat untuk suatu penempatan (placement) secara deterministik.
 * Menghindari kebocoran data antar-gelombang (misal: Gasal vs Genap).
 */
export function resolvePlacementPeriod(
  p: {
    groupId?: string | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    student?: { className?: string | null; department?: string | null } | null;
  },
  context: PeriodContext
): any | null {
  const { periods, groupMap, classMap } = context;

  // 1. Prioritaskan jika penempatan terikat ke PlacementGroup (kelompok manual)
  if (p.groupId && groupMap.has(p.groupId)) {
    const g = groupMap.get(p.groupId);
    if (g?.periodId) {
      const match = periods.find(x => x.id === g.periodId);
      if (match) return match;
    }
  }

  // 2. Cek apakah kelas siswa secara eksplisit ditautkan ke periode tertentu
  if (p.student?.className) {
    const cls = classMap.get(p.student.className.toLowerCase().trim());
    if (cls?.periodId) {
      const match = periods.find(x => x.id === cls.periodId);
      if (match) return match;
    }
  }

  // 3. Deteksi berdasarkan tumpang tindih tanggal pelaksanaan (Overlap Engine)
  if (p.startDate && p.endDate) {
    const pStart = new Date(p.startDate).getTime();
    const pEnd = new Date(p.endDate).getTime();

    if (!isNaN(pStart) && !isNaN(pEnd) && pEnd >= pStart) {
      let bestP: any = null;
      let maxOverlap = 0;

      for (const P of periods) {
        if (!P.startDate || !P.endDate) continue;

        // Cek kecocokan jurusan siswa dengan periode
        const studentDept = p.student?.department || '';
        const deptMatch = !studentDept || !P.department || 
          P.department === 'Semua Jurusan' || 
          P.department.toLowerCase().includes(studentDept.toLowerCase()) ||
          studentDept.toLowerCase().includes(P.department.toLowerCase());

        if (!deptMatch) continue;

        const PStart = new Date(P.startDate).getTime();
        const PEnd = new Date(P.endDate).getTime();
        const overlap = Math.max(0, Math.min(pEnd, PEnd) - Math.max(pStart, PStart));

        // Prioritaskan periode jurusan spesifik jika nilai overlap sama
        if (overlap > maxOverlap || (overlap === maxOverlap && overlap > 0 && P.department !== 'Semua Jurusan')) {
          maxOverlap = overlap;
          bestP = P;
        }
      }

      if (bestP) return bestP;
    }
  }

  // 4. Jika hanya memiliki startDate tanpa endDate
  if (p.startDate) {
    const pStart = new Date(p.startDate).getTime();
    if (!isNaN(pStart)) {
      const match = periods.find(P => {
        if (!P.startDate || !P.endDate) return false;
        const PStart = new Date(P.startDate).getTime() - 15 * 86400000;
        const PEnd = new Date(P.endDate).getTime();
        return pStart >= PStart && pStart <= PEnd;
      });
      if (match) return match;
    }
  }

  // 5. Fallback ke periode aktif yang sesuai jurusan siswa
  if (p.student?.department) {
    const sDept = p.student.department.toLowerCase();
    const activeDeptPeriod = periods.find(
      P => P.isActive && P.department && (P.department.toLowerCase().includes(sDept) || sDept.includes(P.department.toLowerCase()))
    );
    if (activeDeptPeriod) return activeDeptPeriod;
  }

  // 6. Fallback umum ke periode aktif pertama
  return periods.find(P => P.isActive) || periods[0] || null;
}

/**
 * Parse konfigurasi `activeIndustries` dari format string/JSON Prisma.
 */
export function parseActiveIndustries(raw: any): Array<{ industryId: string; quota: number; isUnlimited: boolean }> {
  if (!raw) return [];
  let parsed: any[] = [];
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  } else if (Array.isArray(raw)) {
    parsed = raw;
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item: any) => ({
    industryId: String(item.industryId || item.id || ''),
    quota: typeof item.quota === 'number' ? item.quota : (parseInt(item.quota, 10) || 5),
    isUnlimited: Boolean(item.isUnlimited) || item.quota === -1 || item.quota >= 999
  })).filter(x => Boolean(x.industryId));
}

/**
 * Mendapatkan kuota efektif suatu industri pada periode tertentu.
 */
export function getIndustryPeriodQuota(
  industry: { id: string; totalQuota?: number | null },
  period?: any | null
): { totalQuota: number; isUnlimited: boolean } {
  if (period?.activeIndustries) {
    const list = parseActiveIndustries(period.activeIndustries);
    const cfg = list.find(x => x.industryId === industry.id);
    if (cfg) {
      if (cfg.isUnlimited) return { totalQuota: 999, isUnlimited: true };
      return { totalQuota: cfg.quota, isUnlimited: false };
    }
  }

  const rawQuota = industry.totalQuota ?? 0;
  if (rawQuota === -1 || rawQuota >= 999) {
    return { totalQuota: 999, isUnlimited: true };
  }
  return { totalQuota: rawQuota, isUnlimited: false };
}

