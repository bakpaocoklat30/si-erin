import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'TATA_USAHA', 'POKJA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const body = await req.json();
    const { ids, letterNumber, sppdNumber } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Daftar penugasan (ids) wajib diisi' }, { status: 400 });
    }

    const updateData: any = {};
    if (letterNumber !== undefined) {
      updateData.letterNumber = letterNumber.trim() !== '' ? letterNumber.trim() : '${nomor_naskah}';
    }
    if (sppdNumber !== undefined) {
      updateData.sppdNumber = sppdNumber.trim() !== '' ? sppdNumber.trim() : '${nomor_naskah}';
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Tidak ada data nomor yang diperbarui' }, { status: 400 });
    }

    const result = await db.monitoringAssignment.updateMany({
      where: {
        id: { in: ids },
      },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil memperbarui nomor surat pada ${result.count} penugasan.`,
      count: result.count,
    });
  } catch (error: any) {
    console.error('Error updating bulk numbers:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memperbarui nomor surat massal' },
      { status: 500 }
    );
  }
}
