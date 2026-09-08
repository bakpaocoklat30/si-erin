// 📋 CHANGELOG:
// ✅ Perubahan: Menyempurnakan HTTP Method GET & PUT pada `/api/pokja/classes` agar mendukung pembacaan terintegrasi (classes, periods, departments) dan mendukung update massal (Bulk Assignment via `classIds`) maupun individual (`id`).
// ✨ Fitur Baru: Unified Dual-Mode Class & Period Management REST API Engine (Single & Bulk Assignment).
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Menghilangkan dependensi ke file route terpisah dan mencegah error role 401.
// 🚀 Inovasi: Enterprise All-in-One Class Relational Controller.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// 1. GET: Ambil Master Kelas (beserta jumlah siswa dari tabel Student), Periode, dan Jurusan
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Pokja / Admin' }, { status: 401 });
    }

    const userDepartment = (session.user as any)?.department;
    const userRole = (session.user as any)?.role;

    const url = new URL(request.url);
    const classesParam = url.searchParams.get('classes') || '';
    const classNames = classesParam ? classesParam.split(',').filter(c => c.trim() !== '') : [];
    const periodIdFilter = url.searchParams.get('periodId') || '';
    const academicYearFilter = url.searchParams.get('academicYear') || '';
    const classNameFilter = url.searchParams.get('className') || '';

    // Filter berdasarkan jurusan jika Pokja memiliki spesifikasi departemen
    let classWhere: any = {};
    if (userRole === 'POKJA' && userDepartment && userDepartment.toLowerCase() !== 'semua jurusan') {
      classWhere = {
        department: {
          name: {
            contains: userDepartment,
            mode: 'insensitive'
          }
        }
      };
    }

    // Ambil data kelas beserta relasi department dan period
    const classRooms = await db.classRoom.findMany({
      where: classWhere,
      include: {
        department: true,
        period: true
      },
      orderBy: { name: 'asc' }
    });

    // Hitung akumulasi siswa per kelas dari tabel Student
    const classesWithCounts = await Promise.all(
      classRooms.map(async (cls) => {
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

    // Ambil master daftar periode dan departemen untuk dropdown penugasan
    const periods = await db.internshipPeriod.findMany({ 
      orderBy: { startDate: 'desc' },
      include: { academicYear: true }
    });
    
    // Hitung status penempatan untuk Donut Chart
    let targetClassNames = [...classNames];
    
    // Jika ada filter periodId atau academicYear
    if (periodIdFilter || academicYearFilter) {
      const classesInPeriod = await db.classRoom.findMany({
        where: periodIdFilter 
          ? { periodId: periodIdFilter } 
          : { period: { academicYear: { year: academicYearFilter } } },
        select: { name: true }
      });
      const periodClassNames = classesInPeriod.map(c => c.name);
      
      if (targetClassNames.length > 0) {
        // Intersect
        targetClassNames = targetClassNames.filter(c => periodClassNames.includes(c));
      } else {
        targetClassNames = periodClassNames;
      }
      
      // Jika setelah filter period ternyata kosong, set ke array dummy agar tidak return semua
      if (targetClassNames.length === 0) {
        targetClassNames = ['__NO_MATCH__']; 
      }
    }

    const studentCondition = targetClassNames.length > 0 
      ? { OR: targetClassNames.map(name => ({ className: { equals: name, mode: 'insensitive' } })) } 
      : {};
      
    const placementCondition = targetClassNames.length > 0 
      ? { OR: targetClassNames.map(name => ({ student: { className: { equals: name, mode: 'insensitive' } } })) } 
      : {};

    const statusDiterima = await db.internshipPlacement.count({ where: { status: { in: ['DITERIMA', 'DISETUJUI_INDUSTRI', 'DITERIMA_INDUSTRI', 'COMPLETED'] }, ...placementCondition } });
    const statusDitolak = await db.internshipPlacement.count({ where: { status: { in: ['DITOLAK', 'DITOLAK_INDUSTRI', 'DITOLAK_POKJA'] }, ...placementCondition } });
    const statusPengajuan = await db.internshipPlacement.count({ where: { status: { in: ['PENGAJUAN_DIKIRIM', 'MENUNGGU_PERSETUJUAN_POKJA'] }, ...placementCondition } });
    const statusProses = await db.internshipPlacement.count({ where: { status: { in: ['DIPROSES_INDUSTRI', 'SURAT_DITERBITKAN', 'REVIEW_POKJA', 'PEMBUATAN_SURAT', 'SENT_DUDI', 'SURAT_TERBIT'] }, ...placementCondition } });
    const totalPlaced = statusDiterima + statusDitolak + statusPengajuan + statusProses;
    const totalSiswaFiltered = await db.student.count({ where: studentCondition as any });
    const belumMengajukan = Math.max(0, totalSiswaFiltered - totalPlaced);

    const departments = await db.department.findMany({ orderBy: { name: 'asc' } });

    return NextResponse.json({
      success: true,
      data: classesWithCounts,
      periods,
      departments,
      stats: {
        diterima: statusDiterima,
        ditolak: statusDitolak,
        menunggu: statusPengajuan + statusProses,
        belum: belumMengajukan,
        total: totalSiswaFiltered
      }
    });

  } catch (error: any) {
    console.error('Error fetching classes for Pokja:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data kelas' }, { status: 500 });
  }
}

// 2. PUT: Perbarui Status Izin PKL / Periode Prakerin (Mendukung Individual & Bulk Massal)
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Pokja / Admin' }, { status: 401 });
    }

    const body = await request.json();
    const { id, classIds, isAllowedPkl, periodId } = body;

    // Skenario A: Update Massal (Bulk Assignment via `classIds`)
    if (Array.isArray(classIds) && classIds.length > 0) {
      const updateData: any = {};
      if (typeof isAllowedPkl === 'boolean') updateData.isAllowedPkl = isAllowedPkl;
      if (periodId !== undefined) updateData.periodId = periodId === 'NONE' ? null : periodId;

      const bulkResult = await db.classRoom.updateMany({
        where: {
          id: { in: classIds }
        },
        data: updateData
      });

      return NextResponse.json({
        success: true,
        message: `Berhasil memperbarui ${bulkResult.count} kelas sekaligus!`,
        count: bulkResult.count
      });
    }

    // Skenario B: Update Individual (via `id`)
    if (!id) {
      return NextResponse.json({ error: 'ID Kelas atau daftar classIds tidak boleh kosong' }, { status: 400 });
    }

    const updateData: any = {};
    if (typeof isAllowedPkl === 'boolean') updateData.isAllowedPkl = isAllowedPkl;
    if (periodId !== undefined) updateData.periodId = periodId === 'NONE' ? null : periodId;

    const updatedClass = await db.classRoom.update({
      where: { id },
      data: updateData,
      include: { department: true, period: true }
    });

    return NextResponse.json({
      success: true,
      message: 'Status izin dan periode kelas berhasil diperbarui!',
      data: updatedClass
    });

  } catch (error: any) {
    console.error('Error updating class:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui kelas' }, { status: 500 });
  }
}