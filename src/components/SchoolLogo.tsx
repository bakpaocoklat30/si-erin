'use client';

// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Komponen gambar logo aman dengan pengolah fallback onError otomatis dan integrasi getFileUrl.
// ✨ Fitur Baru: Safe Image Renderer with Auto Fallback.
// 🎨 UI/UX Update: Transisi gambar smooth dengan proteksi gambar terpecah.
// 🔧 Bug Fix: Mengatasi crash akibat file gambar 404.
// 🚀 Inovasi: Zero-Crash Image Component.
// ----------------------------------------------------------------------

import { useState } from 'react';
import { getFileUrl } from '@/lib/utils';
import { Building2 } from 'lucide-react';

interface SchoolLogoProps {
  src?: string | null;
  alt?: string;
  className?: string;
}

export default function SchoolLogo({ src, alt = 'Logo Sekolah', className = 'w-10 h-10' }: SchoolLogoProps) {
  const [hasError, setHasError] = useState(false);

  const safeUrl = getFileUrl(src);

  if (hasError || !src) {
    return (
      <div className={`bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center text-indigo-400 ${className}`}>
        <Building2 className="w-1/2 h-1/2" />
      </div>
    );
  }

  return (
    <img
      src={safeUrl}
      alt={alt}
      className={`object-cover rounded-xl border border-slate-700/50 ${className}`}
      onError={() => setHasError(true)}
    />
  );
}