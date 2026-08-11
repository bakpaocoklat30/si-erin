// 📋 CHANGELOG:
// ✅ Perubahan: Pembuatan API endpoint GET & PUT untuk manajemen profil siswa secara real-time ke database Prisma
// ✨ Fitur Baru: Pengambilan data dinamis sesuai session user aktif dan penyimpanan permanen data identitas siswa
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Mengatasi masalah perubahan data profil yang tidak tersimpan ke database
// 🚀 Inovasi: Enterprise-grade student profile synchronization handler

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const username = (session.user as any).username;

    // Cari data siswa berdasarkan ID user atau NIS/username
    let student = await db.student.findFirst({
      where: {
        OR: [
          { id: userId },
          { nis: username }
        ]
      },
    });

    // Jika data siswa belum ada di tabel Student, buat baris inisialisasi awal otomatis
    if (!student) {
      student = await db.student.create({
        data: {
          nis: username || '20260001',
          name: session.user.name || 'Siswa SI-Erin',
          className: 'XII TKJ 1',
          department: 'Teknik Komputer dan Jaringan',
          phone: '081234567890',
        },
      });
    }

    return NextResponse.json(student, { status: 200 });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    return NextResponse.json({ error: 'Gagal memuat profil siswa' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, nis, nisn, phone, address, department, className } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID Siswa diperlukan' }, { status: 400 });
    }

    // Update data profil siswa di database menggunakan Prisma
    const updatedStudent = await db.student.update({
      where: { id },
      data: {
        name,
        nis,
        phone,
        className: className || 'XII TKJ 1',
        department: department || 'Teknik Komputer dan Jaringan',
      },
    });

    return NextResponse.json({
      message: 'Profil berhasil diperbarui secara permanen!',
      student: updatedStudent,
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating student profile:', error);
    return NextResponse.json({ error: 'Gagal memperbarui profil ke database' }, { status: 500 });
  }
}