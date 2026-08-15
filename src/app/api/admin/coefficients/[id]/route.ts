// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Endpoint API PUT & DELETE per ID untuk Perhitungan Koefisien PKL.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { academicYear, periodName, totalClasses, hoursPerClass, totalStudents, coefficient, notes } = body;

    const prisma = db as any;
    const ayString = typeof academicYear === 'object' ? academicYear?.year || '' : String(academicYear);

    const updated = await prisma.internshipCoefficient.update({
      where: { id },
      data: {
        academicYear: ayString,
        periodName,
        totalClasses: Number(totalClasses),
        hoursPerClass: Number(hoursPerClass),
        totalStudents: Number(totalStudents),
        coefficient: Number(coefficient),
        notes: notes || null
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error PUT /api/admin/coefficients/[id]:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui koefisien' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const prisma = db as any;

    await prisma.internshipCoefficient.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Data berhasil dihapus' });
  } catch (error: any) {
    console.error('Error DELETE /api/admin/coefficients/[id]:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus koefisien' }, { status: 500 });
  }
}