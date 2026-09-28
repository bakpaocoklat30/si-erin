// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Peningkatan Bulk Import Guru dengan parser cerdas CSV, pemetaan Pangkat & Golongan, Nomor WhatsApp, dan sanitasi NIP.
// ✨ Fitur Baru:
//    - Ekstraksi fleksibel kolom: Nama Lengkap, NIP, Pangkat, Golongan, Nomor WhatsApp/Telepon, Jurusan/Mapel, Role.
//    - Dukungan payload Array JSON langsung maupun raw text CSV.
//    - Auto-Upsert: Memperbarui data pangkat/golongan/wa guru jika NIP sudah terdaftar, atau membuat baru jika belum ada.
// 🔧 Bug Fix: Penanganan tanda kutip CSV, pembersihan format telepon Indonesia (+62 / 08), dan sanitasi NIP kosong.
// 🚀 Inovasi: High-Tolerance Intelligent Import Engine for SMK Educators.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

function parseCsvLines(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  // Parse header
  const headers = splitCsvRow(lines[0]).map(h => h.trim().toLowerCase());

  const records: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvRow(lines[i]);
    if (values.every(v => v.trim() === '')) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ? values[idx].trim() : '';
    });
    records.push(row);
  }
  return records;
}

function splitCsvRow(rowStr: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function sanitizePhone(rawPhone?: string): string | null {
  if (!rawPhone) return null;
  let p = rawPhone.replace(/[^0-9+]/g, '').trim();
  if (p.startsWith('0')) {
    p = '62' + p.substring(1);
  } else if (p.startsWith('+62')) {
    p = p.substring(1);
  }
  return p && p.length >= 8 ? p : (rawPhone.trim() || null);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Administrator' }, { status: 403 });
    }

    const body = await request.json();
    let teachersToProcess: any[] = [];

    // Jika dikirim sebagai raw CSV text
    if (typeof body.csvText === 'string' && body.csvText.trim() !== '') {
      const parsedRecords = parseCsvLines(body.csvText);
      teachersToProcess = parsedRecords.map(r => {
        // Pemetaan fleksibel berbagai nama header kolom
        const name = r['nama'] || r['nama lengkap'] || r['name'] || r['nama guru'] || '';
        const nip = r['nip'] || r['nomor induk'] || '';
        const rank = r['pangkat'] || r['rank'] || '';
        const golongan = r['golongan'] || r['gol'] || r['ruang'] || '';
        const phone = r['nomor whatsapp'] || r['no whatsapp'] || r['whatsapp'] || r['no wa'] || r['wa'] || r['telepon'] || r['no telp'] || r['phone'] || '';
        const department = r['mata pelajaran / jurusan'] || r['mata pelajaran'] || r['jurusan'] || r['mapel'] || r['department'] || r['kompetensi'] || '';
        const role = r['role'] || r['peran'] || 'GURU';
        const jobTitle = r['jabatan fungsional'] || r['jabatan'] || r['jobtitle'] || r['fungsional'] || 'Guru';
        const employeeType = r['jenis kepegawaian'] || r['kepegawaian'] || r['status kepegawaian'] || r['status'] || r['employeetype'] || '';

        return { name, nip, rank, golongan, phone, department, role, jobTitle, employeeType };
      });
    } else if (Array.isArray(body.teachers)) {
      teachersToProcess = body.teachers;
    } else {
      return NextResponse.json({ error: 'Payload tidak valid. Kirimkan csvText atau array teachers.' }, { status: 400 });
    }

    if (teachersToProcess.length === 0) {
      return NextResponse.json({ error: 'Data guru yang akan diimport kosong.' }, { status: 400 });
    }

    let successCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    const defaultPassword = await bcrypt.hash('guru12345', 10);

    for (const item of teachersToProcess) {
      try {
        const name = (item.name || item.nama || item['Nama Lengkap'] || '').trim();
        const rawNip = String(item.nip || item.NIP || '').trim();
        const nip = (rawNip && rawNip !== '-' && rawNip !== '') ? rawNip : null;
        const rank = (item.rank || item.pangkat || item.Pangkat || '').trim() || null;
        const golongan = (item.golongan || item.Golongan || item.gol || '').trim() || null;
        const rawPhone = item.phone || item.no_wa || item.whatsapp || item['Nomor WhatsApp'] || '';
        const phone = sanitizePhone(rawPhone);
        const department = (item.department || item.subject || item.mapel || item['Jurusan / Mapel'] || item['Mata Pelajaran'] || '').trim() || null;
        const rawRole = (item.role || item.Role || 'GURU').toUpperCase().trim();
        const role = ['POKJA', 'PEMBIMBING', 'ADMIN', 'TATA_USAHA'].includes(rawRole) ? rawRole : 'GURU';

        let jobTitle = (item.jobTitle || item.jabatan || item['Jabatan Fungsional'] || 'Guru').trim();
        if (jobTitle.toLowerCase().includes('tata usaha') || jobTitle.toLowerCase() === 'tu') {
          jobTitle = 'Tata Usaha';
        } else if (jobTitle.toLowerCase().includes('staff') || jobTitle.toLowerCase().includes('staf')) {
          jobTitle = 'Staff';
        } else {
          jobTitle = 'Guru';
        }

        let employeeType = String(item.employeeType || item.kepegawaian || item['Jenis Kepegawaian'] || '').toUpperCase().trim();
        if (!['PNS', 'PPPK', 'HONORER'].includes(employeeType)) {
          if (golongan && golongan.toUpperCase().includes('IX')) {
            employeeType = 'PPPK';
          } else if (nip) {
            employeeType = 'PNS';
          } else {
            employeeType = 'HONORER';
          }
        }

        if (!name) {
          failedCount++;
          errors.push(`Baris NIP ${nip || 'Tanpa NIP'}: Nama guru kosong, dilewati.`);
          continue;
        }

        // Cek apakah guru sudah terdaftar berdasarkan NIP / Username
        if (nip) {
          const existing = await db.user.findFirst({
            where: {
              OR: [
                { username: nip },
                { nip: nip }
              ]
            }
          });

          if (existing) {
            await db.user.update({
              where: { id: existing.id },
              data: {
                name,
                nip,
                rank: rank || existing.rank,
                golongan: golongan || existing.golongan,
                phone: phone || existing.phone,
                department: department || existing.department,
                jobTitle: jobTitle || existing.jobTitle,
                employeeType: employeeType || existing.employeeType,
                role: role === 'POKJA' ? 'POKJA' : existing.role,
              }
            });
            updatedCount++;
            continue;
          }
        }

        // Buat akun baru jika belum ada
        const username = nip ? nip : `guru_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        await db.user.create({
          data: {
            username,
            name,
            nip,
            rank,
            golongan,
            phone,
            department,
            role,
            jobTitle,
            employeeType,
            password: defaultPassword,
          }
        });

        successCount++;

      } catch (err: any) {
        failedCount++;
        errors.push(`Gagal memproses ${item.name || 'Guru'}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Proses import selesai. Berhasil ditambahkan: ${successCount} baru, Diperbarui: ${updatedCount}, Gagal: ${failedCount}.`,
      details: {
        total: teachersToProcess.length,
        inserted: successCount,
        updated: updatedCount,
        failed: failedCount,
        errors
      }
    });

  } catch (error: any) {
    console.error('Error importing teachers:', error);
    return NextResponse.json({ error: error.message || 'Gagal memproses import data guru' }, { status: 500 });
  }
}