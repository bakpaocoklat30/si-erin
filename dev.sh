#!/bin/bash
# ==============================================================================
# 🚀 SI-ERIN LOCAL DEVELOPMENT CONTROLLER (Mac & Linux Docker)
# Deskripsi: Script terpadu untuk mengelola pengembangan lokal SI-ERIN menggunakan Docker.
# ==============================================================================

set -e

# Pastikan Docker CLI dan Credential Helper ada dalam PATH (khusus macOS)
export PATH="/Applications/Docker.app/Contents/Resources/bin:/Users/$USER/.docker/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

COMPOSE_DEV="docker-compose.dev.yml"
COMPOSE_PROD="docker-compose.yml"

# Deteksi perintah docker compose
if docker compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose > /dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
else
    echo -e "${RED}❌ Error: Docker Compose tidak ditemukan di sistem Anda!${NC}"
    echo -e "Pastikan Docker Desktop sudah terpasang dan berjalan."
    exit 1
fi

# Pastikan Docker daemon berjalan
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${YELLOW}⏳ Docker daemon belum aktif, mencoba menjalankan Docker Desktop...${NC}"
        if [ "$(uname)" = "Darwin" ]; then
            open -a Docker > /dev/null 2>&1 || true
        fi
        
        # Tunggu hingga Docker siap
        local attempts=0
        while ! docker info > /dev/null 2>&1; do
            sleep 2
            attempts=$((attempts + 1))
            if [ $attempts -ge 20 ]; then
                echo -e "${RED}❌ Docker daemon tidak kunjung aktif. Buka aplikasi Docker Desktop manual!${NC}"
                exit 1
            fi
        done
        echo -e "${GREEN}✅ Docker daemon siap digunakan!${NC}"
    fi
}

# Pastikan berkas .env ada
check_env() {
    if [ ! -f .env ]; then
        if [ -f .env.bak ]; then
            echo -e "${YELLOW}⚠️ Berkas .env belum ada. Menggandakan dari .env.bak...${NC}"
            cp .env.bak .env
            echo -e "${GREEN}✅ Berkas .env berhasil dibuat.${NC}"
        else
            echo -e "${RED}❌ Berkas .env dan .env.bak tidak ditemukan!${NC}"
            exit 1
        fi
    fi
}

cmd_start() {
    check_docker
    check_env

    echo -e "${CYAN}==================================================================${NC}"
    echo -e "${CYAN}${BOLD}🚀 MENJALANKAN LINGKUNGAN PENGEMBANGAN LOKAL SI-ERIN (DEV MODE)${NC}"
    echo -e "${CYAN}==================================================================${NC}"

    echo -e "${YELLOW}📦 [1/3] Membangun dan menjalankan kontainer Docker (Hot-Reload)...${NC}"
    $DOCKER_COMPOSE -f $COMPOSE_DEV up -d --build

    echo -e "${YELLOW}⏳ [2/3] Menunggu database PostgreSQL siap menerima koneksi...${NC}"
    local retries=0
    until $DOCKER_COMPOSE -f $COMPOSE_DEV exec -T postgres pg_isready -U sierin_user -d sierin_db > /dev/null 2>&1 || [ $retries -eq 25 ]; do
        sleep 1
        retries=$((retries + 1))
    done

    echo -e "${YELLOW}🗄️ [3/3] Melakukan sinkronisasi skema Prisma (db push)...${NC}"
    $DOCKER_COMPOSE -f $COMPOSE_DEV exec -T app npx prisma db push

    echo -e "${CYAN}==================================================================${NC}"
    echo -e "${GREEN}${BOLD}✨ SI-ERIN BERHASIL DIJALANKAN DI MAC!${NC}"
    echo -e "${CYAN}==================================================================${NC}"
    echo -e "🌐 ${BOLD}Aplikasi Web (Next.js) :${NC} ${GREEN}http://localhost:3000${NC}"
    echo -e "🗄️ ${BOLD}PostgreSQL Database    :${NC} ${GREEN}localhost:5433${NC} (User: sierin_user, DB: sierin_db)"
    echo -e "📱 ${BOLD}WAHA WhatsApp Gateway  :${NC} ${GREEN}http://localhost:7005${NC} (User: admin, Pass: SierinSecurePass2026!)"
    echo -e ""
    echo -e "${BOLD}🔑 Akun Login Default (Password: pakar123):${NC}"
    echo -e "   • Admin       : ${CYAN}admin${NC}"
    echo -e "   • Pokja       : ${CYAN}pokja${NC}"
    echo -e "   • Pembimbing  : ${CYAN}pembimbing${NC}"
    echo -e "   • Siswa       : ${CYAN}siswa${NC}"
    echo -e ""
    echo -e "${YELLOW}💡 Tips:${NC}"
    echo -e "   • Untuk mengisi data awal demo: ${BOLD}./dev.sh seed${NC}"
    echo -e "   • Untuk melihat log aplikasi:  ${BOLD}./dev.sh logs${NC}"
    echo -e "   • Untuk mematikan server:      ${BOLD}./dev.sh down${NC}"
    echo -e "${CYAN}==================================================================${NC}"
}

