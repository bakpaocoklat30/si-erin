const fs = require('fs');

let content = fs.readFileSync('src/app/dashboard/persuratan/permohonan/page.tsx', 'utf-8');

// 1. Add availablePeriods
if (!content.includes('const availablePeriods = useMemo(() => {')) {
  const depIndex = content.indexOf('const availableDepartments = useMemo(() => {');
  if (depIndex !== -1) {
    const insertText = `
  const availablePeriods = useMemo(() => {
    const periods = new Set<string>();
    groups.forEach(g => {
      if (g.periodName) periods.add(g.periodName);
    });
    return Array.from(periods).sort();
  }, [groups]);
`;
    content = content.slice(0, depIndex) + insertText + '\n  ' + content.slice(depIndex);
  }
}

// 2. Update filteredGroups
const filteredGroupsOld = `      const matchesDepartment = selectedDepartmentFilter === 'SEMUA' || g.departmentName === selectedDepartmentFilter;`;
const filteredGroupsNew = `      const matchesDepartment = selectedDepartmentFilter === 'SEMUA' || g.departmentName === selectedDepartmentFilter;
      const matchesPeriod = selectedPeriodFilter === 'SEMUA' || g.periodName === selectedPeriodFilter;`;

if (!content.includes('const matchesPeriod = selectedPeriodFilter')) {
  content = content.replace(filteredGroupsOld, filteredGroupsNew);
}

const filteredGroupsReturnOld = `return matchesSearch && matchesStatus && matchesDepartment;`;
const filteredGroupsReturnNew = `return matchesSearch && matchesStatus && matchesDepartment && matchesPeriod;`;

if (!content.includes(filteredGroupsReturnNew)) {
  content = content.replace(filteredGroupsReturnOld, filteredGroupsReturnNew);
}

// 3. Add UI buttons
if (!content.includes('Filter Berdasarkan Periode')) {
  const insertUI = `            {/* Periode Filter */}
            {availablePeriods.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Filter Berdasarkan Periode
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedPeriodFilter('SEMUA')}
                    className={\`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border \${
                      selectedPeriodFilter === 'SEMUA'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }\`}
                  >
                    SEMUA
                  </button>
                  {availablePeriods.map(period => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriodFilter(period)}
                      className={\`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border \${
                        selectedPeriodFilter === period
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }\`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
`;
  
  const fallbackTarget = `<div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Filter Berdasarkan Jurusan
                </span>`;
  
  if (content.includes(fallbackTarget)) {
       content = content.replace(fallbackTarget, insertUI + fallbackTarget);
  }
}

fs.writeFileSync('src/app/dashboard/persuratan/permohonan/page.tsx', content);

