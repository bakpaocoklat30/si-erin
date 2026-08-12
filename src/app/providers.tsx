// 📋 CHANGELOG:
// ✅ Perubahan: Penyempurnaan SessionProvider NextAuth sebagai Client Component Provider.
// ✨ Fitur Baru: Global Session Context Manager.
// 🎨 UI/UX Update: N/A (State Provider)
// 🔧 Bug Fix: Menjamin useSession() terdefinisi di seluruh hierarki halaman.
// 🚀 Inovasi: Robust Client Session Wrapper.

'use client';

import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}