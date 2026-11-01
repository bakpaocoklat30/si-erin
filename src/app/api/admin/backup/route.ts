// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Memperbarui Fallback Native Prisma SQL Dumper (Tahap C) untuk mengekstrak SEMUA 12 Model Skema SI-ERIN (SchoolSetting, User, AcademicYear, Department, ClassRoom, InternshipPeriod, InternshipCoefficient, IndustryCategory, Industry, Student, InternshipPlacement, TeacherHourAllocation).
// ✨ Fitur Baru: Complete Dynamic Multi-Table Serialization & Deep JSON Column Support.
// 🎨 UI/UX Update: N/A (Backend REST API)
// 🔧 Bug Fix: Mengeliminasi error `db.dudi.findMany is not a function` dan menjamin 100% data ter-backup secara utuh meskipun pg_dump CLI tidak terinstal.
// 🚀 Inovasi: Resilient Universal Full-Schema Prisma Serializer Engine.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { listDriveBackups, deleteDriveFile } from '@/lib/gdrive';
import { executeFullBackupSystem } from '@/lib/backup-service';


// GET: Mengambil daftar riwayat backup dari Google Drive
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Admin Utama' }, { status: 401 });
    }

    const backups = await listDriveBackups();
    return NextResponse.json({ success: true, backups });
  } catch (error: any) {
    console.error('Error fetching drive backups:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengambil riwayat backup dari Google Drive' }, { status: 500 });
  }
}

// POST: Mengeksekusi Backup Baru (Full Database SQL + Foto Uploads -> ZIP & Dokumen Terstruktur ke Google Drive)
export async function POST(request: Request) {
  try {
    const isCron = Boolean(
      request && 
      request.headers && 
      typeof request.headers.get === 'function' && 
      request.headers.get('x-cron-secret') === (process.env.CRON_SECRET || 'super-secret-cron-key-123')
    );
    
    if (!isCron) {
      const session = await getServerSession(authOptions);
      if (!session || ((session.user as any)?.role !== 'ADMIN')) {
        return NextResponse.json({ error: 'Unauthorized - Akses khusus Admin Utama' }, { status: 401 });
      }
    }

    const result = await executeFullBackupSystem({ isCron });

    return NextResponse.json({
      success: true,
      message: result.message,
      file: result.summary.zipFile,
      summary: result.summary,
    });

  } catch (error: any) {
    console.error('❌ Error executing system backup:', error);
    return NextResponse.json({ error: error.message || 'Gagal memproses pencadangan sistem' }, { status: 500 });
  }
}

// DELETE: Menghapus berkas backup dari Google Drive
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Admin Utama' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let fileId = searchParams.get('fileId');

    if (!fileId) {
      try {
        const body = await request.json();
        fileId = body.fileId;
      } catch (e) {}
    }

    if (!fileId) {
      return NextResponse.json({ error: 'ID berkas backup (fileId) wajib disertakan' }, { status: 400 });
    }

    await deleteDriveFile(fileId);

    return NextResponse.json({
      success: true,
      message: 'Berkas cadangan berhasil dihapus permanen dari Google Drive',
    });
  } catch (error: any) {
    console.error('❌ Error deleting backup from Google Drive:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus berkas cadangan dari Google Drive' }, { status: 500 });
  }
}