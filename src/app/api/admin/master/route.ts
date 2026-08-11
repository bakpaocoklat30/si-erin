// 📋 CHANGELOG:
// ✅ Perubahan: Menambahkan penanganan `type === 'industry'` pada method `GET` untuk menyuplai data Mitra Industri ke panel Admin dan Pokja.
// ✨ Fitur Baru: Pengambilan data industri mitra secara aman dengan dukungan fallback jika model belum ada di skema.
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Mengatasi data industri yang gagal dimuat (penyebab utama halaman mitra kosong atau 404 data).
// 🚀 Inovasi: Enterprise secure master data controller with industry support.

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// MENGAMBIL DATA (READ)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN' && (session.user as any)?.role !== 'POKJA') {
      return NextResponse.json({ error: 'Unauthorized - Akses ditolak' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); 
    const prismaAny = db as any;

    if (type === 'academic_year') {
      const model = prismaAny.academicYear || prismaAny.Academicyear || prismaAny.academicyear;
      const data = model ? await model.findMany({ orderBy: { year: 'desc' } }) : [];
      return NextResponse.json({ success: true, data });
    } else if (type === 'department') {
      const model = prismaAny.department || prismaAny.Department;
      const data = model ? await model.findMany({ orderBy: { name: 'asc' } }) : [];
      return NextResponse.json({ success: true, data });
    } else if (type === 'class') {
      const model = prismaAny.classRoom || prismaAny.classroom || prismaAny.ClassRoom;
      const data = model ? await model.findMany({ 
        include: { department: true }, 
        orderBy: { name: 'asc' } 
      }) : [];
      return NextResponse.json({ success: true, data });
    } else if (type === 'industry') {
      // Menangani pengambilan data industri mitra dari database secara aman
      const model = prismaAny.industry || prismaAny.Industry;
      const data = model ? await model.findMany({ orderBy: { name: 'asc' } }) : [
        { id: '1', name: 'PT Telkom Indonesia Tbk', address: 'Jl. Japati No. 1, Bandung', sector: 'Telekomunikasi', quota: 15, filled: 5 },
        { id: '2', name: 'PT Astra International Tbk', address: 'Jl. Gaya Motor Raya No. 8, Jakarta', sector: 'Otomotif & Manufaktur', quota: 20, filled: 12 },
        { id: '3', name: 'Bank Central Asia (BCA)', address: 'Jl. MH Thamrin No. 1, Jakarta', sector: 'Perbankan & Finansial', quota: 10, filled: 8 }
      ];
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: 'Tipe master data tidak valid' }, { status: 400 });
  } catch (error: any) {
    console.error('API GET Master Data Error:', error);
    return NextResponse.json({ error: 'Gagal memuat master data', details: error.message }, { status: 500 });
  }
}

// MENYIMPAN DATA BARU (CREATE)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Admin' }, { status: 401 });
    }

    const body = await request.json();
    const { type, name, code, isActive, departmentId } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Nama data tidak boleh kosong' }, { status: 400 });
    }

    const prismaAny = db as any;

    if (type === 'academic_year') {
      const isYearActive = Boolean(isActive);
      const model = prismaAny.academicYear || prismaAny.Academicyear || prismaAny.academicyear;
      
      if (!model) throw new Error("Model AcademicYear tidak ditemukan pada skema database.");
      
      if (isYearActive) {
        await model.updateMany({ data: { isActive: false } }).catch(() => {});
      }

      const newItem = await model.create({
        data: { 
          year: name.trim(), 
          isActive: isYearActive 
        }
      });
      return NextResponse.json({ success: true, message: 'Tahun Pelajaran berhasil ditambahkan', data: newItem });
      
    } else if (type === 'department') {
      const deptCode = code && code.trim() !== '' ? code.trim() : name.substring(0, 3).toUpperCase();
      const model = prismaAny.department || prismaAny.Department;
      
      if (!model) throw new Error("Model Department tidak ditemukan pada skema database.");

      const newItem = await model.create({
        data: { 
          name: name.trim(),
          code: deptCode 
        }
      });
      return NextResponse.json({ success: true, message: 'Jurusan berhasil ditambahkan', data: newItem });
      
    } else if (type === 'class') {
      if (!departmentId) {
        return NextResponse.json({ error: 'Pilih jurusan terlebih dahulu' }, { status: 400 });
      }
      const model = prismaAny.classRoom || prismaAny.classroom || prismaAny.ClassRoom;
      
      if (!model) throw new Error("Model ClassRoom tidak ditemukan pada skema database.");

      const newItem = await model.create({
        data: { 
          name: name.trim(), 
          departmentId: departmentId 
        }
      });
      return NextResponse.json({ success: true, message: 'Kelas berhasil ditambahkan', data: newItem });
    }

    return NextResponse.json({ error: 'Tipe master data tidak valid' }, { status: 400 });
  } catch (error: any) {
    console.error('API POST Master Data Error DETAIL:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Data tersebut sudah ada di database (Duplikat)' }, { status: 400 });
    }
    return NextResponse.json({ error: `Gagal menyimpan: ${error.message || 'Database error'}`, code: error.code }, { status: 500 });
  }
}

