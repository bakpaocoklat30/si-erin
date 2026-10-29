// 📋 CHANGELOG:
// ✅ Perubahan: Mengkonsolidasi seluruh handler CRUD (`GET`, `POST`, `PUT`, `DELETE`) dan menambahkan validasi ketat agar kolom `department` wajib diisi saat tambah/edit data siswa.
// ✨ Fitur Baru: Complete Payload Carrier (CV & BPJS Live Preview Data) & Mandatory Department Integrity Pipeline.
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Mengembalikan handler `POST` dan `DELETE` yang terpisah sambil mempertahankan dukungan modal detail & live preview berkas Pokja.
// 🚀 Inovasi: Enterprise Resilient Dual-Table Sync & CRUD API Engine.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

function expandDepartmentTerms(deptName: string): string[] {
  const terms = new Set<string>();
  if (!deptName) return [];
  
  const clean = deptName.trim();
  terms.add(clean);
  const lower = clean.toLowerCase();

  // Rumpun Otomotif (TKR, TKRO, TBSM, TSM, TBO, Otomotif)
  if (
    lower.includes('otomotif') || 
    lower.includes('tkr') || 
    lower.includes('kendaraan') || 
    lower.includes('sepeda motor') || 
    lower.includes('tbsm') || 
    lower.includes('tsm')
  ) {
    terms.add('Otomotif');
    terms.add('Teknik Otomotif');
    terms.add('Teknik Kendaraan Ringan');
    terms.add('Teknik Kendaraan Ringan Otomotif');
    terms.add('TKR');
    terms.add('TKRO');
    terms.add('Teknik dan Bisnis Sepeda Motor');
    terms.add('TBSM');
    terms.add('TSM');
    terms.add('Sepeda Motor');
  }

  // Rumpun TKJ / Informatika
  if (
    lower.includes('tkj') || 
    lower.includes('komputer') || 
    lower.includes('jaringan') || 
    lower.includes('tjkt')
  ) {
    terms.add('TKJ');
    terms.add('TJKT');
    terms.add('Teknik Komputer dan Jaringan');
    terms.add('Teknik Komputer Dan Jaringan');
    terms.add('Teknik Jaringan Komputer & Telekomunikasi');
    terms.add('Teknik Jaringan Komputer dan Telekomunikasi');
  }

  // Rumpun RPL
  if (
    lower.includes('rpl') || 
    lower.includes('perangkat lunak') || 
    lower.includes('pplg')
  ) {
    terms.add('RPL');
    terms.add('PPLG');
    terms.add('Rekayasa Perangkat Lunak');
    terms.add('Pengembangan Perangkat Lunak dan Gim');
  }

  // Rumpun Mesin
  if (lower.includes('mesin') || lower.includes('tpm')) {
    terms.add('Mesin');
    terms.add('Teknik Pemesinan');
    terms.add('TPM');
  }

  // Rumpun Listrik / Elektro
  if (lower.includes('listrik') || lower.includes('titl') || lower.includes('elektro')) {
    terms.add('TITL');
    terms.add('Teknik Instalasi Tenaga Listrik');
    terms.add('Teknik Ketenagalistrikan');
  }

  // Rumpun Pengelasan
  if (lower.includes('las') || lower.includes('pengelasan') || lower.includes('tpl')) {
    terms.add('Teknik Pengelasan');
    terms.add('TPL');
    terms.add('Las');
  }

  return Array.from(terms);
}

