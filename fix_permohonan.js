const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/persuratan/permohonan/page.tsx', 'utf-8');

// 1. Add selectedPeriodFilter if not present
if (!content.includes('const [selectedPeriodFilter, setSelectedPeriodFilter]')) {
    const stateTarget = `const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('SEMUA');`;
    content = content.replace(stateTarget, stateTarget + '\n    const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>(\'SEMUA\');');
}

// 2. Add availablePeriods if not present
if (!content.includes('const availablePeriods = useMemo')) {
    const deptTarget = `const availableDepartments = useMemo(() => {`;
    const availablePeriods = `
    const availablePeriods = useMemo(() => {
      const periods = new Set<string>();
      verifiedGroups.forEach(g => {
        if (g.periodName) periods.add(g.periodName);
      });
      return Array.from(periods).sort();
    }, [verifiedGroups]);
    `;
    content = content.replace(deptTarget, availablePeriods + '\n  ' + deptTarget);
}

// 3. Update filteredGroups
const filterBlockStart = `const matchDept = selectedDepartmentFilter === 'SEMUA' || groupDept.toLowerCase() === selectedDepartmentFilter.toLowerCase();`;
if (!content.includes('const matchPeriodFilter = selectedPeriodFilter ===')) {
    const newFilter = `const matchDept = selectedDepartmentFilter === 'SEMUA' || groupDept.toLowerCase() === selectedDepartmentFilter.toLowerCase();
        const matchPeriodFilter = selectedPeriodFilter === 'SEMUA' || (g.periodName && g.periodName.toLowerCase() === selectedPeriodFilter.toLowerCase());`;
    content = content.replace(filterBlockStart, newFilter);
}

// Update return of filter function
const returnTarget = `return (
            name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
            className.toLowerCase().includes(searchTerm.toLowerCase()) ||
            teacherName.toLowerCase().includes(searchTerm.toLowerCase())
          );
        });

        return (matchInd || matchPeriod || matchSurat || matchStudent) && matchDept && matchStatus;`;

const newReturn = `return (
            name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
            className.toLowerCase().includes(searchTerm.toLowerCase()) ||
            teacherName.toLowerCase().includes(searchTerm.toLowerCase())
          );
        });

        return (matchInd || matchPeriod || matchSurat || matchStudent) && matchDept && matchStatus && matchPeriodFilter;`;

if (content.includes(returnTarget)) {
    content = content.replace(returnTarget, newReturn);
}

// 4. Update UI
const uiTarget = `{/* FILTER JURUSAN DINAMIS */}
          <div className={\`lg:col-span-7 p-4 rounded-3xl border shadow-lg space-y-3 \${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }\`}>`;

if (!content.includes('FILTER PERIODE DINAMIS')) {
    const insertUI = `{/* FILTER PERIODE DINAMIS */}
          <div className={\`lg:col-span-12 p-4 rounded-3xl border shadow-lg space-y-3 \${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }\`}>
            <div className="flex items-center space-x-2 text-xs font-extrabold text-indigo-500">
              <Layers className="w-4 h-4" />
              <span>Filter Berdasarkan Periode Prakerin:</span>
            </div>
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedPeriodFilter('SEMUA')}
                className={\`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border \${
                  selectedPeriodFilter === 'SEMUA'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/30'
                    : theme === 'dark'
                    ? 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }\`}
              >
                SEMUA
              </button>
              {availablePeriods.map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setSelectedPeriodFilter(period)}
                  className={\`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border \${
                    selectedPeriodFilter === period
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/30'
                      : theme === 'dark'
                      ? 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }\`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          
          {/* FILTER JURUSAN DINAMIS */}
          <div className={\`lg:col-span-7 p-4 rounded-3xl border shadow-lg space-y-3 \${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }\`}>`;

    content = content.replace(uiTarget, insertUI);
}

fs.writeFileSync('src/app/dashboard/persuratan/permohonan/page.tsx', content);

