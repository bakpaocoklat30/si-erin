const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const event = await prisma.schoolEvent.findFirst({
    include: {
        participants: {
          include: {
            student: {
              include: {
                user: true,
                placement: {
                  include: {
                    industry: true,
                  }
                }
              }
            }
          }
        }
    }
  });
  console.log("Event:", event?.name);
  console.log("Participants count:", event?.participants?.length);
  
  if (event) {
    const industryMap = new Map();
    event.participants.forEach((p) => {
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
    console.log("Letters:", Array.from(industryMap.values()).length);
  }
}
main().catch(console.error);