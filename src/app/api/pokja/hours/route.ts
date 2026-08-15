// 📋 CHANGELOG:
// ✅ Perubahan: Memperbarui filter role pada kueri API guru agar mencakup `GURU`, `POKJA`, dan `PEMBIMBING` secara bersamaan.
// ✨ Fitur Baru: Multi-Role Teacher & Pokja Integration for Class Supervision.
// 🎨 UI/UX Update: N/A (Backend API Endpoint)
// 🔧 Bug Fix: Memastikan akun dengan role POKJA dapat muncul di pilihan dropdown guru pembimbing.
// 🚀 Inovasi: Flexible Cross-Role Assignment Pipeline.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDepartment = (session.user as any)?.department;
    const userRole = (session.user as any)?.role;

    // Ambil tahun pelajaran aktif, daftar tahun ajaran, kelas, alokasi jam, dan guru (GURU, POKJA, PEMBIMBING)
    const [activeAcademicYear, academicYears, classRooms, allocations, teachers, students] = await Promise.all([
      db.academicYear.findFirst({ where: { isActive: true } }),
      db.academicYear.findMany({ orderBy: { year: 'desc' } }),
      db.classRoom.findMany({
        include: { department: true, period: true },
        orderBy: { name: 'asc' }
      }),
      db.teacherHourAllocation.findMany({
        include: {
          teacher: { select: { id: true, name: true, username: true, department: true, role: true } }
        }
      }),
      db.user.findMany({
        // 🔑 Memasukkan GURU, POKJA, dan PEMBIMBING agar bisa dipilih sebagai pembimbing
        where: { 
          role: { in: ['GURU', 'POKJA', 'PEMBIMBING'] } 
        },
        select: { id: true, name: true, username: true, department: true, role: true },
        orderBy: { name: 'asc' }
      }),
      db.student.findMany({
        include: {
          placement: {
            include: { industry: true }
          },
          teacher: { select: { id: true, name: true } }
        },
        orderBy: { name: 'asc' }
      })
    ]);

    let filteredClasses = classRooms;
    if (userRole === 'POKJA' && userDepartment && userDepartment !== 'ALL') {
      filteredClasses = classRooms.filter(c => c.department?.name?.toLowerCase() === userDepartment.toLowerCase());
    }

    return NextResponse.json({ 
      success: true, 
      classRooms: filteredClasses.length > 0 ? filteredClasses : classRooms,
      allocations,
      teachers,
      students,
      academicYears,
      activeAcademicYear: activeAcademicYear ? activeAcademicYear.year : '2025/2026'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { className, teacherId, totalHours, academicYear } = body;

    if (!className || !teacherId || !totalHours) {
      return NextResponse.json({ error: 'Kelas, Guru, dan Jumlah Jam wajib diisi' }, { status: 400 });
    }

    let resolvedAcademicYear = academicYear;
    if (!resolvedAcademicYear) {
      const activeYear = await db.academicYear.findFirst({ where: { isActive: true } });
      resolvedAcademicYear = activeYear ? activeYear.year : '2025/2026';
    }

    const allocation = await db.teacherHourAllocation.create({
      data: {
        className: className.trim(),
        teacherId: teacherId,
        totalHours: parseInt(totalHours),
        academicYear: resolvedAcademicYear,
      },
      include: {
        teacher: { select: { id: true, name: true, username: true, role: true } }
      }
    });

    return NextResponse.json({ success: true, message: 'Alokasi jam guru berhasil ditambahkan', data: allocation });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menyimpan alokasi jam' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { teacherId, studentIds, className } = body;

    if (!teacherId || !className) {
      return NextResponse.json({ error: 'Teacher ID dan Class Name wajib disertakan' }, { status: 400 });
    }

    await db.student.updateMany({
      where: { 
        className: { equals: className, mode: 'insensitive' },
        teacherId: teacherId 
      },
      data: { teacherId: null }
    });

    if (studentIds && studentIds.length > 0) {
      await db.student.updateMany({
        where: { id: { in: studentIds } },
        data: { teacherId: teacherId }
      });
    }

    return NextResponse.json({ success: true, message: 'Mapping siswa bimbingan berhasil diperbarui' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memperbarui mapping siswa' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID alokasi tidak valid' }, { status: 400 });
    }

    await db.teacherHourAllocation.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Alokasi jam berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menghapus data' }, { status: 500 });
  }
}