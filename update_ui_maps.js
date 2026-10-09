const fs = require('fs');

const targetFile = 'src/app/dashboard/pokja/industries/page.tsx';
let content = fs.readFileSync(targetFile, 'utf-8');

const target1 = `placeholder='Cari manual: "Jl. Sudirman No.1, Jakarta" atau nama gedung...'`;
const replacement1 = `placeholder='Paste Link Google Maps atau ketik alamat (Jl. Sudirman No.1)...'`;

const target2 = `A Ketik di kotak cari untuk pencarian manual A Geser/klik marker untuk presisi`;
const replacement2 = `A Paste Link Google Maps untuk tingkat akurasi 100% A Geser/klik marker untuk presisi`;

if (content.includes(target1) && content.includes(target2)) {
  content = content.replace(target1, replacement1);
  content = content.replace(target2, replacement2);
  fs.writeFileSync(targetFile, content);
  console.log("Updated UI text");
} else {
  console.log("Target not found");
}

