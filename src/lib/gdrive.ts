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

/**
 * 📁 Mencari atau membuat folder di Google Drive (dengan in-memory caching untuk performa tinggi)
 */
export async function getOrCreateFolder(
  drive: any,
  folderName: string,
  parentFolderId: string,
  cache?: Map<string, string>
): Promise<string> {
  const cleanName = folderName.trim();
  const cacheKey = `${parentFolderId}:::${cleanName}`;

  if (cache && cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const escapedName = cleanName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  // 1. Cari apakah folder sudah ada di dalam parentFolderId
  const searchRes = await drive.files.list({
    q: `'${parentFolderId}' in parents and name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (searchRes.data.files && searchRes.data.files.length > 0) {
    const existingId = searchRes.data.files[0].id!;
    if (cache) cache.set(cacheKey, existingId);
    return existingId;
  }

  // 2. Buat folder baru jika belum ditemukan
  const createRes = await drive.files.create({
    requestBody: {
      name: cleanName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    supportsAllDrives: true,
    fields: 'id, name',
  });

  const newId = createRes.data.id!;
  if (cache) cache.set(cacheKey, newId);
  return newId;
}

/**
 * 📄 Mengunggah berkas buffer ke folder Google Drive atau memperbarui berkas yang sudah ada
 */
export async function uploadOrUpdateFileInDrive(
  drive: any,
  fileName: string,
  mimeType: string,
  buffer: Buffer,
  parentFolderId: string
): Promise<{ action: 'created' | 'updated'; file: any }> {
  const { Readable } = await import('stream');

  const cleanName = fileName.trim();
  const safeSearchName = cleanName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  // 1. Cek apakah berkas dengan nama tersebut sudah ada di folder tujuan
  let existingFileId: string | null = null;
  try {
    const searchRes = await drive.files.list({
      q: `'${parentFolderId}' in parents and name = '${safeSearchName}' and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 1,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      existingFileId = searchRes.data.files[0].id!;
    }
  } catch (searchErr: any) {
    console.warn(`[GDRIVE] Warning list files untuk "${cleanName}":`, searchErr?.message || searchErr);
  }

  // 2. Buat Readable stream langsung dari Buffer in-memory (100% aman tanpa ketergantungan disk/tmp)
  const media = {
    mimeType: mimeType || 'application/pdf',
    body: Readable.from(buffer),
  };

  try {
    if (existingFileId) {
      const updateRes = await drive.files.update({
        fileId: existingFileId,
        media: media,
        supportsAllDrives: true,
        fields: 'id, name, webViewLink, size',
      });
      console.log(`[GDRIVE] 🔄 Berkas "${cleanName}" diperbarui di Drive (ID: ${existingFileId})`);
      return { action: 'updated', file: updateRes.data };
    } else {
      const createRes = await drive.files.create({
        requestBody: {
          name: cleanName,
          parents: [parentFolderId],
        },
        media: media,
        supportsAllDrives: true,
        fields: 'id, name, webViewLink, size',
      });
      console.log(`[GDRIVE] ➕ Berkas "${cleanName}" baru berhasil dibuat di Drive (ID: ${createRes.data.id})`);
      return { action: 'created', file: createRes.data };
    }
  } catch (uploadErr: any) {
    const errorDetails = uploadErr?.response?.data?.error?.message || uploadErr?.message || String(uploadErr);
    console.error(`[GDRIVE ERROR] Gagal uploadOrUpdate berkas "${cleanName}" (Folder: ${parentFolderId}):`, errorDetails);
    throw new Error(`Google Drive API: ${errorDetails}`);
  }
}
