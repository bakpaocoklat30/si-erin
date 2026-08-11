// 📋 CHANGELOG:
// ✅ Perubahan: Menambahkan filter pengecualian (exclusion) pada kueri `db.student.count()` agar akun staf internal seperti "Pokja" dan "Admin" yang keliru masuk ke tabel Student tidak ikut terhitung sebagai siswa.
// ✨ Fitur Baru: Clean-Student Metrics Filtering Pipeline.
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Mengatasi jumlah siswa binaan yang salah karena tercampur akun pengelola (Admin/Pokja).
// 🚀 Inovasi: Enterprise Data Sanitation & Accurate Analytics.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDepartment = (session.user as any)?.department || '';
    const userRole = (session.user as any)?.role;

    // Filter dasar untuk jurusan
    let studentWhere: any = {};
    if (userRole === 'POKJA' && userDepartment) {
      studentWhere.department = {
        contains: userDepartment,
        mode: 'insensitive'
      };
    }

    // 🔑 PENYARINGAN CERDAS: Kecualikan akun internal (Pokja, Admin, staf) yang tercatat di tabel Student
    studentWhere.AND = [
      {
        NOT: {
          OR: [
            { nis: { equals: 'pokja', mode: 'insensitive' } },
            { nis: { equals: 'admin', mode: 'insensitive' } },
            { name: { contains: 'pokja', mode: 'insensitive' } },
            { name: { contains: 'administrator', mode: 'insensitive' } }
          ]
        }
      }
    ];

    // 1. Hitung Total Siswa Murni (Bersih dari akun Admin & Pokja)
    const totalStudents = await db.student.count({
      where: studentWhere
    });

    // 2. Hitung Total Industri Mitra dari Database
    const totalIndustries = await db.industry.count();

    // 3. Hitung Pengajuan Pending khusus siswa murni
    const pendingVerifications = await db.internshipPlacement.count({
      where: {
        status: { in: ['PENDING', 'Menunggu', 'SUBMITTED'] },
        student: studentWhere
      }
    });

    // 4. Hitung Penempatan Disetujui khusus siswa murni
    const approvedPlacements = await db.internshipPlacement.count({
      where: {
        status: { in: ['APPROVED', 'ACCEPTED', 'Diterima', 'Disetujui'] },
        student: studentWhere
      }
    });

    // 5. Ambil SEMUA Periode yang berstatus AKTIF (Multi-Active Periods)
    const activePeriods = await db.internshipPeriod.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    // 6. Ambil Pengajuan Terbaru
    const recentApplications = await db.internshipPlacement.findMany({
      where: {
        student: studentWhere
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: { name: true, className: true, department: true }
        },
        industry: {
          select: { name: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        userDepartment: userDepartment || 'Semua Jurusan',
        stats: {
          totalStudents,
          totalIndustries,
          pendingVerifications,
          approvedPlacements
        },
        activePeriods,
        recentApplications
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Gagal memuat data dashboard' }, { status: 500 });
  }
}