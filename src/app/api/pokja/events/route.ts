import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["POKJA", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userDept = (session.user as any)?.department;
    const userRole = (session.user as any)?.role;

    // Auto-heal: Deteksi dan perbaiki event lama yang departemennya masih null atau ALL di database server
    try {
      const unassignedEvents = await prisma.schoolEvent.findMany({
        where: {
          OR: [
            { department: null },
            { department: "ALL" },
            { department: "Semua Jurusan" }
          ],
          participants: { some: {} }
        },
        include: {
          participants: {
            take: 1,
            include: { student: { select: { department: true } } }
          }
        }
      });

      for (const ev of unassignedEvents) {
        const studentDept = ev.participants[0]?.student?.department;
        if (studentDept) {
          await prisma.schoolEvent.update({
            where: { id: ev.id },
            data: { department: studentDept }
          }).catch(() => {});
        }
      }
    } catch (e) {
      // Non-blocking auto-heal
    }

    let eventWhere: any = {};
    let participantCountWhere: any = {};

    if (userRole === "POKJA" && userDept && userDept.toLowerCase() !== "semua jurusan" && userDept.toUpperCase() !== "ALL") {
      eventWhere = {
        OR: [
          { department: { contains: userDept, mode: "insensitive" } },
          {
            AND: [
              {
                OR: [
                  { department: null },
                  { department: "ALL" },
                  { department: "Semua Jurusan" }
                ]
              },
              {
                participants: {
                  some: {
                    student: {
                      department: { contains: userDept, mode: "insensitive" }
                    }
                  }
                }
              }
            ]
          }
        ]
      };
      participantCountWhere = {
        where: {
          student: {
            department: { contains: userDept, mode: "insensitive" }
          }
        }
      };
    }

    const events = await prisma.schoolEvent.findMany({
      where: eventWhere,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { participants: Object.keys(participantCountWhere).length > 0 ? participantCountWhere : true },
        },
      },
    });

    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["POKJA", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userDept = (session.user as any)?.department;
    const body = await req.json();
    const { name, startDate, endDate, location, letterIntro, letterClosing } = body;

    const event = await prisma.schoolEvent.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        department: userDept || "ALL",
        letterIntro: letterIntro || 'Sehubungan dengan adanya program sekolah untuk memfasilitasi peserta didik dalam kegiatan Tes Kompetensi Akademik (TKA) bagi siswa kelas XII SMK Negeri 1 Adiwerna, bersama surat ini kami bermaksud memohon izin bagi siswa tersebut untuk sementara waktu tidak dapat mengikuti kegiatan Praktik Kerja Lapangan (PKL) di perusahaan yang Bapak/Ibu pimpin.',
        letterClosing: letterClosing || 'Kami sampaikan pula bahwa setelah kegiatan {nama_kegiatan} tersebut selesai, siswa yang bersangkutan akan kembali melanjutkan kegiatan PKL di {nama_industri} hingga batas waktu yang telah disepakati bersama sebelumnya.',
      },
    });

    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}