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
 * GET /api/external/industries
 * Mengambil daftar data DUDI/Industri mitra dengan fitur pencarian, filter, dan kuota penempatan.
 */
export async function GET(request: NextRequest) {
  const auth = await validateExternalApiKey(request);
  if (!auth.isValid) {
    return externalApiResponse({ success: false, error: auth.error }, 401);
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const sector = searchParams.get('sector')?.trim();
    const department = searchParams.get('department')?.trim();
    const periodId = searchParams.get('periodId')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { regency: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { sector: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (sector && sector !== 'ALL') {
      where.sector = { equals: sector, mode: 'insensitive' };
    }

    if (department && department !== 'ALL' && department !== 'SEMUA') {
      where.OR = [
        ...(where.OR || []),
        { department: { contains: department, mode: 'insensitive' } },
        { placements: { some: { student: { department: { contains: department, mode: 'insensitive' } } } } }
      ];
    }

    const [total, industries] = await Promise.all([
      db.industry.count({ where }),
      db.industry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          placements: {
            where: periodId ? {
              student: {
                className: { not: '' }
              }
            } : undefined,
            select: {
              id: true,
              status: true,
              student: {
                select: {
                  id: true,
                  name: true,
                  nis: true,
                  className: true,
                  department: true
                }
              }
            }
          },
          _count: {
            select: {
              placements: true,
              monitoringAssignments: true
            }
          }
        }
      })
    ]);

    // Active status filter (siswa yang terkonfirmasi ditempatkan / disetujui / aktif)
    const activeStatuses = ['DITERIMA', 'DISETUJUI_INDUSTRI', 'REQUEST_PENGANTARAN', 'MENUNGGU_PEMBERANGKATAN', 'PENGANTARAN_DITERBITKAN', 'REQUEST_PENARIKAN', 'MENUNGGU_PENARIKAN', 'PENARIKAN_DITERBITKAN', 'DITERIMA_INDUSTRI', 'COMPLETED', 'SELESAI_PKL'];

    const formattedData = industries.map((ind) => {
      const activePlacements = ind.placements.filter((p) => activeStatuses.includes(p.status || ''));
      const activeCount = activePlacements.length;
      const totalQuota = ind.totalQuota ?? 0;
      const remainingQuota = totalQuota === -1 ? 'Unlimited' : Math.max(0, totalQuota - activeCount);

      return {
        id: ind.id,
        name: ind.name,
        nib: ind.nib || null,
        npwp: ind.npwp || null,
        sector: ind.sector || 'Teknologi & Informasi',
        workType: ind.workType || 'Onsite',
        quota: {
          total: totalQuota === -1 ? 'Unlimited' : totalQuota,
          activeStudents: activeCount,
          remaining: remainingQuota
        },
        address: {
          full: ind.address || null,
          dusun: ind.dusun || null,
          desaKelurahan: ind.desaKelurahan || null,
          subDistrict: ind.subDistrict || null,
          regency: ind.regency || null,
          province: ind.province || 'Jawa Tengah',
          postalCode: ind.postalCode || null,
          coordinates: (ind.latitude && ind.longitude) ? {
            latitude: ind.latitude,
            longitude: ind.longitude
          } : null
        },
        contact: {
          person: ind.contactPerson || null,
          phone: ind.phone || null,
          fax: ind.fax || null,
          email: ind.email || null,
          website: ind.website || null
        },
        jobDescription: ind.jobDescription || null,
        logoUrl: ind.logoUrl || null,
        totalPlacementsCount: ind._count.placements,
        totalMonitoringCount: ind._count.monitoringAssignments,
        createdAt: ind.createdAt,
        updatedAt: ind.updatedAt
      };
    });

    return externalApiResponse({
      success: true,
      data: formattedData,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('Error GET /api/external/industries:', error);
    return externalApiResponse({ success: false, error: error.message || 'Internal Server Error' }, 500);
  }
}
