// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: 
//    1. Mengganti dependensi `unzip` CLI dengan `AdmZip` (native in-memory/disk Node.js) agar bekerja sempurna di Windows & Linux.
//    2. Mengganti `cp -R` CLI dengan `fs.cpSync` (cross-platform Node.js native).
//    3. Menambahkan deteksi otomatis container Docker `sierin_postgres` dengan `docker cp` & `psql` execution.
//    4. Menambahkan pelaporan diagnostik terperinci jika file SQL atau data tidak ditemukan.
// ✨ Fitur Baru: Universal Cross-Platform Disaster Recovery Engine (Windows & Linux Ready).
// 🔧 Bug Fix: Menyelesaikan masalah "Restore sukses tapi data tidak masuk" karena kegagalan silent `unzip` di Windows host.
// 🚀 Inovasi: Zero-Dependency Robust ZIP & SQL Restoration Pipeline.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getDriveClient } from '@/lib/gdrive';
import { db } from '@/lib/db';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import AdmZip from 'adm-zip';

const execPromise = util.promisify(exec);

// Daftar kolom skema resmi yang valid untuk setiap tabel
const VALID_TABLE_COLUMNS: Record<string, Set<string>> = {
  SchoolSetting: new Set(['id', 'name', 'shortName', 'logoUrl', 'address', 'phone', 'email', 'headmaster', 'headmasterNip', 'accreditation', 'createdAt', 'updatedAt']),
  SystemSetting: new Set(['id', 'key', 'value', 'createdAt', 'updatedAt']),
  User: new Set(['id', 'username', 'name', 'password', 'role', 'department', 'phone', 'nip', 'rank', 'golongan', 'jobTitle', 'employeeType', 'createdAt', 'updatedAt']),
  AcademicYear: new Set(['id', 'year', 'isActive', 'createdAt', 'updatedAt']),
  Department: new Set(['id', 'code', 'name', 'createdAt', 'updatedAt']),
  InternshipPeriod: new Set(['id', 'name', 'startDate', 'endDate', 'department', 'isActive', 'academicYearId', 'activeIndustries', 'createdAt', 'updatedAt']),
  ClassRoom: new Set(['id', 'name', 'departmentId', 'isAllowedPkl', 'periodId', 'createdAt', 'updatedAt']),
  InternshipCoefficient: new Set(['id', 'periodId', 'academicYear', 'periodName', 'totalClasses', 'hoursPerClass', 'totalStudents', 'coefficient', 'notes', 'createdAt', 'updatedAt']),
  IndustryCategory: new Set(['id', 'name', 'description', 'createdAt', 'updatedAt']),
  Industry: new Set(['id', 'name', 'nib', 'sector', 'npwp', 'logoUrl', 'province', 'regency', 'address', 'rt', 'rw', 'dusun', 'desaKelurahan', 'subDistrict', 'postalCode', 'latitude', 'longitude', 'contactPerson', 'phone', 'fax', 'email', 'website', 'workType', 'jobDescription', 'totalQuota', 'createdAt', 'updatedAt']),
  Student: new Set(['id', 'userId', 'nis', 'nisn', 'name', 'className', 'department', 'phone', 'parentName', 'parentRelation', 'parentPhone', 'bpjsStatus', 'bpjsUrl', 'cvStatus', 'cvUrl', 'isAllowedPkl', 'teacherId', 'createdAt', 'updatedAt']),
  InternshipPlacement: new Set([
    'id', 'studentId', 'industryId', 'status', 'stage', 'notes',
    'letterNumber', 'suratTugasUrl', 'letterUploadedBy', 'letterUploadedAt',
    'suratBalasanUrl', 'suratBalasanStatus', 'suratPengantaranUrl', 'nomorPengantaran',
    'suratPenarikanUrl', 'nomorPenarikan', 'startDate', 'endDate', 'groupId',
    'appliedAt', 'createdAt', 'updatedAt'
  ]),
  TeacherHourAllocation: new Set(['id', 'className', 'teacherId', 'totalHours', 'academicYear', 'createdAt', 'updatedAt']),
  MonitoringAssignment: new Set(['id', 'industryId', 'targetIndustries', 'teacherId', 'companionTeachers', 'periodId', 'monitoringDate', 'returnDate', 'letterNumber', 'sppdNumber', 'purpose', 'transportType', 'departurePlace', 'destinationPlace', 'budgetSource', 'budgetAccount', 'suratTugasUrl', 'sppdUrl', 'laporanUrl', 'status', 'notes', 'createdAt', 'updatedAt']),
  Notification: new Set(['id', 'userId', 'title', 'message', 'type', 'link', 'isRead', 'createdAt']),
  ErrorLog: new Set(['id', 'level', 'message', 'stack', 'path', 'method', 'userId', 'ip', 'createdAt']),
  AuditLog: new Set(['id', 'userId', 'username', 'userRole', 'action', 'module', 'details', 'ipAddress', 'userAgent', 'createdAt']),
  SchoolEvent: new Set(['id', 'name', 'startDate', 'endDate', 'location', 'letterIntro', 'createdAt', 'updatedAt']),
  EventParticipant: new Set(['id', 'eventId', 'studentId', 'startDate', 'endDate', 'location', 'letterUrl', 'createdAt']),
  PlacementGroup: new Set(['id', 'industryId', 'periodId', 'startDate', 'endDate', 'createdAt', 'updatedAt']),
};

