// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Merombak Total Halaman Utama (Landing Page http://localhost:3000/) Menjadi Portal Landing Page SI-ERIN Enterprise Ultra-Modern.
// ✨ Fitur Baru: Dynamic School Identity Hydration (Fetch Logo PNG & Data Sekolah dari Database), Role Quick Access Cards, Interactive Feature Highlights, & Floating Glassmorphism Navigation.
// 🎨 UI/UX Update: Gradient Text Effects, Ambient Background Glow, Interactive Card Elevate, Micro Animations, & Responsive Layouts.
// 🔧 Bug Fix: Menjamin Logo PNG dan Identitas Sekolah dari Admin Settings langsung terrefleksi secara realtime dengan fallback protection.
// 🚀 Inovasi: Enterprise Hybrid Landing Portal Engine.
// ----------------------------------------------------------------------

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { 
  GraduationCap, 
  ShieldCheck, 
  Building2, 
  Users, 
  ArrowRight, 
  LogIn, 
  LayoutDashboard, 
  CheckCircle2, 
  BookOpen, 
  Sparkles, 
  Award, 
  MapPin, 
  Phone, 
  Mail, 
  Sun, 
  Moon,
  ChevronRight,
  Clock,
  Briefcase,
  FileCheck2,
  Shield
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

export default function LandingPage() {
  const { data: session, status } = useSession();
  const { theme, toggleTheme } = useTheme();

  // State Identitas Sekolah dari Database
  const [schoolInfo, setSchoolInfo] = useState({
    name: 'SMK Negeri 1 Adiwerna',
    shortName: 'SMKN 1 Adiwerna',
    logoUrl: '/images/logo-sekolah.png',
    address: 'Jl. Raya Adiwerna No. 15, Kabupaten Tegal',
    phone: '(0283) 442192',
    email: 'info@smkn1adiwerna.sch.id',
    headmaster: 'Drs. Joko Purnomo, M.Pd.',
    headmasterNip: '196805121994031004',
    accreditation: 'A (Unggul)'
  });

  const [loadingSchool, setLoadingSchool] = useState(true);

  // Fetch Identitas Sekolah dari API Settings Database
  useEffect(() => {
    async function loadSchoolSettings() {
      try {
        const res = await fetch('/api/settings/school?t=' + new Date().getTime());
        const json = await res.json();
        if (json.data) {
          setSchoolInfo({
            name: json.data.name || 'SMK Negeri 1 Adiwerna',
            shortName: json.data.shortName || 'SMKN 1 Adiwerna',
            logoUrl: json.data.logoUrl || '/images/logo-sekolah.png',
            address: json.data.address || 'Jl. Raya Adiwerna No. 15, Kabupaten Tegal',
            phone: json.data.phone || '(0283) 442192',
            email: json.data.email || 'info@smkn1adiwerna.sch.id',
            headmaster: json.data.headmaster || 'Drs. Joko Purnomo, M.Pd.',
            headmasterNip: json.data.headmasterNip || '196805121994031004',
            accreditation: json.data.accreditation || 'A (Unggul)'
          });
        }
      } catch (err) {
        console.warn('Gagal memuat identitas sekolah dari database, menggunakan fallback SMKN 1 Adiwerna.');
      } finally {
        setLoadingSchool(false);
      }
    }
    loadSchoolSettings();
  }, []);

  // Tentukan rute dashboard tujuan berdasarkan role user yang sedang login
  const getUserDashboardRoute = () => {
    if (!session?.user) return '/login';
    const role = (session.user as any)?.role;
    if (role === 'ADMIN') return '/dashboard/admin';
    if (role === 'POKJA') return '/dashboard/pokja';
    if (role === 'PEMBIMBING') return '/dashboard/pembimbing';
    if (role === 'SISWA') return '/dashboard/students';
    return '/dashboard';
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans relative overflow-x-hidden ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>

      {/* 🔮 AMBIENT GLOW DEKORATIF BACKGROUND */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-emerald-500/20 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-[800px] -right-40 w-[600px] h-[600px] bg-indigo-500/10 blur-[160px] pointer-events-none rounded-full" />

      {/* 🌐 FLOATING GLASSMORPHISM NAVBAR */}
      <header className="sticky top-0 z-50 px-4 sm:px-8 py-4">
        <div className={`max-w-7xl mx-auto rounded-3xl border backdrop-blur-xl px-6 py-3.5 flex items-center justify-between shadow-2xl transition-all ${
          theme === 'dark' 
            ? 'bg-slate-900/80 border-slate-800/80 text-white shadow-slate-950/50' 
            : 'bg-white/80 border-slate-200/80 text-slate-900 shadow-slate-200/60'
        }`}>
          
          {/* BRANDING LOGO & NAMA SEKOLAH DINAMIS */}
          <Link href="/" className="flex items-center space-x-3.5 group cursor-pointer">
            <div className={`w-11 h-11 rounded-2xl border p-1.5 flex items-center justify-center transition-transform group-hover:scale-105 ${
              theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <img 
                src={schoolInfo.logoUrl} 
                alt={`Logo ${schoolInfo.name}`}
                className="max-w-full max-h-full object-contain drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                onError={(e: any) => {
                  e.target.onerror = null;
                  e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/1/15/Logo_SMK_Negeri_1_Adiwerna.png';
                }}
              />
            </div>

            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-base tracking-tight leading-none">
                  SI-<span className="text-indigo-600 dark:text-indigo-400">ERIN</span>
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-xs mt-0.5">
                {schoolInfo.name}
              </p>
            </div>
          </Link>

          {/* RIGHT ACTION BUTTONS */}
          <div className="flex items-center space-x-3">
            {/* THEME TOGGLE */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-slate-800/80 border-slate-700 text-amber-400 hover:bg-slate-800' 
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title="Ganti Mode Tampilan"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-amber-500" />}
            </button>

            {/* DASHBOARD / LOGIN BUTTON */}
            {status === 'authenticated' ? (
              <Link
                href={getUserDashboardRoute()}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer active:scale-95"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Buka Dashboard</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk Portal</span>
              </Link>
            )}
          </div>

        </div>
      </header>

      {/* 🚀 HERO SECTION UTAMA */}
      <section className="px-4 sm:px-8 pt-12 pb-20 relative z-10">
        <div className="max-w-6xl mx-auto text-center space-y-8">
          
          {/* BADGE SEKOLAH DINAMIS */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold tracking-wide uppercase shadow-sm">
            <Award className="w-4 h-4 text-emerald-500" />
            <span>Akreditasi {schoolInfo.accreditation} — {schoolInfo.shortName}</span>
          </div>

          {/* MAIN HEADLINE */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight sm:leading-none">
              Sistem Informasi Praktik Kerja Lapangan{' '}
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 bg-clip-text text-transparent">
                Digital & Terintegrasi
              </span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
              Portal resmi pengelolaan Praktik Kerja Lapangan (PKL/Prakerin) **{schoolInfo.name}**. Menghubungkan Siswa, Guru Pembimbing, Tim Pokja, dan Mitra Industri DUDI secara akurat & transparan.
            </p>
          </div>

          {/* CALL TO ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            {status === 'authenticated' ? (
              <Link
                href={getUserDashboardRoute()}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-3 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Masuk ke Dashboard Saya</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-3 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <LogIn className="w-5 h-5" />
                <span>Masuk ke Portal SI-ERIN</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}

            <a
              href="#fitur"
              className={`w-full sm:w-auto px-8 py-4 rounded-2xl border font-bold text-sm transition-all flex items-center justify-center space-x-2 ${
                theme === 'dark' 
                  ? 'bg-slate-900/80 border-slate-800 text-slate-200 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Jelajahi Fitur Utama</span>
            </a>
          </div>

          {/* LOGO SEKOLAH BIG BANNER DISPLAY */}
          <div className="pt-8 flex justify-center">
            <div className={`p-6 sm:p-8 rounded-3xl border shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center gap-6 max-w-2xl text-left ${
              theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'
            }`}>
              <div className="w-24 h-24 rounded-2xl bg-slate-950 p-3 border border-slate-800 flex items-center justify-center shrink-0">
                <img 
                  src={schoolInfo.logoUrl} 
                  alt="Logo Sekolah" 
                  className="max-w-full max-h-full object-contain drop-shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                  onError={(e: any) => {
                    e.target.onerror = null;
                    e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/1/15/Logo_SMK_Negeri_1_Adiwerna.png';
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-black text-indigo-500 uppercase tracking-wider">Instansi Penyelenggara</span>
                <h3 className="text-lg font-black">{schoolInfo.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  <span>{schoolInfo.address}</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-3 pt-1">
                  <span className="flex items-center space-x-1"><Phone className="w-3 h-3 text-indigo-400" /> <span>{schoolInfo.phone}</span></span>
                  <span className="flex items-center space-x-1"><Mail className="w-3 h-3 text-indigo-400" /> <span>{schoolInfo.email}</span></span>
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 👥 KARTU AKSES ROLE PENGGUNA */}
      <section id="roles" className="px-4 sm:px-8 py-16 relative z-10 border-t border-inherit">
        <div className="max-w-6xl mx-auto space-y-10">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black">Akses Pengguna SI-ERIN</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Sistem ini dirancang khusus dengan pembagian hak akses terintegrasi sesuai kebutuhan ekosistem PKL SMK.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* ROLE 1: SISWA */}
            <div className={`p-6 rounded-3xl border shadow-xl space-y-4 transition-all hover:-translate-y-1 group ${
              theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-500 w-fit border border-indigo-500/20 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold">Siswa PKL</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Pengajuan tempat PKL, melihat teman kelompok, cetak surat tugas, dan pembaruan berkas CV/BPJS.
                </p>
              </div>
              <div className="pt-2 border-t border-inherit">
                <span className="text-[11px] font-bold text-indigo-500 flex items-center space-x-1">
                  <span>Login NIS / Password</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* ROLE 2: GURU PEMBIMBING */}
            <div className={`p-6 rounded-3xl border shadow-xl space-y-4 transition-all hover:-translate-y-1 group ${
              theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-500 w-fit border border-emerald-500/20 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold">Guru Pembimbing</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Monitoring siswa bimbingan di industri, rekap jam bimbingan, dan verifikasi laporan kegiatan.
                </p>
              </div>
              <div className="pt-2 border-t border-inherit">
                <span className="text-[11px] font-bold text-emerald-500 flex items-center space-x-1">
                  <span>Login NIP / Password</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* ROLE 3: TIM POKJA */}
            <div className={`p-6 rounded-3xl border shadow-xl space-y-4 transition-all hover:-translate-y-1 group ${
              theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500 w-fit border border-amber-500/20 group-hover:scale-110 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold">Tim Pokja Hubin</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Verifikasi pengajuan PKL, kelola kuota mitra DUDI, manajemen periode, dan pembagian jam bimbingan.
                </p>
              </div>
              <div className="pt-2 border-t border-inherit">
                <span className="text-[11px] font-bold text-amber-500 flex items-center space-x-1">
                  <span>Akses Manajemen Pokja</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* ROLE 4: ADMIN SISTEM */}
            <div className={`p-6 rounded-3xl border shadow-xl space-y-4 transition-all hover:-translate-y-1 group ${
              theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-500 w-fit border border-purple-500/20 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold">Administrator</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Pengaturan identitas & logo sekolah, impor master data CSV, manajemen akun, dan backup data.
                </p>
              </div>
              <div className="pt-2 border-t border-inherit">
                <span className="text-[11px] font-bold text-purple-500 flex items-center space-x-1">
                  <span>Full System Control</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 🌟 KEUNGGULAN FITUR UTAMA */}
      <section id="fitur" className="px-4 sm:px-8 py-16 relative z-10 border-t border-inherit bg-indigo-500/5">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">Fitur Unggulan</span>
            <h2 className="text-2xl sm:text-3xl font-black">Alur Kerja Praktis & Transparan</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Meminimalkan birokrasi manual dengan sistem verifikasi digital otomatis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className={`p-8 rounded-3xl border shadow-xl space-y-4 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-indigo-600/30">
                1
              </div>
              <h3 className="text-lg font-black">Pengajuan Online & Mandiri</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Siswa mengajukan lokasi PKL mitra DUDI secara cepat melalui portal dengan pengecekan kuota realtime.
              </p>
            </div>

            <div className={`p-8 rounded-3xl border shadow-xl space-y-4 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-emerald-600/30">
                2
              </div>
              <h3 className="text-lg font-black">Verifikasi Berjenjang Pokja</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tim Pokja memverifikasi berkas, menerbitkan Surat Tugas, dan merekap Surat Balasan dari industri.
              </p>
            </div>

            <div className={`p-8 rounded-3xl border shadow-xl space-y-4 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-amber-600/30">
                3
              </div>
              <h3 className="text-lg font-black">Monitoring Pembimbing & Nilai</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Guru pembimbing memantau kehadiran, jurnal harian, dan mengalokasikan jam bimbingan sesuai regulasi.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 🏢 FOOTER IDENTITAS SEKOLAH & COPYRIGHT */}
      <footer className={`border-t relative z-10 transition-colors duration-300 ${
        theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-900 text-slate-300 border-slate-800'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* BRANDING FOOTER */}
            <div className="md:col-span-6 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-700 p-1.5 flex items-center justify-center">
                  <img 
                    src={schoolInfo.logoUrl} 
                    alt="Logo Sekolah" 
                    className="max-w-full max-h-full object-contain"
                    onError={(e: any) => {
                      e.target.onerror = null;
                      e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/1/15/Logo_SMK_Negeri_1_Adiwerna.png';
                    }}
                  />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{schoolInfo.name}</h3>
                  <p className="text-[11px] font-bold text-emerald-400">SI-ERIN (Sistem Informasi Prakerin v2.0)</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                {schoolInfo.address}
              </p>
            </div>

            {/* KONTAK RESMI */}
            <div className="md:col-span-6 space-y-2 text-xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-white">Kontak Resmi Sekolah</h4>
              <p className="flex items-center space-x-2 text-slate-400">
                <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{schoolInfo.phone}</span>
              </p>
              <p className="flex items-center space-x-2 text-slate-400">
                <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{schoolInfo.email}</span>
              </p>
              <p className="flex items-center space-x-2 text-slate-400 pt-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Kepala Sekolah: <strong>{schoolInfo.headmaster}</strong> (NIP: {schoolInfo.headmasterNip})</span>
              </p>
            </div>

          </div>

          <div className="pt-8 border-t border-slate-800 text-center flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-500 gap-2">
            <p>&copy; 2026 {schoolInfo.name}. All rights reserved.</p>
            <p className="font-semibold text-slate-400">Powered by Tekad Dev SMKN 1 Adiwerna</p>
          </div>

        </div>
      </footer>

    </div>
  );
}