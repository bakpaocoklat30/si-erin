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

    const event = await prisma.schoolEvent.findUnique({
      where: { id: params.id },
      include: {
        participants: {
          include: {
            student: {
              include: {
                user: { select: { id: true, name: true, email: true } },
                placement: {
                  include: {
                    industry: {
                      select: { id: true, name: true, address: true }
                    },
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Internal Server Error: " + String(error.message || error) },
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

    await prisma.schoolEvent.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { error: "Internal Server Error: " + String(error.message || error) },
      { status: 500 }
    );
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
    const { name, startDate, endDate, location, description, letterIntro } = body;

    const event = await prisma.schoolEvent.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(location !== undefined && { location }),
        
        ...(letterIntro !== undefined && { letterIntro }),
      }
    });

    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "Internal Server Error: " + String(error.message || error) },
      { status: 500 }
    );
  }
}