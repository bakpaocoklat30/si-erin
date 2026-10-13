import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePathArray = params?.path || [];
    
    // Prevent directory traversal attacks
    if (!filePathArray.length || filePathArray.some(p => p.includes('..') || p.includes('/') || p.includes('\\'))) {
      return new NextResponse('Invalid Path', { status: 400 });
    }

    // Try public/uploads first
    let filePath = path.join(process.cwd(), 'public', 'uploads', ...filePathArray);

    if (!fs.existsSync(filePath)) {
      // Fallback to uploads directly in cwd
      const altPath = path.join(process.cwd(), 'uploads', ...filePathArray);
      if (fs.existsSync(altPath)) {
        filePath = altPath;
      } else {
        return new NextResponse('File not found', { status: 404 });
      }
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    let contentType = 'application/octet-stream';
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.webp') {
      contentType = 'image/webp';
    } else if (ext === '.svg') {
      contentType = 'image/svg+xml';
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
      },
    });
  } catch (error) {
    console.error('API Uploads Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

