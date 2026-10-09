const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const pts = await prisma.eventParticipant.findMany({
    where: { letterUrl: { not: null } },
    include: { student: { include: { user: true } } }
  });
  console.log('Total participants with letters:', pts.length);
  if (pts.length > 0) {
    console.log('Sample user for pt:', pts[0].student?.user);
  }
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
