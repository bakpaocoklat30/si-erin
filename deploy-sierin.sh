#!/bin/sh
# 📋 CHANGELOG:
# ✅ Perubahan: Script eksekusi deployment otomatis satu perintah untuk Docker Compose, Prisma Migration, & Seeding.
# ✨ Fitur Baru: Automated Database Push & Master Seeding Trigger di dalam kontainer app.
# 🎨 UI/UX Update: N/A (CLI Automated Shell Script)
# 🔧 Bug Fix: Menangani jeda sinkronisasi booting database sebelum migrasi dijalankan.
# 🚀 Inovasi: One-Command Automated VPS Deployer.

echo "🚀 Memulai Proses Deployment Docker SI-ERIN..."

# 1. Pastikan Docker Daemon Aktif
if ! docker info > /dev/null 2>&1; then
  echo "❌ Error: Docker daemon tidak berjalan. Silakan nyalakan Docker terlebih dahulu!"
  exit 1
fi

# 2. Build & Jalankan Containers via Docker Compose
echo "📦 Building & Starting Docker Containers..."
docker-compose down
docker-compose up -d --build

# 3. Jalankan Push Database & Seeding
echo "🗄️ Menjalankan Database Push & Seeding di Kontainer App..."
sleep 5 # Menunggu database siap sepenuhnya

docker-compose exec -T app npx prisma db push
docker-compose exec -T app npx prisma db seed

echo "
==============================================================================
🎉 DEPLOYMENT DOCKER SI-ERIN BERHASIL!
==============================================================================
📍 Web Proxy (Nginx) : http://localhost (Port 80)
📍 App Direct        : http://localhost:3000
📍 PostgreSQL DB     : localhost:5432
==============================================================================
"