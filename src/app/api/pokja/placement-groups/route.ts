import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper untuk memperluas sinonim dan singkatan jurusan SMK
function expandDepartmentTerms(deptName: string): string[] {
  const terms = new Set<string>();
  if (!deptName) return [];
  
  const clean = deptName.trim();
  terms.add(clean);
  const lower = clean.toLowerCase();

  // Rumpun Otomotif (TKR, TKRO, TBSM, TSM, TBO, Otomotif)
  if (
    lower.includes('otomotif') || 
    lower.includes('tkr') || 
    lower.includes('kendaraan') || 
    lower.includes('sepeda motor') || 
    lower.includes('tbsm') || 
    lower.includes('tsm')
  ) {
    terms.add('Otomotif');
    terms.add('Teknik Otomotif');
    terms.add('Teknik Kendaraan Ringan');
    terms.add('Teknik Kendaraan Ringan Otomotif');
    terms.add('TKR');
    terms.add('TKRO');
    terms.add('Teknik dan Bisnis Sepeda Motor');
    terms.add('TBSM');
    terms.add('TSM');
    terms.add('Sepeda Motor');
  }

  // Rumpun TKJ / Informatika
  if (
    lower.includes('tkj') || 
    lower.includes('komputer') || 
    lower.includes('jaringan') || 
    lower.includes('tjkt')
  ) {
    terms.add('TKJ');
    terms.add('TJKT');
    terms.add('Teknik Komputer dan Jaringan');
    terms.add('Teknik Komputer Dan Jaringan');
    terms.add('Teknik Jaringan Komputer & Telekomunikasi');
    terms.add('Teknik Jaringan Komputer dan Telekomunikasi');
  }

  // Rumpun RPL
  if (
    lower.includes('rpl') || 
    lower.includes('perangkat lunak') || 
    lower.includes('pplg')
  ) {
    terms.add('RPL');
    terms.add('PPLG');
    terms.add('Rekayasa Perangkat Lunak');
    terms.add('Pengembangan Perangkat Lunak dan Gim');
  }

  // Rumpun Mesin
  if (lower.includes('mesin') || lower.includes('tpm')) {
    terms.add('Mesin');
    terms.add('Teknik Pemesinan');
    terms.add('TPM');
  }

  // Rumpun Listrik / Elektro
  if (lower.includes('listrik') || lower.includes('titl') || lower.includes('elektro')) {
    terms.add('TITL');
    terms.add('Teknik Instalasi Tenaga Listrik');
    terms.add('Teknik Ketenagalistrikan');
  }

  // Rumpun Pengelasan
  if (lower.includes('las') || lower.includes('pengelasan') || lower.includes('tpl')) {
    terms.add('Teknik Pengelasan');
    terms.add('TPL');
    terms.add('Las');
  }

  return Array.from(terms);
}

