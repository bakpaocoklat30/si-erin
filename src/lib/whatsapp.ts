// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✨ Fitur Baru: Layanan Integrasi WhatsApp Gateway (WAHA - WhatsApp HTTP API).
// 🔧 Fitur:
//    - Pengiriman notifikasi otomatis saat pengajuan baru dari siswa ke Tim Pokja.
//    - Pengiriman notifikasi otomatis saat surat permohonan / penerjunan / penarikan terbit ke siswa.
//    - Pengiriman notifikasi otomatis saat surat tugas & SPPD monitoring terbit ke guru pembimbing.
//    - Format nomor otomatis standar internasional (+62).
//    - Pengecekan status koneksi & session WAHA (QR Code & Session Management).
// 🚀 Inovasi: Zero-Dependency Self-Hosted Enterprise WhatsApp Notification Engine for SI-ERIN.
// ----------------------------------------------------------------------

import { db } from '@/lib/db';

/**
 * Normalisasi format nomor WhatsApp ke format internasional (misal: 081234 -> 6281234)
 */
export function formatPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let clean = phone.replace(/[^0-9]/g, '').trim();
  if (!clean) return null;

  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (clean.startsWith('+62')) {
    clean = '62' + clean.slice(3);
  } else if (!clean.startsWith('62')) {
    clean = '62' + clean;
  }

  // Standar panjang nomor telepon valid di Indonesia: 10 - 15 digit
  if (clean.length < 10 || clean.length > 16) return null;
  return clean;
}

/**
 * Format chatId WAHA (misal: 628123456789@c.us)
 */
export function toChatId(phone: string): string {
  const formatted = formatPhoneNumber(phone);
  if (!formatted) return '';
  return `${formatted}@c.us`;
}

/**
 * Ambil konfigurasi WAHA dari tabel SystemSetting
 */
export async function getWahaConfig(): Promise<{
  enabled: boolean;
  apiUrl: string;
  sessionName: string;
  apiKey: string;
  pokjaPhone: string;
}> {
  try {
    const settings = await db.systemSetting.findMany({
      where: {
        key: {
          in: [
            'WA_GATEWAY_ENABLED',
            'WA_GATEWAY_URL',
            'WA_GATEWAY_SESSION',
            'WA_GATEWAY_API_KEY',
            'WA_GATEWAY_POKJA_PHONE',
          ],
        },
      },
    });

    const map = new Map(settings.map((s) => [s.key, s.value]));

    // WAHA URL default: di Docker internal adalah http://waha:3000, di lokal/dev adalah http://localhost:7005
    const defaultUrl = process.env.WA_GATEWAY_URL || (process.env.NODE_ENV === 'production' ? 'http://waha:3000' : 'http://localhost:7005');

    return {
      enabled: map.get('WA_GATEWAY_ENABLED') === 'true',
      apiUrl: map.get('WA_GATEWAY_URL') || defaultUrl,
      sessionName: map.get('WA_GATEWAY_SESSION') || 'default',
      apiKey: map.get('WA_GATEWAY_API_KEY') || '',
      pokjaPhone: map.get('WA_GATEWAY_POKJA_PHONE') || '',
    };
  } catch (err) {
    console.warn('[WAHA] Gagal membaca konfigurasi SystemSetting:', err);
    return {
      enabled: false,
      apiUrl: 'http://localhost:7005',
      sessionName: 'default',
      apiKey: '',
      pokjaPhone: '',
    };
  }
}

/**
 * Kirim Pesan Teks via WAHA API
 */
