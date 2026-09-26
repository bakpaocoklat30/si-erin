// 📋 CHANGELOG:
// ✅ Perubahan: Memperbarui endpoint REST API Verifikasi Pokja agar mendukung aksi terfokus: "Verifikasi Ajuan, Proses Pembuatan Surat" (`PEMBUATAN_SURAT`) dan "Tolak Ajuan" (`DITOLAK_INDUSTRI`).
// ✨ Fitur Baru: Focused Pokja Approval Action Engine with Grouped Status Migration.
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Menjamin siswa yang telah diverifikasi langsung berpindah status agar dapat dibaca di modul Kelompok Prakerin.
// 🚀 Inovasi: Enterprise Focused Verification Pipeline.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// 1. GET: Ambil Data Pengajuan Terkelompok yang Perlu Diverifikasi (Status: PENGAJUAN_DIKIRIM / REVIEW_POKJA)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Pokja / Admin' }, { status: 401 });
    }

    const userDepartment = (session.user as any)?.department;
    const userRole = (session.user as any)?.role;

    let studentWhere: any = {};
    if (userRole === 'POKJA' && userDepartment && userDepartment.toLowerCase() !== 'semua jurusan') {
      studentWhere.department = { contains: userDepartment, mode: 'insensitive' };
    }

    // Ambil pengajuan yang belum diverifikasi final atau sedang dalam review
    const placements = await db.internshipPlacement.findMany({
      where: {
        student: studentWhere,
        status: { in: ['PENGAJUAN_DIKIRIM', 'REVIEW_POKJA'] }
      },
      include: {
        student: true,
        industry: true
      },
      orderBy: { appliedAt: 'desc' }
    });

    const classRooms = await db.classRoom.findMany({
      include: { period: true }
    });

    const periods = await db.internshipPeriod.findMany({
      orderBy: { startDate: 'desc' }
    });

    // 🌟 QUERY PENEMPATAN YANG SUDAH TERVERIFIKASI PADA INDUSTRI TERKAIT
    const industryIds = Array.from(new Set(placements.map(p => p.industryId).filter(Boolean)));
    const existingPlacements = await db.internshipPlacement.findMany({
      where: {
        industryId: { in: industryIds },
        status: {
          in: [
            'PEMBUATAN_SURAT',
            'SURAT_DITERBITKAN',
            'LETTER_ISSUED',
            'KIRIM_SURAT',
            'SENT_DUDI',
            'DISETUJUI_INDUSTRI',
            'DITERIMA',
            'DITERIMA_INDUSTRI',
            'COMPLETED',
            'SELESAI_PKL'
          ]
        }
      },
      select: {
        id: true,
        industryId: true,
        status: true,
        student: {
          select: {
            id: true,
            name: true,
            className: true,
            department: true
          }
        }
      }
    });

    // Pengelompokan berdasarkan (Industri + Periode)
    const groupedMap: Record<string, any> = {};

    placements.forEach((placement) => {
      const student = placement.student;
      const industry = placement.industry;

      const matchedClass = classRooms.find(c => c.name.toLowerCase() === student?.className?.toLowerCase());
      const matchedPeriod = matchedClass?.period || 
                            periods.find(p => p.department.toLowerCase().includes((student?.department || '').toLowerCase())) || 
                            periods[0];

      const periodId = matchedPeriod ? matchedPeriod.id : 'PERIODE_DEFAULT';
      const periodName = matchedPeriod ? matchedPeriod.name : 'Periode Prakerin Standar';

      const industryId = industry?.id || 'INDUSTRY_UNKNOWN';
      const industryName = industry?.name || 'Tanpa Nama Industri';

      const groupKey = `${industryId}___${periodId}`;

      if (!groupedMap[groupKey]) {
        // Kalkulasi kuota dan penempatan aktif yang sudah mengisi industri ini
        const verifiedForThisInd = existingPlacements.filter(ep => ep.industryId === industryId);
        const verifiedCount = verifiedForThisInd.length;

        let effectiveQuota = industry?.totalQuota ?? 0;
        let isUnlimited = effectiveQuota === -1 || effectiveQuota >= 999;

        if (matchedPeriod?.activeIndustries) {
          try {
            let parsed: any[] = [];
            if (typeof matchedPeriod.activeIndustries === 'string') {
              parsed = JSON.parse(matchedPeriod.activeIndustries);
            } else if (Array.isArray(matchedPeriod.activeIndustries)) {
              parsed = matchedPeriod.activeIndustries;
            }
            const cfg = parsed.find((item: any) => (item.industryId || item.id) === industryId);
            if (cfg) {
              if (cfg.isUnlimited) {
                isUnlimited = true;
                effectiveQuota = -1;
              } else if (typeof cfg.quota === 'number') {
                effectiveQuota = cfg.quota;
                isUnlimited = false;
              }
            }
          } catch (err) {
            // fallback ke kuota default industri
          }
        }

        const remainingQuota = isUnlimited ? 999 : Math.max(0, effectiveQuota - verifiedCount);
        const isFull = !isUnlimited && remainingQuota <= 0;

        groupedMap[groupKey] = {
          groupKey: groupKey,
          industryId: industryId,
          industryName: industryName,
          industryAddress: industry?.address || '-',
          industryPhone: industry?.phone || '-',
          totalQuota: isUnlimited ? 'Bebas' : effectiveQuota,
          quotaNumber: effectiveQuota,
          verifiedCount: verifiedCount,
          remainingQuota: isUnlimited ? 'Bebas' : remainingQuota,
          remainingNumber: remainingQuota,
          isUnlimited: isUnlimited,
          isFull: isFull,
          verifiedStudents: verifiedForThisInd.map(ep => ({
            id: ep.id,
            name: ep.student?.name || 'Siswa',
            className: ep.student?.className || '-',
            department: ep.student?.department || '-',
            status: ep.status
          })),
          periodId: periodId,
          periodName: periodName,
          startDate: placement.startDate || matchedPeriod?.startDate,
          endDate: placement.endDate || matchedPeriod?.endDate,
          placements: []
        };
      }

      groupedMap[groupKey].placements.push({
        id: placement.id,
        status: placement.status,
        notes: placement.notes,
        appliedAt: placement.appliedAt,
        student: {
          id: student?.id,
          nis: student?.nis,
          name: student?.name,
          className: student?.className,
          department: student?.department,
          phone: student?.phone,
          cvUrl: student?.cvUrl,
          bpjsUrl: student?.bpjsUrl,
          isAllowedPkl: student?.isAllowedPkl
        }
      });
    });

    return NextResponse.json({
      success: true,
      data: Object.values(groupedMap)
    });

  } catch (error: any) {
    console.error('Error fetching verification placements:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat kelompok pengajuan' }, { status: 500 });
  }
}

