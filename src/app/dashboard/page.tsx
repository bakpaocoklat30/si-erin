// 📋 CHANGELOG:
// ✅ Perubahan: Memperbarui Root Dashboard Router untuk mengarahkan pengguna ber-role `SISWA` ke rute resmi plural `/dashboard/students`.
// ✨ Fitur Baru: Precision Role Gateway to Plural Student Dashboard.
// 🎨 UI/UX Update: N/A (Server Component Router)
// 🔧 Bug Fix: Mengubah target redirect role SISWA dari `/dashboard/student` ke `/dashboard/students`.
// 🚀 Inovasi: Enterprise Standard Plural Route Mapping.

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

export default async function DashboardRootPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const role = (session.user as any)?.role;

  switch (role) {
    case 'ADMIN':
      redirect('/dashboard/admin');
    case 'POKJA':
      redirect('/dashboard/pokja');
    case 'SISWA':
      redirect('/dashboard/students'); // 👈 Rute resmi plural untuk siswa
    case 'PEMBIMBING':
      redirect('/dashboard/pembimbing');
    default:
      redirect('/login');
  }
}