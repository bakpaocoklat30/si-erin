// 📋 CHANGELOG:
// ✅ Perubahan: Pembuatan API endpoint real-time untuk GET (status pengajuan siswa) dan POST (kirim pengajuan baru)
// ✨ Fitur Baru: Integrasi langsung dengan Prisma ORM untuk tabel InternshipPlacement dan Industry
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Validasi ketat sisa kuota industri sebelum pengajuan disimpan berstatus PENDING
// 🚀 Inovasi: Algoritma pengecekan duplikasi pengajuan dan manajemen state database yang aman

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized - Silakan login terlebih dahulu.' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Cari data siswa berdasarkan user yang sedang login (asumsi relasi atau pencocokan ID/username)
    // Jika user bertindak langsung sebagai data student, sesuaikan query berikut:
    const student = await db.student.findFirst({
      where: {
        OR: [
          { id: userId },
          { nis: (session.user as any).username }
        ]
      },
      include: {
        placement: {
          include: {
            industry: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ pengajuanAktif: null }, { status: 200 });
    }

    return NextResponse.json({
      studentId: student.id,
      pengajuanAktif: student.placement ? {
        id: student.placement.id,
        status: student.placement.status,
        cvUrl: null,
        suratPengantarUrl: null,
        suratBalasanUrl: null,
        industri: {
          nama: student.placement.industry.name,
          alamat: student.placement.industry.address,
        },
        createdAt: student.placement.createdAt,
      } : null,
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching student application:', error);
    return NextResponse.json({ error: 'Gagal mengambil data pengajuan siswa.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized - Silakan login terlebih dahulu.' }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, industryId } = body;

    if (!studentId || !industryId) {
      return NextResponse.json({ error: 'ID Siswa dan Industri wajib diisi.' }, { status: 400 });
    }

    // Periksa kuota industri tujuan
    const industry = await db.industry.findUnique({
      where: { id: industryId },
      include: {
        _count: {
          select: { placements: { where: { status: 'ACCEPTED' } } },
        },
      },
    });

    if (!industry) {
      return NextResponse.json({ error: 'Industri tujuan tidak ditemukan.' }, { status: 404 });
    }

    if (industry._count.placements >= industry.totalQuota) {
      return NextResponse.json({ error: 'Mohon maaf, kuota penempatan untuk industri ini sudah penuh.' }, { status: 400 });
    }

    // Cek apakah sudah ada penempatan sebelumnya
    const existingPlacement = await db.internshipPlacement.findUnique({
      where: { studentId },
    });

    let placement;
    if (existingPlacement) {
      if (existingPlacement.status === 'ACCEPTED') {
        return NextResponse.json({ error: 'Anda sudah diterima di industri mitra, tidak dapat mengubah pengajuan.' }, { status: 400 });
      }

      placement = await db.internshipPlacement.update({
        where: { studentId },
        data: {
          industryId,
          status: 'PENDING',
        },
      });
    } else {
      placement = await db.internshipPlacement.create({
        data: {
          studentId,
          industryId,
          status: 'PENDING',
        },
      });
    }

    return NextResponse.json({
      message: 'Pengajuan tempat Prakerin berhasil dikirim dan menunggu verifikasi Pokja!',
      placement,
    }, { status: 201 });

  } catch (error) {
    console.error('Error submitting application:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server saat mengirim pengajuan.' }, { status: 500 });
  }
}