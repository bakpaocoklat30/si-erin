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
    if (base64String.length > 100 && !base64String.startsWith('/') && !base64String.startsWith('http')) {
      try {
        const cleanBase64 = base64String.replace(/[\r\n\s]+/g, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        let extension = folder === 'logos' ? 'png' : 'pdf';
        
        // Sniff magic bytes
        if (buffer.length >= 4) {
          if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
            extension = 'pdf';
          } else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
            extension = 'png';
          } else if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
            extension = 'jpg';
          } else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
            extension = 'gif';
          } else if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
            extension = 'webp';
          }
        }
        return writeBufferToFile(buffer, folder, prefix, extension);
      } catch (e) {
        return base64String;
      }
    }
    return base64String;
  }

  const mimeType = match[1].toLowerCase();
  const base64Data = match[2].replace(/[\r\n\s]+/g, '');

  let extension = 'bin';
  if (mimeType.includes('pdf')) {
    extension = 'pdf';
  } else if (mimeType.includes('png')) {
    extension = 'png';
  } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
    extension = 'jpg';
  } else if (mimeType.includes('webp')) {
    extension = 'webp';
  } else if (mimeType.includes('svg')) {
    extension = 'svg';
  } else if (mimeType.includes('gif')) {
    extension = 'gif';
  } else if (folder === 'logos') {
    extension = 'png';
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

