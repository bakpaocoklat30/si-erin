const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/persuratan/permohonan/page.tsx', 'utf-8');

const target = 'let sourcePdf:';
const fix = `const toBase64 = (arr: Uint8Array) => {
          let binary = '';
          for (let i = 0; i < arr.byteLength; i++) {
            binary += String.fromCharCode(arr[i]);
          }
          return window.btoa(binary);
        };
        let sourcePdf:`;

if (content.includes(target) && !content.includes('const toBase64 =')) {
    content = content.replace(target, fix);
    fs.writeFileSync('src/app/dashboard/persuratan/permohonan/page.tsx', content);
    console.log("Added toBase64 definition back");
} else {
    console.log("Could not find target or toBase64 already exists");
}

