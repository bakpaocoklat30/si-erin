#!/bin/bash
# ==============================================================================
# 🚀 SI-ERIN APP CONTAINER UPDATER (Rocky Linux / Docker)
# Deskripsi: Menarik update dari GitHub, build ulang image 'app',
#            dan me-restart container 'app' tanpa menyentuh container database postgres.
# ==============================================================================

set -e

# Format warna terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}==================================================================${NC}"
echo -e "${CYAN}🚀 MEMULAI PEMBARUAN CONTAINER APLIKASI SI-ERIN...${NC}"
echo -e "${CYAN}==================================================================${NC}"

# Deteksi perintah docker compose (mendukung 'docker compose' v2 atau 'docker-compose' v1)
if docker compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose > /dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
else
    echo -e "${RED}❌ Error: docker compose maupun docker-compose tidak ditemukan!${NC}"
    exit 1
fi

echo -e "${YELLOW}📥 [1/3] Menarik pembaruan kode terbaru dari GitHub (git pull origin main)...${NC}"
git pull origin main

echo -e "${YELLOW}📦 [2/3] Membangun ulang (rebuild) image container 'app'...${NC}"
$DOCKER_COMPOSE build app

echo -e "${YELLOW}🔄 [3/3] Me-restart container 'app' (Database PostgreSQL aman & tidak disentuh)...${NC}"
$DOCKER_COMPOSE up -d --no-deps app

echo -e "${YELLOW}🔍 Memeriksa status container yang berjalan...${NC}"
$DOCKER_COMPOSE ps

echo -e "${CYAN}==================================================================${NC}"
echo -e "${GREEN}✨ PEMBARUAN APLIKASI BERHASIL 100%!${NC}"
echo -e "${GREEN}Container 'app' telah diperbarui & aktif, data database tetap aman.${NC}"
echo -e "${CYAN}==================================================================${NC}"
