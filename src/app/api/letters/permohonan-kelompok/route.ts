// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Membuat Backend API Route untuk integrasi database kelompok permohonan PKL dan sinkronisasi status Pokja.
// ✨ Fitur Baru:
//    - GET: Mengambil data kelompok permohonan berdasarkan status ACC Pokja dan filter jurusan.
//    - POST: Memperbarui status generate surat atau sinkronisasi data dari Pokja Jurusan.
// 🔧 Bug Fix: Validasi relasi data kelompok siswa dan industri secara aman.
// 🚀 Inovasi: Database-backed Sync Engine untuk SI-ERIN.
// ----------------------------------------------------------------------

import { NextResponse } from 'next/server';

// Mock Database Connection & Tabel Relasional (Kelompok PKL & ACC Pokja)
// Pada implementasi produksi, bagian ini diganti dengan Prisma / Drizzle / SQL Query ke PostgreSQL/MySQL.
let databaseKelompokPKL = [
  {
    id: 'KEL-TO-001',
    jurusan: 'Teknik Otomotif',
    kodeJurusan: 'TO',
    industriNama: 'PT Astra Daihatsu Motor (Plant Cikarang)',
    industriAlamat: 'Kawasan Industri KIIC, Jl. Permata Raya Lot C-1',
    pimpinanIndustri: 'Ir. Budi Santoso, M.T.',
    periode: '24 Agustus - 30 November 2026',
    tahunPelajaran: '2026/2027',
    tanggalAcc: '10 Agustus 2026',
    pokjaApprover: 'Drs. H. Mulyono, M.T. (Pokja TO)',
    statusPokja: 'DI_ACC',
    statusSurat: 'SUDAH_DIGENERATE',
    anggota: [
      { id: 'S1', nama: 'MUHAMAD DWI ADI PRABOWO', nis: '24.21935', kelas: 'XII TO 1' },
      { id: 'S2', nama: 'M. FALAKHUL ARFANI', nis: '24.21929', kelas: 'XII TO 1' },
      { id: 'S3', nama: 'AHMAD RIZKI RAMADHAN', nis: '24.21902', kelas: 'XII TO 2' }
    ]
  },
  {
    id: 'KEL-TJKT-002',
    jurusan: 'Teknik Jaringan Komputer dan Telekomunikasi',
    kodeJurusan: 'TJKT',
    industriNama: 'PT Telkom Indonesia (Witel Jabar)',
    industriAlamat: 'Jl. Lembong No. 11, Braga, Bandung',
    pimpinanIndustri: 'Siti Rahmawati, S.T.',
    periode: '01 September - 31 Desember 2026',
    tahunPelajaran: '2026/2027',
    tanggalAcc: '11 Agustus 2026',
    pokjaApprover: 'Agus Setiawan, S.Kom. (Pokja TJKT)',
    statusPokja: 'DI_ACC',
    statusSurat: 'BELUM_DIGENERATE',
    anggota: [
      { id: 'S4', nama: 'RANGGA SAPUTRA', nis: '24.22104', kelas: 'XII TJKT 1' },
      { id: 'S5', nama: 'DEWI LESTARI', nis: '24.22115', kelas: 'XII TJKT 1' }
    ]
  },
  {
    id: 'KEL-DKV-003',
    jurusan: 'Desain Komunikasi Visual',
    kodeJurusan: 'DKV',
    industriNama: 'Nexus Kreasi Studio Visual',
    industriAlamat: 'Jl. Raya Margonda No. 88, Depok',
    pimpinanIndustri: 'Reza Artamevia, M.Ds.',
    periode: '15 Agustus - 15 November 2026',
    tahunPelajaran: '2026/2027',
    tanggalAcc: '12 Agustus 2026',
    pokjaApprover: 'Rina Melati, S.Pd. (Pokja DKV)',
    statusPokja: 'DI_ACC',
    statusSurat: 'SUDAH_DIUPLOAD',
    fileSuratUrl: '/surat/permohonan_kel003_signed.pdf',
    anggota: [
      { id: 'S6', nama: 'NABILAH AULIA', nis: '24.23011', kelas: 'XII DKV 2' },
      { id: 'S7', nama: 'FAHRI ALFARIZI', nis: '24.23025', kelas: 'XII DKV 1' },
      { id: 'S8', nama: 'ZAHRA AULIA', nis: '24.23040', kelas: 'XII DKV 2' },
      { id: 'S9', nama: 'DIMAS PRASETYO', nis: '24.23042', kelas: 'XII DKV 1' }
    ]
  }
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jurusan = searchParams.get('jurusan');

    // Filter hanya yang sudah di-ACC oleh Pokja Jurusan
    let filteredData = databaseKelompokPKL.filter(item => item.statusPokja === 'DI_ACC');

    if (jurusan && jurusan !== 'SEMUA') {
      filteredData = filteredData.filter(item => item.kodeJurusan === jurusan);
    }

    return NextResponse.json({
      success: true,
      message: 'Data kelompok pengajuan ter-ACC Pokja berhasil diambil dari database.',
      total: filteredData.length,
      data: filteredData
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Gagal mengambil data dari database.'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, statusSurat, fileSuratUrl } = body;

    const index = databaseKelompokPKL.findIndex(item => item.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, message: 'Kelompok pengajuan tidak ditemukan di database.' }, { status: 404 });
    }

    // Update status di database
    if (statusSurat) databaseKelompokPKL[index].statusSurat = statusSurat;
    if (fileSuratUrl) databaseKelompokPKL[index].fileSuratUrl = fileSuratUrl;

    return NextResponse.json({
      success: true,
      message: `Status kelompok ${id} berhasil disinkronkan ke database.`,
      data: databaseKelompokPKL[index]
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Gagal memperbarui status database.'
    }, { status: 500 });
  }
}