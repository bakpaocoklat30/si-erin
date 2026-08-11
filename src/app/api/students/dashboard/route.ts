// 📋 CHANGELOG:
// ✅ Perubahan: Memindahkan & menormalisasi rute API Dashboard Siswa ke dalam struktur folder terpadu `src/app/api/students/dashboard/route.ts`.
// ✨ Fitur Baru: Standardized Student Scoped API Domain.
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Mengkonsolidasikan endpoint domain siswa agar terpusat di folder `api/students/`.
// 🚀 Inovasi: Enterprise Architectural Directory Consistency.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'SISWA') {
      return NextResponse.json({ error: 'Unauthorized - Hanya Siswa yang diizinkan' }, { status: 401 });
    }

    const nis = session.user.username; // NIS siswa tersimpan pada username session

    if (!nis) {
      return NextResponse.json({ error: 'Identitas NIS siswa tidak ditemukan dalam sesi login' }, { status: 400 });
    }

    // Ambil data profil siswa lengkap dari tabel Student beserta relasi penempatan DUDI
    const student = await db.student.findUnique({
      where: { nis: nis.trim() },
      include: {
        placement: {
          include: {
            industry: true
          }
        }
      }
    });

    if (!student) {
      return NextResponse.json({
        success: true,
        data: {
          nis: nis,
          name: session.user.name || 'Siswa SI-ERIN',
          className: 'Belum Diatur',
          department: (session.user as any)?.department || 'Teknik Komputer dan Jaringan',
          phone: '-',
          isAllowedPkl: false,
          bpjsStatus: 'BELUM_UPLOAD',
          bpjsUrl: null,
          placement: null
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: student
    });
  } catch (error: any) {
    console.error('Error fetching student dashboard data:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data dashboard siswa' }, { status: 500 });
  }
}