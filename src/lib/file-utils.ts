import fs from 'fs';
import path from 'path';

/**
 * Saves a base64 string (can be a data URL) to a file in the public/uploads directory.
 * If the string is not a valid base64 data URL, it returns the original string.
 * This is useful for gracefully handling both new base64 uploads and existing URLs.
 * 
 * @param base64String The base64 string or data URL to save.
 * @param folder The subfolder inside public/uploads to save the file (e.g., 'surat').
 * @param prefix The prefix for the filename.
 * @returns The relative URL of the saved file (e.g., '/uploads/surat/prefix_123.pdf').
 */
export function saveBase64ToFile(base64String: string, folder: string = 'misc', prefix: string = 'file'): string {
  if (!base64String || typeof base64String !== 'string') {
    return base64String;
  }

  // Check if it's a base64 data URL (e.g., data:application/pdf;base64,JVBER...)
  const match = base64String.match(/^data:([a-zA-Z0-9-+/]+);base64,(.+)$/);
  
  if (!match) {
    // If it doesn't match the data URL format, but is purely base64 without prefix,
    // we could try to handle it. However, it's safer to just return if it doesn't look like a standard data URL upload.
    // Let's also check if it's a raw base64 string that is very long (indicative of a file).
    if (base64String.length > 500 && !base64String.startsWith('/') && !base64String.startsWith('http')) {
        // Assume it's a raw base64 string (defaulting to pdf)
        const buffer = Buffer.from(base64String, 'base64');
        return writeBufferToFile(buffer, folder, prefix, 'pdf');
    }
    return base64String;
  }

  const mimeType = match[1];
  const base64Data = match[2];

  let extension = 'bin';
  if (mimeType.includes('pdf')) {
    extension = 'pdf';
  } else if (mimeType.includes('png')) {
    extension = 'png';
  } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
    extension = 'jpg';
  }

  const buffer = Buffer.from(base64Data, 'base64');
  return writeBufferToFile(buffer, folder, prefix, extension);
}

function writeBufferToFile(buffer: Buffer, folder: string, prefix: string, extension: string): string {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', folder);
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fileName = `${prefix}_${Date.now()}.${extension}`;
  const filePath = path.join(uploadsDir, fileName);
  
  fs.writeFileSync(filePath, buffer);
  
  return `/uploads/${folder}/${fileName}`;
}

