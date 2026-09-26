import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'TATA_USAHA', 'POKJA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [assignments, departments, schoolSetting] = await Promise.all([
      db.monitoringAssignment.findMany({
        where: {
          OR: [
            { status: { in: ['TERJADWAL', 'MENUNGGU_TTE', 'PROSES_TTE', 'SELESAI_TTE', 'TERBIT_TTE'] } },
            { suratTugasUrl: { not: null } },
            { sppdUrl: { not: null } },
          ],
        },
        include: {
          industry: {
            include: {
              placements: {
                include: {
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

    return NextResponse.json({
      success: true,
      data: assignments,
      departments,
      schoolSetting: schoolSetting || null,
    });
  } catch (error: any) {
    console.error('Fetch TTE Tasks Error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}
