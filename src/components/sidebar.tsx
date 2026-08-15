// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Menghapus kelompok menu "Manajemen Persuratan PKL" dari navigasi Tim Pokja (`pokjaGroups`).
// ✨ Fitur Baru:
//    - Streamlined Pokja Workflow (Tim Pokja berfokus penuh pada Verifikasi, Pengelompokan, Pembimbing, dan Parameter Mitra).
//    - Menu persuratan tetap aktif & fokus pada role Tata Usaha & Admin.
//    - Pengaturan Akun & Password universal tetap tersedia untuk seluruh role.
// 🎨 UI/UX Update: Tampilan sidebar Pokja yang sangat ringkas, bersih, dan efisien.
// 🔧 Bug Fix: Mengeliminasi tumpang tindih tanggung jawab persuratan antara Pokja dan Tata Usaha.
// 🚀 Inovasi: Role-Focused Clean Navigation Suite for Pokja SI-ERIN.
// ----------------------------------------------------------------------

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
  UploadCloud,
  Clock,
  Building,
  BarChart3,
  ShieldAlert,
  FileText,
  Truck,
  Search,
  Award,
  ShieldCheck,
  Settings,
  GraduationCap
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useTheme } from '@/app/theme-provider';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

interface MenuItem {
  name: string;
  href: string;
  icon: any;
}

interface MenuGroup {
  groupLabel?: string;
  items: MenuItem[];
}

