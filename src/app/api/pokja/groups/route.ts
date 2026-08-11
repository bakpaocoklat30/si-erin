// 📋 CHANGELOG:
// ✅ Perubahan: Menyediakan REST API GET untuk mengambil daftar Kelompok Prakerin yang telah terverifikasi dan PATCH/PUT untuk mengunggah Surat Tugas Resmi (`suratTugasUrl`) ke kelompok siswa.
// ✨ Fitur Baru: Pokja Verified Groups Management Engine & Official Request Letter Dispatch Pipeline.
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Mengubah status siswa secara otomatis ke `SURAT_DITERBITKAN` saat surat permohonan berhasil diunggah oleh Pokja.
// 🚀 Inovasi: Enterprise Verified Group Dispatch Engine.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// 1. GET: Ambil Kelompok Prakerin yang Terverifikasi
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

    // Ambil penempatan yang sudah lolos verifikasi awal
    const placements = await db.internshipPlacement.findMany({
      where: {
        student: studentWhere,
        status: { in: ['PEMBUATAN_SURAT', 'SURAT_DITERBITKAN', 'KIRIM_SURAT', 'DISETUJUI_INDUSTRI'] }
      },
      include: {
        student: true,
        industry: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    const classRooms = await db.classRoom.findMany({ include: { period: true } });
    const periods = await db.internshipPeriod.findMany({ orderBy: { startDate: 'desc' } });

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
          periodId: periodId,
          periodName: periodName,
          startDate: matchedPeriod?.startDate || placement.startDate,
          endDate: matchedPeriod?.endDate || placement.endDate,
          suratTugasUrl: placement.suratTugasUrl, // Surat Tugas Kelompok
          placements: []
        };
      }

      groupedMap[groupKey].placements.push({
        id: placement.id,
        status: placement.status,
        notes: placement.notes,
        suratTugasUrl: placement.suratTugasUrl,
        suratBalasanUrl: placement.suratBalasanUrl,
        student: {
          id: student?.id,
          nis: student?.nis,
          name: student?.name,
          className: student?.className,
          department: student?.department,
          phone: student?.phone
        }
      });
    });

    return NextResponse.json({
      success: true,
      data: Object.values(groupedMap)
    });

  } catch (error: any) {
    console.error('Error fetching verified groups:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat kelompok terverifikasi' }, { status: 500 });
  }
}

// 2. PUT: Unggah Surat Tugas / Surat Permohonan Resmi ke Seluruh Anggota Kelompok
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Pokja / Admin' }, { status: 401 });
    }

    const body = await request.json();
    const { placementIds, suratTugasUrl } = body;

    if (!Array.isArray(placementIds) || placementIds.length === 0) {
      return NextResponse.json({ error: 'Pilih kelompok siswa yang akan dikirimkan suratnya' }, { status: 400 });
    }

    if (!suratTugasUrl) {
      return NextResponse.json({ error: 'File surat tugas/permohonan wajib diunggah' }, { status: 400 });
    }

    // Update Surat Tugas ke seluruh siswa di kelompok tersebut & atur status menjadi SURAT_DITERBITKAN
    const result = await db.$transaction(
      placementIds.map((id: string) =>
        db.internshipPlacement.update({
          where: { id },
          data: {
            suratTugasUrl: suratTugasUrl.trim(),
            status: 'SURAT_DITERBITKAN'
          }
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `Berhasil mengunggah Surat Tugas Resmi ke ${result.length} siswa! Surat siap diunduh oleh akun siswa.`,
      count: result.length
    });

  } catch (error: any) {
    console.error('Error uploading group assignment letter:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengunggah surat tugas kelompok' }, { status: 500 });
  }
}