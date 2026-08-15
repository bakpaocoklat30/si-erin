// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Halaman Pengaturan / Update Profil pengguna untuk mengganti Nama dan Password.
// ✨ Fitur Baru:
//    - Live Password Validation & Toggle View Password.
//    - High-Contrast Dual Theme Support (Light Mode Kebal Samar).
// 🎨 UI/UX Update: Card form futuristik dengan indikator keamanan password.
// 🔧 Bug Fix: Menyelesaikan masalah sinkronisasi profil user.
// 🚀 Inovasi: Profile Security Suite for SI-ERIN.
// ----------------------------------------------------------------------

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/app/theme-provider';

import {
  User,
  Lock,
  KeyRound,
  ShieldCheck,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  Phone,
  Building,
  Sparkles
} from 'lucide-react';

export default function UserSettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // State Form Profil
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');

  // State Form Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Show Password Toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Ambil Data Profil Pengguna saat Halaman Ditinggalkan
  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/profile');
        const json = await res.json();
        if (res.ok && json.success) {
          setName(json.user.name || '');
          setUsername(json.user.username || '');
          setRole(json.user.role || '');
          setPhone(json.user.phone || '');
          setDepartment(json.user.department || '');
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  // Submit Handler Update Profil
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        setErrorMsg('Masukkan password saat ini untuk memverifikasi perubahan password!');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('Konfirmasi password baru tidak cocok!');
        return;
      }
      if (newPassword.length < 6) {
        setErrorMsg('Password baru minimal 6 karakter!');
        return;
      }
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          currentPassword: currentPassword ? currentPassword.trim() : undefined,
          newPassword: newPassword ? newPassword.trim() : undefined
        })
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setSuccessMsg(json.message || 'Profil berhasil diperbarui!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        // Trigger NextAuth Session Update jika nama berubah
        if (updateSession) {
          await updateSession({ name: name.trim() });
        }
      } else {
        setErrorMsg(json.error || 'Gagal memperbarui profil.');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setErrorMsg('Terjadi kesalahan koneksi saat memperbarui profil.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen p-8 flex flex-col justify-center items-center space-y-4 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Memuat Pengaturan Akun Anda...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/80 text-slate-900'
    }`}>

      {/* HEADER BANNER */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Manajemen Pengaturan Akun Pengguna</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Pengaturan Profil & Keamanan Akun
          </h1>
          <p className="text-xs text-slate-700 dark:text-slate-400 max-w-2xl font-medium">
            Kelola nama lengkap, nomor telepon, dan perbarui kata sandi akun Anda untuk menjaga keamanan data di portal SI-ERIN.
          </p>
        </div>

        <div className="flex items-center space-x-3 px-4 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
          <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Role Aktif: <strong>{role}</strong></span>
        </div>
      </div>

      {/* ALERT NOTIFIKASI */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* FORM UTAMA */}
      <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* KOLOM KIRI: DOKUMEN PROFIL PENGGUNA */}
        <div className={`lg:col-span-6 p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/50'
        }`}>
          <div className="flex items-center space-x-3 border-b border-inherit pb-4">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Informasi Pribadi</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Perbarui identitas pengguna yang tersimpan di database.</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-800 dark:text-slate-300 uppercase">Username (Fixed Login ID):</label>
              <input
                type="text"
                disabled
                value={username}
                className={`w-full px-4 py-3 rounded-2xl text-xs font-mono font-bold border outline-none cursor-not-allowed ${
                  theme === 'dark'
                    ? 'bg-slate-950/80 border-slate-800 text-slate-400'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              />
              <span className="text-[10px] text-slate-600 dark:text-slate-500 font-semibold">Username diatur oleh Administrator Sekolah.</span>
            </div>

            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-800 dark:text-slate-300 uppercase">Nama Lengkap Pengguna: *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan Nama Lengkap Anda"
                className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600 shadow-sm'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-800 dark:text-slate-300 uppercase">Nomor WhatsApp / Telepon:</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081234567890"
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600 shadow-sm'
                  }`}
                />
              </div>
            </div>

            {department && (
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-800 dark:text-slate-300 uppercase">Jurusan Naungan:</label>
                <div className="flex items-center space-x-2 px-4 py-3 rounded-2xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 font-bold">
                  <Building className="w-4 h-4 shrink-0" />
                  <span>{department}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KOLOM KANAN: KEAMANAN KATA SANDI */}
        <div className={`lg:col-span-6 p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/50'
        }`}>
          <div className="flex items-center space-x-3 border-b border-inherit pb-4">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Ganti Kata Sandi</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Kosongkan bagian ini jika tidak ingin mengubah password.</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-800 dark:text-slate-300 uppercase">Password Saat Ini:</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Password lama Anda"
                  className={`w-full pl-10 pr-10 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-600 shadow-sm'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-800 dark:text-slate-300 uppercase">Password Baru:</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 Karakter"
                  className={`w-full pl-10 pr-10 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-600 shadow-sm'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-800 dark:text-slate-300 uppercase">Konfirmasi Password Baru:</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-600 shadow-sm'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-2xl text-xs font-black transition-all shadow-xl shadow-indigo-600/30 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Simpan Perubahan Profil</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}