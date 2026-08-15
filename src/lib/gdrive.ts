// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Mengubah pembacaan kredensial Google Drive menjadi Database-First (membaca tabel SystemSetting) dengan fallback ke process.env.
// ✨ Fitur Baru: Support Dynamic In-App Credentials & Impersonation Handling.
// 🎨 UI/UX Update: N/A (Backend Core Library)
// 🔧 Bug Fix: Mengeliminasi error "Kredensial GOOGLE_PRIVATE_KEY belum diatur di .env" dengan membaca konfigurasi dari database.
// 🚀 Inovasi: Enterprise Hybrid Cloud Credentials Manager for Next.js & Prisma.
// ----------------------------------------------------------------------

import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import fs from 'fs';

const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'];

/**
 * Membaca kredensial Google Drive dari Database (SystemSetting) dengan fallback ke .env
 */
export async function getGDriveCredentials() {
  try {
    const clientEmailSetting = await prisma.systemSetting.findUnique({
      where: { key: 'GOOGLE_CLIENT_EMAIL' },
    });
    const privateKeySetting = await prisma.systemSetting.findUnique({
      where: { key: 'GOOGLE_PRIVATE_KEY' },
    });
    const folderIdSetting = await prisma.systemSetting.findUnique({
      where: { key: 'GOOGLE_DRIVE_FOLDER_ID' },
    });
    const impersonateSetting = await prisma.systemSetting.findUnique({
      where: { key: 'GOOGLE_USER_TO_IMPERSONATE' },
    });

    const clientEmail = clientEmailSetting?.value || process.env.GOOGLE_CLIENT_EMAIL || '';
    let privateKey = privateKeySetting?.value || process.env.GOOGLE_PRIVATE_KEY || '';
    const folderId = folderIdSetting?.value || process.env.GOOGLE_DRIVE_FOLDER_ID || '';
    const impersonateUser = impersonateSetting?.value || process.env.GOOGLE_USER_TO_IMPERSONATE || '';

    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    return { clientEmail, privateKey, folderId, impersonateUser };
  } catch (error) {
    // Fallback jika database belum dapat diakses
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    if (privateKey) privateKey = privateKey.replace(/\\n/g, '\n');

    return {
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL || '',
      privateKey: privateKey,
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
      impersonateUser: process.env.GOOGLE_USER_TO_IMPERSONATE || '',
    };
  }
}

/**
 * Menginisialisasi Klien Google Drive API
 */
export async function getDriveClient() {
  const { clientEmail, privateKey, impersonateUser } = await getGDriveCredentials();

  if (!clientEmail || !privateKey) {
    throw new Error('Kredensial Google Drive (Client Email / Private Key) belum dikonfigurasi!');
  }

  const auth = new google.auth.JWT(
    clientEmail,
    undefined,
    privateKey,
    SCOPES,
    impersonateUser && impersonateUser.trim() !== '' ? impersonateUser.trim() : undefined
  );

  return google.drive({ version: 'v3', auth });
}

/**
 * Mengunggah berkas lokal ke folder Google Drive
 */
export async function uploadFileToDrive(filePath: string, fileName: string, mimeType: string = 'application/zip') {
  const drive = await getDriveClient();
  const { folderId } = await getGDriveCredentials();

  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID belum dikonfigurasi di Pengaturan Aplikasi!');
  }

  const fileMetadata: any = {
    name: fileName,
    parents: [folderId.trim()],
  };

  const media = {
    mimeType: mimeType,
    body: fs.createReadStream(filePath),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    supportsAllDrives: true,
    fields: 'id, name, webViewLink, createdTime, size',
  });

  return response.data;
}

/**
 * Mengambil daftar riwayat berkas backup yang tersimpan di Google Drive
 */
export async function listDriveBackups() {
  const drive = await getDriveClient();
  const { folderId } = await getGDriveCredentials();

  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID belum dikonfigurasi di Pengaturan Aplikasi!');
  }

  const response = await drive.files.list({
    q: `'${folderId.trim()}' in parents and trashed = false`,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    fields: 'files(id, name, webViewLink, createdTime, size)',
    orderBy: 'createdTime desc',
    pageSize: 20,
  });

  return response.data.files || [];
}