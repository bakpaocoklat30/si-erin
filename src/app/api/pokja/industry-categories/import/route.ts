// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Membuat REST API Batch Importer untuk Kategori Industri Pokja.
// ✨ Fitur Baru:
//    - Persistent Batch DB Inserter (Menggunakan Prisma createMany / fallback transaction).
//    - Skip Duplicates Protection (Mencegah bentrok nama kategori yang sama).
// 🎨 UI/UX Update: N/A (Backend API Endpoint).
// 🔧 Bug Fix: Menyelesaikan error HTTP 404 / Connection Error pada pengunggahan CSV massal.
// 🚀 Inovasi: High-Performance Single-Query Bulk Category Inserter.
// ----------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma'; // Sesuaikan path prisma client di proyek Anda

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    
    // Check autentikasi pengguna
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { categories } = body;

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Data kategori tidak valid atau kosong.' },
        { status: 400 }
      );
    }

    // Sanitasi data batch
    const formattedData = categories
      .filter((cat: any) => cat && cat.name && String(cat.name).trim() !== '')
      .map((cat: any) => ({
        name: String(cat.name).trim(),
        description: cat.description ? String(cat.description).trim() : ''
      }));

    if (formattedData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada baris kategori yang valid untuk disimpan.' },
        { status: 400 }
      );
    }

    // 🌟 PERSISTENT BATCH SAVE TO DATABASE
    // Menggunakan prisma.industryCategory / prisma.category
    let insertedCount = 0;

    try {
      // Opsi 1: Prisma createMany (skipDuplicates)
      const batchResult = await (prisma as any).industryCategory.createMany({
        data: formattedData,
        skipDuplicates: true
      });
      insertedCount = batchResult.count;
    } catch (dbErr) {
      // Opsi 2: Fallback Transaction Loop jika schema model bernama prisma.category
      try {
        const batchResult = await (prisma as any).category.createMany({
          data: formattedData,
          skipDuplicates: true
        });
        insertedCount = batchResult.count;
      } catch (fallbackErr) {
        // Opsi 3: Upsert/Create per item dalam Prisma Transaction
        const tasks = formattedData.map((item: any) => {
          if ((prisma as any).industryCategory) {
            return (prisma as any).industryCategory.upsert({
              where: { name: item.name },
              update: { description: item.description },
              create: { name: item.name, description: item.description }
            });
          } else {
            return (prisma as any).category.upsert({
              where: { name: item.name },
              update: { description: item.description },
              create: { name: item.name, description: item.description }
            });
          }
        });

        const results = await prisma.$transaction(tasks);
        insertedCount = results.length;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil menyimpan ${insertedCount} kategori industri ke database!`,
      count: insertedCount
    });

  } catch (error: any) {
    console.error('API Error /api/pokja/industry-categories/import:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan pada server database.' },
      { status: 500 }
    );
  }
}