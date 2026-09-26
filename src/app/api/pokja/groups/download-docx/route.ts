import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import {
  generateSuratPermohonanDocx,
  generateBulkSuratPermohonanZip,
  generateMergedSuratPermohonanDocx,
  GroupPermohonanData,
} from '@/lib/docx-generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 45);
}

// Helper untuk membangun daftar GroupPermohonanData dari database
async function getGroupPermohonanList(filters: {
  groupIds?: string[];
  userDepartment?: string;
  userRole?: string;
}): Promise<GroupPermohonanData[]> {
  const { groupIds, userDepartment, userRole } = filters;

  let placementWhere: any = {
    status: {
      in: ['PEMBUATAN_SURAT', 'SURAT_DITERBITKAN', 'LETTER_ISSUED', 'SENT_DUDI', 'DISETUJUI_INDUSTRI', 'DIPROSES_INDUSTRI']
    }
  };

  if (userRole === 'POKJA' && userDepartment && userDepartment.toLowerCase() !== 'semua jurusan') {
    placementWhere.student = {
      department: { contains: userDepartment, mode: 'insensitive' }
    };
  }

  const placements = await db.internshipPlacement.findMany({
    where: placementWhere,
    include: {
      student: true,
      industry: true,
    },
    orderBy: { updatedAt: 'desc' }
  });

  const classRooms = await db.classRoom.findMany({ include: { period: true } });
  const periods = await db.internshipPeriod.findMany({ orderBy: { startDate: 'desc' } });

  const groupedMap: Record<string, GroupPermohonanData> = {};

  placements.forEach((placement: any) => {
    const student = placement.student;
    const industry = placement.industry;

    const matchedClass = classRooms.find(c => c.name.toLowerCase() === student?.className?.toLowerCase());
    const matchedPeriod = matchedClass?.period ||
      periods.find(p => p.department.toLowerCase().includes((student?.department || '').toLowerCase())) ||
      periods[0];

    const periodId = matchedPeriod ? matchedPeriod.id : 'PERIODE_DEFAULT';
    const industryId = industry?.id || 'INDUSTRY_UNKNOWN';
    const departmentName = student?.department || userDepartment || 'Teknik Kejuruan';
    const groupKey = `${industryId}___${periodId}___${departmentName}`;

    const startDate = placement.startDate || matchedPeriod?.startDate || new Date().toISOString();
    const endDate = placement.endDate || matchedPeriod?.endDate || new Date().toISOString();

    if (!groupedMap[groupKey]) {
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
        industryName: industry?.name || 'Tanpa Nama Industri',
        industryAddress: completeAddress,
        fullAddress: completeAddress,
        jalan: jalan,
        rt: industry?.rt || '-',
        rw: industry?.rw || '-',
        dusun: industry?.dusun || '-',
        desaKelurahan: industry?.desaKelurahan || '-',
        subDistrict: industry?.subDistrict || '-',
        regency: industry?.regency || '-',
        postalCode: industry?.postalCode || '-',
        departmentName: departmentName,
        startDate: startDate,
        endDate: endDate,
        letterNumber: placement.letterNumber || null,
        letterUploadedAt: placement.letterUploadedAt || null,
        students: []
      };
    } else {
      if (placement.startDate) groupedMap[groupKey].startDate = placement.startDate;
      if (placement.endDate) groupedMap[groupKey].endDate = placement.endDate;
    }

    if (student) {
      groupedMap[groupKey].students?.push({
        id: student.id,
        name: student.name,
        studentName: student.name,
        nis: student.nis || '-',
        className: student.className || '-',
        department: student.department || departmentName,
        phone: student.phone || student.parentPhone || '-'
      });
    }
  });

  const allGroups = Object.values(groupedMap);
  if (Array.isArray(groupIds) && groupIds.length > 0) {
    return allGroups.filter(g => groupIds.includes(g.groupId || '') || groupIds.includes(g.groupKey || '') || groupIds.includes(g.industryId || ''));
  }

  return allGroups;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const ALLOWED_ROLES = ['POKJA', 'TIM_POKJA', 'ADMIN', 'TATA_USAHA', 'TU', 'SUPER_ADMIN'];
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();

    if (!session || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');
    const industryId = searchParams.get('industryId');
    const useTte = searchParams.get('tte') !== 'false';
    const format = (searchParams.get('format') || 'docx').toLowerCase();

    const userDepartment = (session?.user as any)?.department;
    const filterIds = groupId ? [groupId] : industryId ? [industryId] : undefined;

    const groups = await getGroupPermohonanList({
      groupIds: filterIds,
      userDepartment,
      userRole
    });

    if (groups.length === 0) {
      return NextResponse.json({ error: 'Data kelompok tidak ditemukan.' }, { status: 404 });
    }

    if (format === 'zip' || (groups.length > 1 && !groupId)) {
      const zipBuffer = await generateBulkSuratPermohonanZip(groups, { useTteTags: useTte });
      const filename = `Surat_Permohonan_PKL_Masal_${Date.now()}.zip`;
      return new NextResponse(new Uint8Array(zipBuffer), {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
        }
      });
    }

    // Single group docx
    const group = groups[0];
    const docxBuffer = await generateSuratPermohonanDocx(group, { useTteTags: useTte });
    const safeName = sanitizeFilename(group.industryName);
    const filename = `Surat_Permohonan_${safeName}_${useTte ? 'TTE' : 'Langsung'}.docx`;

    return new NextResponse(new Uint8Array(docxBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    });

  } catch (error: any) {
    console.error('Error GET download-docx permohonan:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat file DOCX' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const ALLOWED_ROLES = ['POKJA', 'TIM_POKJA', 'ADMIN', 'TATA_USAHA', 'TU', 'SUPER_ADMIN'];
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();

    if (!session || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const body = await req.json();
    const { groupIds, tte, format, groupsData } = body;
    const useTte = tte !== false;

    let targetGroups: GroupPermohonanData[] = [];

    // Jika client sudah mengirimkan data kelompok yang sedang aktif di UI
    if (Array.isArray(groupsData) && groupsData.length > 0) {
      targetGroups = groupsData;
    } else {
      const userDepartment = (session?.user as any)?.department;
      targetGroups = await getGroupPermohonanList({
        groupIds: Array.isArray(groupIds) ? groupIds : undefined,
        userDepartment,
        userRole
      });
    }

    if (targetGroups.length === 0) {
      return NextResponse.json({ error: 'Tidak ada kelompok yang dipilih untuk dicetak.' }, { status: 400 });
    }

    if (format === 'merged' && targetGroups.length > 1) {
      const mergedBuffer = await generateMergedSuratPermohonanDocx(targetGroups, { useTteTags: useTte });
      const filename = `Surat_Permohonan_Gabungan_${Date.now()}.docx`;
      return new NextResponse(new Uint8Array(mergedBuffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}"`,
        }
      });
    }

    if (targetGroups.length === 1 && format !== 'zip') {
      const docxBuffer = await generateSuratPermohonanDocx(targetGroups[0], { useTteTags: useTte });
      const safeName = sanitizeFilename(targetGroups[0].industryName);
      const filename = `Surat_Permohonan_${safeName}_${useTte ? 'TTE' : 'Langsung'}.docx`;
      return new NextResponse(new Uint8Array(docxBuffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}"`,
        }
      });
    }

    // Default: ZIP file
    const zipBuffer = await generateBulkSuratPermohonanZip(targetGroups, { useTteTags: useTte });
    const filename = `Surat_Permohonan_PKL_Masal_${Date.now()}.zip`;
    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    });

  } catch (error: any) {
    console.error('Error POST download-docx permohonan:', error);
    return NextResponse.json({ error: error.message || 'Gagal memproses unduhan DOCX masal' }, { status: 500 });
  }
}
