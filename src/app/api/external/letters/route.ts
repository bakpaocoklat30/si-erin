import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { 
  validateExternalApiKey, 
  handleCorsPreflight, 
  externalApiResponse 
} from '@/lib/api-key-guard';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleCorsPreflight();
}

/**
 * GET /api/external/letters
 * Mengambil daftar seluruh dokumen persuratan PKL (Permohonan, Balasan DUDI, Pengantaran, Penarikan, SPPD Monitoring).
 */
export async function GET(request: NextRequest) {
  const auth = await validateExternalApiKey(request);
  if (!auth.isValid) {
    return externalApiResponse({ success: false, error: auth.error }, 401);
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'all').toLowerCase().trim();
    const industryId = searchParams.get('industryId')?.trim();
    const department = searchParams.get('department')?.trim();
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    const toAbsoluteUrl = (pathStr?: string | null) => {
      if (!pathStr) return null;
      if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) return pathStr;
      return `${baseUrl}${pathStr.startsWith('/') ? '' : '/'}${pathStr}`;
    };

    const letterResults: any[] = [];

    // ==========================================
    // 1. SURAT DARI PENEMPATAN KELOMPOK / SISWA
    // ==========================================
    if (['all', 'permohonan', 'penerjunan', 'penarikan', 'balasan'].includes(type)) {
      const placementWhere: any = {};

      if (industryId) {
        placementWhere.industryId = industryId;
      }

      if (department && department !== 'ALL' && department !== 'SEMUA') {
        placementWhere.student = {
          department: { contains: department, mode: 'insensitive' }
        };
      }

      // Ambil placement yang memiliki minimal satu surat terbit atau terunggah
      placementWhere.OR = [
        { letterNumber: { not: null } },
        { suratTugasUrl: { not: null } },
        { suratBalasanUrl: { not: null } },
        { suratPengantaranUrl: { not: null } },
        { suratPenarikanUrl: { not: null } },
      ];

      const placements = await db.internshipPlacement.findMany({
        where: placementWhere,
        orderBy: { appliedAt: 'desc' },
        include: {
          industry: {
            select: {
              id: true,
              name: true,
              sector: true,
              address: true,
              regency: true
            }
          },
          student: {
            select: {
              id: true,
              name: true,
              nis: true,
              className: true,
              department: true,
              phone: true
            }
          }
        }
      });

      // Cluster ke dalam entitas surat berdasarkan jenis
      for (const p of placements) {
        // A. Surat Permohonan PKL
        if (['all', 'permohonan'].includes(type) && (p.letterNumber || p.suratTugasUrl)) {
          letterResults.push({
            id: `PERMOHONAN_${p.id}`,
            category: 'PERMOHONAN_PKL',
            title: `Surat Permohonan PKL - ${p.industry?.name}`,
            letterNumber: p.letterNumber || '-',
            issuedAt: p.letterUploadedAt || p.appliedAt,
            status: p.suratTugasUrl ? 'DITERBITKAN' : 'MENUNGGU_UPLOAD',
            fileUrl: toAbsoluteUrl(p.suratTugasUrl),
            industry: p.industry,
            student: p.student,
            metadata: {
              uploadedBy: p.letterUploadedBy || 'Tata Usaha'
            }
          });
        }

        // B. Surat Balasan Industri
        if (['all', 'balasan'].includes(type) && p.suratBalasanUrl) {
          letterResults.push({
            id: `BALASAN_${p.id}`,
            category: 'BALASAN_INDUSTRI',
            title: `Surat Balasan DUDI - ${p.industry?.name}`,
            letterNumber: p.letterNumber ? `Ref: ${p.letterNumber}` : '-',
            issuedAt: p.updatedAt,
            status: p.suratBalasanStatus || 'SUDAH_UPLOAD',
            fileUrl: toAbsoluteUrl(p.suratBalasanUrl),
            industry: p.industry,
            student: p.student,
            metadata: {
              statusPenerimaan: p.suratBalasanStatus
            }
          });
        }

        // C. Surat Penerjunan / Pengantaran
        if (['all', 'penerjunan'].includes(type) && (p.nomorPengantaran || p.suratPengantaranUrl)) {
          letterResults.push({
            id: `PENERJUNAN_${p.id}`,
            category: 'PENERJUNAN_PENGANTARAN',
            title: `Surat Tugas Pengantaran / Penerjunan - ${p.industry?.name}`,
            letterNumber: p.nomorPengantaran || '-',
            issuedAt: p.startDate || p.appliedAt,
            status: p.suratPengantaranUrl ? 'DITERBITKAN' : 'MENUNGGU_UPLOAD',
            fileUrl: toAbsoluteUrl(p.suratPengantaranUrl),
            industry: p.industry,
            student: p.student,
            metadata: {
              startDate: p.startDate
            }
          });
        }

        // D. Surat Penarikan PKL
        if (['all', 'penarikan'].includes(type) && (p.nomorPenarikan || p.suratPenarikanUrl)) {
          letterResults.push({
            id: `PENARIKAN_${p.id}`,
            category: 'PENARIKAN_PKL',
            title: `Surat Penarikan PKL - ${p.industry?.name}`,
            letterNumber: p.nomorPenarikan || '-',
            issuedAt: p.endDate || p.appliedAt,
            status: p.suratPenarikanUrl ? 'DITERBITKAN' : 'MENUNGGU_UPLOAD',
            fileUrl: toAbsoluteUrl(p.suratPenarikanUrl),
            industry: p.industry,
            student: p.student,
            metadata: {
              endDate: p.endDate
            }
          });
        }
      }
    }

    // ==========================================
    // 2. SURAT MONITORING & SPPD GURU PEMBIMBING
    // ==========================================
    if (['all', 'monitoring'].includes(type)) {
      const monitorWhere: any = {};
      if (industryId) monitorWhere.industryId = industryId;

      const monitorings = await db.monitoringAssignment.findMany({
        where: monitorWhere,
        orderBy: { monitoringDate: 'desc' },
        include: {
          industry: {
            select: {
              id: true,
              name: true,
              sector: true,
              address: true,
              regency: true
            }
          },
          teacher: {
            select: {
              id: true,
              name: true,
              nip: true,
              phone: true,
              department: true
            }
          }
        }
      });

      for (const m of monitorings) {
        if (m.suratTugasUrl || m.letterNumber) {
          letterResults.push({
            id: `MONITORING_TUGAS_${m.id}`,
            category: 'MONITORING_SURAT_TUGAS',
            title: `Surat Tugas Monitoring - ${m.industry?.name}`,
            letterNumber: m.letterNumber || '-',
            issuedAt: m.monitoringDate,
            status: m.status,
            fileUrl: toAbsoluteUrl(m.suratTugasUrl),
            industry: m.industry,
            teacher: m.teacher,
            metadata: {
              destination: m.destinationPlace,
              monitoringDate: m.monitoringDate,
              laporanUrl: toAbsoluteUrl(m.laporanUrl)
            }
          });
        }

        if (m.sppdUrl || m.sppdNumber) {
          letterResults.push({
            id: `MONITORING_SPPD_${m.id}`,
            category: 'MONITORING_SPPD',
            title: `SPPD Monitoring - ${m.industry?.name}`,
            letterNumber: m.sppdNumber || '-',
            issuedAt: m.monitoringDate,
            status: m.status,
            fileUrl: toAbsoluteUrl(m.sppdUrl),
            industry: m.industry,
            teacher: m.teacher,
            metadata: {
              budgetSource: m.budgetSource,
              transportType: m.transportType
            }
          });
        }
      }
    }

    // Filter berdasarkan teks pencarian nomor surat atau nama industri
    let filtered = letterResults;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(item => 
        (item.letterNumber && item.letterNumber.toLowerCase().includes(q)) ||
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.industry?.name && item.industry.name.toLowerCase().includes(q)) ||
        (item.student?.name && item.student.name.toLowerCase().includes(q))
      );
    }

    const total = filtered.length;
    const paginatedData = filtered.slice(skip, skip + limit);

    return externalApiResponse({
      success: true,
      total,
      data: paginatedData,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('Error GET /api/external/letters:', error);
    return externalApiResponse({ success: false, error: error.message || 'Internal Server Error' }, 500);
  }
}
