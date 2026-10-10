import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase();
    const userDepartment = (session?.user as any)?.department;

    if (!session || (userRole !== 'POKJA' && userRole !== 'TIM_POKJA' && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId');
    const className = searchParams.get('className');

    // Filter departemen Pokja
    let studentWhere: any = {};
    if (userRole === 'POKJA' || userRole === 'TIM_POKJA') {
      if (userDepartment && userDepartment.toLowerCase() !== 'semua jurusan' && userDepartment.toLowerCase() !== 'all') {
        studentWhere.department = { contains: userDepartment, mode: 'insensitive' };
      }
    }
    
    // Filter by class name if provided
    if (className && className !== 'ALL') {
      studentWhere.className = { equals: className, mode: 'insensitive' };
    } else if (academicYearId && academicYearId !== 'ALL') {
      // If no specific class is provided, but academic year is provided,
      // get all classes in that academic year
      const periodsInYear = await db.internshipPeriod.findMany({
        where: { academicYearId },
        select: { id: true }
      });
      const periodIds = periodsInYear.map(p => p.id);
      
      const classesInYear = await db.classRoom.findMany({
        where: { periodId: { in: periodIds } },
        select: { name: true }
      });
      const classNames = classesInYear.map(c => c.name);
      
      if (classNames.length > 0) {
        studentWhere.className = { in: classNames };
      } else {
        studentWhere.className = '___NO_CLASSES___'; // dummy to return empty if no classes found
      }
    }

    // Get filter options: Academic Years and Classes
    const academicYears = await db.academicYear.findMany({
      orderBy: { year: 'desc' }
    });

    // Get classes that match the Pokja department
    let classWhere: any = {};
    if ((userRole === 'POKJA' || userRole === 'TIM_POKJA') && userDepartment && userDepartment.toLowerCase() !== 'semua jurusan') {
      classWhere.department = { name: { contains: userDepartment, mode: 'insensitive' } };
    }
    const classRooms = await db.classRoom.findMany({
      where: classWhere,
      include: {
        period: {
          select: { academicYearId: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const students = await db.student.findMany({
      where: studentWhere,
      select: {
        id: true,
        nis: true,
        name: true,
        className: true,
        placement: {
          select: {
            status: true,
            industry: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { className: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: students,
      filters: {
        academicYears,
        classRooms: classRooms.map(c => ({
          id: c.id,
          name: c.name,
          academicYearId: c.period?.academicYearId
        }))
      }
    });

  } catch (error: any) {
    console.error('Error fetching rekap kelas:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data rekap kelas' }, { status: 500 });
  }
}