cmd_reset_password() {
    check_docker
    echo -e "${YELLOW}🔑 Me-reset password akun pengujian (admin, pokja, pembimbing, siswa) ke 'pakar123'...${NC}"
    $DOCKER_COMPOSE -f $COMPOSE_DEV exec -T app node -e '
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
bcrypt.hash("pakar123", 10).then(hash => {
  return prisma.user.updateMany({
    where: { username: { in: ["admin", "pokja", "pembimbing", "siswa"] } },
    data: { password: hash }
  });
}).then(res => {
  console.log("✅ Berhasil me-reset " + res.count + " akun utama ke password: pakar123");
}).catch(err => {
  console.error("❌ Gagal reset password:", err);
}).finally(() => prisma.$disconnect());
'
}

cmd_seed() {
    check_docker
    echo -e "${YELLOW}🌱 Menjalankan Seeding Database SI-ERIN...${NC}"
    $DOCKER_COMPOSE -f $COMPOSE_DEV exec -T app npx prisma db seed
    echo -e "${GREEN}✅ Database seeding selesai!${NC}"
}

cmd_migrate() {
    check_docker
    echo -e "${YELLOW}🗄️ Menjalankan Sinkronisasi Skema Database (npx prisma db push)...${NC}"
    $DOCKER_COMPOSE -f $COMPOSE_DEV exec -T app npx prisma db push
    echo -e "${GREEN}✅ Sinkronisasi skema selesai!${NC}"
}

cmd_logs() {
    check_docker
    local service=${1:-app}
    echo -e "${YELLOW}📋 Menampilkan log dari service: $service (Ctrl+C untuk keluar)...${NC}"
    $DOCKER_COMPOSE -f $COMPOSE_DEV logs -f "$service"
}

cmd_stop() {
    check_docker
    echo -e "${YELLOW}🛑 Menghentikan kontainer development SI-ERIN...${NC}"
    $DOCKER_COMPOSE -f $COMPOSE_DEV down
    echo -e "${GREEN}✅ Semua kontainer berhasil dihentikan.${NC}"
}

cmd_restart() {
    cmd_stop
    cmd_start
}

cmd_shell() {
    check_docker
    local service=${1:-app}
    echo -e "${YELLOW}💻 Masuk ke terminal kontainer: $service...${NC}"
    $DOCKER_COMPOSE -f $COMPOSE_DEV exec -it "$service" /bin/sh
}

cmd_status() {
    check_docker
    echo -e "${CYAN}📊 Status Kontainer Development:${NC}"
    $DOCKER_COMPOSE -f $COMPOSE_DEV ps
}

cmd_prod() {
    check_docker
    check_env
    echo -e "${CYAN}🚀 Menjalankan kontainer mode Produksi (Standalone)...${NC}"
    $DOCKER_COMPOSE -f $COMPOSE_PROD up -d --build
    echo -e "${GREEN}✅ Kontainer mode produksi aktif di http://localhost:3000${NC}"
}

# Routing argumen perintah
case "$1" in
    start|up|"")
        cmd_start
        ;;
    stop|down)
        cmd_stop
        ;;
    restart)
        cmd_restart
        ;;
    seed)
        cmd_seed
        ;;
    reset-password|reset-pass)
        cmd_reset_password
        ;;
    migrate|push)
        cmd_migrate
        ;;
    logs)
        cmd_logs "$2"
        ;;
    shell|sh)
        cmd_shell "$2"
        ;;
    status|ps)
        cmd_status
        ;;
    prod)
        cmd_prod
        ;;
    *)
        echo -e "${BOLD}Panduan Penggunaan ./dev.sh:${NC}"
        echo "  ./dev.sh start    : Jalankan lingkungan dev (Postgres, WAHA, Next.js hot-reload)"
        echo "  ./dev.sh stop     : Hentikan semua kontainer dev"
        echo "  ./dev.sh restart  : Restart semua kontainer"
        echo "  ./dev.sh seed     : Isi data default seeder baru (bersihkan DB lama)"
        echo "  ./dev.sh reset-password : Reset password akun utama ke 'pakar123' (tanpa hapus data hasil restore)"
        echo "  ./dev.sh migrate  : Sinkronkan skema prisma (db push)"
        echo "  ./dev.sh logs     : Lihat log Next.js (atau: ./dev.sh logs postgres)"
        echo "  ./dev.sh shell    : Buka shell / terminal di dalam kontainer app"
        echo "  ./dev.sh status   : Cek status kontainer yang berjalan"
        echo "  ./dev.sh prod     : Jalankan versi produksi standalone"
        ;;
esac
