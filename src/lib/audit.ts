// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Membuat Helper Centralized untuk Audit Log & System Notification Dispatcher.
// ✨ Fitur Baru: Automatic Activity Tracker & Multi-Role Notification Emitter.
// 🎨 UI/UX Update: N/A (Backend Utility Helper)
// 🔧 Bug Fix: Menyediakan pencatatan jejak audit yang aman tanpa menghambat performa request utama.
// 🚀 Inovasi: Non-Blocking Asynchronous Audit Dispatcher.
// ----------------------------------------------------------------------

import { db } from '@/lib/db';

export async function createAuditLog({
  userId,
  username,
  userRole,
  action,
  module,
  details,
  ipAddress,
  userAgent
}: {
  userId?: string;
  username: string;
  userRole: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'VERIFY' | 'LOGIN' | 'RESTORE';
  module: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    const prisma = db as any;
    if (prisma.auditLog) {
      await prisma.auditLog.create({
        data: {
          userId: userId || null,
          username: username || 'SYSTEM',
          userRole: userRole || 'GUEST',
          action,
          module,
          details,
          ipAddress: ipAddress || '127.0.0.1',
          userAgent: userAgent || 'Unknown Client'
        }
      });
    }
  } catch (error) {
    console.error('❌ Failed to record audit log:', error);
  }
}

export async function sendNotification({
  userId,
  title,
  message,
  type = 'INFO',
  link
}: {
  userId: string;
  title: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
  link?: string;
}) {
  try {
    const prisma = db as any;
    if (prisma.notification) {
      await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          link: link || null
        }
      });
    }
  } catch (error) {
    console.error('❌ Failed to send notification:', error);
  }
}