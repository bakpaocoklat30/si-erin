import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized - Silakan login terlebih dahulu' }, { status: 401 });
    }

    const userRole = String((session.user as any)?.role || '').toUpperCase().trim();
    const ALLOWED_ROLES = ['POKJA', 'TIM_POKJA', 'ADMIN', 'TATA_USAHA', 'TU', 'SUPER_ADMIN'];
    
    if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Pokja / Admin' }, { status: 401 });
    }

    const userDepartment = (session.user as any)?.department;

    const body = await request.json();
    const { placementIds, industryId, startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Tanggal mulai dan selesai harus diisi.' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    let updatedCount = 0;

    // 1. Coba update berdasarkan placementIds spesifik
    if (Array.isArray(placementIds) && placementIds.length > 0) {
      const res = await db.internshipPlacement.updateMany({
        where: {
          id: { in: placementIds }
        },
        data: {
          startDate: start,
          endDate: end
        }
      });
      updatedCount = res.count;
    }

    // 2. Fallback jika placementIds kosong atau tidak ada baris terupdate, gunakan industryId
    if (updatedCount === 0 && industryId) {
      const fallbackWhere: any = { industryId };
      if (userDepartment && userDepartment.toLowerCase() !== 'semua jurusan' && userRole.includes('POKJA')) {
        fallbackWhere.student = { department: { equals: userDepartment, mode: 'insensitive' } };
      }
      const res = await db.internshipPlacement.updateMany({
        where: fallbackWhere,
        data: {
          startDate: start,
          endDate: end
        }
      });
      updatedCount = res.count;
    }

    if (updatedCount === 0) {
      return NextResponse.json({ 
        error: 'Tidak ada data penempatan siswa yang cocok untuk diperbarui. Pastikan siswa telah terverifikasi.' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memperbarui periode prakerin untuk ${updatedCount} siswa.`,
      updatedCount: updatedCount
    });

  } catch (error: any) {
    console.error('Error updating period:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui periode prakerin' }, { status: 500 });
  }
}
