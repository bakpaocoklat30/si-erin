// 📋 CHANGELOG:
// ✅ Perubahan: Menghapus penyimpanan fallback in-memory dan mengarahkan penyimpanan payload `activeIndustries` langsung ke kolom `Json` native di database PostgreSQL via Prisma.
// ✨ Fitur Baru: Native Database JSON Persistence for Industry Quotas.
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Mengatasi data industri dan kuota yang ter-reset/hilang setiap kali halaman direfresh.
// 🚀 Inovasi: Enterprise True-Persistence Storage Pipeline.

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

    let periods: any[] = [];
    try {
      periods = await (db as any).internshipPeriod.findMany({
        orderBy: { createdAt: 'desc' }
      });
      
      // Karena sekarang activeIndustries adalah tipe Json di skema, Prisma akan otomatis mengembalikannya sebagai array/object
      periods = periods.map(p => ({
        ...p,
        activeIndustries: p.activeIndustries || []
      }));
    } catch (e) {
      console.error('Error fetching periods:', e);
      periods = [];
    }

    let allIndustries: any[] = [];
    try {
      allIndustries = await db.industry.findMany({ select: { id: true, name: true, address: true } });
    } catch (e) {
      console.error('Error fetching industries:', e);
      allIndustries = [];
    }

    return NextResponse.json({ success: true, data: periods, industries: allIndustries });
  } catch (error) {
    console.error('Fatal error GET periods:', error);
    return NextResponse.json({ error: 'Gagal memuat data periode PKL' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, startDate, endDate, isActive, activeIndustries, department } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: 'Nama periode, tanggal mulai, dan tanggal selesai wajib diisi' }, { status: 400 });
    }

    let newPeriod;
    try {
      // Data disimpan LANGSUNG ke database tanpa fallback memory
      newPeriod = await (db as any).internshipPeriod.create({
        data: {
          name: name.trim(),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          department: department || 'Semua Jurusan',
          isActive: Boolean(isActive),
          activeIndustries: activeIndustries || [] // Masuk secara permanen ke kolom Json
        }
      });
    } catch (e: any) {
      console.error('Prisma create period error:', e);
      return NextResponse.json({ error: e.message || 'Gagal menyimpan ke database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Periode PKL dan kuota berhasil disimpan permanen!', data: newPeriod });
  } catch (error: any) {
    console.error('Error POST period:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat periode PKL' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, startDate, endDate, isActive, activeIndustries, department } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID periode tidak valid' }, { status: 400 });
    }

    let updated;
    try {
      const updateData: any = {};
      if (name) updateData.name = name.trim();
      if (startDate) updateData.startDate = new Date(startDate);
      if (endDate) updateData.endDate = new Date(endDate);
      if (department) updateData.department = department;
      if (typeof isActive === 'boolean') updateData.isActive = isActive;
      if (activeIndustries !== undefined) updateData.activeIndustries = activeIndustries; // Masuk permanen ke kolom Json

      updated = await (db as any).internshipPeriod.update({
        where: { id },
        data: updateData
      });
    } catch (e: any) {
      console.error('Prisma update period error:', e);
      return NextResponse.json({ error: e.message || 'Gagal memperbarui ke database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Pengaturan periode dan kuota berhasil diperbarui permanen!', data: updated });
  } catch (error: any) {
    console.error('Error PUT period:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui periode PKL' }, { status: 500 });
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
      return NextResponse.json({ error: 'ID periode tidak valid' }, { status: 400 });
    }

    try {
      await (db as any).internshipPeriod.delete({ where: { id } });
    } catch (e: any) {
      console.error('Prisma delete period error:', e);
      return NextResponse.json({ error: 'Gagal menghapus di database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Periode PKL berhasil dihapus!' });
  } catch (error) {
    console.error('Error DELETE period:', error);
    return NextResponse.json({ error: 'Gagal menghapus periode PKL' }, { status: 500 });
  }
}