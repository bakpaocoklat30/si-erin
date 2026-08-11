// 📋 CHANGELOG:
// ✅ Perubahan: Memperketat pengecekan token di middleware agar secara agresif mengarahkan user tanpa sesi ke halaman /login
// ✨ Fitur Baru: Edge-level unauthenticated routing guard
// 🎨 UI/UX Update: N/A (Server Middleware)
// 🔧 Bug Fix: Mencegah kemunculan halaman blank / unauthorized saat server direstart dan sesi terputus
// 🚀 Inovasi: Bulletproof NextAuth Edge Middleware protection

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Jika belum login dan mengakses area dashboard, langsung lempar ke /login
    if (!token && path.startsWith("/dashboard")) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", encodeURI(path));
      return NextResponse.redirect(loginUrl);
    }

    if (token) {
      const role = String(token.role || "").toUpperCase();

      // Proteksi RBAC
      if (path.startsWith("/dashboard/admin") && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }

      if (path.startsWith("/dashboard/pokja") && role !== "POKJA" && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }

      if (path.startsWith("/dashboard/siswa") && role !== "SISWA") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }

      if (path.startsWith("/dashboard/pembimbing") && role !== "GURU_PEMBIMBING") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*"],
};