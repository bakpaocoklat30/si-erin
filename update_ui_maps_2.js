const fs = require('fs');

const targetFile = 'src/app/dashboard/pokja/industries/page.tsx';
let content = fs.readFileSync(targetFile, 'utf-8');

const target1 = `placeholder='Cari manual: "Jl. Sudirman No.1, Jakarta" atau nama gedung...'`;
const replacement1 = `placeholder='Paste Link Google Maps atau ketik alamat (Jl. Sudirman No.1)...'`;

if (content.includes(target1)) {
  content = content.replace(target1, replacement1);
  fs.writeFileSync(targetFile, content);
  console.log("Updated UI text 1");
}

const target3 = `Ketik di kotak cari untuk pencarian manual`;
const replacement3 = `Paste Link Google Maps untuk tingkat akurasi 100% atau ketik alamat`;

if (content.includes(target3)) {
  content = content.replace(target3, replacement3);
  fs.writeFileSync(targetFile, content);
  console.log("Updated UI text 3");
}

