# SI-ERIN v3.0

Sistem Informasi Praktik Kerja Lapangan (PKL) Digital & Terintegrasi.
Aplikasi ini memfasilitasi dan mengotomatisasi proses pelaksanaan Praktik Kerja Lapangan / Prakerin di Sekolah Menengah Kejuruan.

## Fitur Utama

- **Pengajuan Online & Mandiri (Siswa)**
  Siswa dapat mengajukan lokasi PKL mitra DUDI secara online dengan fitur pengecekan kuota secara real-time.
- **Verifikasi Berjenjang (Pokja/Hubin)**
  Tim Pokja dapat memverifikasi berkas, melakukan plotting tempat PKL secara manual maupun mandiri, dan mencetak surat-surat terkait seperti Surat Pengantar, Surat Tugas, dll.
- **Monitoring & Jurnal (Guru Pembimbing & Siswa)**
  Guru Pembimbing dapat memantau kehadiran, laporan harian siswa (jurnal), dan mengisi nilai siswa. Siswa dapat mengisi jurnal secara berkala.
- **Manajemen Akun Terintegrasi**
  Mendukung role Siswa, Guru Pembimbing, Pokja (Hubin), dan Admin dengan akses dashboard yang dibedakan.
- **Pencetakan Berkas TTE (Tanda Tangan Elektronik)**
  Mendukung pencetakan berkas PDF dengan Tanda Tangan Elektronik dari Kepala Sekolah menggunakan e-materai/TTE pada SPPD, Surat Tugas, dan Sertifikat.
- **Backup Otomatis ke Google Drive**
  Seluruh data laporan kegiatan, surat permohonan, surat balasan, surat tugas, dan surat izin akan ter-backup otomatis ke folder Google Drive yang terstruktur dan teratur.
- **Integrasi Maps dan Pencarian Lokasi Industri**
  Pencarian koordinat tempat industri yang akurat menggunakan layanan Nominatim (seperti Google Maps) untuk memudahkan mapping tempat PKL.

## Pengembangan Lokal di Mac (Docker)

Untuk menjalankan dan mengembangkan SI-ERIN di macOS menggunakan Docker tanpa perlu menginstal Node.js di komputer host:

1. **Jalankan script dev otomatis:**
   ```bash
   ./dev.sh start
   ```
   *Script ini otomatis memastikan Docker Desktop aktif, menyinkronkan berkas `.env`, menjalankan container dev (Next.js hot-reload, PostgreSQL, dan WAHA), serta menjalankan `prisma db push`.*

2. **Akses Layanan di Browser:**
   - **Aplikasi Web (Next.js):** [http://localhost:3000](http://localhost:3000)
   - **WAHA Dashboard:** [http://localhost:7005/dashboard/](http://localhost:7005/dashboard/) *(User: `admin` | Pass: `SierinSecurePass2026!`)*
   - **PostgreSQL Database:** `localhost:5433` *(User: `sierin_user` | Pass: `SierinSecurePass2026!` | DB: `sierin_db`)*

3. **Akun Login Default (Password: `pakar123`):**
   - Admin: `admin`
   - Pokja: `pokja`
   - Pembimbing: `pembimbing`
   - Siswa: `siswa`

4. **Perintah Cepat CLI (`./dev.sh`):**
   ```bash
   ./dev.sh start    # Jalankan semua container dev (hot-reload)
   ./dev.sh stop     # Hentikan semua container dev
   ./dev.sh restart  # Restart container dev
   ./dev.sh seed     # Isi ulang data dummy / seeder
   ./dev.sh migrate  # Sinkronkan skema database (prisma db push)
   ./dev.sh logs     # Tampilkan live logs aplikasi
   ./dev.sh shell    # Masuk ke terminal kontainer Next.js
   ./dev.sh status   # Cek status container yang berjalan
   ```

---

## Cara Instalasi & Deploy

Untuk melakukan instalasi di server Linux (Rocky Linux / Ubuntu) atau VPS Anda:

1. **Clone/Pull dari repositori Git:**
   ```bash
   git pull origin main
   ```
2. **Install dependensi & ekstensi (termasuk modul optimasi gambar/sharp):**
   ```bash
   npm install
   ```
3. **Build aplikasi Next.js:**
   ```bash
   npm run build
   ```
4. **Jalankan melalui PM2:**
   ```bash
   pm2 restart si-erin
   ```

## Catatan Rilis (Changelog v3.0)

- **Optimasi Kecepatan & Responsivitas:** Mengaktifkan optimasi gambar bawaan Next.js dan modul `sharp` agar tidak membebani penggunaan resource server/bandwidth di IP publik.
- **Desain Landing Page Ultra-Modern:** Peningkatan tampilan UI/UX portal SI-ERIN dengan performa maksimal.
- **Perbaikan Maps Koordinat:** Pencarian lokasi industri yang jauh lebih akurat.
- **Pemisahan Backup Google Drive:** Pengelolaan backup yang rapi ke berbagai sub-folder dalam Google Drive.
- **Perbaikan Surat Permohonan Pokja:** Fix list surat permohonan agar siswa yang ditempatkan secara paksa (manual) tidak muncul lagi di menu persuratan permohonan.
