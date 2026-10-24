import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { IndustryService } from '@/services/industryService';

const ALLOWED_MANAGERS = ['ADMIN', 'SUPER_ADMIN', 'POKJA', 'TIM_POKJA'];

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/industri/[id]
 * Mengambil detail data DUDI / Industri berdasarkan ID
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const industry = await IndustryService.getIndustryById(id);

    return NextResponse.json({
      success: true,
      message: 'Detail DUDI berhasil ditemukan',
      data: industry,
    }, { status: 200 });
  } catch (error: any) {
    console.error(`API Error GET /api/industri:`, error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Data DUDI tidak ditemukan',
    }, { status: 404 });
  }
}

/**
 * PUT /api/industri/[id]
 * Mengubah data DUDI / Industri (Atribut Dapodik: Logo, NIB, NPWP, RT/RW, Koordinat, dll)
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase();
    if (!session || !ALLOWED_MANAGERS.includes(userRole)) {
      return NextResponse.json({ success: false, message: 'Forbidden - Akses khusus Admin atau Tim Pokja' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const updatedIndustry = await IndustryService.updateIndustry(id, body);

    return NextResponse.json({
      success: true,
      message: 'Data DUDI berhasil diperbarui',
      data: updatedIndustry,
    }, { status: 200 });
  } catch (error: any) {
    console.error(`API Error PUT /api/industri:`, error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Gagal memperbarui data DUDI',
    }, { status: 400 });
  }
}

/**
 * DELETE /api/industri/[id]
 * Menghapus data DUDI / Industri dari database
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase();
    if (!session || !ALLOWED_MANAGERS.includes(userRole)) {
      return NextResponse.json({ success: false, message: 'Forbidden - Akses khusus Admin atau Tim Pokja' }, { status: 403 });
    }

    const { id } = await params;
    await IndustryService.deleteIndustry(id);

    return NextResponse.json({
      success: true,
      message: 'Data DUDI berhasil dihapus',
    }, { status: 200 });
  } catch (error: any) {
    console.error(`API Error DELETE /api/industri:`, error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Gagal menghapus data DUDI',
    }, { status: 400 });
  }
}