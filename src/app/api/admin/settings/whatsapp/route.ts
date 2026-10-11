// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✨ Fitur Baru: API Pengaturan & Status WhatsApp Gateway (WAHA).
// 🔧 Fitur:
//    - GET: Mengambil konfigurasi WAHA dan memeriksa status koneksi sesi & QR Code.
//    - POST: Menyimpan konfigurasi WAHA (URL, Session, API Key, Pokja Phone, Status Aktif).
//    - PUT: Aksi khusus (Kirim Pesan Uji Coba / Restart Sesi WAHA).
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { getWahaConfig, getWahaSessionStatus, sendWhatsAppMessage, startWahaSession, stopWahaSession } from '@/lib/whatsapp';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();

    if (!session || !['ADMIN', 'SUPER_ADMIN', 'POKJA'].includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getWahaConfig();
    const sessionStatus = await getWahaSessionStatus();

    // Ambil daftar akun Pokja & Tata Usaha beserta status nomor WhatsApp-nya
    const pokjaAccounts = await db.user.findMany({
      where: { role: { in: ['POKJA', 'TIM_POKJA'] } },
      select: {
        id: true,
        name: true,
        department: true,
        phone: true,
      },
      orderBy: [{ department: 'asc' }, { name: 'asc' }]
    });

    const tuAccounts = await db.user.findMany({
      where: { role: { in: ['TATA_USAHA', 'TU'] } },
      select: {
        id: true,
        name: true,
        phone: true,
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      config,
      session: sessionStatus,
      pokjaAccounts,
      tuAccounts,
    });
  } catch (err: any) {
    console.error('Error GET /api/admin/settings/whatsapp:', err);
    return NextResponse.json({ error: err.message || 'Gagal memuat pengaturan WA' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();

    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Akses khusus Administrator' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      enabled, apiUrl, sessionName, apiKey, pokjaPhone, tuPhone,
      notifyPokjaNewApp, notifyStudentPermohonan, notifyStudentPenerjunan,
      notifyStudentPenarikan, notifyTeacherMonitoring, notifyTuNewPermohonan,
      templatePokjaNewApp, templateTuNewPermohonan, templateStudentPermohonan,
      templateStudentPenerjunan, templateStudentPenarikan, templateTeacherMonitoring,
    } = body;

    const upsertSetting = async (key: string, value: string) => {
      await db.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    };

    if (enabled !== undefined) await upsertSetting('WA_GATEWAY_ENABLED', enabled ? 'true' : 'false');
    if (apiUrl !== undefined) await upsertSetting('WA_GATEWAY_URL', String(apiUrl).trim());
    if (sessionName !== undefined) await upsertSetting('WA_GATEWAY_SESSION', String(sessionName).trim() || 'default');
    if (apiKey !== undefined) await upsertSetting('WA_GATEWAY_API_KEY', String(apiKey).trim());
    if (pokjaPhone !== undefined) await upsertSetting('WA_GATEWAY_POKJA_PHONE', String(pokjaPhone).trim());
    if (tuPhone !== undefined) await upsertSetting('WA_GATEWAY_TU_PHONE', String(tuPhone).trim());
    if (notifyPokjaNewApp !== undefined) await upsertSetting('WA_NOTIFY_POKJA_NEW_APP', notifyPokjaNewApp ? 'true' : 'false');
    if (notifyStudentPermohonan !== undefined) await upsertSetting('WA_NOTIFY_STUDENT_PERMOHONAN', notifyStudentPermohonan ? 'true' : 'false');
    if (notifyStudentPenerjunan !== undefined) await upsertSetting('WA_NOTIFY_STUDENT_PENERJUNAN', notifyStudentPenerjunan ? 'true' : 'false');
    if (notifyStudentPenarikan !== undefined) await upsertSetting('WA_NOTIFY_STUDENT_PENARIKAN', notifyStudentPenarikan ? 'true' : 'false');
    if (notifyTeacherMonitoring !== undefined) await upsertSetting('WA_NOTIFY_TEACHER_MONITORING', notifyTeacherMonitoring ? 'true' : 'false');
    if (notifyTuNewPermohonan !== undefined) await upsertSetting('WA_NOTIFY_TU_NEW_PERMOHONAN', notifyTuNewPermohonan ? 'true' : 'false');
    if (templatePokjaNewApp !== undefined) await upsertSetting('WA_TEMPLATE_POKJA_NEW_APP', String(templatePokjaNewApp).trim());
    if (templateTuNewPermohonan !== undefined) await upsertSetting('WA_TEMPLATE_TU_NEW_PERMOHONAN', String(templateTuNewPermohonan).trim());
    if (templateStudentPermohonan !== undefined) await upsertSetting('WA_TEMPLATE_STUDENT_PERMOHONAN', String(templateStudentPermohonan).trim());
    if (templateStudentPenerjunan !== undefined) await upsertSetting('WA_TEMPLATE_STUDENT_PENERJUNAN', String(templateStudentPenerjunan).trim());
    if (templateStudentPenarikan !== undefined) await upsertSetting('WA_TEMPLATE_STUDENT_PENARIKAN', String(templateStudentPenarikan).trim());
    if (templateTeacherMonitoring !== undefined) await upsertSetting('WA_TEMPLATE_TEACHER_MONITORING', String(templateTeacherMonitoring).trim());

    return NextResponse.json({
      success: true,
      message: 'Pengaturan WhatsApp Gateway berhasil disimpan!',
    });
  } catch (err: any) {
    console.error('Error POST /api/admin/settings/whatsapp:', err);
    return NextResponse.json({ error: err.message || 'Gagal menyimpan pengaturan WA' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();

    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, testPhone, testMessage } = body;

    if (action === 'TEST_MESSAGE') {
      if (!testPhone) {
        return NextResponse.json({ error: 'Nomor telepon tujuan uji coba wajib diisi' }, { status: 400 });
      }

      const msg = testMessage || 'Halo! Ini adalah pesan uji coba dari sistem SI-ERIN v2.0 SMKN 1 Adiwerna.';
      const res = await sendWhatsAppMessage(testPhone, msg);

      if (!res.success) {
        return NextResponse.json({ error: res.error || 'Gagal mengirim pesan uji coba' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `Pesan uji coba berhasil dikirim ke ${testPhone}!`,
      });
    }

    if (action === 'START_SESSION' || action === 'RESTART_SESSION') {
      const res = await startWahaSession();
      if (!res.success) {
        return NextResponse.json({ error: res.error || 'Gagal memulai sesi WhatsApp' }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: 'Perintah memulai sesi WhatsApp berhasil dikirim ke WAHA!',
      });
    }

    if (action === 'STOP_SESSION') {
      const res = await stopWahaSession();
      if (!res.success) {
        return NextResponse.json({ error: res.error || 'Gagal menghentikan sesi WhatsApp' }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: 'Sesi WhatsApp berhasil dihentikan.',
      });
    }

    return NextResponse.json({ error: 'Aksi tidak dikenali' }, { status: 400 });
  } catch (err: any) {
    console.error('Error PUT /api/admin/settings/whatsapp:', err);
    return NextResponse.json({ error: err.message || 'Gagal mengeksekusi aksi WA' }, { status: 500 });
  }
}

