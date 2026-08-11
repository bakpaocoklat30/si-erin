# 🚀 SI-ERIN — SISTEM INFORMASI PRAKERIN & MITRA INDUSTRI SMK

**SI-ERIN (Sistem Informasi Prakerin & Mitra Industri)** adalah platform manajemen Praktik Kerja Lapangan (PKL) *enterprise-grade* terintegrasi yang dirancang khusus untuk memenuhi standar tata kelola sekolah vokasi (SMK). Platform ini mencakup pengelolaan data siswa, integrasi profil DUDI (Dapodik Standard), alur verifikasi pengajuan 6 tahap, manajemen kelompok, hingga penerbitan dan pengunggahan berkas administrasi resmi (Surat Permohonan & Surat Balasan).

---

## 📋 DAFTAR ISI

1. [Ringkasan Teknologi (Tech Stack)](https://www.google.com/search?q=%23-ringkasan-teknologi-tech-stack)
2. [Fitur-Fitur Utama Platform](https://www.google.com/search?q=%23-fitur-fitur-utama-platform)
3. [Arsitektur & Struktur Folder Proyek](https://www.google.com/search?q=%23-arsitektur--struktur-folder-proyek)
4. [Skema Database PostgreSQL (Prisma ORM)](https://www.google.com/search?q=%23-skema-database-postgresql-prisma-orm)
5. [Alur Alur Penempatan PKL 6 Tahap](https://www.google.com/search?q=%23-alur-penempatan-pkl-6-tahap)
6. [Panduan Instalasi & Pengembangan](https://www.google.com/search?q=%23-panduan-instalasi--pengembangan)
7. [Infrastruktur Docker & Nginx Deployment](https://www.google.com/search?q=%23-infrastruktur-docker--nginx-deployment)
8. [Panduan Integrasi AI (Instruksi Pengembang Selanjutnya)](https://www.google.com/search?q=%23-panduan-integrasi-ai-instruksi-pengembang-selanjutnya)

---

## 🛠️ RINGKASAN TEKNOLOGI (TECH STACK)

| Layer | Teknologi | Deskripsi / Fungsi |
| --- | --- | --- |
| **Framework** | Next.js 14 (App Router) | Fullstack React Engine dengan Server/Client Components |
| **Bahasa** | TypeScript | Type-safe JavaScript di seluruh layer API & UI |
| **Styling** | Tailwind CSS + PostCSS | Utility-first styling dengan sistem tema Dark/Light Mode |
| **Database** | PostgreSQL | Relational Database Enterprise |
| **ORM** | Prisma ORM | Object-Relational Mapping & Migration Engine |
| **Autentikasi** | NextAuth.js / Custom JWT | Multirole Role-Based Access Control (RBAC) |
| **Server Engine** | Docker & Nginx | Containerized deployment dengan Reverse Proxy |

---

## 🌟 FITUR-FITUR UTAMA PLATFORM

### 🔑 1. Autentikasi & RBAC Multi-Role

* **ADMIN**: Akses penuh ke data master (Tahun Pelajaran, Jurusan, Kelas, User Management, Reset Password Massal, Import Siswa).
* **POKJA (Panitia Prakerin)**: Manajemen Periode/Gelombang PKL, Katalog DUDI, Approval/Verifikasi 6-Step Pengajuan, dan Pengunggahan Surat Permohonan Kelompok.
* **PEMBIMBING**: Dashboard monitoring progress dan tempat penempatan siswa bimbingan.
* **SISWA**: Pengisian profil (CV/BPJS), pengajuan penempatan DUDI, pelacakan alur 6-step, serta pengunggahan Surat Balasan Industri.

### 🏢 2. Katalog DUDI Standar Dapodik Kemdikbudristek

* Pencatatan NIB, NPWP, alamat rinci (Jalan, RT/RW, Dusun, Desa/Kelurahan, Kecamatan, Kode Pos).
* Koordinat **Latitude & Longitude** presisi untuk pembukaan peta Google Maps satelit.
* Pengelolaan Kuota Penempatan & Branding Logo DUDI.

### 📜 3. Alur Verifikasi 6-Step Penempatan

Sistem pelacakan real-time dari pengajuan awal siswa hingga resmi diterima oleh perusahaan mitra.

---

## 📂 ARSITEKTUR & STRUKTUR FOLDER PROYEK

```text
SI-ERIN/
├── Dockerfile                         # Containerization setup Next.js
├── docker-compose.yml                 # Orchestration app, PostgreSQL, & Nginx
├── next-env.d.ts
├── nginx/
│   └── default.conf                   # Nginx Reverse Proxy config
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── prisma/
│   ├── schema.prisma                  # Master Prisma Schema
│   ├── seed.ts                        # Seeder data awal (Admin, Pokja, Master)
│   └── migrations/                    # Track record migrasi database
├── public/
│   └── uploads/                       # Storage lokal untuk file (CV, Surat, Logo)
│       ├── cv/
│       ├── surat-balasan/
│       └── surat-pengantar/
└── src/
    ├── middleware.ts                  # Route protection & Auth Guard
    ├── app/                           # Next.js 14 App Router Directory
    │   ├── (auth)/
    │   │   └── login/
    │   │       └── page.tsx           # Halaman Login Multi-Role
    │   ├── api/                       # REST API Handlers
    │   │   ├── admin/                 # API Endpoint Khusus Admin
    │   │   │   ├── departments/
    │   │   │   ├── exploration/
    │   │   │   ├── master/
    │   │   │   ├── students/ (import & reset)
    │   │   │   └── users/
    │   │   ├── auth/                  # NextAuth & Seeder API
    │   │   ├── industri/              # API Public / Internal Katalog DUDI
    │   │   ├── pengajuan/             # Core Placement API
    │   │   ├── pokja/                 # API Handlers Pokja
    │   │   │   ├── applications/
    │   │   │   ├── classes/
    │   │   │   ├── dashboard/
    │   │   │   ├── groups/
    │   │   │   ├── industries/
    │   │   │   ├── industry-categories/
    │   │   │   ├── periods/
    │   │   │   ├── placements/
    │   │   │   └── students/
    │   │   └── students/              # API Handlers Siswa
    │   │       ├── apply/
    │   │       ├── dashboard/
    │   │       ├── group/
    │   │       └── profile/
    │   └── dashboard/                 # Frontend Area Berdasarkan Role
    │       ├── layout.tsx             # Main Shell (Sidebar + Header)
    │       ├── page.tsx               # Smart Dashboard Redirect
    │       ├── admin/                 # Panel Admin (Master Data & Users)
    │       ├── pokja/                 # Panel Pokja (Verifikasi, Kelompok, DUDI)
    │       ├── pembimbing/            # Panel Guru Pembimbing
    │       └── students/              # Panel Siswa (Overview, Form Apply, Profile)
    ├── components/                    # Reusable React UI Components
    │   ├── header.tsx
    │   ├── sidebar.tsx
    │   ├── toast-provider.tsx
    │   └── ui/
    ├── lib/                           # Instansiasi & Utility Central
    │   ├── auth.ts                    # NextAuth Options Engine
    │   ├── db.ts / prisma.ts          # Singleton Prisma Client
    │   └── utils.ts                   # Utility Cleanups & Formatters
    ├── services/                      # Business Logic Service Abstraction
    │   ├── industryService.ts
    │   └── studentService.ts
    └── types/
        └── index.d.ts                 # Type definitions & Prisma Enum mappings

```

---

## 🗄️ SKEMA DATABASE POSTGRESQL (PRISMA ORM)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ----------------------------------------------------------------------
// ENUMERATIONS
// ----------------------------------------------------------------------
enum Role {
  ADMIN
  POKJA
  PEMBIMBING
  SISWA
}

// ----------------------------------------------------------------------
// MODEL: USER (Sistem Autentikasi Multirole)
// ----------------------------------------------------------------------
model User {
  id         String   @id @default(cuid())
  username   String   @unique
  name       String
  password   String
  role       String   @default("SISWA")
  department String?
  phone      String?
  student    Student? // Relasi 1-to-1 ke data profil Siswa
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

// ----------------------------------------------------------------------
// MODEL: ACADEMIC YEAR (Tahun Pelajaran)
// ----------------------------------------------------------------------
model AcademicYear {
  id        String   @id @default(cuid())
  year      String   @unique
  isActive  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ----------------------------------------------------------------------
// MODEL: DEPARTMENT (Kompetensi Keahlian / Jurusan)
// ----------------------------------------------------------------------
model Department {
  id        String      @id @default(cuid())
  code      String      @unique
  name      String      @unique
  classes   ClassRoom[]
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
}

// ----------------------------------------------------------------------
// MODEL: CLASS ROOM (Rombongan Belajar / Kelas)
// ----------------------------------------------------------------------
model ClassRoom {
  id           String            @id @default(cuid())
  name         String            @unique
  departmentId String
  department   Department        @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  isAllowedPkl Boolean           @default(false)
  periodId     String?
  period       InternshipPeriod? @relation(fields: [periodId], references: [id], onDelete: SetNull)
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt
}

// ----------------------------------------------------------------------
// MODEL: INTERNSHIP PERIOD (Gelombang / Periode PKL)
// ----------------------------------------------------------------------
model InternshipPeriod {
  id               String      @id @default(cuid())
  name             String
  startDate        DateTime
  endDate          DateTime
  department       String
  isActive         Boolean     @default(false)
  activeIndustries Json?       @default("[]")
  classes          ClassRoom[]
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
}

// ----------------------------------------------------------------------
// MODEL: INDUSTRY CATEGORY (Kategori Industri)
// ----------------------------------------------------------------------
model IndustryCategory {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// ----------------------------------------------------------------------
// MODEL: INDUSTRY / DUDI (Mitra Industri Terintegrasi Dapodik)
// ----------------------------------------------------------------------
model Industry {
  id            String   @id @default(cuid())
  
  // Identitas Utama DUDI
  name          String   @unique
  nib           String?  
  sector        String?  
  npwp          String?  
  logoUrl       String?  @db.Text

  // Alamat Rinci Standar Dapodik Kemdikbudristek
  address       String   
  rt            String?  
  rw            String?  
  dusun         String?  
  desaKelurahan String?  
  subDistrict   String?  
  postalCode    String?  
  latitude      String?  
  longitude     String?  

  // Kontak & Detail Operasional
  contactPerson String?  
  phone         String?  
  fax           String?  
  email         String?  
  website       String?  
  totalQuota    Int      @default(0)

  placements    InternshipPlacement[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// ----------------------------------------------------------------------
// MODEL: STUDENT (Data Profil Siswa Terhubung ke User)
// ----------------------------------------------------------------------
model Student {
  id             String               @id @default(cuid())
  userId         String?              @unique
  user           User?                @relation(fields: [userId], references: [id], onDelete: Cascade)
  nis            String               @unique
  nisn           String?              
  name           String
  className      String
  department     String
  phone          String
  parentName     String?
  parentRelation String?
  parentPhone    String?
  bpjsStatus     String?              @default("BELUM_UPLOAD")
  bpjsUrl        String?
  cvStatus       String?              @default("BELUM_UPLOAD")
  cvUrl          String?
  isAllowedPkl   Boolean              @default(false)
  placement      InternshipPlacement?
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt
}

// ----------------------------------------------------------------------
// MODEL: INTERNSHIP PLACEMENT (Alur Penempatan & Verifikasi 6 Tahap)
// ----------------------------------------------------------------------
model InternshipPlacement {
  id                 String    @id @default(cuid())
  studentId          String    @unique
  student            Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  industryId         String
  industry           Industry  @relation(fields: [industryId], references: [id], onDelete: Cascade)
  
  // Status Alur 6 Tahap
  status             String    @default("PENGAJUAN_DIKIRIM")
  notes              String?   @db.Text
  
  // Berkas Administrasi Surat Permohonan & Balasan DUDI
  suratTugasUrl      String?   @db.Text
  suratBalasanUrl    String?   @db.Text
  suratBalasanStatus String?   @default("BELUM_UPLOAD")
  
  startDate          DateTime?
  endDate            DateTime?
  appliedAt          DateTime  @default(now())
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
}

```

---

## 🔄 ALUR PENEMPATAN PKL 6 TAHAP

Status pada tabel `InternshipPlacement` (`status`) mengontrol navigasi dan aksi yang dapat dilakukan oleh Siswa dan Pokja:

| Tahap | Kode Status (`status`) | Aksi oleh Siswa | Aksi oleh Pokja |
| --- | --- | --- | --- |
| **1** | `PENGAJUAN_DIKIRIM` | Memilih DUDI & Mengirim Pengajuan | Menerima notifikasi pengajuan baru |
| **2** | `REVIEW_POKJA` | Menunggu verifikasi berkas | Memeriksa berkas CV & Syarat Izin PKL |
| **3** | `PEMBUATAN_SURAT` | Menunggu penerbitan surat | Menyiapkan/Mencetak Surat Permohonan |
| **4** | `SURAT_DITERBITKAN` | **Mengunduh Surat Permohonan PKL** | Mengunggah Surat Permohonan resmi |
| **5** | `KIRIM_SURAT` | Penyerahan surat ke HRD Perusahaan | Memantau pengantaran surat |
| **6** | `DISETUJUI_INDUSTRI` | **Mengunggah Surat Balasan DUDI** | Verifikasi Surat Balasan & Kunci Penempatan |

> **Catatan Penolakan:** Apabila status diubah menjadi `DITOLAK_POKJA` atau `DITOLAK_INDUSTRI`, kunci pengajuan siswa akan dilepas secara otomatis sehingga siswa dapat mendaftar kembali ke DUDI mitra lain pada katalog.

---

## 🚀 PANDUAN INSTALASI & PENGEMBANGAN

### 1. Persiapan Environment (`.env`)

Buat file `.env` pada root project dengan konfigurasi berikut:

```env
DATABASE_URL="postgresql://postgres:password_anda@localhost:5432/si_erin_db?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="si-erin-super-secret-key-2026"

```

### 2. Instalasi Dependencies & Database Migration

```bash
# Install seluruh package
npm install

# Push skema Prisma ke Database
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Jalankan Seeder Data Awal (Admin & Pokja Default)
npx prisma db seed

```

### 3. Menjalankan Server Pengembang (Development)

```bash
npm run dev

```

Aplikasi dapat diakses melalui browser di `http://localhost:3000`.

---

## 🐳 INFRASTRUKTUR DOCKER & NGINX DEPLOYMENT

Aplikasi SI-ERIN siap di-deploy secara containerized menggunakan Docker.

### Running via Docker Compose

```bash
docker-compose up -d --build

```

---

## 🤖 PANDUAN INTEGRASI AI (INSTRUKSI PENGEMBANG SELANJUTNYA)

Jika Anda melanjutkan pengembangan proyek ini **bersama AI lain atau secara mandiri**, ikuti pedoman arsitektur berikut:

1. **Full Code Policy**: Setiap modifikasi kode pada file di `src/app/` atau `src/api/` WAJIB mengembalikan kode penuh (*full script*) tanpa memotong baris kode dengan komentar `// ... rest of code`.
2. **Prisma Client Singleton**: Selalu impor instansiasi Prisma dari `@/lib/prisma` atau `@/lib/db` untuk mencegah masalah *too many connections* pada Node.js hot-reloading.
3. **Payload Data DUDI**: Saat memanggil data Industri di endpoint siswa (`/api/students/apply`), selalu sertakan field `logoUrl`, `latitude`, dan `longitude` agar peta lokasi dan gambar logo tidak bernilai `undefined`.
4. **Prinsip Logo Backdrop**: Semua kontainer logo industri pada antarmuka frontend WAJIB menggunakan kelas CSS `bg-white` solid agar gambar berformat PNG transparan tetap kontras dan tidak terlihat gelap.
5. **Kamus Istilah Dinamis**:
* Berkas awal yang diunggah Pokja ke DUDI dinamakan **Surat Permohonan PKL**.
* Berkas konfirmasi dari DUDI dinamakan **Surat Balasan Industri**.



---

```text
🔖 MEMORY CHECKPOINT #41
━━━━━━━━━━━━━━━━━━━━━━━━━
📁 Aplikasi: SI-ERIN (Sistem Informasi Prakerin & Mitra Industri SMK)
🛠️ Stack: Next.js 14 (App Router), TypeScript, Tailwind CSS, PostgreSQL, Prisma ORM, Docker, Nginx
📂 File yang dibuat:
   - README.md (Dokumentasi Resmi & Panduan Pengkodingan AI)
⚙️ Status Sistem: Production-Ready & Full Documentation Synchronized
━━━━━━━━━━━━━━━━━━━━━━━━━

```

**Dokumentasi README.md telah dibuat dengan lengkap, rapi, dan transparan!** File ini dapat diletakkan di root repositori proyek agar mudah dipahami oleh pengembang lain maupun asisten AI selanjutnya.