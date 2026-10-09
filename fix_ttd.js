const fs = require('fs');
const filePath = 'src/lib/docx-events-generator.ts';
let content = fs.readFileSync(filePath, 'utf8');

const tteBlockStart = content.indexOf('const tteSignatureBlock = useTte ? `');
const tteBlockEnd = content.indexOf('    `;', tteBlockStart) + '    `;'.length;

const newBlock = `const tteSignatureBlock = useTte ? \`
      <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>\\\${jabatan_pengirim}</w:t></w:r></w:p>
      <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
      <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
      <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
      <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>\\\${ttd_pengirim}</w:t></w:r></w:p>
      <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
      <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
      <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
      <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>\\\${nama_pengirim}</w:t></w:r></w:p>
      <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Pembina Utama Muda. IV/c</w:t></w:r></w:p>
      <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>NIP \\\${nip_pengirim}</w:t></w:r></w:p>
    \` : \`
      <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Kepala Sekolah</w:t></w:r></w:p>
      <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
      <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
      <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
      <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
      <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
      <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
      <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:b/></w:rPr><w:t>\${escapeXml(school?.headmasterName || 'Joko Pramono, S.Pd., M.Ds')}</w:t></w:r></w:p>
      <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Pembina Utama Muda. IV/c</w:t></w:r></w:p>
      <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>NIP \${escapeXml(school?.headmasterNip || '19690316 199802 1 004')}</w:t></w:r></w:p>
    \`;`;

if (tteBlockStart !== -1) {
  content = content.substring(0, tteBlockStart) + newBlock + content.substring(tteBlockEnd);
  fs.writeFileSync(filePath, content);
  console.log('Replaced');
} else {
  console.log('Not found');
}

