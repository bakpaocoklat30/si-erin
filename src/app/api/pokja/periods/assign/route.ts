// 📋 CHANGELOG:
// ✅ Perubahan: Memperkuat logika pemrosesan `periodId` pada endpoint API assign/unassign untuk menangani nilai `null` dengan akurat.
// ✨ Fitur Baru: Robust Class Unassignment Controller.
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Memperbaiki kendala gagal lepas kelas dari periode akibat penanganan nilai null yang terlewat.
// 🚀 Inovasi: Enterprise Transactional Class-Period Relational Sync.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { classIds, periodId } = body; // periodId bisa berupa string (ID periode) atau null/undefined (untuk unassign)

    if (!Array.isArray(classIds) || classIds.length === 0) {
      return NextResponse.json({ error: 'Daftar kelas tidak valid' }, { status: 400 });
    }

    // Eksekusi update massal ke database Prisma
    await db.classRoom.updateMany({
      where: {
        id: { in: classIds }
      },
      data: {
        periodId: periodId ? periodId : null
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: periodId ? 'Daftar kelas berhasil ditugaskan ke periode PKL!' : 'Kelas berhasil dilepas dari periode!' 
    });
  } catch (error) {
    console.error('Error handling class assignment/unassignment:', error);
    return NextResponse.json({ error: 'Gagal memperbarui penugasan kelas' }, { status: 500 });
  }
}