// 1. GET: Ambil Seluruh Data Siswa Sesuai Scope Jurusan Pokja
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();
    const isPokja = ['POKJA', 'TIM_POKJA'].includes(userRole);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

    if (!session || (!isPokja && !isAdmin)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    let userDepartment = (session.user as any)?.department;
    const userName = (session.user as any)?.name || '';

    // Safety fallback jika nama user mengandung kata kunci jurusan
    if (!userDepartment || userDepartment === 'ALL' || userDepartment.toLowerCase() === 'semua jurusan') {
      if (userName.toLowerCase().includes('otomotif') || userName.toLowerCase().includes('tkr') || userName.toLowerCase().includes('tbsm')) {
        userDepartment = 'Teknik Otomotif';
      } else if (userName.toLowerCase().includes('tkj') || userName.toLowerCase().includes('komputer')) {
        userDepartment = 'Teknik Komputer dan Jaringan';
      }
    }

    // Filter untuk mengecualikan akun pengelola sistem
    let whereClause: any = {
      AND: [
        {
          NOT: {
            OR: [
              { nis: { equals: 'admin', mode: 'insensitive' } },
              { nis: { equals: 'pokja', mode: 'insensitive' } },
              { name: { contains: 'pokja', mode: 'insensitive' } },
              { name: { contains: 'administrator', mode: 'insensitive' } }
            ]
          }
        }
      ]
    };

    // Department scoping khusus Pokja
    if (isPokja && userDepartment && userDepartment.toLowerCase() !== 'semua jurusan' && userDepartment.toUpperCase() !== 'ALL') {
      const deptRecord = await db.department.findFirst({
        where: {
          OR: [
            { name: { contains: userDepartment, mode: 'insensitive' } },
            { code: { equals: userDepartment, mode: 'insensitive' } }
          ]
        }
      });

      const baseTerms = [userDepartment];
      if (deptRecord?.name && !baseTerms.includes(deptRecord.name)) baseTerms.push(deptRecord.name);
      if (deptRecord?.code && !baseTerms.includes(deptRecord.code)) baseTerms.push(deptRecord.code);

      const deptTerms = Array.from(new Set(baseTerms.flatMap(t => expandDepartmentTerms(t))));

      whereClause.AND.push({
        OR: deptTerms.map(term => ({
          department: { contains: term, mode: 'insensitive' as const }
        }))
      });
    }

    // Ambil data siswa murni lengkap dengan relasi penempatan industri & dokumen CV/BPJS
    const students = await db.student.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        userId: true,
        nis: true,
        nisn: true,
        name: true,
        className: true,
        department: true,
        phone: true,
        parentName: true,
        parentRelation: true,
        parentPhone: true,
        bpjsStatus: true,
        cvStatus: true,
        isAllowedPkl: true,
        teacherId: true,
        createdAt: true,
        updatedAt: true,
        placement: {
          select: {
            id: true,
            status: true,
            industryId: true,
            industry: { 
              select: { 
                id: true,
                name: true, 
                address: true, 
                phone: true, 
                contactPerson: true
              } 
            }
          }
        }
      }
    });

    return NextResponse.json({ success: true, data: students });
  } catch (error: any) {
    console.error('Error fetching students for Pokja:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data siswa' }, { status: 500 });
  }
}

// 2. POST: Tambah Siswa Baru dengan Validasi Mandatory Department
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();
    const isPokja = ['POKJA', 'TIM_POKJA'].includes(userRole);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

    if (!session || (!isPokja && !isAdmin)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      nis, 
      nisn, 
      name, 
      className, 
      department, 
      phone, 
      parentName, 
      parentRelation, 
      parentPhone 
    } = body;

    // 🔑 Validasi ketat: NIS, Nama, Kelas, Jurusan, dan Nomor Telepon wajib diisi
    if (!nis || !name || !className || !department || !phone) {
      return NextResponse.json({ 
        error: 'NIS, Nama, Kelas, Jurusan, dan Nomor Telepon wajib diisi secara lengkap' 
      }, { status: 400 });
    }

    const cleanNis = nis.trim();
    const cleanName = name.trim();
    const cleanClass = className.trim();
    const cleanDept = department.trim();
    const cleanPhone = phone.trim();

    const existing = await db.student.findUnique({ where: { nis: cleanNis } });
    if (existing) {
      return NextResponse.json({ error: 'Siswa dengan NIS tersebut sudah terdaftar!' }, { status: 400 });
    }

    // A. Buat Master Data Siswa di tabel Student
    const newStudent = await db.student.create({
      data: {
        nis: cleanNis,
        nisn: nisn ? nisn.trim() : null,
        name: cleanName,
        className: cleanClass,
        department: cleanDept,
        phone: cleanPhone,
        parentName: parentName ? parentName.trim() : null,
        parentRelation: parentRelation ? parentRelation.trim() : null,
        parentPhone: parentPhone ? parentPhone.trim() : null,
        isAllowedPkl: false,
        bpjsStatus: 'BELUM_UPLOAD',
        cvStatus: 'BELUM_UPLOAD'
      }
    });

    // B. Buat/Sinkronkan Akun Login di tabel User (Password default = NIS)
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(cleanNis, 10);

    await db.user.upsert({
      where: { username: cleanNis },
      update: {
        name: cleanName,
        department: cleanDept,
        phone: cleanPhone
      },
      create: {
        username: cleanNis,
        name: cleanName,
        password: hashedPassword,
        role: 'SISWA',
        department: cleanDept,
        phone: cleanPhone
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Data siswa dan akun login berhasil ditambahkan!', 
      data: newStudent 
    });
  } catch (error: any) {
    console.error('Error creating student:', error);
    return NextResponse.json({ error: error.message || 'Gagal menambahkan data siswa' }, { status: 500 });
  }
}

