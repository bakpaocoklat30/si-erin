import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'TATA_USAHA', 'POKJA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [assignments, departments, schoolSetting] = await Promise.all([
      db.monitoringAssignment.findMany({
        where: {
          status: { notIn: ['TERJADWAL', 'DIBATALKAN'] }
        },
        include: {
          industry: {
            select: {
              id: true, name: true, nib: true, sector: true, npwp: true, province: true,
              regency: true, address: true, phone: true, contactPerson: true,
              placements: {
                select: {
                  id: true,
                  studentId: true,
                  status: true,
                  stage: true,
                  student: {
                    select: { id: true, name: true, nis: true, className: true, department: true }
                  }
                }
              }
            }
          },
          teacher: {
            select: { id: true, name: true, username: true, nip: true, rank: true, jobTitle: true, phone: true, department: true }
          },
          period: true,
        },
        orderBy: { updatedAt: 'desc' }
      }),
      db.department.findMany({
        orderBy: { name: 'asc' }
      }),
      db.schoolSetting.findFirst(),
    ]);

    const mappedAssignments = assignments.map((a: any) => ({
      ...a,
      suratTugasUrl: a.suratTugasUrl ? `/api/persuratan/sppd/file?id=${a.id}&type=tugas` : null,
      sppdUrl: a.sppdUrl ? `/api/persuratan/sppd/file?id=${a.id}&type=sppd` : null,
      laporanUrl: a.laporanUrl ? `/api/persuratan/sppd/file?id=${a.id}&type=laporan` : null,
    }));

    return NextResponse.json({
      success: true,
      data: mappedAssignments,
      departments,
      schoolSetting: schoolSetting || null,
    });
  } catch (error: any) {
    console.error('Fetch TTE Tasks Error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}
