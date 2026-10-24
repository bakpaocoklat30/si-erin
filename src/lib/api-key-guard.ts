import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';

const SETTING_KEY = 'EXTERNAL_API_KEY';

/**
 * Mendapatkan API Key eksternal saat ini dari Environment Variable atau Database SystemSetting
 */
export async function getExternalApiKey(): Promise<string> {
  // 1. Prioritaskan jika disetel di .env
  if (process.env.EXTERNAL_API_KEY && process.env.EXTERNAL_API_KEY.trim() !== '') {
    return process.env.EXTERNAL_API_KEY.trim();
  }

  // 2. Periksa di tabel SystemSetting
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: SETTING_KEY },
    });

    if (setting && setting.value && setting.value.trim() !== '') {
      return setting.value.trim();
    }

    // 3. Jika belum pernah ada, buatkan kunci API otomatis (awalan sierin_live_)
    const generatedKey = `sierin_live_${crypto.randomBytes(18).toString('hex')}`;
    await db.systemSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value: generatedKey },
      create: { key: SETTING_KEY, value: generatedKey },
    });

    return generatedKey;
  } catch (error) {
    console.error('Error fetching/generating EXTERNAL_API_KEY:', error);
    // Fallback darurat jika database tidak bisa diakses
    return process.env.NEXTAUTH_SECRET ? `sierin_${process.env.NEXTAUTH_SECRET.slice(0, 16)}` : 'sierin_default_api_key_2026';
  }
}

/**
 * Memperbarui / me-regenerasi API Key eksternal di tabel SystemSetting
 */
export async function setExternalApiKey(newKey?: string): Promise<string> {
  const keyToSave = newKey && newKey.trim() !== ''
    ? newKey.trim()
    : `sierin_live_${crypto.randomBytes(18).toString('hex')}`;

  await db.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: keyToSave },
    create: { key: SETTING_KEY, value: keyToSave },
  });

  return keyToSave;
}

/**
 * Header CORS standar untuk endpoint API eksternal
 */
export function getCorsHeaders(origin: string = '*'): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, X-API-KEY',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Handler cepat untuk permintaan preflight HTTP OPTIONS (CORS)
 */
export function handleCorsPreflight() {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

/**
 * Validasi API Key pada Request yang masuk
 * Mendukung autentikasi melalui:
 * - Header: `x-api-key: <KEY>` atau `X-API-KEY: <KEY>`
 * - Header: `Authorization: Bearer <KEY>`
 * - Query parameter: `?api_key=<KEY>`
 */
export async function validateExternalApiKey(request: Request): Promise<{
  isValid: boolean;
  error?: string;
  configuredKey?: string;
}> {
  const url = new URL(request.url);
  const authHeader = request.headers.get('authorization') || '';
  const xApiKey = request.headers.get('x-api-key') || request.headers.get('X-API-KEY');
  const queryApiKey = url.searchParams.get('api_key') || url.searchParams.get('apiKey');

  let providedKey: string | null = null;

  if (xApiKey && xApiKey.trim()) {
    providedKey = xApiKey.trim();
  } else if (authHeader.toLowerCase().startsWith('bearer ')) {
    providedKey = authHeader.slice(7).trim();
  } else if (queryApiKey && queryApiKey.trim()) {
    providedKey = queryApiKey.trim();
  }

  if (!providedKey) {
    return {
      isValid: false,
      error: 'Autentikasi gagal: API Key tidak ditemukan. Harap sertakan header `x-api-key: <KEY>` atau `Authorization: Bearer <KEY>`.',
    };
  }

  const validKey = await getExternalApiKey();

  // Verifikasi konstan untuk mitigasi timing attack
  let isMatch = false;
  try {
    const bufProvided = Buffer.from(providedKey);
    const bufValid = Buffer.from(validKey);
    if (bufProvided.length === bufValid.length) {
      isMatch = crypto.timingSafeEqual(bufProvided, bufValid);
    }
  } catch {
    isMatch = false;
  }

  if (!isMatch && providedKey !== validKey) {
    return {
      isValid: false,
      error: 'Autentikasi gagal: API Key yang diberikan tidak valid atau tidak memiliki akses.',
    };
  }

  return {
    isValid: true,
    configuredKey: validKey,
  };
}

/**
 * Helper pembentuk response JSON standar untuk API eksternal dengan header CORS
 */
export function externalApiResponse(data: any, status: number = 200) {
  return NextResponse.json(data, {
    status,
    headers: getCorsHeaders(),
  });
}
