// 📋 CHANGELOG:
// ✅ Perubahan: Menambahkan alias properti ganda (`_count.students`, `studentCount`, `totalStudents`) pada objek respons API kelas dan jurusan agar kompatibel dengan berbagai komponen UI frontend.
// ✨ Fitur Baru: Universal Student Count Alias Pipeline.
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Mengatasi jumlah siswa yang terbaca 0 pada card detail kelas di panel admin.
// 🚀 Inovasi: Enterprise Robust API Data Interoperability.

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

    // 1. Ambil seluruh data Departemen / Jurusan beserta kelasnya
    const departments = await db.department.findMany({
      orderBy: { name: 'asc' },
      include: {
        classes: {
          include: {
            period: true
          },
          orderBy: { name: 'asc' }
        }
      }
    });

    // 2. Hitung jumlah siswa secara presisi untuk setiap Jurusan dan Kelas dari tabel `Student`
    const departmentsWithCounts = await Promise.all(
      departments.map(async (dept) => {
        // Hitung total siswa yang departemennya cocok dengan nama jurusan
        const studentCount = await db.student.count({
          where: {
            department: {
              contains: dept.name,
              mode: 'insensitive'
            }
          }
        });

        // Hitung juga jumlah siswa per kelas di dalam jurusan ini dengan alias lengkap
        const classesWithStudentCounts = await Promise.all(
          dept.classes.map(async (cls) => {
            const classStudentCount = await db.student.count({
              where: {
                className: {
                  equals: cls.name,
                  mode: 'insensitive'
                }
              }
            });

            // Hitung juga siswa yang sudah ditempatkan (placement) di kelas ini jika diperlukan
            const placedStudentCount = await db.student.count({
              where: {
                className: {
                  equals: cls.name,
                  mode: 'insensitive'
                },
                placement: {
                  isNot: null
                }
              }
            });

            return {
              ...cls,
              studentCount: classStudentCount,
              totalStudents: classStudentCount,
              placedCount: placedStudentCount,
              _count: {
                students: classStudentCount,
                placed: placedStudentCount
              }
            };
          })
        );

        return {
          ...dept,
          studentCount: studentCount,
          totalStudents: studentCount,
          classes: classesWithStudentCounts,
          _count: {
            students: studentCount
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: departmentsWithCounts
    });
  } catch (error: any) {
    console.error('Error fetching admin departments exploration:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data eksplorasi jurusan' }, { status: 500 });
  }
}