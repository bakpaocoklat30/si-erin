// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Merombak UI Dashboard Tata Usaha menjadi Portal Menu Interaktif sesuai permintaan pengguna.
// ✨ Fitur Baru: Quick Access Cards untuk 4 jenis persuratan dan Pengaturan Akun.
// 🎨 UI/UX Update: Grid layout responsif dengan animasi hover & gradient card untuk pengalaman admin yang lebih baik.
// 🚀 Inovasi: Role-Specific Action Hub.
// ----------------------------------------------------------------------

'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/app/theme-provider';
import { 
  FileText, 
  Truck, 
  Award, 
  Settings,
  Search,
  ChevronRight,
  Mail,
  ShieldCheck
} from 'lucide-react';

export default function TataUsahaDashboardPage() {
  const { theme } = useTheme();

  const menuItems = [
    {
      title: 'Surat Permohonan',
      description: 'Kelola dan cetak surat permohonan PKL / Prakerin untuk industri.',
      icon: FileText,
      href: '/dashboard/persuratan/permohonan',
      color: 'from-blue-500 to-cyan-500',
      iconColor: 'text-cyan-100'
    },
    {
      title: 'Surat Penerjunan',
      description: 'Cetak surat tugas pengantaran/penerjunan siswa ke lokasi industri.',
      icon: Truck,
      href: '/dashboard/persuratan/penerjunan',
      color: 'from-emerald-500 to-teal-500',
      iconColor: 'text-teal-100'
    },
    {
      title: 'Surat Tugas dan SPPD',
      description: 'Kelola Surat Perintah Perjalanan Dinas (SPPD) dan tugas monitoring.',
      icon: Search,
      href: '/dashboard/persuratan/coming-soon?title=Surat%20Tugas%20%26%20SPPD',
      color: 'from-amber-500 to-orange-500',
      iconColor: 'text-orange-100'
    },
    {
      title: 'Surat Penarikan',
      description: 'Cetak surat penjemputan/penarikan saat masa PKL siswa telah selesai.',
      icon: Award,
      href: '/dashboard/persuratan/coming-soon?title=Surat%20Penarikan',
      color: 'from-purple-500 to-fuchsia-500',
      iconColor: 'text-fuchsia-100'
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER */}
      <div className="flex items-center space-x-4 mb-8">
        <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-500">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Portal Tata Usaha</h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            Pusat manajemen administrasi dan persuratan PKL
          </p>
        </div>
      </div>

      {/* QUICK ACCESS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {menuItems.map((item, idx) => (
          <Link href={item.href} key={idx} className="block group">
            <div className={`relative overflow-hidden rounded-3xl border transition-all duration-300 transform group-hover:-translate-y-1 group-hover:shadow-2xl ${
              theme === 'dark' 
                ? 'bg-slate-900 border-slate-800 group-hover:border-slate-700' 
                : 'bg-white border-slate-200 group-hover:border-slate-300'
            }`}>
              
              {/* Background Gradient Decorative */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${item.color} opacity-10 rounded-bl-full transform group-hover:scale-110 transition-transform duration-500`} />
              
              <div className="p-8 flex items-start justify-between">
                <div className="space-y-4">
                  <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${item.color} shadow-lg`}>
                    <item.icon className={`w-7 h-7 ${item.iconColor}`} />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-extrabold tracking-tight mb-2 group-hover:text-indigo-500 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-xs">
                      {item.description}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* SETTINGS CARD */}
      <div className="mt-8">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4 pl-2">Pengaturan Sistem</h2>
        <Link href="/dashboard/settings" className="block group">
          <div className={`flex items-center justify-between p-6 rounded-3xl border transition-all duration-300 ${
            theme === 'dark' 
              ? 'bg-slate-900 border-slate-800 hover:bg-slate-800/50' 
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}>
            <div className="flex items-center space-x-5">
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-indigo-500 transition-colors">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold">Ubah Sandi & Pengaturan Akun</h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">Sesuaikan profil dan amankan kredensial login Anda.</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
          </div>
        </Link>
      </div>

    </div>
  );
}