// 2. POST: Eksekusi Verifikasi Ajuan (Pilihan: PEMBUATAN_SURAT atau DITOLAK_INDUSTRI)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Pokja / Admin' }, { status: 401 });
    }

    const body = await request.json();
    const { placementIds, targetStatus, notes } = body;

    if (!Array.isArray(placementIds) || placementIds.length === 0) {
      return NextResponse.json({ error: 'Pilih minimal satu siswa untuk diverifikasi' }, { status: 400 });
    }

    if (!['PEMBUATAN_SURAT', 'DITOLAK_INDUSTRI'].includes(targetStatus)) {
      return NextResponse.json({ error: 'Status verifikasi hanya bisa: Verifikasi Ajuan (PEMBUATAN_SURAT) atau Tolak (DITOLAK_INDUSTRI)' }, { status: 400 });
    }

    const result = await db.$transaction(
      placementIds.map((id: string) =>
        db.internshipPlacement.update({
          where: { id },
          data: {
            status: targetStatus,
            notes: notes ? notes.trim() : undefined
          }
        })
      )
    );

    const message = targetStatus === 'PEMBUATAN_SURAT' 
      ? `Berhasil memverifikasi ${result.length} ajuan! Data telah dipindahkan ke menu Kelompok Prakerin untuk pembuatan & pengiriman surat.`
      : `Berhasil menolak ${result.length} ajuan siswa.`;

    return NextResponse.json({
      success: true,
      message,
      updatedCount: result.length
    });

  } catch (error: any) {
    console.error('Error executing verification:', error);
    return NextResponse.json({ error: error.message || 'Gagal memproses verifikasi' }, { status: 500 });
  }
}