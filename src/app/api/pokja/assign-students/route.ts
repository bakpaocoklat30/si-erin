// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Menyempurnakan API `/api/pokja/assign-students` dengan validasi parameter dan error handling yang komprehensif untuk mencegah kesalahan jaringan.
// ✨ Fitur Baru: Robust Student Assignment Backend Handler.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Akses ditolak - Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { teacherId, studentIds } = body;

    if (!teacherId) {
      return NextResponse.json({ error: 'ID Guru pembimbing tidak valid' }, { status: 400 });
    }

    const targetStudentIds = Array.isArray(studentIds) ? studentIds : [];

    // 1. Kosongkan teacherId untuk siswa yang sebelumnya di bawah guru ini
    await db.student.updateMany({
      where: { teacherId },
      data: { teacherId: null }
    }).catch(() => {});

    // 2. Assign teacherId ke siswa-siswa yang dipilih
    if (targetStudentIds.length > 0) {
      await db.student.updateMany({
        where: { id: { in: targetStudentIds } },
        data: { teacherId }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Siswa bimbingan berhasil diperbarui' 
    });

  } catch (error: any) {
    console.error('API Assign Students Error DETAIL:', error);
    return NextResponse.json({ 
      error: error.message || 'Gagal menyimpan penugasan siswa bimbingan di server' 
    }, { status: 500 });
  }
}