// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Membuat API Endpoint untuk membaca & menyimpan kredensial Google Drive ke tabel SystemSetting Prisma.
// ✨ Fitur Baru: In-App Credential Management Endpoint.
// 🎨 UI/UX Update: N/A (API Handler)
// 🔧 Bug Fix: Menangani sanitasi karakter newline (\n) pada private key agar valid saat disimpan.
// 🚀 Inovasi: Zero-Downtime Dynamic Google Auth Settings API.
// ----------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getGDriveCredentials } from '@/lib/gdrive';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const credentials = await getGDriveCredentials();

    return NextResponse.json({
      success: true,
      credentials,
    });
  } catch (error: any) {
    console.error('Error GET GDrive settings:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengambil kredensial' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await request.json();
    const { clientEmail, privateKey, folderId, impersonateUser } = body;

    if (!clientEmail || !privateKey) {
      return NextResponse.json(
        { error: 'Client Email dan Private Key wajib diisi!' },
        { status: 400 }
      );
    }

    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    await prisma.systemSetting.upsert({
      where: { key: 'GOOGLE_CLIENT_EMAIL' },
      update: { value: clientEmail.trim() },
      create: { key: 'GOOGLE_CLIENT_EMAIL', value: clientEmail.trim() },
    });

    await prisma.systemSetting.upsert({
      where: { key: 'GOOGLE_PRIVATE_KEY' },
      update: { value: formattedPrivateKey.trim() },
      create: { key: 'GOOGLE_PRIVATE_KEY', value: formattedPrivateKey.trim() },
    });

    await prisma.systemSetting.upsert({
      where: { key: 'GOOGLE_DRIVE_FOLDER_ID' },
      update: { value: (folderId || '').trim() },
      create: { key: 'GOOGLE_DRIVE_FOLDER_ID', value: (folderId || '').trim() },
    });

    if (impersonateUser !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'GOOGLE_USER_TO_IMPERSONATE' },
        update: { value: (impersonateUser || '').trim() },
        create: { key: 'GOOGLE_USER_TO_IMPERSONATE', value: (impersonateUser || '').trim() },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Kredensial Google Drive berhasil disimpan di Database!',
    });
  } catch (error: any) {
    console.error('Error POST GDrive settings:', error);
    return NextResponse.json({ error: error.message || 'Gagal menyimpan kredensial' }, { status: 500 });
  }
}