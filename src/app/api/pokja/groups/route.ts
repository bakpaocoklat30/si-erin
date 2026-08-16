// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: 
//    1. Menambahkan handler DELETE untuk menghapus penempatan kelompok (reset placement) agar status siswa kembali terbuka.
//    2. Menambahkan filter query `periodId` pada GET method dan menyertakan daftar `periods` pada response JSON.
// ✨ Fitur Baru:
//    - Placement Reset & Cascade Group Deletion Engine.
//    - Real-time Period Filtering Support for Pokja Groups.
// 🎨 UI/UX Update: N/A (Backend API Endpoint).
// 🔧 Bug Fix: Menyelesaikan masalah kelompok seed/dummy yang mengunci status siswa sehingga tidak bisa memilih DUDI lain.
// 🚀 Inovasi: Role-Isolated Department & Period Aware Group Manager.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// List Role yang Berhak Mengakses Data Kelompok & Persuratan
const ALLOWED_ROLES = ['POKJA', 'TIM_POKJA', 'ADMIN', 'TATA_USAHA', 'TU', 'SUPER_ADMIN'];

// ----------------------------------------------------------------------
// 1. GET: Ambil Kelompok Prakerin Sesuai Isolation Jurusan Pokja & Filter Periode
// ----------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();
    const userDepartment = (session?.user as any)?.department;

    if (!session || !userRole || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Unauthorized - Akses khusus Pokja, Admin, atau Tata Usaha' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const selectedPeriodId = searchParams.get('periodId');

    // Ambil daftar seluruh periode untuk pilihan filter di frontend
    const periods = await db.internshipPeriod.findMany({
      orderBy: { startDate: 'desc' }
    });

    let studentWhere: any = {};

    // 🌟 ISOLASI JURUSAN: Jika Role Pokja & Memiliki Jurusan Khusus, Kunci Query hanya untuk Jurusan Tersebut!
    if ((userRole === 'POKJA' || userRole === 'TIM_POKJA') && userDepartment && userDepartment.toLowerCase() !== 'semua jurusan') {
      studentWhere.department = { equals: userDepartment, mode: 'insensitive' };
    }

    let placementWhere: any = {
      student: studentWhere,
      status: { in: ['PENGAJUAN_DIKIRIM', 'REVIEW_POKJA', 'PEMBUATAN_SURAT', 'SURAT_DITERBITKAN', 'KIRIM_SURAT', 'DISETUJUI_INDUSTRI'] }
    };

    // Ambil data penempatan dari database Prisma
    const placements = await db.internshipPlacement.findMany({
      where: placementWhere,
      include: {
        student: {
          include: {
            teacher: {
              select: { id: true, name: true, username: true }
            }
          }
        },
        industry: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    const classRooms = await db.classRoom.findMany({ include: { period: true } });

    const groupedMap: Record<string, any> = {};

    placements.forEach((placement: any) => {
      const student = placement.student;
      const industry = placement.industry;

      const matchedClass = classRooms.find(c => c.name.toLowerCase() === student?.className?.toLowerCase());
      const matchedPeriod = matchedClass?.period || 
                            periods.find(p => p.department.toLowerCase().includes((student?.department || '').toLowerCase())) || 
                            periods[0];

      const periodId = matchedPeriod ? matchedPeriod.id : 'PERIODE_DEFAULT';
      const periodName = matchedPeriod ? matchedPeriod.name : 'Periode Prakerin Standar';

      // Jika user memilih filter periode spesifik dan tidak cocok, skip item ini
      if (selectedPeriodId && selectedPeriodId !== 'ALL' && periodId !== selectedPeriodId) {
        return;
      }

      const startDate = matchedPeriod?.startDate || placement.startDate || new Date().toISOString();
      const endDate = matchedPeriod?.endDate || placement.endDate || new Date().toISOString();

      const industryId = industry?.id || 'INDUSTRY_UNKNOWN';
      const industryName = industry?.name || 'Tanpa Nama Industri';
      const departmentName = student?.department || userDepartment || 'Teknik Kejuruan';

      const groupKey = `${industryId}___${periodId}___${departmentName}`;
      const savedLetterNumber = placement.letterNumber || null;

      if (!groupedMap[groupKey]) {
        groupedMap[groupKey] = {
          groupId: groupKey,
          groupKey: groupKey,
          industryId: industryId,
          industryName: industryName,
          industryAddress: industry?.address || '-',
          industryPhone: industry?.phone || '-',
          departmentName: departmentName,
          periodId: periodId,
          periodName: periodName,
          startDate: startDate,
          endDate: endDate,
          suratTugasUrl: placement.suratTugasUrl || null,
          letterNumber: savedLetterNumber, 
          letterUploadedBy: placement.letterUploadedBy || null,
          letterUploadedAt: placement.letterUploadedAt || null,
          placements: [],
          students: []
        };
      }

      const formattedStudent = {
        id: student?.id,
        nis: student?.nis,
        name: student?.name,
        className: student?.className,
        department: student?.department,
        phone: student?.phone,
        teacher: student?.teacher || null,
        placementId: placement.id,
        status: placement.status,
        startDate: startDate,
        endDate: endDate,
        letterNumber: savedLetterNumber
      };

      groupedMap[groupKey].placements.push({
        id: placement.id,
        placementId: placement.id,
        status: placement.status,
        suratTugasUrl: placement.suratTugasUrl,
        letterNumber: savedLetterNumber,
        student: formattedStudent
      });

      groupedMap[groupKey].students.push(formattedStudent);
    });

    return NextResponse.json({
      success: true,
      userDepartment: userDepartment || 'Semua Jurusan',
      periods: periods,
      data: Object.values(groupedMap)
    });

  } catch (error: any) {
    console.error('Error fetching Pokja groups:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat kelompok terverifikasi' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------
// 2. PUT / POST: Unggah Berkas & SIMPAN `letterNumber` KE TABEL InternshipPlacement PRISMA
// ----------------------------------------------------------------------
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || 'POKJA').toUpperCase().trim();
    const userName = session?.user?.name || 'Tim Pokja';

    if (!session || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Unauthorized - Akses khusus Pokja, Admin, atau Tata Usaha' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { placementIds, suratTugasUrl, letterNumber } = body;

    if (!Array.isArray(placementIds) || placementIds.length === 0) {
      return NextResponse.json({ error: 'Pilih kelompok siswa yang akan dikirimkan suratnya' }, { status: 400 });
    }

    if (!letterNumber || !letterNumber.trim()) {
      return NextResponse.json({ error: 'Nomor Surat Permohonan wajib diisi!' }, { status: 400 });
    }

    if (!suratTugasUrl) {
      return NextResponse.json({ error: 'File surat permohonan wajib diunggah' }, { status: 400 });
    }

    const cleanLetterNumber = letterNumber.trim();
    const cleanSuratUrl = suratTugasUrl.trim();

    const result = await db.$transaction(
      placementIds.map((id: string) =>
        db.internshipPlacement.update({
          where: { id },
          data: {
            letterNumber: cleanLetterNumber,       
            suratTugasUrl: cleanSuratUrl,          
            letterUploadedBy: userName,            
            letterUploadedAt: new Date(),          
            status: 'SURAT_DITERBITKAN'
          }
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `BERHASIL DISIMPAN! Nomor Surat: ${cleanLetterNumber} tersimpan permanen.`,
      letterNumber: cleanLetterNumber,
      count: result.length
    });

  } catch (error: any) {
    console.error('Error uploading group assignment letter:', error);
    return NextResponse.json({ error: error.message || 'Gagal menyimpan nomor surat ke database Prisma.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return PUT(request);
}

// ----------------------------------------------------------------------
// 3. DELETE: Hapus Kelompok / Reset Penempatan Siswa Agar Kembali Terbuka Mendaftar
// ----------------------------------------------------------------------
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();

    if (!session || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Unauthorized - Akses khusus Pokja, Admin, atau Tata Usaha' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const placementId = searchParams.get('placementId');
    const industryId = searchParams.get('industryId');
    const placementIdsParam = searchParams.get('placementIds');

    // Kasus A: Hapus Single Student Placement berdasarkan placementId
    if (placementId) {
      await db.internshipPlacement.delete({
        where: { id: placementId }
      });

      return NextResponse.json({
        success: true,
        message: 'Penempatan siswa berhasil dihapus. Status siswa telah di-reset!'
      });
    }

    // Kasus B: Hapus multiple placements berdasarkan daftar ID terpisah koma
    if (placementIdsParam) {
      const ids = placementIdsParam.split(',').map(id => id.trim()).filter(Boolean);
      if (ids.length > 0) {
        await db.internshipPlacement.deleteMany({
          where: { id: { in: ids } }
        });

        return NextResponse.json({
          success: true,
          message: `Berhasil menghapus ${ids.length} penempatan siswa dalam kelompok. Status siswa telah di-reset!`
        });
      }
    }

    // Kasus C: Hapus seluruh penempatan berdasarkan industryId
    if (industryId) {
      const deleted = await db.internshipPlacement.deleteMany({
        where: { industryId: industryId }
      });

      return NextResponse.json({
        success: true,
        message: `Seluruh kelompok penempatan (${deleted.count} siswa) berhasil dihapus & status siswa telah di-reset!`
      });
    }

    return NextResponse.json(
      { error: 'Parameter placementId, placementIds, atau industryId wajib disertakan.' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Error deleting Pokja placement group:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus kelompok penempatan' }, { status: 500 });
  }
}