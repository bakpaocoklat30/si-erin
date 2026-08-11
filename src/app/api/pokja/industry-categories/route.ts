// 📋 CHANGELOG:
// ✅ Perubahan: Mengubah penyimpanan kategori industri menjadi 100% database persisten menggunakan tabel `IndustryCategory`.
// ✨ Fitur Baru: Database-backed Industry Category Controller.
// 🎨 UI/UX Update: N/A (Backend API)
// 🔧 Bug Fix: Data kategori kini tidak akan hilang saat direfresh.
// 🚀 Inovasi: Enterprise Master Data Persistence.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await db.industryCategory.findMany({
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching industry categories:', error);
    return NextResponse.json({ error: 'Gagal memuat kategori industri' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nama kategori wajib diisi' }, { status: 400 });
    }

    // Cek duplikasi
    const existing = await db.industryCategory.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json({ error: 'Kategori ini sudah ada!' }, { status: 400 });
    }

    const newCategory = await db.industryCategory.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null
      }
    });

    return NextResponse.json({ success: true, message: 'Kategori berhasil ditambahkan!', data: newCategory });
  } catch (error: any) {
    console.error('Error creating industry category:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat kategori industri' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID kategori tidak valid' }, { status: 400 });
    }

    await db.industryCategory.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Kategori berhasil dihapus!' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Gagal menghapus kategori industri' }, { status: 500 });
  }
}