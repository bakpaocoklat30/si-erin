# 🏢 SI-ERIN

## Sistem Informasi Prakerin & Mitra Industri SMK

<div align="center">

![SI-ERIN Enterprise Edition](https://img.shields.io/badge/SI--ERIN-Enterprise%20Edition-indigo?style=for-the-badge\&logo=codeforces\&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14%2F15-black?style=for-the-badge\&logo=next.js\&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge\&logo=typescript\&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-282C34?style=for-the-badge\&logo=prisma\&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge\&logo=postgresql\&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38BDF8?style=for-the-badge\&logo=tailwind-css\&logoColor=white)

**Platform Digital Manajemen Prakerin, DUDI, Pengajuan, Verifikasi, Kelompok, dan Administrasi PKL untuk SMK**

</div>

---

## 📌 Tentang SI-ERIN

**SI-ERIN** adalah aplikasi berbasis web yang dirancang untuk membantu **Sekolah Menengah Kejuruan (SMK)** dalam mengelola administrasi dan proses **Praktik Kerja Lapangan (Prakerin/PKL)** secara terpusat.

SI-ERIN memfokuskan proses digitalisasi pada:

* Manajemen pengguna dan hak akses.
* Manajemen data siswa, kelas, jurusan, guru, dan Pokja.
* Manajemen Dunia Usaha dan Dunia Industri (DUDI).
* Pengajuan Prakerin oleh siswa.
* Proses verifikasi pengajuan oleh Pokja.
* Pengelolaan kelompok Prakerin.
* Pengelolaan periode Prakerin.
* Penempatan siswa ke mitra industri.
* Administrasi dan distribusi dokumen Prakerin.
* Upload dokumen surat yang telah diproses.
* Pencadangan database dan file aplikasi.

> **Catatan:** Modul jurnal kegiatan, absensi, monitoring aktivitas harian, dan penilaian PKL belum termasuk dalam versi fitur saat ini.

---

# 🎯 Tujuan Sistem

SI-ERIN dikembangkan untuk membantu sekolah:

1. Mengurangi proses administrasi Prakerin yang masih dilakukan secara manual.
2. Memusatkan data siswa, DUDI, kelompok, dan pengajuan dalam satu sistem.
3. Mempercepat proses verifikasi dan penempatan siswa.
4. Mempermudah Pokja dalam mengelola proses Prakerin.
5. Mempermudah Tata Usaha dalam pengelolaan dokumen.
6. Memberikan informasi status pengajuan secara transparan kepada siswa.
7. Menjaga keamanan dan ketersediaan data sistem.

---

# 👥 Role-Based Access Control

SI-ERIN menggunakan pendekatan **Role-Based Access Control (RBAC)** untuk membatasi akses pengguna berdasarkan tanggung jawab masing-masing.

| Role                  | Fungsi                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| **Admin**             | Mengelola pengguna, siswa, kelas, jurusan, guru, Pokja, tahun pelajaran, dan konfigurasi sistem      |
| **Pokja Prakerin**    | Mengelola DUDI, periode PKL, verifikasi pengajuan, kelompok, penempatan, dan dokumen                 |
| **Tata Usaha**        | Mengelola administrasi dan dokumen surat yang berkaitan dengan Prakerin                              |
| **Guru / Pembimbing** | Melihat informasi siswa dan kelompok yang menjadi tanggung jawabnya                                  |
| **Siswa**             | Mengajukan Prakerin, melihat status pengajuan, melihat kelompok, dan mengakses dokumen yang tersedia |

---

# 🔐 Struktur Hak Akses

## 👑 Admin

Admin memiliki fungsi pengelolaan sistem secara keseluruhan.

Fitur utama:

* Manajemen akun siswa.
* Manajemen akun guru.
* Manajemen akun Pokja.
* Manajemen data kelas.
* Manajemen jurusan.
* Reset password pengguna.
* Pengaturan tahun pelajaran aktif.
* Pengaturan identitas sekolah.
* Monitoring error aplikasi.
* Pengelolaan backup dan restore.
* Konfigurasi sistem.

---

## 🏢 Pokja Prakerin

Pokja merupakan pihak yang menangani proses operasional Prakerin.

Fitur utama:

* Manajemen DUDI.
* Pengelolaan periode Prakerin.
* Pengaturan periode 1 dan periode 2.
* Menentukan kelas yang diizinkan mengikuti suatu periode.
* Review pengajuan siswa.
* Verifikasi pengajuan.
* Menolak pengajuan.
* Mengelola kelompok Prakerin.
* Mengelola penempatan siswa.
* Mengunggah dokumen/surat.
* Distribusi dokumen kepada siswa.
* Melihat status pengajuan.

---

## 📂 Tata Usaha

Tata Usaha menangani aspek administrasi dan dokumentasi.

Fitur utama:

* Pengelolaan dokumen surat.
* Arsip dokumen Prakerin.
* Rekap administrasi.
* Akses dokumen penempatan.
* Pengelolaan dokumen yang berkaitan dengan proses PKL.

---

## 👨‍🏫 Guru / Pembimbing

Guru dapat memperoleh informasi yang berkaitan dengan siswa dan kelompok yang menjadi tanggung jawabnya.

Fokus utama:

* Melihat data siswa.
* Melihat data kelompok.
* Melihat informasi lokasi/mitra Prakerin.
* Melihat dokumen yang tersedia.
* Mendapatkan informasi penempatan siswa.

> Modul jurnal, absensi, dan monitoring kegiatan harian belum termasuk dalam versi aplikasi saat ini.

---

## 🎓 Siswa

Siswa merupakan pengguna yang mengajukan dan mengikuti proses administrasi Prakerin.

Fitur utama:

* Melihat profil.
* Mengajukan Prakerin.
* Mengirim pengajuan.
* Melihat status pengajuan.
* Melihat hasil verifikasi.
* Melihat informasi kelompok.
* Melihat anggota kelompok.
* Melihat mitra industri.
* Mengakses dokumen yang telah tersedia.

---

# 🚀 Fitur Utama

## 👥 1. Manajemen Pengguna

Admin dapat mengelola seluruh akun pengguna yang digunakan dalam sistem.

Data yang dikelola meliputi:

* Siswa.
* Guru.
* Pokja.
* Admin.
* Kelas.
* Jurusan.

Admin juga dapat melakukan **reset password pengguna** dan mengatur **tahun pelajaran aktif**.

---

## 🏫 2. Manajemen Kelas & Jurusan

Sistem menyediakan pengelolaan struktur akademik sekolah.

Data yang dikelola:

* Tahun pelajaran.
* Jurusan.
* Kelas.
* Tingkat kelas.
* Status kelas.
* Relasi siswa dengan kelas.

---

## 🏢 3. Manajemen DUDI / Mitra Industri

SI-ERIN menyediakan pusat data **Dunia Usaha dan Dunia Industri (DUDI)**.

Data DUDI dapat mencakup:

* Nama perusahaan.
* Nama pimpinan/penanggung jawab.
* NIB.
* NPWP.
* Logo perusahaan.
* Nomor telepon.
* Email.
* Alamat.
* Provinsi.
* Kabupaten/Kota.
* Kecamatan.
* Kelurahan/Desa.
* Bidang usaha.
* Kuota siswa.
* Koordinat lokasi.
* Status mitra.

Sistem juga dapat mendukung mitra dengan **kuota tanpa batas (unlimited)**.

---

## 🔎 4. Pencarian Bidang Usaha

Sistem menyediakan *searchable select* untuk memilih bidang usaha.

Fitur:

* Pencarian real-time.
* Filter data.
* Dropdown interaktif.
* Click-outside handler.
* Pemilihan bidang usaha secara cepat.

---

# 🌍 5. Data Wilayah Indonesia

SI-ERIN menyediakan pemilihan wilayah administratif Indonesia.

Struktur wilayah:

```text
Provinsi
└── Kabupaten / Kota
    └── Kecamatan
        └── Kelurahan / Desa
```

Sistem menggunakan mekanisme **API + static fallback** agar proses input wilayah tetap dapat berlangsung ketika API eksternal mengalami gangguan.

---

# 🗺️ 6. Peta Lokasi DUDI

Lokasi mitra industri dapat ditentukan menggunakan **OpenStreetMap dan Leaflet.js**.

Fitur:

* Interactive map.
* Marker lokasi.
* Latitude.
* Longitude.
* Penyimpanan koordinat.
* Shortcut menuju Google Maps.

Contoh data koordinat:

```json
{
  "latitude": -6.9782,
  "longitude": 109.1401
}
```

---

# 📝 7. Pengajuan Prakerin

Siswa dapat melakukan pengajuan Prakerin melalui aplikasi.

Secara umum alurnya:

```text
Siswa
  │
  ▼
Membuat Pengajuan
  │
  ▼
Memilih / Mengusulkan DUDI
  │
  ▼
Mengirim Pengajuan
  │
  ▼
Menunggu Verifikasi Pokja
```

Status pengajuan dapat digunakan untuk menunjukkan posisi proses siswa dalam sistem.

---

# ✅ 8. Verifikasi Pengajuan

Pokja melakukan review terhadap pengajuan siswa.

Proses utama:

```text
Pengajuan Siswa
       │
       ▼
     Review
       │
   ┌───┴────┐
   │        │
   ▼        ▼
Verifikasi  Tolak
   │
   ▼
Proses Pembuatan Surat
```

Aksi utama pada proses verifikasi:

* **Verifikasi ajuan, proses pembuatan surat**
* **Tolak ajuan**

Setelah pengajuan diverifikasi, data dapat masuk ke proses pengelolaan kelompok dan penempatan Prakerin.

---

# 👥 9. Kelompok Prakerin

Pengajuan yang telah diverifikasi dapat dikelola menjadi kelompok Prakerin.

Informasi kelompok dapat meliputi:

* Nama/identitas kelompok.
* Anggota kelompok.
* Kelas.
* Jurusan.
* DUDI.
* Periode Prakerin.
* Status kelompok.
* Dokumen kelompok.

Siswa juga dapat melihat informasi **teman satu kelompok** melalui sistem.

---

# 📅 10. Periode Prakerin

Pokja dapat membuat dan mengelola periode pelaksanaan Prakerin.

Contoh:

```text
Tahun Pelajaran 2026/2027

Periode 1
├── Kelas XI TKJ 1
├── Kelas XI TKJ 2
└── Kelas XI TKJ 3

Periode 2
├── Kelas XI TKJ 4
├── Kelas XI TKJ 5
└── Kelas XI TKJ 6
```

Pokja dapat menentukan kelas mana yang diperbolehkan mengikuti periode tertentu.

---

# 📄 11. Administrasi & Dokumen

SI-ERIN mendukung proses administrasi dokumen Prakerin secara digital.

Dokumen dapat meliputi:

* Surat pengantar.
* Surat permohonan Prakerin.
* Surat penempatan.
* Dokumen kelompok.
* Dokumen pendukung lainnya.

Dokumen yang sudah dibuat dapat diunggah kembali ke sistem untuk disimpan dan diakses oleh pihak yang berwenang.

---

# 🔄 12. Alur Sistem

Berikut gambaran umum proses SI-ERIN:

```text
                       ┌───────────────────┐
                       │       ADMIN       │
                       │                   │
                       │ User / Kelas      │
                       │ Jurusan / Config  │
                       └─────────┬─────────┘
                                 │
                                 ▼
┌──────────────┐        ┌───────────────────┐
│    SISWA     │───────▶│     SI-ERIN       │
│              │        │                   │
│ Pengajuan    │        │ Central Workflow  │
│ PKL          │        │ & Data Management │
└──────┬───────┘        └─────────┬─────────┘
       │                          │
       │                          ▼
       │                 ┌───────────────────┐
       │                 │       POKJA       │
       │                 │                   │
       │                 │ Review Pengajuan  │
       │                 │ Verifikasi        │
       │                 │ Kelompok          │
       │                 │ Penempatan        │
       │                 └─────────┬─────────┘
       │                           │
       │                           ▼
       │                 ┌───────────────────┐
       │                 │       DUDI        │
       │                 │ / Mitra Industri  │
       │                 └───────────────────┘
       │
       ▼
┌──────────────┐
│ Kelompok PKL │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Dokumen    │
│  Penempatan  │
└──────────────┘
```

---

# 🛡️ Enterprise Security

SI-ERIN memiliki sejumlah komponen keamanan untuk meningkatkan keandalan aplikasi.

## 🔍 Automated Error Logging

Sistem dapat mencatat error aplikasi ke database melalui model:

```text
ErrorLog
```

Jenis error yang dapat dicatat antara lain:

* Runtime error.
* API error.
* Exception.
* Error database.
* Error proses tertentu.

Tujuannya adalah membantu administrator melakukan troubleshooting terhadap masalah aplikasi.

---

## 🚦 Rate Limiting

Endpoint penting dapat diberikan mekanisme *rate limiting* berbasis IP.

Tujuan utamanya:

* Mengurangi brute-force.
* Mengurangi request berlebihan.
* Mencegah penyalahgunaan endpoint.
* Membatasi automated request.

Area yang dapat diberikan perlindungan antara lain:

```text
Authentication
├── Login
├── Session
└── Password-related endpoint

Data Processing
├── CSV Import
├── Upload
└── API Endpoint tertentu
```

---

## 🔒 Security Headers

Middleware aplikasi dapat digunakan untuk menerapkan HTTP security headers.

Contoh:

```text
Content-Security-Policy
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security
```

Konfigurasi harus disesuaikan dengan kebutuhan aplikasi dan environment production.

---

# ☁️ Disaster Recovery & Backup

SI-ERIN dirancang agar database dan file penting dapat dicadangkan secara berkala.

Komponen backup dapat mencakup:

```text
SI-ERIN
   │
   ├── PostgreSQL Database
   │
   ├── Prisma Data
   │
   └── public/uploads/
           │
           ▼
      Backup Engine
           │
           ▼
      Google Drive
```

Scheduler otomatis dapat menggunakan:

```text
node-cron
```

Contoh jadwal:

```text
00:00 setiap hari
        │
        ▼
   Backup Database
        │
        ▼
   Backup Uploads
        │
        ▼
 Upload Google Drive
```

---

# 🧰 Teknologi

| Teknologi            | Penggunaan                |
| -------------------- | ------------------------- |
| **Next.js**          | Framework aplikasi        |
| **React**            | User Interface            |
| **TypeScript**       | Pengembangan type-safe    |
| **Prisma ORM**       | Object Relational Mapping |
| **PostgreSQL**       | Database                  |
| **Tailwind CSS**     | Styling                   |
| **Leaflet.js**       | Interactive Map           |
| **OpenStreetMap**    | Peta                      |
| **Google Drive API** | Backup                    |
| **node-cron**        | Scheduler                 |
| **PM2**              | Process Manager           |
| **Nginx**            | Reverse Proxy             |
| **Let's Encrypt**    | SSL/TLS                   |

---

# 💻 Instalasi Development

## 1. Clone Repository

```bash
git clone https://github.com/bakpaocoklat30/si-erin.git
cd si-erin
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Konfigurasi Environment

Buat file:

```text
.env
```

pada root project.

Contoh:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/sierin_db?schema=public"

NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REFRESH_TOKEN="your-google-refresh-token"

CRON_SECRET="your-cron-secret"
```

### ⚠️ Jangan Commit Credential

Tambahkan file berikut ke `.gitignore`:

```gitignore
.env
.env.local
.env.development
.env.production
```

Jangan pernah menyimpan credential produksi secara langsung di repository publik.

---

# 🗄️ Setup Prisma

Generate Prisma Client:

```bash
npx prisma generate
```

Untuk development menggunakan schema database:

```bash
npx prisma db push
```

Jika project menggunakan migration:

```bash
npx prisma migrate dev
```

Untuk melihat database menggunakan Prisma Studio:

```bash
npx prisma studio
```

---

# ▶️ Menjalankan Development Server

```bash
npm run dev
```

Aplikasi kemudian dapat diakses melalui:

```text
http://localhost:3000
```

---

# 🏗️ Production Build

Sebelum deployment production:

```bash
npm install
```

Kemudian:

```bash
npx prisma generate
```

Build aplikasi:

```bash
npm run build
```

Menjalankan aplikasi:

```bash
npm run start
```

---

# ⚙️ Deployment Menggunakan PM2

Install PM2 apabila belum tersedia:

```bash
npm install -g pm2
```

Jalankan aplikasi:

```bash
pm2 start npm --name "si-erin" -- start
```

Simpan konfigurasi:

```bash
pm2 save
```

Aktifkan startup:

```bash
pm2 startup
```

Lihat status aplikasi:

```bash
pm2 status
```

Lihat log:

```bash
pm2 logs si-erin
```

Restart:

```bash
pm2 restart si-erin
```

Stop:

```bash
pm2 stop si-erin
```

---

# 🌐 Nginx Reverse Proxy

Contoh konfigurasi Nginx:

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name si-erin.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;

        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ubah:

```text
si-erin.example.com
```

menjadi domain aplikasi sebenarnya.

---

# 🔐 SSL dengan Let's Encrypt

Install Certbot sesuai distribusi Linux yang digunakan.

Contoh menjalankan Certbot:

```bash
sudo certbot --nginx -d si-erin.example.com
```

Setelah konfigurasi berhasil, aplikasi dapat diakses melalui:

```text
https://si-erin.example.com
```

---

# 📁 Struktur Project

Contoh struktur project:

```text
si-erin/
├── app/
│   ├── api/
│   ├── dashboard/
│   ├── login/
│   └── ...
│
├── components/
│   ├── ui/
│   ├── forms/
│   └── ...
│
├── lib/
│   ├── auth/
│   ├── prisma/
│   └── ...
│
├── prisma/
│   └── schema.prisma
│
├── public/
│   └── uploads/
│
├── scripts/
│   └── ...
│
├── middleware.ts
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

> Struktur aktual dapat berubah sesuai perkembangan aplikasi.

---

# 📜 Script NPM

Contoh script yang umum digunakan:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  }
}
```

Jalankan development:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Production:

```bash
npm run start
```

Generate Prisma:

```bash
npm run prisma:generate
```

Database push:

```bash
npm run prisma:push
```

Migration:

```bash
npm run prisma:migrate
```

Prisma Studio:

```bash
npm run prisma:studio
```

---

# 🚀 Contoh Deployment Script

Apabila repository berada di server Linux, proses deployment dapat dibuat sederhana menggunakan shell script.

Contoh:

```bash
#!/bin/bash

set -e

echo "===================================="
echo "      SI-ERIN DEPLOYMENT SCRIPT     "
echo "===================================="

echo "[1/6] Pull repository..."
git pull origin main

echo "[2/6] Install dependencies..."
npm install

echo "[3/6] Generate Prisma Client..."
npx prisma generate

echo "[4/6] Build application..."
npm run build

echo "[5/6] Restart PM2..."
pm2 restart si-erin || pm2 start npm --name "si-erin" -- start

echo "[6/6] Save PM2 configuration..."
pm2 save

echo "===================================="
echo "       DEPLOYMENT COMPLETED         "
echo "===================================="
```

Simpan sebagai:

```text
scripts/deploy.sh
```

Berikan permission:

```bash
chmod +x scripts/deploy.sh
```

Kemudian jalankan:

```bash
./scripts/deploy.sh
```

---

# 💾 Contoh Backup Script

Contoh sederhana untuk membuat backup PostgreSQL:

```bash
#!/bin/bash

set -e

BACKUP_DIR="./backup"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

mkdir -p "$BACKUP_DIR"

echo "Membuat backup database..."

pg_dump "$DATABASE_URL" > "$BACKUP_DIR/database_$TIMESTAMP.sql"

echo "Backup selesai:"
echo "$BACKUP_DIR/database_$TIMESTAMP.sql"
```

Simpan sebagai:

```text
scripts/backup-db.sh
```

Berikan permission:

```bash
chmod +x scripts/backup-db.sh
```

Jalankan:

```bash
./scripts/backup-db.sh
```

> Script backup di atas merupakan contoh dasar. Untuk production, konfigurasi backup harus disesuaikan dengan arsitektur database, keamanan credential, retensi backup, dan mekanisme upload storage yang digunakan.

---

# 🔄 Siklus Pengajuan Prakerin

```text
                ┌────────────────┐
                │     SISWA      │
                └───────┬────────┘
                        │
                        ▼
                Buat Pengajuan
                        │
                        ▼
                Kirim Pengajuan
                        │
                        ▼
                ┌────────────────┐
                │      POKJA     │
                └───────┬────────┘
                        │
                        ▼
                     Review
                        │
               ┌────────┴────────┐
               │                 │
               ▼                 ▼
          Verifikasi            Tolak
               │
               ▼
      Proses Pembuatan Surat
               │
               ▼
      Kelompok / Penempatan
               │
               ▼
        Upload Dokumen
               │
               ▼
             SISWA
```

---

# 🏢 Siklus Pengelolaan DUDI

```text
Tambah DUDI
    │
    ▼
Lengkapi Identitas
    │
    ├── Nama Perusahaan
    ├── NIB
    ├── NPWP
    ├── Alamat
    ├── Bidang Usaha
    ├── Kontak
    └── Lokasi
          │
          ▼
       Simpan
          │
          ▼
     Database DUDI
          │
          ▼
  Digunakan untuk
  Pengajuan / Penempatan
```

---

# 🔐 Prinsip Keamanan

Dalam deployment production, perhatikan beberapa hal berikut:

* Gunakan HTTPS.
* Jangan commit `.env`.
* Gunakan secret yang kuat.
* Batasi akses database.
* Gunakan firewall pada server.
* Jalankan aplikasi menggunakan user non-root jika memungkinkan.
* Backup secara berkala.
* Simpan backup pada lokasi berbeda dari server utama.
* Batasi akses administratif.
* Perbarui dependency secara berkala.

---

# 🧪 Quality & Development

Sebelum melakukan deployment, jalankan:

```bash
npm run build
```

Pastikan tidak terdapat error build.

Untuk pemeriksaan Prisma:

```bash
npx prisma validate
```

Untuk melihat schema:

```bash
npx prisma format
```

---

# 🗺️ Roadmap

Fitur berikut dapat dikembangkan pada tahap berikutnya:

```text
[✓] Manajemen pengguna
[✓] RBAC
[✓] Manajemen siswa
[✓] Manajemen kelas
[✓] Manajemen jurusan
[✓] Manajemen guru
[✓] Manajemen Pokja
[✓] Manajemen DUDI
[✓] Pengajuan Prakerin
[✓] Verifikasi pengajuan
[✓] Manajemen kelompok
[✓] Periode Prakerin
[✓] Penempatan siswa
[✓] Administrasi dokumen
[✓] Backup / Disaster Recovery

[ ] Jurnal kegiatan
[ ] Absensi siswa
[ ] Monitoring kegiatan PKL
[ ] Penilaian PKL
[ ] Monitoring pembimbing
```

> Daftar roadmap menunjukkan arah pengembangan dan tidak berarti seluruh fitur yang bertanda `[ ]` telah tersedia pada versi saat ini.

---

# 🤝 Kontribusi

Kontribusi terhadap pengembangan SI-ERIN sangat terbuka.

Buat branch baru:

```bash
git checkout -b feature/nama-fitur
```

Lakukan perubahan:

```bash
git add .
```

Commit:

```bash
git commit -m "feat: menambahkan nama fitur"
```

Push:

```bash
git push origin feature/nama-fitur
```

Kemudian buat **Pull Request** ke repository utama.

---

# 📄 Lisensi

SI-ERIN dikembangkan sebagai platform digital untuk mendukung pengelolaan **Praktik Kerja Lapangan (Prakerin/PKL) dan hubungan industri pada Sekolah Menengah Kejuruan (SMK)**.

Dikembangkan oleh:

**BreakcellentDev**

untuk mendukung transformasi digital dan pengelolaan pendidikan vokasi di Indonesia.

© 2026 SI-ERIN — All Rights Reserved.

---

<div align="center">

## 🏢 SI-ERIN

**Digitalisasi Manajemen Prakerin & Hubungan Industri SMK**

Made with ❤️ by Tekad.Dev SMKN 1 Adiwerna for Indonesian Vocational Education

</div>
