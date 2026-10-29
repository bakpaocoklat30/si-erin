import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();
    const isPokja = ['POKJA', 'TIM_POKJA'].includes(userRole);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

    if (!session || (!isPokja && !isAdmin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Reset students' placement in this group
    const placements = await db.internshipPlacement.findMany({ where: { groupId: id } });
    
    for (const p of placements) {
      await db.student.update({
        where: { id: p.studentId },
        data: { isAllowedPkl: false } // optional, reset their allowed status if you want
      });
      await db.internshipPlacement.delete({ where: { id: p.id } });
    }

    await db.placementGroup.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Kelompok dihapus.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
