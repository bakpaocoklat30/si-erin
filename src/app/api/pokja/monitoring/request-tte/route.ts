import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role === 'SISWA') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ids } = await request.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Tidak ada penugasan yang dipilih' }, { status: 400 });
    }

    await db.monitoringAssignment.updateMany({
      where: { id: { in: ids } },
      data: { status: 'MENUNGGU_TTE' },
    });

    return NextResponse.json({ success: true, message: 'Berhasil mengirim permintaan TTE ke Tata Usaha' });
  } catch (error: any) {
    console.error('Request TTE Error:', error);
    return NextResponse.json({ error: 'Gagal mengirim permintaan TTE' }, { status: 500 });
  }
}
