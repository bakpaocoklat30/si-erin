// 📋 CHANGELOG:
// ✅ Perubahan: Menyediakan HTTP GET untuk mengambil daftar seluruh siswa (beserta relasi placement dan industry) & daftar kelas, serta HTTP POST untuk eksekusi reset progress siswa (Individual & Bulk per Kelas).
// ✨ Fitur Baru: All-in-One Admin Reset Progress Data Delivery & Reinitialization Engine.
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Mengatasi "Terjadi kesalahan koneksi saat memuat data siswa" dengan menyediakan endpoint khusus yang mengikutsertakan relasi `placement.industry` secara mutlak.
// 🚀 Inovasi: Resilient Dual-Method Admin Progress Controller.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// 1. GET: Ambil Data Seluruh Siswa (lengkap dengan Placement & Industri) serta Daftar Kelas
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Administrator' }, { status: 401 });
    }

    // Ambil data siswa beserta penempatannya
    const students = await db.student.findMany({
      orderBy: { name: 'asc' },
      include: {
        placement: {
          include: {
            industry: true
          }
        }
      }
    });

    // Ambil daftar master kelas
    const classes = await db.classRoom.findMany({
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      students,
      classes
    });

  } catch (error: any) {
    console.error('Error fetching students for reset page:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data siswa untuk reset progress' }, { status: 500 });
  }
}

// 2. POST: Eksekusi Reset Progress Siswa (HARD_RESET / SOFT_RESET / MASS_CLASS)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Administrator' }, { status: 401 });
    }

    const body = await request.json();
    const { studentIds, className, resetType, targetStatus } = body;

    // Skenario A: Reset Massal per Nama Kelas (className)
    if (resetType === 'MASS_CLASS' && className) {
      const studentsInClass = await db.student.findMany({
        where: { className: { equals: className.trim(), mode: 'insensitive' } },
        select: { id: true }
      });

      const studentIdList = studentsInClass.map(s => s.id);

      if (studentIdList.length === 0) {
        return NextResponse.json({ error: `Tidak ditemukan siswa di kelas ${className}` }, { status: 404 });
      }

      // Hapus seluruh data InternshipPlacement siswa di kelas tersebut
      const deletedPlacements = await db.internshipPlacement.deleteMany({
        where: { studentId: { in: studentIdList } }
      });

      return NextResponse.json({
        success: true,
        message: `Berhasil mereset progress pengajuan ${deletedPlacements.count} siswa di kelas ${className}! Siswa kini dapat mengajukan tempat PKL baru.`,
        resetCount: deletedPlacements.count
      });
    }

    // Skenario B: Reset Individual / Multiple Terpilih (studentIds)
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      if (targetStatus === 'HARD_RESET' || resetType === 'HARD_RESET') {
        // Hapus entri penempatan sama sekali
        const deletedPlacements = await db.internshipPlacement.deleteMany({
          where: { studentId: { in: studentIds } }
        });

        return NextResponse.json({
          success: true,
          message: `Berhasil mereset penuh ${deletedPlacements.count} siswa! Data penempatan dihapus dan siswa dapat memilih DUDI baru.`,
          resetCount: deletedPlacements.count
        });
      } else {
        // Soft reset: Ubah status ke PENGAJUAN_DIKIRIM (Tahap 1)
        const updatedPlacements = await db.internshipPlacement.updateMany({
          where: { studentId: { in: studentIds } },
          data: {
            status: 'PENGAJUAN_DIKIRIM',
            suratTugasUrl: null,
            suratBalasanUrl: null,
            suratBalasanStatus: 'BELUM_UPLOAD',
            appliedAt: new Date()
          }
        });

        return NextResponse.json({
          success: true,
          message: `Berhasil mengembalikan status ${updatedPlacements.count} siswa ke Tahap 1 (Pengajuan Dikirim).`,
          resetCount: updatedPlacements.count
        });
      }
    }

    return NextResponse.json({ error: 'Parameter reset progress tidak valid. Pilih minimal satu siswa atau kelas!' }, { status: 400 });

  } catch (error: any) {
    console.error('Error resetting student progress:', error);
    return NextResponse.json({ error: error.message || 'Gagal mereset progress siswa' }, { status: 500 });
  }
}