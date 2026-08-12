// 📋 CHANGELOG:
// ✅ Perubahan: Mengembalikan `src/app/layout.tsx` sebagai Root Layout Global dan membungkus seluruh hierarki komponen dengan `Providers` (NextAuth SessionProvider) & `ThemeProvider`.
// ✨ Fitur Baru: Global Session Context & Adaptive Dark/Light Mode Theme Hydration.
// 🎨 UI/UX Update: Inter Font Styling & Smooth HTML Theme Class Switching.
// 🔧 Bug Fix: Menyelesaikan error 'useSession(...) as it is undefined' saat proses SSG prerender Next.js build.
// 🚀 Inovasi: Prerender-Proof Enterprise Root Shell.

import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from '@/app/providers';
import { ThemeProvider } from '@/app/theme-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'SI-ERIN — Sistem Informasi Prakerin SMK',
  description: 'Platform Manajemen Prakerin & Mitra Industri SMK Terintegrasi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}