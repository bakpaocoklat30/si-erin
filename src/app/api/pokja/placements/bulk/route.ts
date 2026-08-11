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
        groupedMap[groupKey] = {
          groupKey: groupKey,
          industryId: industryId,
          industryName: industryName,
          industryAddress: industry?.address || '-',
          industryPhone: industry?.phone || '-',
          totalQuota: industry?.totalQuota || 0,
          periodId: periodId,
          periodName: periodName,
          startDate: matchedPeriod?.startDate || placement.startDate,
          endDate: matchedPeriod?.endDate || placement.endDate,
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