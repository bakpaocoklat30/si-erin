// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Mendukung Multipart FormData untuk Upload File PNG/JPG langsung ke storage `public/uploads/` serta tetap mendukung payload JSON Paste URL.
// ✨ Fitur Baru: Local Storage File Uploader & Dynamic Asset Resolver.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Helper Default Setting Fallback
const DEFAULT_SETTING = {
  name: 'SMK Negeri 1 Adiwerna',
  shortName: 'SMKN 1 Adiwerna',
  logoUrl: '/images/logo-sekolah.png',
  address: 'Jl. Raya Adiwerna No. 15, Kabupaten Tegal',
  phone: '(0283) 442192',
  email: 'info@smkn1adiwerna.sch.id',
  headmaster: 'Drs. Joko Purnomo, M.Pd.',
  headmasterNip: '196805121994031004',
  accreditation: 'A (Unggul)'
};

// GET: Ambil Data Setting Identitas & Logo Sekolah
export async function GET() {
  try {
    const prisma = db as any;
    let schoolSetting = null;

    if (prisma.schoolSetting) {
      schoolSetting = await prisma.schoolSetting.findFirst();
    }

    if (!schoolSetting) {
      return NextResponse.json({ success: true, data: DEFAULT_SETTING });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: schoolSetting.id,
        name: schoolSetting.name || DEFAULT_SETTING.name,
        shortName: schoolSetting.shortName || DEFAULT_SETTING.shortName,
        logoUrl: schoolSetting.logoUrl || DEFAULT_SETTING.logoUrl,
        address: schoolSetting.address || DEFAULT_SETTING.address,
        phone: schoolSetting.phone || DEFAULT_SETTING.phone,
        email: schoolSetting.email || DEFAULT_SETTING.email,
        headmaster: schoolSetting.headmaster || DEFAULT_SETTING.headmaster,
        headmasterNip: schoolSetting.headmasterNip || DEFAULT_SETTING.headmasterNip,
        accreditation: schoolSetting.accreditation || DEFAULT_SETTING.accreditation
      }
    });
  } catch (error: any) {
    console.error('Error GET /api/settings/school:', error);
    return NextResponse.json({ success: true, data: DEFAULT_SETTING });
  }
}

// POST: Simpan/Update Identitas Sekolah & Handle Upload File Logo / Paste URL
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized - Silakan login terlebih dahulu' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (!['ADMIN', 'POKJA'].includes(userRole)) {
      return NextResponse.json({ error: 'Akses ditolak - Hanya Admin/Pokja yang diizinkan.' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || '';
    let name = '';
    let shortName = '';
    let logoUrl = '';
    let address = '';
    let phone = '';
    let email = '';
    let headmaster = '';
    let headmasterNip = '';
    let accreditation = '';

    // A. HANDLE MULTIPART FORM DATA (UPLOAD FILE)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      
      name = (formData.get('name') as string) || '';
      shortName = (formData.get('shortName') as string) || '';
      logoUrl = (formData.get('logoUrl') as string) || '';
      address = (formData.get('address') as string) || '';
      phone = (formData.get('phone') as string) || '';
      email = (formData.get('email') as string) || '';
      headmaster = (formData.get('headmaster') as string) || '';
      headmasterNip = (formData.get('headmasterNip') as string) || '';
      accreditation = (formData.get('accreditation') as string) || '';

      const logoFile = formData.get('logoFile') as File | null;

      if (logoFile && logoFile.size > 0) {
        const bytes = await logoFile.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Buat folder public/uploads jika belum ada
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });

        // Format nama file unik
        const fileExt = path.extname(logoFile.name) || '.png';
        const fileName = `logo-sekolah-${Date.now()}${fileExt}`;
        const filePath = path.join(uploadDir, fileName);

        await writeFile(filePath, buffer);
        logoUrl = `/uploads/${fileName}`; // Path lokal relatif
      }
    } 
    // B. HANDLE JSON PAYLOAD (PASTE URL)
    else {
      const body = await request.json();
      name = body.name;
      shortName = body.shortName;
      logoUrl = body.logoUrl;
      address = body.address;
      phone = body.phone;
      email = body.email;
      headmaster = body.headmaster;
      headmasterNip = body.headmasterNip;
      accreditation = body.accreditation;
    }

    const prisma = db as any;
    const payload = {
      name: name || DEFAULT_SETTING.name,
      shortName: shortName || DEFAULT_SETTING.shortName,
      logoUrl: logoUrl || DEFAULT_SETTING.logoUrl,
      address: address || '',
      phone: phone || '',
      email: email || '',
      headmaster: headmaster || '',
      headmasterNip: headmasterNip || '',
      accreditation: accreditation || 'A (Unggul)'
    };

    let result;
    if (prisma.schoolSetting) {
      const existing = await prisma.schoolSetting.findFirst();
      if (existing) {
        result = await prisma.schoolSetting.update({
          where: { id: existing.id },
          data: payload
        });
      } else {
        result = await prisma.schoolSetting.create({
          data: payload
        });
      }
    } else {
      throw new Error('Tabel database SchoolSetting tidak ditemukan.');
    }

    return NextResponse.json({
      success: true,
      message: 'Identitas & Logo Sekolah berhasil diperbarui secara permanen!',
      data: result
    });

  } catch (error: any) {
    console.error('Error POST /api/settings/school:', error);
    return NextResponse.json({ error: error.message || 'Gagal menyimpan pengaturan sekolah.' }, { status: 500 });
  }
}