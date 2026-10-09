<div align="center">

# 🚀 SI-ERIN v3.0
**Sistem Informasi Praktik Kerja Lapangan Digital & Terintegrasi**

Portal resmi pengelolaan Praktik Kerja Lapangan (PKL/Prakerin). Menghubungkan Siswa, Guru Pembimbing, Tim Pokja, dan Mitra Industri DUDI secara akurat & transparan.

![Next.js](https://img.shields.io/badge/Next.js-14.2-blue?style=flat-square&logo=nextdotjs)
![Prisma](https://img.shields.io/badge/Prisma-ORM-1B222D?style=flat-square&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-DB-4169E1?style=flat-square&logo=postgresql)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)

</div>

---

## 🌟 Fitur Utama (v3.0)

SI-ERIN v3.0 telah diupgrade dengan fitur-fitur kelas enterprise yang dirancang khusus untuk memenuhi standar industri dan mempermudah administrasi sekolah.

### 🛡️ 1. Multi-Role Authentication & Dashboard
Sistem mengadopsi struktur berbasis peran (RBAC - Role Based Access Control) dengan 4 akses level utama:
- **👨‍🎓 Siswa**: Dapat membuat pengajuan tempat PKL (DUDI), memantau status pengajuan, serta melengkapi profil dan dokumen persyaratan (CV, BPJS).
- **👨‍🏫 Guru Pembimbing**: Memantau progress siswa yang ditugaskan kepadanya, serta mengakses jadwal monitoring.
- **🏢 Pokja Hubin**: Tim verifikator yang menyetujui pengajuan, menerbitkan surat pengantar, mendistribusikan jam bimbingan, dan menempatkan kelompok PKL.
- **🔑 Administrator**: Kontrol penuh atas master data (Siswa, Guru, DUDI), manajemen akun, pengaturan identitas sekolah, dan utilitas *backup*.

### 🗺️ 2. Smart Geocoding & Pemetaan DUDI
- **Pencarian Koordinat Cerdas**: Mengintegrasikan API OpenStreetMap Nominatim dengan metode *cascading search* yang tahan terhadap kegagalan pencarian.
- **Dukungan Link Google Maps**: Pengguna cukup mem-*paste* tautan Google Maps (termasuk *shortlink* `goo.gl` atau `maps.app.goo.gl`) dan sistem akan mengekstrak koordinat garis lintang dan garis bujur secara otomatis.
- **Smart Postal Code Filler**: Secara otomatis mendeteksi kode pos berdasarkan kecamatan dan desa/kelurahan yang dipilih.

### ☁️ 3. Universal Backup System & Google Drive Sync
Fitur *Disaster Recovery* dan pengarsipan yang sangat handal:
- **SQL Data Dump Otomatis**: Mendukung backup seluruh skema database (termasuk relasi ganda) murni melalui Prisma, bahkan di *environment* tanpa aplikasi pg_dump CLI.
- **Pengarsipan Dokumen Otomatis**: Semua dokumen PKL penting yang diunggah akan di-*push* ke Google Drive sekolah dengan struktur yang terorganisir rapi:
  - `[Tahun Pelajaran] / [Periode Prakerin] / Pengajuan / [Nama Industri].pdf`
  - `[Tahun Pelajaran] / [Periode Prakerin] / Jawaban / [Nama Industri].pdf`
  - `[Tahun Pelajaran] / [Periode Prakerin] / Penugasan / [Jenis Penugasan] / File Asli / [Nama Surat Tugas].pdf`
  - `[Tahun Pelajaran] / [Periode Prakerin] / Penugasan / [Jenis Penugasan] / Laporan Kegiatan / [Nama Laporan].pdf`
  - `[Tahun Pelajaran] / [Periode Prakerin] / Surat Izin / [Nama Event] / Surat_Izin_[Nama_Siswa].pdf`
- **Dokumen Personal Siswa**: Melakukan *sync* CV dan Kartu BPJS Siswa.

### 📝 4. Manajemen Persuratan & Agenda Canggih
- **Otomatisasi Surat Menyurat**: Pembuatan dokumen SPPD, Surat Penugasan Pokja, Surat Penarikan, dan Surat Pengantar secara langsung dari aplikasi berbasis *template* DOCX.
- **Validasi Dokumen Dua Arah**: Pengecekan Surat Pengajuan yang dikirim sekolah dan Surat Balasan/Jawaban dari pihak Industri.
- **Sistem Cuti & Surat Izin (Event)**: Integrasi khusus bagi siswa PKL yang harus mengikuti kegiatan / event sekolah di luar area industri.

---

## 🛠️ Stack Teknologi

- **Framework**: Next.js 14.x (App Router)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **Map & Geocoding**: Leaflet.js & OpenStreetMap (via Internal Proxy)
- **Cloud Storage**: Google Drive API (v3)

---

## ⚙️ Panduan Instalasi (Development)

1. **Kloning Repository**
   ```bash
   git clone https://github.com/bakpaocoklat30/si-erin.git
   cd si-erin
   ```

2. **Instalasi Dependensi**
   ```bash
   npm install
   ```

3. **Pengaturan Environment Variables**
   Buat file `.env` di *root directory* dan masukkan kredensial berikut:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/sierin"
   NEXTAUTH_SECRET="your_super_secret_key"
   NEXTAUTH_URL="http://localhost:3000"
   
   # Untuk Fitur Sync Backup (Google Drive)
   GDRIVE_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
   GDRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   GDRIVE_ROOT_FOLDER_ID="your_drive_folder_id"
   ```

4. **Migrasi Skema Database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Menjalankan Server Mode Development**
   ```bash
   npm run dev
   ```

6. **Akses Aplikasi**
   Buka `http://localhost:3000` di *browser* Anda.

---

## 🚀 Deployment (Production)

Gunakan perintah build standar Next.js untuk menyiapkan aplikasi Anda ke *server production* (misal: VPS Rocky Linux, Ubuntu, atau Vercel/Railway).

```bash
npm run build
npm run start
```
Atau manfaatkan *process manager* seperti **PM2**:
```bash
pm2 start npm --name "si-erin" -- start
pm2 save
```

---

<div align="center">
Made with ❤️ by Tekad.Dev SMKN 1 Adiwerna for Indonesian Vocational Education
</div>
