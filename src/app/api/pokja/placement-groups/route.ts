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

    const userDept = (session.user as any)?.department;
    const userRole = (session.user as any)?.role;

    let groupWhere: any = {};
    let placementWhere: any = { groupId: { not: null } };

    if (userRole === 'POKJA' && userDept && userDept.toLowerCase() !== 'semua jurusan' && userDept.toUpperCase() !== 'ALL') {
      groupWhere = {
        department: { contains: userDept, mode: 'insensitive' }
      };
      placementWhere.student = {
        department: { contains: userDept, mode: 'insensitive' }
      };
    }

    const groups = await db.placementGroup.findMany({
      where: groupWhere,
      include: {
        industry: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            contactPerson: true
          }
        },
        period: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    // Also get student counts for each group in a single query (department-scoped)
    const placementCounts = await db.internshipPlacement.groupBy({
      by: ['groupId'],
      _count: {
        groupId: true,
      },
      where: placementWhere
    });

    const countMap = new Map();
    placementCounts.forEach(pc => {
      if (pc.groupId) countMap.set(pc.groupId, pc._count.groupId);
    });

    const groupsWithCounts = groups.map(g => ({
      ...g,
      studentCount: countMap.get(g.id) || 0
    }));

    return NextResponse.json({ success: true, data: groupsWithCounts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDept = (session.user as any)?.department;
    const body = await request.json();
    const { industryId, periodId, startDate, endDate } = body;

    if (!industryId || !periodId) {
      return NextResponse.json({ error: 'Industri dan Periode wajib diisi.' }, { status: 400 });
    }

    const newGroup = await db.placementGroup.create({
      data: {
        industryId,
        periodId,
        department: userDept || 'ALL',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      }
    });

    return NextResponse.json({ success: true, data: newGroup });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
