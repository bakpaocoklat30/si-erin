// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Menghapus pembatasan filter status SQL agar seluruh pengajuan kelompok Pokja ditarik tanpa ada yang tereliminasi.
// ✨ Fitur Baru: Safe Dynamic Model Parser & In-Memory Cross-Model Period Hydrator.
// 🎨 UI/UX Update: N/A (Backend REST API)
// 🔧 Bug Fix: Membasmi bug Data 0 pada Dashboard Tata Usaha & Pokja.
// 🚀 Inovasi: Zero-Loss Data Retrieval Pipeline for Persuratan.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

// Helper: Ubah Object/Null/Undefined menjadi String secara aman
function safeString(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    return val.name || val.year || val.code || val.title || '';
  }
  return String(val);
}

// ----------------------------------------------------------------------
// 📥 GET: Ambil SELURUH Placement & Antrean Surat untuk Tata Usaha & Pokja
// ----------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    // RBAC Guard: Izinkan ADMIN, SUPER_ADMIN, POKJA, TIM_POKJA, dan TATA_USAHA
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'POKJA', 'TIM_POKJA', 'TATA_USAHA', 'TU'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized - Akses khusus TU & Pokja' }, { status: 401 });
    }

    const prisma = db as any;

    // 🛡️ Resolution Model Safe Guard
    const placementModel = prisma.internshipPlacement || prisma.placement;

    if (!placementModel) {
      throw new Error('Model InternshipPlacement tidak ditemukan pada Prisma Client');
    }

    // 1. Ambil Master Data Periode secara terpisah (Beserta AcademicYear)
    let masterPeriods: any[] = [];
    try {
      const periodModel = prisma.internshipPeriod || prisma.period || prisma.InternshipPeriod;
      if (periodModel) {
        masterPeriods = await periodModel.findMany({
          include: {
            academicYear: true
          }
        });
      }
    } catch (e) {
      console.warn('Warning: Gagal memuat master periods secara terpisah:', e);
    }

    // Map untuk pencarian cepat O(1) berdasarkan ID Periode
    const periodMap = new Map<string, any>();
    masterPeriods.forEach((p) => {
      if (p.id) periodMap.set(p.id, p);
    });

    // 2. Ambil SELURUH data Placements tanpa membatasi status agar data Pokja ditarik 100%
    const placementsRaw = await placementModel.findMany({
      include: {
        student: {
          select: {
            id: true,
            name: true,
            nis: true,
            nisn: true,
            className: true,
            department: true,
            phone: true,
            userId: true
          }
        },
        industry: {
          select: {
            id: true,
            name: true,
            address: true,
            contactPerson: true,
            phone: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // 3. 🛡️ IN-MEMORY HYDRATOR: Hubungkan data `period` & hitung stage secara manual
    const formattedPlacements = placementsRaw.map((item: any) => {
      const currentStatus = String(item.status || '').toUpperCase();
      
      let computedStage = item.stage;
      if (!computedStage || typeof computedStage !== 'number') {
        if (['SURAT_DITERBITKAN', 'LETTER_ISSUED', 'SENT_DUDI', 'SELESAI_PKL'].includes(currentStatus)) {
          computedStage = 4;
        } else {
          computedStage = 3; // Default Tahap 3
        }
      }

      // Ambil objek periode dari Map jika ada
      const targetPeriodId = item.periodId || item.internshipPeriodId || item.period_id;
      const associatedPeriod = targetPeriodId ? periodMap.get(targetPeriodId) : null;

      // Ambil fallback periode dari item pertama di masterPeriods jika hanya ada 1 periode aktif
      const fallbackPeriod = masterPeriods.length === 1 ? masterPeriods[0] : null;

      const finalPeriod = item.period || associatedPeriod || fallbackPeriod;

      return {
        ...item,
        stage: computedStage,
        letterNumber: item.letterNumber || null,
        suratTugasUrl: item.suratTugasUrl || item.letterFile || null,
        letterUploadedBy: item.letterUploadedBy || null,
        letterUploadedAt: item.letterUploadedAt || item.updatedAt,
        // Properti period di-attach di memori sehingga frontend mendapatkan data relasi utuh
        period: finalPeriod,
        periodId: targetPeriodId || finalPeriod?.id || null
      };
    });

    return NextResponse.json({
      success: true,
      total: formattedPlacements.length,
      data: formattedPlacements
    });

  } catch (error: any) {
    console.error('Error GET /api/letters:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Gagal memuat antrean persuratan' 
    }, { status: 500 });
  }
}

// ----------------------------------------------------------------------
// 📤 POST: Upload Surat TTD & Naikkan Status ke SURAT_DITERBITKAN
// ----------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const role = user?.role;

    if (!session || !['ADMIN', 'SUPER_ADMIN', 'POKJA', 'TIM_POKJA', 'TATA_USAHA', 'TU'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { placementId, letterNumber, letterFileUrl } = body;

    if (!placementId || !letterFileUrl) {
      return NextResponse.json({ success: false, error: 'ID Pengajuan dan File Surat TTD wajib diisi' }, { status: 400 });
    }

    const prisma = db as any;
    const placementModel = prisma.internshipPlacement || prisma.placement;

    if (!placementModel) {
      throw new Error('Model InternshipPlacement tidak ditemukan di Prisma Client');
    }

    const existingPlacement = await placementModel.findUnique({
      where: { id: placementId },
      include: { student: true, industry: true }
    });

    if (!existingPlacement) {
      return NextResponse.json({ success: false, error: 'Data pengajuan PKL tidak ditemukan' }, { status: 404 });
    }

    const generatedNumber = letterNumber || `421.5/SMK/PKL/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

    const updatePayload: any = {
      status: 'SURAT_DITERBITKAN',
      suratTugasUrl: letterFileUrl
    };

    try { updatePayload.letterNumber = generatedNumber; } catch(e) {}
    try { updatePayload.letterUploadedBy = `${user.name || 'Petugas'} (${role})`; } catch(e) {}
    try { updatePayload.letterUploadedAt = new Date(); } catch(e) {}
    try { updatePayload.stage = 4; } catch(e) {}

    const updatedPlacement = await placementModel.update({
      where: { id: placementId },
      data: updatePayload
    });

    // 🔔 Kirim In-App Notification ke Siswa
    try {
      if (prisma.notification && existingPlacement.student?.userId) {
        await prisma.notification.create({
          data: {
            userId: existingPlacement.student.userId,
            title: '📄 Surat Permohonan PKL Diterbitkan!',
            message: `Surat permohonan PKL No: ${generatedNumber} untuk lokasi ${safeString(existingPlacement.industry?.name)} telah diterbitkan oleh Tata Usaha. Silakan unduh di dashboard Anda.`,
            type: 'SUCCESS',
            link: '/dashboard/students/pengajuan'
          }
        });
      }
    } catch (e) {
      console.warn('Notification trigger warning:', e);
    }

    // 📝 Catat aktivitas ke Audit Log
    try {
      if (prisma.auditLog) {
        await prisma.auditLog.create({
          data: {
            userId: user.id || 'system',
            username: user.name || user.username || 'TU/Pokja',
            userRole: role,
            action: 'UPLOAD_LETTER',
            module: 'PERSURATAN',
            details: `Mengunggah Surat Permohonan TTD No: ${generatedNumber} untuk Siswa: ${safeString(existingPlacement.student?.name)}`,
            ipAddress: '127.0.0.1'
          }
        });
      }
    } catch (e) {
      console.warn('Audit log warning:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Surat Permohonan PKL berhasil diterbitkan! Pengajuan otomatis berlanjut ke Tahap 4.',
      data: updatedPlacement
    });

  } catch (error: any) {
    console.error('Error POST /api/letters:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Gagal memproses unggah surat' 
    }, { status: 500 });
  }
}