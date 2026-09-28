export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  AlignmentType, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType,
  BorderStyle,
  VerticalAlign
} from 'docx';
import { db } from '@/lib/db';


async function createSection(industryId: string, departmentName: string, periodId: string, school: any) {
  const industry = await db.industry.findUnique({ where: { id: industryId } });
  
  const placements = await db.internshipPlacement.findMany({
    where: {
      industryId: industryId,
      student: {
        department: departmentName && departmentName !== 'Semua Jurusan' ? departmentName : undefined
      },
      status: {
        in: ['DITERIMA', 'DISETUJUI_INDUSTRI', 'REQUEST_PENGANTARAN', 'MENUNGGU_PEMBERANGKATAN', 'PENGANTARAN_DITERBITKAN', 'DITERIMA_INDUSTRI', 'COMPLETED']
      }
    },
    include: { student: true }
  });

  if (placements.length === 0) return null;

  const students = placements.map((p: any) => p.student);
  const startDate = placements[0].startDate ? new Date(placements[0].startDate) : new Date();
  const endDate = placements[0].endDate ? new Date(placements[0].endDate) : new Date();
  
  const durationMonths = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));

  return {
    properties: {},
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "PEMERINTAH PROVINSI JAWA TENGAH", font: "Times New Roman", size: 28 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "DINAS PENDIDIKAN", font: "Times New Roman", size: 28 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: school.name.toUpperCase(), font: "Times New Roman", size: 32, bold: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: school.address, font: "Times New Roman", size: 20 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Telepon : ", font: "Times New Roman", size: 20 }),
          new TextRun({ text: school.phone, font: "Times New Roman", size: 20 }),
          new TextRun({ text: " Surat Elektronik : ", font: "Times New Roman", size: 20 }),
          new TextRun({ text: school.email, font: "Times New Roman", size: 20 }),
        ],
      }),
      new Paragraph({
        border: { bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 18 } },
        children: [new TextRun({ text: "" })]
      }),
      
      new Paragraph({ spacing: { before: 200, after: 200 }, children: [] }),
      
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 }, insideHorizontal: { style: BorderStyle.NONE, size: 0 }, insideVertical: { style: BorderStyle.NONE, size: 0 } },
        rows: [
          new TableRow({
            children: [
              new TableCell({ width: { size: 60, type: WidthType.PERCENTAGE }, children: [
                new Paragraph({ children: [new TextRun({ text: "Nomor          : ${nomor_surat}", font: "Times New Roman", size: 24 })] }),
                new Paragraph({ children: [new TextRun({ text: "Sifat              : Biasa", font: "Times New Roman", size: 24 })] }),
                new Paragraph({ children: [new TextRun({ text: "Lampiran       : 1 (satu) lembar", font: "Times New Roman", size: 24 })] }),
                new Paragraph({ children: [new TextRun({ text: "Hal                : ", font: "Times New Roman", size: 24 }), new TextRun({ text: "Pengantaran Prakerin", font: "Times New Roman", size: 24, bold: true })] }),
              ]}),
              new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, children: [
                new Paragraph({ children: [new TextRun({ text: "Yth. Pimpinan/Direktur", font: "Times New Roman", size: 24 })] }),
                new Paragraph({ children: [new TextRun({ text: industry?.name || "Perusahaan", font: "Times New Roman", size: 24, bold: true })] }),
                new Paragraph({ children: [new TextRun({ text: "di", font: "Times New Roman", size: 24 })] }),
                new Paragraph({ children: [new TextRun({ text: industry?.address || "Tempat", font: "Times New Roman", size: 24, bold: true })] }),
              ]}),
            ],
          }),
        ],
      }),

      new Paragraph({ spacing: { before: 400, after: 200 }, children: [new TextRun({ text: "Dengan hormat,", font: "Times New Roman", size: 24 })] }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200 },
        indent: { firstLine: 720 },
        children: [
          new TextRun({ text: `Menindaklanjuti surat balasan/konfirmasi yang kami terima dari Instansi/Perusahaan yang Bapak/Ibu pimpin terkait permohonan PKL, maka kami bermaksud menyampaikan bahwa kegiatan praktik kerja Lapangan murid kelas XII untuk Program Keahlian ${departmentName || 'Teknik Jaringan Komputer dan Telekomunikasi (TJKT)'} tahun pelajaran 2026/2027 akan mulai dilaksanakan pada tanggal `, font: "Times New Roman", size: 24 }),
          new TextRun({ text: `${startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric'})} s.d ${endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric'})}`, font: "Times New Roman", size: 24, bold: true }),
          new TextRun({ text: ` atau selama ± ${durationMonths} bulan`, font: "Times New Roman", size: 24 }),
        ],
      }),
      new Paragraph({ spacing: { after: 200 }, indent: { firstLine: 720 }, children: [new TextRun({ text: "Adapun daftar nama murid yang melaksanakan praktik kerja lapangan:", font: "Times New Roman", size: 24 })] }),
      
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 }, insideHorizontal: { style: BorderStyle.SINGLE, size: 1 }, insideVertical: { style: BorderStyle.SINGLE, size: 1 } },
        rows: [
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "NO", font: "Times New Roman", size: 24, bold: true })] })], verticalAlign: VerticalAlign.CENTER }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "NIS", font: "Times New Roman", size: 24, bold: true })] })], verticalAlign: VerticalAlign.CENTER }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "NAMA", font: "Times New Roman", size: 24, bold: true })] })], verticalAlign: VerticalAlign.CENTER }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "KELAS", font: "Times New Roman", size: 24, bold: true })] })], verticalAlign: VerticalAlign.CENTER }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "NO. HP/WA", font: "Times New Roman", size: 24, bold: true })] })], verticalAlign: VerticalAlign.CENTER }),
          ]}),
          ...students.map((student: any, idx: number) => new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${idx + 1}`, font: "Times New Roman", size: 24 })] })], verticalAlign: VerticalAlign.CENTER }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: student.nis || "-", font: "Times New Roman", size: 24 })] })], verticalAlign: VerticalAlign.CENTER }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: student.name.toUpperCase(), font: "Times New Roman", size: 24 })] })], verticalAlign: VerticalAlign.CENTER }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: student.className || "-", font: "Times New Roman", size: 24 })] })], verticalAlign: VerticalAlign.CENTER }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: student.phone || student.parentPhone || "-", font: "Times New Roman", size: 24 })] })], verticalAlign: VerticalAlign.CENTER }),
            ]
          }))
        ]
      }),
      
      new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { before: 200, after: 200 }, indent: { firstLine: 720 }, children: [
        new TextRun({ text: "Sebagai tambahan informasi, berikut ini adalah Kontak PIC (Person in Charge) dari kami yang dapat dihubungi di nomor WhatsApp ................. a.n .................... selaku Pokja PKL SMK Negeri 1 Adiwerna, atau dapat menghubungi melalui surel ", font: "Times New Roman", size: 24 }),
        new TextRun({ text: "tkj@smkn1adw.sch.id", font: "Times New Roman", size: 24, underline: {} }),
        new TextRun({ text: ".", font: "Times New Roman", size: 24 }),
      ]}),
      new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 400 }, indent: { firstLine: 720 }, children: [new TextRun({ text: "Demikian untuk menjadi periksa, atas perhatian dan kerjasamanya disampaikan terimakasih.", font: "Times New Roman", size: 24 })] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Adiwerna, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric'})}`, font: "Times New Roman", size: 24 })] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "${jabatan_pengirim}", font: "Times New Roman", size: 24 })] }),
      new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "${ttd_pengirim}", font: "Times New Roman", size: 24 })] }),
      new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "${nama_pengirim}", font: "Times New Roman", size: 24 })] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Pembina Utama Muda. IV/c", font: "Times New Roman", size: 24 })] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "NIP ${nip_pengirim}", font: "Times New Roman", size: 24 })] }),
    ],
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { groups } = body;
    
    if (!Array.isArray(groups) || groups.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data grup.' }, { status: 400 });
    }

    const school = await db.schoolSetting.findFirst() || {
      name: 'SMK NEGERI 1 ADIWERNA',
      address: 'JL. Raya 2 PO BOX 24 Adiwerna, Kabupaten Tegal, Jawa Tengah',
      phone: '(0283) 443768',
      email: 'mail@smkn1adw.sch.id'
    };

    const sections = [];
    for (const g of groups) {
      const section = await createSection(g.industryId, g.departmentName, g.periodId, school);
      if (section) sections.push(section);
    }

    if (sections.length === 0) {
      return NextResponse.json({ error: 'Data kosong' }, { status: 404 });
    }

    const doc = new Document({ sections });
    const buffer = await Packer.toBuffer(doc);
    const base64 = buffer.toString('base64');
    
    return NextResponse.json({
      success: true,
      data: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const industryId = searchParams.get('industryId');
    const periodId = searchParams.get('periodId');
    const departmentName = searchParams.get('department');

    if (!industryId || !periodId) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const school = await db.schoolSetting.findFirst() || {
      name: 'SMK NEGERI 1 ADIWERNA', address: 'JL. Raya 2 PO BOX 24 Adiwerna', phone: '(0283) 443768', email: 'mail@smkn1adw.sch.id'
    };

    const section = await createSection(industryId, departmentName || '', periodId, school);
    if (!section) return NextResponse.json({ error: 'Data kosong' }, { status: 404 });

    const doc = new Document({ sections: [section] });
    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="Surat_Penerjunan.docx"',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal membuat dokumen DOCX' }, { status: 500 });
  }
}
