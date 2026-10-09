const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const student = await prisma.student.findUnique({
    where: { id: 'cmugkep08000a376ivkwm0tmf' },
    include: { placement: true }
  });
  console.log(student.name, 'placement:', student.placement);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
