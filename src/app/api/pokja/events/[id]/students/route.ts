import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "POKJA") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const participants = await prisma.eventParticipant.findMany({
      where: { eventId: params.id },
      include: {
        student: {
          include: {
            user: true,
            placement: {
              include: { industry: true }
            }
          }
        }
      }
    });

    const students = participants.map((p: any) => ({
      ...p.student,
      participantId: p.id, participantStartDate: p.startDate, participantEndDate: p.endDate, participantLocation: p.location
    }));

    return NextResponse.json({ success: true, data: students });
  } catch (error) {
    console.error("Error fetching event students:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "POKJA") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { studentIds } = body;

    if (!Array.isArray(studentIds)) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    if (studentIds.length > 0) {
        await prisma.eventParticipant.createMany({
            data: studentIds.map((studentId: string) => ({
                eventId: params.id,
                studentId: studentId
            }))
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving participants:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "POKJA") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const participantId = url.searchParams.get('participantId');

    if (participantId) {
      await prisma.eventParticipant.delete({
        where: { id: participantId }
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting event student:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "POKJA") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { participantId, startDate, endDate, location } = body;

    if (!participantId) {
      return NextResponse.json({ error: "Participant ID is required" }, { status: 400 });
    }

    const updated = await prisma.eventParticipant.update({
      where: { id: participantId },
      data: {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        location: location || null,
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating participant:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
