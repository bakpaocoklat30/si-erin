import { NextRequest, NextResponse } from 'next/server';
import { IndustryService } from '@/services/industryService';

/**
 * GET /api/industri
 * Mengambil daftar DUDI / Industri dengan fitur pencarian, filter sektor, dan pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 10;
    const search = searchParams.get('search') || undefined;
    const sector = searchParams.get('sector') || undefined;

    const result = await IndustryService.getAllIndustries({
      page,
      limit,
      search,
      sector,
    });

    return NextResponse.json({
      success: true,
      message: 'Berhasil mengambil data DUDI/Industri',
      ...result,
    }, { status: 200 });
  } catch (error: any) {
    console.error('API Error GET /api/industri:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Terjadi kesalahan internal pada server',
    }, { status: 500 });
  }
}

/**
 * POST /api/industri
 * Menambahkan DUDI / Industri Baru beserta atribut lengkap standar Dapodik
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validasi Field Wajib Standar
    if (!body.name || !body.address) {
      return NextResponse.json({
        success: false,
        message: 'Nama Industri (name) dan Alamat Jalan (address) wajib diisi.',
      }, { status: 400 });
    }

    const newIndustry = await IndustryService.createIndustry(body);

    return NextResponse.json({
      success: true,
      message: 'Data DUDI/Industri berhasil ditambahkan',
      data: newIndustry,
    }, { status: 201 });
  } catch (error: any) {
    console.error('API Error POST /api/industri:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Gagal menambahkan data DUDI/Industri',
    }, { status: 400 });
  }
}