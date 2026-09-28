// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Pembaruan REST API Manajemen Guru Admin dengan dukungan Pangkat, Golongan, Nomor WhatsApp, dan CRUD penuh.
// ✨ Fitur Baru:
//    - Field Pangkat (rank) & Golongan (golongan ruang kepegawaian).
//    - Field Nomor WhatsApp resmi (phone) untuk komunikasi & koordinasi penugasan.
//    - Ringkasan statistik cepat (Total Guru, PNS, PPPK/Honorer, Guru Ber-WA).
//    - Endpoint POST untuk pendaftaran guru baru secara langsung.
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Menjaga kompatibilitas dengan penugasan monitoring & Surat Tugas / SPPD.
// 🚀 Inovasi: Integrated Educator Master Registry for SI-ERIN Enterprise.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Validasi hak akses (Hanya Admin dan Pokja yang berhak mengakses)
    if (!session || !['ADMIN', 'POKJA', 'SUPER_ADMIN', 'TATA_USAHA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get('role');
    const searchParam = searchParams.get('search')?.toLowerCase().trim() || '';

    // Filter role pengajar/guru/pokja
    const roleCondition = roleParam && roleParam !== 'ALL'
      ? { role: { equals: roleParam, mode: 'insensitive' as const } }
      : {
          OR: [
            { role: { equals: 'GURU', mode: 'insensitive' as const } },
            { role: { equals: 'PEMBIMBING', mode: 'insensitive' as const } },
            { role: { equals: 'POKJA', mode: 'insensitive' as const } },
            { role: { equals: 'TEACHER', mode: 'insensitive' as const } },
            { role: { equals: 'GURUPMB', mode: 'insensitive' as const } },
            { role: { equals: 'TATA_USAHA', mode: 'insensitive' as const } },
            { role: { equals: 'TU', mode: 'insensitive' as const } },
            { role: { equals: 'ADMIN', mode: 'insensitive' as const } }
          ]
        };

    const teachers = await db.user.findMany({
      where: roleCondition,
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        department: true,
        nip: true,
        rank: true,
        golongan: true,
        phone: true,
        jobTitle: true,
        employeeType: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            supervisedStudents: true,
            monitoringAssignments: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Filter pencarian client-like jika ada search parameter
    const filtered = searchParam
      ? teachers.filter(t => 
          (t.name && t.name.toLowerCase().includes(searchParam)) ||
          (t.nip && t.nip.toLowerCase().includes(searchParam)) ||
          (t.rank && t.rank.toLowerCase().includes(searchParam)) ||
          (t.golongan && t.golongan.toLowerCase().includes(searchParam)) ||
          (t.phone && t.phone.toLowerCase().includes(searchParam)) ||
          (t.department && t.department.toLowerCase().includes(searchParam)) ||
          (t.jobTitle && t.jobTitle.toLowerCase().includes(searchParam)) ||
          (t.employeeType && t.employeeType.toLowerCase().includes(searchParam))
        )
      : teachers;

    // Hitung ringkasan statistik
    const stats = {
      total: teachers.length,
      pnsCount: teachers.filter(t => t.employeeType === 'PNS' || (!t.employeeType && t.nip && t.nip.trim() !== '' && t.nip !== '-')).length,
      pppkCount: teachers.filter(t => t.employeeType === 'PPPK' || (!t.employeeType && ((t.golongan && t.golongan.toUpperCase().includes('IX')) || (t.rank && t.rank.toUpperCase().includes('IX'))))).length,
      honorerCount: teachers.filter(t => t.employeeType === 'HONORER' || (!t.employeeType && (!t.nip || t.nip === '-') && !(t.golongan && t.golongan.toUpperCase().includes('IX')))).length,
      waCount: teachers.filter(t => t.phone && t.phone.trim() !== '' && t.phone !== '-').length,
    };

    return NextResponse.json({
      success: true,
      count: filtered.length,
      stats,
      data: filtered
    });

  } catch (error: any) {
    console.error('API Error Fetching Teachers:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memuat daftar guru' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Administrator' }, { status: 403 });
    }

    const body = await request.json();
    const { name, nip, rank, golongan, phone, role, department, jobTitle, employeeType, password } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Nama guru wajib diisi' }, { status: 400 });
    }

    const cleanNip = nip && nip.trim() !== '' && nip.trim() !== '-' ? nip.trim() : null;
    let username = cleanNip;

    if (!username) {
      username = `guru_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    } else {
      // Cek apakah username / NIP sudah terdaftar
      const existing = await db.user.findFirst({
        where: {
          OR: [
            { username: cleanNip },
            { nip: cleanNip }
          ]
        }
      });
      if (existing) {
        return NextResponse.json({ 
          error: `Guru dengan NIP / Username "${cleanNip}" sudah terdaftar atas nama "${existing.name}". Silakan gunakan edit data.` 
        }, { status: 409 });
      }
    }

    const hashedPassword = await bcrypt.hash(password || 'guru12345', 10);

    // Tentukan jenis kepegawaian default jika tidak diberikan
    let cleanEmployeeType = employeeType ? String(employeeType).trim().toUpperCase() : null;
    if (!cleanEmployeeType || !['PNS', 'PPPK', 'HONORER'].includes(cleanEmployeeType)) {
      if (golongan && golongan.toUpperCase().includes('IX')) {
        cleanEmployeeType = 'PPPK';
      } else if (cleanNip) {
        cleanEmployeeType = 'PNS';
      } else {
        cleanEmployeeType = 'HONORER';
      }
    }

    // Tentukan jabatan fungsional (Guru, Tata Usaha, Staff)
    const validJobTitles = ['Guru', 'Tata Usaha', 'Staff'];
    let cleanJobTitle = jobTitle ? String(jobTitle).trim() : 'Guru';
    if (!validJobTitles.includes(cleanJobTitle)) {
      if (cleanJobTitle.toLowerCase().includes('tata usaha') || cleanJobTitle.toLowerCase() === 'tu') {
        cleanJobTitle = 'Tata Usaha';
      } else if (cleanJobTitle.toLowerCase().includes('staff') || cleanJobTitle.toLowerCase().includes('staf')) {
        cleanJobTitle = 'Staff';
      } else {
        cleanJobTitle = 'Guru';
      }
    }

    const newTeacher = await db.user.create({
      data: {
        username,
        name: name.trim(),
        nip: cleanNip,
        rank: rank ? rank.trim() : null,
        golongan: golongan ? golongan.trim() : null,
        phone: phone ? phone.trim() : null,
        role: role ? String(role).toUpperCase().trim() : 'GURU',
        department: department ? department.trim() : null,
        jobTitle: cleanJobTitle,
        employeeType: cleanEmployeeType,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        username: true,
        nip: true,
        rank: true,
        golongan: true,
        phone: true,
        role: true,
        department: true,
        jobTitle: true,
        employeeType: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      message: `Guru "${newTeacher.name}" berhasil ditambahkan.`,
      data: newTeacher
    }, { status: 201 });

  } catch (error: any) {
    console.error('API Error Creating Teacher:', error);
    return NextResponse.json({ error: error.message || 'Gagal menambahkan data guru' }, { status: 500 });
  }
}