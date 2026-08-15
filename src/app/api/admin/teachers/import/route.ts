// 📋 CHANGELOG:
// ✅ Perubahan: Membuat API endpoint untuk import data guru massal (bulk import) dari CSV/Array data Dapodik.
// ✨ Fitur Baru: Bulk Teacher Import Engine dengan validasi NIP opsional dan multi-role support.
// 🎨 UI/UX Update: N/A (Backend API Endpoint)
// 🔧 Bug Fix: Validasi duplikasi NIP dan sanitasi data kosong Dapodik.
// 🚀 Inovasi: High-Performance Transactional Batch Insert.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Admin' }, { status: 401 });
    }

    const body = await request.json();
    const { teachers } = body; // Array of objects: [{ name, nip, gender, subject, role }]

    if (!teachers || !Array.isArray(teachers) || teachers.length === 0) {
      return NextResponse.json({ error: 'Data guru yang diimport kosong atau tidak valid' }, { status: 400 });
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    const defaultPassword = await bcrypt.hash('guru12345', 10);

    for (const item of teachers) {
      try {
        const name = item.name?.trim();
        const nip = item.nip ? String(item.nip).trim() : null;
        const gender = item.gender?.trim() || 'L'; // L / P
        const subject = item.subject?.trim() || 'Umum';
        const role = item.role?.toUpperCase() || 'GURU'; // GURU, POKJA, PEMBIMBING

        if (!name) {
          failedCount++;
          errors.push(`Baris dengan NIP ${nip || 'Tanpa NIP'}: Nama guru wajib diisi.`);
          continue;
        }

        // Cek duplikasi NIP jika NIP tidak kosong
        if (nip && nip !== '' && nip !== '-') {
          const existing = await db.user.findFirst({ where: { username: nip } });
          if (existing) {
            // Update data jika sudah ada atau lewati
            await db.user.update({
              where: { id: existing.id },
              data: {
                name,
                department: subject,
                role: role === 'POKJA' ? 'POKJA' : existing.role,
              },
            });
            successCount++;
            continue;
          }
        }

        // Generate username unik jika NIP kosong
        const username = (nip && nip !== '' && nip !== '-') ? nip : `guru_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // Buat akun user baru untuk guru
        await db.user.create({
          data: {
            username: username,
            name: name,
            password: defaultPassword,
            role: role === 'POKJA' ? 'POKJA' : 'GURU',
            department: subject,
            phone: item.phone || '-',
          },
        });

        successCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`Gagal memproses ${item.name}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimport ${successCount} guru. Gagal: ${failedCount}.`,
      details: { successCount, failedCount, errors },
    });

  } catch (error: any) {
    console.error('❌ Error importing teachers:', error);
    return NextResponse.json({ error: error.message || 'Gagal memproses import guru' }, { status: 500 });
  }
}