import { startAutoBackupCron } from './cron';

export function initBackupCronJob() {
  startAutoBackupCron();
}