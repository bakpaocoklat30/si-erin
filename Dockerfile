# 📋 CHANGELOG:
# ✅ Perubahan: Menambahkan instalasi openssl dan menyalin folder prisma sebelum npm install
# ✨ Fitur Baru: Kompatibilitas penuh Prisma Client generation pada environment Alpine Linux container
# 🎨 UI/UX Update: N/A (Server Configuration)
# 🔧 Bug Fix: Mengatasi "Error: Could not find Prisma Schema" pada skrip postinstall / prisma generate
# 🚀 Inovasi: Build container yang tahan banting dan production-ready untuk SI-Erin

FROM node:18-alpine AS base

# Install OpenSSL agar Prisma binary mendeteksi platform dengan benar
RUN apk add --no-cache openssl

# Install dependencies hanya jika diperlukan
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install

# Rebuild source code hanya jika diperlukan
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npx prisma generate
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]