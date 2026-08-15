// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Endpoint API khusus Analisis Statistik Realtime Pokja & Aggregated Data Extractor.
// ✨ Fitur Baru: Dynamic Realtime Metrics Aggregator (Siswa PKL, Status Pengajuan, Kuota DUDI, & Sebaran Jurusan).
// 🎨 UI/UX Update: N/A (Backend API)
// 🔧 Bug Fix: Mengkalkulasi rasio penerimaan PKL & ketersediaan kuota industri secara akurat.
// 🚀 Inovasi: High-Performance Multi-Dimensional Analytics Pipeline.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const prisma = db as any;

    // 1. Ambil Statistik Ringkasan Utama
    const totalStudents = await prisma.student.count();
    const totalIndustries = await prisma.industry.count();
    const totalPlacements = await prisma.internshipPlacement.count();

    // 2. Breakdown Status Pengajuan PKL
    const statusDiterima = await prisma.internshipPlacement.count({ where: { status: 'DITERIMA' } });
    const statusDitolak = await prisma.internshipPlacement.count({ where: { status: 'DITOLAK' } });
    const statusPengajuan = await prisma.internshipPlacement.count({ where: { status: 'PENGAJUAN_DIKIRIM' } });
    const statusProses = await prisma.internshipPlacement.count({ where: { status: 'DIPROSES_INDUSTRI' } });

    // 3. Hitung Total Kuota Terpakai vs Sisa Kuota Industri
    const industries = await prisma.industry.findMany({
      select: {
        id: true,
        name: true,
        totalQuota: true,
        placements: {
          select: { id: true, status: true }
        }
      }
    });

    let totalQuotaAvailable = 0;
    let totalQuotaUsed = 0;

    const topIndustries = industries.map((ind: any) => {
      const activeCount = ind.placements.filter((p: any) => ['DITERIMA', 'DIPROSES_INDUSTRI'].includes(p.status)).length;
      totalQuotaAvailable += ind.totalQuota;
      totalQuotaUsed += activeCount;
      return {
        id: ind.id,
        name: ind.name,
        quota: ind.totalQuota,
        filled: activeCount,
        remaining: Math.max(0, ind.totalQuota - activeCount)
      };
    }).sort((a: any, b: any) => b.filled - a.filled).slice(0, 5);

    // 4. Sebaran Jurusan
    const departmentGroup = await prisma.student.groupBy({
      by: ['department'],
      _count: { id: true }
    });

    const departmentStats = departmentGroup.map((dept: any) => ({
      department: dept.department || 'Lainnya',
      total: dept._count.id
    }));

    // 5. Rekapitulasi Lengkap untuk Export Center
    const exportData = await prisma.student.findMany({
      include: {
        placement: {
          include: {
            industry: true
          }
        },
        teacher: {
          select: { name: true, phone: true }
        }
      },
      orderBy: { className: 'asc' }
    });

    // Catat Log Akses Analytics
    await createAuditLog({
      userId: (session.user as any)?.id,
      username: session.user.name || session.user.email || 'POKJA',
      userRole: (session.user as any)?.role,
      action: 'EXPORT',
      module: 'ANALYTICS',
      details: 'Membaca data analitik realtime dan menyiapkan paket data ekspor.'
    });

    return NextResponse.json({
      success: true,
      analytics: {
        metrics: {
          totalStudents,
          totalIndustries,
          totalPlacements,
          statusDiterima,
          statusDitolak,
          statusPengajuan,
          statusProses,
          totalQuotaAvailable,
          totalQuotaUsed,
          quotaPercentage: totalQuotaAvailable > 0 ? Math.round((totalQuotaUsed / totalQuotaAvailable) * 100) : 0
        },
        topIndustries,
        departmentStats,
        exportData: exportData.map((s: any) => ({
          nis: s.nis,
          nisn: s.nisn || '-',
          name: s.name,
          className: s.className,
          department: s.department,
          phone: s.phone,
          bpjsStatus: s.bpjsStatus || 'BELUM_UPLOAD',
          cvStatus: s.cvStatus || 'BELUM_UPLOAD',
          industryName: s.placement?.industry?.name || 'Belum Ada',
          placementStatus: s.placement?.status || 'BELUM_PENGAJUAN',
          teacherName: s.teacher?.name || 'Belum Ditentukan'
        }))
      }
    });

  } catch (error: any) {
    console.error('Error GET /api/pokja/analytics:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data analitik' }, { status: 500 });
  }
}