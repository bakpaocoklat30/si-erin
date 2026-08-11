// 📋 CHANGELOG:
// ✅ Perubahan: Pembuatan singleton instance Prisma Client untuk mencegah kebocoran koneksi di Next.js development environment
// ✨ Fitur Baru: Global caching instance database client
// 🎨 UI/UX Update: N/A (Database Core Utility)
// 🔧 Bug Fix: Menyelesaikan error `Cannot read properties of undefined` pada model Prisma
// 🚀 Inovasi: Enterprise singleton database pattern

import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;