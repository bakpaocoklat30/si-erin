// 📋 CHANGELOG:
// ✅ Perubahan: Pembuatan FULL CODE komponen Header global untuk dashboard SI-ERIN dengan tombol hamburger menu mobile, penanda portal role aktif, status online indicator, dan profil ringkas pengguna.
// ✨ Fitur Baru: Mobile Menu Trigger, Role-Based Badge System, & High-Contrast Light/Dark Theme Support.
// 🎨 UI/UX Update: Glassmorphism blur effect, kontras teks Slate-900 di Light Mode, dan profil avatar yang tajam.
// 🔧 Bug Fix: Mengisi file Header yang sebelumnya kosong tanpa isi.
// 🚀 Inovasi: Responsive Multi-Role Dashboard Topbar Engine.

'use client';

import { useSession } from 'next-auth/react';
import { useTheme } from '@/app/theme-provider';
import { Menu, Bell, Shield, User, Circle, Sparkles } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const { theme } = useTheme();

  const rawRole = (session?.user as any)?.role || 'SISWA';
  const userRole = String(rawRole).toUpperCase();
  const userName = session?.user?.name || 'Pengguna SI-ERIN';
  const userEmail = session?.user?.email || 'user@sierin.sch.id';

  // Badge Warna berdasarkan Role
  const getRoleBadgeStyle = () => {
    switch (userRole) {
      case 'ADMIN':
        return 'bg-purple-600 text-white shadow-purple-600/20';
      case 'POKJA':
        return 'bg-amber-600 text-white shadow-amber-600/20';
      default:
        return 'bg-indigo-600 text-white shadow-indigo-600/20';
    }
  };

  return (
    <header className={`h-20 px-4 sm:px-8 border-b flex items-center justify-between sticky top-0 z-40 transition-colors duration-300 ${
      theme === 'dark'
        ? 'bg-slate-950/85 border-slate-800 text-slate-100 backdrop-blur-md'
        : 'bg-white/90 border-slate-200/90 text-slate-900 backdrop-blur-md shadow-sm shadow-slate-200/50'
    }`}>
      
      {/* LEFT SECTION: HAMBURGER BUTTON (MOBILE) & PORTAL ACTIVE BADGE */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className={`p-2.5 rounded-2xl border transition-all lg:hidden cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
            }`}
            title="Buka Navigasi Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center space-x-2.5">
          <span className={`text-xs font-bold hidden sm:inline ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Portal Aktif:
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-md ${getRoleBadgeStyle()}`}>
            {userRole}
          </span>
        </div>
      </div>

      {/* RIGHT SECTION: SYSTEM STATUS & USER PROFILE */}
      <div className="flex items-center space-x-3 sm:space-x-5">
        
        {/* ONLINE STATUS BADGE */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
          <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500 animate-pulse" />
          <span>ONLINE</span>
        </div>

        {/* NOTIFICATION BELL */}
        <button
          type="button"
          className={`p-2.5 rounded-2xl border transition-all relative cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
              : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
          }`}
          title="Notifikasi"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-600"></span>
        </button>

        {/* USER PROFILE INFO & AVATAR */}
        <div className="flex items-center space-x-3 pl-3 border-l border-inherit">
          <div className="text-right hidden sm:block">
            <h4 className={`text-xs font-extrabold leading-tight ${
              theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
            }`}>
              {userName}
            </h4>
            <span className={`text-[10px] font-semibold block ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {userEmail}
            </span>
          </div>

          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md shadow-indigo-600/30 shrink-0">
            {userName[0]?.toUpperCase() || 'S'}
          </div>
        </div>

      </div>

    </header>
  );
}