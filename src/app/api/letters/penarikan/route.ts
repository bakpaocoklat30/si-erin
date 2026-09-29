export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { 
  Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle
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
        in: ['REQUEST_PENARIKAN', 'MENUNGGU_PENARIKAN', 'PENARIKAN_DITERBITKAN', 'DITERIMA', 'COMPLETED', 'SELESAI_PKL']
      }
    },
    include: { student: true }
  });

  if (placements.length === 0) return null;

  const pokjaUser = await db.user.findFirst({
    where: {
      OR: [{ role: 'POKJA' }, { role: 'TIM_POKJA' }],
      department: departmentName && departmentName !== 'Semua Jurusan' ? departmentName : undefined
    }
  });

  const picName = pokjaUser?.name || "Abdul Ghofur, SST";
  const picPhone = pokjaUser?.phone || "081911481960";
  const deptLabel = departmentName && departmentName !== 'Semua Jurusan' ? departmentName : "Teknik Komputer dan Jaringan";

  const endDate = placements[0].endDate ? new Date(placements[0].endDate) : new Date();

  return {
    properties: {
      page: {
        size: { width: 12240, height: 18720 }, // F4 Size
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
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
        children: [new TextRun({ text: "SEKOLAH MENENGAH KEJURUAN NEGERI 1 ADIWERNA", font: "Times New Roman", size: 32, bold: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Jl. Raya 2 PO BOX 24 Adiwerna, Kabupaten Tegal, Jawa Tengah Kode Pos 52194", font: "Times New Roman", size: 20 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Telepon (0283) 443768, Fax. (0283) 445494", font: "Times New Roman", size: 20 }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Laman ", font: "Times New Roman", size: 20 }),
          new TextRun({ text: "https://smkn1adw.sch.id", font: "Times New Roman", size: 20, underline: {} }),
          new TextRun({ text: " Pos-el: ", font: "Times New Roman", size: 20 }),
          new TextRun({ text: "mail@smkn1adw.sch.id", font: "Times New Roman", size: 20 }),
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
                new Paragraph({ children: [new TextRun({ text: "Nomor  : \${nomor_naskah}", font: "Times New Roman", size: 24 })] }),
                new Paragraph({ children: [new TextRun({ text: "Lamp.  : -", font: "Times New Roman", size: 24 })] }),
                new Paragraph({ children: [
                  new TextRun({ text: "Hal      : ", font: "Times New Roman", size: 24 }), 
                  new TextRun({ text: "Penarikan Siswa/Siswi Praktik", font: "Times New Roman", size: 24, bold: true, italics: true, underline: {} })
                ]}),
                new Paragraph({ children: [
                  new TextRun({ text: "             " }), 
                  new TextRun({ text: "Kerja Lapangan (PKL)", font: "Times New Roman", size: 24, bold: true, italics: true, underline: {} })
                ]}),
              ]}),
              new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, children: [
                new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: \`Adiwerna, \${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric'})}\`, font: "Times New Roman", size: 24 })] }),
              ]}),
            ],
          }),
        ],
      }),

      new Paragraph({ spacing: { before: 400 }, indent: { left: 5760 }, children: [new TextRun({ text: "Kepada Yth. Pimpinan", font: "Times New Roman", size: 24 })] }),
      new Paragraph({ indent: { left: 5760 }, children: [new TextRun({ text: industry?.name || "Perusahaan", font: "Times New Roman", size: 24, bold: true })] }),
      new Paragraph({ indent: { left: 5760 }, children: [new TextRun({ text: industry?.address || "Tempat", font: "Times New Roman", size: 24 })] }),
      new Paragraph({ indent: { left: 5760 }, children: [new TextRun({ text: "di", font: "Times New Roman", size: 24 })] }),
      new Paragraph({ indent: { left: 6480 }, children: [new TextRun({ text: "Tempat", font: "Times New Roman", size: 24 })] }),
      
      new Paragraph({ spacing: { before: 400 }, indent: { firstLine: 720 }, children: [new TextRun({ text: "Dengan hormat,", font: "Times New Roman", size: 24 })] }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 100 },
        indent: { firstLine: 720 },
        children: [
          new TextRun({ text: \`Menindaklanjuti pelaksanaan kegiatan Praktik Kerja Lapangan (PKL) peserta didik kelas XII untuk Konsentrasi Keahlian \${deptLabel} tahun pelajaran 2025/2026 telah berjalan di \`, font: "Times New Roman", size: 24 }),
          new TextRun({ text: industry?.name || "Perusahaan", font: "Times New Roman", size: 24, bold: true }),
          new TextRun({ text: \` yang Bapak/Ibu pimpin.\`, font: "Times New Roman", size: 24 }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 100 },
        indent: { firstLine: 720 },
        children: [
          new TextRun({ text: \`Selanjutnya kami sampaikan penghargaan dan terimakasih atas kesempatan yang telah diberikan kepada siswa/siswi kami yang telah melaksanakan kegiatan PKL di \`, font: "Times New Roman", size: 24 }),
          new TextRun({ text: industry?.name || "Perusahaan", font: "Times New Roman", size: 24, bold: true }),
          new TextRun({ text: \`, sehingga kegiatan ini dapat terlaksana sebagaimana mestinya. Apabila selama pelaksanaan PKL ada hal-hal yang kurang berkenan kami mohon maaf sebesar-besarnya. Kami harap, kerjasama yang telah terjalin dengan baik selama ini dapat terus berlangsung, sehingga untuk periode yang akan datang siswa/siswi kami dapat melaksanakan kegiatan PKL di \`, font: "Times New Roman", size: 24 }),
          new TextRun({ text: industry?.name || "Perusahaan", font: "Times New Roman", size: 24, bold: true }),
          new TextRun({ text: \`.\`, font: "Times New Roman", size: 24 }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 100 },
        indent: { firstLine: 720 },
        children: [
          new TextRun({ text: \`Sebagai tambahan informasi pelaksanaan PKL akan berakhir di tanggal \`, font: "Times New Roman", size: 24 }),
          new TextRun({ text: \`\${endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric'})}\`, font: "Times New Roman", size: 24, bold: true }),
          new TextRun({ text: \` sesuai dengan surat permohonan yang sebelumnya kami ajukan. Apabila dalam kegiatan PKL ini, Perusahaan dirasa perlu menambah durasi waktu pelaksanaan kami pihak sekolah mengizinkan siswa/siswa untuk diperpanjang sesuai dengan kebutuhan dari Perusahaan dan mohon untuk dibuatkan surat pemberitahuannya kepada kami dengan menghubungi nomor WhatsApp \${picPhone} a.n \${picName} selaku Pokja PKL \${deptLabel} SMKN 1 Adiwerna, atau dapat melalui alamat surel \`, font: "Times New Roman", size: 24 }),
          new TextRun({ text: "tkj@smkn1adw.sch.id", font: "Times New Roman", size: 24, underline: {} }),
          new TextRun({ text: ".", font: "Times New Roman", size: 24 }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 400 },
        indent: { firstLine: 720 },
        children: [
          new TextRun({ text: "Demikian surat ini kami sampaikan, atas perhatian dan kerjasamanya disampaikan terimakasih.", font: "Times New Roman", size: 24 }),
        ],
      }),
      
      new Paragraph({ alignment: AlignmentType.CENTER, indent: { left: 5760 }, children: [new TextRun({ text: "Kepala Sekolah,", font: "Times New Roman", size: 24 })] }),
      new Paragraph({ spacing: { before: 1000 }, alignment: AlignmentType.CENTER, indent: { left: 5760 }, children: [new TextRun({ text: "\${ttd_pengirim}", font: "Times New Roman", size: 24 })] }),
      new Paragraph({ spacing: { before: 1000 }, alignment: AlignmentType.CENTER, indent: { left: 5760 }, children: [new TextRun({ text: "\${nama_pengirim}", font: "Times New Roman", size: 24, bold: true, underline: {} })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, indent: { left: 5760 }, children: [new TextRun({ text: "NIP \${nip_pengirim}", font: "Times New Roman", size: 24 })] }),
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
      data: \`data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,\${base64}\`
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
        'Content-Disposition': 'attachment; filename="Surat_Penarikan.docx"',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal membuat dokumen DOCX' }, { status: 500 });
  }
}
