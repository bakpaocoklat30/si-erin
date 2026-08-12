// 📋 CHANGELOG:
// ✅ Perubahan: Memperbaiki ekstraksi `useSession()` agar tahan banting (*prerender-safe*) saat `next build` mengevaluasi komponen secara statis.
// ✨ Fitur Baru: Multi-Role Dynamic Navigation, Collapsible Sidebar State, & High-Contrast Adaptive Light/Dark Colors.
// 🎨 UI/UX Update: Highlight rute aktif, kontras border Slate, dan logo SI-ERIN berdesain modern.
// 🔧 Bug Fix: Menyelesaikan 'Cannot destructure property data of useSession as it is undefined' saat Docker build.
// 🚀 Inovasi: Prerender-Proof Enterprise Adaptive Sidebar Engine.

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  X, 
  UserCog, 
  Send, 
  Sun, 
  Moon, 
  Database, 
  FileSpreadsheet, 
  Building2,
  Briefcase,
  Layers,
  ChevronLeft,
  UserCheck,
  Calendar,
  Lock,
  RotateCcw
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useTheme } from '@/app/theme-provider';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen, isCollapsed = false, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();
  
  // 🛡️ Safe useSession Extraction (Mencegah crash saat SSG Prerender)
  const sessionState = useSession();
  const session = sessionState?.data;
  const status = sessionState?.status || 'loading';

  const { theme, toggleTheme } = useTheme();
  
  const [mounted, setMounted] = useState(false);
  const [isClassAllowedPkl, setIsClassAllowedPkl] = useState(true);

  const rawRole = (session?.user as any)?.role || 'SISWA';
  const userRole = String(rawRole).toUpperCase();
  const userClassName = (session?.user as any)?.className;

  useEffect(() => {
    setMounted(true);
    if (userRole === 'SISWA' && userClassName) {
      fetch(`/api/students/permission?className=${encodeURIComponent(userClassName)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.success) {
            setIsClassAllowedPkl(data.isAllowedPkl);
          }
        })
        .catch(err => console.error('Error fetching class permission:', err));
    }
  }, [userRole, userClassName]);

  const studentMenu = [
    { name: 'Dashboard Overview', href: '/dashboard', icon: LayoutDashboard },
    ...(isClassAllowedPkl ? [
      { name: 'Pengajuan Tempat PKL', href: '/dashboard/students/pengajuan', icon: Send }
    ] : []),
    { name: 'Teman Satu Kelompok', href: '/dashboard/students/kelompok', icon: Users },
    { name: 'Update Profil Siswa', href: '/dashboard/students/profile', icon: UserCog },
  ];

  const pokjaMenu = [
    { name: 'Dashboard Pokja', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Verifikasi Pengajuan', href: '/dashboard/pokja/verifikasi', icon: UserCheck },
    { name: 'Kelompok Prakerin', href: '/dashboard/pokja/kelompok', icon: Users },
    { name: 'Pengaturan Periode', href: '/dashboard/pokja/periods', icon: Calendar },
    { name: 'Manajemen Kelas Pokja', href: '/dashboard/pokja/classes', icon: Layers },
    { name: 'Manajemen Siswa', href: '/dashboard/pokja/students', icon: Users },
    { name: 'Kelola Industri Mitra', href: '/dashboard/pokja/industries', icon: Building2 },
    { name: 'Kelola Kategori Industri', href: '/dashboard/pokja/categories', icon: Briefcase },
  ];

  const adminMenu = [
    { name: 'Dashboard Utama', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Reset Progress Siswa', href: '/dashboard/admin/students/reset', icon: RotateCcw },
    { name: 'Eksplorasi Jurusan & Kelas', href: '/dashboard/admin/departments', icon: Layers },
    { name: 'Master Data', href: '/dashboard/admin/master', icon: Database },
    { name: 'Kelola Pengguna', href: '/dashboard/admin/users', icon: Users },
    { name: 'Import CSV Siswa', href: '/dashboard/admin/students/import', icon: FileSpreadsheet },
    { name: 'Industri Mitra (Read-Only)', href: '/dashboard/admin/industries', icon: Building2 },
  ];

  let menuItems = studentMenu;
  let menuLabel = 'Menu Siswa';

  if (userRole === 'ADMIN') {
    menuItems = adminMenu;
    menuLabel = 'Menu Administrator';
  } else if (userRole === 'POKJA') {
    menuItems = pokjaMenu;
    menuLabel = 'Menu Tim Pokja';
  }

  return (
    <>
      {/* MOBILE BACKDROP OVERLAY */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[99998] lg:hidden cursor-pointer transition-opacity"
        ></div>
      )}

      {/* ASIDE CONTAINER */}
      <aside
        className={`fixed inset-y-0 left-0 z-[99999] border-r flex flex-col justify-between transition-all duration-300 ease-in-out pointer-events-auto ${
          isCollapsed ? 'w-20' : 'w-72'
        } ${
          theme === 'dark'
            ? 'bg-slate-950 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200/90 text-slate-900 shadow-xl shadow-slate-200/40'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* TOP BRAND HEADER */}
        <div className={`p-5 border-b flex items-center justify-between shrink-0 ${
          theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <Link 
            href="/dashboard"
            onClick={() => setIsOpen(false)}
            className="flex items-center space-x-3 cursor-pointer group overflow-hidden"
          >
            <div className="bg-indigo-600 text-white p-2.5 rounded-2xl font-black text-base flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0 group-hover:scale-105 transition-transform">
              SI
            </div>
            {!isCollapsed && (
              <div>
                <h1 className={`font-black tracking-wider text-base ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  SI-ERIN
                </h1>
                <p className={`text-[10px] font-bold tracking-widest uppercase ${
                  theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                }`}>
                  Prakerin SMK
                </p>
              </div>
            )}
          </Link>

          <div className="flex items-center space-x-1">
            {setIsCollapsed && (
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`hidden lg:flex p-1.5 rounded-xl border transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
                title={isCollapsed ? "Buka Sidebar" : "Sembunyikan Sidebar"}
              >
                <ChevronLeft className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={`lg:hidden p-1.5 rounded-xl border transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MIDDLE SECTION: MENU ITEMS */}
        <div className="flex-1 px-3 py-6 space-y-6 overflow-y-auto relative z-10">
          <div className="space-y-1.5">
            {!isCollapsed && (
              <div className="flex justify-between items-center px-3 mb-3">
                <p className={`text-[10px] font-black uppercase tracking-widest ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  {!mounted || status === 'loading' ? 'Memuat...' : menuLabel}
                </p>
                {userRole === 'SISWA' && !isClassAllowedPkl && (
                  <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center">
                    <Lock className="w-2.5 h-2.5 mr-1" />
                    PKL Ditutup
                  </span>
                )}
              </div>
            )}
            
            {!mounted || status === 'loading' ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3, 4, 5].map((skeleton) => (
                  <div key={skeleton} className={`h-11 rounded-2xl ${
                    theme === 'dark' ? 'bg-slate-900' : 'bg-slate-100'
                  }`}></div>
                ))}
              </div>
            ) : (
              menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.name : undefined}
                    onClick={() => { if (typeof window !== 'undefined' && window.innerWidth < 1024) setIsOpen(false); }}
                    className={`flex items-center space-x-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer relative z-20 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : theme === 'dark' 
                          ? 'text-slate-400 hover:bg-slate-900 hover:text-slate-100' 
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    }`} />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                );
              })
            )}
          </div>

          {!isCollapsed && (
            <div className="space-y-1 pt-4 border-t border-inherit">
              <p className={`px-3 text-[10px] font-black uppercase tracking-widest mb-2 ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Preferensi Tampilan
              </p>
              <button
                type="button"
                onClick={toggleTheme}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer relative z-20 ${
                  theme === 'dark' 
                    ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' 
                    : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                }`}
              >
                <span className="flex items-center space-x-2">
                  {mounted && theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-amber-500" />}
                  <span>{mounted && theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  {mounted ? theme : '...'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* BOTTOM SECTION: LOGOUT BUTTON */}
        <div className={`p-4 border-t shrink-0 relative z-10 ${
          theme === 'dark' ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50/50'
        }`}>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            title={isCollapsed ? "Keluar Sistem" : undefined}
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer relative z-20"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Keluar Sistem</span>}
          </button>
        </div>

      </aside>
    </>
  );
}