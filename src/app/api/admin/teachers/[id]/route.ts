// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✨ Fitur Baru: REST API Detail, Update, & Hapus Guru (Admin).
// 🔧 Fitur:
//    - GET: Detail guru beserta statistik penugasan monitoring & siswa bimbingan.
//    - PUT: Pembaruan Nama, NIP, Pangkat, Golongan, Nomor WhatsApp, Role, Jurusan, dan Reset Password.
//    - DELETE: Penghapusan aman akun guru.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA', 'SUPER_ADMIN', 'TATA_USAHA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const { id } = params;
    const teacher = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        nip: true,
        rank: true,
        golongan: true,
        phone: true,
        role: true,
        department: true,
        jobTitle: true,
        employeeType: true,
        createdAt: true,
        updatedAt: true,
        supervisedStudents: {
          select: {
            id: true,
            name: true,
            nis: true,
            className: true,
            placement: {
              select: {
                status: true,
                industry: {
                  select: { name: true }
                }
              }
            }
          }
        },
        monitoringAssignments: {
          select: {
            id: true,
            monitoringDate: true,
            purpose: true,
            status: true,
            industry: {
              select: { name: true }
            }
          },
          orderBy: { monitoringDate: 'desc' }
        }
      }
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Data guru tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: teacher });

  } catch (error: any) {
    console.error('Error fetching teacher detail:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat detail guru' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Administrator' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { name, nip, rank, golongan, phone, role, department, jobTitle, employeeType, password } = body;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Data guru tidak ditemukan' }, { status: 404 });
    }

    const cleanNip = nip && nip.trim() !== '' && nip.trim() !== '-' ? nip.trim() : null;

    // Jika NIP diubah dan tidak kosong, periksa duplikasi di user lain
    if (cleanNip && cleanNip !== existing.nip) {
      const duplicate = await db.user.findFirst({
        where: {
          id: { not: id },
          OR: [
            { username: cleanNip },
            { nip: cleanNip }
          ]
        }
      });
      if (duplicate) {
        return NextResponse.json({ 
          error: `NIP "${cleanNip}" sudah digunakan oleh guru lain: "${duplicate.name}".` 
        }, { status: 409 });
      }
    }

    // Tentukan jabatan fungsional (Guru, Tata Usaha, Staff)
    let cleanJobTitle: string | undefined = undefined;
    if (jobTitle !== undefined) {
      const val = String(jobTitle).trim();
      if (val.toLowerCase().includes('tata usaha') || val.toLowerCase() === 'tu') {
        cleanJobTitle = 'Tata Usaha';
      } else if (val.toLowerCase().includes('staff') || val.toLowerCase().includes('staf')) {
        cleanJobTitle = 'Staff';
      } else {
        cleanJobTitle = 'Guru';
      }
    }

    // Tentukan jenis kepegawaian (PNS, PPPK, HONORER)
    let cleanEmployeeType: string | null | undefined = undefined;
    if (employeeType !== undefined) {
      const val = String(employeeType).trim().toUpperCase();
      cleanEmployeeType = ['PNS', 'PPPK', 'HONORER'].includes(val) ? val : null;
    }

    const updateData: any = {
      ...(name && { name: name.trim() }),
      nip: cleanNip,
      rank: rank ? rank.trim() : null,
      golongan: golongan ? golongan.trim() : null,
      phone: phone ? phone.trim() : null,
      ...(role && { role: String(role).toUpperCase().trim() }),
      ...(department !== undefined && { department: department ? department.trim() : null }),
      ...(cleanJobTitle !== undefined && { jobTitle: cleanJobTitle }),
      ...(cleanEmployeeType !== undefined && { employeeType: cleanEmployeeType }),
    };

    // Update password jika diberikan
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    const updated = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        nip: true,
        rank: true,
        golongan: true,
        phone: true,
        role: true,
        department: true,
        jobTitle: true,
        employeeType: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      success: true,
      message: `Data guru "${updated.name}" berhasil diperbarui.`,
      data: updated
    });

  } catch (error: any) {
    console.error('Error updating teacher:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui data guru' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Administrator' }, { status: 403 });
    }

    const { id } = params;
    const existing = await db.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            supervisedStudents: true,
            monitoringAssignments: true
          }
        }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Data guru tidak ditemukan' }, { status: 404 });
    }

    // Peringatan jika guru memiliki keterkaitan relasi data
    if (existing._count.supervisedStudents > 0 || existing._count.monitoringAssignments > 0) {
      // Opsi: Hapus relasi penugasan atau tolak
      // Untuk keamanan data integritas, jika ada penugasan monitoring aktif, informasikan
      if (existing._count.monitoringAssignments > 0) {
        return NextResponse.json({
          error: `Guru "${existing.name}" tidak dapat dihapus karena memiliki ${existing._count.monitoringAssignments} data penugasan monitoring/surat tugas terkait. Hapus atau pindahkan penugasan terlebih dahulu.`
        }, { status: 400 });
      }
    }

    await db.user.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `Akun guru "${existing.name}" berhasil dihapus dari sistem.`
    });

  } catch (error: any) {
    console.error('Error deleting teacher:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus data guru' }, { status: 500 });
  }
}
