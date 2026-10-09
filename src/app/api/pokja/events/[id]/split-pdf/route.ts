import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PDFDocument } from "pdf-lib";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "POKJA") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const mappingStr = formData.get("mapping") as string;

    if (!file || !mappingStr) {
      return NextResponse.json({ error: "File PDF dan mapping halaman harus diisi" }, { status: 400 });
    }

    const mapping = JSON.parse(mappingStr);
    if (!Array.isArray(mapping) || mapping.length === 0) {
      return NextResponse.json({ error: "Mapping halaman tidak valid" }, { status: 400 });
    }

    // Load original PDF
    const fileBuffer = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(fileBuffer);
    const totalPages = sourcePdf.getPageCount();
    const fs = require('fs/promises');
    const path = require('path');
    const prisma = require('@/lib/prisma').default;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'surat-izin', params.id);
    await fs.mkdir(uploadDir, { recursive: true });

    for (const item of mapping) {
      const pages = item.pages; // array of 1-based page numbers
      let rawName = item.industryName || "Surat_Izin";
      let studentIds: string[] = [];
      
      // Attempt to extract studentIds from JSON inside rawName
      const parts = rawName.split(' - {');
      if (parts.length > 1) {
        try {
          const jsonStr = '{' + parts.slice(1).join(' - {');
          const parsed = JSON.parse(jsonStr);
          rawName = `${parts[0]} - ${parsed.label}`;
          studentIds = parsed.studentIds || [];
        } catch (e) {
          // ignore parsing error
        }
      }

      if (!Array.isArray(pages) || pages.length === 0) {
        continue;
      }

      const newPdf = await PDFDocument.create();
      
      const pageIndices = pages
        .map((p: any) => parseInt(p, 10) - 1)
        .filter((p: number) => !isNaN(p) && p >= 0 && p < totalPages);

      if (pageIndices.length === 0) continue;

      const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
      copiedPages.forEach((page) => newPdf.addPage(page));

      const newPdfBytes = await newPdf.save();
      
      const safeName = rawName.replace(/[^a-zA-Z0-9_ -]/g, "_").substring(0, 80);
      const fileName = `Surat_Izin_${safeName}_${Date.now()}.pdf`;
      const filePath = path.join(uploadDir, fileName);
      
      // Save to disk
      await fs.writeFile(filePath, newPdfBytes);
      const fileUrl = `/uploads/surat-izin/${params.id}/${fileName}`;
      
      // Update or Create Database records for all students in group
      if (studentIds.length > 0) {
        for (const sid of studentIds) {
          await prisma.eventParticipant.upsert({
            where: {
              eventId_studentId: {
                eventId: params.id,
                studentId: sid
              }
            },
            update: {
              letterUrl: fileUrl
            },
            create: {
              eventId: params.id,
              studentId: sid,
              letterUrl: fileUrl
            }
          });
        }
      }
    }

    return NextResponse.json({ success: true, message: "PDF berhasil dipisah dan disimpan ke server." });


  } catch (error: any) {
    console.error("Error splitting PDF:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memisahkan PDF: " + (error.message || error) },
      { status: 500 }
    );
  }
}

