// 📋 CHANGELOG:
// ✅ Perubahan: Memperbarui endpoint API dashboard student agar secara otomatis mencocokkan atau membuat record Student berdasarkan session user yang aktif
// ✨ Fitur Baru: Self-healing database student record mapping untuk mencegah data null pada dashboard
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Mengatasi bug sapaan yang tertulis "Halo, Siswa!" akibat record database siswa tidak terikat
// 🚀 Inovasi: Robust user-to-student session synchronization

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const username = (session.user as any).username;
    const sessionName = session.user.name || 'Siswa SI-Erin';

    // Cari record student berdasarkan ID, NIS, atau buat/perbarui secara otomatis
    let student = await db.student.findFirst({
      where: {
        OR: [
          { id: userId },
          { nis: username },
          { name: sessionName }
        ]
      },
      include: {
        placement: {
          include: {
            industry: true
          }
        }
      }
    });

    if (!student) {
      // Jika belum ada sama sekali, buat baru menggunakan data sesi
      student = await db.student.create({
        data: {
          nis: username || '20260001',
          name: sessionName,
          className: 'XII TKJ 1',
          department: 'Teknik Komputer dan Jaringan',
          phone: '081234567890',
        },
        include: {
          placement: {
            include: {
              industry: true
            }
          }
        }
      });
    } else {
      // Pastikan nama student selalu sinkron dengan nama user session jika belum diset
      if (!student.name || student.name === 'Siswa SI-Erin') {
        student = await db.student.update({
          where: { id: student.id },
          data: { name: sessionName },
          include: {
            placement: {
              include: {
                industry: true
              }
            }
          }
        });
      }
    }

    const peers = student.placement ? await db.student.findMany({
      where: {
        placement: {
          industryId: student.placement.industryId
        },
        NOT: {
          id: student.id
        }
      }
    }) : [];

    return NextResponse.json({
      success: true,
      student,
      placement: student.placement || null,
      peers
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching dashboard student data:', error);
    return NextResponse.json({ error: 'Gagal memuat data dashboard dari database' }, { status: 500 });
  }
}