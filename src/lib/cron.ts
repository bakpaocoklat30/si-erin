import cron from 'node-cron';
import { db } from './db';

const globalForCron = global as unknown as { isCronStarted: boolean };

export function startAutoBackupCron() {
  if (globalForCron.isCronStarted) return;
  globalForCron.isCronStarted = true;

  console.log('🚀 [CRON] Auto-Backup Scheduler Initialized!');

  // Run every minute to check if it's time
  cron.schedule('* * * * *', async () => {
    try {
      const enabledSetting = await db.systemSetting.findUnique({ where: { key: 'AUTO_BACKUP_ENABLED' } });
      if (enabledSetting?.value !== 'true') return;

      const timeSetting = await db.systemSetting.findUnique({ where: { key: 'AUTO_BACKUP_TIME' } });
      const targetTime = timeSetting?.value || '00:00';

      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}`;

      if (currentTime === targetTime) {
        console.log(`⏰ [CRON] Menjalankan Auto Backup pada jam ${currentTime}...`);
        
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const host = process.env.VERCEL_URL || process.env.HOST || 'localhost:3000';
        const url = `${protocol}://${host}/api/admin/backup`;
        
        fetch(url, {
          method: 'POST',
          headers: {
            'x-cron-secret': process.env.CRON_SECRET || 'super-secret-cron-key-123'
          }
        }).then(async (res) => {
          const text = await res.text();
          console.log('[CRON] Backup Response:', res.status, text);
        }).catch(err => {
          console.error('[CRON] Gagal memanggil endpoint backup:', err);
        });
      }
    } catch (error) {
      console.error('[CRON] Error executing auto backup:', error);
    }
  });
}
