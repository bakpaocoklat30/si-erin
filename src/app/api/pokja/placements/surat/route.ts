export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import path from 'path';
import fs from 'fs';

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

    let fileSource = '';
    if (type === 'tugas') fileSource = placement.suratTugasUrl || '';
    else if (type === 'balasan') fileSource = placement.suratBalasanUrl || '';
    else if (type === 'pengantaran') fileSource = placement.suratPengantaranUrl || '';
    else if (type === 'penarikan') fileSource = placement.suratPenarikanUrl || '';

    if (!fileSource || !fileSource.trim()) {
      return new NextResponse('File not found', { status: 404 });
    }

    fileSource = fileSource.trim();

    // 1. Kasus Base64 Data URL (data:application/pdf;base64,...)
    if (fileSource.startsWith('data:')) {
      const match = fileSource.match(/^data:([a-zA-Z0-9-+/]+);base64,(.+)$/);
      if (!match) return new NextResponse('Invalid base64 format', { status: 400 });
      const mimeType = match[1];
      const buffer = Buffer.from(match[2], 'base64');
      const ext = mimeType.includes('pdf') ? 'pdf' : (mimeType.includes('png') ? 'png' : 'jpg');

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Length': buffer.length.toString(),
          'Content-Disposition': `inline; filename="${type}_${id}.${ext}"`,
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    }

    // 2. Kasus Raw Base64 string tanpa prefix data:
    if (!fileSource.startsWith('http') && !fileSource.startsWith('/') && fileSource.length > 500) {
      const buffer = Buffer.from(fileSource, 'base64');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': buffer.length.toString(),
          'Content-Disposition': `inline; filename="${type}_${id}.pdf"`,
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    }

    // 3. Kasus File Lokal Tersimpan di Server (misal: /uploads/surat_balasan/balasan_123.pdf)
    if (fileSource.startsWith('/')) {
      const cleanRelative = fileSource.replace(/^\//, '');
      const candidatePaths = [
        path.join(process.cwd(), 'public', cleanRelative),
        path.join(process.cwd(), cleanRelative),
        path.join(process.cwd(), 'public', 'uploads', cleanRelative.replace(/^uploads\//, '')),
        path.join(process.cwd(), 'uploads', cleanRelative.replace(/^uploads\//, ''))
      ];

      for (const targetPath of candidatePaths) {
        if (fs.existsSync(targetPath)) {
          const fileBuffer = fs.readFileSync(targetPath);
          const ext = path.extname(targetPath).toLowerCase();
          let contentType = 'application/octet-stream';
          if (ext === '.pdf') contentType = 'application/pdf';
          else if (ext === '.png') contentType = 'image/png';
          else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
          else if (ext === '.webp') contentType = 'image/webp';

          return new NextResponse(fileBuffer, {
            headers: {
              'Content-Type': contentType,
              'Content-Length': fileBuffer.length.toString(),
              'Content-Disposition': `inline; filename="${path.basename(targetPath)}"`,
              'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200'
            }
          });
        }
      }

      // Jika file fisik tidak ditemukan di path target, fallback coba redirect jika host tersedia
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
      const proto = request.headers.get('x-forwarded-proto') || (request.url.startsWith('https') ? 'https' : 'http');
      if (host) {
        return NextResponse.redirect(`${proto}://${host}${fileSource}`);
      }
      return new NextResponse('File physical document not found on server', { status: 404 });
    }

    // 4. URL eksternal (http/https)
    return NextResponse.redirect(fileSource);
  } catch (error) {
    console.error('Error serving surat:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
