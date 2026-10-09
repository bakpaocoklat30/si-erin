const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/persuratan/permohonan/page.tsx', 'utf-8');

// Replace groups.forEach with verifiedGroups.forEach in availablePeriods
if (content.includes('groups.forEach(g => {') && content.includes('if (g.periodName) periods.add(g.periodName);')) {
    content = content.replace('groups.forEach(g => {', 'verifiedGroups.forEach(g => {');
    content = content.replace('}, [groups]);', '}, [verifiedGroups]);');
    fs.writeFileSync('src/app/dashboard/persuratan/permohonan/page.tsx', content);
    console.log("Fixed groups variable in availablePeriods");
}

