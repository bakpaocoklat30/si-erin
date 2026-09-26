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

export const runtime = 'nodejs';
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

    // 3. Ambil seluruh penugasan relevan dari database (terfilter jika user mencentang baris tertentu)
    const taskIdsRaw = formData.get('taskIds') as string | null;
    let filterTaskIds: string[] | null = null;
    if (taskIdsRaw) {
      try {
        const parsed = JSON.parse(taskIdsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          filterTaskIds = parsed;
        }
      } catch {
        // ignore
      }
    }

    const assignmentsWhere: any = {};
    if (filterTaskIds && filterTaskIds.length > 0) {
      assignmentsWhere.id = { in: filterTaskIds };
    }

    const assignments = await db.monitoringAssignment.findMany({
      where: assignmentsWhere,
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
        pages: pages.map((p) => ({
          pageNum: p.pageNum,
          snippet: p.text.substring(0, 300),
        })),
        matchedCount: matchedResults.length,
        unmatchedCount: unmatchedResults.length,
        detected: [
          ...matchedResults.map((m, idx) => ({
            id: `seg_${idx}`,
            pageNumbers: m.segment.pageNumbers,
            docType: m.segment.docType,
            assignmentId: m.assignment.id,
            teacherName: m.assignment.teacher?.name,
            teacherNip: m.assignment.teacher?.nip || m.assignment.teacher?.username,
            industryName: m.assignment.industry?.name,
            score: m.score,
            matchReasons: m.matchReasons,
            snippet: m.segment.combinedText.substring(0, 200),
          })),
          ...unmatchedResults.map((u, idx) => ({
            id: `unseg_${idx}`,
            pageNumbers: u.segment.pageNumbers,
            docType: u.segment.docType,
            assignmentId: '',
            teacherName: '',
            teacherNip: '',
            industryName: '',
            score: 0,
            matchReasons: [],
            reason: u.reason,
            snippet: u.segment.combinedText.substring(0, 200),
          })),
        ].sort((a, b) => (a.pageNumbers[0] || 0) - (b.pageNumbers[0] || 0)),
        assignments: assignments.map((a) => ({
          id: a.id,
          teacherName: a.teacher?.name || 'Tanpa Nama',
          teacherNip: a.teacher?.nip || a.teacher?.username || '',
          industryName: a.industry?.name || 'Tanpa Industri',
          monitoringDate: a.monitoringDate,
          department: a.teacher?.department || '',
          hasTugas: Boolean(a.suratTugasUrl),
          hasSppd: Boolean(a.sppdUrl),
        })),
      });
    }

    // 6. Jika COMMIT: Ekstrak PDF per segment dan simpan ke database
    let sourcePdfDoc: PDFDocument;
    try {
      sourcePdfDoc = await PDFDocument.load(pdfBuffer, {
        ignoreEncryption: true,
        throwOnInvalidObject: false,
      });
    } catch (loadErr: any) {
      console.error('Failed to load sourcePdfDoc:', loadErr);
      return NextResponse.json(
        { error: `Gagal memuat dokumen PDF: ${loadErr?.message || 'Format PDF tidak valid atau rusak'}` },
        { status: 400 }
      );
    }

    // Cek apakah ada custom mappings dari pilihan user di UI
    const mappingsRaw = formData.get('mappings') as string | null;
    let customMappings: Array<{
      docType: 'TUGAS' | 'SPPD';
      pageNumbers: number[];
      assignmentId: string;
    }> | null = null;

    if (mappingsRaw) {
      try {
        customMappings = JSON.parse(mappingsRaw);
      } catch (e) {
        console.warn('Failed to parse customMappings:', e);
      }
    }

    const updatedAssignments: any[] = [];
    const failedSegments: any[] = [];

    if (customMappings && customMappings.length > 0) {
      // Jalankan pemisahan berdasarkan konfigurasi halaman & guru yang ditentukan Tata Usaha di UI
      for (const item of customMappings) {
        if (!item.assignmentId || !item.pageNumbers || item.pageNumbers.length === 0) continue;

        try {
          const segment: DocumentSegment = {
            docType: item.docType,
            pageNumbers: item.pageNumbers,
            pageIndices: item.pageNumbers.map((n) => n - 1),
            combinedText: '',
          };

          const { fileUrl } = await extractAndSaveSegmentPdf(
            sourcePdfDoc,
            segment,
            item.assignmentId
          );

          const updateData: any = {};
          if (item.docType === 'TUGAS') {
            updateData.suratTugasUrl = fileUrl;
          } else {
            updateData.sppdUrl = fileUrl;
          }

          const curTask = await db.monitoringAssignment.findUnique({
            where: { id: item.assignmentId },
          });

          const hasTugas = item.docType === 'TUGAS' || Boolean(curTask?.suratTugasUrl);
          const hasSppd = item.docType === 'SPPD' || Boolean(curTask?.sppdUrl);

          if (hasTugas && hasSppd) {
            updateData.status = 'SELESAI_TTE';
          }

          const updated = await db.monitoringAssignment.update({
            where: { id: item.assignmentId },
            data: updateData,
            include: {
              teacher: { select: { name: true, nip: true } },
              industry: { select: { name: true } },
            },
          });

          updatedAssignments.push({
            id: updated.id,
            teacherName: updated.teacher?.name || '-',
            industryName: updated.industry?.name || '-',
            docType: item.docType,
            pageNumbers: item.pageNumbers,
            fileUrl,
            status: updated.status,
          });
        } catch (err: any) {
          console.error(`Gagal memisahkan halaman ${item.pageNumbers.join(',')}:`, err);
          failedSegments.push({
            pageNumbers: item.pageNumbers,
            docType: item.docType,
            reason: err?.message || 'Gagal memisahkan berkas',
          });
        }
      }
    } else {
      // Fallback: simpan berdasarkan matchedResults deteksi otomatis
      for (const item of matchedResults) {
        try {
          const { fileUrl } = await extractAndSaveSegmentPdf(
            sourcePdfDoc,
            item.segment,
            item.assignment.id
          );

          const updateData: any = {};
          if (item.segment.docType === 'TUGAS') {
            updateData.suratTugasUrl = fileUrl;
          } else {
            updateData.sppdUrl = fileUrl;
          }

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
            },
          });

          updatedAssignments.push({
            id: updated.id,
            teacherName: updated.teacher?.name || '-',
            industryName: updated.industry?.name || '-',
            docType: item.segment.docType,
            pageNumbers: item.segment.pageNumbers,
            fileUrl,
            status: updated.status,
          });
        } catch (segmentErr: any) {
          console.error(`Gagal memisahkan segment halaman ${item.segment.pageNumbers.join(',')}:`, segmentErr);
          failedSegments.push({
            pageNumbers: item.segment.pageNumbers,
            docType: item.segment.docType,
            reason: `Gagal memisahkan halaman PDF: ${segmentErr?.message || 'Kesalahan pemisahan berkas'}`,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      action: 'commit',
      totalPages: pages.length,
      savedCount: updatedAssignments.length,
      failedCount: failedSegments.length,
      updatedAssignments,
      failedSegments,
      message: `Berhasil memisahkan ${updatedAssignments.length} dokumen hasil TTE dan memperbarui database.`,
    });
  } catch (error: any) {
    console.error('Error Bulk Upload TTE:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memproses dan memisahkan berkas PDF TTE' },
      { status: 500 }
    );
  }
}
