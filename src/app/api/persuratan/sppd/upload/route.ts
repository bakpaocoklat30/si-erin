import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';
import { notifyTeacherMonitoringTte } from '@/lib/whatsapp';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase();
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'TATA_USAHA', 'POKJA', 'TIM_POKJA', 'GURU', 'PEMBIMBING'].includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const action = formData.get('action') as string;
    const id = formData.get('id') as string;

    if (!id) {
      return NextResponse.json({ error: 'ID Penugasan wajib diisi' }, { status: 400 });
    }

    // Ambil assignment saat ini untuk cek status
    const assignment = await db.monitoringAssignment.findUnique({
      where: { id }
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Penugasan tidak ditemukan' }, { status: 404 });
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    function parsePhotos(raw: any): string[] {
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    }

    // Aksi: Hapus Foto Kegiatan
    if (action === 'DELETE_PHOTO') {
      const photoUrl = formData.get('photoUrl') as string;
      const currentPhotos = parsePhotos(assignment.activityPhotos);
      const updatedPhotos = currentPhotos.filter(p => p !== photoUrl);

      // Opsional: Hapus file fisik jika berada di folder uploads
      if (photoUrl && photoUrl.startsWith('/uploads/')) {
        const localPath = path.join(process.cwd(), 'public', photoUrl);
        if (fs.existsSync(localPath)) {
          try { fs.unlinkSync(localPath); } catch (e) { /* ignore */ }
        }
      }

      await db.monitoringAssignment.update({
        where: { id },
        data: { activityPhotos: updatedPhotos }
      });

      return NextResponse.json({ success: true, message: 'Foto berhasil dihapus', activityPhotos: updatedPhotos });
    }

    const type = (formData.get('type') as string || '').toUpperCase();
    const updateData: any = {};

    // Aksi: Upload Foto Kegiatan (Maksimal 3 Foto)
    if (type === 'PHOTO' || type === 'FOTO' || type === 'FOTO_KEGIATAN') {
      const currentPhotos = parsePhotos(assignment.activityPhotos);
      const rawFiles = formData.getAll('photos') as File[];
      const singleFile = formData.get('file') as File;
      const uploadFiles: File[] = rawFiles.length > 0 ? rawFiles : (singleFile ? [singleFile] : []);

      if (uploadFiles.length === 0) {
        return NextResponse.json({ error: 'Tidak ada berkas foto yang dipilih' }, { status: 400 });
      }

      if (currentPhotos.length + uploadFiles.length > 20) {
        return NextResponse.json({
          error: `Maksimal 20 foto kegiatan diperbolehkan. Saat ini sudah ada ${currentPhotos.length} foto, mencoba menambah ${uploadFiles.length} foto lagi.`
        }, { status: 400 });
      }

      const newPhotoUrls: string[] = [];
      for (let i = 0; i < uploadFiles.length; i++) {
        const pFile = uploadFiles[i];
        const bytes = await pFile.arrayBuffer();
        const buffer = Buffer.from(bytes);

        let pExt = 'jpg';
        const origExt = path.extname(pFile.name || '').toLowerCase().replace('.', '');
        if (['jpg', 'jpeg', 'png', 'webp'].includes(origExt)) {
          pExt = origExt;
        } else if (pFile.type?.includes('png')) {
          pExt = 'png';
        } else if (pFile.type?.includes('webp')) {
          pExt = 'webp';
        }

        const fileName = `FOTO_MONITORING_${id}_${Date.now()}_${i}.${pExt}`;
        const filePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(filePath, buffer);
        newPhotoUrls.push(`/uploads/${fileName}`);
      }

      const updatedPhotos = [...currentPhotos, ...newPhotoUrls];
      await db.monitoringAssignment.update({
        where: { id },
        data: { activityPhotos: updatedPhotos }
      });

      return NextResponse.json({
        success: true,
        message: `Berhasil mengunggah ${newPhotoUrls.length} foto kegiatan!`,
        activityPhotos: updatedPhotos
      });
    }

    // Aksi: Upload Dokumen Biasa (TUGAS, SPPD, LAPORAN)
    const file = formData.get('file') as File;
    if (!file || !type) {
      return NextResponse.json({ error: 'Data berkas atau jenis dokumen tidak lengkap' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let ext = 'pdf';
    const originalExt = path.extname(file.name || '').toLowerCase().replace('.', '');
    if (['jpg', 'jpeg', 'png', 'webp'].includes(originalExt)) {
      ext = originalExt;
    } else if (file.type?.includes('image/png')) {
      ext = 'png';
    } else if (file.type?.includes('image/jpeg')) {
      ext = 'jpg';
    } else if (file.type?.includes('image/webp')) {
      ext = 'webp';
    }

    const fileName = `TTE_${type}_${id}_${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/${fileName}`;

    if (type === 'TUGAS') {
      updateData.suratTugasUrl = fileUrl;
    } else if (type === 'SPPD') {
      updateData.sppdUrl = fileUrl;
    } else if (type === 'LAPORAN') {
      updateData.laporanUrl = fileUrl;
    }

    // Jika kedua file sudah terupload (atau ini yang terakhir), ubah status menjadi SELESAI_TTE
    const hasTugas = type === 'TUGAS' ? true : !!assignment.suratTugasUrl;
    const hasSppd = type === 'SPPD' ? true : !!assignment.sppdUrl;

    if (hasTugas && hasSppd) {
      updateData.status = 'SELESAI_TTE';
    }

    await db.monitoringAssignment.update({
      where: { id },
      data: updateData
    });

    // 📲 TRIGGER NOTIFIKASI WHATSAPP KE GURU PEMBIMBING
    if (hasTugas && hasSppd) {
      try {
        const fullAssign = await db.monitoringAssignment.findUnique({
          where: { id },
          include: { teacher: true, industry: true }
        });
        if (fullAssign?.teacher?.phone) {
          notifyTeacherMonitoringTte({
            teacherPhone: fullAssign.teacher.phone,
            teacherName: fullAssign.teacher.name || 'Guru Pembimbing',
            industryName: fullAssign.industry?.name || '-',
            letterNumber: fullAssign.letterNumber || fullAssign.sppdNumber || '-',
            monitoringDate: fullAssign.monitoringDate ? new Date(fullAssign.monitoringDate).toLocaleDateString('id-ID', { dateStyle: 'full' }) : '-'
          }).catch((waErr) => {
            console.warn('[WAHA] Warning kirim WA ke Guru Pembimbing:', waErr);
          });
        }
      } catch (e) {
        console.warn('Gagal mempersiapkan data WA guru:', e);
      }
    }

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error: any) {
    console.error('Upload TTE Error:', error);
    return NextResponse.json({ error: 'Gagal mengunggah file' }, { status: 500 });
  }
}
