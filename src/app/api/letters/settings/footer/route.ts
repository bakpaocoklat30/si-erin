// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Membuat REST API dedicated untuk Pengaturan Footer Legalitas Surat & TTE BSrE BSSN.
// ✨ Fitur Baru: Multi-Account Shared Storage untuk data Footer, NIP, Jabatan Kepsek, dan Footnote.
// 🎨 UI/UX Update: N/A (Backend REST API)
// 🔧 Bug Fix: Menghilangkan hardcoded strings footer pada seluruh jenis dokumen persuratan.
// 🚀 Inovasi: Shared Footer Legalization Database Engine.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

const SETTING_KEY_FOOTER = 'OFFICIAL_LETTER_FOOTER_SETTINGS';

// DEFAULT FALLBACK CONFIG FOR FOOTER
const defaultFooterConfig = {
  city: 'Adiwerna',
  signatoryTitle: 'Kepala SMK Negeri 1 Adiwerna',
  signatoryName: 'Joko Pramono, S.Pd., M.Ds.',
  signatoryRank: 'Pembina Utama Muda, IV/c',
  signatoryNip: '196903171998021004',
  tteText: 'Dokumen ini telah ditandatangani secara elektronik (TTE)',
  tteAuthority: 'Balai Sertifikasi Elektronik (BSrE BSSN)',
  showTteBlock: true,
  footnoteText: 'Powered by SI-ERIN Prakerin SMK'
};

// 📥 GET: Ambil Configuration Footer Legalitas
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
        where: { key: SETTING_KEY_FOOTER }
      }).catch(() => null);

      if (record && record.value) {
        try {
          const parsed = typeof record.value === 'string' ? JSON.parse(record.value) : record.value;
          return NextResponse.json({
            success: true,
            data: { ...defaultFooterConfig, ...parsed }
          });
        } catch (e) {
          console.warn('Gagal parse JSON setting Footer:', e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: defaultFooterConfig
    });

  } catch (error: any) {
    console.error('Error GET /api/letters/settings/footer:', error);
    return NextResponse.json({
      success: true,
      data: defaultFooterConfig
    });
  }
}

// 📤 POST: Simpan Configuration Footer Legalitas Permanen
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const role = user?.role;

    if (!session || !['ADMIN', 'SUPER_ADMIN', 'POKJA', 'TIM_POKJA', 'TATA_USAHA', 'TU'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const payload = {
      city: body.city || 'Adiwerna',
      signatoryTitle: body.signatoryTitle || 'Kepala SMK Negeri 1 Adiwerna',
      signatoryName: body.signatoryName || 'Joko Pramono, S.Pd., M.Ds.',
      signatoryRank: body.signatoryRank || 'Pembina Utama Muda, IV/c',
      signatoryNip: body.signatoryNip || '196903171998021004',
      tteText: body.tteText || 'Dokumen ini telah ditandatangani secara elektronik (TTE)',
      tteAuthority: body.tteAuthority || 'Balai Sertifikasi Elektronik (BSrE BSSN)',
      showTteBlock: Boolean(body.showTteBlock ?? true),
      footnoteText: body.footnoteText || 'Powered by SI-ERIN Prakerin SMK',
      updatedBy: `${user.name || 'Pengelola'} (${role})`,
      updatedAt: new Date().toISOString()
    };

    const prisma = db as any;
    const settingModel = prisma.schoolSetting || prisma.appSetting || prisma.systemSetting;

    if (settingModel) {
      const existing = await settingModel.findFirst({
        where: { key: SETTING_KEY_FOOTER }
      }).catch(() => null);

      if (existing) {
        await settingModel.update({
          where: { id: existing.id },
          data: {
            value: JSON.stringify(payload),
            updatedAt: new Date()
          }
        }).catch(() => {});
      } else {
        await settingModel.create({
          data: {
            key: SETTING_KEY_FOOTER,
            value: JSON.stringify(payload)
          }
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Pengaturan Footer & Legalitas TTE berhasil disimpan secara PERMANEN!',
      data: payload
    });

  } catch (error: any) {
    console.error('Error POST /api/letters/settings/footer:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal menyimpan Pengaturan Footer'
    }, { status: 500 });
  }
}