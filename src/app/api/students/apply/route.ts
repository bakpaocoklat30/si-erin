// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Memperbaiki ekstraksi `activeIndustries` (tipe JSON) pada `InternshipPeriod` sesuai dengan Prisma Schema dan komponen Pokja.
// ✨ Fitur Baru: JSON-Aware Active Period Industry Resolver & Dynamic Quota Counter.
// 🎨 UI/UX Update: N/A (Backend API Endpoint).
// 🔧 Bug Fix: Menyelesaikan masalah industri yang diaktifkan Pokja tidak muncul di dashboard/students/pengajuan.
// 🚀 Inovasi: Enterprise Resilient JSON Field Parsing Engine for Prisma.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Helper terisolasi untuk mendeteksi instance model InternshipPlacement secara presisi
function getPlacementClient() {
  const prisma = db as any;
  return (
    prisma.internshipPlacement ||
    prisma.InternshipPlacement ||
    prisma.placement ||
    prisma.Placement ||
    prisma.studentPlacement ||
    null
  );
}

// Helper terisolasi untuk mendeteksi instance model InternshipPeriod secara presisi
function getPeriodClient() {
  const prisma = db as any;
  return (
    prisma.internshipPeriod ||
    prisma.InternshipPeriod ||
    prisma.period ||
    prisma.Period ||
    null
  );
}

