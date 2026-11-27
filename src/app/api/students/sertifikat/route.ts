export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

const PENARIKAN_PUBLISHED_STATUSES = new Set([
  'PENARIKAN_DITERBITKAN',
  'TELAH_DITARIK',
  'COMPLETED',
  'SELESAI_PKL',
  'MENUNGGU_PENARIKAN',
]);

function isSuratPenarikanPublished(placement: any): boolean {
  if (!placement) return false;
  const hasUrl = Boolean(placement.suratPenarikanUrl && String(placement.suratPenarikanUrl).trim() !== '');
  const statusUpper = String(placement.status || '').toUpperCase().trim();
  return hasUrl || PENARIKAN_PUBLISHED_STATUSES.has(statusUpper);
}

function getSafeExtension(file: File, allowedExts: string[], fallbackExt: string): string {
  const mime = (file.type || '').toLowerCase();
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';

  const origExt = (file.name?.split('.').pop() || '').toLowerCase();
  if (allowedExts.includes(origExt)) return origExt;
  return fallbackExt;
}

async function saveUploadedFile(file: File, prefix: string, safeNis: string, allowedExts: string[], fallbackExt: string): Promise<string> {
  const ext = getSafeExtension(file, allowedExts, fallbackExt);
  if (!allowedExts.includes(ext)) {
    throw new Error(`Format file tidak didukung (${file.name}). Gunakan: ${allowedExts.join(', ').toUpperCase()}`);
  }

  const maxBytes = ext === 'pdf' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`Ukuran file "${file.name}" melebihi batas maksimum (${ext === 'pdf' ? '10MB' : '5MB'}).`);
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'sertifikat');
  await fs.mkdir(uploadDir, { recursive: true });

  const fileName = `${prefix}_${safeNis}_${Date.now()}.${ext}`;
  const filePath = path.join(uploadDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return `/uploads/sertifikat/${fileName}`;
}

async function findStudentWithPlacement(session: any) {
  const userId = (session.user as any)?.id;
  const username = (session.user as any)?.username;

  return db.student.findFirst({
    where: {
      OR: [
        ...(userId ? [{ userId }] : []),
        ...(username ? [{ nis: String(username).trim() }] : []),
      ],
    },
    include: {
      placement: {
        include: {
          industry: true,
        },
      },
    },
  });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'SISWA') {
      return NextResponse.json({ error: 'Unauthorized - Hanya Siswa yang diizinkan' }, { status: 401 });
    }

    const student = await findStudentWithPlacement(session);
    if (!student) {
      return NextResponse.json({ error: 'Data siswa tidak ditemukan' }, { status: 404 });
    }

    const hasSuratPenarikan = isSuratPenarikanPublished(student.placement);

    return NextResponse.json({
      success: true,
      hasSuratPenarikan,
      data: {
        student: {
          id: student.id,
          nis: student.nis,
          name: student.name,
          className: student.className,
          department: student.department,
        },
        placement: student.placement,
      },
    });
  } catch (error: any) {
    console.error('Error GET /api/students/sertifikat:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data sertifikat' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'SISWA') {
      return NextResponse.json({ error: 'Unauthorized - Hanya Siswa yang diizinkan' }, { status: 401 });
    }

    const student = await findStudentWithPlacement(session);
    if (!student || !student.placement) {
      return NextResponse.json({ error: 'Data penempatan PKL siswa tidak ditemukan' }, { status: 404 });
    }

    if (!isSuratPenarikanPublished(student.placement)) {
      return NextResponse.json(
        { error: 'Upload sertifikat hanya tersedia setelah Surat Penarikan PKL diterbitkan.' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const rawType = String(formData.get('sertifikatType') || 'IMAGE').toUpperCase().trim();
    const sertifikatType = rawType === 'PDF' ? 'PDF' : 'IMAGE';

    const rawScore = String(formData.get('nilaiAkhirIndustri') ?? '').trim();
    if (!rawScore) {
      return NextResponse.json({ error: 'Nilai akhir dari industri wajib diisi.' }, { status: 400 });
    }
    const nilaiAkhirIndustri = Number(rawScore.replace(',', '.'));
    if (isNaN(nilaiAkhirIndustri) || nilaiAkhirIndustri < 0 || nilaiAkhirIndustri > 100) {
      return NextResponse.json({ error: 'Nilai akhir industri harus berupa angka antara 0 sampai 100.' }, { status: 400 });
    }

    const safeNis = String(student.nis || student.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const existing = student.placement as any;

    let sertifikatDepanUrl: string | null = existing.sertifikatDepanUrl || null;
    let sertifikatBelakangUrl: string | null = existing.sertifikatBelakangUrl || null;
    let sertifikatPdfUrl: string | null = existing.sertifikatPdfUrl || null;
    let nilaiAkhirFileUrl: string | null = existing.nilaiAkhirFileUrl || null;

    if (sertifikatType === 'IMAGE') {
      const depanFile = formData.get('depanFile') as File | null;
      const belakangFile = formData.get('belakangFile') as File | null;

      if (depanFile && depanFile.size > 0) {
        sertifikatDepanUrl = await saveUploadedFile(depanFile, 'sertifikat_depan', safeNis, ['jpg', 'jpeg', 'png', 'webp'], 'jpg');
      }
      if (belakangFile && belakangFile.size > 0) {
        sertifikatBelakangUrl = await saveUploadedFile(belakangFile, 'sertifikat_belakang', safeNis, ['jpg', 'jpeg', 'png', 'webp'], 'jpg');
      }

      if (!sertifikatDepanUrl || !sertifikatBelakangUrl) {
        return NextResponse.json(
          { error: 'Foto sertifikat bagian depan dan belakang wajib diunggah.' },
          { status: 400 }
        );
      }

      // Bersihkan PDF lama jika beralih ke mode IMAGE
      sertifikatPdfUrl = null;
    } else {
      const pdfFile = formData.get('pdfFile') as File | null;
      if (pdfFile && pdfFile.size > 0) {
        sertifikatPdfUrl = await saveUploadedFile(pdfFile, 'sertifikat', safeNis, ['pdf'], 'pdf');
      }

      if (!sertifikatPdfUrl) {
        return NextResponse.json(
          { error: 'File PDF sertifikat wajib diunggah.' },
          { status: 400 }
        );
      }

      // Bersihkan foto lama jika beralih ke mode PDF
      sertifikatDepanUrl = null;
      sertifikatBelakangUrl = null;
    }

    const nilaiFile = formData.get('nilaiFile') as File | null;
    if (nilaiFile && nilaiFile.size > 0) {
      nilaiAkhirFileUrl = await saveUploadedFile(nilaiFile, 'nilai_akhir', safeNis, ['pdf', 'jpg', 'jpeg', 'png', 'webp'], 'pdf');
    }

    const updatedPlacement = await (db.internshipPlacement as any).update({
      where: { id: student.placement.id },
      data: {
        sertifikatType,
        sertifikatDepanUrl,
        sertifikatBelakangUrl,
        sertifikatPdfUrl,
        nilaiAkhirIndustri,
        nilaiAkhirFileUrl,
        sertifikatUploadedAt: new Date(),
      },
      include: {
        industry: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Sertifikat dan nilai akhir industri berhasil disimpan!',
      data: updatedPlacement,
    });
  } catch (error: any) {
    console.error('Error POST /api/students/sertifikat:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal mengunggah sertifikat & nilai akhir' },
      { status: 500 }
    );
  }
}
