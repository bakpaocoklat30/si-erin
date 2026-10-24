// 📋 CHANGELOG:
// ✅ Perubahan: Pembuatan endpoint API seeder otomatis untuk mendaftarkan akun default (Admin, Pokja, Siswa) ke database PostgreSQL
// ✨ Fitur Baru: Otomatisasi enkripsi password menggunakan bcryptjs dan pencegahan duplikasi akun
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Menyelesaikan masalah akun tidak ditemukan saat login akibat tabel User yang kosong
// 🚀 Inovasi: Instant database seeding endpoint untuk kemudahan deployment awal SI-Erin

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    // 🛡️ Proteksi Keamanan: Nonaktifkan seeder di lingkungan produksi
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        error: 'Endpoint seeder dinonaktifkan di lingkungan produksi untuk keamanan data. Silakan gunakan CLI: npm run prisma:seed'
      }, { status: 403 });
    }

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Data akun default yang akan dimasukkan ke database jika belum ada
    const defaultUsers = [
      {
        name: 'Administrator SI-Erin',
        username: 'admin',
        password: hashedPassword,
        role: 'ADMIN' as const,
      },
      {
        name: 'Tim Pokja Prakerin',
        username: 'pokja',
        password: hashedPassword,
        role: 'POKJA' as const,
      },
      {
        name: 'Ahmad Fauzi',
        username: 'siswa',
        password: hashedPassword,
        role: 'SISWA' as const,
      },
    ];

    let createdCount = 0;

    for (const userData of defaultUsers) {
      const existingUser = await db.user.findUnique({
        where: { username: userData.username },
      });

      if (!existingUser) {
        await db.user.create({
          data: userData,
        });
        createdCount++;
      }
    }

    // Pastikan juga data siswa terdaftar di tabel Student untuk relasi profil & pengajuan
    const existingStudent = await db.student.findFirst({
      where: { nis: '20261001' },
    });

    if (!existingStudent) {
      await db.student.create({
        data: {
          nis: '20261001',
          name: 'Ahmad Fauzi',
          className: 'XII TKJ 1',
          department: 'Teknik Komputer dan Jaringan',
          phone: '081234567890',
        },
      });
    }

    return NextResponse.json({
      message: `Database seeding selesai. ${createdCount} akun baru ditambahkan.`,
    }, { status: 200 });

  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json({ error: 'Gagal melakukan seeding database.' }, { status: 500 });
  }
}