import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const ALLOWED_ROLES = ['POKJA', 'TIM_POKJA', 'ADMIN', 'TATA_USAHA', 'TU', 'SUPER_ADMIN', 'SISWA'];

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();

    if (!session || !ALLOWED_ROLES.includes(userRole)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id || !type) {
      return new NextResponse('Missing id or type', { status: 400 });
    }

    const placement = await db.internshipPlacement.findUnique({
      where: { id },
      select: {
        suratTugasUrl: true,
        suratBalasanUrl: true,
        suratPengantaranUrl: true,
        suratPenarikanUrl: true
      }
    });

    if (!placement) {
      return new NextResponse('Placement not found', { status: 404 });
    }

    let base64String = '';
    if (type === 'tugas') base64String = placement.suratTugasUrl || '';
    else if (type === 'balasan') base64String = placement.suratBalasanUrl || '';
    else if (type === 'pengantaran') base64String = placement.suratPengantaranUrl || '';
    else if (type === 'penarikan') base64String = placement.suratPenarikanUrl || '';

    if (!base64String || !base64String.startsWith('data:')) {
      if (base64String && base64String.startsWith('/')) {
         return NextResponse.redirect(new URL(base64String, request.url));
      }
      return new NextResponse('Not found or not a base64 string', { status: 404 });
    }

    const match = base64String.match(/^data:([a-zA-Z0-9-+/]+);base64,(.+)$/);
    if (!match) {
      return new NextResponse('Invalid base64 format', { status: 400 });
    }

    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (error) {
    console.error('Error serving surat:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

