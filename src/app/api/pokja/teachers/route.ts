// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Memperbarui query Prisma pada API endpoint guru untuk mencakup seluruh role pengajar (GURU, PEMBIMBING, POKJA, ADMIN) agar tampil di modal alokasi jam kelas.
// ✨ Fitur Baru: Universal Teacher Inclusion for Assignment Modal Pipeline.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA', 'SUPER_ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    // Ambil semua user dari database yang berpotensi menjadi pembimbing/guru/pokja
    const teachers = await db.user.findMany({
      where: {
        OR: [
          { role: { equals: 'GURU', mode: 'insensitive' } },
          { role: { equals: 'PEMBIMBING', mode: 'insensitive' } },
          { role: { equals: 'TEACHER', mode: 'insensitive' } },
          { role: { equals: 'POKJA', mode: 'insensitive' } },
          { role: { equals: 'ADMIN', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        department: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      data: teachers
    });

  } catch (error: any) {
    console.error('API Fetch Teachers Error:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat daftar guru pembimbing' }, { status: 500 });
  }
}