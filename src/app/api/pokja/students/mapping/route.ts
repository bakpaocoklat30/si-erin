import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const body = await request.json();
    const { studentIds, industryId, periodId, status } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0 || !industryId || !periodId || !status) {
      return NextResponse.json({ error: 'Data tidak lengkap. Pilih siswa, industri, periode, dan status.' }, { status: 400 });
    }

    // Verify industry and period exist
    const industry = await db.industry.findUnique({ where: { id: industryId } });
    const period = await db.internshipPeriod.findUnique({ where: { id: periodId } });

    if (!industry || !period) {
      return NextResponse.json({ error: 'Industri atau Periode tidak ditemukan.' }, { status: 404 });
    }

    // Process each student
    for (const studentId of studentIds) {
      // Find existing placement
      const existingPlacement = await db.internshipPlacement.findUnique({
        where: { studentId }
      });

      if (existingPlacement) {
        // Update existing placement
        await db.internshipPlacement.update({
          where: { id: existingPlacement.id },
          data: {
            industryId,
            periodId,
            status,
            stage: status === 'AKTIF' || status === 'DISETUJUI_INDUSTRI' ? 4 : existingPlacement.stage,
          }
        });
      } else {
        // Create new placement
        await db.internshipPlacement.create({
          data: {
            studentId,
            industryId,
            periodId,
            status,
            stage: status === 'AKTIF' || status === 'DISETUJUI_INDUSTRI' ? 4 : 1,
          }
        });
      }
      
      // Update student's isAllowedPkl just in case
      await db.student.update({
        where: { id: studentId },
        data: { isAllowedPkl: true }
      });
    }

    return NextResponse.json({ success: true, message: 'Mapping penempatan manual berhasil dilakukan.' });

  } catch (error: any) {
    console.error('Error in manual mapping:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
