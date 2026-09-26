import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✨ Fitur Baru: API Update & Delete Penugasan Monitoring Guru.
// 🔧 Fitur:
//    - PUT: Memperbarui data penugasan monitoring (tanggal, nomor surat, status, pengikut, dll).
//    - DELETE: Menghapus jadwal penugasan monitoring.
// ----------------------------------------------------------------------

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA', 'PEMBIMBING'].includes((session.user as any)?.role)) {
      return NextResponse.json({ success: false, error: 'Akses tidak diizinkan.' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();

    const existing = await prisma.monitoringAssignment.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Data penugasan monitoring tidak ditemukan.' }, { status: 404 });
    }

    const targetIndustryId = body.industryId || existing.industryId;
    if (targetIndustryId && typeof body.industryAddress === 'string') {
      await prisma.industry.update({
        where: { id: targetIndustryId },
        data: { address: body.industryAddress.trim() }
      }).catch((err) => console.error('Error updating industry address on edit:', err));
    }

    const targetTeacherId = body.teacherId || existing.teacherId;
    if (targetTeacherId && typeof body.teacherRank === 'string') {
      await prisma.user.update({
        where: { id: targetTeacherId },
        data: { rank: body.teacherRank.trim() }
      }).catch((err) => console.error('Error updating teacher rank on edit:', err));
    }

    const updated = await prisma.monitoringAssignment.update({
      where: { id },
      data: {
        ...(body.industryId && { industryId: body.industryId }),
        ...(body.teacherId && { teacherId: body.teacherId }),
        ...(body.monitoringDate && { monitoringDate: new Date(body.monitoringDate) }),
        ...(body.returnDate && { returnDate: new Date(body.returnDate) }),
        ...(body.letterNumber !== undefined && { letterNumber: body.letterNumber }),
        ...(body.sppdNumber !== undefined && { sppdNumber: body.sppdNumber }),
        ...(body.companionTeachers !== undefined && { companionTeachers: body.companionTeachers }),
        ...(body.targetIndustries !== undefined && { targetIndustries: body.targetIndustries }),
        ...(body.purpose !== undefined && { purpose: body.purpose }),
        ...(body.transportType !== undefined && { transportType: body.transportType }),
        ...(body.departurePlace !== undefined && { departurePlace: body.departurePlace }),
        ...(body.destinationPlace !== undefined && { destinationPlace: body.destinationPlace }),
        ...(body.budgetSource !== undefined && { budgetSource: body.budgetSource }),
        ...(body.budgetAccount !== undefined && { budgetAccount: body.budgetAccount }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
      include: {
        industry: true,
        teacher: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Penugasan monitoring berhasil diperbarui!',
      data: updated
    });
  } catch (error: any) {
    console.error('Error updating monitoring assignment:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal memperbarui penugasan monitoring' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ success: false, error: 'Hanya Tim Pokja dan Admin yang dapat menghapus jadwal.' }, { status: 403 });
    }

    const { id } = params;
    await prisma.monitoringAssignment.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Jadwal monitoring berhasil dihapus!'
    });
  } catch (error: any) {
    console.error('Error deleting monitoring assignment:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal menghapus jadwal monitoring' }, { status: 500 });
  }
}
