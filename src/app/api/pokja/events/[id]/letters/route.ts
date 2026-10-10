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
                user: {
                  select: { id: true, name: true, email: true }
                },
                placement: {
                  include: {
                    industry: {
                      select: { id: true, name: true, address: true }
                    }
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

    const school = await prisma.schoolSetting.findFirst();

    // Group students by industry
    const industryMap = new Map();

    event.participants.forEach((p: any) => {
      const industry = p.student?.placement?.industry;
      if (industry) {
        if (!industryMap.has(industry.id)) {
          industryMap.set(industry.id, {
            industry: industry,
            students: []
          });
        }
                industryMap.get(industry.id).students.push({
          ...p.student,
          participantStartDate: p.startDate,
          participantEndDate: p.endDate,
          participantLocation: p.location
        });
      }
    });

    const industryIds = Array.from(industryMap.keys());
    const placementGroups = await prisma.placementGroup.findMany({
      where: { industryId: { in: industryIds } },
      include: { period: true }
    });

    const letters = Array.from(industryMap.values()).map(letter => ({
      ...letter,
      groups: placementGroups.filter(g => g.industryId === letter.industry.id)
    }));

    return NextResponse.json({
        success: true,
        event,
        school,
        letters
    });
  } catch (error) {
    console.error("Error fetching letters:", error);
    return NextResponse.json(
      { error: "Internal Server Error: " + String(error.message || error) },
      { status: 500 }
    );
  }
}
