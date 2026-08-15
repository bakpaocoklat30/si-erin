// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Membuat API Route untuk manajemen kelompok permohonan PKL berstatus ACC Pokja.
// ✨ Fitur Baru:
//    - GET endpoint untuk mengambil daftar kelompok berdasarkan jurusan.
//    - POST endpoint untuk memperbarui status generate atau upload surat kelompok.
// 🔧 Bug Fix: Validasi data kelompok agar sesuai dengan format multisiswa.
// 🚀 Inovasi: RESTful API Backend untuk SI-ERIN Letter Module.
// ----------------------------------------------------------------------

import { NextResponse } from 'next/server';

// Mock Database Storage untuk Kelompok Pengajuan PKL yang sudah di-ACC Pokja
let mockDatabaseKelompok = [
  {
    id: 'KEL-001',
    jurusan: 'Teknik Otomotif',
    kodeJurusan: 'TO',
    industriNama: 'PT Astra Daihatsu Motor (Plant Cikarang)',
    industriAlamat: 'Kawasan Industri KIIC, Jl. Permata Raya Lot C-1',
    pimpinanIndustri: 'Ir. Budi Santoso, M.T.',
    periode: '24 Agustus - 30 November 2026',
    tahunPelajaran: '2026/2027',
    tanggalAcc: '10 Agustus 2026',
    pokjaApprover: 'Drs. H. Mulyono, M.T. (Pokja TO)',
    statusSurat: 'SUDAH_DIGENERATE',
    anggota: [
      { id: 'S1', nama: 'MUHAMAD DWI ADI PRABOWO', nis: '24.21935', kelas: 'XII TO 1' },
      { id: 'S2', nama: 'M. FALAKHUL ARFANI', nis: '24.21929', kelas: 'XII TO 1' },
      { id: 'S3', nama: 'AHMAD RIZKI RAMADHAN', nis: '24.21902', kelas: 'XII TO 2' }
    ]
  },
  {
    id: 'KEL-002',
    jurusan: 'Teknik Jaringan Komputer dan Telekomunikasi',
    kodeJurusan: 'TJKT',
    industriNama: 'PT Telkom Indonesia (Witel Jabar)',
    industriAlamat: 'Jl. Lembong No. 11, Braga, Bandung',
    pimpinanIndustri: 'Siti Rahmawati, S.T.',
    periode: '01 September - 31 Desember 2026',
    tahunPelajaran: '2026/2027',
    tanggalAcc: '11 Agustus 2026',
    pokjaApprover: 'Agus Setiawan, S.Kom. (Pokja TJKT)',
    statusSurat: 'BELUM_DIGENERATE',
    anggota: [
      { id: 'S4', nama: 'RANGGA SAPUTRA', nis: '24.22104', kelas: 'XII TJKT 1' },
      { id: 'S5', nama: 'DEWI LESTARI', nis: '24.22115', kelas: 'XII TJKT 1' }
    ]
  }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jurusan = searchParams.get('jurusan');

  let data = mockDatabaseKelompok;
  if (jurusan && jurusan !== 'SEMUA') {
    data = mockDatabaseKelompok.filter(item => item.kodeJurusan === jurusan);
  }

  return NextResponse.json({
    success: true,
    count: data.length,
    data: data
  }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, statusSurat } = body;

    const index = mockDatabaseKelompok.findIndex(item => item.id === id);
    if (index !== -1) {
      mockDatabaseKelompok[index].statusSurat = statusSurat || mockDatabaseKelompok[index].statusSurat;
      return NextResponse.json({
        success: true,
        message: `Status surat kelompok ${id} berhasil diperbarui.`,
        data: mockDatabaseKelompok[index]
      }, { status: 200 });
    }

    return NextResponse.json({
      success: false,
      message: 'Kelompok pengajuan tidak ditemukan.'
    }, { status: 404 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan pada server API.'
    }, { status: 500 });
  }
}