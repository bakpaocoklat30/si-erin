// 📋 CHANGELOG:
// ✅ Perubahan: Menyediakan REST API POST khusus Pokja/Admin untuk mereset password siswa menjadi password default (NIS siswa) atau password kustom baru, lengkap dengan Hashing bcrypt.
// ✨ Fitur Baru: Pokja Student Password Reset Engine with Secure Bcrypt Hashing.
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Menyelaraskan password pada tabel `User` dan data `Student` agar otentikasi NextAuth tetap valid dan dapat login.
// 🚀 Inovasi: Role-Scoped Student Credential Recovery Hub for Pokja.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Pokja / Admin' }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, customPassword } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'ID Siswa wajib disertakan' }, { status: 400 });
    }

    // 1. Cari data siswa berdasarkan ID
    const student = await db.student.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      return NextResponse.json({ error: 'Data siswa tidak ditemukan' }, { status: 404 });
    }

    // Password default disetel ke NIS siswa jika customPassword tidak diisi
    const newPassword = customPassword && customPassword.trim().length >= 6 
      ? customPassword.trim() 
      : student.nis.trim();

    // 2. Hash password baru dengan bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3. Update password di tabel User yang terikat dengan NIS siswa
    const updatedUser = await db.user.updateMany({
      where: { username: student.nis.trim() },
      data: { password: hashedPassword }
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil mereset password siswa "${student.name}" (NIS: ${student.nis}). Password baru: "${newPassword}"`,
      newPassword: newPassword
    });

  } catch (error: any) {
    console.error('Error resetting student password by Pokja:', error);
    return NextResponse.json({ error: error.message || 'Gagal mereset password siswa' }, { status: 500 });
  }
}