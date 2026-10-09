const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/persuratan/permohonan/page.tsx', 'utf-8');

const target = `setVerifiedGroups(json.data && json.data.length > 0 ? json.data : FALLBACK_GROUPS);`;
const fix = `
          // EXCLUDE MANUAL GROUPS (manual assignments like "tempatkan paksa" don't need Surat Permohonan)
          // Dynamic groups have '___' in their groupId/groupKey. Manual groups have 'group_man_...' or CUID.
          let validGroups = json.data || [];
          if (Array.isArray(validGroups)) {
             validGroups = validGroups.filter((g: any) => g.groupId && g.groupId.includes('___'));
          }
          setVerifiedGroups(json.data && json.data.length > 0 ? (validGroups.length > 0 ? validGroups : []) : FALLBACK_GROUPS);`;

if (content.includes(target)) {
    content = content.replace(target, fix);
    fs.writeFileSync('src/app/dashboard/persuratan/permohonan/page.tsx', content);
    console.log("Filtered out manual groups from Permohonan page");
} else {
    console.log("Could not find target");
}

