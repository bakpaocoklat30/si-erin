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
import { saveBase64ToFile } from '@/lib/file-utils';

// List Role yang Berhak Mengakses Data Kelompok & Persuratan
const ALLOWED_ROLES = ['POKJA', 'TIM_POKJA', 'ADMIN', 'TATA_USAHA', 'TATA USAHA', 'TATAUSAHA', 'TU', 'SUPER_ADMIN'];

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
    const selectedStatus = searchParams.get('status');

    // Ambil daftar seluruh periode (Tanpa memuat kolom JSON activeIndustries yang sangat berat)
    const periods = await db.internshipPeriod.findMany({
      select: {
        id: true,
        name: true,
        department: true,
        startDate: true,
        endDate: true
      },
      orderBy: { startDate: 'desc' }
    });

    let studentWhere: any = {};

    // 🌟 ISOLASI JURUSAN: Jika Role Pokja & Memiliki Jurusan Khusus, Kunci Query hanya untuk Jurusan Tersebut!
    if ((userRole === 'POKJA' || userRole === 'TIM_POKJA') && userDepartment && userDepartment.toLowerCase() !== 'semua jurusan') {
      studentWhere.department = { equals: userDepartment, mode: 'insensitive' };
    }

    // 🌟 STATUS TERVERIFIKASI: Hanya kelompok/siswa yang sudah diverifikasi Pokja yang boleh tampil di modul ini
    const VERIFIED_STATUSES = [
        'PEMBUATAN_SURAT',
        'SURAT_DITERBITKAN',
        'LETTER_ISSUED',
        'KIRIM_SURAT',
        'SENT_DUDI',
        'DISETUJUI_INDUSTRI',
        'REQUEST_PENGANTARAN',
        'MENUNGGU_PEMBERANGKATAN',
        'PENGANTARAN_DITERBITKAN',
        'REQUEST_PENARIKAN',
        'MENUNGGU_PENARIKAN',
        'PENARIKAN_DITERBITKAN',
        'DITERIMA',
        'DITERIMA_INDUSTRI',
        'COMPLETED',
        'SELESAI_PKL'
      ];

    let statusCondition: any;
    if (selectedStatus && selectedStatus !== 'ALL') {
      statusCondition = selectedStatus;
    } else {
      statusCondition = { in: VERIFIED_STATUSES };
    }

    let placementWhere: any = {
      student: studentWhere,
      status: statusCondition
    };

    // Ambil data penempatan dari database Prisma (TANPA menarik field surat*Url yang berisi base64 besar untuk mencegah OOM)
    const placements = await db.internshipPlacement.findMany({
      where: placementWhere,
      select: {
        id: true,
        groupId: true,
        status: true,
        startDate: true,
        endDate: true,
        letterNumber: true,
        letterUploadedBy: true,
        letterUploadedAt: true,
        nomorPengantaran: true,
        nomorPenarikan: true,
        // SURAT URL DIBLOKIR AGAR MEMORI SERVER TIDAK CRASH (OOM)
        student: {
          select: {
            id: true,
            nis: true,
            name: true,
            className: true,
            department: true,
            phone: true,
            parentPhone: true,
            teacher: {
              select: { id: true, name: true, username: true }
            }
          }
        },
        industry: {
          select: {
            id: true,
            name: true,
            address: true,
            rt: true,
            rw: true,
            dusun: true,
            desaKelurahan: true,
            subDistrict: true,
            regency: true,
            postalCode: true,
            province: true,
            phone: true,
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const classRooms = await db.classRoom.findMany({ 
      include: { 
        period: {
          select: {
            id: true,
            name: true,
            department: true,
            startDate: true,
            endDate: true
          }
        } 
      } 
    });
    const placementGroups = await db.placementGroup.findMany();

    const groupedMap: Record<string, any> = {};

    placements.forEach((placement: any) => {
      const student = placement.student;
      const industry = placement.industry;

      const manualGroup = placement.groupId ? placementGroups.find(g => g.id === placement.groupId) : null;
      let matchedPeriod = null;
      
      if (manualGroup) {
        matchedPeriod = periods.find(p => p.id === manualGroup.periodId);
      } else {
        const matchedClass = classRooms.find(c => c.name.toLowerCase() === student?.className?.toLowerCase());
        matchedPeriod = matchedClass?.period || 
                        periods.find(p => p.department.toLowerCase().includes((student?.department || '').toLowerCase())) || 
                        periods[0];
      }

      const periodId = matchedPeriod ? matchedPeriod.id : 'PERIODE_DEFAULT';
      const periodName = matchedPeriod ? matchedPeriod.name : 'Periode Prakerin Standar';

      // Jika user memilih filter periode spesifik dan tidak cocok, skip item ini
      if (selectedPeriodId && selectedPeriodId !== 'ALL' && periodId !== selectedPeriodId) {
        return;
      }

      // 🌟 PRIORITASKAN TANGGAL KUSTOM DARI PLACEMENT JIKA POKJA PERNAH MENGEDITNYA
      const startDate = placement.startDate || matchedPeriod?.startDate || new Date().toISOString();
      const endDate = placement.endDate || matchedPeriod?.endDate || new Date().toISOString();

      const industryId = industry?.id || 'INDUSTRY_UNKNOWN';
      const industryName = industry?.name || 'Tanpa Nama Industri';
      const departmentName = student?.department || userDepartment || 'Teknik Kejuruan';

      const savedLetterNumber = placement.letterNumber || null;
      const groupKey = placement.groupId || `${industryId}___${periodId}___${departmentName}___${savedLetterNumber || 'PENDING'}`;


      const buildProxyUrl = (type: string, placementItem: any) => {
        let hasUrl = false;
        const s = placementItem.status || '';
        
        // Kita tebak dari status karena field Base64 di-omit agar tidak OOM
        if (type === 'tugas') {
           const tugasStatuses = ['SURAT_DITERBITKAN', 'LETTER_ISSUED', 'KIRIM_SURAT', 'SENT_DUDI', 'DISETUJUI_INDUSTRI', 'REQUEST_PENGANTARAN', 'MENUNGGU_PEMBERANGKATAN', 'PENGANTARAN_DITERBITKAN', 'REQUEST_PENARIKAN', 'MENUNGGU_PENARIKAN', 'PENARIKAN_DITERBITKAN', 'DITERIMA', 'DITERIMA_INDUSTRI', 'COMPLETED', 'SELESAI_PKL'];
           hasUrl = tugasStatuses.includes(s);
        }
        else if (type === 'balasan') {
           const balasanStatuses = ['DISETUJUI_INDUSTRI', 'REQUEST_PENGANTARAN', 'MENUNGGU_PEMBERANGKATAN', 'PENGANTARAN_DITERBITKAN', 'REQUEST_PENARIKAN', 'MENUNGGU_PENARIKAN', 'PENARIKAN_DITERBITKAN', 'DITERIMA', 'DITERIMA_INDUSTRI', 'COMPLETED', 'SELESAI_PKL'];
           hasUrl = balasanStatuses.includes(s);
        }
        else if (type === 'pengantaran') {
           const pengantaranStatuses = ['MENUNGGU_PEMBERANGKATAN', 'PENGANTARAN_DITERBITKAN', 'REQUEST_PENARIKAN', 'MENUNGGU_PENARIKAN', 'PENARIKAN_DITERBITKAN', 'DITERIMA', 'DITERIMA_INDUSTRI', 'COMPLETED', 'SELESAI_PKL'];
           hasUrl = pengantaranStatuses.includes(s);
        }
        else if (type === 'penarikan') {
           const penarikanStatuses = ['MENUNGGU_PENARIKAN', 'PENARIKAN_DITERBITKAN', 'COMPLETED', 'SELESAI_PKL'];
           hasUrl = penarikanStatuses.includes(s);
        }
        
        return hasUrl ? `/api/pokja/placements/surat?id=${placementItem.id}&type=${type}` : null;
      };

      if (!groupedMap[groupKey]) {
        // Susun komponen alamat detail dan gabungan alamat lengkap
        const jalan = industry?.address || '-';
        const rt = industry?.rt ? `RT ${industry.rt}` : '';
        const rw = industry?.rw ? `RW ${industry.rw}` : '';
        const rtRw = (rt || rw) ? `${rt}${rt && rw ? '/' : ''}${rw}` : '';
        const dusun = industry?.dusun ? `Dusun ${industry.dusun}` : '';
        const kel = industry?.desaKelurahan ? `Kel. ${industry.desaKelurahan}` : '';
        const kec = industry?.subDistrict ? `Kec. ${industry.subDistrict}` : '';
        const kab = industry?.regency || '';
        const kodepos = industry?.postalCode ? `Kode Pos ${industry.postalCode}` : '';

        const fullAddressParts = [jalan, rtRw, dusun, kel, kec, kab, kodepos].filter(Boolean);
        const completeAddress = fullAddressParts.length > 0 ? fullAddressParts.join(', ') : jalan;

        groupedMap[groupKey] = {
          groupId: groupKey,
          groupKey: groupKey,
          industryId: industryId,
          industryName: industryName,
          industryAddress: completeAddress,
          rawAddress: industry?.address || '-',
          jalan: industry?.address || '-',
          rt: industry?.rt || '-',
          rw: industry?.rw || '-',
          dusun: industry?.dusun || '-',
          desaKelurahan: industry?.desaKelurahan || '-',
          subDistrict: industry?.subDistrict || '-',
          regency: industry?.regency || '-',
          postalCode: industry?.postalCode || '-',
          province: industry?.province || '-',
          fullAddress: completeAddress,
          industryPhone: industry?.phone || '-',
          departmentName: departmentName,
          periodId: periodId,
          periodName: periodName,
          startDate: startDate,
          endDate: endDate,
          suratTugasUrl: buildProxyUrl('tugas', placement),
            suratPengantaranUrl: buildProxyUrl('pengantaran', placement),
            suratPenarikanUrl: buildProxyUrl('penarikan', placement),
          suratBalasanUrl: buildProxyUrl('balasan', placement),
          letterNumber: savedLetterNumber, 
          letterUploadedBy: placement.letterUploadedBy || null,
          letterUploadedAt: placement.letterUploadedAt || null,
          placements: [],
          
        };
      }

      const formattedStudent = {
        id: student?.id,
        nis: student?.nis,
        name: student?.name,
        className: student?.className,
        department: student?.department,
        phone: student?.phone || student?.parentPhone || '-',
        parentPhone: student?.parentPhone || '-',
        teacher: student?.teacher || null,
        placementId: placement.id,
        status: placement.status,
        startDate: startDate,
        endDate: endDate,
        letterNumber: savedLetterNumber,
        suratBalasanUrl: buildProxyUrl('balasan', placement),
        nomorPengantaran: placement.nomorPengantaran || null,
        nomorPenarikan: placement.nomorPenarikan || null
      };

      groupedMap[groupKey].placements.push({
        id: placement.id,
        placementId: placement.id,
        status: placement.status,
        suratTugasUrl: buildProxyUrl('tugas', placement),
          suratPengantaranUrl: buildProxyUrl('pengantaran', placement),
          suratPenarikanUrl: buildProxyUrl('penarikan', placement),
        suratBalasanUrl: buildProxyUrl('balasan', placement),
        letterNumber: savedLetterNumber,
        student: formattedStudent
      });

      
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
    const { placementIds, suratTugasUrl, letterNumber, letterDate, status, suratPengantaranUrl, suratPenarikanUrl, nomorPengantaran, nomorPenarikan, suratBalasanUrl } = body;

    if (!Array.isArray(placementIds) || placementIds.length === 0) {
      return NextResponse.json({ error: 'Pilih kelompok siswa yang akan dikirimkan suratnya' }, { status: 400 });
    }

    if (!status && (!letterNumber || !letterNumber.trim()) && !suratTugasUrl && !suratPengantaranUrl && !suratPenarikanUrl && nomorPengantaran === undefined && nomorPenarikan === undefined && !suratBalasanUrl) {
        return NextResponse.json({ error: 'Harus mengisi Nomor Surat, mengunggah File, atau update status!' }, { status: 400 });
      }

    let updateData: any = {};
      if (status) {
        updateData.status = status;
      }
      if (suratPengantaranUrl) {
        updateData.suratPengantaranUrl = suratPengantaranUrl;
      }
      if (suratPenarikanUrl !== undefined) {
        updateData.suratPenarikanUrl = suratPenarikanUrl;
      }
      if (nomorPengantaran !== undefined) {
        updateData.nomorPengantaran = nomorPengantaran;
      }
      if (nomorPenarikan !== undefined) {
        updateData.nomorPenarikan = nomorPenarikan;
      }
    if (letterNumber && letterNumber.trim()) {
      updateData.letterNumber = letterNumber.trim();
    }

    if (suratTugasUrl) {
      const cleanSuratUrl = saveBase64ToFile(suratTugasUrl.trim(), 'surat_tugas', 'tugas');
      const uploadTimestamp = (letterDate && !isNaN(new Date(letterDate).getTime()))
        ? new Date(letterDate)
        : new Date();
      updateData = {
        ...updateData,
        suratTugasUrl: cleanSuratUrl,
        letterUploadedBy: userName,
        letterUploadedAt: uploadTimestamp,
        status: 'SURAT_DITERBITKAN'
      };
    }

    if (suratBalasanUrl) {
      updateData = {
        ...updateData,
        suratBalasanUrl: saveBase64ToFile(suratBalasanUrl.trim(), 'surat_balasan', 'balasan'),
        status: 'DISETUJUI_INDUSTRI',
        suratBalasanStatus: 'DITERIMA'
      };
    }

    const result = await db.$transaction(
      placementIds.map((id: string) =>
        db.internshipPlacement.update({
          where: { id },
          data: updateData
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `BERHASIL DISIMPAN! Nomor Surat: ${letterNumber} tersimpan permanen.`,
      letterNumber: letterNumber,
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
    const userDepartment = (session?.user as any)?.department;

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

    // Kasus C: Hapus seluruh penempatan berdasarkan industryId (dengan isolasi jurusan Pokja)
    if (industryId) {
      let deleteWhere: any = { industryId: industryId };
      if ((userRole === 'POKJA' || userRole === 'TIM_POKJA') && userDepartment && userDepartment.toLowerCase() !== 'semua jurusan') {
        const matchingPlacements = await db.internshipPlacement.findMany({
          where: {
            industryId,
            student: { department: { contains: userDepartment, mode: 'insensitive' } }
          },
          select: { id: true }
        });
        const ids = matchingPlacements.map(p => p.id);
        deleteWhere = { id: { in: ids } };
      }

      const deleted = await db.internshipPlacement.deleteMany({
        where: deleteWhere
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
