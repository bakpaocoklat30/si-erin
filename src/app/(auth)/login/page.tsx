// 📋 CHANGELOG:
// ✅ Perubahan: Mengubah alur pengalihan login role `SISWA` pada Client Component ke rute plural resmi `/dashboard/students`.
// ✨ Fitur Baru: Plural Route Student Post-Login Navigation.
// 🎨 UI/UX Update: N/A (Login Client Component)
// 🔧 Bug Fix: Menyinkronkan target `router.push('/dashboard/students')` saat login sebagai siswa.
// 🚀 Inovasi: Client-Side Synchronized Auth Redirection.

'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LogIn, Loader2, ShieldCheck, AlertCircle, KeyRound, User } from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

export default function LoginPage() {
  const router = useRouter();
  const { theme } = useTheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('Username/NIS dan Password wajib diisi.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const result = await signIn('credentials', {
        username: username.trim(),
        password: password,
        redirect: false
      });

      if (result?.error) {
        setErrorMsg(result.error);
        setLoading(false);
      } else {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        const userRole = sessionData?.user?.role;

        if (userRole === 'ADMIN') {
          router.push('/dashboard/admin');
        } else if (userRole === 'POKJA') {
          router.push('/dashboard/pokja');
        } else if (userRole === 'SISWA') {
          router.push('/dashboard/students'); // 👈 Direct route ke plural students
        } else if (userRole === 'PEMBIMBING') {
          router.push('/dashboard/pembimbing');
        } else {
          router.push('/dashboard');
        }
        
        router.refresh();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg('Terjadi kesalahan koneksi saat mencoba login.');
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      <div className={`w-full max-w-md p-8 sm:p-10 rounded-3xl border shadow-2xl space-y-6 transition-all ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-3 border border-indigo-500/20 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            SI-ERIN <span className="text-indigo-500">Portal</span>
          </h1>
          <p className="text-xs text-slate-400">
            Sistem Informasi Praktik Kerja Lapangan (Prakerin SMK)
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Username / NIS</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan Username atau NIS"
              className={`w-full px-4 py-3.5 rounded-2xl text-xs font-semibold border outline-none transition-all ${
                theme === 'dark' 
                  ? 'bg-slate-950 border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                  : 'bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
              }`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span>Password</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full px-4 py-3.5 rounded-2xl text-xs font-semibold border outline-none transition-all ${
                theme === 'dark' 
                  ? 'bg-slate-950 border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                  : 'bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-2xl text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi Akun...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Masuk ke Dashboard</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-inherit text-center">
          <p className="text-[11px] text-slate-500">
            © 2026 SI-ERIN Prakerin SMK. Enterprise Security Protected.
          </p>
        </div>

      </div>
    </div>
  );
}