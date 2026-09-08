const fs = require('fs');
const file = 'Dockerfile';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('ENV DATABASE_URL')) {
  code = code.replace(
    /RUN npx prisma generate/,
    `# Berikan dummy DATABASE_URL agar Next.js static generation tidak crash saat build
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate`
  );
  fs.writeFileSync(file, code);
}
