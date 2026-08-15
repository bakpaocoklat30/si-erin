// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: API Endpoint yang secara otomatis melakukan Auto-Hydration antara Periode PKL dengan Data Koefisien.
// ✨ Fitur Baru: Automatic Period-to-Coefficient Mapper & Defensive Object Sanitizer.
// 🎨 UI/UX Update: N/A (Backend REST API)
// 🔧 Bug Fix: Menyelesaikan masalah kartu koefisien tidak muncul saat Periode PKL baru dibuat.
// 🚀 Inovasi: Auto-Hydrated Coefficient Data Provider.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

// Helper: Ubah Relasi Object menjadi Primitive String secara aman
function safeString(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    return val.year || val.name || val.code || '';
  }
  return String(val);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA', 'SUPER_ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Admin & Pokja' }, { status: 401 });
    }

    const prisma = db as any;

    // 1. Ambil seluruh data Periode PKL beserta relasi AcademicYear & Coefficient
    const periods = await prisma.internshipPeriod.findMany({
      include: {
        academicYear: true,
        coefficient: true,
        classes: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Jika belum ada periode sama sekali
    if (!periods || periods.length === 0) {
      return NextResponse.json({ success: true, coefficients: [], data: [] });
    }

    // 3. AUTO-HYDRATION: Mapping data agar setiap Periode PKL dijamin memiliki objek data koefisien
    const mappedCoefficients = periods.map((period: any) => {
      const coeff = period.coefficient || {};
      const ayString = safeString(period.academicYear?.year || period.academicYear || coeff.academicYear);

      return {
        id: coeff.id || period.id,
        periodId: period.id,
        periodName: period.name,
        academicYear: ayString || '2026/2027',
        startDate: period.startDate,
        endDate: period.endDate,
        isActive: period.isActive,
        totalClasses: coeff.totalClasses ?? (period.classes ? period.classes.length : 0),
        hoursPerClass: coeff.hoursPerClass ?? 18,
        totalStudents: coeff.totalStudents ?? 0,
        coefficient: coeff.coefficient ?? 0,
        notes: coeff.notes || '',
        createdAt: period.createdAt,
        updatedAt: period.updatedAt
      };
    });

    return NextResponse.json({
      success: true,
      coefficients: mappedCoefficients,
      data: mappedCoefficients
    });

  } catch (error: any) {
    console.error('Error GET /api/admin/coefficients:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data koefisien' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA', 'SUPER_ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { periodId, academicYear, periodName, totalClasses, hoursPerClass, totalStudents, notes } = body;

    if (!periodId) {
      return NextResponse.json({ error: 'ID Periode PKL wajib disertakan' }, { status: 400 });
    }

    const cls = Number(totalClasses) || 0;
    const hrs = Number(hoursPerClass) || 18;
    const std = Number(totalStudents) || 0;
    
    // Kalkulasi presisi di server
    const calculatedCoeff = std > 0 ? parseFloat(((cls * hrs) / std).toFixed(4)) : 0;

    const prisma = db as any;
    const ayString = safeString(academicYear) || '2026/2027';

    // Upsert (Update jika ada, Create jika belum)
    const result = await prisma.internshipCoefficient.upsert({
      where: { periodId },
      update: {
        academicYear: ayString,
        periodName: safeString(periodName) || 'Periode PKL',
        totalClasses: cls,
        hoursPerClass: hrs,
        totalStudents: std,
        coefficient: calculatedCoeff,
        notes: notes || null
      },
      create: {
        periodId,
        academicYear: ayString,
        periodName: safeString(periodName) || 'Periode PKL',
        totalClasses: cls,
        hoursPerClass: hrs,
        totalStudents: std,
        coefficient: calculatedCoeff,
        notes: notes || null
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Koefisien PKL berhasil diperbarui dan disinkronkan!',
      data: result
    });

  } catch (error: any) {
    console.error('Error POST /api/admin/coefficients:', error);
    return NextResponse.json({ error: error.message || 'Gagal menyimpan koefisien' }, { status: 500 });
  }
}