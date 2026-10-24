import { NextRequest } from 'next/server';
import { 
  validateExternalApiKey, 
  handleCorsPreflight, 
  externalApiResponse 
} from '@/lib/api-key-guard';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleCorsPreflight();
}

/**
 * GET /api/external
 * Dokumentasi API Eksternal SI-ERIN untuk Aplikasi Klien & Pengembang Pihak Ketiga
 */
export async function GET(request: NextRequest) {
  const auth = await validateExternalApiKey(request);
  if (!auth.isValid) {
    return externalApiResponse({
      success: false,
      error: auth.error,
      hint: 'Gunakan header `x-api-key: YOUR_API_KEY` atau `Authorization: Bearer YOUR_API_KEY`',
    }, 401);
  }

  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  return externalApiResponse({
    success: true,
    name: 'SI-ERIN External Integration API',
    version: '1.0.0',
    description: 'API Resmi SI-ERIN (SMK Negeri 1 Adiwerna) untuk pertukaran data industri, penempatan siswa PKL, dan dokumen persuratan.',
    baseUrl: `${baseUrl}/api/external`,
    authentication: {
      type: 'API Key',
      supportedHeaders: [
        'x-api-key: <YOUR_API_KEY>',
        'Authorization: Bearer <YOUR_API_KEY>'
      ],
      supportedQueryParams: [
        '?api_key=<YOUR_API_KEY>'
      ]
    },
    endpoints: [
      {
        path: '/api/external/industries',
        method: 'GET',
        description: 'Mengambil daftar seluruh mitra DUDI/Industri beserta kuota dan statistik penempatan siswa.',
        queryParams: {
          search: 'Pencarian nama industri, sektor, atau alamat',
          sector: 'Filter berdasarkan sektor industri',
          department: 'Filter berdasarkan jurusan',
          periodId: 'Filter ID periode PKL',
          page: 'Nomor halaman (default: 1)',
          limit: 'Jumlah data per halaman (default: 20, max: 100)'
        }
      },
      {
        path: '/api/external/industries/:id',
        method: 'GET',
        description: 'Mengambil detail profil lengkap dari satu industri tertentu.',
        params: {
          id: 'ID unik industri di sistem SI-ERIN'
        }
      },
      {
        path: '/api/external/industries/:id/students',
        method: 'GET',
        description: 'Mengambil daftar siswa yang melaksanakan PKL pada industri tertentu.',
        queryParams: {
          status: 'Filter status penempatan (misal: DITERIMA, COMPLETED, PENGAJUAN_DIKIRIM)',
          periodId: 'Filter ID periode PKL',
          department: 'Filter jurusan siswa',
          className: 'Filter kelas siswa'
        }
      },
      {
        path: '/api/external/students',
        method: 'GET',
        description: 'Pencarian data siswa dan informasi penempatan PKL secara global.',
        queryParams: {
          search: 'Pencarian nama, NIS, atau NISN',
          industryId: 'Filter berdasarkan industri tempat PKL',
          status: 'Filter status penempatan',
          department: 'Filter jurusan siswa',
          className: 'Filter kelas siswa',
          periodId: 'Filter ID periode PKL',
          page: 'Nomor halaman (default: 1)',
          limit: 'Jumlah data per halaman (default: 25, max: 100)'
        }
      },
      {
        path: '/api/external/letters',
        method: 'GET',
        description: 'Mengambil daftar dan tautan unduh dokumen persuratan (Surat Permohonan, Surat Tugas, Balasan DUDI, Penarikan, dan SPPD Monitoring).',
        queryParams: {
          type: 'Jenis surat: all | permohonan | penerjunan | penarikan | balasan | monitoring',
          industryId: 'Filter ID industri',
          periodId: 'Filter ID periode PKL',
          department: 'Filter jurusan',
          search: 'Pencarian nomor surat atau nama industri',
          page: 'Nomor halaman (default: 1)',
          limit: 'Jumlah data per halaman (default: 20, max: 100)'
        }
      }
    ]
  });
}
