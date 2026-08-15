// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Menyatu-padukan manajemen profil `User` (Nama, Password, No HP) dan `Student` (NIS, Kelas, Jurusan).
// ✨ Fitur Baru:
//    - Password Hashing & Change Verification via `bcryptjs`.
//    - Dual-Entity Synchronization (Menyinkronkan perubahan ke tabel `User` & `Student`).
//    - Universal Backward Compatibility (Mendukung Modul Siswa & Modul Settings Admin/TU/Pokja).
// 🔧 Bug Fix: Menghindari konflik response API antara profil siswa dan akun pengguna umum.
// 🚀 Inovasi: Enterprise Unified User & Student Profile API Engine for SI-ERIN.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import bcrypt from 'bcryptjs';

// 1. GET: Ambil Data Profil Akun User & Data Student (Jika Ada)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const username = (session.user as any).username;

    // Ambil data dari tabel User
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        department: true,
        phone: true,
        createdAt: true
      }
    });

    // Cari data siswa berdasarkan userId atau NIS/username
    let student = await db.student.findFirst({
      where: {
        OR: [
          { userId: userId },
          { id: userId },
          { nis: username }
        ]
      },
      include: {
        teacher: {
          select: { id: true, name: true, username: true }
        }
      }
    });

    // Jika user ber-role SISWA namun data student belum ada, buat baris inisialisasi awal
    if (!student && (user?.role === 'SISWA' || (session.user as any)?.role === 'SISWA')) {
      student = await db.student.create({
        data: {
          userId: userId,
          nis: username || '20260001',
          name: session.user.name || user?.name || 'Siswa SI-ERIN',
          className: 'XII TKJ 1',
          department: user?.department || 'Teknik Komputer dan Jaringan',
          phone: user?.phone || '081234567890',
        },
        include: {
          teacher: {
            select: { id: true, name: true, username: true }
          }
        }
      });
    }

    // Mengembalikan payload ganda (Kompatibel dengan Modul Siswa maupun Modul Settings TU/Admin)
    return NextResponse.json({
      success: true,
      user: user || {
        id: userId,
        username: username,
        name: session.user.name,
        role: (session.user as any)?.role || 'USER'
      },
      student: student || null,
      // Field langsung untuk kompatibilitas penuh dengan komponen siswa eksisting:
      id: student?.id || user?.id,
      name: student?.name || user?.name,
      nis: student?.nis || username,
      className: student?.className || 'XII TKJ 1',
      department: student?.department || user?.department || 'Teknik Komputer dan Jaringan',
      phone: student?.phone || user?.phone || ''
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat profil' }, { status: 500 });
  }
}

// 2. PUT: Perbarui Data Profil (User & Student) Secara Aman & Permanen
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();

    const {
      id, // ID Student (jika dikirim dari form siswa)
      name,
      nis,
      phone,
      department,
      className,
      currentPassword,
      newPassword
    } = body;

    // Ambil data akun User saat ini dari database
    const currentUser = await db.user.findUnique({
      where: { id: userId }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Akun penginstal/user tidak ditemukan' }, { status: 404 });
    }

    const userUpdateData: any = {};

    // 1. UPDATE NAMA (Ke tabel User & Student)
    if (name && name.trim()) {
      userUpdateData.name = name.trim();
    }

    // 2. UPDATE TELEPON
    if (phone !== undefined) {
      userUpdateData.phone = phone ? phone.trim() : null;
    }

    // 3. UPDATE JURUSAN
    if (department && department.trim()) {
      userUpdateData.department = department.trim();
    }

    // 4. PENANGANAN VERIFIKASI & GANTI PASSWORD AKUN
    if (newPassword && newPassword.trim()) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Password saat ini wajib diisi untuk mengubah password baru!' },
          { status: 400 }
        );
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Password saat ini yang Anda masukkan salah!' },
          { status: 400 }
        );
      }

      if (newPassword.trim().length < 6) {
        return NextResponse.json(
          { error: 'Password baru minimal harus 6 karakter!' },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
      userUpdateData.password = hashedPassword;
    }

    // Eksekusi Update ke Tabel User
    let updatedUser = currentUser;
    if (Object.keys(userUpdateData).length > 0) {
      updatedUser = await db.user.update({
        where: { id: userId },
        data: userUpdateData
      });
    }

    // 5. PENANGANAN SINKRONISASI KE TABEL STUDENT (JIKA AKUN ADALAH SISWA ATHAU MEMILIKI REKAP STUDENT)
    let updatedStudent = null;
    const studentTargetId = id || userId;

    const existingStudent = await db.student.findFirst({
      where: {
        OR: [
          { id: studentTargetId },
          { userId: userId },
          { nis: currentUser.username }
        ]
      }
    });

    if (existingStudent) {
      const studentUpdateData: any = {};
      if (name && name.trim()) studentUpdateData.name = name.trim();
      if (nis && nis.trim()) studentUpdateData.nis = nis.trim();
      if (phone !== undefined) studentUpdateData.phone = phone ? phone.trim() : existingStudent.phone;
      if (className && className.trim()) studentUpdateData.className = className.trim();
      if (department && department.trim()) studentUpdateData.department = department.trim();

      if (Object.keys(studentUpdateData).length > 0) {
        updatedStudent = await db.student.update({
          where: { id: existingStudent.id },
          data: studentUpdateData
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profil dan pengaturan akun berhasil diperbarui secara permanen!',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.name,
        role: updatedUser.role,
        department: updatedUser.department,
        phone: updatedUser.phone
      },
      student: updatedStudent
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui profil ke database' }, { status: 500 });
  }
}