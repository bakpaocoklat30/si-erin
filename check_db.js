const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const pts = await prisma.eventParticipant.findMany({
    select: { id: true, studentId: true, eventId: true, letterUrl: true }
  });
  console.log('Total participants:', pts.length);
  const withUrl = pts.filter(p => p.letterUrl);
  console.log('With URL:', withUrl.length);
  console.dir(withUrl, {depth: null});
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
