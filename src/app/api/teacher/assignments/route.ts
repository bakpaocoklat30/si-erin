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
    const teacherNip = (session.user as any)?.nip || (session.user as any)?.username || '';
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

    // Ambil penugasan di mana dokumen sudah diterbitkan/di-TTE oleh Tata Usaha
    const assignments = await db.monitoringAssignment.findMany({
      where: {
        OR: [
          { status: { in: ['SELESAI_TTE', 'TERBIT_TTE', 'SELESAI'] } },
          { suratTugasUrl: { not: null } },
          { sppdUrl: { not: null } }
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

    // Jika bukan Admin, saring hanya penugasan guru yang bersangkutan (Guru Utama atau Guru Pendamping)
    const cleanName = teacherName.toLowerCase().trim();
    const cleanNip = teacherNip.trim();

    const filteredAssignments = isAdmin
      ? assignments
      : assignments.filter((a: any) => {
          // 1. Cek apakah Guru Utama (berdasarkan teacherId, NIP, atau Nama)
          if (a.teacherId === teacherId) return true;
          if (cleanNip && a.teacher?.nip === cleanNip) return true;
          if (cleanName && a.teacher?.name?.toLowerCase().includes(cleanName)) return true;

          // 2. Cek apakah Guru Pendamping (companionTeachers)
          if (Array.isArray(a.companionTeachers)) {
            return a.companionTeachers.some((c: any) => {
              if (!c) return false;
              if (cleanNip && c.nip && String(c.nip).trim() === cleanNip) return true;
              if (cleanName && c.name && String(c.name).toLowerCase().includes(cleanName)) return true;
              return false;
            });
          }

          return false;
        });

    const mapped = filteredAssignments.map((a: any) => ({
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

