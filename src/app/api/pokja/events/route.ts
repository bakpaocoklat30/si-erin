import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "POKJA") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const events = await prisma.schoolEvent.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { participants: true },
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
    if (!session || session.user.role !== "POKJA") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, startDate, endDate, location, letterIntro } = body;

    const event = await prisma.schoolEvent.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        letterIntro: letterIntro || 'Sehubungan dengan adanya program sekolah untuk memfasilitasi peserta didik dalam kegiatan Tes Kompetensi Akademik (TKA) bagi siswa kelas XII SMK Negeri 1 Adiwerna, bersama surat ini kami bermaksud memohon izin bagi siswa tersebut untuk sementara waktu tidak dapat mengikuti kegiatan Praktik Kerja Lapangan (PKL) di perusahaan yang Bapak/Ibu pimpin.',
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