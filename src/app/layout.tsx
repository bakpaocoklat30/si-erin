// 📋 CHANGELOG:
// ✅ Perubahan: Menyertakan ThemeProvider di root layout aplikasi SI-Erin
// ✨ Fitur Baru: Global theme provider wrapper untuk konsistensi tampilan
// 🎨 UI/UX Update: Integrasi kelas root HTML default dark mode
// 🔧 Bug Fix: Sinkronisasi session provider dan theme provider
// 🚀 Inovasi: Enterprise app layout structure

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeProvider } from "./theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SI-Erin - Sistem Informasi Prakerin SMK",
  description: "Sistem Informasi Praktik Kerja Lapangan SMK Terintegrasi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased min-h-screen flex flex-col selection:bg-indigo-600 selection:text-white`}>
        <Providers>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}