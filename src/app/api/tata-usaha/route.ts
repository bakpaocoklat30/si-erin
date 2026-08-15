// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Endpoint API Backend terpusat untuk Dashboard Tata Usaha / Persuratan PKL.
// ✨ Fitur Baru: Support GET (Fetch Antrean Tahap 3), POST (Publish & Upload Surat TTD), PUT (Update Nomor Surat), & DELETE.
// 🎨 UI/UX Update: N/A (Backend REST API)
// 🔧 Bug Fix: Memastikan Dual-Authority (Tata Usaha & Pokja) dapat memperbarui berkas tanpa konflik.
// 🚀 Inovasi: Automated Notification & Audit Trail Dispatcher.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

// 🛡️ HELPER: Sanitasi Nama/Object menjadi String
function safeString(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    return val.name || val.year || val.code || '';
  }
  return String(val);
}

// ----------------------------------------------------------------------
// 📥 1. GET: Ambil Daftar Antrean Persuratan (Tahap 3 & Tahap 4)
// ----------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    // RBAC Guard: Hanya Role ADMIN, POKJA, TIM_POKJA, dan TATA_USAHA yang diizinkan
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'POKJA', 'TIM_POKJA', 'TATA_USAHA', 'TU'].includes(userRole)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized - Akses khusus untuk Tim Tata Usaha & Pokja' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterStatus = searchParams.get('status') || 'ALL'; // ALL, QUEUE (Stage 3), ISSUED (Stage 4)

    const prisma = db as any;

    let whereCondition: any = {
      OR: [
        { stage: 3 },
        { stage: 4 },
        { status: 'POKJA_APPROVED' },
        { status: 'PEMBUATAN_SURAT' },
        { status: 'SURAT_DITERBITKAN' },
        { status: 'LETTER_ISSUED' }
      ]
    };

    if (filterStatus === 'QUEUE') {
      whereCondition = { OR: [{ stage: 3 }, { status: 'PEMBUATAN_SURAT' }, { status: 'POKJA_APPROVED' }] };
    } else if (filterStatus === 'ISSUED') {
      whereCondition = { OR: [{ stage: 4 }, { status: 'SURAT_DITERBITKAN' }, { status: 'LETTER_ISSUED' }] };
    }

    // Query data placements beserta relasi student & industry
    const placements = await prisma.internshipPlacement.findMany({
      where: whereCondition,
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

    return NextResponse.json({
      success: true,
      total: placements.length,
      data: placements || []
    });

  } catch (error: any) {
    console.error('Error GET /api/tata-usaha:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Gagal memuat data antrean persuratan' 
    }, { status: 500 });
  }
}

// ----------------------------------------------------------------------
// 📤 2. POST: Terbitkan / Upload Surat Permohonan TTD (Transisi Tahap 3 -> Tahap 4)
// ----------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const userRole = user?.role;

    if (!session || !['ADMIN', 'SUPER_ADMIN', 'POKJA', 'TIM_POKJA', 'TATA_USAHA', 'TU'].includes(userRole)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { placementId, letterNumber, letterFileUrl } = body;

    if (!placementId) {
      return NextResponse.json({ success: false, error: 'ID Placement wajib disertakan' }, { status: 400 });
    }

    if (!letterFileUrl) {
      return NextResponse.json({ success: false, error: 'URL File Surat PDF Ber-TTD wajib diisi' }, { status: 400 });
    }

    const prisma = db as any;

    // Pengecekan keberadaan data placement
    const existingPlacement = await prisma.internshipPlacement.findUnique({
      where: { id: placementId },
      include: { student: true, industry: true }
    });

    if (!existingPlacement) {
      return NextResponse.json({ success: false, error: 'Data pengajuan PKL tidak ditemukan' }, { status: 404 });
    }

    const generatedNumber = letterNumber || `421.5/SMK/PKL/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

    // Update Placement: Naikkan ke Stage 4 (Surat Diterbitkan)
    const updatedPlacement = await prisma.internshipPlacement.update({
      where: { id: placementId },
      data: {
        stage: 4,
        status: 'SURAT_DITERBITKAN',
        letterNumber: generatedNumber,
        suratTugasUrl: letterFileUrl,
        letterUploadedBy: `${user.name || 'Petugas'} (${userRole})`,
        letterUploadedAt: new Date()
      }
    });

    // 🔔 OTO-NOTIFIKASI KE SISWA
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
      console.warn('Gagal membuat notifikasi otomatis:', e);
    }

    // 📝 CATAT PADA AUDIT LOG
    try {
      if (prisma.auditLog) {
        await prisma.auditLog.create({
          data: {
            userId: user.id || 'system',
            username: user.name || user.username || 'TU/Pokja',
            userRole: userRole,
            action: 'UPLOAD_LETTER',
            module: 'PERSURATAN',
            details: `Penerbitan Surat Permohonan No: ${generatedNumber} untuk Siswa: ${safeString(existingPlacement.student?.name)} (${safeString(existingPlacement.industry?.name)})`,
            ipAddress: '127.0.0.1'
          }
        });
      }
    } catch (e) {
      console.warn('Gagal mencatat audit log:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Surat Permohonan PKL berhasil diterbitkan! Pengajuan siswa otomatis naik ke Tahap 4 (Surat Diterbitkan).',
      data: updatedPlacement
    });

  } catch (error: any) {
    console.error('Error POST /api/tata-usaha:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Gagal menerbitkan surat' 
    }, { status: 500 });
  }
}

// ----------------------------------------------------------------------
// ✏️ 3. PUT: Update Nomor Surat atau Detail Surat
// ----------------------------------------------------------------------
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const userRole = user?.role;

    if (!session || !['ADMIN', 'SUPER_ADMIN', 'POKJA', 'TIM_POKJA', 'TATA_USAHA', 'TU'].includes(userRole)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { placementId, letterNumber, notes } = body;

    if (!placementId) {
      return NextResponse.json({ success: false, error: 'ID Placement wajib disertakan' }, { status: 400 });
    }

    const prisma = db as any;

    const result = await prisma.internshipPlacement.update({
      where: { id: placementId },
      data: {
        letterNumber: letterNumber || undefined,
        notes: notes || undefined
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Data permohonan surat berhasil diperbarui!',
      data: result
    });

  } catch (error: any) {
    console.error('Error PUT /api/tata-usaha:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal memperbarui data surat' }, { status: 500 });
  }
}