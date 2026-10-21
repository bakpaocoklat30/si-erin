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
import { loadPeriodContext, resolvePlacementPeriod } from '@/lib/period-resolver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 45);
}

const ALLOWED_ROLES = [
  'POKJA',
  'TIM_POKJA',
  'ADMIN',
  'TATA_USAHA',
  'TATA USAHA',
  'TATAUSAHA',
  'TU',
  'SUPER_ADMIN'
];

const VERIFIED_STATUSES = [
  'PEMBUATAN_SURAT',
  'SURAT_DITERBITKAN',
  'LETTER_ISSUED',
  'KIRIM_SURAT',
  'SENT_DUDI',
  'DISETUJUI_INDUSTRI',
  'DIPROSES_INDUSTRI',
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

// Helper untuk membangun daftar GroupPermohonanData dari database
async function getGroupPermohonanList(filters: {
  groupIds?: string[];
  userDepartment?: string;
  userRole?: string;
}): Promise<GroupPermohonanData[]> {
  const { groupIds, userDepartment, userRole } = filters;
  const isSpecificTarget = Array.isArray(groupIds) && groupIds.length > 0;

  let placementWhere: any = {};

  if (isSpecificTarget) {
    // Jika user memilih kelompok tertentu, sertakan status aktif apa pun kecuali yang dibatalkan/ditolak
    placementWhere.status = {
      notIn: ['DIBATALKAN', 'DITOLAK', 'DITOLAK_INDUSTRI']
    };
  } else {
    // Mode masal: ambil seluruh status yang terverifikasi
    placementWhere.status = {
      in: VERIFIED_STATUSES
    };
  }

  // Isolasi Jurusan jika role Pokja / Tim Pokja
  if (
    (userRole === 'POKJA' || userRole === 'TIM_POKJA') &&
    userDepartment &&
    userDepartment.toLowerCase() !== 'semua jurusan'
  ) {
    if (!isSpecificTarget) {
      placementWhere.student = {
        department: { contains: userDepartment, mode: 'insensitive' }
      };
    }
  }

  const periodCtx = await loadPeriodContext();

  const placements = await db.internshipPlacement.findMany({
    where: placementWhere,
    include: {
      student: true,
      industry: true,
    },
    orderBy: { updatedAt: 'desc' }
  });

  const groupedMap: Record<string, GroupPermohonanData & { candidateKeys?: Set<string>; periodId?: string; placementGroupId?: string | null }> = {};

  placements.forEach((placement: any) => {
    const student = placement.student;
    const industry = placement.industry;

    const matchedPeriod = resolvePlacementPeriod(placement, periodCtx);
    const periodId = matchedPeriod ? matchedPeriod.id : 'PERIODE_DEFAULT';
    const industryId = industry?.id || 'INDUSTRY_UNKNOWN';
    const departmentName = student?.department || userDepartment || 'Teknik Kejuruan';

    // Prioritaskan tanggal kustom dari placement atau placementGroup
    const pg = placement.groupId ? periodCtx.groupMap.get(placement.groupId) : null;
    const startDate = placement.startDate || pg?.startDate || matchedPeriod?.startDate || new Date().toISOString();
    const endDate = placement.endDate || pg?.endDate || matchedPeriod?.endDate || new Date().toISOString();

    const savedLetterNumber = placement.letterNumber || null;
    const groupKey = placement.groupId || `${industryId}___${periodId}___${departmentName}___${savedLetterNumber || 'PENDING'}`;

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

      const candidateKeys = new Set<string>([
        groupKey,
        industryId,
        `${industryId}___${periodId}___${departmentName}`,
        `${industryId}___${periodId}___${departmentName}___${savedLetterNumber || 'PENDING'}`,
        `${industryId}___${periodId}___${departmentName}___PENDING`
      ]);
      if (placement.groupId) candidateKeys.add(placement.groupId);

      groupedMap[groupKey] = {
        groupId: groupKey,
        groupKey: groupKey,
        placementGroupId: placement.groupId || null,
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
        periodId: periodId,
        startDate: startDate,
        endDate: endDate,
        letterNumber: savedLetterNumber,
        letterUploadedAt: placement.letterUploadedAt || null,
        students: [],
        candidateKeys: candidateKeys
      };
    } else {
      if (placement.startDate) groupedMap[groupKey].startDate = placement.startDate;
      if (placement.endDate) groupedMap[groupKey].endDate = placement.endDate;
      if (savedLetterNumber && !groupedMap[groupKey].letterNumber) {
        groupedMap[groupKey].letterNumber = savedLetterNumber;
      }
    }

    groupedMap[groupKey].candidateKeys?.add(placement.id);

    if (student) {
      groupedMap[groupKey].candidateKeys?.add(student.id);
      if (student.nis) groupedMap[groupKey].candidateKeys?.add(student.nis);

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

  if (isSpecificTarget) {
    const targetIds = groupIds.map(id => decodeURIComponent(String(id)).trim()).filter(Boolean);

    const matched = allGroups.filter(g => {
      return targetIds.some(targetId => {
        if (!targetId) return false;

        // 1. Exact match pada candidateKeys atau properti identitas utama
        if (g.candidateKeys?.has(targetId)) return true;
        if (g.groupId === targetId || g.groupKey === targetId || g.industryId === targetId) return true;
        if (g.placementGroupId && g.placementGroupId === targetId) return true;

        // 2. Toleransi composite key (industryId___periodId___department...)
        if (targetId.includes('___')) {
          const parts = targetId.split('___');
          const targetIndId = parts[0];
          const targetPerId = parts[1];
          if (g.industryId === targetIndId) {
            if (!targetPerId || targetPerId === 'ALL' || targetPerId === 'PERIODE_DEFAULT' || g.periodId === targetPerId) {
              return true;
            }
          }
        }

        // 3. Prefix matching toleran
        if (g.industryId && targetId.startsWith(g.industryId)) return true;

        return false;
      });
    });

    if (matched.length > 0) {
      return matched;
    }

    // Fallback darurat: cari placement langsung berdasarkan targetIds jika tidak ter-cluster di groupedMap
    const fallbackPlacements = await db.internshipPlacement.findMany({
      where: {
        OR: [
          { groupId: { in: targetIds } },
          { id: { in: targetIds } },
          { industryId: { in: targetIds } }
        ]
      },
      include: {
        student: true,
        industry: true
      }
    });

    if (fallbackPlacements.length > 0) {
      const fbGroupedMap: Record<string, GroupPermohonanData> = {};
      fallbackPlacements.forEach((p: any) => {
        const ind = p.industry;
        const std = p.student;
        const key = p.groupId || p.industryId || 'FALLBACK_GROUP';
        if (!fbGroupedMap[key]) {
          fbGroupedMap[key] = {
            groupId: key,
            groupKey: key,
            industryId: p.industryId,
            industryName: ind?.name || 'Tanpa Nama Industri',
            industryAddress: ind?.address || '-',
            fullAddress: ind?.address || '-',
            departmentName: std?.department || userDepartment || 'Teknik Kejuruan',
            startDate: p.startDate || new Date().toISOString(),
            endDate: p.endDate || new Date().toISOString(),
            letterNumber: p.letterNumber || null,
            letterUploadedAt: p.letterUploadedAt || null,
            students: []
          };
        }
        if (std) {
          fbGroupedMap[key].students?.push({
            id: std.id,
            name: std.name,
            studentName: std.name,
            nis: std.nis || '-',
            className: std.className || '-',
            department: std.department || fbGroupedMap[key].departmentName,
            phone: std.phone || std.parentPhone || '-'
          });
        }
      });
      return Object.values(fbGroupedMap);
    }

    return [];
  }

  return allGroups;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();

    if (!session || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');
    const industryId = searchParams.get('industryId');
    const tteParam = searchParams.get('tte') ?? searchParams.get('useTte');
    const useTte = tteParam !== 'false';
    const format = (searchParams.get('format') || 'docx').toLowerCase();

    const userDepartment = (session?.user as any)?.department;
    const filterIds: string[] = [];
    if (groupId) filterIds.push(groupId);
    if (industryId && !filterIds.includes(industryId)) filterIds.push(industryId);

    const groups = await getGroupPermohonanList({
      groupIds: filterIds.length > 0 ? filterIds : undefined,
      userDepartment,
      userRole
    });

    if (groups.length === 0) {
      return NextResponse.json({ error: 'Data kelompok tidak ditemukan.' }, { status: 404 });
    }

    const schoolSetting = await db.schoolSetting.findFirst();

    if (format === 'zip' || (groups.length > 1 && !groupId)) {
      const zipBuffer = await generateBulkSuratPermohonanZip(groups, {
        useTteTags: useTte,
        schoolSetting: schoolSetting || undefined
      });
      const filename = `Surat Permohonan - Masal.zip`;
      return new NextResponse(new Uint8Array(zipBuffer), {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
        }
      });
    }

    // Single group docx
    const group = groups[0];
    const docxBuffer = await generateSuratPermohonanDocx(group, {
      useTteTags: useTte,
      schoolSetting: schoolSetting || undefined
    });
    const safeName = sanitizeFilename(group.industryName);
    const filename = `Surat Permohonan - ${safeName}.docx`;

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
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();

    if (!session || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const body = await req.json();
    const { groupIds, tte, useTte: useTteBody, format, groupsData } = body;
    const tteParam = tte ?? useTteBody;
    const useTte = tteParam !== false;

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

    const schoolSetting = await db.schoolSetting.findFirst();

    if (format === 'merged' && targetGroups.length > 1) {
      const mergedBuffer = await generateMergedSuratPermohonanDocx(targetGroups, {
        useTteTags: useTte,
        schoolSetting: schoolSetting || undefined
      });
      const filename = `Surat Permohonan - Gabungan.docx`;
      return new NextResponse(new Uint8Array(mergedBuffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}"`,
        }
      });
    }

    if (targetGroups.length === 1 && format !== 'zip') {
      const docxBuffer = await generateSuratPermohonanDocx(targetGroups[0], {
        useTteTags: useTte,
        schoolSetting: schoolSetting || undefined
      });
      const safeName = sanitizeFilename(targetGroups[0].industryName);
      const filename = `Surat Permohonan - ${safeName}.docx`;
      return new NextResponse(new Uint8Array(docxBuffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}"`,
        }
      });
    }

    // Default: ZIP file
    const zipBuffer = await generateBulkSuratPermohonanZip(targetGroups, {
      useTteTags: useTte,
      schoolSetting: schoolSetting || undefined
    });
    const filename = `Surat Permohonan - Masal.zip`;
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
