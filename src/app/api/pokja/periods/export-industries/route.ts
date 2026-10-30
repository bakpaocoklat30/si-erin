// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Pembuatan API endpoint khusus ekspor data industri yang ditempati PKL per periode & per jurusan Pokja.
// ✨ Fitur Baru:
//    - Export CSV Industri PKL Terpilih per Periode.
//    - Isolasi & Pemisahan Otomatis per Jurusan Pokja (TKJ, Otomotif, RPL, dll.).
//    - 15 Kolom Standar CSV (Nama Perusahaan, Kode Perusahaan, Alamat, Telepon, Email, Website, Latitude, Longitude, Radius (meter), Jenis Industri, Deskripsi, Nama Kontak Person, Telepon Kontak Person, Email Kontak Person, Maksimal Siswa).
// 🔧 Bug Fix: Menghindari kebocoran data DUDI antar jurusan Pokja saat ekspor.
// 🚀 Inovasi: Clean CSV Exporter with UTF-8 BOM & RFC-4180 Escaping.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { loadPeriodContext, resolvePlacementPeriod, parseActiveIndustries } from '@/lib/period-resolver';

const ALLOWED_ROLES = ['POKJA', 'TIM_POKJA', 'ADMIN', 'SUPER_ADMIN', 'TATA_USAHA', 'TATA USAHA', 'TU'];

function escapeCsvCell(val: any): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).trim().replace(/"/g, '""');
  return `"${str}"`;
}

