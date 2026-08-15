// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Menyediakan REST API GET untuk mengambil seluruh daftar pengguna ber-role pengajar/guru secara fleksibel guna keperluan dropdown assign/penugasan.
// ✨ Fitur Baru: Universal Teacher Fetching & Resolution Pipeline.
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Memastikan guru hasil import admin dengan berbagai variasi role (GURU, PEMBIMBING, TEACHER) sukses tampil pada daftar pilihan assign.
// 🚀 Inovasi: Robust Multi-Alias Teacher Query Engine.
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
    
    // Validasi hak akses (Hanya Admin dan Pokja yang berhak melihat daftar guru untuk assign)
    if (!session || !['ADMIN', 'POKJA', 'SUPER_ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    // Ambil semua user dari database yang rolenya tergolong sebagai guru/pembimbing/pengajar
    const teachers = await db.user.findMany({
      where: {
        OR: [
          { role: { equals: 'GURU', mode: 'insensitive' } },
          { role: { equals: 'PEMBIMBING', mode: 'insensitive' } },
          { role: { equals: 'TEACHER', mode: 'insensitive' } },
          { role: { equals: 'GURUPMB', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        department: true,
        createdAt: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      count: teachers.length,
      data: teachers
    });

  } catch (error: any) {
    console.error('API Error Fetching Teachers for Assignment:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memuat daftar guru pembimbing' }, 
      { status: 500 }
    );
  }
}