function matchesAnyTerm(text: string | null | undefined, terms: string[]): boolean {
  if (!text) return false;
  const target = text.toLowerCase().trim();
  return terms.some(t => {
    const termClean = t.toLowerCase().trim();
    if (!termClean) return false;
    return target.includes(termClean) || termClean.includes(target);
  });
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();
    const isPokja = ['POKJA', 'TIM_POKJA'].includes(userRole);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

    if (!session || (!isPokja && !isAdmin)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    let userDept = (session?.user as any)?.department;
    const userName = (session?.user as any)?.name || '';

    // Safety fallback jika nama akun mengandung jurusan
    if (!userDept || userDept === 'ALL' || userDept.toLowerCase() === 'semua jurusan') {
      if (userName.toLowerCase().includes('otomotif') || userName.toLowerCase().includes('tkr') || userName.toLowerCase().includes('tbsm')) {
        userDept = 'Teknik Otomotif';
      } else if (userName.toLowerCase().includes('tkj') || userName.toLowerCase().includes('komputer')) {
        userDept = 'Teknik Komputer dan Jaringan';
      }
    }

    const isPokjaScoped = isPokja && userDept && userDept.toLowerCase() !== 'semua jurusan' && userDept.toUpperCase() !== 'ALL';

    // 1. Ambil seluruh kelompok penempatan beserta DUDI dan Periodenya
    const groups = await db.placementGroup.findMany({
      include: {
        industry: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            contactPerson: true
          }
        },
        period: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Ambil seluruh penempatan siswa yang terikat pada kelompok-kelompok tersebut
    const groupIds = groups.map(g => g.id);
    const placements = await db.internshipPlacement.findMany({
      where: {
        groupId: { in: groupIds }
      },
      select: {
        id: true,
        groupId: true,
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

    // Petakan penempatan per kelompok
    const placementsByGroup = new Map<string, typeof placements>();
    for (const p of placements) {
      if (!p.groupId) continue;
      const list = placementsByGroup.get(p.groupId) || [];
      list.push(p);
      placementsByGroup.set(p.groupId, list);
    }

    // Jika user adalah Admin atau Pokja Global (Semua Jurusan), tampilkan semua kelompok
    if (!isPokjaScoped) {
      const groupsWithCounts = groups.map(g => ({
        ...g,
        studentCount: placementsByGroup.get(g.id)?.length || 0
      }));
      return NextResponse.json({ success: true, data: groupsWithCounts });
    }

    // 3. Pokja Terisolasi Jurusan (misal Pokja Otomotif vs Pokja TKJ)
    // Dapatkan padanan istilah dari database & kamus kejuruan
    const deptRecord = await db.department.findFirst({
      where: {
        OR: [
          { name: { contains: userDept, mode: 'insensitive' } },
          { code: { equals: userDept, mode: 'insensitive' } }
        ]
      }
    });

    const baseDeptTerms = [userDept];
    if (deptRecord?.name && !baseDeptTerms.includes(deptRecord.name)) baseDeptTerms.push(deptRecord.name);
    if (deptRecord?.code && !baseDeptTerms.includes(deptRecord.code)) baseDeptTerms.push(deptRecord.code);

    const allExpandedTerms = Array.from(new Set(
      baseDeptTerms.flatMap(t => expandDepartmentTerms(t))
    ));

    // Filter kelompok yang BENAR-BENAR milik jurusan Pokja ini:
    const filteredGroups = groups.filter(g => {
      const groupPlacements = placementsByGroup.get(g.id) || [];

      // KASUS A: Kelompok SUDAH memiliki siswa yang di-plot
      if (groupPlacements.length > 0) {
        // Cek apakah siswa dalam kelompok ini cocok dengan jurusan Pokja
        const hasMatchingStudent = groupPlacements.some(p => 
          matchesAnyTerm(p.student?.department, allExpandedTerms)
        );
        // Kelompok yang diisi siswa TKJ TIDAK AKAN PERNAH muncul di Pokja Otomotif!
        return hasMatchingStudent;
      }

      // KASUS B: Kelompok BARU / KOSONG (belum diisi siswa)
      // Cek apakah department kelompok atau periode-nya secara spesifik ditujukan untuk jurusan ini
      const groupDeptMatch = matchesAnyTerm(g.department, allExpandedTerms);
      const periodDeptMatch = matchesAnyTerm(g.period?.department, allExpandedTerms);

      return groupDeptMatch || periodDeptMatch;
    });

    const groupsWithCounts = filteredGroups.map(g => {
      const groupPlacements = placementsByGroup.get(g.id) || [];
      // Hitung hanya siswa yang sesuai jurusan
      const matchingCount = groupPlacements.filter(p => 
        matchesAnyTerm(p.student?.department, allExpandedTerms)
      ).length;

      return {
        ...g,
        studentCount: matchingCount
      };
    });

    return NextResponse.json({ success: true, data: groupsWithCounts });
  } catch (error: any) {
    console.error('Error fetching placement groups:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();
    const isPokja = ['POKJA', 'TIM_POKJA'].includes(userRole);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

    if (!session || (!isPokja && !isAdmin)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const userDept = (session.user as any)?.department;
    const body = await request.json();
    const { industryId, periodId, startDate, endDate, department } = body;

    if (!industryId || !periodId) {
      return NextResponse.json({ error: 'Industri dan Periode wajib diisi.' }, { status: 400 });
    }

    // Ambil info periode untuk menentukan default department jika userDept kosong
    const period = await db.internshipPeriod.findUnique({
      where: { id: periodId },
      select: { department: true }
    });

    // Pastikan jurusan kelompok diikat secara presisi
    const effectiveDept = department || userDept || period?.department || 'ALL';

    const newGroup = await db.placementGroup.create({
      data: {
        industryId,
        periodId,
        department: effectiveDept,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      }
    });

    return NextResponse.json({ success: true, data: newGroup });
  } catch (error: any) {
    console.error('Error creating placement group:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