export default function Sidebar({ isOpen, setIsOpen, isCollapsed = false, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();
  
  const sessionState = useSession();
  const session = sessionState?.data;
  const status = sessionState?.status || 'loading';

  const { theme, toggleTheme } = useTheme();
  
  const [mounted, setMounted] = useState(false);
  const [isClassAllowedPkl, setIsClassAllowedPkl] = useState(true);

  const rawRole = (session?.user as any)?.role || 'SISWA';
  const userRole = String(rawRole).toUpperCase().trim();
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

  // ----------------------------------------------------------------------
  // 1. SUBMENU MODUL PERSURATAN (KHUSUS TATA USAHA & ADMIN)
  // ----------------------------------------------------------------------
  const persuratanMenuItems: MenuItem[] = [
    { name: 'Surat Permohonan', href: '/dashboard/persuratan/permohonan', icon: FileText },
    { name: 'Surat Penerjunan', href: '/dashboard/persuratan/coming-soon?title=Surat%20Penerjunan', icon: Truck },
    { name: 'Surat Monitoring', href: '/dashboard/persuratan/coming-soon?title=Surat%20Monitoring', icon: Search },
    { name: 'Surat Penarikan', href: '/dashboard/persuratan/coming-soon?title=Surat%20Penarikan', icon: Award },
    { name: 'Template Surat', href: '/dashboard/persuratan/coming-soon?title=Template%20Surat', icon: FileSpreadsheet },
    { name: 'Pengaturan Kepsek & TTD', href: '/dashboard/persuratan/coming-soon?title=Pengaturan%20Kepsek%20%26%20TTD', icon: UserCheck },
  ];

  // ----------------------------------------------------------------------
  // 2. NAVIGASI MENU TIM POKJA PRAKERIN (STREAMLINED - TANPA MANAJEMEN PERSURATAN)
  // ----------------------------------------------------------------------
  const pokjaGroups: MenuGroup[] = [
    {
      groupLabel: 'Utama & Analitik Pokja',
      items: [
        { name: 'Dashboard Pokja', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Analytics & Ekspor Data', href: '/dashboard/pokja/analytics', icon: BarChart3 },
      ]
    },
    {
      groupLabel: 'Verifikasi & Pengelompokan',
      items: [
        { name: 'Verifikasi Pengajuan PKL', href: '/dashboard/pokja/verifikasi', icon: UserCheck },
        { name: 'Kelompok Prakerin & Pembimbing', href: '/dashboard/pokja/kelompok', icon: Users },
        { name: 'Manajemen Data Siswa', href: '/dashboard/pokja/students', icon: GraduationCap },
      ]
    },
    {
      groupLabel: 'Master Parameter & Mitra',
      items: [
        { name: 'Industri Mitra PKL', href: '/dashboard/pokja/industries', icon: Building2 },
        { name: 'Alokasi Jam PKL', href: '/dashboard/pokja/hours', icon: Clock },
        { name: 'Manajemen Kelas & Jurusan', href: '/dashboard/pokja/classes', icon: Layers },
        { name: 'Periode Pelaksanaan PKL', href: '/dashboard/pokja/periods', icon: Calendar },
        { name: 'Kategori Industri Mitra', href: '/dashboard/pokja/categories', icon: Briefcase },
        { name: 'Pengaturan Akun & Password', href: '/dashboard/settings', icon: Settings },
      ]
    }
  ];

  // ----------------------------------------------------------------------
  // 3. NAVIGASI MENU SISWA
  // ----------------------------------------------------------------------
  const studentGroups: MenuGroup[] = [
    {
      groupLabel: 'Utama',
      items: [
        { name: 'Dashboard Overview', href: '/dashboard', icon: LayoutDashboard },
        ...(isClassAllowedPkl ? [
          { name: 'Pengajuan Tempat PKL', href: '/dashboard/students/pengajuan', icon: Send }
        ] : []),
        { name: 'Teman Satu Kelompok', href: '/dashboard/students/kelompok', icon: Users },
      ]
    },
    {
      groupLabel: 'Akun & Keamanan',
      items: [
        { name: 'Update Profil Siswa', href: '/dashboard/students/profile', icon: UserCog },
        { name: 'Pengaturan Kata Sandi', href: '/dashboard/settings', icon: Settings },
      ]
    }
  ];

  // ----------------------------------------------------------------------
  // 4. NAVIGASI TERKELOMPOK TATA USAHA (TU) - FOKUS PERSURATAN & ANALYTICS
  // ----------------------------------------------------------------------
  const tataUsahaGroups: MenuGroup[] = [
    {
      groupLabel: 'Utama & Analytics TU',
      items: [
        { name: 'Dashboard Utama', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Analytics Persuratan TU', href: '/dashboard/tata-usaha', icon: ShieldCheck },
      ]
    },
    {
      groupLabel: 'Manajemen Persuratan PKL',
      items: persuratanMenuItems
    },
    {
      groupLabel: 'Pengaturan Akun',
      items: [
        { name: 'Pengaturan Akun & Password', href: '/dashboard/settings', icon: Settings },
      ]
    }
  ];

  // ----------------------------------------------------------------------
  // 5. NAVIGASI MENU GURU PEMBIMBING
  // ----------------------------------------------------------------------
  const pembimbingGroups: MenuGroup[] = [
    {
      groupLabel: 'Bimbingan',
      items: [
        { name: 'Dashboard Pembimbing', href: '/dashboard/pembimbing', icon: LayoutDashboard },
        { name: 'Siswa Bimbingan', href: '/dashboard/pembimbing', icon: Users },
      ]
    },
    {
      groupLabel: 'Akun Saya',
      items: [
        { name: 'Pengaturan Akun & Password', href: '/dashboard/settings', icon: Settings },
      ]
    }
  ];

  // ----------------------------------------------------------------------
  // 6. NAVIGASI MENU ADMINISTRATOR
  // ----------------------------------------------------------------------
  const adminGroups: MenuGroup[] = [
    {
      groupLabel: 'Sistem & Konfigurasi',
      items: [
        { name: 'Dashboard Utama', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Analytics Persuratan TU', href: '/dashboard/tata-usaha', icon: ShieldCheck },
        { name: 'Pengaturan Sekolah', href: '/dashboard/admin/settings/school', icon: Building },
        { name: 'Master Data', href: '/dashboard/admin/master', icon: Database },
        { name: 'Eksplorasi Jurusan & Kelas', href: '/dashboard/admin/departments', icon: Layers },
      ]
    },
    {
      groupLabel: 'Manajemen Persuratan PKL',
      items: persuratanMenuItems
    },
    {
      groupLabel: 'Manajemen User & Industri',
      items: [
        { name: 'Kelola Pengguna', href: '/dashboard/admin/users', icon: Users },
        { name: 'Import CSV Siswa', href: '/dashboard/admin/students/import', icon: FileSpreadsheet },
        { name: 'Industri Mitra (Read-Only)', href: '/dashboard/admin/industries', icon: Building2 },
      ]
    },
    {
      groupLabel: 'Keamanan & Backup',
      items: [
        { name: 'Audit Trail Logs', href: '/dashboard/admin/audit-logs', icon: ShieldAlert },
        { name: 'Pencadangan Google Drive', href: '/dashboard/admin/backup', icon: UploadCloud },
        { name: 'Reset Progress Siswa', href: '/dashboard/admin/students/reset', icon: Clock },
        { name: 'Pengaturan Akun & Password', href: '/dashboard/settings', icon: Settings },
      ]
    }
  ];

  // SELEKSI GRUP MENU BERDASARKAN ROLE USER
  let menuGroups = studentGroups;

  if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
    menuGroups = adminGroups;
  } else if (userRole === 'POKJA' || userRole === 'TIM_POKJA') {
    menuGroups = pokjaGroups;
  } else if (userRole === 'TATA_USAHA' || userRole === 'TU' || userRole === 'TATAUSAHA') {
    menuGroups = tataUsahaGroups;
  } else if (userRole === 'PEMBIMBING' || userRole === 'GURU' || userRole === 'TEACHER' || userRole === 'GURUPMB') {
    menuGroups = pembimbingGroups;
  }

  return (
    <>
      {/* MOBILE BACKDROP */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[99998] lg:hidden cursor-pointer transition-opacity"
        ></div>
      )}

      {/* SIDEBAR MAIN CONTAINER */}
      <aside
        className={`fixed inset-y-0 left-0 z-[99999] border-r flex flex-col justify-between transition-all duration-300 ease-in-out pointer-events-auto ${
          isCollapsed ? 'w-20' : 'w-72'
        } ${
          theme === 'dark'
            ? 'bg-slate-950 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200/90 text-slate-900 shadow-xl shadow-slate-200/40'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* SIDEBAR HEADER */}
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

        {/* SIDEBAR SCROLLABLE CONTENT */}
        <div className="flex-1 px-3 py-6 space-y-6 overflow-y-auto relative z-10 custom-scrollbar">
          {!mounted || status === 'loading' ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <div key={s} className={`h-11 rounded-2xl ${
                  theme === 'dark' ? 'bg-slate-900' : 'bg-slate-100'
                }`}></div>
              ))}
            </div>
          ) : (
            menuGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1.5">
                {/* GROUP SECTION LABEL */}
                {!isCollapsed && group.groupLabel && (
                  <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${
                      theme === 'dark' ? 'text-indigo-400/80' : 'text-indigo-600/80'
                    }`}>
                      {group.groupLabel}
                    </p>
                  </div>
                )}

                {/* GROUP ITEMS */}
                {group.items.map((item) => {
                  const IconComponent = item.icon || LayoutDashboard;
                  
                  const itemBaseHref = item.href.split('?')[0];
                  const isActive = pathname === item.href || (itemBaseHref !== '/dashboard' && pathname?.startsWith(itemBaseHref));

                  return (
                    <Link
                      key={item.name + item.href}
                      href={item.href}
                      title={isCollapsed ? item.name : undefined}
                      onClick={() => { if (typeof window !== 'undefined' && window.innerWidth < 1024) setIsOpen(false); }}
                      className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer relative z-20 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                          : theme === 'dark' 
                            ? 'text-slate-400 hover:bg-slate-900 hover:text-slate-100' 
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <IconComponent className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                      }`} />
                      {!isCollapsed && <span className="truncate">{item.name}</span>}
                    </Link>
                  );
                })}

                {/* DIVIDER ANTAR KELOMPOK */}
                {groupIdx < menuGroups.length - 1 && (
                  <div className={`my-3 border-b ${
                    theme === 'dark' ? 'border-slate-800/60' : 'border-slate-200/60'
                  }`} />
                )}
              </div>
            ))
          )}

          {/* PREFERENSI TAMPILAN */}
          {!isCollapsed && (
            <div className="space-y-1 pt-4 border-t border-inherit">
              <p className={`px-3 text-[10px] font-black uppercase tracking-widest mb-2 ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Preferensi Tema
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

        {/* SIDEBAR FOOTER (LOGOUT) */}
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