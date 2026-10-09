const AdmZip = require('adm-zip');
const fs = require('fs');

const templatePath = 'template/Surat Tugas Monitoring PKL.docx';
const zip = new AdmZip(templatePath);
const baseXml = zip.readAsText('word/document.xml');

console.log(baseXml.substring(baseXml.lastIndexOf('<w:body>'), baseXml.length));

