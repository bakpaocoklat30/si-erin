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
 * GET /api/external/students
 * Mengambil daftar data siswa beserta status dan detail penempatan PKL secara global.
 */
export async function GET(request: NextRequest) {
  const auth = await validateExternalApiKey(request);
  if (!auth.isValid) {
    return externalApiResponse({ success: false, error: auth.error }, 401);
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const industryId = searchParams.get('industryId')?.trim();
    const department = searchParams.get('department')?.trim();
    const className = searchParams.get('className')?.trim();
    const status = searchParams.get('status')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nis: { contains: search, mode: 'insensitive' } },
        { nisn: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (department && department !== 'ALL' && department !== 'SEMUA') {
      where.department = { contains: department, mode: 'insensitive' };
    }

    if (className && className !== 'ALL') {
      where.className = { equals: className, mode: 'insensitive' };
    }

    if (industryId || (status && status !== 'ALL')) {
      where.placement = {
        ...(industryId ? { industryId } : {}),
        ...(status && status !== 'ALL' ? { status: { equals: status, mode: 'insensitive' } } : {})
      };
    }

    const [total, students] = await Promise.all([
      db.student.count({ where }),
      db.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ className: 'asc' }, { name: 'asc' }],
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              nip: true,
              phone: true,
              department: true
            }
          },
          placement: {
            include: {
              industry: {
                select: {
                  id: true,
                  name: true,
                  sector: true,
                  address: true,
                  regency: true,
                  contactPerson: true,
                  phone: true
                }
              }
            }
          }
        }
      })
    ]);

    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    const toAbsoluteUrl = (pathStr?: string | null) => {
      if (!pathStr) return null;
      if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) return pathStr;
      return `${baseUrl}${pathStr.startsWith('/') ? '' : '/'}${pathStr}`;
    };

    const formattedData = students.map((s) => {
      const p = s.placement;
      return {
        id: s.id,
        nis: s.nis,
        nisn: s.nisn || null,
        name: s.name,
        className: s.className,
        department: s.department,
        phone: s.phone,
        isAllowedPkl: s.isAllowedPkl,
        parent: {
          name: s.parentName || null,
          relation: s.parentRelation || null,
          phone: s.parentPhone || null
        },
        supervisor: s.teacher ? {
          id: s.teacher.id,
          name: s.teacher.name,
          nip: s.teacher.nip || null,
          phone: s.teacher.phone || null,
          department: s.teacher.department || null
        } : null,
        placement: p ? {
          placementId: p.id,
          status: p.status,
          stage: p.stage,
          startDate: p.startDate,
          endDate: p.endDate,
          appliedAt: p.appliedAt,
          industry: p.industry ? {
            id: p.industry.id,
            name: p.industry.name,
            sector: p.industry.sector,
            address: p.industry.address,
            regency: p.industry.regency,
            contactPerson: p.industry.contactPerson,
            phone: p.industry.phone
          } : null,
          documents: {
            permohonan: {
              letterNumber: p.letterNumber || null,
              fileUrl: toAbsoluteUrl(p.suratTugasUrl),
              uploadedAt: p.letterUploadedAt || null
            },
            balasanIndustri: {
              status: p.suratBalasanStatus || 'BELUM_UPLOAD',
              fileUrl: toAbsoluteUrl(p.suratBalasanUrl)
            },
            penerjunanPengantaran: {
              letterNumber: p.nomorPengantaran || null,
              fileUrl: toAbsoluteUrl(p.suratPengantaranUrl)
            },
            penarikan: {
              letterNumber: p.nomorPenarikan || null,
              fileUrl: toAbsoluteUrl(p.suratPenarikanUrl)
            }
          }
        } : null
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
    console.error('Error GET /api/external/students:', error);
    return externalApiResponse({ success: false, error: error.message || 'Internal Server Error' }, 500);
  }
}
