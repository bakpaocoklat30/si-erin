import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'TATA_USAHA'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assignments = await db.monitoringAssignment.findMany({
      where: {
        status: { in: ['MENUNGGU_TTE', 'SELESAI_TTE'] }
      },
      include: {
        industry: true,
        teacher: true,
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: assignments });
  } catch (error: any) {
    console.error('Fetch TTE Tasks Error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}
