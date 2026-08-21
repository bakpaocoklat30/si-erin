export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// ==========================================
// HELPER SANITASI DATA (PREVENT PRISMA ERRORS)
// ==========================================

// Membersihkan string opsional: mengubah "" atau "null" menjadi null asli untuk DB Prisma
function cleanOptionalString(value: any): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' || trimmed === 'null' || trimmed === 'undefined' ? null : trimmed;
}

// Membersihkan string wajib dengan fallback default
function cleanRequiredString(value: any, defaultValue: string = '-'): string {
  if (value === undefined || value === null) return defaultValue;
  const trimmed = String(value).trim();
  return trimmed === '' ? defaultValue : trimmed;
}

// Membersihkan string Base64 dari whitespace / newline yang terbawa dari file CSV
function cleanBase64Image(value: any): string | null {
  const str = cleanOptionalString(value);
  if (!str) return null;
  return str.replace(/[\r\n\s]+/g, '');
}

// Membersihkan nilai Integer Kuota (-1 untuk Unlimited)
function cleanQuotaInteger(value: any, isUnlimitedFlag: boolean = false): number {
  if (isUnlimitedFlag) return -1;
  if (value === undefined || value === null) return 5;
  
  const strValue = String(value).toLowerCase().trim();
  if (strValue.includes('unlimited') || strValue.includes('tanpa batas') || strValue === '-1') {
    return -1;
  }
  
  const parsed = parseInt(strValue, 10);
  if (isNaN(parsed)) return 5;
  return parsed;
}