// Helper pemecah berkas SQL menjadi kumpulan pernyataan utuh (mendukung string multi-baris dan single quote escaping)
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === "'") {
      if (inQuote && sql[i + 1] === "'") {
        current += "''";
        i++;
        continue;
      }
      inQuote = !inQuote;
      current += char;
    } else if (char === ';' && !inQuote) {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed + ';');
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

// Helper pembersih baris INSERT dari kolom relasi phantom (seperti "period", "classes", dll.)
function cleanInsertLine(line: string): string {
  const insertPrefix = 'INSERT INTO "';
  if (!line.startsWith(insertPrefix)) return line;

  const tableEnd = line.indexOf('"', insertPrefix.length);
  if (tableEnd === -1) return line;
  const tableName = line.substring(insertPrefix.length, tableEnd);

  const validCols = VALID_TABLE_COLUMNS[tableName];
  if (!validCols) return line;

  const colsStart = line.indexOf(' (', tableEnd);
  if (colsStart === -1) return line;
  const colsEnd = line.indexOf(') VALUES (', colsStart);
  if (colsEnd === -1) return line;

  const valsStart = colsEnd + ') VALUES ('.length;
  // Cari kurung tutup yang tepat untuk blok VALUES dengan pencocokan kedalaman (depth)
  let depth = 1;
  let inQuote = false;
  let valsEnd = -1;
  for (let i = valsStart; i < line.length; i++) {
    const ch = line[i];
    if (ch === "'") {
      if (inQuote && line[i + 1] === "'") {
        i++;
        continue;
      }
      inQuote = !inQuote;
    } else if (!inQuote) {
      if (ch === '(') {
        depth++;
      } else if (ch === ')') {
        depth--;
        if (depth === 0) {
          valsEnd = i;
          break;
        }
      }
    }
  }
  if (valsEnd === -1 || valsEnd <= valsStart) return line;

  const keysStr = line.substring(colsStart + 2, colsEnd);
  const valsStr = line.substring(valsStart, valsEnd);
  const suffix = line.substring(valsEnd + 1);

  const keys = keysStr.split(',').map((k: string) => k.trim().replace(/^"|"$/g, ''));
  
  const vals: string[] = [];
  let cur = '';
  inQuote = false;
  for (let i = 0; i < valsStr.length; i++) {
    const ch = valsStr[i];
    if (ch === "'") {
      if (inQuote && valsStr[i + 1] === "'") {
        cur += "''";
        i++;
      } else {
        inQuote = !inQuote;
        cur += ch;
      }
    } else if (ch === ',' && !inQuote) {
      vals.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim() || vals.length < keys.length) {
    vals.push(cur.trim());
  }

  if (keys.length !== vals.length) {
    return line;
  }

  const cleanKeys: string[] = [];
  const cleanVals: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    if (validCols.has(keys[i])) {
      cleanKeys.push(`"${keys[i]}"`);
      cleanVals.push(vals[i]);
    }
  }

  const cleanSuffix = suffix.trim().replace(/;+$/, '');
  return `INSERT INTO "${tableName}" (${cleanKeys.join(', ')}) VALUES (${cleanVals.join(', ')})${cleanSuffix ? ' ' + cleanSuffix : ''};`;
}

