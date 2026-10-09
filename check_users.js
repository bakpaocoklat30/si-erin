const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ where: { role: 'SISWA' }, include: { student: true } });
  console.log('Sample SISWA users:');
  for (let i = 0; i < Math.min(3, users.length); i++) {
    console.log(users[i].username, '-> studentId:', users[i].student?.id);
  }
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
