// 📋 CHANGELOG:
// ✅ Perubahan: Penambahan parameter `subject` (Impersonation) pada inisialisasi JWT untuk mengatasi error kuota 0 Byte Service Account.
// ✨ Fitur Baru: Workspace Domain-Wide Delegation Bypass.
// 🎨 UI/UX Update: N/A (Backend Core Library)
// 🔧 Bug Fix: Mengatasi error 'Service Accounts do not have storage quota'.
// 🚀 Inovasi: Enterprise Google Auth Impersonator.

import { google } from 'googleapis';
import fs from 'fs';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

/**
 * Mengambil Private Key langsung dari Environment
 */
function getPrivateKey(): string {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY || '';
  
  if (!rawKey) {
    throw new Error('Kredensial GOOGLE_PRIVATE_KEY belum diatur di .env');
  }

  // Normalisasi karakter newline
  return rawKey.replace(/\\n/g, '\n');
}

/**
 * Menginisialisasi Klien Google Drive API dengan dukungan OAuth Delegation
 */
export function getDriveClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();
  const impersonateUser = process.env.GOOGLE_USER_TO_IMPERSONATE;

  if (!clientEmail) {
    throw new Error('Kredensial GOOGLE_CLIENT_EMAIL belum diatur di .env');
  }

  // 🛡️ CRITICAL FIX: Jika ada email impersonate, Service Account akan menyamar menjadi user tersebut 
  // dan menggunakan kuota Google Drive milik user tersebut (bukan kuota 0 byte SA).
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
 * Mengunggah berkas lokal ke folder Google Drive tertentu
 */
export async function uploadFileToDrive(filePath: string, fileName: string, mimeType: string = 'application/zip') {
  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID belum diatur pada .env');
  }

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType: mimeType,
    body: fs.createReadStream(filePath),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    supportsAllDrives: true, // 🛡️ Tetap aktifkan untuk dukungan Shared Drives
    fields: 'id, name, webViewLink, createdTime, size',
  });

  return response.data;
}

/**
 * Mengambil daftar riwayat berkas backup yang tersimpan di Google Drive
 */
export async function listDriveBackups() {
  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID belum diatur pada .env');
  }

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    fields: 'files(id, name, webViewLink, createdTime, size)',
    orderBy: 'createdTime desc',
    pageSize: 20,
  });

  return response.data.files || [];
}