// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Tuning profesional halaman login SI-ERIN dengan Logo PNG Sekolah Dinamis, Toggle Password, dan Penanganan Redirect Per Role yang Presisi.
// ✨ Fitur Baru: Dynamic School Logo Integration, Show/Hide Password Toggle, Role-Based Navigation Badge, & Enterprise Glassmorphic Layout.
// 🎨 UI/UX Update: Desain ultra-profesional dengan backdrop blur, glow ambient, responsive card, dan feedback animasi.
// 🔧 Bug Fix: Menyinkronkan target pengalihan `router.push('/dashboard/students')` saat login sebagai siswa.
// 🚀 Inovasi: Integrated School Identity Fetcher with Automatic Fallback Protection.
// ----------------------------------------------------------------------

'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  GraduationCap,
  KeyRound,
  LogIn,
  Building2,
  BookOpen,
  Users
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

export default function LoginPage() {
  const router = useRouter();
  const { theme } = useTheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // State Identitas Sekolah
  const [schoolInfo, setSchoolInfo] = useState({
    name: 'SMK Negeri 1 Adiwerna',
    shortName: 'SMKN 1 Adiwerna',
    logoUrl: '/images/logo-sekolah.png'
  });

  // Fetch data Identitas Sekolah dari API settings
  useEffect(() => {
    async function loadSchoolSettings() {
      try {
        const res = await fetch('/api/settings/school?t=' + new Date().getTime());
        const json = await res.json();
        if (json.data) {
          setSchoolInfo({
            name: json.data.name || 'SMK Negeri 1 Adiwerna',
            shortName: json.data.shortName || 'SMKN 1 Adiwerna',
            logoUrl: json.data.logoUrl || '/images/logo-sekolah.png'
          });
        }
      } catch (e) {
        console.warn('Gagal memuat setting sekolah, menggunakan fallback default.');
      }
    }
    loadSchoolSettings();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('Username/NIS/NIP dan Kata Sandi wajib diisi!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const result = await signIn('credentials', {
        username: username.trim(),
        password: password,
        redirect: false
      });

      if (result?.error) {
        setErrorMsg(result.error || 'Gagal masuk. Periksa kembali username dan kata sandi Anda.');
        setLoading(false);
      } else if (result?.ok) {
        setSuccessMsg('Verifikasi sukses! Mengalihkan Anda ke portal...');

        // Ambil session role secara presisi
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        const userRole = sessionData?.user?.role;

        setTimeout(() => {
          if (userRole === 'ADMIN') {
            router.push('/dashboard/admin');
          } else if (userRole === 'POKJA') {
            router.push('/dashboard/pokja');
          } else if (userRole === 'SISWA') {
            router.push('/dashboard/students'); // 👈 Direct route ke plural /dashboard/students
          } else if (userRole === 'PEMBIMBING') {
            router.push('/dashboard/pembimbing');
          } else {
            router.push('/dashboard');
          }
          router.refresh();
        }, 800);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg('Terjadi kesalahan koneksi saat mencoba login.');
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      
      {/* GLOW DEKORATIF BACKGROUND */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* GRID PATTERN OVERLAY */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

      {/* CARD UTAMA LOGIN CONTAINER */}
      <div className="w-full max-w-md relative z-10 space-y-6">
        
        {/* BRANDING HEADER SEKOLAH */}
        <div className="text-center space-y-3">
          
          {/* LOGO SEKOLAH (PNG DINAMIS DENGAN FALLBACK Wikimedia/Wikimedia) */}
          <div className="inline-flex items-center justify-center relative">
            <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border shadow-2xl p-3 flex items-center justify-center backdrop-blur-xl group hover:scale-105 transition-all duration-300 ${
              theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'
            }`}>
              <img 
                src={schoolInfo.logoUrl} 
                alt={`Logo ${schoolInfo.name}`} 
                className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                onError={(e: any) => {
                  // Fallback jika file PNG lokal belum ditempatkan
                  e.target.onerror = null;
                  e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/1/15/Logo_SMK_Negeri_1_Adiwerna.png';
                }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold tracking-wider uppercase">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
              <span>{schoolInfo.name}</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">
              SI-<span className="text-indigo-600 dark:text-indigo-400">ERIN</span> <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">v2.0</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto font-medium">
              Sistem Informasi Praktik Kerja Lapangan (Prakerin SMK)
            </p>
          </div>
        </div>

        {/* CARD FORM LOGIN */}
        <div className={`border backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 transition-all ${
          theme === 'dark' 
            ? 'bg-slate-900/80 border-slate-800 text-white' 
            : 'bg-white/90 border-slate-200/80 text-slate-900 shadow-slate-200/50'
        }`}>
          
          <div className="border-b border-inherit pb-4">
            <h2 className="text-base font-extrabold flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
              <span>Masuk Portal SI-ERIN</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Masukkan NIS (Siswa) atau NIP/Username (Guru/Pokja) Anda.
            </p>
          </div>

          {/* ALERT NOTIFIKASI ERROR */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-start space-x-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ALERT NOTIFIKASI SUKSES */}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-start space-x-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* INPUT USERNAME / NIS */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span>Username / NIS / NIP</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan Username / NIS"
                  className={`w-full px-4 py-3.5 rounded-2xl text-xs font-semibold border outline-none transition-all ${
                    theme === 'dark' 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  }`}
                />
              </div>
            </div>

            {/* INPUT PASSWORD DENGAN TOGGLE EYE */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                <span>Kata Sandi</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-4 pr-11 py-3.5 rounded-2xl text-xs font-semibold border outline-none transition-all ${
                    theme === 'dark' 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-indigo-500 transition-all cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* TOMBOL SUBMIT LOGIN */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3.5 rounded-2xl text-xs font-extrabold transition-all duration-200 shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk ke Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* BADGE PETUNJUK AKSES PORTAL */}
          <div className="pt-2 flex flex-wrap justify-center gap-2 text-[10px] font-bold text-slate-400">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800/40 border border-slate-700/50 flex items-center space-x-1">
              <Users className="w-3 h-3 text-indigo-400" />
              <span>Siswa</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800/40 border border-slate-700/50 flex items-center space-x-1">
              <BookOpen className="w-3 h-3 text-emerald-400" />
              <span>Guru Pembimbing</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800/40 border border-slate-700/50 flex items-center space-x-1">
              <Building2 className="w-3 h-3 text-amber-400" />
              <span>Pokja & Admin</span>
            </span>
          </div>

          {/* FOOTER INFORMASI DUKUNGAN */}
          <div className="pt-4 border-t border-inherit text-center space-y-1">
            <p className="text-[11px] text-slate-500">
              Kendala masuk? Hubungi Tim Pokja Prakerin {schoolInfo.shortName}.
            </p>
          </div>

        </div>

        {/* FOOTER COPYRIGHT */}
        <p className="text-center text-[10px] text-slate-500 font-medium">
          &copy; 2026 {schoolInfo.name}. Enterprise Security Protected.
        </p>

      </div>

    </div>
  );
}