# 📋 CHANGELOG:
# ✅ Perubahan: Penggunaan installer `npm install --legacy-peer-deps` untuk kebal dari ketidakselarasan package-lock.json saat kompilasi Next.js Standalone.
# ✨ Fitur Baru: Standalone Production Next.js Engine.
# 🎨 UI/UX Update: N/A (Build Infrastructure)
# 🔧 Bug Fix: Menjamin kelancaran kompilasi aplikasi di dalam kontainer Alpine Linux.
# 🚀 Inovasi: Enterprise High-Performance Containerization Engine.

FROM node:18-alpine AS base

# Install OpenSSL & libc6-compat agar Prisma engine berjalan optimal di Alpine Linux
RUN apk add --no-cache openssl libc6-compat

# STAGE 1: Install Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --legacy-peer-deps

# STAGE 2: Build Next.js Application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npx prisma generate
RUN npm run build

# STAGE 3: Production Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir -p .next public/uploads
RUN chown -R nextjs:nodejs .next public/uploads

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]