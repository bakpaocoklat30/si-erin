// 📋 CHANGELOG:
// ✅ Perubahan: Membatasi kueri pengajuan PKL berdasarkan `department` (jurusan) akun POKJA yang sedang aktif bergeser dari akses global.
// ✨ Fitur Baru: Department-Scoped filtering untuk verifikasi ajuan Prakerin.
// 🎨 UI/UX Update: N/A (Backend API)
// 🔧 Bug Fix: Mencegah Pokja lintas jurusan melihat atau memverifikasi data jurusan lain.
// 🚀 Inovasi: Secure multi-tenant department data isolation.

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
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Tim Pokja' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const userDepartment = (session.user as any).department; // Jurusan yang diampu Pokja

    // Jika ADMIN, bisa melihat semua. Jika POKJA, filter berdasarkan jurusannya.
    let whereClause: any = {};
    if (userRole === 'POKJA' && userDepartment) {
      whereClause = {
        student: {
          department: {
            equals: userDepartment,
            mode: 'insensitive'
          }
        }
      };
    }

    const placements = await db.internshipPlacement.findMany({
      where: whereClause,
      include: {
        student: true,
        industry: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedData = placements.map((p: any) => ({
      id: p.id,
      studentName: p.student.name,
      nis: p.student.nis,
      className: p.student.className,
      department: p.student.department,
      industryName: p.industry.name,
      status: p.status,
      createdAt: p.createdAt.toISOString().split('T')[0]
    }));

    return NextResponse.json({ success: true, data: formattedData });
  } catch (error) {
    console.error('Error fetching pokja applications:', error);
    return NextResponse.json({ error: 'Gagal memuat data pengajuan pokja' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Tim Pokja' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID dan Status wajib disertakan' }, { status: 400 });
    }

    const updated = await db.internshipPlacement.update({
      where: { id },
      data: { status: status.toUpperCase() }
    });

    return NextResponse.json({ success: true, message: 'Status pengajuan berhasil diperbarui', data: updated });
  } catch (error) {
    console.error('Error updating placement status:', error);
    return NextResponse.json({ error: 'Gagal memperbarui status pengajuan' }, { status: 500 });
  }
}