// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Menambahkan Triple-Layer Security Guard pada endpoint `/api/init` untuk mencegah pengaksesan tanpa izin di lingkungan Production.
// ✨ Fitur Baru: Secret Key Verification, Development-Only Environment Guard, & Database Lock Mechanism.
// 🔧 Bug Fix: Mengeliminasi celah keamanan penimpaan password akun utama oleh pihak tidak dikenal.
// 🚀 Inovasi: Enterprise Zero-Trust Initializer Protection.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    // 🛡️ LAYER 1: PROTEKSI PRODUKSI
    // Di lingkungan produksi, endpoint ini wajib dikunci mati agar tidak disalahgunakan untuk reset akun
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { 
          error: 'Akses Ditolak! Endpoint inisialisasi dinonaktifkan di lingkungan produksi untuk mencegah pengambilalihan akun. Silakan gunakan CLI: npm run prisma:seed' 
        }, 
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const secretKeyParam = searchParams.get('secret');

    // 🛡️ LAYER 2: VALIDASI SECRET KEY
    const envSecretKey = process.env.INIT_SECRET_KEY;
    if (envSecretKey && secretKeyParam !== envSecretKey) {
      return NextResponse.json(
        { error: 'Akses Ditolak! Secret key tidak valid.' }, 
        { status: 403 }
      );
    }

    const prisma = db as any;

    // 🛡️ LAYER 3: DATABASE LOCK MECHANISM (Cek Apakah Admin Sudah Ada)
    const existingAdmin = await db.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (existingAdmin) {
      return NextResponse.json(
        { 
          error: 'Sistem telah di-inisialisasi sebelumnya! Eksekusi ditolak untuk melindungi akun dan data existing.',
          status: 'LOCKED'
        }, 
        { status: 400 }
      );
    }

    // 1. Inisialisasi Settings Sekolah (SMKN 1 Adiwerna)
    let schoolSetting = null;
    if (prisma.schoolSetting) {
      const existingSetting = await prisma.schoolSetting.findFirst();
      if (!existingSetting) {
        schoolSetting = await prisma.schoolSetting.create({
          data: {
            name: 'SMK Negeri 1 Adiwerna',
            shortName: 'SMKN 1 Adiwerna',
            logoUrl: '/images/logo-sekolah.png',
            address: 'Jl. Raya Adiwerna No. 15, Kabupaten Tegal',
            phone: '(0283) 442192',
            email: 'info@smkn1adiwerna.sch.id',
            headmaster: 'Drs. Joko Purnomo, M.Pd.',
            headmasterNip: '196805121994031004',
            accreditation: 'A (Unggul)'
          }
        });
      } else {
        schoolSetting = existingSetting;
      }
    }

    // Hash Passwords Standard
    const adminPassword = await bcrypt.hash('admin123', 10);
    const pokjaPassword = await bcrypt.hash('pokja123', 10);
    const pembimbingPassword = await bcrypt.hash('guru123', 10);
    const siswaPassword = await bcrypt.hash('siswa123', 10);

    // 2. Akun ADMIN
    const adminUser = await db.user.upsert({
      where: { username: 'admin' },
      update: { password: adminPassword },
      create: {
        username: 'admin',
        name: 'Administrator SI-ERIN',
        password: adminPassword,
        role: 'ADMIN',
        department: 'Teknik Komputer dan Jaringan',
        phone: '081234567890'
      }
    });

    // 3. Akun POKJA
    const pokjaUser = await db.user.upsert({
      where: { username: 'pokja' },
      update: { password: pokjaPassword },
      create: {
        username: 'pokja',
        name: 'Tim Pokja Prakerin',
        password: pokjaPassword,
        role: 'POKJA',
        department: 'Humas & Hubin',
        phone: '081234567891'
      }
    });

    // 4. Akun PEMBIMBING
    const pembimbingUser = await db.user.upsert({
      where: { username: 'pembimbing' },
      update: { password: pembimbingPass },
      create: {
        username: 'pembimbing',
        name: 'Budi Santoso, S.Kom. (Pembimbing)',
        password: pembimbingPassword,
        role: 'PEMBIMBING',
        department: 'Teknik Komputer dan Jaringan',
        phone: '081234567892'
      }
    });

    // 5. Akun SISWA & Profile Student
    const siswaUser = await db.user.upsert({
      where: { username: '1' },
      update: { password: siswaPassword },
      create: {
        username: '1',
        name: 'Siswa 1',
        password: siswaPassword,
        role: 'SISWA',
        department: 'Teknik Komputer dan Jaringan',
        phone: '081234567893'
      }
    });

    // Upsert Profil Student untuk Siswa 1
    const studentProfile = await db.student.upsert({
      where: { nis: '1' },
      update: {
        userId: siswaUser.id,
        teacherId: pembimbingUser.id,
        isAllowedPkl: true
      },
      create: {
        userId: siswaUser.id,
        nis: '1',
        nisn: '0051234567',
        name: 'Siswa 1',
        className: 'XII TKJ 1',
        department: 'Teknik Komputer dan Jaringan',
        phone: '081234567893',
        parentName: 'Orang Tua Siswa 1',
        parentRelation: 'Ayah',
        parentPhone: '081234567899',
        isAllowedPkl: true,
        teacherId: pembimbingUser.id
      }
    });

    return NextResponse.json({
      success: true,
      message: '🎉 Inisialisasi Akun & Setting Berhasil!',
      createdUsers: ['admin', 'pokja', 'pembimbing', '1'],
      schoolSetting
    });

  } catch (error: any) {
    console.error('Error Initializing Database:', error);
    return NextResponse.json({
      error: error.message || 'Gagal melakukan inisialisasi database.'
    }, { status: 500 });
  }
}