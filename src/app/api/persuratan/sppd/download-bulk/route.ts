import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import {
  generateMergedSuratTugasDocx,
  generateMergedSppdDocx,
  generateMergedLaporanDocx,
} from '@/lib/docx-generator';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'TATA_USAHA', 'POKJA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const typeParam = (searchParams.get('type') || '').toLowerCase();
    const type = typeParam === 'sppd' ? 'sppd' : typeParam === 'laporan' ? 'laporan' : 'tugas';
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json({ error: 'Parameter ids wajib diisi' }, { status: 400 });
    }

    const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Tidak ada ID penugasan yang valid' }, { status: 400 });
    }

    const assignments = await db.monitoringAssignment.findMany({
      where: {
        id: { in: ids },
      },
      include: {
        industry: {
          include: {
            placements: {
              include: {
                student: {
                  select: { id: true, name: true, nis: true, className: true, department: true }
                }
              }
            }
          }
        },
        teacher: {
          select: { id: true, name: true, username: true, nip: true, rank: true, jobTitle: true, phone: true, department: true }
        },
        period: true,
      },
      orderBy: {
        monitoringDate: 'asc',
      }
    });

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ error: 'Data penugasan tidak ditemukan' }, { status: 404 });
    }

    const schoolSetting = await db.schoolSetting.findFirst();

    const options = {
      schoolSetting: schoolSetting || undefined,
      useTteTags: searchParams.get("tte") !== "false",
    };

    let docxBuffer: Buffer;
    let filename: string;

    if (type === 'sppd') {
      docxBuffer = await generateMergedSppdDocx(assignments as any, options);
      filename = `SPPD_Kolektif_${assignments.length}_Penugasan.docx`;
    } else if (type === 'laporan') {
      docxBuffer = await generateMergedLaporanDocx(assignments as any, options);
      filename = `Laporan_Hasil_Kegiatan_Kolektif_${assignments.length}_Penugasan.docx`;
    } else {
      docxBuffer = await generateMergedSuratTugasDocx(assignments as any, options);
      filename = `Surat_Tugas_Kolektif_${assignments.length}_Penugasan.docx`;
    }

    return new NextResponse(docxBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error generating bulk docx:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal membuat dokumen gabungan DOCX' },
      { status: 500 }
    );
  }
}
