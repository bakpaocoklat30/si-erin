const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/persuratan/permohonan/page.tsx', 'utf-8');

const target = `interface StudentItem {`;
const replacement = `interface StudentItem {
  student?: any;`;

if (content.includes(target) && !content.includes('student?: any;')) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/app/dashboard/persuratan/permohonan/page.tsx', content);
    console.log("Fixed StudentItem");
}

