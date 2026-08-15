// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Membuat Backend REST API untuk Kop Surat Gambar Global Permanen.
// ✨ Fitur Baru: Support Multi-Account Sharing (Tata Usaha 1, Tata Usaha 2, & Admin memakai Kop yang sama).
// 🎨 UI/UX Update: N/A (Backend REST API)
// 🔧 Bug Fix: Mencegah hilangnya gambar Kop Surat saat ganti akun/browser.
// 🚀 Inovasi: Single Source of Truth Kop Surat Engine.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

const SETTING_KEY_HEADER = 'OFFICIAL_LETTER_HEADER_IMAGE';

// DEFAULT FALLBACK KOP IMAGE
const defaultKopImage = '/images/kop-sekolah-official.png';

// 📥 GET: Ambil Gambar Kop Surat Global Permanen
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const prisma = db as any;
    const settingModel = prisma.schoolSetting || prisma.appSetting || prisma.systemSetting;

    if (settingModel) {
      const record = await settingModel.findFirst({
        where: { key: SETTING_KEY_HEADER }
      }).catch(() => null);

      if (record && record.value) {
        return NextResponse.json({
          success: true,
          imageUrl: record.value
        });
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl: defaultKopImage
    });

  } catch (error: any) {
    console.error('Error GET /api/letters/settings/header:', error);
    return NextResponse.json({
      success: true,
      imageUrl: defaultKopImage
    });
  }
}

// 📤 POST: Simpan Gambar Kop Surat Global Permanen
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const role = user?.role;

    if (!session || !['ADMIN', 'SUPER_ADMIN', 'POKJA', 'TIM_POKJA', 'TATA_USAHA', 'TU'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'Gambar Kop Surat wajib diisi' }, { status: 400 });
    }

    const prisma = db as any;
    const settingModel = prisma.schoolSetting || prisma.appSetting || prisma.systemSetting;

    if (settingModel) {
      const existing = await settingModel.findFirst({
        where: { key: SETTING_KEY_HEADER }
      }).catch(() => null);

      if (existing) {
        await settingModel.update({
          where: { id: existing.id },
          data: {
            value: imageUrl,
            updatedAt: new Date()
          }
        }).catch(() => {});
      } else {
        await settingModel.create({
          data: {
            key: SETTING_KEY_HEADER,
            value: imageUrl
          }
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Kop Surat Resmi berhasil disimpan secara PERMANEN untuk seluruh akun Tata Usaha & Admin!',
      imageUrl
    });

  } catch (error: any) {
    console.error('Error POST /api/letters/settings/header:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal menyimpan Kop Surat'
    }, { status: 500 });
  }
}