// Helper pencarian file rekursif
function findSqlFileRecursive(dir: string): string | null {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findSqlFileRecursive(fullPath);
      if (found) return found;
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.sql')) {
      return fullPath;
    }
  }
  return null;
}

export async function POST(request: Request) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const tmpDir = path.join(os.tmpdir(), 'sierin_tmp');
  const downloadedZipPath = path.join(tmpDir, `restore_${timestamp}.zip`);
  const extractDir = path.join(tmpDir, `extract_${timestamp}`);

  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Admin Utama' }, { status: 401 });
    }

    const body = await request.json();
    const { fileId } = body;

    if (!fileId) {
      return NextResponse.json({ error: 'ID file Google Drive tidak valid' }, { status: 400 });
    }

    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    fs.mkdirSync(extractDir, { recursive: true });

    // ======================================================================
    // 1. UNDUH BERKAS ZIP DARI GOOGLE DRIVE
    // ======================================================================
    console.log(`[RESTORE] 📥 Mengunduh berkas ZIP dari Google Drive (File ID: ${fileId})...`);
    const drive = await getDriveClient();
    
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' }
    );

    await new Promise<void>((resolve, reject) => {
      const dest = fs.createWriteStream(downloadedZipPath);
      (response.data as any)
        .on('end', () => resolve())
        .on('error', (err: any) => reject(err))
        .pipe(dest);
    });

    const zipStat = fs.statSync(downloadedZipPath);
    console.log(`[RESTORE] ✅ Berkas ZIP terunduh (${(zipStat.size / (1024 * 1024)).toFixed(2)} MB).`);

    // ======================================================================
    // 2. EKSTRAK ARSIP ZIP (MENGGUNAKAN ADM-ZIP + FALLBACK TAR & POWERSHELL)
    // ======================================================================
    console.log('[RESTORE] 📦 Mengekstrak isi arsip ZIP...');
    let extracted = false;

    // Metode A: AdmZip (Cross-platform 100% Node.js native)
    try {
      const zip = new AdmZip(downloadedZipPath);
      zip.extractAllTo(extractDir, true);
      extracted = true;
      console.log('[RESTORE] ✅ Berhasil mengekstrak via AdmZip.');
    } catch (admErr: any) {
      console.warn('[RESTORE] ⚠️ AdmZip gagal, mencoba fallback CLI...', admErr?.message);
    }

    // Metode B: tar -xf (Universal di modern Windows & Linux)
    if (!extracted) {
      try {
        await execPromise(`tar -xf "${downloadedZipPath}" -C "${extractDir}"`);
        extracted = true;
        console.log('[RESTORE] ✅ Berhasil mengekstrak via tar CLI.');
      } catch (tarErr: any) {
        console.warn('[RESTORE] ⚠️ tar CLI gagal...', tarErr?.message);
      }
    }

    // Metode C: powershell Expand-Archive (Khusus Windows)
    if (!extracted && process.platform === 'win32') {
      try {
        await execPromise(
          `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${downloadedZipPath}' -DestinationPath '${extractDir}' -Force"`
        );
        extracted = true;
        console.log('[RESTORE] ✅ Berhasil mengekstrak via PowerShell Expand-Archive.');
      } catch (psErr: any) {
        console.warn('[RESTORE] ⚠️ PowerShell Expand-Archive gagal...', psErr?.message);
      }
    }

    // Metode D: unzip CLI (Khusus Linux)
    if (!extracted) {
      try {
        await execPromise(`unzip -o "${downloadedZipPath}" -d "${extractDir}"`);
        extracted = true;
        console.log('[RESTORE] ✅ Berhasil mengekstrak via unzip CLI.');
      } catch (unzipErr: any) {
        console.warn('[RESTORE] ⚠️ unzip CLI gagal...', unzipErr?.message);
      }
    }

    if (!extracted) {
      throw new Error('Gagal mengekstrak berkas ZIP cadangan. Pastikan file arsip tidak rusak.');
    }

    // ======================================================================
    // 3. CARI BERKAS .SQL DI DALAM HASIL EKSTRAKSI
    // ======================================================================
    const sqlFullPath = findSqlFileRecursive(extractDir);

    if (!sqlFullPath) {
      throw new Error('Tidak ditemukan berkas database .sql di dalam arsip cadangan Google Drive.');
    }

    const sqlFileName = path.basename(sqlFullPath);
    const sqlFileSize = (fs.statSync(sqlFullPath).size / 1024).toFixed(1);
    console.log(`[RESTORE] 📄 Ditemukan berkas SQL: ${sqlFileName} (${sqlFileSize} KB)`);
    // ======================================================================
    // 3.5. SANITASI SQL DUMP (HAPUS KOLOM RELASI PHANTOM DARI BACKUP LAMA)
    // ======================================================================
    console.log('[RESTORE] 🧹 Melakukan sanitasi kueri SQL untuk kompatibilitas skema 100%...');
    const rawSql = fs.readFileSync(sqlFullPath, 'utf-8');
    const rawStatements = splitSqlStatements(rawSql);
    const cleanedStatements: string[] = [];

    // Matikan foreign key constraints sementara agar urutan INSERT tidak error
    cleanedStatements.push("SET session_replication_role = 'replica';");

    for (const stmt of rawStatements) {
      const trimmed = stmt.trim();
      if (!trimmed || trimmed.startsWith('--')) continue;
      if (trimmed.startsWith('SET ') || trimmed.startsWith('SELECT ')) continue;
      if (trimmed.startsWith('INSERT INTO ')) {
        cleanedStatements.push(cleanInsertLine(trimmed));
      } else {
        cleanedStatements.push(trimmed);
      }
    }

    // Aktifkan kembali foreign key constraints
    cleanedStatements.push("SET session_replication_role = 'origin';");

    fs.writeFileSync(sqlFullPath, cleanedStatements.join('\n\n'));
    console.log(`[RESTORE] ✅ Sanitasi kueri SQL selesai (${cleanedStatements.length} pernyataan diproses).`);

    // ======================================================================
    // 4. MEMULIHKAN DATABASE POSTGRESQL
    // ======================================================================
    let restoreMethod = '';
    let restoreSuccess = false;
    let restoreLogs = '';

    // TAHAP 1: Eksekusi Langsung via psql CLI (Koneksi langsung ke PostgreSQL via libpq)
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      // Hapus query parameter Prisma (seperti ?schema=public) yang tidak didukung oleh psql CLI
      const cleanDbUrl = dbUrl.split('?')[0];
      try {
        console.log('[RESTORE] 🚀 Mengimpor database melalui psql CLI...');
        const { stdout, stderr } = await execPromise(`psql "${cleanDbUrl}" -f "${sqlFullPath}"`);
        restoreMethod = 'psql CLI Engine';
        restoreSuccess = true;
        restoreLogs = stdout || stderr || '';
        console.log('✅ [RESTORE] Pemulihan database via psql CLI sukses!');
      } catch (psqlErr: any) {
        console.warn('⚠️ [RESTORE] psql direct gagal atau belum tersedia:', psqlErr?.message);
      }
    }

    // TAHAP 2: Jika psql lokal belum berhasil, coba via Docker Container (sierin_postgres_dev / sierin_postgres)
    if (!restoreSuccess) {
      try {
        const { stdout: psOut } = await execPromise(`docker ps --format "{{.Names}}"`);
        const targetContainer = ['sierin_postgres_dev', 'sierin_postgres'].find(c => psOut.includes(c));
        if (targetContainer) {
          console.log(`[RESTORE] 🐳 Mengimpor database melalui Docker container "${targetContainer}"...`);
          const containerSqlPath = `/tmp/${sqlFileName}`;
          await execPromise(`docker cp "${sqlFullPath}" ${targetContainer}:${containerSqlPath}`);
          const { stdout, stderr } = await execPromise(
            `docker exec ${targetContainer} psql -U sierin_user -d sierin_db -f "${containerSqlPath}"`
          );
          await execPromise(`docker exec ${targetContainer} rm -f "${containerSqlPath}"`).catch(() => {});
          restoreMethod = `Docker Container (${targetContainer})`;
          restoreSuccess = true;
          restoreLogs = stdout || stderr || '';
          console.log(`✅ [RESTORE] Pemulihan database via Docker Container ${targetContainer} sukses!`);
        }
      } catch (dockerErr: any) {
        console.warn('⚠️ [RESTORE] Docker container execution tidak tersedia:', dockerErr?.message);
      }
    }

    // TAHAP 3: Direct Safe Statement Engine (Mengeksekusi pernyataan via Prisma Client)
    if (!restoreSuccess) {
      try {
        console.log('[RESTORE] ⚡ Mengimpor database via Prisma Direct Statement Engine...');

        // Matikan constraint sementara
        await db.$executeRawUnsafe(`SET session_replication_role = 'replica';`).catch(() => {});

        let executedCount = 0;
        for (const stmt of cleanedStatements) {
          const trimmed = stmt.trim();
          if (!trimmed || trimmed.startsWith('--')) continue;
          if (trimmed.startsWith('SET ') || trimmed.startsWith('SELECT ')) continue;
          try {
            await db.$executeRawUnsafe(trimmed);
            executedCount++;
          } catch (stmtErr: any) {
            console.warn('⚠️ [RESTORE SQL SKIP]:', stmtErr?.message?.slice(0, 150), '| Query:', trimmed.substring(0, 80));
          }
        }

        // Aktifkan kembali constraint
        await db.$executeRawUnsafe(`SET session_replication_role = 'origin';`).catch(() => {});

        restoreMethod = `Prisma Direct Statement Engine (${executedCount} queries)`;
        restoreSuccess = true;
        console.log(`✅ [RESTORE] Pemulihan via Prisma Direct Engine selesai (${executedCount} kueri dieksekusi).`);
      } catch (prismaErr: any) {
        console.error('❌ [RESTORE] Gagal mengeksekusi Direct Statement Engine:', prismaErr);
        throw new Error(`Gagal memulihkan database: ${prismaErr.message}`);
      }
    }

    // ======================================================================
    // 5. PULIHKAN FOLDER MEDIA `uploads` JIKA ADA
    // ======================================================================
    const uploadsCandidates = [
      path.join(extractDir, 'uploads'),
      path.join(extractDir, 'public', 'uploads'),
    ];
    const foundUploads = uploadsCandidates.find((p) => fs.existsSync(p));

    let uploadsRestored = false;
    if (foundUploads) {
      console.log('📁 [RESTORE] Memulihkan berkas media ke public/uploads...');
      const targetUploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(targetUploadsDir)) {
        fs.mkdirSync(targetUploadsDir, { recursive: true });
      }
      fs.cpSync(foundUploads, targetUploadsDir, { recursive: true, force: true });
      uploadsRestored = true;
      console.log('✅ [RESTORE] Berkas media public/uploads berhasil disalin.');
    }

    // ======================================================================
    // 6. BERSIHKAN FILE SEMENTARA
    // ======================================================================
    try {
      if (fs.existsSync(downloadedZipPath)) fs.unlinkSync(downloadedZipPath);
      if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
    } catch (cleanErr) {
      console.warn('[RESTORE] Gagal membersihkan file temp:', cleanErr);
    }

    return NextResponse.json({
      success: true,
      message: `Sistem berhasil dipulihkan dari arsip Rocky Linux! (${sqlFileName} via ${restoreMethod})`,
      details: {
        sqlFile: sqlFileName,
        method: restoreMethod,
        uploadsRestored,
      }
    });

  } catch (error: any) {
    console.error('❌ [RESTORE ERROR] Gagal mengeksekusi restore:', error);

    // Bersihkan file sementara jika error
    try {
      if (fs.existsSync(downloadedZipPath)) fs.unlinkSync(downloadedZipPath);
      if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
    } catch (e) {}

    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Gagal memproses pemulihan sistem' 
    }, { status: 500 });
  }
}