function formatFullAddress(ind: any): string {
  if (ind.address && ind.address !== 'Alamat Belum Diisi' && ind.address.trim().length > 5) {
    return ind.address.trim();
  }
  const parts = [
    ind.address && ind.address !== 'Alamat Belum Diisi' ? ind.address.trim() : null,
    ind.rt ? `RT ${ind.rt}` : null,
    ind.rw ? `RW ${ind.rw}` : null,
    ind.desaKelurahan ? `Desa/Kel. ${ind.desaKelurahan}` : null,
    ind.subDistrict ? `Kec. ${ind.subDistrict}` : null,
    ind.regency,
    ind.province,
    ind.postalCode
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '-';
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/__+/g, '_');
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();
    const userDepartment = (session?.user as any)?.department;

    if (!session || !userRole || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Unauthorized - Akses ditolak' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');
    const requestedDept = searchParams.get('department');
    const format = searchParams.get('format'); // 'csv' or default 'json'

    if (!periodId) {
      return NextResponse.json(
        { error: 'Parameter periodId wajib disertakan' },
        { status: 400 }
      );
    }

    // 1. Ambil Periode dari Database
    const period = await (db as any).internshipPeriod.findUnique({
      where: { id: periodId },
      select: {
        id: true,
        name: true,
        department: true,
        startDate: true,
        endDate: true,
        activeIndustries: true
      }
    });

    if (!period) {
      return NextResponse.json(
        { error: 'Periode tidak ditemukan' },
        { status: 404 }
      );
    }

    // 2. Kunci Jurusan Pokja jika role adalah Pokja yang memiliki jurusan spesifik
    const isPokjaScoped = (userRole === 'POKJA' || userRole === 'TIM_POKJA') &&
      userDepartment &&
      userDepartment.toLowerCase() !== 'semua jurusan' &&
      userDepartment.toUpperCase() !== 'ALL';

    const activeIndustriesConfig = parseActiveIndustries(period.activeIndustries);

    // 3. Ambil seluruh penempatan yang sudah valid/ditempati
    const periodCtx = await loadPeriodContext();

    const placements = await db.internshipPlacement.findMany({
      select: {
        id: true,
        groupId: true,
        industryId: true,
        startDate: true,
        endDate: true,
        student: {
          select: {
            id: true,
            name: true,
            className: true,
            department: true
          }
        },
        industry: {
          select: {
            id: true,
            name: true,
            nib: true,
            address: true,
            rt: true,
            rw: true,
            dusun: true,
            desaKelurahan: true,
            subDistrict: true,
            regency: true,
            province: true,
            postalCode: true,
            latitude: true,
            longitude: true,
            phone: true,
            email: true,
            website: true,
            sector: true,
            contactPerson: true,
            totalQuota: true,
            jobDescription: true,
            department: true
          }
        }
      }
    });

    // 4. Kelompokkan industri yang DITEMPATI PKL per Jurusan pada periode ini
    // Struktur: Map<JurusanName, Map<IndustryId, { industry, studentCount, students }>>
    const deptIndustriesMap = new Map<string, Map<string, { industry: any; studentCount: number; students: string[] }>>();

    for (const pl of placements) {
      if (!pl.industry || !pl.industryId) continue;

      const resolvedP = resolvePlacementPeriod(pl, periodCtx);
      if (!resolvedP || resolvedP.id !== period.id) continue;

      const studentDept = pl.student?.department?.trim() || 'Umum';

      // Jika role adalah Pokja scoped, abaikan siswa dari jurusan lain
      if (isPokjaScoped) {
        const uDeptLower = userDepartment.toLowerCase();
        const sDeptLower = studentDept.toLowerCase();
        const match = sDeptLower.includes(uDeptLower) || uDeptLower.includes(sDeptLower);
        if (!match) continue;
      }

      if (!deptIndustriesMap.has(studentDept)) {
        deptIndustriesMap.set(studentDept, new Map());
      }

      const indMap = deptIndustriesMap.get(studentDept)!;
      if (!indMap.has(pl.industryId)) {
        indMap.set(pl.industryId, {
          industry: pl.industry,
          studentCount: 0,
          students: []
        });
      }

      const entry = indMap.get(pl.industryId)!;
      entry.studentCount++;
      if (pl.student?.name) {
        entry.students.push(pl.student.name);
      }
    }

    // 5. Jika format adalah JSON (untuk metadata dan pilihan di UI)
    if (format !== 'csv') {
      const departmentsSummary: any[] = [];

      for (const [deptName, indMap] of Array.from(deptIndustriesMap.entries())) {
        let totalStudents = 0;
        indMap.forEach((v: any) => { totalStudents += v.studentCount; });

        departmentsSummary.push({
          name: deptName,
          industryCount: indMap.size,
          studentCount: totalStudents,
          downloadUrl: `/api/pokja/periods/export-industries?periodId=${encodeURIComponent(period.id)}&department=${encodeURIComponent(deptName)}&format=csv`
        });
      }

      // Sort summary by name
      departmentsSummary.sort((a, b) => a.name.localeCompare(b.name));

      return NextResponse.json({
        success: true,
        period: {
          id: period.id,
          name: period.name,
          startDate: period.startDate,
          endDate: period.endDate,
          department: period.department
        },
        userRole,
        userDepartment: isPokjaScoped ? userDepartment : null,
        departments: departmentsSummary
      });
    }

    // 6. GENERASI FILE CSV
    // Tentukan jurusan yang akan diekspor
    let targetDept = requestedDept?.trim();
    if (isPokjaScoped) {
      targetDept = userDepartment;
    }

    // Kumpulkan industri yang relevan
    const exportIndMap = new Map<string, { industry: any; studentCount: number }>();

    if (targetDept && targetDept !== 'ALL' && targetDept !== 'Semua Jurusan') {
      const targetLower = targetDept.toLowerCase();
      for (const [deptName, indMap] of Array.from(deptIndustriesMap.entries())) {
        const dLower = deptName.toLowerCase();
        if (dLower.includes(targetLower) || targetLower.includes(dLower)) {
          for (const [indId, item] of Array.from(indMap.entries())) {
            if (!exportIndMap.has(indId)) {
              exportIndMap.set(indId, { industry: item.industry, studentCount: 0 });
            }
            exportIndMap.get(indId)!.studentCount += item.studentCount;
          }
        }
      }
    } else {
      // Ambil seluruh jurusan (jika bukan Pokja scoped)
      for (const [, indMap] of Array.from(deptIndustriesMap.entries())) {
        for (const [indId, item] of Array.from(indMap.entries())) {
          if (!exportIndMap.has(indId)) {
            exportIndMap.set(indId, { industry: item.industry, studentCount: 0 });
          }
          exportIndMap.get(indId)!.studentCount += item.studentCount;
        }
      }
    }

    // 7. Siapkan 15 Kolom Sesuai Permintaan Spesifik:
    // Nama Perusahaan, Kode Perusahaan, Alamat, Telepon, Email, Website, Latitude, Longitude, Radius (meter), Jenis Industri, Deskripsi, Nama Kontak Person, Telepon Kontak Person, Email Kontak Person, Maksimal Siswa
    const headers = [
      'Nama Perusahaan',
      'Kode Perusahaan',
      'Alamat',
      'Telepon',
      'Email',
      'Website',
      'Latitude',
      'Longitude',
      'Radius (meter)',
      'Jenis Industri',
      'Deskripsi',
      'Nama Kontak Person',
      'Telepon Kontak Person',
      'Email Kontak Person',
      'Maksimal Siswa'
    ];

    const csvRows = [headers.join(',')];

    // Urutkan industri berdasarkan nama ascending
    const sortedIndustries = Array.from(exportIndMap.values()).sort((a, b) => 
      (a.industry.name || '').localeCompare(b.industry.name || '')
    );

    for (const item of sortedIndustries) {
      const ind = item.industry;

      // Hitung Maksimal Siswa (Prioritas: Quota Periode -> Quota Total DUDI -> Jumlah Siswa Ditempati)
      const quotaCfg = activeIndustriesConfig.find(x => x.industryId === ind.id);
      let maxSiswa: number | string = item.studentCount;
      if (quotaCfg) {
        if (!quotaCfg.isUnlimited && quotaCfg.quota > 0) {
          maxSiswa = quotaCfg.quota;
        } else if (ind.totalQuota && ind.totalQuota > 0) {
          maxSiswa = ind.totalQuota;
        }
      } else if (ind.totalQuota && ind.totalQuota > 0) {
        maxSiswa = ind.totalQuota;
      }

      const fullAddress = formatFullAddress(ind);
      const kodePerusahaan = ind.nib?.trim() || ind.id;
      const cleanPhone = (ind.phone && ind.phone.trim() !== '-') ? ind.phone.trim() : '';
      const cleanEmail = ind.email?.trim() || '';
      const cleanWebsite = ind.website?.trim() || '';
      const cleanLat = ind.latitude?.trim() || '';
      const cleanLng = ind.longitude?.trim() || '';
      const jenisIndustri = ind.sector?.trim() || 'Teknologi & Informasi';
      const deskripsi = (ind.jobDescription?.trim() || ind.sector?.trim() || ind.name?.trim() || '').replace(/[\r\n]+/g, ' ');
      const kontakPerson = ind.contactPerson?.trim() || 'HRD / Pembimbing Industri';

      const row = [
        escapeCsvCell(ind.name || ''),
        escapeCsvCell(kodePerusahaan),
        escapeCsvCell(fullAddress),
        escapeCsvCell(cleanPhone),
        escapeCsvCell(cleanEmail),
        escapeCsvCell(cleanWebsite),
        escapeCsvCell(cleanLat),
        escapeCsvCell(cleanLng),
        escapeCsvCell('100'), // Radius Geofencing default 100 meter
        escapeCsvCell(jenisIndustri),
        escapeCsvCell(deskripsi),
        escapeCsvCell(kontakPerson),
        escapeCsvCell(cleanPhone), // Telepon Kontak Person
        escapeCsvCell(cleanEmail), // Email Kontak Person
        escapeCsvCell(maxSiswa)
      ];

      csvRows.push(row.join(','));
    }

    // Sertakan UTF-8 BOM (\uFEFF) agar Microsoft Excel membuka karakter bahasa Indonesia dengan sempurna
    const csvContent = '\uFEFF' + csvRows.join('\r\n');

    const periodSlug = sanitizeFilename(period.name);
    const deptSlug = targetDept ? sanitizeFilename(targetDept) : 'Semua_Jurusan';
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Industri_PKL_${periodSlug}_${deptSlug}_${timestamp}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });

  } catch (error: any) {
    console.error('Fatal error in export-industries:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal saat mengekspor data industri', details: error.message },
      { status: 500 }
    );
  }
}
