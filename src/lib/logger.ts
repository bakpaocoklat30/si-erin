// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Membuat utility logger pusat untuk Automated Error Tracking.
// ----------------------------------------------------------------------

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function logServerException(error: any, reqInfo?: { path?: string; method?: string; userId?: string; ip?: string }) {
  try {
    const message = error?.message || String(error);
    const stack = error?.stack || null;

    console.error(`[SI-ERIN ERROR LOG] ${message}`, stack);

    await prisma.errorLog.create({
      data: {
        level: 'ERROR',
        message,
        stack,
        path: reqInfo?.path || null,
        method: reqInfo?.method || null,
        userId: reqInfo?.userId || null,
        ip: reqInfo?.ip || null,
      },
    });
  } catch (logErr) {
    console.error('[CRITICAL] Gagal menulis log error ke database:', logErr);
  }
}