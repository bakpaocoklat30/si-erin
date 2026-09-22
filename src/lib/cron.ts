import cron from 'node-cron';
import { db } from './db';
import { executeFullBackupSystem } from './backup-service';

const globalForCron = global as unknown as { 
  isCronStarted: boolean;
  lastBackupDate: string | null;
  isBackupRunning: boolean;
};

export function startAutoBackupCron() {
  if (globalForCron.isCronStarted) return;
  globalForCron.isCronStarted = true;
  globalForCron.lastBackupDate = null;
  globalForCron.isBackupRunning = false;

  console.log('🚀 [CRON] Auto-Backup Scheduler Initialized (Enterprise Direct Execution Engine)!');

  // Evaluasi jadwal setiap menit
  cron.schedule('* * * * *', async () => {
    try {
      if (globalForCron.isBackupRunning) {
        return; // Jangan jalankan ganda jika backup sebelumnya masih berlangsung
      }

      const enabledSetting = await db.systemSetting.findUnique({ where: { key: 'AUTO_BACKUP_ENABLED' } });
      if (enabledSetting?.value !== 'true') return;

      const timeSetting = await db.systemSetting.findUnique({ where: { key: 'AUTO_BACKUP_TIME' } });
      const targetTime = (timeSetting?.value || '00:00').trim();

      const now = new Date();

      // Format waktu zona Indonesia Barat (WIB / Asia/Jakarta)
      const wibTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now);

      // Format waktu lokal container/server
      const serverHours = String(now.getHours()).padStart(2, '0');
      const serverMinutes = String(now.getMinutes()).padStart(2, '0');
      const serverLocalTime = `${serverHours}:${serverMinutes}`;

      // Tanggal hari ini (WIB)
      const todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);

      // Cocokkan jam target (prioritas WIB, toleransi waktu lokal server)
      const isTimeMatch = (wibTime === targetTime) || (serverLocalTime === targetTime);

      if (isTimeMatch) {
        if (globalForCron.lastBackupDate === todayDateStr) {
          // Sudah berhasil dijalankan hari ini
          return;
        }

        console.log(`⏰ [CRON] Saatnya Auto Backup! (WIB: ${wibTime}, Server: ${serverLocalTime}, Target: ${targetTime}). Memulai backup...`);
        globalForCron.isBackupRunning = true;

        try {
          const result = await executeFullBackupSystem({ isCron: true });
          globalForCron.lastBackupDate = todayDateStr;
          console.log(`✅ [CRON SUCCESS] Auto Backup Berhasil:`, result.message);
        } catch (backupErr: any) {
          console.error(`❌ [CRON ERROR] Gagal mengeksekusi Auto Backup:`, backupErr?.message || backupErr);
        } finally {
          globalForCron.isBackupRunning = false;
        }
      }
    } catch (error) {
      console.error('[CRON ERROR] Kesalahan evaluasi auto backup scheduler:', error);
    }
  });
}

