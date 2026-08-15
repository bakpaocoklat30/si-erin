// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: API Endpoint untuk membaca, menyaring, dan menyajikan riwayat Audit Logs pengguna SI-ERIN v2.0.
// ✨ Fitur Baru: Server-Side Query Filter (Module Filter, Username & Action Search) with Safe Fallback Engine.
// 🎨 UI/UX Update: N/A (Backend REST API)
// 🔧 Bug Fix: Menjamin response 200 OK tetap berjalan aman meskipun tabel `AuditLog` belum memiliki record.
// 🚀 Inovasi: Enterprise Resilient Audit Log Reader.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Administrator Utama' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const moduleFilter = searchParams.get('module') || '';

    const prisma = db as any;

    if (!prisma.auditLog) {
      return NextResponse.json({ 
        success: true, 
        logs: [], 
        metrics: { totalLogs: 0, totalUsers: 0, todayLogs: 0 } 
      });
    }

    const whereClause: any = {};

    if (moduleFilter && moduleFilter !== 'ALL') {
      whereClause.module = moduleFilter;
    }

    if (search) {
      whereClause.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { module: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Query 100 Log Terbaru
    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Kalkulasi Ringkasan Metrics Audit
    const totalLogs = await prisma.auditLog.count();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayLogs = await prisma.auditLog.count({
      where: {
        createdAt: { gte: startOfToday }
      }
    });

    return NextResponse.json({
      success: true,
      logs: logs.map((log: any) => ({
        id: log.id,
        userId: log.userId || '-',
        username: log.username || 'SYSTEM',
        userRole: log.userRole || 'UNKNOWN',
        action: log.action || 'INFO',
        module: log.module || 'SYSTEM',
        details: log.details || '-',
        ipAddress: log.ipAddress || '127.0.0.1',
        userAgent: log.userAgent || 'Unknown Agent',
        createdAt: log.createdAt
      })),
      metrics: {
        totalLogs,
        todayLogs
      }
    });

  } catch (error: any) {
    console.error('Error GET /api/admin/audit-logs:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengambil riwayat audit log' }, { status: 500 });
  }
}