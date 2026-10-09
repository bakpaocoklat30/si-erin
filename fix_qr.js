const fs = require('fs');
const filePath = 'src/lib/docx-events-generator.ts';
let content = fs.readFileSync(filePath, 'utf8');

// The block to remove starts with: `// Inject TTE QR code`
// and ends with `} catch (e) {` ... `}`
const regex = /\/\/ Inject TTE QR code[\s\S]*?catch \(e\) \{[\s\S]*?\}[\s\S]*?\}/g;

content = content.replace(regex, '');
fs.writeFileSync(filePath, content);
console.log('Removed QR injection');