// 3. PUT: Perbarui Data Profil Siswa / Status Izin PKL / Status Dokumen
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();
    const isPokja = ['POKJA', 'TIM_POKJA'].includes(userRole);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

    if (!session || (!isPokja && !isAdmin)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      id, 
      nis, 
      nisn, 
      name, 
      className, 
      department, 
      phone, 
      parentName, 
      parentRelation, 
      parentPhone, 
      isAllowedPkl,
      bpjsStatus,
      cvStatus
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID siswa tidak valid' }, { status: 400 });
    }

    const updateData: any = {};

    if (nis !== undefined) updateData.nis = nis.trim();
    if (nisn !== undefined) updateData.nisn = nisn ? nisn.trim() : null;
    if (name !== undefined) updateData.name = name.trim();
    if (className !== undefined) updateData.className = className.trim();
    if (department !== undefined && department.trim() !== '') updateData.department = department.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (parentName !== undefined) updateData.parentName = parentName ? parentName.trim() : null;
    if (parentRelation !== undefined) updateData.parentRelation = parentRelation ? parentRelation.trim() : null;
    if (parentPhone !== undefined) updateData.parentPhone = parentPhone ? parentPhone.trim() : null;
    if (typeof isAllowedPkl === 'boolean') updateData.isAllowedPkl = isAllowedPkl;
    if (bpjsStatus !== undefined) updateData.bpjsStatus = bpjsStatus;
    if (cvStatus !== undefined) updateData.cvStatus = cvStatus;

    // A. Update di tabel Student
    const updatedStudent = await db.student.update({
      where: { id },
      data: updateData
    });

    // B. Sinkronkan ke tabel User jika nama/jurusan/nomor HP berubah
    if (updatedStudent.nis) {
      await db.user.updateMany({
        where: { username: updatedStudent.nis },
        data: {
          name: updateData.name || undefined,
          department: updateData.department || undefined,
          phone: updateData.phone || undefined
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Data siswa berhasil diperbarui!', 
      data: updatedStudent 
    });
  } catch (error: any) {
    console.error('Error updating student:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui data siswa' }, { status: 500 });
  }
}

// 4. DELETE: Hapus Data Siswa & Akun Login Terkait
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();
    const isPokja = ['POKJA', 'TIM_POKJA'].includes(userRole);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

    if (!session || (!isPokja && !isAdmin)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID siswa tidak valid' }, { status: 400 });
    }

    const studentToDelete = await db.student.findUnique({ where: { id } });

    if (studentToDelete) {
      // Hapus akun login di tabel User jika ada
      try {
        await db.user.delete({ where: { username: studentToDelete.nis } });
      } catch (e) {
        console.log('Akun User terkait tidak ditemukan atau sudah dihapus.');
      }

      // Hapus data master di tabel Student
      await db.student.delete({ where: { id } });
    }

    return NextResponse.json({ success: true, message: 'Data siswa dan akun login berhasil dihapus!' });
  } catch (error: any) {
    console.error('Error deleting student:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus data siswa' }, { status: 500 });
  }
}