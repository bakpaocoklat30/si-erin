import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { generateDokumentasiFotoHtml } from '@/lib/monitoring-templates';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase();
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'POKJA', 'TIM_POKJA', 'TATA_USAHA', 'GURU', 'PEMBIMBING'].includes(userRole)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return new NextResponse('ID Penugasan tidak valid', { status: 400 });
    }

    const assignment = await db.monitoringAssignment.findUnique({
      where: { id },
      include: {
        industry: {
          select: {
            id: true,
            name: true,
            address: true,
            regency: true,
            province: true,
            phone: true,
            contactPerson: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            username: true,
            nip: true,
            rank: true,
            golongan: true,
            jobTitle: true,
            phone: true,
          },
        },
        period: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    if (!assignment) {
      return new NextResponse('Penugasan monitoring tidak ditemukan', { status: 404 });
    }

    const schoolSetting = await db.schoolSetting.findFirst();

    const html = generateDokumentasiFotoHtml(assignment as any, {
      schoolSetting: schoolSetting || undefined,
      useTteTags: false,
    });

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (err: any) {
    console.error('Error rendering foto monitoring print:', err);
    return new NextResponse('Terjadi kesalahan internal saat membuat dokumen foto', { status: 500 });
  }
}

