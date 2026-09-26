import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { PDFDocument } from 'pdf-lib';
import {
  parsePdfPages,
  detectDocumentSegments,
  matchSegmentToAssignment,
  extractAndSaveSegmentPdf,
  DocumentSegment,
} from '@/lib/pdf-splitter';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'TATA_USAHA', 'POKJA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const mode = (formData.get('mode') as 'AUTO' | 'TUGAS' | 'SPPD') || 'AUTO';
    const action = (formData.get('action') as 'analyze' | 'commit') || 'commit';

    if (!file) {
      return NextResponse.json({ error: 'Berkas PDF hasil TTE wajib diunggah' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // 1. Ekstraksi teks halaman
    const pages = await parsePdfPages(pdfBuffer);
    if (!pages || pages.length === 0) {
      return NextResponse.json({ error: 'Berkas PDF tidak memiliki halaman yang dapat dibaca' }, { status: 400 });
    }

    // 2. Deteksi segmentasi berkas
    const segments = detectDocumentSegments(pages, mode);

    // 3. Ambil seluruh penugasan relevan dari database
    const assignments = await db.monitoringAssignment.findMany({
      include: {
        teacher: {
          select: { id: true, name: true, nip: true, username: true, department: true }
        },
        industry: {
          select: { id: true, name: true, address: true, regency: true }
        }
      },
      orderBy: {
        monitoringDate: 'desc',
      }
    });

    // 4. Lakukan pencocokan cerdas untuk setiap segment
    const matchedResults: Array<{
      segment: DocumentSegment;
      assignment: any;
      score: number;
      matchReasons: string[];
      savedFileUrl?: string;
      savedFileName?: string;
    }> = [];

    const unmatchedResults: Array<{
      segment: DocumentSegment;
      reason: string;
    }> = [];

    // Track assigned assignments to handle multiples gracefully
    for (const segment of segments) {
      const match = matchSegmentToAssignment(segment, assignments);
      if (match.assignment) {
        matchedResults.push({
          segment,
          assignment: match.assignment,
          score: match.score,
          matchReasons: match.matchReasons,
        });
      } else {
        unmatchedResults.push({
          segment,
          reason: 'Tidak ditemukan guru atau industri yang cocok pada database',
        });
      }
    }

    // 5. Jika hanya ANALYZE (Pratinjau sebelum simpan)
    if (action === 'analyze') {
      return NextResponse.json({
        success: true,
        action: 'analyze',
        totalPages: pages.length,
        totalSegments: segments.length,
        matchedCount: matchedResults.length,
        unmatchedCount: unmatchedResults.length,
        matched: matchedResults.map((m) => ({
          pageNumbers: m.segment.pageNumbers,
          docType: m.segment.docType,
          assignmentId: m.assignment.id,
          teacherName: m.assignment.teacher?.name,
          teacherNip: m.assignment.teacher?.nip || m.assignment.teacher?.username,
          industryName: m.assignment.industry?.name,
          score: m.score,
          matchReasons: m.matchReasons,
          purpose: m.assignment.purpose,
        })),
        unmatched: unmatchedResults.map((u) => ({
          pageNumbers: u.segment.pageNumbers,
          docType: u.segment.docType,
          snippet: u.segment.combinedText.substring(0, 150),
          reason: u.reason,
        })),
      });
    }

    // 6. Jika COMMIT: Ekstrak PDF per segment dan simpan ke database
    const sourcePdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const updatedAssignments: any[] = [];

    for (const item of matchedResults) {
      const { fileName, fileUrl } = await extractAndSaveSegmentPdf(
        sourcePdfDoc,
        item.segment,
        item.assignment.id
      );

      item.savedFileName = fileName;
      item.savedFileUrl = fileUrl;

      // Update data di database
      const updateData: any = {};
      if (item.segment.docType === 'TUGAS') {
        updateData.suratTugasUrl = fileUrl;
      } else {
        updateData.sppdUrl = fileUrl;
      }

      // Cek apakah kedua berkas sudah terunggah
      const curTask = await db.monitoringAssignment.findUnique({
        where: { id: item.assignment.id },
      });

      const hasTugas = item.segment.docType === 'TUGAS' || Boolean(curTask?.suratTugasUrl);
      const hasSppd = item.segment.docType === 'SPPD' || Boolean(curTask?.sppdUrl);

      if (hasTugas && hasSppd) {
        updateData.status = 'SELESAI_TTE';
      }

      const updated = await db.monitoringAssignment.update({
        where: { id: item.assignment.id },
        data: updateData,
        include: {
          teacher: { select: { name: true, nip: true } },
          industry: { select: { name: true } },
        }
      });

      updatedAssignments.push({
        id: updated.id,
        teacherName: updated.teacher.name,
        industryName: updated.industry.name,
        docType: item.segment.docType,
        pageNumbers: item.segment.pageNumbers,
        fileUrl,
        status: updated.status,
      });
    }

    return NextResponse.json({
      success: true,
      action: 'commit',
      totalPages: pages.length,
      totalSegments: segments.length,
      matchedCount: matchedResults.length,
      unmatchedCount: unmatchedResults.length,
      updatedAssignments,
      unmatched: unmatchedResults.map((u) => ({
        pageNumbers: u.segment.pageNumbers,
        docType: u.segment.docType,
        reason: u.reason,
        snippet: u.segment.combinedText.substring(0, 150),
      })),
      message: `Berhasil memisahkan ${matchedResults.length} dari ${segments.length} dokumen hasil TTE dan memperbarui database.`,
    });
  } catch (error: any) {
    console.error('Error Bulk Upload TTE:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memproses dan memisahkan berkas PDF TTE' },
      { status: 500 }
    );
  }
}
