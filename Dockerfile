# ----------------------------------------------------------------------
# 📋 CHANGELOG:
# ✅ Perubahan: Mengganti Dockerfile lama dengan arsitektur 3-Stage Multi-Stage Build lengkap dengan instalasi OpenSSL & penyesuaian hak akses public/uploads.
# ✨ Fitur Baru: Alpine OpenSSL Compatibility Layer & Automated Storage Permission Handler.
# 🎨 UI/UX Update: N/A (Docker Infrastructure)
# 🔧 Bug Fix: Mengatasi Prisma JSON Engine SyntaxError, OpenSSL Warning, dan EACCES Permission Denied saat upload gambar.
# 🚀 Inovasi: Enterprise Bulletproof Container Architecture for Next.js App Router & Prisma.
# ----------------------------------------------------------------------

# --- STAGE 1: Install Dependencies ---
FROM node:18-alpine AS deps
WORKDIR /app

# 🛡️ FIX KRITIS: Instal libc6-compat, openssl, dan ca-certificates untuk Prisma ORM
RUN apk add --no-cache libc6-compat openssl ca-certificates

# Salin berkas manifest dependensi
COPY package.json package-lock.json* ./

# Gunakan npm install dengan legacy peer deps untuk kestabilan unduhan
RUN npm install --legacy-peer-deps && npm cache clean --force

# --- STAGE 2: Build Aplikasi ---
FROM node:18-alpine AS builder
WORKDIR /app

# 🛡️ FIX KRITIS: Pastikan openssl juga terinstal di stage builder untuk Prisma Client Generation
RUN apk add --no-cache openssl ca-certificates

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Konfigurasi environment build
ENV NEXT_TELEMETRY_DISABLED 1

# Pastikan direktori public dan uploads terbuat secara otomatis jika belum ada
RUN mkdir -p public/uploads

# Generate Prisma Client & Build Next.js
RUN npx prisma generate
RUN npm run build

# --- STAGE 3: Production Runner ---
FROM node:18-alpine AS runner
WORKDIR /app

# 🛡️ FIX KRITIS: Instal openssl di runtime runner agar Prisma Client dapat berjalan tanpa crash
RUN apk add --no-cache openssl ca-certificates

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Buat grup dan user non-root demi keamanan enterprise
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Buat direktori .next, public, dan uploads dengan hak akses yang tepat
RUN mkdir -p public/uploads .next
RUN chown -R nextjs:nodejs public .next

# Salin artefak hasil build secara aman
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# 🔑 FIX KRITIS EACCES: Berikan hak kepemilikan penuh direktori uploads ke user nextjs
RUN chown -R nextjs:nodejs /app/public/uploads

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]