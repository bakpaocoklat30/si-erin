const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/persuratan/permohonan/page.tsx', 'utf-8');

const targetReturn = 'return matchDept && matchStatus && (matchInd || matchPeriod || matchSurat || matchStudent);';
const fixedReturn = 'return matchDept && matchStatus && matchPeriodFilter && (matchInd || matchPeriod || matchSurat || matchStudent);';

if (content.includes(targetReturn)) {
    content = content.replace(targetReturn, fixedReturn);
    
    // Also we need to make sure matchPeriodFilter is added to the useMemo dependencies
    const depsTarget = '}, [verifiedGroups, searchTerm, selectedDepartmentFilter, letterStatusFilter]);';
    const depsFixed = '}, [verifiedGroups, searchTerm, selectedDepartmentFilter, selectedPeriodFilter, letterStatusFilter]);';
    if (content.includes(depsTarget)) {
        content = content.replace(depsTarget, depsFixed);
    }
    
    fs.writeFileSync('src/app/dashboard/persuratan/permohonan/page.tsx', content);
    console.log("Fixed filter logic");
} else {
    console.log("Could not find the target return statement");
}

