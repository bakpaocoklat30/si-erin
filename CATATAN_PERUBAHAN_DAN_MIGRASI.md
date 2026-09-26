# 📋 CATATAN PERUBAHAN & PANDUAN MIGRASI PC (SI-ERIN)

Dokumen ini mencatat seluruh perubahan arsitektur, berkas baru, modifikasi skema, dan panduan langkah demi langkah saat berpindah ke perangkat/PC baru agar sistem berjalan lancar tanpa kehilangan konteks maupun menghadapi error.

---

## 📌 DAFTAR ISI
1. [Ringkasan Fitur Baru yang Telah Dibangun](#1-ringkasan-fitur-baru-yang-telah-dibangun)
2. [Daftar Berkas Baru & Berkas yang Dimodifikasi](#2-daftar-berkas-baru--berkas-yang-dimodifikasi)
3. [Detail Implementasi Fitur Utama](#3-detail-implementasi-fitur-utama)
   - [A. Penugasan Monitoring Multi-Guru & Multi-Industri](#a-penugasan-monitoring-multi-guru--multi-industri)
   - [B. Pangkat / Golongan Guru (Terkoneksi ke SPPD)](#b-pangkat--golongan-guru-terkoneksi-ke-sppd)
   - [C. Format Dokumen Surat Tugas & SPPD (.DOCX & HTML Preview)](#c-format-dokumen-surat-tugas--sppd-docx--html-preview)
   - [D. Penyesuaian SPPD Kertas F4 & 4 Kolom Tujuan](#d-penyesuaian-sppd-kertas-f4--4-kolom-tujuan)
   - [E. Dukungan Backup & Restore Database](#e-dukungan-backup--restore-database)
4. [Langkah Demi Langkah Pindah ke PC Baru](#4-langkah-demi-langkah-pindah-ke-pc-baru)
5. [Daftar Perintah Penting (Cheat Sheet)](#5-daftar-perintah-penting-cheat-sheet)

---

## 1. Ringkasan Fitur Baru yang Telah Dibangun
Modul **Jadwal & Tugas Monitoring PKL** untuk Pokja / Tata Usaha dengan kemampuan:
- Menjadwalkan monitoring satu atau banyak guru (rombongan tim pendamping).
- Menjadwalkan monitoring ke satu atau banyak industri (multi-destinasi) dalam satu surat penugasan.
- Mengatur rentang tanggal monitoring (satu hari maupun beberapa hari/multi-hari).
- Input & koreksi alamat industri secara instan langsung dari dropdown saat memilih tempat PKL.
- Input & simpan otomatis **Pangkat / Golongan** guru utama maupun pendamping, yang langsung terhubung ke Poin 3 Lembar 1 SPPD.
- Unduh dokumen resmi Word (`.docx`) dan Cetak/Pratinjau HTML responsif untuk:
  1. **Surat Perintah Tugas Monitoring** (dengan kop dinas dan tag TTE Jateng `${ttd_elektronik}`).
  2. **Surat Perintah Perjalanan Dinas (SPPD)** 2 Lembar (Lembar 1 rincian perjalanan, Lembar 2 lembar visum/tanda tangan industri dengan 4 slot stempel/ttd kompak presisi kertas F4).

---

## 2. Daftar Berkas Baru & Berkas yang Dimodifikasi

### A. Berkas Baru (Untracked Files yang Wajib Di-commit/Disalin)
| Path Berkas | Deskripsi & Fungsi |
|---|---|
| `src/lib/docx-generator.ts` | Mesin pembuat file Word `.docx` berbasis binary ZIP manipulation (`adm-zip`) dari template asli Jawa Tengah. Mengatur injeksi XML untuk multi-guru, multi-industri, F4 folio sizing, Poin 3 pangkat/golongan, dan baris tabel visum. |
| `src/lib/monitoring-templates.ts` | Generator pratinjau HTML interaktif untuk Surat Tugas dan SPPD (bisa dicetak langsung dari browser / dialog cetak). |
| `src/app/dashboard/pokja/monitoring/page.tsx` | Antarmuka pengguna (UI) dashboard Pokja untuk manajemen jadwal monitoring, modal multi-guru, multi-industri, modal preview cetak, dan download docx. |
| `src/app/api/pokja/monitoring/route.ts` | Endpoint API `GET` (daftar monitoring, guru, industri) dan `POST` (buat jadwal monitoring, simpan rank guru & alamat industri). |
| `src/app/api/pokja/monitoring/[id]/route.ts` | Endpoint API `PUT` (edit monitoring, perbarui rank guru & alamat) dan `DELETE` (hapus jadwal). |
| `src/app/api/pokja/monitoring/[id]/download-docx/route.ts` | Endpoint API untuk men-download file Word hasil kompilasi dinamis (`type=SURAT_TUGAS` atau `type=SPPD`). |
| `template/SPPD TTE.docx` | Template asli SPPD Provinsi Jawa Tengah dengan tag TTE. |
| `template/Surat Tugas Monitoring PKL.docx` | Template asli Surat Tugas Monitoring dengan tag TTE. |
| `public/images/kop-jateng-smkn1adw.png` | Gambar kop surat Pemerintah Provinsi Jawa Tengah & SMKN 1 Adiwerna. |
| `public/images/kop-surat-tugas.png` | Kop surat alternatif untuk pratinjau dokumen. |

### B. Berkas yang Dimodifikasi
| Path Berkas | Perubahan yang Dilakukan |
|---|---|
| `package.json` & `package-lock.json` | Menambahkan pustaka `adm-zip` dan `@types/adm-zip` untuk manipulasi file `.docx`. |
| `prisma/schema.prisma` | Menambahkan model `MonitoringAssignment`, field `rank String?` pada model `User`, relasi ke `Industry` dan `User`. |
| `src/components/sidebar.tsx` | Menambahkan item navigasi menu Pokja: `Jadwal & Tugas Monitoring` (`/dashboard/pokja/monitoring`). |
| `src/lib/backup-service.ts` | Menambahkan tabel `MonitoringAssignment` dan kolom `rank` ke backup system, menambahkan `session_replication_role = 'replica'` saat export/import. |
| `src/app/api/admin/restore/route.ts` | Menyesuaikan logika restore agar mendukung tabel penugasan monitoring dan filter kolom valid. |
| `prisma/seed.ts` | Memperbaiki impor bcrypt (`import bcrypt from 'bcryptjs'`). |

---

## 3. Detail Implementasi Fitur Utama

### A. Penugasan Monitoring Multi-Guru & Multi-Industri
- **Multi-Guru**:
  - Kolom database: `teacherId` (guru utama) dan `companionTeachers` (JSON array: `[{ name, nip, rank, role }]`).
  - Pada Surat Tugas & SPPD, jika lebih dari 1 guru, format tercetak nomor berurutan (`1. Nama - NIP`, `2. Nama - NIP`, dst).
- **Multi-Industri**:
  - Kolom database: `industryId` (industri utama) dan `targetIndustries` (JSON array: `[{ id, name, address, regency }]`).
  - Alamat industri dapat diedit langsung pada form modal saat memilih industri, dan perubahan tersebut langsung disimpan ke database `Industry`.
- **Multi-Hari**:
  - Kolom database: `monitoringDate` (tanggal mulai) dan `returnDate` (tanggal kembali).
  - Sistem menghitung durasi hari perjalanan dinas secara otomatis.

### B. Pangkat / Golongan Guru (Terkoneksi ke SPPD)
- Field `rank` pada model `User`.
- Pada UI modal monitoring, di sebelah dropdown pilihan guru disediakan kolom **Pangkat / Golongan** dengan indikator *(Muncul di SPPD)*.
- Saat memilih guru, jika guru tersebut sudah memiliki data pangkat di database, kolom terisi otomatis.
- Jika pengguna mengetikkan/mengubah pangkat (contoh: `Penata Muda / III a`, `IX`, `IV a`), saat penugasan disimpan (`POST` / `PUT`), sistem secara otomatis menjalankan `prisma.user.update` untuk menyimpan data `rank` tersebut secara permanen ke akun guru.
- Pada dokumen SPPD Lembar 1 Poin 3 `a. Pangkat dan Golongan`, placeholder bawaan template (`II/D`) otomatis digantikan dengan nilai `mainTeacher.rank`.

### C. Format Dokumen Surat Tugas & SPPD (.DOCX & HTML Preview)
- File DOCX dimanipulasi langsung pada level `word/document.xml` di dalam arsip `.docx` menggunakan `adm-zip`.
- Menjaga integritas tag TTE resmi Provinsi Jawa Tengah:
  - `${nomor_naskah}`
  - `${jabatan_pengirim}`
  - `${nip_pengirim}`
  - `${nama_pengirim}`
  - `${ttd_elektronik}` (QR code tanda tangan elektronik)
- Jabatan petugas pada Surat Tugas dan SPPD diseragamkan sebagai `Guru`.

### D. Penyesuaian SPPD Kertas F4 & 4 Kolom Tujuan
- **Ukuran Kertas**: Diatur presisi ke standar **F4/Folio** (`w:w="12189" w:h="18709"` dxa / 215mm x 330mm) dengan margin atas/bawah 1 cm (567 dxa) dan kiri/kanan 2 cm (1134 dxa).
- **Satu Tujuan**: Jika industri hanya 1, SPPD Lembar 1 Poin 6 dan Lembar 2 Bagian I tidak mencetak angka `1. ...` atau `2. .....  3. .....`, melainkan langsung menuliskan nama industri dan alamat.
- **Tabel Visum Lembar 2**:
  - Menggunakan perhitungan `const effectiveCount = Math.max(4, allIndustries.length);`.
  - Jika tujuan hanya 1, baris II diisi industri tujuan tersebut, dan baris III, IV, V tetap disediakan kosong (tempat cap & ttd DUDI) agar tabel simetris, tidak "wagu", dan pas 1 lembar F4 tanpa meluber ke halaman ketiga.
  - Diakhiri dengan baris VI (Tiba di Tempat Kedudukan / Sekolah) dan baris VII (Catatan Lain-Lain).

### E. Dukungan Backup & Restore Database
- `src/lib/backup-service.ts` sudah menyertakan `MonitoringAssignment` dan `rank` pada `User`.
- Dump SQL menggunakan `SET session_replication_role = 'replica';` untuk mencegah pelanggaran foreign key constraint saat restore data.

---

## 4. Langkah Demi Langkah Pindah ke PC Baru

Saat Anda berpindah ke komputer atau laptop baru, ikuti panduan berikut agar aplikasi langsung dapat dijalankan:

### Langkah 1: Siapkan Repositori di PC Baru
Pastikan seluruh file baru dan perubahan sudah ter-commit di Git atau disalin seluruh foldernya ke PC baru:
```bash
# Pastikan template docx dan gambar kop ikut terbawa:
# - template/SPPD TTE.docx
# - template/Surat Tugas Monitoring PKL.docx
# - public/images/kop-jateng-smkn1adw.png
# - public/images/kop-surat-tugas.png
```

### Langkah 2: Salin Berkas Lingkungan (`.env`)
Karena `.env` diabaikan oleh Git (`.gitignore`), salin berkas `.env` dari PC lama ke PC baru pada root folder:
```env
DATABASE_URL="postgresql://sierin_user:SierinSecurePass2026!@localhost:5433/sierin_db?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="si-erin-super-secret-key-2026"
GOOGLE_CLIENT_EMAIL="si-erin-drive@si-erin.iam.gserviceaccount.com"
GOOGLE_DRIVE_FOLDER_ID="11jp-_v0cFZqmOefzf1Wnks8pkZscGiUT"
GOOGLE_USER_TO_IMPERSONATE=""
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```
*(Sesuaikan port dan password database PostgreSQL jika konfigurasi di PC baru berbeda)*.

### Langkah 3: Pastikan Database PostgreSQL Berjalan
Jika menggunakan Docker di PC baru:
```bash
# Pastikan kontainer database berjalan di port 5433 (atau sesuaikan dengan DATABASE_URL di .env)
docker-compose up -d
```

### Langkah 4: Pasang Dependensi Node.js
Jalankan perintah berikut di folder proyek untuk mengunduh pustaka (termasuk `adm-zip`):
```bash
npm install
```

### Langkah 5: Sinkronisasi Skema Prisma ke Database
Proyek ini menggunakan Prisma dengan `db push` (bukan migrate baseline):
```bash
# 1. Generate Prisma Client agar mengenal model MonitoringAssignment & User.rank
npx prisma generate

# 2. Sinkronkan tabel ke database PostgreSQL
npx prisma db push
```

### Langkah 6: Jalankan Server Pengembangan (Dev)
```bash
npm run dev
```
Buka browser dan akses:
- URL Utama: `http://localhost:3000`
- Menu Monitoring Pokja: `http://localhost:3000/dashboard/pokja/monitoring`

---

## 5. Daftar Perintah Penting (Cheat Sheet)

| Kebutuhan | Perintah Terminal |
|---|---|
| Cek status git & file untracked | `git status` |
| Tambah semua file perubahan | `git add .` |
| Commit perubahan | `git commit -m "feat: penugasan monitoring, pangkat guru sppd, dan generator docx"` |
| Update prisma client | `npx prisma generate` |
| Sinkronkan skema database | `npx prisma db push` |
| Jalankan dev server | `npm run dev` |
| Build produksi | `npm run build` |

---
*Catatan dibuat otomatis pada 26 September 2026 sebagai dokumentasi resmi pembaruan SI-ERIN v2.0.*
