// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Halaman placeholder "Coming Soon" interaktif untuk menu persuratan yang sedang dalam pengembangan.
// ✨ Fitur Baru:
//    - Dynamic Route Title Reader.
//    - Interactive Notification Request.
// 🎨 UI/UX Update: Ilustrasi & Efek Glassmorphism dengan kontras warna yang tajam.
// 🔧 Bug Fix: Menghindari error 404 pada sidebar menu persuratan lainnya.
// 🚀 Inovasi: Interactive Feature Roadmap Suite for SI-ERIN.
// ----------------------------------------------------------------------

'use client';

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTheme } from '@/app/theme-provider';

import {
  Sparkles,
  ArrowLeft,
  Clock,
  Layers,
  FileCheck2,
  BellRing,
  CheckCircle2
} from 'lucide-react';

export default function ComingSoonPersuratanPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme } = useTheme();

  const titleParam = searchParams.get('title') || 'Fitur Persuratan PKL';
  const [subscribed, setSubscribed] = React.useState(false);

  return (
    <div className={`min-h-screen p-6 sm:p-12 flex flex-col justify-center items-center transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/80 text-slate-900'
    }`}>
      
      <div className={`max-w-2xl w-full p-8 sm:p-12 rounded-3xl border shadow-2xl text-center space-y-6 transition-all ${
        theme === 'dark' 
          ? 'bg-slate-900 border-slate-800 shadow-indigo-950/40' 
          : 'bg-white border-slate-200 shadow-slate-300/60'
      }`}>
        
        {/* BADGE HAK CIPTA */}
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 text-xs font-bold">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
          <span>Pengembangan Tahap Berikutnya — SI-ERIN v2.5</span>
        </div>

        {/* JUDUL MENU DENGAN KONTRAS TINGGI */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            {titleParam}
          </h1>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-400 max-w-lg mx-auto font-medium leading-relaxed">
            Modul ini sedang disempurnakan oleh tim developer untuk mendukung otomatisasi dokumen sekolah yang lebih lengkap.
          </p>
        </div>

        {/* VISUAL PLACEHOLDER CARD */}
        <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center space-y-3 ${
          theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="p-4 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="w-10 h-10 animate-spin" />
          </div>
          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
            Fitur Siap Diluncurkan Pada Update Berikutnya
          </span>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 max-w-xs font-medium">
            Format otomatisasi template PDF, stempel digital, dan tanda tangan otomatis sedang dipersiapkan.
          </p>
        </div>

        {/* AKSI LAYANAN */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer border ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Halaman Sebelumnya</span>
          </button>

          <button
            type="button"
            onClick={() => setSubscribed(true)}
            disabled={subscribed}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-75"
          >
            {subscribed ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Notifikasi Diaktifkan</span>
              </>
            ) : (
              <>
                <BellRing className="w-4 h-4" />
                <span>Beri Tahu Saat Rilis</span>
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
}