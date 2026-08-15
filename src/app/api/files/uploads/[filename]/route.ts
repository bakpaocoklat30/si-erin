// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Membuat Route Handler streaming berkas dinamis dari sistem folder /public/uploads di Docker container.
// ✨ Fitur Baru: Runtime Media Streamer with Auto MIME Detection & Caching.
// 🎨 UI/UX Update: N/A (Backend Streamer API)
// 🔧 Bug Fix: Mengatasi error 404 pada berkas yang baru diunggah di Next.js Standalone mode.
// 🚀 Inovasi: Enterprise Isolated File Streaming Route.
// ----------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;

    // Hindari Directory Traversal attack
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), 'public', 'uploads', sanitizedFilename);

    // Cek keberadaan berkas
    if (!fs.existsSync(filePath)) {
      return new NextResponse('File Not Found', { status: 404 });
    }

    // Baca buffer file
    const fileBuffer = fs.readFileSync(filePath);

    // Tentukan Content-Type sesuai ekstensi
    const ext = path.extname(sanitizedFilename).toLowerCase();
    let contentType = 'application/octet-stream';

    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.pdf') contentType = 'application/pdf';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error streaming file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}