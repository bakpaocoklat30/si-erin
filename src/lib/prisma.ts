// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Mengubah Prisma Client menjadi Singleton Instance untuk mencegah kebocoran koneksi (connection leak) pada PostgreSQL Docker.
// ✨ Fitur Baru: Connection Pool Reuse & Global Caching.
// 🎨 UI/UX Update: N/A (Backend Utility)
// 🔧 Bug Fix: Menyelesaikan error "Koneksi database eror" secara berkala.
// 🚀 Inovasi: Singleton Prisma Client Architecture for Next.js App Router.
// ----------------------------------------------------------------------

import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export default prisma;