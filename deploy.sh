#!/bin/bash

# ==============================================================================
# 🚀 SI-ERIN ENTERPRISE AUTOMATED DEPLOYMENT SCRIPT
# Dibuat oleh: BreakcellentDev (Pakar AI Fullstack)
# Deskripsi: Skrip otomatisasi git pull, build, database sync, & PM2 restart
# ==============================================================================

# Hentikan skrip segera jika ada perintah yang gagal (Exit on error)
set -e

# Warna untuk output terminal agar lebih informatif & profesional
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}==================================================================${NC}"
echo -e "${CYAN}🏢 MEMULAI PROSES DEPLOYMENT OTOMATIS SI-ERIN v2.0...${NC}"
echo -e "${CYAN}==================================================================${NC}"

# 1. Pastikan berada di direktori project (sesuaikan jika perlu)
# cd /var/www/si-erin

echo -e "${YELLOW}📂 [1/6] Memeriksa status repositori Git...${NC}"
git status

echo -e "${YELLOW}📥 [2/6] Menarik pembaruan kode terbaru dari Git (git pull)...${NC}"
# Ubah 'main' menjadi 'master' jika branch utama Anda master
git pull origin main

echo -e "${YELLOW}📦 [3/6] Menginstal dependensi Node.js terbaru...${NC}"
npm install --legacy-peer-deps

echo -e "${YELLOW}🗄️ [4/6] Melakukan sinkronisasi & generate skema database Prisma...${NC}"
npx prisma generate
# Gunakan 'prisma db push' atau 'prisma migrate deploy' sesuai kebijakan server Anda
npx prisma db push

echo -e "${YELLOW}🔨 [5/6] Membangun aplikasi Next.js untuk produksi (npm run build)...${NC}"
npm run build

echo -e "${YELLOW}🔄 [6/6] Me-restart layanan PM2 (si-erin)...${NC}"
# Periksa apakah pm2 sudah menjalankan service bernama 'si-erin'
if pm2 list | grep -q "si-erin"; then
    pm2 restart si-erin
else
    echo -e "${YELLOW}⚠️ Service 'si-erin' belum terdaftar di PM2, mendaftarkan baru...${NC}"
    pm2 start npm --name "si-erin" -- start
fi

# Simpan state PM2 agar auto-restart saat server reboot
pm2 save

echo -e "${CYAN}==================================================================${NC}"
echo -e "${GREEN}✨ DEPLOYMENT BERHASIL SEPENUHNYA! Aplikasi SI-ERIN siap digunakan. 🚀${NC}"
echo -e "${CYAN}==================================================================${NC}"