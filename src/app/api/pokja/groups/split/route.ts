import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = [
  'POKJA',
  'TIM_POKJA',
  'ADMIN',
  'TATA_USAHA',
  'TATA USAHA',
  'TATAUSAHA',
  'TU',
  'SUPER_ADMIN'
];

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();
    const userName = session?.user?.name || 'Tim Pokja';

    if (!session || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Unauthorized - Akses khusus Pokja atau Administrator' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      sourcePlacementIds,
      originalGroupPlacementIds,
      startDate,
      endDate,
      resetLetters = true
    } = body;

    if (!sourcePlacementIds || !Array.isArray(sourcePlacementIds) || sourcePlacementIds.length === 0) {
      return NextResponse.json(
        { error: 'Pilih minimal satu siswa untuk dipisahkan ke dalam kelompok baru.' },
        { status: 400 }
      );
    }

    // Ambil data penempatan siswa yang akan dipisahkan
    const targetPlacements = await db.internshipPlacement.findMany({
      where: { id: { in: sourcePlacementIds } },
      include: { student: true, industry: true }
    });

    if (targetPlacements.length === 0) {
      return NextResponse.json(
        { error: 'Data penempatan siswa tidak ditemukan.' },
        { status: 404 }
      );
    }

    // 1. Buat ID unik untuk kelompok baru
    const newGroupId = `group_${crypto.randomBytes(8).toString('hex')}`;

    // 2. Pastikan sisa siswa di kelompok asal juga memiliki groupId tersendiri
    //    agar tidak bergabung kembali secara implisit jika sebelumnya bernilai null
    if (Array.isArray(originalGroupPlacementIds) && originalGroupPlacementIds.length > 0) {
      const remainingIds = originalGroupPlacementIds.filter(id => !sourcePlacementIds.includes(id));
      if (remainingIds.length > 0) {
        const firstRemaining = await db.internshipPlacement.findUnique({
          where: { id: remainingIds[0] },
          select: { groupId: true }
        });

        const originalGroupId = firstRemaining?.groupId || `group_${crypto.randomBytes(8).toString('hex')}`;
        await db.internshipPlacement.updateMany({
          where: { id: { in: remainingIds } },
          data: { groupId: originalGroupId }
        });
      }
    }

    // 3. Susun data pembaharuan untuk kelompok baru
    const updateData: any = {
      groupId: newGroupId
    };

    if (startDate) {
      updateData.startDate = new Date(startDate);
    }
    if (endDate) {
      updateData.endDate = new Date(endDate);
    }

    if (resetLetters) {
      updateData.letterNumber = null;
      updateData.suratTugasUrl = null;
      updateData.letterUploadedBy = null;
      updateData.letterUploadedAt = null;
      updateData.nomorPengantaran = null;
      updateData.suratPengantaranUrl = null;
      updateData.nomorPenarikan = null;
      updateData.suratPenarikanUrl = null;
      updateData.status = 'PEMBUATAN_SURAT';
    }

    // 4. Update data penempatan siswa yang dipisahkan
    await db.internshipPlacement.updateMany({
      where: { id: { in: sourcePlacementIds } },
      data: updateData
    });

    // 5. Audit Log pencatatan aktivitas pemisahan kelompok
    try {
      const studentNames = targetPlacements.map(p => p.student?.name).filter(Boolean).join(', ');
      await db.auditLog.create({
        data: {
          userId: (session.user as any)?.id || null,
          username: (session.user as any)?.username || userName,
          userRole: userRole,
          action: 'SPLIT_GROUP',
          module: 'PLACEMENTS',
          details: `Memisahkan ${sourcePlacementIds.length} siswa (${studentNames}) ke kelompok baru (${newGroupId}) di DUDI ${targetPlacements[0]?.industry?.name || '-'}`
        }
      });
    } catch (auditErr) {
      console.warn('Gagal mencatat audit log split group:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memisahkan ${sourcePlacementIds.length} siswa ke dalam kelompok baru.`,
      newGroupId
    });

  } catch (error: any) {
    console.error('Error in POST /api/pokja/groups/split:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memproses pemisahan kelompok' },
      { status: 500 }
    );
  }
}
