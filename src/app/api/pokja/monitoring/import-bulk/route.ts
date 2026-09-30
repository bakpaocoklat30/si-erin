import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ success: false, error: 'Akses tidak diizinkan.' }, { status: 403 });
    }

    const body = await req.json();
    const { assignments } = body;
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({ success: false, error: 'Data kosong.' }, { status: 400 });
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    const activePeriod = await prisma.period.findFirst({ where: { active: true } });

    for (const [index, row] of assignments.entries()) {
      try {
        const teacherName = row['Nama Guru'] || row['NAMA GURU'] || row['Guru'];
        const industryName = row['Industri Tujuan'] || row['INDUSTRI TUJUAN'] || row['Industri'];
        const dateStr = row['Tanggal Berangkat'] || row['TANGGAL BERANGKAT'] || row['Tanggal'];

        if (!teacherName || !industryName) {
          failCount++;
          errors.push(`Baris ${index + 2}: Nama Guru atau Industri kosong.`);
          continue;
        }

        // Cari Guru (kasus insensitif dengan contains)
        const teacher = await prisma.user.findFirst({
          where: { name: { contains: teacherName }, role: 'PEMBIMBING' }
        });

        // Cari Industri
        const industry = await prisma.industry.findFirst({
          where: { name: { contains: industryName } }
        });

        if (!teacher) {
          failCount++;
          errors.push(`Baris ${index + 2}: Guru '${teacherName}' tidak ditemukan di sistem.`);
          continue;
        }

        if (!industry) {
          failCount++;
          errors.push(`Baris ${index + 2}: Industri '${industryName}' tidak ditemukan di sistem.`);
          continue;
        }

        let monitoringDate = new Date();
        if (dateStr) {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) monitoringDate = parsed;
        }

        await prisma.monitoringAssignment.create({
          data: {
            industryId: industry.id,
            teacherId: teacher.id,
            periodId: activePeriod?.id,
            monitoringDate: monitoringDate,
            purpose: row['Tujuan'] || row['Keterangan'] || 'Monitoring Prakerin',
            status: 'TERJADWAL',
            transportType: 'KENDARAAN_UMUM'
          }
        });

        successCount++;
      } catch (err: any) {
        failCount++;
        errors.push(`Baris ${index + 2}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: { successCount, failCount, errors }
    });

  } catch (error: any) {
    console.error('Import Bulk Monitoring Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan sistem internal.' }, { status: 500 });
  }
}
