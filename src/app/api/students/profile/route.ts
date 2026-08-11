// 📋 CHANGELOG:
// ✅ Perubahan: Mengintegrasikan mutasi atribut `cvUrl` dan `cvStatus` ke dalam kueri `db.student.update` agar file CV tersimpan secara persisten di PostgreSQL.
// ✨ Fitur Baru: Persistent Dual-Document Vault API (CV & BPJS).
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Memastikan status `MENUNGGU_VERIFIKASI` otomatis terisi saat berkas CV atau BPJS baru diunggah.
// 🚀 Inovasi: Zero-Data-Loss Student Profile Synchronizer.

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
      return NextResponse.json({ error: 'Unauthorized - Hanya Siswa yang diizinkan' }, { status: 401 });
    }

    const nis = (session.user as any)?.username;
    if (!nis) {
      return NextResponse.json({ error: 'Identitas NIS siswa tidak ditemukan dalam sesi login' }, { status: 400 });
    }

    let student = await db.student.findUnique({
      where: { nis: nis.trim() },
      include: {
        placement: {
          include: {
            industry: true
          }
        }
      }
    });

    if (!student) {
      student = await db.student.create({
        data: {
          nis: nis.trim(),
          name: session.user.name || 'Siswa SI-ERIN',
          className: 'Belum Diatur',
          department: (session.user as any)?.department || 'Teknik Komputer dan Jaringan',
          phone: (session.user as any)?.phone || '-',
          isAllowedPkl: false,
          bpjsStatus: 'BELUM_UPLOAD',
          cvStatus: 'BELUM_UPLOAD'
        },
        include: {
          placement: {
            include: {
              industry: true
            }
          }
        }
      });
    }

    return NextResponse.json({ success: true, data: student });
  } catch (error: any) {
    console.error('Error fetching student profile:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat profil siswa' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'SISWA') {
      return NextResponse.json({ error: 'Unauthorized - Hanya Siswa yang diizinkan' }, { status: 401 });
    }

    const nis = (session.user as any)?.username;
    if (!nis) {
      return NextResponse.json({ error: 'Identitas NIS tidak valid' }, { status: 400 });
    }

    const body = await request.json();
    const { 
      name, 
      nisn, 
      phone, 
      parentName, 
      parentRelation, 
      parentPhone, 
      bpjsUrl, 
      cvUrl 
    } = body;

    const updateData: any = {};

    if (name !== undefined) updateData.name = name.trim();
    if (nisn !== undefined) updateData.nisn = nisn ? nisn.trim() : null;
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (parentName !== undefined) updateData.parentName = parentName ? parentName.trim() : null;
    if (parentRelation !== undefined) updateData.parentRelation = parentRelation ? parentRelation.trim() : null;
    if (parentPhone !== undefined) updateData.parentPhone = parentPhone ? parentPhone.trim() : null;

    if (bpjsUrl && typeof bpjsUrl === 'string' && bpjsUrl.trim() !== '') {
      updateData.bpjsUrl = bpjsUrl.trim();
      updateData.bpjsStatus = 'MENUNGGU_VERIFIKASI';
    }

    if (cvUrl && typeof cvUrl === 'string' && cvUrl.trim() !== '') {
      updateData.cvUrl = cvUrl.trim();
      updateData.cvStatus = 'MENUNGGU_VERIFIKASI';
    }

    // 1. Perbarui data di tabel Student (Master Profil & Dokumen)
    const updatedStudent = await db.student.update({
      where: { nis: nis.trim() },
      data: updateData
    });

    // 2. Sinkronkan perubahan nama & HP ke tabel User (Kredensial Login)
    if (name || phone) {
      await db.user.update({
        where: { username: nis.trim() },
        data: {
          name: name ? name.trim() : undefined,
          phone: phone ? phone.trim() : undefined
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Data profil dan dokumen berhasil diperbarui dan tersimpan permanen!',
      data: updatedStudent
    });

  } catch (error: any) {
    console.error('Error updating student profile:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui profil siswa' }, { status: 500 });
  }
}