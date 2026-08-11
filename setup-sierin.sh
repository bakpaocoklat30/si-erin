#!/bin/bash

echo "Memulai pembuatan struktur folder dan file untuk si-erin..."

# Membuat struktur direktori
mkdir -p si-erin/nginx
mkdir -p si-erin/prisma
mkdir -p si-erin/public/uploads/cv
mkdir -p si-erin/public/uploads/surat-pengantar
mkdir -p si-erin/public/uploads/surat-balasan
mkdir -p si-erin/src/app/api/auth/"[...nextauth]"
mkdir -p si-erin/src/app/api/pengajuan
mkdir -p si-erin/src/app/api/industri
mkdir -p si-erin/src/app/"(auth)"/login
mkdir -p si-erin/src/app/dashboard/admin
mkdir -p si-erin/src/app/dashboard/pokja/industri
mkdir -p si-erin/src/app/dashboard/pokja/pengajuan
mkdir -p si-erin/src/app/dashboard/siswa/pengajuan
mkdir -p si-erin/src/app/dashboard/pembimbing/monitoring
mkdir -p si-erin/src/components/ui
mkdir -p si-erin/src/lib
mkdir -p si-erin/src/types

# Membuat file-file kosong
touch si-erin/.env
touch si-erin/docker-compose.yml
touch si-erin/Dockerfile
touch si-erin/nginx/default.conf
touch si-erin/prisma/schema.prisma

touch si-erin/src/app/api/auth/"[...nextauth]"/route.ts
touch si-erin/src/app/api/pengajuan/route.ts
touch si-erin/src/app/api/industri/route.ts
touch si-erin/src/app/"(auth)"/login/page.tsx
touch si-erin/src/app/dashboard/layout.tsx
touch si-erin/src/app/dashboard/page.tsx
touch si-erin/src/app/dashboard/admin/page.tsx
touch si-erin/src/app/dashboard/pokja/industri/page.tsx
touch si-erin/src/app/dashboard/pokja/pengajuan/page.tsx
touch si-erin/src/app/dashboard/siswa/pengajuan/page.tsx
touch si-erin/src/app/dashboard/pembimbing/monitoring/page.tsx
touch si-erin/src/app/layout.tsx
touch si-erin/src/app/page.tsx

touch si-erin/src/components/sidebar.tsx
touch si-erin/src/components/header.tsx
touch si-erin/src/components/toast-provider.tsx

touch si-erin/src/lib/prisma.ts
touch si-erin/src/lib/auth.ts
touch si-erin/src/lib/utils.ts

touch si-erin/src/middleware.ts
touch si-erin/src/types/index.d.ts

touch si-erin/package.json
touch si-erin/tsconfig.json

echo "Selesai! Folder dan file proyek si-erin berhasil dibuat."