import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const body = await request.json();
    const { studentIds, industryId, status } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0 || !industryId || !status) {
      return NextResponse.json({ error: 'Data tidak lengkap. Pilih siswa, industri, dan status.' }, { status: 400 });
    }

    const industry = await db.industry.findUnique({ where: { id: industryId } });

    if (!industry) {
      return NextResponse.json({ error: 'Industri tidak ditemukan.' }, { status: 404 });
    }

    // Generate unique groupId for this manual placement batch
    // This ensures they are grouped together but separated from existing groups
    const groupId = `group_man_${crypto.randomBytes(6).toString('hex')}`;

    for (const studentId of studentIds) {
      const existingPlacement = await db.internshipPlacement.findUnique({
        where: { studentId }
      });

      if (existingPlacement) {
        await db.internshipPlacement.update({
          where: { id: existingPlacement.id },
          data: {
            industryId,
            status,
            stage: status === 'AKTIF' || status === 'DISETUJUI_INDUSTRI' ? 4 : existingPlacement.stage,
            groupId, // assign unique group id
          }
        });
      } else {
        await db.internshipPlacement.create({
          data: {
            studentId,
            industryId,
            status,
            stage: status === 'AKTIF' || status === 'DISETUJUI_INDUSTRI' ? 4 : 1,
            groupId, // assign unique group id
          }
        });
      }
      
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
