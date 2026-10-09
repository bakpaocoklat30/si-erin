const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/persuratan/permohonan/page.tsx', 'utf-8');

const oldBlock = `           const toBase64 = (arr: Uint8Array) => {
              let binary = '';
              for (let i = 0; i < arr.byteLength; i++) {
                binary += String.fromCharCode(arr[i]);
              }
              return window.btoa(binary);
            };`;

const newBlock = ``;

if (content.includes(oldBlock)) {
    content = content.replace(oldBlock, '');
    
    // Add it above the if (pdfPageCount > 1) block
    const target = `        if (pdfPageCount > 1) {`;
    const toBase64Global = `        const toBase64 = (arr: Uint8Array) => {
          let binary = '';
          for (let i = 0; i < arr.byteLength; i++) {
            binary += String.fromCharCode(arr[i]);
          }
          return window.btoa(binary);
        };
        if (pdfPageCount > 1) {`;
        
    content = content.replace(target, toBase64Global);
    fs.writeFileSync('src/app/dashboard/persuratan/permohonan/page.tsx', content);
    console.log("Fixed toBase64 scope");
}

