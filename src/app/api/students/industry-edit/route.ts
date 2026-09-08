import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'SISWA') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = (session.user as any)?.username;

    const student = await db.student.findFirst({
      where: {
        OR: [
          { nis: username },
          { name: session.user?.name || '' }
        ]
      },
      include: {
        placement: {
          include: {
            industry: true
          }
        }
      }
    });

    if (!student || !student.placement || !student.placement.industry) {
      return NextResponse.json({ error: 'Tidak ada penempatan industri aktif.' }, { status: 404 });
    }

    const st = student.placement.status;
    if (st !== 'DISETUJUI_INDUSTRI' && st !== 'PEMBUATAN_SURAT' && st !== 'SURAT_DITERBITKAN') {
      return NextResponse.json({ error: 'Status belum disetujui industri.' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: student.placement.industry });
  } catch (error: any) {
    console.error('Error in GET industry-edit:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'SISWA') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = (session.user as any)?.username;

    const student = await db.student.findFirst({
      where: {
        OR: [
          { nis: username },
          { name: session.user?.name || '' }
        ]
      },
      include: { placement: true }
    });

    if (!student || !student.placement || !student.placement.industryId) {
      return NextResponse.json({ error: 'Tidak ada penempatan industri aktif.' }, { status: 404 });
    }

    const st = student.placement.status;
    if (st !== 'DISETUJUI_INDUSTRI' && st !== 'PEMBUATAN_SURAT' && st !== 'SURAT_DITERBITKAN') {
      return NextResponse.json({ error: 'Status belum disetujui industri.' }, { status: 403 });
    }

    const body = await request.json();
    
    // Allow updating certain fields
    const updated = await db.industry.update({
      where: { id: student.placement.industryId },
      data: {
        nib: body.nib || '',
        npwp: body.npwp || '',
        address: body.address || '',
        rt: body.rt || '',
        rw: body.rw || '',
        dusun: body.dusun || '',
        desaKelurahan: body.desaKelurahan || '',
        subDistrict: body.subDistrict || '',
        regency: body.regency || '',
        province: body.province || '',
        postalCode: body.postalCode || '',
        latitude: body.latitude || '',
        longitude: body.longitude || '',
        contactPerson: body.contactPerson || '',
        phone: body.phone || '',
        fax: body.fax || '',
        email: body.email || '',
        website: body.website || '',
        workType: body.workType || 'Onsite',
        jobDescription: body.jobDescription || '',
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error in PUT industry-edit:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
