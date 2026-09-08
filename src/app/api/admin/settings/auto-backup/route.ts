import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const enabledSetting = await db.systemSetting.findUnique({ where: { key: 'AUTO_BACKUP_ENABLED' } });
    const timeSetting = await db.systemSetting.findUnique({ where: { key: 'AUTO_BACKUP_TIME' } });

    return NextResponse.json({
      enabled: enabledSetting?.value === 'true',
      time: timeSetting?.value || '00:00'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { enabled, time } = await request.json();

    await db.systemSetting.upsert({
      where: { key: 'AUTO_BACKUP_ENABLED' },
      update: { value: enabled ? 'true' : 'false' },
      create: { key: 'AUTO_BACKUP_ENABLED', value: enabled ? 'true' : 'false' }
    });

    await db.systemSetting.upsert({
      where: { key: 'AUTO_BACKUP_TIME' },
      update: { value: time || '00:00' },
      create: { key: 'AUTO_BACKUP_TIME', value: time || '00:00' }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