// ----------------------------------------------------------------------
// GET: Ambil Data Profil Siswa, Status Pengajuan Aktif, Rekan Kelompok, & Katalog Industri
// ----------------------------------------------------------------------
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized - Silakan login terlebih dahulu' }, { status: 401 });
    }

    const username = (session.user as any)?.username;
    const placementClient = getPlacementClient();
    const periodClient = getPeriodClient();

    // 1. Cari data siswa berdasarkan NIS/Username atau Nama beserta relasi Teacher & Placement
    const student = await db.student.findFirst({
      where: {
        OR: [
          { nis: username },
          { name: session.user.name || '' }
        ]
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            username: true,
            phone: true,
            role: true,
            department: true
          }
        },
        placement: {
          include: {
            industry: true
          }
        }
      }
    });

    if (!student) {
      return NextResponse.json({ error: 'Data profil siswa tidak ditemukan di database.' }, { status: 404 });
    }

    // 2. Ambil penempatan aktif (Abaikan jika statusnya DITOLAK_POKJA, DITOLAK_INDUSTRI, atau BATAL)
    const rawPlacement = (student as any).placement;
    let activePlacement = null;
    let lastRejectedPlacement = null;

    if (rawPlacement) {
      const isRejectedOrCanceled = ['DITOLAK_POKJA', 'DITOLAK_INDUSTRI', 'BATAL'].includes(rawPlacement.status);
      if (isRejectedOrCanceled) {
        lastRejectedPlacement = rawPlacement;
        activePlacement = null; // DI-NULL-KAN AGAR SISWA BISA MEMILIH DUDI LAGI!
      } else {
        // Format ulang objek activePlacement agar menyertakan data industri yang lengkap
        activePlacement = {
          ...rawPlacement,
          industry: rawPlacement.industry ? {
            ...rawPlacement.industry,
            logoUrl: rawPlacement.industry.logoUrl || rawPlacement.industry.logo_url || null,
            latitude: rawPlacement.industry.latitude ?? null,
            longitude: rawPlacement.industry.longitude ?? null
          } : null
        };
      }
    }

    // Ambil Guru Pembimbing Sekolah dari model Student
    const resolvedTeacher = (student as any).teacher || null;

    // 3. Ambil daftar teman sekelompok di DUDI yang sama (jika ada active placement)
    let groupMembers: any[] = [];
    if (activePlacement?.industryId) {
      try {
        const placementsInSameIndustry = await (placementClient
          ? placementClient.findMany({
              where: {
                industryId: activePlacement.industryId,
                status: {
                  notIn: ['DITOLAK_POKJA', 'DITOLAK_INDUSTRI', 'BATAL']
                }
              },
              include: {
                student: true
              }
            })
          : db.student.findMany({
              where: {
                placement: {
                  industryId: activePlacement.industryId,
                  status: {
                    notIn: ['DITOLAK_POKJA', 'DITOLAK_INDUSTRI', 'BATAL']
                  }
                }
              },
              include: {
                placement: true
              }
            }));

        if (Array.isArray(placementsInSameIndustry)) {
          groupMembers = placementsInSameIndustry
            .map((item: any) => {
              const std = item.student || item;
              const plc = item.student ? item : item.placement;
              return {
                placementId: plc?.id,
                studentId: std?.id,
                name: std?.name,
                nis: std?.nis,
                className: std?.className,
                isCurrentStudent: std?.id === student.id
              };
            })
            .filter((m) => Boolean(m.studentId));
        }
      } catch (err) {
        console.warn('Gagal mengambil daftar anggota kelompok:', err);
      }
    }

    // 4. EKSPLORASI PERIODE PKL AKTIF & PARSING KOLOM JSON `activeIndustries`
    let activePeriod = null;
    let periodIndustryConfigMap: Record<string, { quota: number; isUnlimited: boolean }> = {};
    let allowedIndustryIdsFromPeriod: string[] = [];

    try {
      if (periodClient && typeof periodClient.findFirst === 'function') {
        activePeriod = await periodClient.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        });
      }

      if (!activePeriod) {
        // Fallback jika tidak ada yang `isActive: true`, ambil periode paling baru
        const pModel = (db as any).internshipPeriod || (db as any).period;
        if (pModel && typeof pModel.findFirst === 'function') {
          activePeriod = await pModel.findFirst({
            orderBy: { createdAt: 'desc' }
          });
        }
      }

      // EKSSTRAKSI JSON FIELD `activeIndustries`
      if (activePeriod && activePeriod.activeIndustries) {
        let parsedActiveIndustries: any[] = [];

        if (typeof activePeriod.activeIndustries === 'string') {
          try {
            parsedActiveIndustries = JSON.parse(activePeriod.activeIndustries);
          } catch (e) {
            parsedActiveIndustries = [];
          }
        } else if (Array.isArray(activePeriod.activeIndustries)) {
          parsedActiveIndustries = activePeriod.activeIndustries;
        }

        if (Array.isArray(parsedActiveIndustries) && parsedActiveIndustries.length > 0) {
          parsedActiveIndustries.forEach((item: any) => {
            const indId = item.industryId || item.id;
            if (indId && typeof indId === 'string') {
              allowedIndustryIdsFromPeriod.push(indId);
              periodIndustryConfigMap[indId] = {
                quota: typeof item.quota === 'number' ? item.quota : 0,
                isUnlimited: Boolean(item.isUnlimited)
              };
            }
          });
        }
      }
    } catch (pErr) {
      console.warn('Warning: Gagal mengekstrak activeIndustries dari Periode PKL:', pErr);
    }

    // 5. PENYUSUNAN QUERY KATALOG INDUSTRI
    let industryWhereClause: any = {};

    if (allowedIndustryIdsFromPeriod.length > 0) {
      // Jika Pokja telah mengaktifkan daftar industri tertentu di Periode Aktif
      industryWhereClause = {
        id: { in: allowedIndustryIdsFromPeriod }
      };
    } else {
      // Fallback jika Pokja belum mengeset `activeIndustries`: tampilkan berdasarkan sektor jurusan siswa atau semua industri
      const studentDept = student.department ? String(student.department).trim() : '';

      if (studentDept) {
        industryWhereClause = {
          OR: [
            { sector: { contains: studentDept, mode: 'insensitive' } },
            { sector: { equals: 'Umum', mode: 'insensitive' } },
            { sector: { equals: studentDept } },
            { sector: null }
          ]
        };
      }
    }

    // Ambil daftar industri mitra dari database Prisma
    let industriesRaw = await db.industry.findMany({
      where: industryWhereClause,
      orderBy: { name: 'asc' }
    });

    // Fallback pengaman kedua: Jika hasil filter masih kosong, tampilkan seluruh industri mitra
    if (industriesRaw.length === 0) {
      industriesRaw = await db.industry.findMany({
        orderBy: { name: 'asc' }
      });
    }

    // 6. HITUNG SISA KUOTA TERHUBUNG DENGAN KONFIGURASI PERIODE POKJA & DATABASE
    const industries = await Promise.all(
      industriesRaw.map(async (ind: any) => {
        let activePlacementsCount = 0;

        try {
          if (placementClient && typeof placementClient.count === 'function') {
            activePlacementsCount = await placementClient.count({
              where: {
                industryId: ind.id,
                status: {
                  notIn: ['DITOLAK_POKJA', 'DITOLAK_INDUSTRI', 'BATAL']
                }
              }
            });
          }
        } catch (e) {
          console.warn('Warning: Gagal menghitung jumlah siswa terdaftar:', e);
        }

        // Tentukan total kuota: Prioritaskan konfigurasi khusus Periode Pokja jika ada
        const periodConfig = periodIndustryConfigMap[ind.id];
        let totalQuota = ind.totalQuota || 0;

        if (periodConfig) {
          if (periodConfig.isUnlimited) {
            totalQuota = 999; // Penanda Tanpa Kuota / Bebas
          } else if (periodConfig.quota > 0) {
            totalQuota = periodConfig.quota;
          }
        }

        const isUnlimited = periodConfig?.isUnlimited || totalQuota >= 999;
        const remainingQuota = isUnlimited ? 999 : Math.max(0, totalQuota - activePlacementsCount);

        return {
          id: ind.id,
          name: ind.name,
          address: ind.address,
          subDistrict: ind.subDistrict || '',
          regency: ind.desaKelurahan || '',
          sector: ind.sector || 'Umum',
          phone: ind.phone || '',
          contactPerson: ind.contactPerson || '-',
          totalQuota: isUnlimited ? 'Bebas' : totalQuota,
          remainingQuota: isUnlimited ? 999 : remainingQuota,
          isUnlimited: isUnlimited,

          // LOGO DAN KOORDINAT MAPS
          logoUrl: ind.logoUrl || null,
          latitude: ind.latitude ?? null,
          longitude: ind.longitude ?? null
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student.id,
          name: student.name,
          nis: student.nis,
          className: student.className,
          department: student.department,
          isAllowedPkl: student.isAllowedPkl,
          cvUrl: student.cvUrl,
          bpjsUrl: student.bpjsUrl,
          teacher: resolvedTeacher
        },
        activePeriod: activePeriod ? {
          id: activePeriod.id,
          name: activePeriod.name || 'Periode PKL Aktif',
          startDate: activePeriod.startDate || null,
          endDate: activePeriod.endDate || null
        } : null,
        activePlacement: activePlacement,
        lastRejectedPlacement: lastRejectedPlacement,
        groupMembers: groupMembers,
        industries: industries
      }
    });

  } catch (error: any) {
    console.error('Error GET /api/student/apply:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data pengajuan.' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------
// POST: Kirim Pengajuan Tempat PKL (Tahap 1)
// ----------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized - Silakan login terlebih dahulu' }, { status: 401 });
    }

    const username = (session.user as any)?.username;

    const student = await db.student.findFirst({
      where: {
        OR: [
          { nis: username },
          { name: session.user.name || '' }
        ]
      },
      include: {
        placement: true
      }
    });

    if (!student) {
      return NextResponse.json({ error: 'Data profil siswa tidak ditemukan.' }, { status: 404 });
    }

    if (!student.isAllowedPkl) {
      return NextResponse.json({ 
        error: 'Akses pengajuan PKL untuk kelas Anda belum dibuka oleh Tim Pokja.' 
      }, { status: 400 });
    }

    if (!student.cvUrl) {
      return NextResponse.json({ 
        error: 'Anda wajib mengunggah file CV di menu Update Profil terlebih dahulu!' 
      }, { status: 400 });
    }

    const body = await request.json();
    const { industryId, startDate, endDate, notes } = body;

    if (!industryId) {
      return NextResponse.json({ error: 'Industri tujuan wajib dipilih.' }, { status: 400 });
    }

    const industry = await db.industry.findUnique({
      where: { id: industryId }
    });

    if (!industry) {
      return NextResponse.json({ error: 'Industri mitra pilihan tidak ditemukan.' }, { status: 404 });
    }

    const placementClient = getPlacementClient();

    let currentPlacementsCount = 0;
    if (placementClient && typeof placementClient.count === 'function') {
      currentPlacementsCount = await placementClient.count({
        where: {
          industryId: industryId,
          status: {
            notIn: ['DITOLAK_POKJA', 'DITOLAK_INDUSTRI', 'BATAL']
          }
        }
      });
    }

    const totalQuota = industry.totalQuota || 0;
    if (totalQuota > 0 && totalQuota < 999 && currentPlacementsCount >= totalQuota) {
      return NextResponse.json({ error: 'Mohon maaf, kuota penempatan untuk industri ini sudah penuh.' }, { status: 400 });
    }

    let placement;
    const existingPlacement = (student as any).placement;

    const payloadData = {
      industryId: industryId,
      status: 'PENGAJUAN_DIKIRIM',
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : new Date(),
      notes: notes || '',
      appliedAt: new Date()
    };

    if (existingPlacement) {
      if (placementClient && typeof placementClient.update === 'function') {
        placement = await placementClient.update({
          where: { id: existingPlacement.id },
          data: {
            ...payloadData,
            updatedAt: new Date()
          }
        });
      } else {
        placement = await db.student.update({
          where: { id: student.id },
          data: {
            placement: {
              update: {
                ...payloadData,
                updatedAt: new Date()
              }
            }
          }
        });
      }
    } else {
      if (placementClient && typeof placementClient.create === 'function') {
        placement = await placementClient.create({
          data: {
            studentId: student.id,
            ...payloadData
          }
        });
      } else {
        placement = await db.student.update({
          where: { id: student.id },
          data: {
            placement: {
              create: payloadData
            }
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengirim pengajuan tempat PKL ke ${industry.name}! Silakan pantau verifikasi Pokja.`,
      data: placement
    });

  } catch (error: any) {
    console.error('Error POST /api/student/apply:', error);
    return NextResponse.json({ error: error.message || 'Gagal memproses pengajuan tempat PKL.' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------
// PATCH: Unggah Surat Balasan Industri & Tentukan Status Individual (DITERIMA / DITOLAK)
// ----------------------------------------------------------------------
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized - Silakan login terlebih dahulu' }, { status: 401 });
    }

    const username = (session.user as any)?.username;
    const placementClient = getPlacementClient();

    const student = await db.student.findFirst({
      where: {
        OR: [
          { nis: username },
          { name: session.user.name || '' }
        ]
      },
      include: {
        placement: true
      }
    });

    const existingPlacement = student ? (student as any).placement : null;

    if (!student || !existingPlacement) {
      return NextResponse.json({ error: 'Anda belum memiliki riwayat pengajuan penempatan PKL.' }, { status: 400 });
    }

    const body = await request.json();
    const { suratBalasanUrl, memberStatuses } = body;

    if (!suratBalasanUrl) {
      return NextResponse.json({ error: 'File surat balasan wajib diunggah.' }, { status: 400 });
    }

    const updates = Array.isArray(memberStatuses) && memberStatuses.length > 0
      ? memberStatuses
      : [{ placementId: existingPlacement.id, isAccepted: true }];

    let currentStudentOutcomeStatus = 'DISETUJUI_INDUSTRI';

    for (const item of updates) {
      const isAccepted = Boolean(item.isAccepted);
      const targetStatus = isAccepted ? 'DISETUJUI_INDUSTRI' : 'DITOLAK_INDUSTRI';

      if (item.placementId) {
        if (placementClient && typeof placementClient.update === 'function') {
          await placementClient.update({
            where: { id: item.placementId },
            data: {
              suratBalasanUrl: suratBalasanUrl,
              status: targetStatus,
              updatedAt: new Date()
            }
          });
        }
      } else if (item.studentId) {
        await db.student.update({
          where: { id: item.studentId },
          data: {
            placement: {
              update: {
                suratBalasanUrl: suratBalasanUrl,
                status: targetStatus,
                updatedAt: new Date()
              }
            }
          }
        });
      }

      if (item.placementId === existingPlacement.id || item.studentId === student.id) {
        currentStudentOutcomeStatus = targetStatus;
      }
    }

    const isAcceptedMessage = currentStudentOutcomeStatus === 'DISETUJUI_INDUSTRI'
      ? 'Selamat! Pengajuan PKL Anda resmi DISETUJUI oleh industri mitra.'
      : 'Surat balasan berhasil diunggah. Status Anda kini DITOLAK INDUSTRI. Anda dapat memilih perusahaan mitra baru pada katalog.';

    return NextResponse.json({
      success: true,
      message: isAcceptedMessage,
      outcomeStatus: currentStudentOutcomeStatus
    });

  } catch (error: any) {
    console.error('Error PATCH /api/student/apply:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengunggah surat balasan.' }, { status: 500 });
  }
}