import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Daftar domain yang diizinkan untuk resolusi shortlink lokasi Maps
function isAllowedMapsUrl(targetUrl: string): boolean {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    
    // Blokir localhost dan IP privat / internal
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('172.') ||
      host.startsWith('169.254.') ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return false;
    }

    // Hanya izinkan domain resmi Google Maps & shortlink
    return (
      host === 'maps.app.goo.gl' ||
      host === 'goo.gl' ||
      host === 'maps.google.com' ||
      host.endsWith('.google.com') ||
      host.endsWith('.google.co.id')
    );
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    // 1. Verifikasi Autentikasi Pengguna
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const urlParam = searchParams.get('url');

    if (!urlParam) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // 2. Cegah SSRF: Validasi domain Google Maps terpercaya
    if (!isAllowedMapsUrl(urlParam)) {
      return NextResponse.json(
        { error: 'URL tidak diizinkan. Hanya tautan Google Maps (goo.gl / maps.app.goo.gl) yang didukung.' },
        { status: 400 }
      );
    }

    // 3. Resolusi redirect dengan timeout aman
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(urlParam, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeoutId);

    const finalUrl = response.url;
    return NextResponse.json({ success: true, finalUrl });
  } catch (error: any) {
    console.error('Error resolving URL:', error);
    return NextResponse.json({ error: error.message || 'Gagal memproses URL' }, { status: 500 });
  }
}

