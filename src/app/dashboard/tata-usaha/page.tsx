// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Merombak UI Dashboard Tata Usaha menjadi Portal Menu Interaktif sesuai permintaan pengguna.
// ✨ Fitur Baru: Quick Access Cards untuk 4 jenis persuratan dan Pengaturan Akun.
// 🎨 UI/UX Update: Grid layout responsif dengan animasi hover & gradient card untuk pengalaman admin yang lebih baik.
// 🚀 Inovasi: Role-Specific Action Hub.
// ----------------------------------------------------------------------

'use client';

import React, { useState, useEffect } from 'react';
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
  ShieldCheck,
  BellRing
} from 'lucide-react';

export default function TataUsahaDashboardPage() {
  const { theme } = useTheme();
  const [counts, setCounts] = useState<{ permohonan?: number; penerjunan?: number }>({});
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetch('/api/tata-usaha?summary=true')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.counts) {
          setCounts(data.counts);
        }
      })
      .catch(err => console.error('Failed to fetch TU stats:', err))
      .finally(() => setLoadingStats(false));
  }, []);

  const menuItems = [
    {
      title: 'Surat Permohonan',
      description: 'Kelola dan cetak surat permohonan PKL / Prakerin untuk industri.',
      icon: FileText,
      href: '/dashboard/persuratan/permohonan',
      color: 'from-blue-500 to-cyan-500',
      iconColor: 'text-cyan-100',
      badgeCount: counts.permohonan,
      badgeLabel: 'Antrean'
    },
    {
      title: 'Surat Penerjunan',
      description: 'Cetak surat tugas pengantaran/penerjunan siswa ke lokasi industri.',
      icon: Truck,
      href: '/dashboard/persuratan/penerjunan',
      color: 'from-emerald-500 to-teal-500',
      iconColor: 'text-teal-100',
      badgeCount: counts.penerjunan,
      badgeLabel: 'Permintaan Masuk'
    },
    {
      title: 'Surat Tugas dan SPPD',
      description: 'Kelola Surat Perintah Perjalanan Dinas (SPPD) dan tugas monitoring.',
      icon: Search,
      href: '/dashboard/persuratan/sppd',
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
      <div className="flex items-center space-x-4 mb-4">
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

      {/* NOTIFIKASI REQUEST PENERJUNAN DARI POKJA */}
      {(counts.penerjunan ?? 0) > 0 && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm animate-in fade-in duration-500">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Request Surat Penerjunan dari Pokja Masuk</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500 text-white animate-pulse">
                  {counts.penerjunan} Siswa
                </span>
              </h4>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                Tim Pokja telah mengajukan request penerjunan untuk kelompok siswa. Silakan klik tombol di samping untuk mencetak Surat Tugas dan mengunggah Surat Pengantaran.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/persuratan/penerjunan"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-2xl shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <span>Buka Surat Penerjunan</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

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
                  <div className="flex items-center gap-3">
                    <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${item.color} shadow-lg`}>
                      <item.icon className={`w-7 h-7 ${item.iconColor}`} />
                    </div>
                    {item.badgeCount !== undefined && item.badgeCount > 0 && (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-md ${
                        item.title === 'Surat Penerjunan' 
                          ? 'bg-emerald-500 text-white animate-pulse' 
                          : 'bg-blue-500 text-white'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        {item.badgeCount} {item.badgeLabel}
                      </span>
                    )}
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
