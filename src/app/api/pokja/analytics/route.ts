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
    
    // Parse query params for class filter
    const url = new URL(request.url);
    const classNameFilter = url.searchParams.get('className') || '';
    
    // Build conditions
    const studentCondition = classNameFilter ? { className: classNameFilter } : {};
    const placementCondition = classNameFilter ? { student: { className: classNameFilter } } : {};

    // 1. Ambil Statistik Ringkasan Utama
    const totalStudents = await prisma.student.count({ where: studentCondition });
    const totalIndustries = await prisma.industry.count();
    const totalPlacements = await prisma.internshipPlacement.count({ where: placementCondition });

    // 2. Breakdown Status Pengajuan PKL
    const statusDiterima = await prisma.internshipPlacement.count({ where: { status: { in: ['DITERIMA', 'DISETUJUI_INDUSTRI', 'DITERIMA_INDUSTRI', 'COMPLETED'] }, ...placementCondition } });
    const statusDitolak = await prisma.internshipPlacement.count({ where: { status: { in: ['DITOLAK', 'DITOLAK_INDUSTRI', 'DITOLAK_POKJA'] }, ...placementCondition } });
    const statusPengajuan = await prisma.internshipPlacement.count({ where: { status: { in: ['PENGAJUAN_DIKIRIM', 'MENUNGGU_PERSETUJUAN_POKJA'] }, ...placementCondition } });
    const statusProses = await prisma.internshipPlacement.count({ where: { status: { in: ['DIPROSES_INDUSTRI', 'SURAT_DITERBITKAN', 'REVIEW_POKJA', 'PEMBUATAN_SURAT', 'SENT_DUDI', 'SURAT_TERBIT'] }, ...placementCondition } });

    // 3. Hitung Total Kuota Terpakai vs Sisa Kuota Industri (Khusus untuk data global industri)
    const industries = await prisma.industry.findMany({
      select: {
        id: true,
        name: true,
        totalQuota: true,
        placements: {
          where: placementCondition,
          select: { id: true, status: true }
        }
      }
    });

    let totalQuotaAvailable = 0;
    let totalQuotaUsed = 0;

    const topIndustries = industries.map((ind: any) => {
      // NOTE: jika difilter per kelas, kuota terpakai yang dihitung HANYA anak kelas tersebut!
      const activeCount = ind.placements.filter((p: any) => ['DITERIMA', 'DISETUJUI_INDUSTRI', 'DITERIMA_INDUSTRI', 'COMPLETED', 'DIPROSES_INDUSTRI', 'SURAT_DITERBITKAN', 'REVIEW_POKJA', 'PEMBUATAN_SURAT', 'SENT_DUDI', 'SURAT_TERBIT'].includes(p.status)).length;
      totalQuotaAvailable += ind.totalQuota; // Kuota tersedia tetap global atau tidak? Biarkan global agar fair.
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
      where: studentCondition,
      _count: { id: true }
    });

    const departmentStats = departmentGroup.map((dept: any) => ({
      department: dept.department || 'Lainnya',
      total: dept._count.id
    }));

    // 4.b Get Available Classes for Dropdown
    const classes = await prisma.classRoom.findMany({
      select: { name: true },
      orderBy: { name: 'asc' }
    });

    // 5. Rekapitulasi Lengkap untuk Export Center
    const exportData = await prisma.student.findMany({
      where: studentCondition,
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
      details: classNameFilter ? `Membaca analitik realtime untuk kelas ${classNameFilter}` : 'Membaca data analitik realtime dan menyiapkan paket data ekspor global.'
    });

    return NextResponse.json({
      success: true,
      analytics: {
        availableClasses: classes.map((c: any) => c.name),
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