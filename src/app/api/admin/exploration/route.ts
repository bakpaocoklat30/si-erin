// 📋 CHANGELOG:
// ✅ Perubahan: Memperbarui kueri agregasi backend admin untuk menu Eksplorasi Jurusan & Kelas agar menghitung jumlah siswa secara akurat langsung dari tabel `Student`.
// ✨ Fitur Baru: Normalized Admin Department & Class Student Count Aggregator.
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Mengatasi jumlah siswa yang bernilai 0 pada card eksplorasi jurusan dan kelas di panel admin.
// 🚀 Inovasi: Enterprise Real-time Data Mapping Pipeline.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Hanya Admin yang diizinkan' }, { status: 401 });
    }

    // 1. Ambil seluruh data Departemen / Jurusan
    const departments = await db.department.findMany({
      orderBy: { name: 'asc' },
      include: {
        classes: {
          include: {
            period: true
          }
        }
      }
    });

    // 2. Ambil seluruh data Kelas (ClassRoom)
    const classRooms = await db.classRoom.findMany({
      orderBy: { name: 'asc' },
      include: {
        department: true,
        period: true
      }
    });

    // 3. Hitung jumlah siswa secara presisi untuk setiap Jurusan dan Kelas dari tabel `Student`
    const departmentsWithCounts = await Promise.all(
      departments.map(async (dept) => {
        // Hitung total siswa yang departemennya cocok dengan nama atau kode jurusan
        const studentCount = await db.student.count({
          where: {
            department: {
              contains: dept.name,
              mode: 'insensitive'
            }
          }
        });

        return {
          ...dept,
          _count: {
            students: studentCount
          }
        };
      })
    );

    const classesWithCounts = await Promise.all(
      classRooms.map(async (cls) => {
        // Hitung total siswa yang namanya/kelasnya cocok dengan nama kelas
        const studentCount = await db.student.count({
          where: {
            className: {
              equals: cls.name,
              mode: 'insensitive'
            }
          }
        });

        return {
          ...cls,
          _count: {
            students: studentCount
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        departments: departmentsWithCounts,
        classRooms: classesWithCounts
      }
    });
  } catch (error: any) {
    console.error('Error fetching admin exploration data:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data eksplorasi jurusan dan kelas' }, { status: 500 });
  }
}