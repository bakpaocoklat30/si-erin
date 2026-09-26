import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✨ Fitur Baru: API Penugasan Monitoring Guru oleh Tim Pokja & Admin.
// 🔧 Fitur:
//    - GET: Mengambil daftar penugasan monitoring, list industri mitra aktif, guru pembimbing, dan data sekolah.
//    - POST: Membuat penugasan jadwal monitoring guru ke industri baru.
// ----------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA', 'PEMBIMBING', 'TATA_USAHA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ success: false, error: 'Akses tidak diizinkan.' }, { status: 403 });
    }

    // 1. Ambil seluruh penugasan monitoring
    const assignments = await prisma.monitoringAssignment.findMany({
      include: {
        industry: {
          select: {
            id: true,
            name: true,
            address: true,
            sector: true,
            phone: true,
            contactPerson: true,
            desaKelurahan: true,
            subDistrict: true,
            regency: true,
            province: true,
            placements: {
              where: {
                status: { in: ['DISETUJUI_INDUSTRI', 'PEMBUATAN_SURAT', 'SURAT_DITERBITKAN', 'COMPLETED'] }
              },
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    nis: true,
                    className: true,
                    department: true,
                  }
                }
              }
            }
          }
        },
        teacher: {
          select: {
            id: true,
            name: true,
            username: true,
            nip: true,
            rank: true,
            jobTitle: true,
            phone: true,
          }
        },
        period: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          }
        }
      },
      orderBy: {
        monitoringDate: 'desc'
      }
    });

    // 2. Ambil daftar industri mitra yang sedang memiliki penempatan aktif
    const industries = await prisma.industry.findMany({
      include: {
        placements: {
          where: {
            status: { in: ['DISETUJUI_INDUSTRI', 'PEMBUATAN_SURAT', 'SURAT_DITERBITKAN', 'COMPLETED'] }
          },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                nis: true,
                className: true,
                department: true,
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // 3. Ambil daftar guru pembimbing / pengajar yang bisa ditugaskan
    const teachers = await prisma.user.findMany({
      where: {
        role: { in: ['PEMBIMBING', 'GURU', 'POKJA', 'ADMIN'] }
      },
      select: {
        id: true,
        name: true,
        username: true,
        nip: true,
        rank: true,
        jobTitle: true,
        phone: true,
        department: true,
      },
      orderBy: {
        name: 'asc'
      }
    });

    // 4. Ambil profil sekolah untuk Kop & TTE
    let schoolSetting = await prisma.schoolSetting.findFirst();
    if (!schoolSetting) {
      schoolSetting = await prisma.schoolSetting.create({
        data: {
          name: 'SMK Negeri 1 Adiwerna',
          shortName: 'SMKN 1 Adiwerna',
          address: 'JL. Raya 2 PO BOX 24 Adiwerna, Kabupaten Tegal, Jawa Tengah Kode Pos 52194',
          phone: '(0283) 443768',
          email: 'mail@smkn1adw.sch.id',
          headmaster: 'Joko Pramono, S.Pd., M.Ds',
          headmasterNip: '19690316 199802 1 004',
        }
      });
    }

    // 5. Periode PKL aktif
    const activePeriod = await prisma.internshipPeriod.findFirst({
      where: { isActive: true },
      include: { academicYear: true }
    });

    return NextResponse.json({
      success: true,
      data: {
        assignments,
        industries,
        teachers,
        schoolSetting,
        activePeriod,
      }
    });
  } catch (error: any) {
    console.error('Error fetching monitoring assignments:', error);
    return NextResponse.json({ success: false, error: error.message || 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'POKJA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ success: false, error: 'Hanya Tim Pokja dan Admin yang dapat menjadwalkan monitoring.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      industryId,
      industryAddress,
      teacherId,
      teacherRank,
      companionTeachers,
      targetIndustries,
      periodId,
      monitoringDate,
      returnDate,
      letterNumber,
      sppdNumber,
      purpose,
      transportType,
      departurePlace,
      destinationPlace,
      budgetSource,
      budgetAccount,
      notes
    } = body;

    if (!industryId || !teacherId || !monitoringDate) {
      return NextResponse.json({ 
        success: false, 
        error: 'Industri, Guru Utama, dan Tanggal Monitoring wajib diisi!' 
      }, { status: 400 });
    }

    // Jika pengguna mengisi / memperbaiki alamat industri langsung di form, simpan ke database industri
    if (industryAddress && typeof industryAddress === 'string') {
      await prisma.industry.update({
        where: { id: industryId },
        data: { address: industryAddress.trim() }
      }).catch((err) => console.error('Error updating industry address:', err));
    }

    // Jika pengguna mengisi / memperbaiki pangkat & golongan guru langsung di form, simpan ke database guru
    if (teacherRank !== undefined && typeof teacherRank === 'string') {
      await prisma.user.update({
        where: { id: teacherId },
        data: { rank: teacherRank.trim() }
      }).catch((err) => console.error('Error updating teacher rank:', err));
    }

    // Cari data industri untuk mengisi default destinationPlace jika belum diisi
    const industry = await prisma.industry.findUnique({
      where: { id: industryId }
    });

    const parsedTargetIndustries = Array.isArray(targetIndustries) ? targetIndustries : [];
    const destinationList = [
      industry?.name,
      ...parsedTargetIndustries.map((ind: any) => ind?.name).filter(Boolean)
    ];

    const finalDestination =
      destinationPlace ||
      (destinationList.length > 1
        ? destinationList.join(', ')
        : industry
        ? `${industry.name} (${industry.address || industry.regency || ''})`
        : '');

    const newAssignment = await prisma.monitoringAssignment.create({
      data: {
        industryId,
        teacherId,
        companionTeachers: Array.isArray(companionTeachers) ? companionTeachers : [],
        targetIndustries: parsedTargetIndustries,
        periodId: periodId || null,
        monitoringDate: new Date(monitoringDate),
        returnDate: returnDate ? new Date(returnDate) : new Date(monitoringDate),
        letterNumber: letterNumber || '${nomor_naskah}',
        sppdNumber: sppdNumber || '${nomor_naskah}',
        purpose: purpose || 'Melaksanakan kegiatan Monitoring siswa Praktik Kerja Lapangan (PKL)',
        transportType: transportType || 'Mobil Dinas / Kendaraan Umum',
        departurePlace: departurePlace || 'SMK Negeri 1 Adiwerna',
        destinationPlace: finalDestination,
        budgetSource: budgetSource || 'SMK Negeri 1 Adiwerna',
        budgetAccount: budgetAccount || 'Dana BOS',
        notes: notes || null,
        status: 'TERJADWAL',
      },
      include: {
        industry: true,
        teacher: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Penugasan monitoring guru berhasil dijadwalkan!',
      data: newAssignment
    });
  } catch (error: any) {
    console.error('Error creating monitoring assignment:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal menyimpan penugasan monitoring' }, { status: 500 });
  }
}
