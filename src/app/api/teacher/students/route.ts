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

    // Ambil alokasi jam guru ini
    const teacherAllocations = await db.teacherHourAllocation.findMany({
      where: { teacherId },
      select: { className: true, totalHours: true, academicYear: true }
    });

    // Ambil koefisien aktif untuk kalkulasi jam aktual (siswa x koefisien)
    const activePeriod = await db.internshipPeriod.findFirst({
      where: { isActive: true },
      include: { coefficient: true }
    });
    const defaultCoefficient = activePeriod?.coefficient?.coefficient ?? 1.0;

    // Ambil siswa bimbingan dengan industri dan nomor telepon
    const students = await db.student.findMany({
      where: whereClause,
      select: {
        id: true,
        nis: true,
        name: true,
        className: true,
        department: true,
        phone: true,
        placement: {
          select: {
            status: true,
            industry: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                contactPerson: true
              }
            }
          }
        }
      },
      orderBy: [{ className: 'asc' }, { name: 'asc' }]
    });

    // Jika diminta detail per kelas
    if (classNameParam) {
      const classAlloc = teacherAllocations.find(a => a.className.toLowerCase() === classNameParam.trim().toLowerCase());
      const allocatedHours = classAlloc?.totalHours || 0;
      const realHours = Number((students.length * defaultCoefficient).toFixed(2));

      return NextResponse.json({
        success: true,
        className: classNameParam,
        students,
        allocatedHours,
        realHours,
        coefficient: defaultCoefficient
      });
    }

    // Jika diminta daftar kelas (grouping)
    const classMap = new Map();
    let totalStudentsCount = 0;

    students.forEach((s) => {
      totalStudentsCount++;
      const clsName = s.className || 'Tanpa Kelas';
      if (!classMap.has(clsName)) {
        const classAlloc = teacherAllocations.find(a => a.className.toLowerCase() === clsName.trim().toLowerCase());
        classMap.set(clsName, {
          className: clsName,
          department: s.department || 'Teknik Komputer dan Jaringan',
          allocatedHours: classAlloc?.totalHours || 0,
          students: []
        });
      }
      classMap.get(clsName).students.push(s);
    });

    // Hitung jam real per kelas dan total jam real guru
    let totalAllocatedHours = 0;
    let totalRealHours = 0;

    const classesArray = Array.from(classMap.values()).map(c => {
      const studentCount = c.students.length;
      const classRealHours = Number((studentCount * defaultCoefficient).toFixed(2));
      totalAllocatedHours += c.allocatedHours;
      totalRealHours += classRealHours;
      return {
        ...c,
        realHours: classRealHours,
        coefficient: defaultCoefficient
      };
    });

    // Jika ada alokasi kelas di mana guru belum memiliki siswa terplot
    teacherAllocations.forEach(alloc => {
      if (!classMap.has(alloc.className)) {
        totalAllocatedHours += alloc.totalHours;
        classesArray.push({
          className: alloc.className,
          department: 'Teknik Komputer dan Jaringan',
          allocatedHours: alloc.totalHours,
          realHours: 0,
          coefficient: defaultCoefficient,
          students: []
        });
      }
    });

    return NextResponse.json({
      success: true,
      totalStudents: totalStudentsCount,
      totalAllocatedHours,
      totalRealHours: Number(totalRealHours.toFixed(2)),
      coefficient: defaultCoefficient,
      classes: classesArray
    });

  } catch (error: any) {
    console.error('API Teacher Students Error:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data siswa bimbingan' }, { status: 500 });
  }
}