export async function sendWhatsAppMessage(
  targetPhone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getWahaConfig();
    if (!config.enabled) {
      return { success: false, error: 'WhatsApp Gateway nonaktif di pengaturan' };
    }

    const chatId = toChatId(targetPhone);
    if (!chatId) {
      return { success: false, error: `Nomor telepon tujuan tidak valid: ${targetPhone}` };
    }

    const cleanBaseUrl = config.apiUrl.replace(/\/+$/, '');
    const endpoint = `${cleanBaseUrl}/api/sendText`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey) {
      headers['X-Api-Key'] = config.apiKey;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        session: config.sessionName,
        chatId: chatId,
        text: message,
      }),
      // Jangan biarkan notifikasi WA membuat request utama gantung jika timeout
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[WAHA] Gagal kirim pesan ke ${chatId} (${res.status}):`, errText);
      return { success: false, error: `WAHA Error HTTP ${res.status}: ${errText}` };
    }

    return { success: true };
  } catch (error: any) {
    console.warn('[WAHA] Error saat mengirim pesan WhatsApp:', error?.message);
    return { success: false, error: error?.message || 'Gagal menghubungi server WAHA' };
  }
}

/**
 * Periksa Status Session WAHA & Dapatkan QR Code jika belum terhubung
 */
export async function startWahaSession(): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getWahaConfig();
    const cleanBaseUrl = config.apiUrl.replace(/\/+$/, '');
    const headers: Record<string, string> = {};
    if (config.apiKey) headers['X-Api-Key'] = config.apiKey;

    // Pastikan session sudah dibuat terlebih dahulu
    await fetch(`${cleanBaseUrl}/api/sessions`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: config.sessionName }),
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);

    const res = await fetch(`${cleanBaseUrl}/api/sessions/${config.sessionName}/start`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { success: false, error: err || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal menghubungi server WAHA' };
  }
}

export async function stopWahaSession(): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getWahaConfig();
    const cleanBaseUrl = config.apiUrl.replace(/\/+$/, '');
    const headers: Record<string, string> = {};
    if (config.apiKey) headers['X-Api-Key'] = config.apiKey;

    const res = await fetch(`${cleanBaseUrl}/api/sessions/${config.sessionName}/stop`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { success: false, error: err || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal menghubungi server WAHA' };
  }
}

export async function getWahaSessionStatus(): Promise<{
  status: 'CONNECTED' | 'SCAN_QR' | 'STOPPED' | 'ERROR';
  qrCode?: string | null;
  message?: string;
  name?: string;
}> {
  try {
    const config = await getWahaConfig();
    const cleanBaseUrl = config.apiUrl.replace(/\/+$/, '');
    const headers: Record<string, string> = {};
    if (config.apiKey) {
      headers['X-Api-Key'] = config.apiKey;
    }

    // 1. Cek daftar sesi aktif
    let sessionRes = await fetch(`${cleanBaseUrl}/api/sessions/${config.sessionName}`, {
      headers,
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);

    if (sessionRes?.status === 401) {
      return {
        status: 'ERROR',
        message: 'Otorisasi ditolak (HTTP 401 Unauthorized). Silakan masukkan API Key yang sesuai atau pastikan container WAHA berjalan dengan WAHA_NO_API_KEY=true.',
      };
    }

    if (!sessionRes || !sessionRes.ok) {
      // Coba inisiasi session baru jika belum ada
      const startRes = await fetch(`${cleanBaseUrl}/api/sessions`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: config.sessionName }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      if (!startRes) {
        return { status: 'ERROR', message: `Server WAHA tidak dapat dihubungi di ${config.apiUrl}` };
      }
      if (startRes.status === 401) {
        return {
          status: 'ERROR',
          message: 'Otorisasi ditolak (HTTP 401 Unauthorized). Periksa pengaturan API Key Anda.',
        };
      }
    }

    // 2. Ambil status detail sesi
    const detailRes = await fetch(`${cleanBaseUrl}/api/sessions/${config.sessionName}`, {
      headers,
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);

    if (!detailRes || !detailRes.ok) {
      return { status: 'ERROR', message: 'Gagal membaca status sesi WAHA' };
    }

    const detailData = await detailRes.json();
    let wahaStatus = String(detailData?.status || '').toUpperCase();

    // Jika status STOPPED, otomatis start sesi agar beralih ke STARTING -> SCAN_QR_CODE
    if (wahaStatus === 'STOPPED') {
      await fetch(`${cleanBaseUrl}/api/sessions/${config.sessionName}/start`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);
      wahaStatus = 'STARTING';
    }

    // Jika sudah WORKING/CONNECTED
    if (wahaStatus === 'WORKING' || wahaStatus === 'CONNECTED') {
      return {
        status: 'CONNECTED',
        name: detailData?.me?.id || detailData?.name || config.sessionName,
        message: 'WhatsApp Gateway Terhubung dan Siap Mengirim Notifikasi',
      };
    }

    // Jika butuh Scan QR (SCAN_QR_CODE atau STARTING)
    if (wahaStatus === 'SCAN_QR_CODE' || wahaStatus === 'STARTING') {
      // Ambil QR Image
      const qrRes = await fetch(`${cleanBaseUrl}/api/${config.sessionName}/auth/qr`, {
        headers,
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      let qrImage: string | null = null;
      if (qrRes && qrRes.ok) {
        const contentType = qrRes.headers.get('content-type') || '';
        if (contentType.includes('image') || contentType.includes('png')) {
          const buffer = await qrRes.arrayBuffer();
          qrImage = `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
        } else {
          const qrJson = await qrRes.json().catch(() => null);
          qrImage = qrJson?.qr || qrJson?.image || null;
        }
      }

      return {
        status: 'SCAN_QR',
        qrCode: qrImage,
        message: 'Silakan pindai (scan) QR Code dengan aplikasi WhatsApp di ponsel Anda',
      };
    }

    return {
      status: 'STOPPED',
      message: `Status sesi: ${wahaStatus}. Klik tombol mulai sesi untuk mengaktifkan kembali.`,
    };
  } catch (err: any) {
    return {
      status: 'ERROR',
      message: err?.message || 'Terjadi kesalahan saat memeriksa server WAHA',
    };
  }
}

