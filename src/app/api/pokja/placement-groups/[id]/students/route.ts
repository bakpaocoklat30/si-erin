import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const placements = await db.internshipPlacement.findMany({
      where: { groupId: id },
      include: {
        student: {
          select: {
            id: true,
            userId: true,
            nis: true,
            nisn: true,
            name: true,
            className: true,
            department: true,
            phone: true,
            parentName: true,
            parentRelation: true,
            parentPhone: true,
            bpjsStatus: true,
            cvStatus: true,
            isAllowedPkl: true,
            teacherId: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });

    const students = placements.map(p => ({
      ...p.student,
      placementId: p.id
    }));

    return NextResponse.json({ success: true, data: students });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { studentIds } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'Pilih siswa.' }, { status: 400 });
    }

    const group = await db.placementGroup.findUnique({ where: { id } });
    if (!group) return NextResponse.json({ error: 'Kelompok tidak ditemukan.' }, { status: 404 });

    for (const studentId of studentIds) {
      const existing = await db.internshipPlacement.findUnique({ where: { studentId } });
      if (existing) {
        await db.internshipPlacement.update({
          where: { id: existing.id },
          data: {
            industryId: group.industryId,
            status: 'DISETUJUI_INDUSTRI',
            stage: 4,
            groupId: group.id,
          }
        });
      } else {
        await db.internshipPlacement.create({
          data: {
            studentId,
            industryId: group.industryId,
            status: 'DISETUJUI_INDUSTRI',
            stage: 4,
            groupId: group.id,
          }
        });
      }

      await db.student.update({
        where: { id: studentId },
        data: { isAllowedPkl: true }
      });
    }

    return NextResponse.json({ success: true, message: 'Siswa berhasil ditambahkan.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const placementId = url.searchParams.get('placementId');

    if (placementId) {
      await db.internshipPlacement.delete({ where: { id: placementId } });
      return NextResponse.json({ success: true, message: 'Siswa dihapus dari kelompok.' });
    }

    return NextResponse.json({ error: 'placementId dibutuhkan' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
