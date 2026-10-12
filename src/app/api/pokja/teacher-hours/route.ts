// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Menambahkan validasi pengecekan duplikasi guru per kelas pada method POST agar satu guru tidak dapat di-assign berkali-kali ke kelas yang sama.
// ✨ Fitur Baru: Smart Duplicate Prevention & Master Teachers Pipeline.
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
    if (!session || !['ADMIN', 'POKJA', 'TIM_POKJA', 'SUPER_ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const className = searchParams.get('className');

    const userDepartment = (session.user as any)?.department;
    const userRole = (session.user as any)?.role;
    const isPokjaScoped = userRole === 'POKJA' && userDepartment && userDepartment.toLowerCase() !== 'semua jurusan' && userDepartment.toUpperCase() !== 'ALL';

    // Cari kelas-kelas yang terafiliasi dengan jurusan Pokja ini
    let scopedClassNames: string[] = [];
    if (isPokjaScoped) {
      // 1. Dari tabel ClassRoom berdasarkan relasi Department atau nama kelas
      try {
        const deptClasses = await db.classRoom.findMany({
          where: {
            OR: [
              {
                department: {
                  OR: [
                    { name: { contains: userDepartment, mode: 'insensitive' } },
                    { code: { contains: userDepartment, mode: 'insensitive' } }
                  ]
                }
              },
              { name: { contains: userDepartment, mode: 'insensitive' } }
            ]
          },
          select: { name: true }
        });
        deptClasses.forEach(c => {
          if (!scopedClassNames.includes(c.name)) scopedClassNames.push(c.name);
        });
      } catch (err) {
        console.error('Error fetching dept classes in teacher-hours:', err);
      }

      // 2. Dari tabel Student yang terdaftar di jurusan ini
      try {
        const studentClasses = await db.student.findMany({
          where: {
            department: { contains: userDepartment, mode: 'insensitive' }
          },
          select: { className: true },
          distinct: ['className']
        });
        studentClasses.forEach(s => {
          if (s.className && !scopedClassNames.includes(s.className)) {
            scopedClassNames.push(s.className);
          }
        });
      } catch (err) {
        console.error('Error fetching student classes in teacher-hours:', err);
      }
    } else {
      try {
        const allClassRooms = await db.classRoom.findMany({ select: { name: true } });
        scopedClassNames = allClassRooms.map(c => c.name);
      } catch (err) {
        console.error('Error fetching all classes in teacher-hours:', err);
      }
    }

    let allocationWhere: any = {};
    if (className) {
      allocationWhere.className = { equals: className.trim(), mode: 'insensitive' };
    } else if (isPokjaScoped) {
      allocationWhere.className = { in: scopedClassNames };
    }

    // 1. Ambil alokasi jam guru sesuai scope jurusan
    const allocations = await db.teacherHourAllocation.findMany({
      where: allocationWhere,
      include: { 
        teacher: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            department: true,
            phone: true,
            _count: {
              select: {
                supervisedStudents: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Ambil master data SEMUA GURU / PENGAMPU / POKJA / ADMIN dari database secara inklusif
    const teachers = await db.user.findMany({
      where: {
        OR: [
          { role: { equals: 'GURU', mode: 'insensitive' } },
          { role: { equals: 'PEMBIMBING', mode: 'insensitive' } },
          { role: { equals: 'TEACHER', mode: 'insensitive' } },
          { role: { equals: 'POKJA', mode: 'insensitive' } },
          { role: { equals: 'ADMIN', mode: 'insensitive' } },
          { role: { equals: 'SUPER_ADMIN', mode: 'insensitive' } },
          { role: { equals: 'GURUPMB', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        department: true,
        phone: true,
        _count: {
          select: {
            supervisedStudents: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    let periodInfo = null;
    let coefficientInfo = null;

    let classStudents: any[] = [];

    if (className) {
      // Ambil data siswa di kelas ini langsung untuk memangkas latency jaringan
      classStudents = await db.student.findMany({
        where: {
          className: {
            equals: className.trim(),
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          name: true,
          nis: true,
          className: true,
          teacherId: true,
          teacher: {
            select: { id: true, name: true, username: true }
          },
          placement: {
            select: {
              status: true,
              industry: {
                select: { id: true, name: true, sector: true }
              }
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      // Cari data kelas di master ClassRoom
      const classRoomData = await db.classRoom.findFirst({
        where: { name: { equals: className, mode: 'insensitive' } },
        include: { period: { include: { academicYear: true } } }
      });

      if (classRoomData && classRoomData.period) {
        periodInfo = classRoomData.period;
        const coeff = await db.internshipCoefficient.findFirst({
          where: { 
            OR: [
              { periodName: classRoomData.period.name },
              { academicYear: classRoomData.period.academicYear?.year || '' }
            ]
          }
        });
        coefficientInfo = coeff || null;
      } else {
        const activePeriod = await db.internshipPeriod.findFirst({
          where: { isActive: true },
          include: { academicYear: true }
        });
        if (activePeriod) {
          periodInfo = activePeriod;
          const coeff = await db.internshipCoefficient.findFirst({
            where: { periodName: activePeriod.name }
          });
          coefficientInfo = coeff || null;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      allocations,
      teachers,
      classes: scopedClassNames,
      classStudents,
      periodInfo,
      coefficientInfo
    });
  } catch (error: any) {
    console.error('API Teacher Hours GET Error:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data alokasi jam' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA', 'TIM_POKJA', 'SUPER_ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await request.json();
    const { className, assignments, academicYear } = body; 

    if (!className || !assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({ error: 'Data kelas dan pilihan guru wajib diisi' }, { status: 400 });
    }

    const year = academicYear || '2026/2027';

    // Simpan atau perbarui alokasi guru dengan pencegahan duplikasi per kelas
    for (const item of assignments) {
      if (item.teacherId && item.totalHours !== undefined) {
        // Cek apakah guru ini sudah pernah di-assign ke kelas tersebut
        const existingAllocation = await db.teacherHourAllocation.findFirst({
          where: {
            className: className.trim(),
            teacherId: item.teacherId
          }
        });

        if (existingAllocation) {
          // Jika sudah ada, perbarui total jam dan tahun ajaran
          await db.teacherHourAllocation.update({
            where: { id: existingAllocation.id },
            data: {
              totalHours: parseInt(item.totalHours) || 0,
              academicYear: year
            }
          });
        } else {
          // Jika belum ada, buat record baru
          await db.teacherHourAllocation.create({
            data: {
              className: className.trim(),
              teacherId: item.teacherId,
              totalHours: parseInt(item.totalHours) || 0,
              academicYear: year
            }
          });
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Alokasi guru ke kelas berhasil disimpan tanpa duplikasi' });
  } catch (error: any) {
    console.error('API Teacher Hours POST Error:', error);
    return NextResponse.json({ error: error.message || 'Gagal menyimpan alokasi jam' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA', 'TIM_POKJA', 'SUPER_ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }

    const allocation = await db.teacherHourAllocation.findUnique({ where: { id } });
    if (allocation) {
      await db.student.updateMany({
        where: {
          className: { equals: allocation.className, mode: 'insensitive' },
          teacherId: allocation.teacherId
        },
        data: { teacherId: null }
      });
      await db.teacherHourAllocation.delete({ where: { id } });
    }

    return NextResponse.json({ success: true, message: 'Alokasi jam berhasil dihapus' });
  } catch (error: any) {
    console.error('API Teacher Hours DELETE Error:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus alokasi' }, { status: 500 });
  }
}