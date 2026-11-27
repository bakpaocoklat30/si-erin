export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

const ALLOWED_CATEGORIES = new Set(['KEGIATAN', 'PENERJUNAN', 'MONITORING', 'PENARIKAN']);

function getImageExtension(file: File): string | null {
  const mime = (file.type || '').toLowerCase();
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';

  const ext = (file.name?.split('.').pop() || '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
  return null;
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

    const photos = student.placement
      ? await (db as any).studentActivityPhoto.findMany({
          where: { placementId: student.placement.id },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const counts = {
      KEGIATAN: photos.filter((p: any) => p.category === 'KEGIATAN').length,
      PENERJUNAN: photos.filter((p: any) => p.category === 'PENERJUNAN').length,
      MONITORING: photos.filter((p: any) => p.category === 'MONITORING').length,
      PENARIKAN: photos.filter((p: any) => p.category === 'PENARIKAN').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student.id,
          nis: student.nis,
          name: student.name,
          className: student.className,
        },
        placement: student.placement,
        photos,
        counts,
        minKegiatanMet: counts.KEGIATAN >= 4,
      },
    });
  } catch (error: any) {
    console.error('Error GET /api/students/foto-kegiatan:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat foto kegiatan' }, { status: 500 });
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
      return NextResponse.json({ error: 'Anda belum memiliki penempatan PKL aktif.' }, { status: 400 });
    }

    const formData = await req.formData();
    const category = String(formData.get('category') || 'KEGIATAN').toUpperCase().trim();
    const caption = String(formData.get('caption') || '').trim() || null;

    if (!ALLOWED_CATEGORIES.has(category)) {
      return NextResponse.json(
        { error: 'Kategori foto tidak valid. Pilih: KEGIATAN, PENERJUNAN, MONITORING, atau PENARIKAN.' },
        { status: 400 }
      );
    }

    const rawFiles = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
    const singleFile = formData.get('file');
    if (rawFiles.length === 0 && singleFile instanceof File && singleFile.size > 0) {
      rawFiles.push(singleFile);
    }

    if (rawFiles.length === 0) {
      return NextResponse.json({ error: 'Pilih minimal satu file foto (JPG/PNG/WEBP).' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'kegiatan-siswa');
    await fs.mkdir(uploadDir, { recursive: true });

    const safeNis = String(student.nis || student.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const createdRecords = [];

    for (let i = 0; i < rawFiles.length; i++) {
      const file = rawFiles[i];
      const ext = getImageExtension(file);
      if (!ext) {
        return NextResponse.json(
          { error: `Format file "${file.name}" tidak didukung. Gunakan JPG, PNG, atau WEBP.` },
          { status: 400 }
        );
      }
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: `Ukuran foto "${file.name}" melebihi batas maksimal 5 MB.` },
          { status: 400 }
        );
      }

      const fileName = `foto_${safeNis}_${category.toLowerCase()}_${Date.now()}_${i}.${ext}`;
      const filePath = path.join(uploadDir, fileName);
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      const photoUrl = `/uploads/kegiatan-siswa/${fileName}`;
      const record = await (db as any).studentActivityPhoto.create({
        data: {
          placementId: student.placement.id,
          category,
          photoUrl,
          caption,
        },
      });
      createdRecords.push(record);
    }

    return NextResponse.json({
      success: true,
      message: `${createdRecords.length} foto berhasil diunggah!`,
      data: createdRecords,
    });
  } catch (error: any) {
    console.error('Error POST /api/students/foto-kegiatan:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengunggah foto kegiatan' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'SISWA') {
      return NextResponse.json({ error: 'Unauthorized - Hanya Siswa yang diizinkan' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID foto wajib disertakan' }, { status: 400 });
    }

    const student = await findStudentWithPlacement(session);
    if (!student || !student.placement) {
      return NextResponse.json({ error: 'Data penempatan siswa tidak ditemukan' }, { status: 404 });
    }

    const existing = await (db as any).studentActivityPhoto.findFirst({
      where: {
        id,
        placementId: student.placement.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Foto tidak ditemukan atau bukan milik Anda' }, { status: 404 });
    }

    await (db as any).studentActivityPhoto.delete({ where: { id } });

    if (existing.photoUrl && existing.photoUrl.startsWith('/uploads/kegiatan-siswa/')) {
      const diskPath = path.join(process.cwd(), 'public', existing.photoUrl.replace(/^\/+/, ''));
      await fs.unlink(diskPath).catch(() => {});
    }

    return NextResponse.json({ success: true, message: 'Foto berhasil dihapus.' });
  } catch (error: any) {
    console.error('Error DELETE /api/students/foto-kegiatan:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus foto' }, { status: 500 });
  }
}
