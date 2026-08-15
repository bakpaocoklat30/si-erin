'use client';

// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Membuat Global React Error Boundary untuk menangkap exception client-side dan mencegah tampilan white screen/crash.
// ✨ Fitur Baru: Clean Graceful Error Recovery Screen with Retry Button.
// 🎨 UI/UX Update: Tampilan halaman error yang rapi, profesional, dan futuristik dengan skema Tailwind CSS.
// 🔧 Bug Fix: Menyerap error client-side exception agar tidak menampilkan noise teks template.
// 🚀 Inovasi: Enterprise Resilient Client Boundary.
// ----------------------------------------------------------------------

import { useEffect } from 'react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error secara silent ke konsol server/browser
    console.error('Captured Client Exception:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
      <div className="max-w-md w-full bg-slate-800/80 border border-slate-700/60 rounded-2xl p-8 shadow-2xl backdrop-blur-xl text-center">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight mb-2 text-white">
          Terjadi Kendala Sesi Halaman
        </h2>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          Aplikasi mengalami pembaruan status koneksi atau aset yang belum siap. Anda dapat menyegarkan kembali halaman ini.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/30 active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Coba Lagi
          </button>
          <a
            href="/dashboard/admin"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-sm rounded-xl transition-all duration-200 active:scale-95"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}