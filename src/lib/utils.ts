// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Menambahkan fungsi helper getFileUrl untuk mengarahkan URL gambar lama ke endpoint streaming dinamis secara otomatis.
// ✨ Fitur Baru: Universal Image Path Sanitizer.
// 🎨 UI/UX Update: N/A (Frontend Utility)
// 🔧 Bug Fix: Mencegah error 404 jalur statis gambar pada komponen React.
// 🚀 Inovasi: Resilient Asset URL Formatter.
// ----------------------------------------------------------------------

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Mengubah path gambar upload biasa (/uploads/filename.png) 
 * menjadi API streaming route (/api/files/uploads/filename.png)
 */
export function getFileUrl(pathUrl: string | null | undefined): string {
  if (!pathUrl) return '/images/default-logo.png'; // Fallback logo default

  // Jika URL luar (HTTP/HTTPS), kembalikan langsung
  if (pathUrl.startsWith('http://') || pathUrl.startsWith('https://')) {
    return pathUrl;
  }

  // Jika mengarah ke /uploads/..., arahkan ke API Streamer
  if (pathUrl.startsWith('/uploads/')) {
    const filename = pathUrl.replace('/uploads/', '');
    return `/api/files/uploads/${filename}`;
  }

  if (pathUrl.startsWith('uploads/')) {
    const filename = pathUrl.replace('uploads/', '');
    return `/api/files/uploads/${filename}`;
  }

  return pathUrl;
}