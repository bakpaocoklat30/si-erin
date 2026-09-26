import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { generateSuratTugasDocx, generateSppdDocx, generateLaporanDocx } from '@/lib/docx-generator';

// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✨ Fitur Baru: API Download Dokumen DOCX Resmi (Surat Tugas, SPPD, & Laporan Kegiatan)
// 🔧 Fitur:
//    - Mengembalikan file binary .docx asli hasil olahan template resmi SMKN 1 Adiwerna.
//    - Parameter `type`: 'tugas' | 'sppd' | 'laporan'.
//    - Parameter `tte`: 'true' | 'false' (apakah mempertahankan tag ${...} untuk TTE Jateng).
// ----------------------------------------------------------------------

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 50);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA', 'PEMBIMBING', 'TATA_USAHA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ success: false, error: 'Akses tidak diizinkan.' }, { status: 403 });
    }

    const { id } = params;
    const { searchParams } = new URL(req.url);
    const typeParam = (searchParams.get('type') || '').toLowerCase();
    const type = typeParam === 'sppd' ? 'sppd' : typeParam === 'laporan' ? 'laporan' : 'tugas';
    const useTte = searchParams.get('tte') !== 'false';

    const assignment = await prisma.monitoringAssignment.findUnique({
      where: { id },
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
          select: { id: true, name: true, username: true, nip: true, rank: true, jobTitle: true, phone: true }
        },
        period: true,
      }
    });

    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Data monitoring tidak ditemukan.' }, { status: 404 });
    }

    const schoolSetting = await prisma.schoolSetting.findFirst();

    const options = {
      schoolSetting: schoolSetting || undefined,
      useTteTags: useTte,
    };

    let docxBuffer: Buffer;
    let filename: string;

    if (type === 'sppd') {
      docxBuffer = await generateSppdDocx(assignment as any, options);
      filename = `SPPD_Monitoring_${sanitizeFilename(assignment.teacher.name)}_${sanitizeFilename(assignment.industry.name)}.docx`;
    } else if (type === 'laporan') {
      docxBuffer = await generateLaporanDocx(assignment as any, options);
      filename = `Laporan_Hasil_Kegiatan_${sanitizeFilename(assignment.teacher.name)}_${sanitizeFilename(assignment.industry.name)}.docx`;
    } else {
      docxBuffer = await generateSuratTugasDocx(assignment as any, options);
      filename = `Surat_Tugas_Monitoring_${sanitizeFilename(assignment.teacher.name)}_${sanitizeFilename(assignment.industry.name)}.docx`;
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
    console.error('Error generating docx file:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal membuat dokumen DOCX' },
      { status: 500 }
    );
  }
}
// force reload
