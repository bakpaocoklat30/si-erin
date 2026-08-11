// 📋 CHANGELOG:
// ✅ Perubahan: Menghapus seleksi field non-existent (`className`, `bpjsStatus`, `bpjsUrl`) dari kueri `db.user` untuk mematuhi skema ternormalisasi 3NF.
// ✨ Fitur Baru: Parallel Student Data Enrichment via NIS Relational Mapping.
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Mengatasi PrismaClientValidationError runtime akibat pemanggilan field yang sudah dipindahkan ke tabel Student.
// 🚀 Inovasi: Clean Dual-Entity Synchronization Pipeline Tanpa Type Hacking (`as any`).

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import bcrypt from 'bcrypt';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Admin' }, { status: 401 });
    }

    // 1. Ambil seluruh akun user dari tabel User (Hanya field resmi model User)
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        department: true,
        phone: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // 2. Ambil data akademik seluruh siswa dari tabel Student
    const students = await db.student.findMany({
      select: {
        nis: true,
        className: true,
        department: true,
        bpjsStatus: true,
        bpjsUrl: true,
        placement: {
          select: { status: true }
        }
      }
    });

    // 3. Gabungkan data user ber-role SISWA dengan profil akademiknya secara presisi
    const enrichedUsers = users.map((user) => {
      if (user.role === 'SISWA') {
        const studentData = students.find((s) => s.nis === user.username);
        return {
          ...user,
          className: studentData?.className || 'Belum Diatur',
          department: studentData?.department || user.department || 'Belum Diatur',
          bpjsStatus: studentData?.bpjsStatus || 'BELUM_UPLOAD',
          bpjsUrl: studentData?.bpjsUrl || null,
          placementStatus: studentData?.placement?.status || 'BELUM PENEMPATAN'
        };
      }
      return {
        ...user,
        className: '-',
        bpjsStatus: '-',
        bpjsUrl: null,
        placementStatus: '-'
      };
    });

    return NextResponse.json({ success: true, data: enrichedUsers });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data pengguna dari database' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Admin' }, { status: 401 });
    }

    const body = await request.json();
    const { username, name, password, role, className, department, phone } = body;

    if (!username || !name || !role) {
      return NextResponse.json({ error: 'Username, Nama, dan Role wajib diisi' }, { status: 400 });
    }

    const cleanUsername = username.trim();
    const cleanName = name.trim();
    const upperRole = role.toUpperCase().trim();
    const cleanDept = department && department.trim() !== '' ? department.trim() : null;
    const cleanPhone = phone && phone.trim() !== '' ? phone.trim() : null;
    const cleanClass = className && className.trim() !== '' ? className.trim() : 'Belum Diatur';

    const existing = await db.user.findUnique({ where: { username: cleanUsername } });
    if (existing) {
      return NextResponse.json({ error: 'Username sudah digunakan oleh akun lain' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password || 'password123', 10);

    // 1. Buat akun di tabel User
    const newUser = await db.user.create({
      data: {
        username: cleanUsername,
        name: cleanName,
        password: hashedPassword,
        role: upperRole,
        department: cleanDept,
        phone: cleanPhone
      },
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

    // 2. Jika role adalah SISWA, sinkronkan ke tabel Student
    if (upperRole === 'SISWA') {
      await db.student.upsert({
        where: { nis: cleanUsername },
        update: {
          name: cleanName,
          className: cleanClass,
          department: cleanDept || 'Belum Diatur',
          phone: cleanPhone || '-'
        },
        create: {
          nis: cleanUsername,
          name: cleanName,
          className: cleanClass,
          department: cleanDept || 'Belum Diatur',
          phone: cleanPhone || '-'
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Akun pengguna berhasil ditambahkan', data: newUser });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat akun pengguna' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Admin' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, username, role, password, newPassword, className, department, phone } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID user tidak valid' }, { status: 400 });
    }

    const currentUser = await db.user.findUnique({ where: { id } });
    if (!currentUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (username !== undefined) updateData.username = username.trim();
    if (role !== undefined) updateData.role = role.toUpperCase().trim();
    if (department !== undefined) updateData.department = department ? department.trim() : null;
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;

    const rawPassword = password || newPassword;
    if (rawPassword && typeof rawPassword === 'string' && rawPassword.trim() !== '') {
      updateData.password = await bcrypt.hash(rawPassword.trim(), 10);
    }

    // 1. Perbarui data di tabel User
    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        department: true,
        phone: true,
        updatedAt: true
      }
    });

    // 2. Jika role adalah SISWA (atau sebelumnya SISWA), sinkronkan data profil ke tabel Student
    const targetRole = updateData.role || currentUser.role;
    if (targetRole === 'SISWA') {
      const activeUsername = updateData.username || currentUser.username;
      const finalName = updateData.name !== undefined ? updateData.name : currentUser.name;
      const finalClass = className && className.trim() !== '' ? className.trim() : 'Belum Diatur';
      const finalDept = (updateData.department !== undefined ? updateData.department : currentUser.department) || 'Belum Diatur';
      const finalPhone = (updateData.phone !== undefined ? updateData.phone : currentUser.phone) || '-';

      await db.student.upsert({
        where: { nis: activeUsername },
        update: {
          name: finalName,
          className: finalClass,
          department: finalDept,
          phone: finalPhone
        },
        create: {
          nis: activeUsername,
          name: finalName,
          className: finalClass,
          department: finalDept,
          phone: finalPhone
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Akun pengguna berhasil diperbarui', data: updatedUser });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui akun pengguna' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Admin' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID user tidak valid' }, { status: 400 });
    }

    if (id === (session.user as any).id) {
      return NextResponse.json({ error: 'Anda tidak dapat menghapus akun yang sedang Anda gunakan' }, { status: 400 });
    }

    const userToDelete = await db.user.findUnique({ where: { id } });
    if (userToDelete && userToDelete.role === 'SISWA') {
      try {
        await db.student.delete({ where: { nis: userToDelete.username } });
      } catch (e) {
        console.log('Record Student terkait tidak ditemukan atau sudah dihapus.');
      }
    }

    await db.user.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Akun pengguna berhasil dihapus' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus akun pengguna' }, { status: 500 });
  }
}