// ======================================================================
// 📢 TEMPLATE PESAN NOTIFIKASI STANDAR SI-ERIN
// ======================================================================

/**
 * Notifikasi ke Tim Pokja saat ada siswa mengajukan PKL baru
 */
export async function notifyPokjaNewApplication(params: {
  studentName: string;
  studentClass: string;
  department: string;
  industryName: string;
  appliedDate?: string;
}) {
  const config = await getWahaConfig();
  if (!config.enabled || !config.pokjaPhone) return;

  const text = 
`🔔 *[SI-ERIN NOTIFIKASI]*
📢 *Pengajuan Tempat PKL Baru Masuk!*

Halo Tim Pokja Prakerin, terdapat siswa yang baru saja mengirimkan pengajuan tempat PKL:

👤 *Siswa:* ${params.studentName}
🏫 *Kelas:* ${params.studentClass} (${params.department})
🏢 *Industri Tujuan:* ${params.industryName}
📅 *Waktu:* ${params.appliedDate || new Date().toLocaleString('id-ID')}

Silakan tinjau dan verifikasi pengajuan ini melalui sistem SI-ERIN:
🔗 *Menu:* Verifikasi Pengajuan PKL

_Pesan otomatis dikirim oleh SI-ERIN v2.0 - SMKN 1 Adiwerna_`;

  // Kirim ke nomor Pokja yang terdaftar
  await sendWhatsAppMessage(config.pokjaPhone, text);
}

/**
 * Notifikasi ke Siswa saat surat permohonan PKL telah diterbitkan oleh Tata Usaha
 */
export async function notifyStudentLetterIssued(params: {
  studentPhone: string;
  studentName: string;
  industryName: string;
  letterNumber: string;
  letterType?: 'PERMOHONAN' | 'PENERJUNAN' | 'PENARIKAN';
}) {
  if (!params.studentPhone) return;

  let title = 'Surat Permohonan PKL';
  let instruksi = 'Silakan unduh dokumen surat tersebut melalui dashboard SI-ERIN Anda untuk diserahkan ke pihak industri mitra.';

  if (params.letterType === 'PENERJUNAN') {
    title = 'Surat Pengantar & Tugas Penerjunan PKL';
    instruksi = 'Surat pengantaran dan penerjunan ke industri telah siap. Silakan koordinasikan dengan Guru Pembimbing Anda.';
  } else if (params.letterType === 'PENARIKAN') {
    title = 'Surat Penarikan Siswa PKL';
    instruksi = 'Surat penarikan dan ucapan terima kasih untuk industri mitra telah diterbitkan oleh sekolah.';
  }

  const text =
`📄 *[SI-ERIN NOTIFIKASI]*
✅ *${title} Telah Diterbitkan!*

Halo *${params.studentName}*, 
Dokumen resmi PKL Anda telah selesai disahkan dan diterbitkan oleh Tata Usaha:

🏢 *Industri Mitra:* ${params.industryName}
🔢 *Nomor Surat:* ${params.letterNumber}
📌 *Status:* Diterbitkan & Sah

${instruksi}

Silakan cek di dashboard siswa:
👉 https://si-erin.smkn1adiwerna.sch.id/dashboard/students/pengajuan

_Pesan otomatis dikirim oleh SI-ERIN v2.0 - SMKN 1 Adiwerna_`;

  await sendWhatsAppMessage(params.studentPhone, text);
}

/**
 * Notifikasi ke Guru Pembimbing saat Surat Tugas & SPPD Monitoring telah di-TTE
 */
export async function notifyTeacherMonitoringTte(params: {
  teacherPhone: string;
  teacherName: string;
  industryName: string;
  letterNumber?: string;
  monitoringDate?: string;
}) {
  if (!params.teacherPhone) return;

  const text =
`📝 *[SI-ERIN NOTIFIKASI]*
✅ *Surat Tugas & SPPD Monitoring Telah Ter-TTE!*

Yth. Bapak/Ibu *${params.teacherName}*,
Dokumen penugasan monitoring PKL telah disahkan dengan Tanda Tangan Elektronik (TTE) resmi oleh Kepala Sekolah / Tata Usaha:

🏢 *Tempat Monitoring:* ${params.industryName}
📅 *Jadwal:* ${params.monitoringDate || '-'}
🔢 *No. Surat Tugas:* ${params.letterNumber || '-'}

Surat Tugas TTE dan SPPD TTE resmi dapat langsung diunduh melalui portal SI-ERIN pada menu *Penugasan Guru Pembimbing*:
👉 https://si-erin.smkn1adiwerna.sch.id/dashboard/pembimbing/penugasan

Setelah melaksanakan kunjungan, mohon untuk mengunggah berkas laporan kegiatan pada menu tersebut.

_Pesan otomatis dikirim oleh SI-ERIN v2.0 - SMKN 1 Adiwerna_`;

  await sendWhatsAppMessage(params.teacherPhone, text);
}