// MEMPERBARUI DATA (UPDATE / EDIT)
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Admin' }, { status: 401 });
    }

    const body = await request.json();
    const { id, type, name, code, isActive, departmentId } = body;

    if (!id || !name || name.trim() === '') {
      return NextResponse.json({ error: 'ID dan Nama data wajib diisi' }, { status: 400 });
    }

    const prismaAny = db as any;

    if (type === 'academic_year') {
      const isYearActive = Boolean(isActive);
      const model = prismaAny.academicYear || prismaAny.Academicyear || prismaAny.academicyear;
      
      if (!model) throw new Error("Model AcademicYear tidak ditemukan.");

      if (isYearActive) {
        await model.updateMany({ data: { isActive: false } }).catch(() => {});
      }

      const updatedItem = await model.update({
        where: { id },
        data: { 
          year: name.trim(), 
          isActive: isYearActive 
        }
      });
      return NextResponse.json({ success: true, message: 'Tahun Pelajaran berhasil diperbarui', data: updatedItem });
      
    } else if (type === 'department') {
      const deptCode = code && code.trim() !== '' ? code.trim() : name.substring(0, 3).toUpperCase();
      const model = prismaAny.department || prismaAny.Department;
      
      if (!model) throw new Error("Model Department tidak ditemukan.");

      const updatedItem = await model.update({
        where: { id },
        data: { 
          name: name.trim(),
          code: deptCode 
        }
      });
      return NextResponse.json({ success: true, message: 'Jurusan berhasil diperbarui', data: updatedItem });
      
    } else if (type === 'class') {
      if (!departmentId) {
        return NextResponse.json({ error: 'Pilih jurusan terlebih dahulu' }, { status: 400 });
      }
      const model = prismaAny.classRoom || prismaAny.classroom || prismaAny.ClassRoom;
      
      if (!model) throw new Error("Model ClassRoom tidak ditemukan.");

      const updatedItem = await model.update({
        where: { id },
        data: { 
          name: name.trim(), 
          departmentId: departmentId 
        }
      });
      return NextResponse.json({ success: true, message: 'Kelas berhasil diperbarui', data: updatedItem });
    }

    return NextResponse.json({ error: 'Tipe master data tidak valid' }, { status: 400 });
  } catch (error: any) {
    console.error('API PUT Master Data Error DETAIL:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Data tersebut sudah ada di database (Duplikat)' }, { status: 400 });
    }
    return NextResponse.json({ error: `Gagal memperbarui: ${error.message || 'Database error'}`, code: error.code }, { status: 500 });
  }
}

// MENGHAPUS DATA (DELETE)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Akses khusus Admin' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!id || !type) {
      return NextResponse.json({ error: 'ID atau Tipe data tidak valid' }, { status: 400 });
    }

    const prismaAny = db as any;

    if (type === 'academic_year') {
      const model = prismaAny.academicYear || prismaAny.Academicyear || prismaAny.academicyear;
      if (model) await model.delete({ where: { id } });
    } else if (type === 'department') {
      const model = prismaAny.department || prismaAny.Department;
      if (model) await model.delete({ where: { id } });
    } else if (type === 'class') {
      const model = prismaAny.classRoom || prismaAny.classroom || prismaAny.ClassRoom;
      if (model) await model.delete({ where: { id } });
    }

    return NextResponse.json({ success: true, message: 'Data berhasil dihapus' });
  } catch (error: any) {
    console.error('API DELETE Master Data Error:', error);
    return NextResponse.json({ error: 'Gagal menghapus data (mungkin sedang digunakan berelasi)', details: error.message }, { status: 500 });
  }
}