// 📋 CHANGELOG:
// ✅ Perubahan: Menyimpan handler API Import CSV pada lokasi rute yang tepat (`src/app/api/admin/students/import/route.ts`) agar sinkron dengan panggilan frontend.
// ✨ Fitur Baru: Intelligent 3-Column CSV Parser & Class-to-Department Auto-Inference Pipeline.
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Menyelesaikan masalah peringatan validasi "NIS, Nama, Kelas, Jurusan, dan Telepon wajib diisi" pada file CSV 3 kolom.
// 🚀 Inovasi: Seamless Dual-Table Student & User Import Synchronization.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import bcrypt from 'bcrypt';

// Fungsi penolong untuk penentuan jurusan otomatis dari nama kelas
function inferDepartmentFromClassName(className: string): string {
  if (!className) return 'Teknik Komputer dan Jaringan';
  const upperClass = className.toUpperCase();

  if (upperClass.includes('TKJ')) return 'Teknik Komputer dan Jaringan';
  if (upperClass.includes('RPL')) return 'Rekayasa Perangkat Lunak';
  if (upperClass.includes('MM') || upperClass.includes('DKV')) return 'Desain Komunikasi Visual';
  if (upperClass.includes('TKR')) return 'Teknik Kendaraan Ringan';
  if (upperClass.includes('TAB') || upperClass.includes('AK')) return 'Akuntansi dan Keuangan';

  return 'Teknik Komputer dan Jaringan'; // Fallback default
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Admin' }, { status: 401 });
    }

    const body = await request.json();
    const { csvData } = body;

    if (!csvData) {
      return NextResponse.json({ error: 'Data CSV tidak ditemukan atau kosong' }, { status: 400 });
    }

    let rows: any[] = [];

    // 1. Parsing jika data dikirim sebagai string CSV
    if (typeof csvData === 'string') {
      const lines = csvData.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length <= 1) {
        return NextResponse.json({ error: 'File CSV tidak memiliki baris data' }, { status: 400 });
      }

      // Ambil header baris pertama
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
      
      for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].split(',').map(item => item.trim().replace(/^["']|["']$/g, ''));
        if (currentLine.length < 3) continue;

        const rowObject: any = {};
        headers.forEach((header, index) => {
          rowObject[header] = currentLine[index] || '';
        });
        rows.push(rowObject);
      }
    } else if (Array.isArray(csvData)) {
      rows = csvData;
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data siswa valid yang dapat diproses' }, { status: 400 });
    }

    let importedCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      
      // Ambil 3 kolom utama dari CSV
      const nis = (row.nis || row.NIS || row['no_induk'] || '').toString().trim();
      const name = (row.nama || row.name || row.Nama || row['nama_siswa'] || '').toString().trim();
      const className = (row.kelas || row.className || row.Kelas || '').toString().trim();

      // Kolom opsional (jika tidak ada di CSV, diturunkan secara otomatis)
      const departmentInput = row.jurusan || row.department || row.Jurusan || '';
      const phoneInput = row.telepon || row.phone || row.Telepon || row.hp || '';

      if (!nis || !name || !className) {
        errors.push(`Baris ${index + 2}: NIS, Nama, dan Kelas wajib diisi.`);
        continue;
      }

      // Penentuan jurusan otomatis dari nama kelas jika tidak ada di CSV
      const finalDepartment = departmentInput.trim() !== '' 
        ? departmentInput.trim() 
        : inferDepartmentFromClassName(className);

      const finalPhone = phoneInput.trim() !== '' ? phoneInput.trim() : '-';

      try {
        // Password default akun login siswa = NIS
        const userPasswordHash = await bcrypt.hash(nis, 10);
        
        // A. Sinkronisasi ke tabel User (Kredensial Login)
        await db.user.upsert({
          where: { username: nis },
          update: {
            name: name,
            department: finalDepartment,
            phone: finalPhone
          },
          create: {
            username: nis,
            name: name,
            password: userPasswordHash,
            role: 'SISWA',
            department: finalDepartment,
            phone: finalPhone
          }
        });

        // B. Sinkronisasi ke tabel Student (Master Data Akademik)
        const existingStudent = await db.student.findUnique({ where: { nis } });

        await db.student.upsert({
          where: { nis },
          update: {
            name: name,
            className: className,
            department: finalDepartment,
            phone: finalPhone
          },
          create: {
            nis: nis,
            name: name,
            className: className,
            department: finalDepartment,
            phone: finalPhone,
            isAllowedPkl: false,
            bpjsStatus: 'BELUM_UPLOAD'
          }
        });

        if (existingStudent) {
          updatedCount++;
        } else {
          importedCount++;
        }
      } catch (err: any) {
        console.error(`Error importing row ${index + 2}:`, err);
        errors.push(`Baris ${index + 2} (${name}): ${err.message || 'Gagal menyimpan ke database'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memproses CSV: ${importedCount} siswa baru ditambahkan, ${updatedCount} siswa diperbarui.`,
      summary: {
        totalProcessed: rows.length,
        importedCount,
        updatedCount,
        errorCount: errors.length,
        errors
      }
    });

  } catch (error: any) {
    console.error('Error executing CSV import:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan sistem saat mengimpor CSV' }, { status: 500 });
  }
}