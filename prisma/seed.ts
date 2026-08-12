// 📋 CHANGELOG:
// ✅ Perubahan: Mengimplementasikan seeder presisi dengan pembersihan kaskade lengkap, password seragam 'pakar123', serta akun Admin, Pokja, Pembimbing, dan Siswa.
// ✨ Fitur Baru: Preserved Credentials & Single Source of Truth Student Profile Binding.
// 🎨 UI/UX Update: N/A (Database Seeder Script)
// 🔧 Bug Fix: Mencegah duplicate constraint violation dengan urutan deleteMany yang terstruktur.
// 🚀 Inovasi: Clean Slate Cascade Reset & Single Source of Truth Data Insertion.

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai proses seeding database SI-ERIN...');

  // 1. Pembersihan Data Lama (Menghindari Duplicate Constraint Violation)
  await prisma.internshipPlacement.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.industry.deleteMany({});
  await prisma.industryCategory.deleteMany({});
  await prisma.classRoom.deleteMany({});
  await prisma.internshipPeriod.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.academicYear.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('🧹 Database lama berhasil dibersihkan.');

  // 2. Hash Password Seragam (Password: pakar123)
  const UNIFORM_PASSWORD = await bcrypt.hash('pakar123', 10);

  // 3. Seeding User Accounts (Setiap Role)
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      name: 'Administrator Utama',
      password: UNIFORM_PASSWORD,
      role: 'ADMIN',
      department: 'HUBIN',
      phone: '081234567890',
    },
  });

  const pokjaUser = await prisma.user.create({
    data: {
      username: 'pokja',
      name: 'Ketua Pokja Prakerin',
      password: UNIFORM_PASSWORD,
      role: 'POKJA',
      department: 'POKJA PKL',
      phone: '081234567891',
    },
  });

  const pembimbingUser = await prisma.user.create({
    data: {
      username: 'pembimbing',
      name: 'Budi Santoso, S.T.',
      password: UNIFORM_PASSWORD,
      role: 'PEMBIMBING',
      department: 'Teknik Komputer dan Jaringan',
      phone: '081234567892',
    },
  });

  // User Akun Siswa Utama
  const siswaUser = await prisma.user.create({
    data: {
      username: 'siswa',
      name: 'Ahmad Rizky Pratama',
      password: UNIFORM_PASSWORD,
      role: 'SISWA',
      department: 'Teknik Komputer dan Jaringan',
      phone: '081234567893',
    },
  });

  console.log('✅ Data User berhasil disuntikkan.');

  // 4. Seeding Academic Year
  await prisma.academicYear.create({
    data: {
      year: '2026/2027',
      isActive: true,
    },
  });

  // 5. Seeding Departments
  await prisma.department.create({
    data: {
      code: 'TKJ',
      name: 'Teknik Komputer dan Jaringan',
    },
  });

  await prisma.department.create({
    data: {
      code: 'RPL',
      name: 'Rekayasa Perangkat Lunak',
    },
  });

  // 6. Seeding Industry Category
  await prisma.industryCategory.create({
    data: {
      name: 'Teknologi Informasi & Digital',
      description: 'Perusahaan software house, ISP, dan konsultan IT',
    },
  });

  // 7. Seeding Industry / DUDI Dapodik
  await prisma.industry.create({
    data: {
      name: 'PT Solusi Teknologi Nusantara',
      nib: '9120101234567',
      sector: 'Perangkat Lunak & Cloud',
      npwp: '01.234.567.8-012.000',
      logoUrl: 'https://placehold.co/150x150/0f172a/ffffff.png?text=STN',
      address: 'Jl. Merdeka No. 45',
      rt: '02',
      rw: '05',
      dusun: 'Kliwon',
      desaKelurahan: 'Adiwerna',
      subDistrict: 'Adiwerna',
      postalCode: '52194',
      latitude: '-6.923412',
      longitude: '109.123845',
      contactPerson: 'Hendra Setiawan (HRD)',
      phone: '0283619283',
      fax: '0283619284',
      email: 'hrd@solusitek.co.id',
      website: 'https://solusitek.co.id',
      totalQuota: 5,
    },
  });

  // 8. Seeding Student Profile Terikat Langsung ke User Siswa (Single Source of Truth)
  await prisma.student.create({
    data: {
      userId: siswaUser.id,
      nis: '22231001',
      nisn: '0051234567',
      name: 'Ahmad Rizky Pratama',
      className: 'XII TKJ 1',
      department: 'Teknik Komputer dan Jaringan',
      phone: '081234567893',
      parentName: 'Suryanto',
      parentRelation: 'Ayah Kandung',
      parentPhone: '081298765432',
      bpjsStatus: 'BELUM_UPLOAD',
      cvStatus: 'BELUM_UPLOAD',
      isAllowedPkl: true,
    },
  });

  console.log('✅ Student Profile berhasil terhubung ke User dengan Cascade Delete.');

  console.log('\n==================================================');
  console.log('🚀 SEEDING DATABASE SI-ERIN SUKSES 100%!');
  console.log('==================================================');
  console.table([
    { Username: adminUser.username, Role: adminUser.role, Password: 'pakar123' },
    { Username: pokjaUser.username, Role: pokjaUser.role, Password: 'pakar123' },
    { Username: pembimbingUser.username, Role: pembimbingUser.role, Password: 'pakar123' },
    { Username: siswaUser.username, Role: siswaUser.role, Password: 'pakar123' },
  ]);
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });