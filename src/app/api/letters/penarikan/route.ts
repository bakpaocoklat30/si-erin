export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { 
  Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, VerticalAlign,
  ImageRun
} from 'docx';
import fs from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const ALLOWED_ROLES = [
  'ADMIN',
  'SUPER_ADMIN',
  'POKJA',
  'TIM_POKJA',
  'TATA_USAHA',
  'TATA USAHA',
  'TATAUSAHA',
  'TU',
  'GURU',
  'PEMBIMBING'
];

async function createSection(
  industryId: string, 
  departmentName: string, 
  periodId: string, 
  school: any, 
  nomorSurat: string = '',
  groupId?: string,
  placementIds?: string[]
) {
  const industry = await db.industry.findUnique({ where: { id: industryId } });
  
  let placementWhere: any = {};

  if (placementIds && Array.isArray(placementIds) && placementIds.length > 0) {
    placementWhere.id = { in: placementIds };
  } else {
    placementWhere.industryId = industryId;
    placementWhere.status = {
      in: ['DITERIMA', 'DISETUJUI_INDUSTRI', 'REQUEST_PENARIKAN', 'REQUEST_Penarikan', 'MENUNGGU_PENARIKAN', 'MENUNGGU_PEMBERANGKATAN', 'PENARIKAN_DITERBITKAN', 'Penarikan_DITERBITKAN', 'DITERIMA_INDUSTRI', 'COMPLETED', 'SELESAI_PKL']
    };

    if (departmentName && departmentName !== 'Semua Jurusan') {
      placementWhere.student = {
        department: { contains: departmentName, mode: 'insensitive' }
      };
    }

    if (groupId && !groupId.includes('___')) {
      placementWhere.groupId = groupId;
    }
  }

  const placements = await db.internshipPlacement.findMany({
    where: placementWhere,
    include: { student: true }
  });

  if (placements.length === 0) return null;

  const deptQuery = departmentName && departmentName !== 'Semua Jurusan' 
    ? departmentName 
    : (placements[0]?.student?.department || 'Teknik Komputer dan Jaringan');

  const pokjaUser = await db.user.findFirst({
    where: {
      OR: [{ role: 'POKJA' }, { role: 'TIM_POKJA' }],
      ...(deptQuery ? {
        department: {
          contains: deptQuery.split(' ')[0] || deptQuery,
          mode: 'insensitive'
        }
      } : {})
    },
    orderBy: { createdAt: 'asc' }
  });

  const picName = pokjaUser?.name || "Abdul Ghofur, SST";
  const picPhone = pokjaUser?.phone || "081911481960";
  const deptLabel = deptQuery || "TKJ";

  const students = placements.map((p: any) => p.student).filter(Boolean);
  const rawStartDate = placements.find((p: any) => p.startDate)?.startDate || placements[0]?.startDate;
  const rawEndDate = placements.find((p: any) => p.endDate)?.endDate || placements[0]?.endDate;
  const startDate = rawStartDate ? new Date(rawStartDate) : new Date();
  const endDate = rawEndDate ? new Date(rawEndDate) : new Date();
  const actualNomorSurat = nomorSurat || placements[0]?.nomorPenarikan || placements.find((p: any) => p.nomorPenarikan)?.nomorPenarikan || placements[0]?.letterNumber || "${nomor_naskah}";

  const kopImagePath = path.join(process.cwd(), 'public/images/kop-surat-tugas.png');
  const headerChildren: any[] = [];
  if (fs.existsSync(kopImagePath)) {
    headerChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: fs.readFileSync(kopImagePath),
            transformation: {
              width: 700,
              height: 137
            }
          })
        ]
      })
    );
  } else {
    headerChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: school.name || 'SMK NEGERI 1 ADIWERNA', font: 'Times New Roman', size: 28, bold: true })
        ]
      })
    );
  }

  return {
    properties: {
      page: {
        size: { width: 12240, height: 18720 }, // F4 Size
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [
      ...headerChildren,
      
      new Paragraph({ spacing: { before: 200, after: 200 }, children: [] }),
      
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 }, insideHorizontal: { style: BorderStyle.NONE, size: 0 }, insideVertical: { style: BorderStyle.NONE, size: 0 } },
        rows: [
          new TableRow({
            children: [
              new TableCell({ width: { size: 60, type: WidthType.PERCENTAGE }, children: [
                new Paragraph({ children: [new TextRun({ text: `Nomor  : ${actualNomorSurat}`, font: "Times New Roman", size: 24 })] }),
                new Paragraph({ children: [new TextRun({ text: "Lamp.  : -", font: "Times New Roman", size: 24 })] }),
                new Paragraph({ children: [
                  new TextRun({ text: "Hal      : ", font: "Times New Roman", size: 24 }), 
                  new TextRun({ text: "Penarikan Siswa/Siswi Praktik Kerja Lapangan (PKL)", font: "Times New Roman", size: 24, bold: true, italics: true, underline: {} })
                ]}),
              ]}),
              new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, children: [
                new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Adiwerna, \${tanggal_naskah}`, font: "Times New Roman", size: 24 })] }),
              ]}),
            ],
          }),
        ],
      }),

      new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: "Kepada Yth. Pimpinan", font: "Times New Roman", size: 24 })] }),
      new Paragraph({ children: [new TextRun({ text: industry?.name || "Perusahaan", font: "Times New Roman", size: 24, bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: industry?.address || "Tempat", font: "Times New Roman", size: 24 })] }),
      
      new Paragraph({ spacing: { before: 400 }, indent: { firstLine: 720 }, children: [new TextRun({ text: "Dengan hormat,", font: "Times New Roman", size: 24 })] }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200 },
        indent: { firstLine: 720 },
        children: [
          new TextRun({ text: `Menindaklanjuti pelaksanaan kegiatan Praktik Kerja Lapangan (PKL) peserta didik kelas XII untuk Program Keahlian `, font: "Times New Roman", size: 24 }),
          new TextRun({ text: `${deptLabel} `, font: "Times New Roman", size: 24, bold: true }),
          new TextRun({ text: `tahun pelajaran 2026/2027 yang telah berjalan di `, font: "Times New Roman", size: 24 }),
          new TextRun({ text: `${industry?.name || 'Perusahaan'}`, font: "Times New Roman", size: 24, bold: true }),
          new TextRun({ text: ` yang Bapak/Ibu pimpin.`, font: "Times New Roman", size: 24 }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200 },
        indent: { firstLine: 720 },
        children: [
          new TextRun({ text: `Selanjutnya kami sampaikan penghargaan dan terima kasih atas kesempatan yang telah diberikan kepada siswa/siswi kami yang telah melaksanakan kegiatan PKL di `, font: "Times New Roman", size: 24 }),
          new TextRun({ text: `${industry?.name || 'Perusahaan'}`, font: "Times New Roman", size: 24, bold: true }),
          new TextRun({ text: `, sehingga kegiatan ini dapat terlaksana sebagaimana mestinya. Apabila selama pelaksanaan PKL ada hal-hal yang kurang berkenan kami mohon maaf sebesar-besarnya. Kami harap, kerjasama yang telah terjalin dengan baik selama ini dapat terus berlangsung, sehingga untuk periode yang akan datang siswa/siswi kami dapat melaksanakan kegiatan PKL di `, font: "Times New Roman", size: 24 }),
          new TextRun({ text: `${industry?.name || 'Perusahaan'}`, font: "Times New Roman", size: 24, bold: true }),
          new TextRun({ text: `.`, font: "Times New Roman", size: 24 }),
        ],
      }),
      new Paragraph({ spacing: { after: 200 }, indent: { firstLine: 720 }, children: [new TextRun({ text: "Adapun daftar nama murid yang melaksanakan kegiatan praktik kerja lapangan:", font: "Times New Roman", size: 24 })] }),
      
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: { style: BorderStyle.SINGLE, size: 4, color: "000000" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" }, left: { style: BorderStyle.SINGLE, size: 4, color: "000000" }, right: { style: BorderStyle.SINGLE, size: 4, color: "000000" }, insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "000000" }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "000000" } },
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
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (student.name || '').toUpperCase(), font: "Times New Roman", size: 24 })] })], verticalAlign: VerticalAlign.CENTER }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: student.className || "-", font: "Times New Roman", size: 24 })] })], verticalAlign: VerticalAlign.CENTER }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: student.phone || student.parentPhone || "-", font: "Times New Roman", size: 24 })] })], verticalAlign: VerticalAlign.CENTER }),
            ]
          }))
        ]
      }),
      
      new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { before: 200, after: 200 }, indent: { firstLine: 720 }, children: [
        new TextRun({ text: `Sebagai tambahan informasi, pelaksanaan kegiatan PKL akan berakhir pada tanggal `, font: "Times New Roman", size: 24 }),
        new TextRun({ text: `${endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric'})} `, font: "Times New Roman", size: 24, bold: true }),
        new TextRun({ text: `sesuai dengan surat permohonan yang sebelumnya kami ajukan. Apabila dalam kegiatan PKL ini, Instansi/Perusahaan dirasa perlu menambah durasi waktu pelaksanaan kegiatan, kami pihak sekolah mengizinkan peserta didik untuk diperpanjang sesuai dengan kebutuhan dari Perusahaan dan mohon untuk dibuatkan surat pemberitahuannya kepada kami dengan menghubungi Kontak PIC (`, font: "Times New Roman", size: 24 }),
        new TextRun({ text: "Person in Charge", font: "Times New Roman", size: 24, italics: true }),
        new TextRun({ text: `) dari kami yang dapat dihubungi di nomor WhatsApp `, font: "Times New Roman", size: 24 }),
        new TextRun({ text: `${picPhone} a.n ${picName}`, font: "Times New Roman", size: 24, bold: true }),
        new TextRun({ text: ` selaku Pokja PKL ${deptLabel} SMKN 1 Adiwerna, atau dapat melalui surel `, font: "Times New Roman", size: 24 }),
        new TextRun({ text: "tkj@smkn1adw.sch.id", font: "Times New Roman", size: 24, underline: {} }),
        new TextRun({ text: ".", font: "Times New Roman", size: 24 }),
      ]}),
      new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 400 }, indent: { firstLine: 720 }, children: [new TextRun({ text: "Demikian surat ini kami sampaikan, atas perhatian dan kerjasamanya disampaikan terimakasih.", font: "Times New Roman", size: 24 })] }),
      
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "${jabatan_pengirim}", font: "Times New Roman", size: 24 })] }),
      new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "${ttd_pengirim}", font: "Times New Roman", size: 24 })] }),
      new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "${nama_pengirim}", font: "Times New Roman", size: 24, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Pembina Utama Muda. IV/c", font: "Times New Roman", size: 24 })] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "NIP ${nip_pengirim}", font: "Times New Roman", size: 24 })] }),
    ],
  };
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();
    if (!session || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { groups, nomorSurat } = body;
    
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
      const groupNomor = nomorSurat || (g.students && g.students.length > 0 ? (g.students[0].nomorPenarikan || g.students[0].letterNumber) : '');
      const placementIds = g.students?.map((s: any) => s.placementId || s.id).filter(Boolean);
      const section = await createSection(g.industryId, g.departmentName, g.periodId, school, groupNomor, g.groupId, placementIds);
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
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();
    if (!session || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let industryId = searchParams.get('industryId');
    let periodId = searchParams.get('periodId');
    let departmentName = searchParams.get('department') || '';
    const nomorSurat = searchParams.get('nomorSurat') || '';
    const groupId = searchParams.get('groupId') || undefined;
    const placementIdsParam = searchParams.get('placementIds');
    const placementIds = placementIdsParam ? placementIdsParam.split(',').map(s => s.trim()).filter(Boolean) : undefined;

    // Fallback: Jika industryId atau periodId tidak disediakan di query params, temukan dari placementIds atau groupId
    if ((!industryId || !periodId) && placementIds && placementIds.length > 0) {
      const samplePlacement = await db.internshipPlacement.findFirst({
        where: { id: { in: placementIds } },
        include: { student: true, industry: true }
      });
      if (samplePlacement) {
        if (!industryId) industryId = samplePlacement.industryId;
        if (!departmentName) departmentName = samplePlacement.student?.department || '';
        if (!periodId) periodId = samplePlacement.periodId || 'PERIODE_DEFAULT';
      }
    }

    if (!industryId && groupId) {
      if (groupId.includes('___')) {
        const parts = groupId.split('___');
        industryId = parts[0];
        if (!periodId) periodId = parts[1] || 'PERIODE_DEFAULT';
        if (!departmentName) departmentName = parts[2] || '';
      } else {
        const samplePlacement = await db.internshipPlacement.findFirst({
          where: { groupId: groupId },
          include: { student: true, industry: true }
        });
        if (samplePlacement) {
          industryId = samplePlacement.industryId;
          if (!periodId) periodId = samplePlacement.periodId || 'PERIODE_DEFAULT';
          if (!departmentName) departmentName = samplePlacement.student?.department || '';
        }
      }
    }

    if (!periodId) periodId = 'PERIODE_DEFAULT';
    if (!industryId) {
      return NextResponse.json({ error: 'Data industri tidak ditemukan' }, { status: 400 });
    }

    const school = await db.schoolSetting.findFirst() || {
      name: 'SMK NEGERI 1 ADIWERNA', address: 'JL. Raya 2 PO BOX 24 Adiwerna', phone: '(0283) 443768', email: 'mail@smkn1adw.sch.id'
    };
    
    const industry = await db.industry.findUnique({ where: { id: industryId } });
    const industryNameSafe = industry ? industry.name.replace(/[^a-zA-Z0-9 _-]/g, '').trim() : 'Industri';
    const filename = `Surat Penarikan - ${industryNameSafe}.docx`;

    const section = await createSection(industryId, departmentName, periodId, school, nomorSurat, groupId, placementIds);
    if (!section) return NextResponse.json({ error: 'Data kosong' }, { status: 404 });

    const doc = new Document({ sections: [section] });
    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error GET Surat Penarikan DOCX:', error);
    return NextResponse.json({ error: 'Gagal membuat dokumen DOCX' }, { status: 500 });
  }
}
