const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function migrate() {
  console.log('Migrating placements...');
  const placements = await prisma.internshipPlacement.findMany();
  let updated = 0;

  for (const p of placements) {
    let changed = false;
    let data = {};

    for (const field of ['suratTugasUrl', 'suratBalasanUrl', 'suratPengantaranUrl', 'suratPenarikanUrl']) {
      if (p[field] && p[field].startsWith('data:')) {
        const parts = p[field].split(',');
        if (parts.length < 2) continue;
        const base64 = parts[1];
        
        const binary = Buffer.from(base64, 'base64');
        const fileName = `${field}_${p.id}_${Date.now()}.pdf`;
        const dir = path.join(process.cwd(), 'public', 'uploads', 'migrated');
        fs.mkdirSync(dir, { recursive: true });
        
        const filePath = path.join(dir, fileName);
        fs.writeFileSync(filePath, binary);
        
        data[field] = `/uploads/migrated/${fileName}`;
        changed = true;
      }
    }

    if (changed) {
      await prisma.internshipPlacement.update({ where: { id: p.id }, data });
      updated++;
      console.log(`Migrated placement ${p.id}`);
    }
  }
  console.log('Migrated', updated, 'placements');
}
migrate().finally(() => prisma.$disconnect());

