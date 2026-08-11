// 📋 CHANGELOG:
// ✅ Perubahan: Membuat file pembungkus Client SessionProvider untuk NextAuth
// ✨ Fitur Baru: Menyediakan konteks autentikasi global di seluruh komponen Next.js App Router
// 🎨 UI/UX Update: N/A (Provider Component)
// 🔧 Bug Fix: Mengatasi error "[next-auth]: useSession must be wrapped in a <SessionProvider />"
// 🚀 Inovasi: Clean context encapsulation untuk state manajemen session

'use client';

import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}