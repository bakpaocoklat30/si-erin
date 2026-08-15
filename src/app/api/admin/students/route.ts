// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Menyertakan relasi `teacher` dan `placement.industry` pada method GET siswa agar status pembimbing aktif siswa terbaca dengan sempurna.
// ✨ Fitur القاعدة: Complete Student Mentorship & Placement Relation Pipeline.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

// MENGAMBIL DATA SISWA (GET)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA', 'PEMBIMBING'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classNameParam = searchParams.get('className');

    let whereClause: any = {};
    if (classNameParam) {
      whereClause.className = {
        equals: classNameParam.trim(),
        mode: 'insensitive'
      };
    }

    const students = await db.student.findMany({
      where: whereClause,
      include: {
        teacher: {
          select: { id: true, name: true, username: true }
        },
        placement: {
          include: {
            industry: {
              select: { id: true, name: true, sector: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ success: true, data: students, students });
  } catch (error: any) {
    console.error('API GET Students Error:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data siswa' }, { status: 500 });
  }
}

// MENYIMPAN DATA SISWA BARU (POST)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Admin & Pokja' }, { status: 401 });
    }

    const body = await request.json();
    const { name, nis, className, department, phone, email } = body;

    if (!name || !nis || !className) {
      return NextResponse.json({ error: 'Nama, NIS, dan Kelas wajib diisi' }, { status: 400 });
    }

    // Cek duplikat NIS
    const existingStudent = await db.student.findFirst({
      where: { nis: nis.trim() }
    });

    if (existingStudent) {
      return NextResponse.json({ error: 'NIS siswa tersebut sudah terdaftar di sistem' }, { status: 400 });
    }

    const newStudent = await db.student.create({
      data: {
        name: name.trim(),
        nis: nis.trim(),
        className: className.trim(),
        department: department ? department.trim() : 'Teknik Komputer dan Jaringan',
        phone: phone ? phone.trim() : '-',
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Data siswa berhasil disimpan', 
      data: newStudent 
    });

  } catch (error: any) {
    console.error('API POST Student Error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Data NIS atau email sudah terdaftar (Duplikat)' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Gagal menyimpan data siswa' }, { status: 500 });
  }
}

// MENGHAPUS DATA SISWA (DELETE)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID siswa tidak valid' }, { status: 400 });
    }

    await db.student.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Data siswa berhasil dihapus' });
  } catch (error: any) {
    console.error('API DELETE Student Error:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus data siswa' }, { status: 500 });
  }
}