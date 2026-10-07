import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && userRole !== 'POKJA' && userRole !== 'TIM_POKJA')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentIds, status } = await request.json();

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'Tidak ada siswa yang dipilih' }, { status: 400 });
    }

    // Default status is DISETUJUI_INDUSTRI if not provided
    const targetStatus = status || 'DISETUJUI_INDUSTRI';

    const prisma = db as any;

    // Untuk setiap siswa, kita perlu upsert InternshipPlacement di periode aktif
    const activePeriod = await prisma.internshipPeriod.findFirst({
      where: { isActive: true }
    });

    if (!activePeriod) {
      return NextResponse.json({ error: 'Tidak ada periode PKL yang aktif saat ini. Silakan aktifkan periode terlebih dahulu.' }, { status: 400 });
    }

    for (const studentId of studentIds) {
      // Cek apakah siswa sudah punya placement di periode aktif
      const existingPlacement = await prisma.internshipPlacement.findFirst({
        where: { 
          studentId,
          periodId: activePeriod.id
        }
      });

      if (existingPlacement) {
        await prisma.internshipPlacement.update({
          where: { id: existingPlacement.id },
          data: { status: targetStatus }
        });
      } else {
        // Jika belum ada placement di periode aktif, buat baru
        await prisma.internshipPlacement.create({
          data: {
            studentId,
            periodId: activePeriod.id,
            status: targetStatus,
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengubah paksa status ${studentIds.length} siswa menjadi ${targetStatus}.`
    });
  } catch (error: any) {
    console.error('Error in bulk force status:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengubah status massal' }, { status: 500 });
  }
}
