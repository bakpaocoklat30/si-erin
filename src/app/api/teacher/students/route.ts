// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Memperbaiki typo pada blok penanganan error `catch (error: any)` di API Endpoint GET `/api/teacher/students`.
// ✨ Fitur Baru: Teacher-Centric Student Mentorship API Pipeline (Syntax Fixed).
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
    if (!session || !['ADMIN', 'POKJA', 'GURU', 'PEMBIMBING'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const teacherId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const { searchParams } = new URL(request.url);
    const classNameParam = searchParams.get('className');

    let whereClause: any = {};
    // Jika role guru (bukan admin/pokja), filter berdasarkan teacherId
    if (['GURU', 'PEMBIMBING'].includes(userRole)) {
      whereClause.teacherId = teacherId;
    }

    if (classNameParam) {
      whereClause.className = {
        equals: classNameParam.trim(),
        mode: 'insensitive'
      };
    }

    // Ambil siswa bimbingan
    const students = await db.student.findMany({
      where: whereClause,
      include: {
        placement: {
          include: {
            industry: true
          }
        }
      },
      orderBy: [{ className: 'asc' }, { name: 'asc' }]
    });

    // Jika diminta detail per kelas
    if (classNameParam) {
      return NextResponse.json({
        success: true,
        className: classNameParam,
        students
      });
    }

    // Jika diminta daftar kelas (grouping)
    const classMap = new Map();
    let totalStudentsCount = 0;

    students.forEach((s) => {
      totalStudentsCount++;
      const clsName = s.className || 'Tanpa Kelas';
      if (!classMap.has(clsName)) {
        classMap.set(clsName, {
          className: clsName,
          department: s.department || 'Teknik Komputer dan Jaringan',
          students: []
        });
      }
      classMap.get(clsName).students.push(s);
    });

    const classesArray = Array.from(classMap.values());

    return NextResponse.json({
      success: true,
      totalStudents: totalStudentsCount,
      classes: classesArray
    });

  } catch (error: any) {
    console.error('API Teacher Students Error:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data siswa bimbingan' }, { status: 500 });
  }
}