const AdmZip = require('adm-zip');
const fs = require('fs');
const { generateMergedSuratIzinKegiatanDocx } = require('./src/lib/docx-events-generator');

async function run() {
  const letters = [{ industry: { name: 'Ind1', address: 'Addr1' }, students: [] }, { industry: { name: 'Ind2', address: 'Addr2' }, students: [] }];
  const event = { name: 'Event', startDate: new Date(), endDate: new Date() };
  const school = { headmasterName: 'Head', headmasterNip: '123', city: 'City' };

  try {
    const buffer = await generateMergedSuratIzinKegiatanDocx(event, school, letters, { useTteTags: true });
    fs.writeFileSync('test_merged.docx', buffer);
    console.log('done');
  } catch (err) {
    console.error(err);
  }
}
run();

