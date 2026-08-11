// 📋 CHANGELOG:
// ✅ Perubahan: Membuat endpoint API untuk mengecek status izin PKL kelas siswa berdasarkan `className`.
// ✨ Fitur Baru: Student Class Permission Checker API.
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Menyediakan jembatan data antara status `isAllowedPkl` kelas dan navigasi siswa.
// 🚀 Inovasi: Enterprise Student Authorization Guard.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const className = searchParams.get('className');

    if (!className) {
      return NextResponse.json({ success: true, isAllowedPkl: false });
    }

    const classRoom = await db.classRoom.findUnique({
      where: { name: className }
    });

    return NextResponse.json({ 
      success: true, 
      isAllowedPkl: classRoom ? classRoom.isAllowedPkl : false 
    });
  } catch (error) {
    console.error('Error checking student permission:', error);
    return NextResponse.json({ success: false, isAllowedPkl: false }, { status: 500 });
  }
}