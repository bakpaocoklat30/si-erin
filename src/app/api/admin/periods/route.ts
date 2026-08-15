// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Mendukung relasi academicYearId dan multi-active toggle status periode PKL.
// ✨ Fitur Baru: Multi-Active Period Management & Academic Year Integration.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA', 'PEMBIMBING'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const periods = await db.internshipPeriod.findMany({
      include: { classes: true, academicYear: true },
      orderBy: { startDate: 'desc' }
    });

    return NextResponse.json({ success: true, periods });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat data periode' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Hanya Administrator yang berhak.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, startDate, endDate, academicYearId, department, isActive, activeIndustries } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: 'Nama periode, tanggal mulai, dan tanggal selesai wajib diisi' }, { status: 400 });
    }

    const newPeriod = await db.internshipPeriod.create({
      data: {
        name: name.trim(),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        academicYearId: academicYearId || null,
        department: department || 'ALL',
        isActive: Boolean(isActive),
        activeIndustries: activeIndustries || []
      },
      include: { academicYear: true }
    });

    return NextResponse.json({ success: true, message: 'Periode PKL berhasil ditambahkan', data: newPeriod });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menyimpan periode PKL' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Hanya Administrator yang berhak.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, startDate, endDate, academicYearId, department, isActive, activeIndustries } = body;

    if (!id || !name || !startDate || !endDate) {
      return NextResponse.json({ error: 'ID, nama, dan rentang tanggal wajib diisi' }, { status: 400 });
    }

    const updatedPeriod = await db.internshipPeriod.update({
      where: { id },
      data: {
        name: name.trim(),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        academicYearId: academicYearId || null,
        department: department || 'ALL',
        isActive: Boolean(isActive),
        ...(activeIndustries ? { activeIndustries } : {})
      },
      include: { academicYear: true }
    });

    return NextResponse.json({ success: true, message: 'Periode PKL berhasil diperbarui', data: updatedPeriod });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memperbarui periode PKL' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Hanya Administrator yang berhak.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID Periode tidak valid' }, { status: 400 });
    }

    await db.internshipPeriod.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Periode PKL berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menghapus periode' }, { status: 500 });
  }
}