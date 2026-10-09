import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateMergedSuratIzinKegiatanDocx } from '@/lib/docx-events-generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 45);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const ALLOWED_ROLES = ['POKJA', 'TIM_POKJA', 'ADMIN', 'TATA_USAHA', 'TU', 'SUPER_ADMIN'];
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();

    if (!session || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const useTte = searchParams.get('tte') !== 'false';

    const event = await prisma.schoolEvent.findUnique({
      where: { id: params.id },
      include: {
        participants: {
          include: {
            student: {
              include: {
                user: true,
                placement: {
                  include: {
                    industry: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const school = await prisma.schoolSetting.findFirst();

    // Group students by industry
    const industryMap = new Map();

    event.participants.forEach((p: any) => {
      const industry = p.student?.placement?.industry;
      if (industry) {
        if (!industryMap.has(industry.id)) {
          industryMap.set(industry.id, {
            industry: industry,
            students: []
          });
        }
        industryMap.get(industry.id).students.push({
          ...p.student,
          participantStartDate: p.startDate,
          participantEndDate: p.endDate,
          participantLocation: p.location
        });
      }
    });

    const letters = Array.from(industryMap.values());

    if (letters.length === 0) {
      return NextResponse.json({ error: 'Tidak ada surat yang bisa di-generate (belum ada siswa dengan industri).' }, { status: 400 });
    }

    const mergedBuffer = await generateMergedSuratIzinKegiatanDocx(event, school, letters, { useTteTags: useTte });
    const safeName = sanitizeFilename(event.name);
    const filename = `Surat_Izin_Kegiatan_${safeName}.docx`;

    return new NextResponse(new Uint8Array(mergedBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    });

  } catch (error: any) {
    console.error('Error GET download-docx event:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat file DOCX' }, { status: 500 });
  }
}

