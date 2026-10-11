import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase();
    if (!session || !['GURU', 'PEMBIMBING', 'ADMIN', 'SUPER_ADMIN', 'POKJA'].includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teacherId = (session.user as any)?.id;
    const teacherName = (session.user as any)?.name || '';

    // Ambil penugasan di mana guru ini adalah Guru Utama (teacherId)
    // ATAU guru pendamping (companionTeachers JSON mencakup nama/NIP guru ini)
    // DAN dokumen sudah diterbitkan/di-TTE oleh Tata Usaha (status SELESAI_TTE atau memiliki suratTugasUrl/sppdUrl)
    const assignments = await db.monitoringAssignment.findMany({
      where: {
        AND: [
          {
            OR: [
              { teacherId: teacherId },
              {
                companionTeachers: {
                  path: '$[*].name',
                  string_contains: teacherName
                }
              }
            ]
          },
          {
            OR: [
              { status: { in: ['SELESAI_TTE', 'TERBIT_TTE', 'SELESAI'] } },
              { suratTugasUrl: { not: null } },
              { sppdUrl: { not: null } }
            ]
          }
        ]
      },
      include: {
        industry: {
          select: {
            id: true,
            name: true,
            address: true,
            regency: true,
            province: true,
            phone: true,
            contactPerson: true
          }
        },
        teacher: {
          select: {
            id: true,
            name: true,
            nip: true,
            rank: true,
            phone: true
          }
        },
        period: {
          select: {
            id: true,
            name: true,
            academicYear: true
          }
        }
      },
      orderBy: { monitoringDate: 'desc' }
    });

    const mapped = assignments.map((a: any) => ({
      ...a,
      suratTugasDownloadUrl: a.suratTugasUrl ? `/api/persuratan/sppd/file?id=${a.id}&type=tugas` : null,
      sppdDownloadUrl: a.sppdUrl ? `/api/persuratan/sppd/file?id=${a.id}&type=sppd` : null,
      laporanDownloadUrl: a.laporanUrl ? `/api/persuratan/sppd/file?id=${a.id}&type=laporan` : null,
    }));

    return NextResponse.json({
      success: true,
      data: mapped
    });
  } catch (error: any) {
    console.error('Fetch Teacher Assignments Error:', error);
    return NextResponse.json({ error: 'Gagal memuat penugasan guru' }, { status: 500 });
  }
}

