// 📋 CHANGELOG:
// ✅ Perubahan: Menyediakan REST API GET bagi siswa untuk mengambil daftar anggota teman satu kelompok penempatan di DUDI & Periode yang sama, beserta status Surat Tugas Resmi.
// ✨ Fitur Baru: Student Peer Group Data Provider API Engine.
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Mengamankan pembacaan kelompok agar siswa hanya bisa melihat anggota kelompok di DUDI yang sama dengannya.
// 🚀 Inovasi: Enterprise Student Group Co-Worker API.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'SISWA') {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Siswa' }, { status: 401 });
    }

    const nis = (session.user as any)?.username;
    if (!nis) {
      return NextResponse.json({ error: 'Identitas NIS siswa tidak ditemukan' }, { status: 400 });
    }

    // 1. Ambil penempatan aktif siswa saat ini
    const currentStudent = await db.student.findUnique({
      where: { nis: nis.trim() },
      include: {
        placement: {
          include: { industry: true }
        }
      }
    });

    if (!currentStudent || !currentStudent.placement) {
      return NextResponse.json({
        success: true,
        hasPlacement: false,
        message: 'Anda belum mengajukan atau belum memiliki kelompok tempat PKL.'
      });
    }

    const industryId = currentStudent.placement.industryId;

    // 2. Cari seluruh siswa yang memiliki penempatan di industri yang sama
    const groupPlacements = await db.internshipPlacement.findMany({
      where: {
        industryId: industryId,
        status: { in: ['PEMBUATAN_SURAT', 'SURAT_DITERBITKAN', 'KIRIM_SURAT', 'DISETUJUI_INDUSTRI'] }
      },
      include: {
        student: true,
        industry: true
      },
      orderBy: { student: { name: 'asc' } }
    });

    const peers = groupPlacements.map(p => ({
      id: p.student.id,
      nis: p.student.nis,
      name: p.student.name,
      className: p.student.className,
      department: p.student.department,
      phone: p.student.phone,
      isSelf: p.student.nis === currentStudent.nis
    }));

    return NextResponse.json({
      success: true,
      hasPlacement: true,
      data: {
        industry: currentStudent.placement.industry,
        suratTugasUrl: currentStudent.placement.suratTugasUrl,
        suratBalasanUrl: currentStudent.placement.suratBalasanUrl,
        status: currentStudent.placement.status,
        peers: peers
      }
    });

  } catch (error: any) {
    console.error('Error fetching student group peers:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat teman kelompok' }, { status: 500 });
  }
}