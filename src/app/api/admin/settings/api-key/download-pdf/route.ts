import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getExternalApiKey } from '@/lib/api-key-guard';
import { db } from '@/lib/db';
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase();

    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Administrator' }, { status: 401 });
    }

    const apiKey = await getExternalApiKey();
    const school = await db.schoolSetting.findFirst().catch(() => null) || {
      name: 'SMK NEGERI 1 ADIWERNA',
      shortName: 'SMKN 1 Adiwerna',
      address: 'Jl. Raya Adiwerna No. 15, Kabupaten Tegal, Jawa Tengah',
      phone: '(0283) 442192',
      email: 'info@smkn1adiwerna.sch.id'
    };

    const host = request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${proto}://${host}`;

    // Buat dokumen PDF baru
    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);
    const fontMonoBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

    const pageWidth = 595.28; // A4 Standard
    const pageHeight = 841.89;
    const marginX = 40;
    const contentWidth = pageWidth - (marginX * 2);
    let pages: PDFPage[] = [];

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    pages.push(currentPage);
    let cursorY = pageHeight - 45;

    // Helper untuk pindah halaman otomatis jika ruang habis
    const checkPageBreak = (neededHeight: number) => {
      if (cursorY - neededHeight < 50) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        pages.push(currentPage);
        cursorY = pageHeight - 45;
      }
    };

    // Helper gambar garis horizontal
    const drawDivider = () => {
      checkPageBreak(15);
      currentPage.drawLine({
        start: { x: marginX, y: cursorY },
        end: { x: pageWidth - marginX, y: cursorY },
        thickness: 0.8,
        color: rgb(0.85, 0.88, 0.92)
      });
      cursorY -= 12;
    };

    // Helper draw text with word wrap
    const drawTextWrapped = (
      text: string, 
      font: PDFFont, 
      size: number, 
      color: any, 
      maxWidth: number, 
      lineSpacing: number = 4
    ) => {
      const words = text.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = font.widthOfTextAtSize(testLine, size);

        if (textWidth > maxWidth && currentLine) {
          checkPageBreak(size + lineSpacing);
          currentPage.drawText(currentLine, {
            x: marginX,
            y: cursorY,
            size,
            font,
            color
          });
          cursorY -= (size + lineSpacing);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        checkPageBreak(size + lineSpacing);
        currentPage.drawText(currentLine, {
          x: marginX,
          y: cursorY,
          size,
          font,
          color
        });
        cursorY -= (size + lineSpacing);
      }
    };

    // ==========================================
    // 1. HEADER DOKUMEN & KOP INSTANSI
    // ==========================================
    // Background Header Bar
    currentPage.drawRectangle({
      x: marginX,
      y: cursorY - 45,
      width: contentWidth,
      height: 55,
      color: rgb(0.24, 0.32, 0.90) // Indigo
    });

    currentPage.drawText('SI-ERIN EXTERNAL API DOCUMENTATION', {
      x: marginX + 15,
      y: cursorY - 18,
      size: 14,
      font: fontBold,
      color: rgb(1, 1, 1)
    });

    currentPage.drawText(`${school.name.toUpperCase()} - PANDUAN PENGEMBANG PIHAK KETIGA`, {
      x: marginX + 15,
      y: cursorY - 35,
      size: 9,
      font: fontRegular,
      color: rgb(0.85, 0.90, 1)
    });

    cursorY -= 65;

    // ==========================================
    // 2. KOTAK INFORMASI KUNCI API AKTIF
    // ==========================================
    checkPageBreak(110);
    currentPage.drawRectangle({
      x: marginX,
      y: cursorY - 95,
      width: contentWidth,
      height: 100,
      color: rgb(0.96, 0.97, 1),
      borderColor: rgb(0.79, 0.85, 0.98),
      borderWidth: 1
    });

    currentPage.drawText('KUNCI OTORISASI API AKTIF (LIVE KEY):', {
      x: marginX + 15,
      y: cursorY - 20,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.5)
    });

    currentPage.drawText(apiKey, {
      x: marginX + 15,
      y: cursorY - 38,
      size: 11,
      font: fontMonoBold,
      color: rgb(0.12, 0.18, 0.75)
    });

    currentPage.drawText(`Base URL Endpoint : ${baseUrl}/api/external`, {
      x: marginX + 15,
      y: cursorY - 58,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.3, 0.35, 0.45)
    });

    currentPage.drawText(`Format Header HTTP : x-api-key: ${apiKey}`, {
      x: marginX + 15,
      y: cursorY - 72,
      size: 8.5,
      font: fontMono,
      color: rgb(0.3, 0.35, 0.45)
    });

    const printDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    currentPage.drawText(`Diterbitkan pada : ${printDate} WIB | Status: AKTIF RESMI`, {
      x: marginX + 15,
      y: cursorY - 86,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.45, 0.5, 0.6)
    });

    cursorY -= 115;

    // ==========================================
    // 3. SPESIFIKASI AUTENTIKASI
    // ==========================================
    checkPageBreak(60);
    currentPage.drawText('1. Metode Autentikasi', {
      x: marginX,
      y: cursorY,
      size: 12,
      font: fontBold,
      color: rgb(0.12, 0.16, 0.25)
    });
    cursorY -= 14;

    const authDesc = 'Seluruh permintaan ke API eksternal SI-ERIN wajib menyertakan kunci otorisasi. Sistem mendukung pengiriman API Key melalui header `x-api-key`, header `Authorization: Bearer <KEY>`, atau parameter URL `?api_key=<KEY>`. Kunci ini bersifat rahasia dan memiliki hak akses baca data secara terenkripsi.';
    drawTextWrapped(authDesc, fontRegular, 8.5, rgb(0.25, 0.3, 0.35), contentWidth);
    cursorY -= 6;
    drawDivider();

    // ==========================================
    // 4. DAFTAR ENDPOINT LENGKAP
    // ==========================================
    checkPageBreak(30);
    currentPage.drawText('2. Daftar Endpoint Resmi & Penjelasannya', {
      x: marginX,
      y: cursorY,
      size: 12,
      font: fontBold,
      color: rgb(0.12, 0.16, 0.25)
    });
    cursorY -= 16;

    const endpoints = [
      {
        method: 'GET',
        path: '/api/external',
        title: 'Spesifikasi & Ringkasan Layanan',
        desc: 'Mengambil metadata API, versi rilis, status healthcheck, dan ringkasan seluruh endpoint yang tersedia.',
        params: 'Tanpa parameter wajib.'
      },
      {
        method: 'GET',
        path: '/api/external/industries',
        title: 'Daftar Industri Mitra & Kuota',
        desc: 'Mengambil seluruh data DUDI/Industri mitra yang bermitra dengan SMKN 1 Adiwerna, mencakup nama, NIB, sektor usaha, alamat jalan, kecamatan, kabupaten, nomor telepon, narahubung (contact person), kuota total, dan sisa kuota siswa.',
        params: 'search (string), sector (string), department (string), page (int, default: 1), limit (int, default: 20, max: 100).'
      },
      {
        method: 'GET',
        path: '/api/external/industries/:id',
        title: 'Detail Lengkap Satu Industri',
        desc: 'Mengambil profil mendalam dari industri tertentu berdasarkan parameter ID unik, disertai ringkasan siswa yang sedang aktif PKL dan riwayat guru pembimbing yang ditugaskan.',
        params: ':id (path parameter, ID unik industri di SI-ERIN).'
      },
      {
        method: 'GET',
        path: '/api/external/industries/:id/students',
        title: 'Daftar Siswa PKL di Industri Tersebut',
        desc: 'Mengambil daftar lengkap seluruh siswa yang ditempatkan atau melaksanakan PKL di industri tersebut, termasuk data NIS, kelas, jurusan, kontak wali, guru pembimbing, serta tautan dokumen persuratan penempatannya.',
        params: ':id (path parameter), status (DITERIMA / COMPLETED / etc), department (string), className (string).'
      },
      {
        method: 'GET',
        path: '/api/external/students',
        title: 'Pencarian Siswa Global & Penempatan',
        desc: 'Mengambil dan mencari data siswa secara menyeluruh di semua jurusan beserta status persetujuan industri tempat mereka melaksanakan PKL.',
        params: 'search (nama/NIS), industryId (string), department (string), className (string), status (string), page (int), limit (int).'
      },
      {
        method: 'GET',
        path: '/api/external/letters',
        title: 'Dokumen Persuratan & Berkas PKL',
        desc: 'Mengambil daftar berkas dan nomor resmi surat: Surat Permohonan PKL, Surat Tugas Penerjunan/Pengantaran, Surat Balasan DUDI, Surat Penarikan, dan Surat Tugas/SPPD Monitoring Guru.',
        params: 'type (all | permohonan | penerjunan | penarikan | balasan | monitoring), industryId (string), department (string), search (string), page (int), limit (int).'
      }
    ];

    for (const ep of endpoints) {
      checkPageBreak(85);

      // Method badge & path
      currentPage.drawRectangle({
        x: marginX,
        y: cursorY - 14,
        width: 32,
        height: 14,
        color: rgb(0.15, 0.45, 0.85)
      });
      currentPage.drawText(ep.method, {
        x: marginX + 5,
        y: cursorY - 10,
        size: 8,
        font: fontBold,
        color: rgb(1, 1, 1)
      });

      currentPage.drawText(ep.path, {
        x: marginX + 40,
        y: cursorY - 10,
        size: 9.5,
        font: fontMonoBold,
        color: rgb(0.12, 0.16, 0.25)
      });
      cursorY -= 20;

      // Title & Desc
      currentPage.drawText(`Fungsi: ${ep.title}`, {
        x: marginX + 10,
        y: cursorY,
        size: 8.5,
        font: fontBold,
        color: rgb(0.2, 0.25, 0.4)
      });
      cursorY -= 12;

      drawTextWrapped(ep.desc, fontRegular, 8, rgb(0.3, 0.35, 0.4), contentWidth - 15);
      
      checkPageBreak(18);
      currentPage.drawText(`Parameter: ${ep.params}`, {
        x: marginX + 10,
        y: cursorY,
        size: 7.5,
        font: fontMono,
        color: rgb(0.35, 0.4, 0.5)
      });
      cursorY -= 12;

      drawDivider();
    }

    // ==========================================
    // 5. CONTOH KODE PEMANGGILAN (cURL & JS)
    // ==========================================
    checkPageBreak(130);
    currentPage.drawText('3. Contoh Kode Pemanggilan (Code Snippet)', {
      x: marginX,
      y: cursorY,
      size: 12,
      font: fontBold,
      color: rgb(0.12, 0.16, 0.25)
    });
    cursorY -= 14;

    const curlSnippet = `curl -X GET "${baseUrl}/api/external/industries" \\\n  -H "x-api-key: ${apiKey}"`;
    currentPage.drawRectangle({
      x: marginX,
      y: cursorY - 32,
      width: contentWidth,
      height: 35,
      color: rgb(0.1, 0.12, 0.16)
    });
    currentPage.drawText(curlSnippet, {
      x: marginX + 10,
      y: cursorY - 14,
      size: 8,
      font: fontMono,
      color: rgb(0.4, 0.9, 0.5)
    });
    cursorY -= 45;

    const jsSnippet = `const res = await fetch('${baseUrl}/api/external/letters?type=permohonan', {\n  headers: { 'x-api-key': '${apiKey}' }\n});\nconst data = await res.json();\nconsole.log(data);`;
    currentPage.drawRectangle({
      x: marginX,
      y: cursorY - 55,
      width: contentWidth,
      height: 60,
      color: rgb(0.1, 0.12, 0.16)
    });
    currentPage.drawText(jsSnippet, {
      x: marginX + 10,
      y: cursorY - 14,
      size: 7.5,
      font: fontMono,
      color: rgb(0.9, 0.85, 0.4)
    });
    cursorY -= 70;

    // ==========================================
    // 6. CATATAN KEAMANAN & KEPATUHAN
    // ==========================================
    checkPageBreak(50);
    currentPage.drawText('Catatan Keamanan Penting:', {
      x: marginX,
      y: cursorY,
      size: 8.5,
      font: fontBold,
      color: rgb(0.7, 0.15, 0.15)
    });
    cursorY -= 11;

    const securityNote = 'Kunci API ini bersifat rahasia dan hanya boleh digunakan di sisi server atau aplikasi terpercaya. Jangan mempublikasikan kunci ini ke repositori publik (GitHub/GitLab). Jika kunci bocor, segera lakukan regenerasi melalui menu Integrasi API Eksternal di dashboard administrator SI-ERIN.';
    drawTextWrapped(securityNote, fontRegular, 7.5, rgb(0.45, 0.2, 0.2), contentWidth);

    // ==========================================
    // 7. FOOTER NUMBERING PADA SETIAP HALAMAN
    // ==========================================
    const totalPagesCount = pages.length;
    for (let i = 0; i < totalPagesCount; i++) {
      const page = pages[i];
      page.drawLine({
        start: { x: marginX, y: 32 },
        end: { x: pageWidth - marginX, y: 32 },
        thickness: 0.5,
        color: rgb(0.85, 0.88, 0.92)
      });
      page.drawText(`SI-ERIN API Docs - ${school.shortName || 'SMKN 1 Adiwerna'}`, {
        x: marginX,
        y: 20,
        size: 7.5,
        font: fontRegular,
        color: rgb(0.55, 0.6, 0.65)
      });
      const pageStr = `Halaman ${i + 1} dari ${totalPagesCount}`;
      const strWidth = fontRegular.widthOfTextAtSize(pageStr, 7.5);
      page.drawText(pageStr, {
        x: pageWidth - marginX - strWidth,
        y: 20,
        size: 7.5,
        font: fontRegular,
        color: rgb(0.55, 0.6, 0.65)
      });
    }

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Dokumentasi_API_SI-ERIN.pdf"',
        'Content-Length': pdfBytes.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('Error generating API Documentation PDF:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat dokumen PDF dokumentasi' }, { status: 500 });
  }
}
