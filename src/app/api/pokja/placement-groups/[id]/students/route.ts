import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();
    const isPokja = ['POKJA', 'TIM_POKJA'].includes(userRole);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

    if (!session || (!isPokja && !isAdmin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userDept = (session.user as any)?.department;
    const userName = (session.user as any)?.name || '';

    if (!userDept || userDept === 'ALL' || userDept.toLowerCase() === 'semua jurusan') {
      if (userName.toLowerCase().includes('otomotif') || userName.toLowerCase().includes('tkr') || userName.toLowerCase().includes('tbsm')) {
        userDept = 'Teknik Otomotif';
      } else if (userName.toLowerCase().includes('tkj') || userName.toLowerCase().includes('komputer')) {
        userDept = 'Teknik Komputer dan Jaringan';
      }
    }

    const { id } = params;
    let whereCondition: any = { groupId: id };

    if (isPokja && userDept && userDept.toLowerCase() !== 'semua jurusan' && userDept.toUpperCase() !== 'ALL') {
      const deptRecord = await db.department.findFirst({
        where: {
          OR: [
            { name: { contains: userDept, mode: 'insensitive' } },
            { code: { equals: userDept, mode: 'insensitive' } }
          ]
        }
      });

      const baseTerms = [userDept];
      if (deptRecord?.name && !baseTerms.includes(deptRecord.name)) baseTerms.push(deptRecord.name);
      if (deptRecord?.code && !baseTerms.includes(deptRecord.code)) baseTerms.push(deptRecord.code);

      const deptTerms = Array.from(new Set(baseTerms.flatMap(t => expandDepartmentTerms(t))));

      whereCondition.student = {
        OR: deptTerms.map(term => ({
          department: { contains: term, mode: 'insensitive' as const }
        }))
      };
    }

    const placements = await db.internshipPlacement.findMany({
      where: whereCondition,
      include: {
        student: {
          select: {
            id: true,
            userId: true,
            nis: true,
            nisn: true,
            name: true,
            className: true,
            department: true,
            phone: true,
            parentName: true,
            parentRelation: true,
            parentPhone: true,
            bpjsStatus: true,
            cvStatus: true,
            isAllowedPkl: true,
            teacherId: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });

    const students = placements.map(p => ({
      ...p.student,
      placementId: p.id
    }));

    return NextResponse.json({ success: true, data: students });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();
    const isPokja = ['POKJA', 'TIM_POKJA'].includes(userRole);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

    if (!session || (!isPokja && !isAdmin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { studentIds } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'Pilih siswa.' }, { status: 400 });
    }

    const group = await db.placementGroup.findUnique({
      where: { id },
      include: { period: true }
    });
    if (!group) return NextResponse.json({ error: 'Kelompok tidak ditemukan.' }, { status: 404 });

    const effectiveStartDate = group.startDate || group.period?.startDate || null;
    const effectiveEndDate = group.endDate || group.period?.endDate || null;

    // Fetch the students to determine department
    const studentsToAdd = await db.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, department: true }
    });

    for (const studentId of studentIds) {
      const existing = await db.internshipPlacement.findUnique({ where: { studentId } });
      if (existing) {
        await db.internshipPlacement.update({
          where: { id: existing.id },
          data: {
            industryId: group.industryId,
            status: 'DISETUJUI_INDUSTRI',
            stage: 4,
            groupId: group.id,
            startDate: existing.startDate || effectiveStartDate,
            endDate: existing.endDate || effectiveEndDate,
          }
        });
      } else {
        await db.internshipPlacement.create({
          data: {
            studentId,
            industryId: group.industryId,
            status: 'DISETUJUI_INDUSTRI',
            stage: 4,
            groupId: group.id,
            startDate: effectiveStartDate,
            endDate: effectiveEndDate,
          }
        });
      }

      await db.student.update({
        where: { id: studentId },
        data: { isAllowedPkl: true }
      });
    }

    // Bind group department explicitly if unassigned or generic
    const studentDept = studentsToAdd.find(s => s.department)?.department;
    const userDept = (session.user as any)?.department;
    const newDept = studentDept || userDept;
    if (
      newDept && 
      (!group.department || group.department === 'ALL' || group.department.toLowerCase() === 'semua jurusan')
    ) {
      await db.placementGroup.update({
        where: { id: group.id },
        data: { department: newDept }
      });
    }

    return NextResponse.json({ success: true, message: 'Siswa berhasil ditambahkan.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();
    const isPokja = ['POKJA', 'TIM_POKJA'].includes(userRole);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

    if (!session || (!isPokja && !isAdmin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const placementId = url.searchParams.get('placementId');

    if (placementId) {
      await db.internshipPlacement.delete({ where: { id: placementId } });
      return NextResponse.json({ success: true, message: 'Siswa dihapus dari kelompok.' });
    }

    return NextResponse.json({ error: 'placementId dibutuhkan' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
