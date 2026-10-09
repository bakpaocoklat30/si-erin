import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'SISWA') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      include: {
        placement: {
          include: {
            industry: true
          }
        },
        EventParticipant: {
          where: { letterUrl: { not: null } },
          include: {
            event: true
          }
        }
      }
    });

    if (!student) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 });
    }

    const otherLetters = student.EventParticipant.map(p => ({
      id: p.id,
      eventName: p.event.name,
      letterUrl: p.letterUrl,
      startDate: p.startDate || p.event.startDate,
      endDate: p.endDate || p.event.endDate,
      createdAt: p.createdAt
    }));

    const pklDocuments = [];
    if (student.placement) {
      const p = student.placement;
      pklDocuments.push({ 
        type: 'Surat Permohonan', 
        url: p.suratTugasUrl, 
        status: p.suratTugasUrl ? 'Tersedia' : 'Belum Diterbitkan' 
      });
      pklDocuments.push({ 
        type: 'Surat Balasan Industri', 
        url: p.suratBalasanUrl, 
        status: p.suratBalasanUrl ? 'Tersedia' : 'Belum Diterbitkan' 
      });
      pklDocuments.push({ 
        type: 'Surat Penerjunan', 
        url: p.suratPengantaranUrl, 
        status: p.suratPengantaranUrl ? 'Tersedia' : 'Belum Diterbitkan' 
      });
      pklDocuments.push({ 
        type: 'Surat Penarikan', 
        url: p.suratPenarikanUrl, 
        status: p.suratPenarikanUrl ? 'Tersedia' : 'Belum Diterbitkan' 
      });
    }

    return NextResponse.json({ success: true, otherLetters, pklDocuments, industryName: student.placement?.industry?.name });
  } catch (error: any) {
    console.error('Error fetching student letters:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'SISWA') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file || type !== 'Surat Balasan Industri') {
      return NextResponse.json({ error: 'File tidak valid' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      include: { placement: true }
    });

    if (!student || !student.placement) {
      return NextResponse.json({ error: 'Siswa belum memiliki penempatan PKL' }, { status: 400 });
    }

    const fs = require('fs/promises');
    const path = require('path');
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'surat-balasan');
    await fs.mkdir(uploadDir, { recursive: true });
    
    const fileName = `Balasan_${student.nis}_${Date.now()}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    
    await fs.writeFile(filePath, buffer);
    const fileUrl = `/uploads/surat-balasan/${fileName}`;

    await prisma.internshipPlacement.update({
      where: { id: student.placement.id },
      data: {
        suratBalasanUrl: fileUrl,
        suratBalasanStatus: 'MENUNGGU_VERIFIKASI'
      }
    });

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

