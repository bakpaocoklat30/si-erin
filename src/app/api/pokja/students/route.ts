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

// 1. GET: Ambil Seluruh Data Siswa Sesuai Scope Jurusan Pokja
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const userDepartment = (session.user as any)?.department;
    const userRole = (session.user as any)?.role;

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
    if (userRole === 'POKJA' && userDepartment && userDepartment.toLowerCase() !== 'semua jurusan') {
      whereClause.AND.push({
        department: { contains: userDepartment, mode: 'insensitive' }
      });
    }

    // Ambil data siswa murni lengkap dengan relasi penempatan industri & dokumen CV/BPJS
    const students = await db.student.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: {
        placement: {
          include: {
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
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
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
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
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
    if (!session || ((session.user as any)?.role !== 'POKJA' && (session.user as any)?.role !== 'ADMIN')) {
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