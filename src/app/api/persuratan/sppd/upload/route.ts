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
    const file = formData.get('file') as File;
    const id = formData.get('id') as string;
    const type = formData.get('type') as string;

    if (!file || !id || !type) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `TTE_${type}_${id}_${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/${fileName}`;

    // Ambil assignment saat ini untuk cek status
    const assignment = await db.monitoringAssignment.findUnique({
      where: { id }
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Penugasan tidak ditemukan' }, { status: 404 });
    }

    const updateData: any = {};
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
