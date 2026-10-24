import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getExternalApiKey, setExternalApiKey } from '@/lib/api-key-guard';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/settings/api-key
 * Mengambil API Key aktif saat ini (Khusus Administrator)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase();

    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Administrator' }, { status: 401 });
    }

    const apiKey = await getExternalApiKey();
    const isFromEnv = Boolean(process.env.EXTERNAL_API_KEY && process.env.EXTERNAL_API_KEY.trim() !== '');

    return NextResponse.json({
      success: true,
      apiKey,
      isFromEnv,
      source: isFromEnv ? 'Environment Variable (.env)' : 'Database (SystemSetting)',
      endpoints: {
        documentation: '/api/external',
        industries: '/api/external/industries',
        students: '/api/external/students',
        letters: '/api/external/letters'
      }
    });
  } catch (error: any) {
    console.error('Error GET /api/admin/settings/api-key:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/settings/api-key
 * Me-regenerasi atau memperbarui API Key eksternal (Khusus Administrator)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase();

    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Administrator' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, customKey } = body;

    let updatedKey = '';
    if (action === 'custom' && customKey) {
      if (customKey.trim().length < 16) {
        return NextResponse.json({ error: 'API Key kustom minimal harus 16 karakter.' }, { status: 400 });
      }
      updatedKey = await setExternalApiKey(customKey.trim());
    } else {
      // Default: Regenerasi otomatis token acak aman
      updatedKey = await setExternalApiKey();
    }

    return NextResponse.json({
      success: true,
      message: 'API Key eksternal berhasil diperbarui.',
      apiKey: updatedKey,
    });
  } catch (error: any) {
    console.error('Error POST /api/admin/settings/api-key:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
