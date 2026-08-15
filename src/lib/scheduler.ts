// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Membuat background scheduler untuk Automated Cron Backup ke Google Drive.
// ----------------------------------------------------------------------

import cron from 'node-cron';

export function initBackupCronJob() {
  // Dijalankan setiap hari pukul 00:00 (Tengah Malam)
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('[CRON] Memulai Automated Full Backup ke Google Drive...');
      
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': process.env.CRON_SECRET || 'si-erin-cron-secure-key'
        }
      });

      const data = await response.json();
      if (data.success) {
        console.log('[CRON SUCCESS] Automated Backup berhasil:', data.message);
      } else {
        console.error('[CRON ERROR] Gagal melakukan automated backup:', data.error);
      }
    } catch (err) {
      console.error('[CRON EXCEPTION] Terjadi kesalahan jaringan pada scheduler:', err);
    }
  });

  console.log('[SYSTEM] Automated Cron Backup Scheduler berhasil diinisialisasi (Jadwal: Setiap pukul 00:00 WIB).');
}