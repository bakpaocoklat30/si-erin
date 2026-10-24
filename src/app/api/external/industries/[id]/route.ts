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
 * GET /api/external/industries/[id]
 * Mengambil detail profil lengkap dari satu mitra industri tertentu.
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
      return externalApiResponse({ success: false, error: 'Parameter ID industri wajib disertakan.' }, 400);
    }

    const industry = await db.industry.findUnique({
      where: { id },
      include: {
        placements: {
          include: {
            student: {
              select: {
                id: true,
                nis: true,
                name: true,
                className: true,
                department: true,
                phone: true
              }
            }
          }
        },
        monitoringAssignments: {
          select: {
            id: true,
            monitoringDate: true,
            status: true,
            letterNumber: true,
            sppdNumber: true,
            teacher: {
              select: {
                id: true,
                name: true,
                nip: true,
                phone: true
              }
            }
          }
        }
      }
    });

    if (!industry) {
      return externalApiResponse({ success: false, error: `Industri dengan ID '${id}' tidak ditemukan.` }, 404);
    }

    const activeStatuses = ['DITERIMA', 'DISETUJUI_INDUSTRI', 'REQUEST_PENGANTARAN', 'MENUNGGU_PEMBERANGKATAN', 'PENGANTARAN_DITERBITKAN', 'REQUEST_PENARIKAN', 'MENUNGGU_PENARIKAN', 'PENARIKAN_DITERBITKAN', 'DITERIMA_INDUSTRI', 'COMPLETED', 'SELESAI_PKL'];
    const activePlacements = industry.placements.filter(p => activeStatuses.includes(p.status || ''));
    const totalQuota = industry.totalQuota ?? 0;
    const remainingQuota = totalQuota === -1 ? 'Unlimited' : Math.max(0, totalQuota - activePlacements.length);

    return externalApiResponse({
      success: true,
      data: {
        id: industry.id,
        name: industry.name,
        nib: industry.nib || null,
        npwp: industry.npwp || null,
        sector: industry.sector || 'Teknologi & Informasi',
        workType: industry.workType || 'Onsite',
        jobDescription: industry.jobDescription || null,
        logoUrl: industry.logoUrl || null,
        quota: {
          total: totalQuota === -1 ? 'Unlimited' : totalQuota,
          activeStudents: activePlacements.length,
          remaining: remainingQuota
        },
        address: {
          full: industry.address || null,
          dusun: industry.dusun || null,
          desaKelurahan: industry.desaKelurahan || null,
          subDistrict: industry.subDistrict || null,
          regency: industry.regency || null,
          province: industry.province || 'Jawa Tengah',
          postalCode: industry.postalCode || null,
          coordinates: (industry.latitude && industry.longitude) ? {
            latitude: industry.latitude,
            longitude: industry.longitude
          } : null
        },
        contact: {
          person: industry.contactPerson || null,
          phone: industry.phone || null,
          fax: industry.fax || null,
          email: industry.email || null,
          website: industry.website || null
        },
        activeStudentsSummary: activePlacements.map(p => ({
          studentId: p.studentId,
          name: p.student?.name,
          nis: p.student?.nis,
          className: p.student?.className,
          department: p.student?.department,
          status: p.status,
          startDate: p.startDate,
          endDate: p.endDate
        })),
        monitoringSummary: industry.monitoringAssignments.map(m => ({
          assignmentId: m.id,
          date: m.monitoringDate,
          status: m.status,
          teacherName: m.teacher?.name,
          teacherPhone: m.teacher?.phone,
          letterNumber: m.letterNumber
        })),
        createdAt: industry.createdAt,
        updatedAt: industry.updatedAt
      }
    });

  } catch (error: any) {
    console.error(`Error GET /api/external/industries/${params?.id}:`, error);
    return externalApiResponse({ success: false, error: error.message || 'Internal Server Error' }, 500);
  }
}
