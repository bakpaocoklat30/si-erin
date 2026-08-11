// 📋 CHANGELOG:
// ✅ Perubahan: Menambahkan state `isCollapsed` pada layout dashboard agar padding wrapper menyesuaikan lebar sidebar saat disembunyikan.
// ✨ Fitur Baru: Dynamic responsive main content margin based on sidebar collapse state.
// 🎨 UI/UX Update: Transisi lebar layout yang mulus (smooth sidebar toggle).
// 🔧 Bug Fix: Menyelesaikan masalah tumpang tindih margin konten saat sidebar dilipat.
// 🚀 Inovasi: Adaptive fluid dashboard layout manager.

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { Menu } from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme } = useTheme();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [liveName, setLiveName] = useState('Pengguna');

  const rawRole = (session?.user as any)?.role || 'SISWA';
  const userRole = String(rawRole).toUpperCase();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      if (userRole === 'SISWA') {
        const timestamp = new Date().getTime();
        fetch(`/api/students/profile?t=${timestamp}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
          .then((res) => res.json())
          .then((data) => {
            if (data && data.name) {
              setLiveName(data.name);
            } else if (session?.user?.name) {
              setLiveName(session.user.name);
            }
          })
          .catch(() => {
            if (session?.user?.name) setLiveName(session.user.name);
          });
      } else if (session?.user?.name) {
        setLiveName(session.user.name);
      }
    }
  }, [session, userRole, status]);

  if (status === 'loading') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-400">Memverifikasi Sesi Keamanan...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const initial = liveName ? liveName.charAt(0).toUpperCase() : 'U';

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Sidebar dengan state collapse */}
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
      />

      {/* Main Content Wrapper dengan penyesuaian padding kiri responsif */}
      <div className={`flex-1 flex flex-col transition-all duration-300 relative z-0 ${
        isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
      }`}>
        
        {/* Top Header Navbar */}
        <header className={`h-20 border-b px-6 sm:px-10 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md transition-colors ${
          theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className={`lg:hidden p-2 rounded-xl border cursor-pointer ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'
              }`}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-xs sm:text-sm font-medium">
              <span className="text-slate-400">Portal Aktif: </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                userRole === 'ADMIN' || userRole === 'POKJA' 
                  ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' 
                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              }`}>
                {userRole}
              </span>
            </div>
          </div>

          {/* User Profile Badge */}
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <p className={`text-sm font-bold leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {liveName}
              </p>
              <p className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider mt-0.5 flex items-center justify-end space-x-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <span>ONLINE</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shadow-lg shadow-indigo-600/30 text-sm">
              {initial}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 relative z-0">
          {children}
        </main>
      </div>

    </div>
  );
}