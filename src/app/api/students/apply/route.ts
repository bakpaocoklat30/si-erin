// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Menambahkan pemfilteran katalog industri berdasarkan Periode PKL Aktif dan Jurusan (Department) Siswa.
// ✨ Fitur Baru: Period & Department-Aware Industry Filtering Engine.
// 🎨 UI/UX Update: N/A (Backend API Endpoint).
// 🔧 Bug Fix: Menyelesaikan masalah semua industri muncul di siswa padahal sudah dibatasi oleh Pokja pada menu Periode.
// 🚀 Inovasi: Multi-Tenant Department & Active Period Scope Constraint.
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

// Helper terisolasi untuk mendeteksi instance model Period secara presisi
function getPeriodClient() {
  const prisma = db as any;
  return (
    prisma.internshipPeriod ||
    prisma.InternshipPeriod ||
    prisma.period ||
    prisma.Period ||
    prisma.pklPeriod ||
    null
  );
}

// ----------------------------------------------------------------------
// GET: Ambil Data Profil Siswa, Status Pengajuan Aktif, Rekan Kelompok, & Katalog Industri (Filtered by Period & Department)
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
            logoUrl: rawPlacement.industry.logoUrl || rawPlacement.industry.logo_url || rawPlacement.industry.logo || null,
            latitude: rawPlacement.industry.latitude ?? rawPlacement.industry.lat ?? rawPlacement.industry.lat_location ?? null,
            longitude: rawPlacement.industry.longitude ?? rawPlacement.industry.lng ?? rawPlacement.industry.lng_location ?? null
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

    // 4. CARI PERIODE PKL AKTIF & PEMBATASAN INDUSTRI SESUAI JURUSAN SISWA
    let activePeriod = null;
    let allowedIndustryIdsFromPeriod: string[] | null = null;

    try {
      if (periodClient && typeof periodClient.findFirst === 'function') {
        activePeriod = await periodClient.findFirst({
          where: {
            OR: [
              { isActive: true },
              { is_active: true },
              { status: 'ACTIVE' },
              { status: 'AKTIF' }
            ]
          },
          include: {
            industries: true,
            periodIndustries: true,
            quotas: true,
            departments: true
          }
        });
      }

      if (!activePeriod) {
        // Fallback jika tidak ditemukan dengan flag active: Ambil periode terbaru
        const prisma = db as any;
        const pModel = prisma.period || prisma.Period || prisma.internshipPeriod || prisma.InternshipPeriod;
        if (pModel && typeof pModel.findFirst === 'function') {
          activePeriod = await pModel.findFirst({
            orderBy: { createdAt: 'desc' },
            include: {
              industries: true,
              periodIndustries: true,
              quotas: true
            }
          });
        }
      }

      // Jika periode ditemukan, ekstrak ID Industri yang diperbolehkan untuk jurusan siswa ini
      if (activePeriod) {
        const rawPeriodIndustries = activePeriod.industries || activePeriod.periodIndustries || activePeriod.quotas || [];
        
        if (Array.isArray(rawPeriodIndustries) && rawPeriodIndustries.length > 0) {
          allowedIndustryIdsFromPeriod = rawPeriodIndustries
            .filter((item: any) => {
              // Jika ada spesifikasi jurusan pada item periode/kuota, filter sesuai jurusan siswa
              const itemDept = item.department || item.jurusan || item.dept || null;
              if (itemDept && student.department) {
                return String(itemDept).toLowerCase() === String(student.department).toLowerCase();
              }
              return true;
            })
            .map((item: any) => item.industryId || item.industry_id || item.id)
            .filter(Boolean);
        }
      }
    } catch (pErr) {
      console.warn('Warning: Gagal mengambil data Periode PKL Aktif:', pErr);
    }

    // 5. Ambil daftar industri mitra (Terapkan Filter Jurusan & Periode jika ada pembatasan)
    const studentDept = student.department ? String(student.department).trim().toLowerCase() : '';
    
    // Syarat Filter Prisma:
    // a. Sektor/Bidang sesuai jurusan siswa ATAU 'Umum'
    // b. ATAU ID Industri terdaftar dalam Periode Aktif
    let industryWhereClause: any = {};

    if (allowedIndustryIdsFromPeriod && allowedIndustryIdsFromPeriod.length > 0) {
      industryWhereClause = {
        id: { in: allowedIndustryIdsFromPeriod }
      };
    } else if (studentDept) {
      industryWhereClause = {
        OR: [
          { sector: { contains: studentDept, mode: 'insensitive' } },
          { sector: { equals: 'Umum', mode: 'insensitive' } },
          { sector: { equals: student.department } },
          { department: { equals: student.department } },
          { department: { equals: 'Umum' } },
          { sector: null },
          { sector: '' }
        ]
      };
    }

    const industriesRaw = await db.industry.findMany({
      where: industryWhereClause,
      orderBy: { name: 'asc' }
    });

    // 6. Hitung sisa kuota industri & pasok data Logo serta Koordinat Maps
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
          console.warn('Warning: Gagal menghitung kuota penempatan:', e);
        }

        const totalQuota = ind.quota || ind.totalQuota || 0;
        const remainingQuota = Math.max(0, totalQuota - activePlacementsCount);

        return {
          id: ind.id,
          name: ind.name,
          address: ind.address,
          subDistrict: ind.subDistrict || ind.kecamatan || '',
          regency: ind.regency || ind.kabupaten || '',
          sector: ind.sector || ind.department || ind.bidang || 'Umum',
          phone: ind.phone || ind.telepon || ind.noHp || '',
          contactPerson: ind.contactPerson || ind.hrd || ind.penanggungJawab || '-',
          totalQuota: totalQuota,
          remainingQuota: remainingQuota,

          // EKSPLISIT MENYESUAIKAN FIELD LOGO DAN KOORDINAT DARI DATABASE
          logoUrl: ind.logoUrl || ind.logo_url || ind.logo || ind.image || ind.imageUrl || null,
          latitude: ind.latitude ?? ind.lat ?? ind.lat_location ?? null,
          longitude: ind.longitude ?? ind.lng ?? ind.lng_location ?? null
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
          name: activePeriod.name || activePeriod.title || 'Periode PKL Aktif',
          startDate: activePeriod.startDate || activePeriod.start_date || null,
          endDate: activePeriod.endDate || activePeriod.end_date || null
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

    const totalQuota = industry.quota || (industry as any).totalQuota || 0;
    if (totalQuota > 0 && currentPlacementsCount >= totalQuota) {
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