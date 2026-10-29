// 📋 CHANGELOG:
// ✅ Perubahan: Menghapus penyimpanan fallback in-memory dan mengarahkan penyimpanan payload `activeIndustries` langsung ke kolom `Json` native di database PostgreSQL via Prisma.
// ✨ Fitur Baru: Native Database JSON Persistence for Industry Quotas.
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Mengatasi data industri dan kuota yang ter-reset/hilang setiap kali halaman direfresh.
// 🚀 Inovasi: Enterprise True-Persistence Storage Pipeline.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();
    const isPokja = ['POKJA', 'TIM_POKJA'].includes(userRole);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

    if (!session || (!isPokja && !isAdmin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDepartment = (session.user as any)?.department;
    const isPokjaScoped = isPokja && userDepartment && userDepartment.toLowerCase() !== 'semua jurusan' && userDepartment.toUpperCase() !== 'ALL';
    const isTkj = isPokjaScoped && (userDepartment.toLowerCase().includes('tkj') || userDepartment.toLowerCase().includes('komputer'));

    let allIndustries: any[] = [];
    try {
      let industryWhere: any = {};
      if (isPokjaScoped) {
        industryWhere = {
          OR: [
            { department: { contains: userDepartment, mode: 'insensitive' } },
            {
              placements: {
                some: {
                  student: {
                    department: { contains: userDepartment, mode: 'insensitive' }
                  }
                }
              }
            },
            ...(isTkj ? [{ department: null }, { department: 'Semua Jurusan' }] : [])
          ]
        };
      }

      allIndustries = await db.industry.findMany({ 
        where: industryWhere,
        select: { id: true, name: true, address: true, sector: true, department: true },
        orderBy: { name: 'asc' }
      });
    } catch (e) {
      console.error('Error fetching industries:', e);
      allIndustries = [];
    }

    let periods: any[] = [];
    try {
      let whereClause = {};
      if (isPokjaScoped) {
        whereClause = {
          OR: [
            { department: { contains: userDepartment, mode: 'insensitive' } },
            { department: { equals: 'Semua Jurusan', mode: 'insensitive' } },
            { department: { equals: 'ALL', mode: 'insensitive' } }
          ]
        };
      }

      periods = await (db as any).internshipPeriod.findMany({
        where: whereClause,
        orderBy: [
          { startDate: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      if (isPokjaScoped) {
        // Prioritaskan periode yang secara spesifik milik jurusan Pokja ini di urutan teratas
        periods.sort((a, b) => {
          const aDeptMatch = a.department && a.department.toLowerCase().includes(userDepartment.toLowerCase()) ? 1 : 0;
          const bDeptMatch = b.department && b.department.toLowerCase().includes(userDepartment.toLowerCase()) ? 1 : 0;
          return bDeptMatch - aDeptMatch;
        });
      }
      
      const allowedIndustryIds = new Set(allIndustries.map(i => i.id));
      // Karena sekarang activeIndustries adalah tipe Json di skema, Prisma akan otomatis mengembalikannya sebagai array/object
      periods = periods.map(p => {
        let activeInds = Array.isArray(p.activeIndustries) ? p.activeIndustries : [];
        if (isPokjaScoped) {
          activeInds = activeInds.filter((item: any) => allowedIndustryIds.has(item.industryId));
        }
        return {
          ...p,
          activeIndustries: activeInds
        };
      });
    } catch (e) {
      console.error('Error fetching periods:', e);
      periods = [];
    }

    return NextResponse.json({ success: true, data: periods, industries: allIndustries });
  } catch (error) {
    console.error('Fatal error GET periods:', error);
    return NextResponse.json({ error: 'Gagal memuat data periode PKL' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();
    const isPokja = ['POKJA', 'TIM_POKJA'].includes(userRole);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

    if (!session || (!isPokja && !isAdmin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDepartment = (session.user as any)?.department;

    const body = await request.json();
    const { name, startDate, endDate, isActive, activeIndustries, department } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: 'Nama periode, tanggal mulai, dan tanggal selesai wajib diisi' }, { status: 400 });
    }

    let newPeriod;
    try {
      // Data disimpan LANGSUNG ke database tanpa fallback memory
      newPeriod = await (db as any).internshipPeriod.create({
        data: {
          name: name.trim(),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          department: department || (userRole === 'POKJA' && userDepartment ? userDepartment : 'Semua Jurusan'),
          isActive: Boolean(isActive),
          activeIndustries: activeIndustries || [] // Masuk secara permanen ke kolom Json
        }
      });
    } catch (e: any) {
      console.error('Prisma create period error:', e);
      return NextResponse.json({ error: e.message || 'Gagal menyimpan ke database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Periode PKL dan kuota berhasil disimpan permanen!', data: newPeriod });
  } catch (error: any) {
    console.error('Error POST period:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat periode PKL' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();
    const isPokja = ['POKJA', 'TIM_POKJA'].includes(userRole);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

    if (!session || (!isPokja && !isAdmin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDepartment = (session.user as any)?.department;
    const isPokjaScoped = isPokja && userDepartment && userDepartment.toLowerCase() !== 'semua jurusan' && userDepartment.toUpperCase() !== 'ALL';

    const body = await request.json();
    const { id, name, startDate, endDate, isActive, activeIndustries, department } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID periode tidak valid' }, { status: 400 });
    }

    let updated;
    try {
      const updateData: any = {};
      if (name) updateData.name = name.trim();
      if (startDate) updateData.startDate = new Date(startDate);
      if (endDate) updateData.endDate = new Date(endDate);
      if (department) updateData.department = department;
      if (typeof isActive === 'boolean') updateData.isActive = isActive;

      if (activeIndustries !== undefined) {
        // Sanitasi konfigurasi industri: jamin tipe angka pada kuota dan boolean isUnlimited
        const sanitizedIndustries = Array.isArray(activeIndustries) ? activeIndustries.map((item: any) => ({
          industryId: String(item.industryId || item.id || ''),
          quota: typeof item.quota === 'number' ? item.quota : (parseInt(item.quota, 10) || 5),
          isUnlimited: Boolean(item.isUnlimited) || item.quota === -1 || item.quota >= 999
        })).filter((item: any) => Boolean(item.industryId)) : [];

        if (isPokjaScoped) {
          // Ambil konfigurasi industri yang ada saat ini di DB
          const existing = await (db as any).internshipPeriod.findUnique({
            where: { id },
            select: { activeIndustries: true, department: true }
          });

          // Jika periode ini secara spesifik milik jurusan Pokja ini, perbarui langsung tanpa mencampuradukkan
          const isDeptSpecific = existing?.department && existing.department.toLowerCase().includes(userDepartment.toLowerCase());
          if (isDeptSpecific) {
            updateData.activeIndustries = sanitizedIndustries;
          } else {
            const currentAll = Array.isArray(existing?.activeIndustries) ? existing.activeIndustries : [];

            // Dapatkan ID industri yang merupakan wewenang jurusan Pokja ini
            const isTkj = userDepartment.toLowerCase().includes('tkj') || userDepartment.toLowerCase().includes('komputer');
            const userDeptIndustries = await db.industry.findMany({
              where: {
                OR: [
                  { department: { contains: userDepartment, mode: 'insensitive' } },
                  {
                    placements: {
                      some: {
                        student: {
                          department: { contains: userDepartment, mode: 'insensitive' }
                        }
                      }
                    }
                  },
                  ...(isTkj ? [{ department: null }, { department: 'Semua Jurusan' }] : [])
                ]
              },
              select: { id: true }
            });
            const myDeptIndIds = new Set(userDeptIndustries.map(i => i.id));

            // Pertahankan konfigurasi industri milik jurusan lain
            const otherDeptIndustries = currentAll.filter((item: any) => !myDeptIndIds.has(item.industryId));

            // Gabungkan konfigurasi baru milik jurusan ini dengan milik jurusan lain
            updateData.activeIndustries = [...otherDeptIndustries, ...sanitizedIndustries];
          }
        } else {
          updateData.activeIndustries = sanitizedIndustries;
        }
      }

      updated = await (db as any).internshipPeriod.update({
        where: { id },
        data: updateData
      });
    } catch (e: any) {
      console.error('Prisma update period error:', e);
      return NextResponse.json({ error: e.message || 'Gagal memperbarui ke database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Pengaturan periode dan kuota berhasil diperbarui permanen!', data: updated });
  } catch (error: any) {
    console.error('Error PUT period:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui periode PKL' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = String((session?.user as any)?.role || '').toUpperCase().trim();
    const isPokja = ['POKJA', 'TIM_POKJA'].includes(userRole);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

    if (!session || (!isPokja && !isAdmin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID periode tidak valid' }, { status: 400 });
    }

    try {
      await (db as any).internshipPeriod.delete({ where: { id } });
    } catch (e: any) {
      console.error('Prisma delete period error:', e);
      return NextResponse.json({ error: 'Gagal menghapus di database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Periode PKL berhasil dihapus!' });
  } catch (error) {
    console.error('Error DELETE period:', error);
    return NextResponse.json({ error: 'Gagal menghapus periode PKL' }, { status: 500 });
  }
}