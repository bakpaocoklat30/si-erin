// 📋 CHANGELOG:
// ✅ Perubahan: Membuat REST API untuk memperbarui atau menetapkan `periodId` secara massal/individual pada model `ClassRoom`.
// ✨ Fitur Baru: Bulk Class Period Assigner Engine.
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Mengizinkan pengosongan periode (`periodId = null`) atau pengikatan ke ID Periode Prakerin tertentu.
// 🚀 Inovasi: Flexible Class-to-Period Relational Controller.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Pokja / Admin' }, { status: 401 });
    }

    const body = await request.json();
    const { classIds, periodId } = body;

    if (!Array.isArray(classIds) || classIds.length === 0) {
      return NextResponse.json({ error: 'Pilih minimal satu kelas untuk ditetapkan periodenya' }, { status: 400 });
    }

    // Jika periodId diberikan, pastikan periode tersebut ada
    if (periodId) {
      const existingPeriod = await db.internshipPeriod.findUnique({
        where: { id: periodId }
      });

      if (!existingPeriod) {
        return NextResponse.json({ error: 'Periode Prakerin yang dipilih tidak ditemukan' }, { status: 404 });
      }
    }

    // Eksekusi pembaruan periodId pada kelas-kelas yang dipilih
    const result = await db.classRoom.updateMany({
      where: {
        id: { in: classIds }
      },
      data: {
        periodId: periodId ? periodId : null
      }
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil menetapkan periode pada ${result.count} kelas!`,
      count: result.count
    });

  } catch (error: any) {
    console.error('Error assigning period to classes:', error);
    return NextResponse.json({ error: error.message || 'Gagal menetapkan periode kelas' }, { status: 500 });
  }
}