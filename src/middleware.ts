// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Menggabungkan NextAuth Role Guard (Admin, Pokja, Pembimbing, Siswa) dengan Security Headers (Helmet Protection) dalam satu Edge Middleware terpadu.
// ✨ Fitur Baru: Unified Edge Security & Route Authorization Pipeline.
// 🎨 UI/UX Update: N/A (Next.js Edge Middleware)
// 🔧 Bug Fix: Menyatukan proteksi keamanan HTTP headers dengan sistem pembatasan hak akses berbasis role.
// 🚀 Inovasi: Enterprise Bulletproof Edge Security & Access Control.
// ----------------------------------------------------------------------

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default withAuth(
  function middleware(req: any) {
    const token = req.nextauth?.token;
    const path = req.nextUrl.pathname;

    // 1. Terapkan Security Headers (Helmet Protection) ke setiap respons
    const response = NextResponse.next();
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' unpkg.com cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' unpkg.com fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' fonts.gstatic.com;"
    );

    // Jika belum login, biarkan next-auth mengarahkan ke halaman sign-in
    if (!token) {
      return response;
    }

    const rawRole = (token as any)?.role || '';
    const role = String(rawRole).toUpperCase().trim();

    // 2. Proteksi khusus rute Administrator
    if (path.startsWith('/dashboard/admin') && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // 3. Proteksi khusus rute Tim Pokja
    if (path.startsWith('/dashboard/pokja') && role !== 'POKJA' && role !== 'TIM_POKJA' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // 4. Proteksi khusus rute Guru Pembimbing / Pembimbing
    if (path.startsWith('/dashboard/pembimbing') && !['GURU', 'PEMBIMBING', 'TEACHER', 'GURUPMB', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // 5. Proteksi khusus rute Siswa
    if (path.startsWith('/dashboard/students') && role === 'GURU') {
      return NextResponse.redirect(new URL('/dashboard/pembimbing', req.url));
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Tentukan matcher rute yang dilindungi oleh middleware
export const config = {
  matcher: [
    '/dashboard/:path*',
  ],
};