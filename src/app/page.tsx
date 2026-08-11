// 📋 CHANGELOG:
// ✅ Perubahan: Memperbaiki tata letak UI halaman utama dengan struktur Tailwind CSS flex & grid yang responsif
// ✨ Fitur Baru: Tampilan landing page profesional SI-Erin dengan kartu fitur interaktif
// 🎨 UI/UX Update: Perbaikan total rendering CSS grid dan spacing agar tidak berantakan
// 🔧 Bug Fix: Mengatasi masalah Tailwind CSS yang tidak ter-load pada root layout
// 🚀 Inovasi: Clean semantic HTML structure siap produksi

import Link from "next/link";
import { ArrowRight, GraduationCap, ShieldCheck, Building2, Users } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Header / Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50 px-6 sm:px-10 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-xl font-extrabold text-lg flex items-center justify-center shadow-lg shadow-indigo-600/30">
            SI
          </div>
          <div>
            <h1 className="font-bold text-white tracking-wider text-base sm:text-lg">SI-ERIN</h1>
            <p className="text-xs text-slate-400 hidden sm:block">Sistem Informasi Prakerin SMK</p>
          </div>
        </div>
        <div>
          <Link
            href="/login"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-600/30 inline-flex items-center space-x-2"
          >
            <span>Masuk Sistem</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Platform Terintegrasi & Multi-Role RBAC</span>
          </div>
          
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Manajemen Praktik Kerja Lapangan <span className="text-indigo-500">Lebih Efektif & Modern</span>
          </h2>
          
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Sistem informasi terpadu untuk pengelolaan data siswa, penempatan industri, penerbitan surat pengantar, monitoring bimbingan, hingga pelaporan PKL SMK secara digital.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/login"
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2"
            >
              <span>Akses Portal Login</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
            <div className="bg-slate-900/80 border border-slate-800/80 p-6 rounded-2xl shadow-xl hover:border-indigo-500/50 transition-all">
              <div className="w-10 h-10 bg-indigo-600/10 text-indigo-400 rounded-xl flex items-center justify-center mb-4 border border-indigo-500/20">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Multi-Role RBAC</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Hak akses terproteksi untuk Super Admin, Pokja, Siswa, dan Guru Pembimbing.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 p-6 rounded-2xl shadow-xl hover:border-emerald-500/50 transition-all">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center mb-4 border border-emerald-500/20">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Manajemen Kuota Industri</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Pengaturan kuota penempatan siswa secara real-time berdasarkan tahun pelajaran aktif.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 p-6 rounded-2xl shadow-xl hover:border-amber-500/50 transition-all">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mb-4 border border-amber-500/20">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Tracking Dokumen PKL</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Upload CV, penerbitan surat pengantar, hingga surat balasan industri terdokumentasi rapi.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 bg-slate-900/40">
        <p>&copy; {new Date().getFullYear()} SI-Erin — Sistem Informasi Prakerin SMK. All rights reserved.</p>
      </footer>
    </div>
  );
}