// ==========================================
// 1. GET: FETCH DAFTAR INDUSTRI & MASTER KATEGORI
// ==========================================
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized - Silakan login terlebih dahulu' }, { status: 401 });
    }

    const role = (session.user as any)?.role?.toUpperCase();
    if (role !== 'POKJA' && role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden - Akses khusus Tim Pokja / Admin' }, { status: 403 });
    }

    // 1. Ambil data industri DUDI beserta penempatannya
    const rawIndustries = await db.industry.findMany({
      include: {
        placements: {
          select: {
            id: true,
            status: true,
            suratBalasanStatus: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // 2. Ambil master Kategori Industri untuk dropdown di frontend
    let rawCategories: any[] = [];
    try {
      rawCategories = await (db as any).industryCategory.findMany({
        orderBy: { name: 'asc' }
      });
    } catch {
      // Fallback Kategori Default jika tabel belum terisi
      rawCategories = [
        { id: 'cat-1', name: 'Teknologi Informasi & Komunikasi' },
        { id: 'cat-2', name: 'ISP / Internet Service Provider' },
        { id: 'cat-3', name: 'Rekayasa Perangkat Lunak & AI' },
        { id: 'cat-4', name: 'Multimedia & Desain Grafis' },
        { id: 'cat-5', name: 'Teknik Otomotif & Mesin' },
        { id: 'cat-6', name: 'Umum' }
      ];
    }

    // 3. Format data & kalkulasi sisa kuota (jika totalQuota = -1, artinya Unlimited)
    const formattedIndustries = rawIndustries.map((ind) => {
      const activeAcceptedCount = ind.placements
        ? ind.placements.filter(
            (p) => p.status === 'DISETUJUI_INDUSTRI' || p.suratBalasanStatus === 'DISETUJUI'
          ).length
        : 0;

      const isUnlimited = ind.totalQuota === -1;
      const remainingQuota = isUnlimited 
        ? -1 
        : Math.max(0, (ind.totalQuota || 0) - activeAcceptedCount);

      return {
        ...ind,
        activeAcceptedCount,
        remainingQuota,
        isUnlimited
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedIndustries,
      categories: rawCategories
    });
  } catch (error: any) {
    console.error('Error GET /api/pokja/industries:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal memuat data industri DUDI.' }, { status: 500 });
  }
}

// ==========================================
// 2. POST: TAMBAH SATU INDUSTRI / BULK IMPORT CSV
// ==========================================
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized - Silakan login terlebih dahulu' }, { status: 401 });
    }

    const role = (session.user as any)?.role?.toUpperCase();
    if (role !== 'POKJA' && role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden - Akses khusus Tim Pokja / Admin' }, { status: 403 });
    }

    const body = await request.json();

    // MODE 1: IMPORT BULK CSV
    if (body.isBulkImport && Array.isArray(body.items)) {
      const items = body.items;
      if (items.length === 0) {
        return NextResponse.json({ success: false, error: 'Data CSV kosong.' }, { status: 400 });
      }

      let insertedCount = 0;
      const errors: any[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.name || String(item.name).trim() === '') continue;

        try {
          const payloadData = {
            name: cleanRequiredString(item.name, 'Industri Tanpa Nama'),
            nib: cleanOptionalString(item.nib),
            sector: cleanRequiredString(item.sector || item.bidangUsaha, 'Umum'),
            npwp: cleanOptionalString(item.npwp),
            logoUrl: cleanBase64Image(item.logoUrl || item.logo),

            rw: cleanOptionalString(item.rw),
            dusun: cleanOptionalString(item.dusun),
            desaKelurahan: cleanOptionalString(item.desaKelurahan),
            subDistrict: cleanOptionalString(item.subDistrict || item.kecamatanKabupaten),
            postalCode: cleanOptionalString(item.postalCode),
            latitude: cleanOptionalString(item.latitude),
            longitude: cleanOptionalString(item.longitude),

            contactPerson: cleanRequiredString(item.contactPerson || item.hrd, 'HRD Perusahaan'),
            phone: cleanRequiredString(item.phone || item.nomorTelp, '-'),
            fax: cleanOptionalString(item.fax),
            email: cleanOptionalString(item.email),
            website: cleanOptionalString(item.website),
            totalQuota: cleanQuotaInteger(item.totalQuota || item.quota, item.isUnlimited)
          };

          await db.industry.create({ data: payloadData });
          insertedCount++;
        } catch (rowErr: any) {
          console.error(`Error import CSV baris ke-${i + 1}:`, rowErr);
          errors.push({ row: i + 1, name: item.name, error: rowErr.message });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Berhasil mengimpor ${insertedCount} data industri DUDI secara permanen!`,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    // MODE 2: TAMBAH SATU INDUSTRI BARU
    const { name } = body;
    if (!name || String(name).trim() === '') {
      return NextResponse.json({ success: false, error: 'Nama DUDI/Industri wajib diisi!' }, { status: 400 });
    }

    const singlePayload = {
      name: cleanRequiredString(body.name),
      nib: cleanOptionalString(body.nib),
      sector: cleanRequiredString(body.sector, 'Umum'),
      npwp: cleanOptionalString(body.npwp),
      logoUrl: cleanBase64Image(body.logoUrl),

      address: cleanRequiredString(body.address, 'Alamat Belum Diisi'),
      rt: cleanOptionalString(body.rt),
      desaKelurahan: cleanOptionalString(body.desaKelurahan),
      subDistrict: cleanOptionalString(body.subDistrict),
      postalCode: cleanOptionalString(body.postalCode),
      latitude: cleanOptionalString(body.latitude),
      longitude: cleanOptionalString(body.longitude),

      contactPerson: cleanRequiredString(body.contactPerson, 'HRD Perusahaan'),
      phone: cleanRequiredString(body.phone, '-'),
      fax: cleanOptionalString(body.fax),
      email: cleanOptionalString(body.email),
      website: cleanOptionalString(body.website),
      totalQuota: cleanQuotaInteger(body.totalQuota, body.isUnlimited)
    };

    const newIndustry = await db.industry.create({ data: singlePayload });

    return NextResponse.json({
      success: true,
      message: `Industri ${newIndustry.name} berhasil disimpan secara permanen!`,
      data: newIndustry
    });

  } catch (error: any) {
    console.error('Error POST /api/pokja/industries:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal menyimpan data industri.' }, { status: 500 });
  }
}

// ==========================================
// 3. PUT: UPDATE DATA & LOGO INDUSTRI DUDI
// ==========================================
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized - Silakan login terlebih dahulu' }, { status: 401 });
    }

    const role = (session.user as any)?.role?.toUpperCase();
    if (role !== 'POKJA' && role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden - Akses khusus Tim Pokja / Admin' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID Industri tidak valid.' }, { status: 400 });
    }

    if (!name || String(name).trim() === '') {
      return NextResponse.json({ success: false, error: 'Nama DUDI/Industri wajib diisi!' }, { status: 400 });
    }

    const updatePayload = {
      name: cleanRequiredString(body.name),
      nib: cleanOptionalString(body.nib),
      sector: cleanRequiredString(body.sector, 'Umum'),
      npwp: cleanOptionalString(body.npwp),
      logoUrl: cleanBase64Image(body.logoUrl),

      address: cleanRequiredString(body.address, 'Alamat Belum Diisi'),
      rt: cleanOptionalString(body.rt),
      rw: cleanOptionalString(body.rw),
      dusun: cleanOptionalString(body.dusun),
      postalCode: cleanOptionalString(body.postalCode),
      latitude: cleanOptionalString(body.latitude),
      longitude: cleanOptionalString(body.longitude),

      contactPerson: cleanRequiredString(body.contactPerson, 'HRD Perusahaan'),
      phone: cleanRequiredString(body.phone, '-'),
      fax: cleanOptionalString(body.fax),
      email: cleanOptionalString(body.email),
      website: cleanOptionalString(body.website),
      totalQuota: cleanQuotaInteger(body.totalQuota, body.isUnlimited)
    };

    const updated = await db.industry.update({
      where: { id: id },
      data: updatePayload
    });

    return NextResponse.json({
      success: true,
      message: `Data industri ${updated.name} berhasil diperbarui!`,
      data: updated
    });

  } catch (error: any) {
    console.error('Error PUT /api/pokja/industries:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal memperbarui data industri.' }, { status: 500 });
  }
}

// ==========================================
// 4. DELETE: HAPUS DATA INDUSTRI
// ==========================================
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized - Silakan login terlebih dahulu' }, { status: 401 });
    }

    const role = (session.user as any)?.role?.toUpperCase();
    if (role !== 'POKJA' && role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden - Akses khusus Tim Pokja / Admin' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID Industri wajib dikirim.' }, { status: 400 });
    }

    await db.industry.delete({ where: { id: id } });

    return NextResponse.json({
      success: true,
      message: 'Industri berhasil dihapus dari sistem.'
    });

  } catch (error: any) {
    console.error('Error DELETE /api/pokja/industries:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Gagal menghapus industri. Pastikan industri tidak memiliki riwayat penempatan siswa aktif.' 
    }, { status: 500 });
  }
}