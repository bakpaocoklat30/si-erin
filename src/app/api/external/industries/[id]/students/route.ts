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
 * GET /api/external/industries/[id]/students
 * Mengambil daftar seluruh siswa yang ditempatkan / PKL di industri tertentu
 * beserta pembimbing dan status persuratan lengkap.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await validateExternalApiKey(request);
  if (!auth.isValid) {
    return externalApiResponse({ success: false, error: auth.error }, 401);
  }

  try {
    const id = params?.id;
    if (!id) {
      return externalApiResponse({ success: false, error: 'ID industri wajib disertakan.' }, 400);
    }

    const industry = await db.industry.findUnique({
      where: { id },
      select: { id: true, name: true, sector: true, address: true }
    });

    if (!industry) {
      return externalApiResponse({ success: false, error: `Industri dengan ID '${id}' tidak ditemukan.` }, 404);
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status')?.trim();
    const departmentParam = searchParams.get('department')?.trim();
    const classNameParam = searchParams.get('className')?.trim();

    const placementWhere: any = {
      industryId: id,
    };

    if (statusParam && statusParam !== 'ALL') {
      placementWhere.status = { equals: statusParam, mode: 'insensitive' };
    }

    if (departmentParam && departmentParam !== 'ALL') {
      placementWhere.student = {
        ...(placementWhere.student || {}),
        department: { contains: departmentParam, mode: 'insensitive' }
      };
    }

    if (classNameParam && classNameParam !== 'ALL') {
      placementWhere.student = {
        ...(placementWhere.student || {}),
        className: { equals: classNameParam, mode: 'insensitive' }
      };
    }

    const placements = await db.internshipPlacement.findMany({
      where: placementWhere,
      orderBy: { appliedAt: 'desc' },
      include: {
        student: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                nip: true,
                phone: true,
                email: true,
                department: true
              }
            }
          }
        }
      }
    });

    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    const toAbsoluteUrl = (pathStr?: string | null) => {
      if (!pathStr) return null;
      if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) return pathStr;
      return `${baseUrl}${pathStr.startsWith('/') ? '' : '/'}${pathStr}`;
    };

    const studentsData = placements.map((p) => {
      const s = p.student;
      return {
        placementId: p.id,
        status: p.status,
        stage: p.stage,
        appliedAt: p.appliedAt,
        startDate: p.startDate,
        endDate: p.endDate,
        notes: p.notes || null,
        student: {
          id: s?.id,
          nis: s?.nis,
          nisn: s?.nisn || null,
          name: s?.name,
          className: s?.className,
          department: s?.department,
          phone: s?.phone,
          parent: {
            name: s?.parentName || null,
            relation: s?.parentRelation || null,
            phone: s?.parentPhone || null
          },
          isAllowedPkl: s?.isAllowedPkl ?? false,
          bpjs: {
            status: s?.bpjsStatus,
            url: toAbsoluteUrl(s?.bpjsUrl)
          },
          cv: {
            status: s?.cvStatus,
            url: toAbsoluteUrl(s?.cvUrl)
          }
        },
        supervisor: s?.teacher ? {
          id: s.teacher.id,
          name: s.teacher.name,
          nip: s.teacher.nip || null,
          phone: s.teacher.phone || null,
          department: s.teacher.department || null
        } : null,
        documents: {
          permohonan: {
            letterNumber: p.letterNumber || null,
            fileUrl: toAbsoluteUrl(p.suratTugasUrl),
            uploadedBy: p.letterUploadedBy || null,
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
      };
    });

    return externalApiResponse({
      success: true,
      industry: {
        id: industry.id,
        name: industry.name,
        sector: industry.sector,
        address: industry.address
      },
      totalStudents: studentsData.length,
      data: studentsData
    });

  } catch (error: any) {
    console.error(`Error GET /api/external/industries/${params?.id}/students:`, error);
    return externalApiResponse({ success: false, error: error.message || 'Internal Server Error' }, 500);
  }
}
