# ----------------------------------------------------------------------
# 📋 CHANGELOG:
# ✅ Perubahan: Mengganti npm ci dengan npm install yang dioptimalkan untuk mencegah stuck saat build di Docker container.
# ✨ Fitur Baru: Optimized Layer Caching & Resilient Dependency Resolution.
# 🎨 UI/UX Update: N/A (Docker Infrastructure)
# 🔧 Bug Fix: Mengatasi isu stuck/hanging pada tahap unduh dependensi NPM.
# 🚀 Inovasi: High-Performance Enterprise Dockerized Next.js Application.
# ----------------------------------------------------------------------

# --- STAGE 1: Install Dependencies ---
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Salin file dependensi
COPY package.json package-lock.json* ./

# Gunakan npm install dengan clean cache untuk menghindari hanging/stuck
RUN npm install --legacy-peer-deps && npm cache clean --force

# --- STAGE 2: Build Aplikasi ---
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Konfigurasi environment build
ENV NEXT_TELEMETRY_DISABLED 1

# Generate Prisma Client & Build Next.js
RUN npx prisma generate
RUN npm run build

# --- STAGE 3: Production Runner ---
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set permission untuk direktori standalone dan uploads
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]