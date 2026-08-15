// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Mengubah root dashboard menjadi Server-Side Router Gatekeeper mutlak dengan dukungan role TATA_USAHA.
// ✨ Fitur Baru: Strict Server-Side Role-Based Redirect Gateway for Admin, Pokja, Tata Usaha, Guru, & Siswa.
// 🎨 UI/UX Update: N/A (Server Component Router)
// 🔧 Bug Fix: Mencegah pengguna ber-role TATA_USAHA tersangkut dan melemparnya secara instan ke `/dashboard/tata-usaha`.
// 🚀 Inovasi: Absolute Fallback Prevention Architecture.
// ----------------------------------------------------------------------

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

export default async function DashboardRootPage() {
  // 1. Ambil sesi aktif secara server-side
  const session = await getServerSession(authOptions);

  // 2. Jika belum login sama sekali, lempar ke halaman login
  if (!session || !session.user) {
    redirect('/login');
  }

  // 3. Normalisasi role pengguna ke huruf kapital murni
  const rawRole = (session.user as any)?.role || '';
  const role = String(rawRole).toUpperCase().trim();

  // 4. Lakukan pengarahan (redirect) mutlak sesuai role
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    redirect('/dashboard/admin');
  } 
  else if (role === 'POKJA' || role === 'TIM_POKJA') {
    redirect('/dashboard/pokja');
  } 
  else if (role === 'TATA_USAHA' || role === 'TU') {
    // 👈 Rute resmi mutlak untuk Petugas Tata Usaha / Persuratan
    redirect('/dashboard/tata-usaha');
  } 
  else if (role === 'SISWA' || role === 'STUDENT') {
    redirect('/dashboard/students');
  } 
  else if (role === 'PEMBIMBING' || role === 'GURU' || role === 'TEACHER' || role === 'GURUPMB') {
    // Rute resmi mutlak untuk Guru Pembimbing
    redirect('/dashboard/pembimbing');
  } 
  else {
    // Fallback darurat jika role tidak dikenali sistem
    redirect('/login');
  }
}