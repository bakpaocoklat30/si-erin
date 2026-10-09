const fs = require('fs');

let content = fs.readFileSync('src/app/dashboard/persuratan/permohonan/page.tsx', 'utf-8');

// 3. Add UI buttons
if (!content.includes('Filter Berdasarkan Periode')) {
  const insertUI = `          </div>

          <div className={\`mt-4 p-4 rounded-xl border flex flex-col space-y-3 shadow-inner \${
            theme === 'dark' ? 'bg-slate-900/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
          }\`}>
            <div className="flex items-center space-x-2 text-xs font-extrabold text-indigo-500">
              <Layers className="w-4 h-4" />
              <span>Filter Berdasarkan Periode (Dinamis dari Data):</span>
            </div>
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedPeriodFilter('SEMUA')}
                className={\`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap \${
                  selectedPeriodFilter === 'SEMUA'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }\`}
              >
                Semua
              </button>
              {availablePeriods.map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriodFilter(period)}
                  className={\`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap \${
                    selectedPeriodFilter === period
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }\`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
`;
  
  const fallbackTarget = `<div className={\`mt-4 p-4 rounded-xl border flex flex-col space-y-3 shadow-inner \${
            theme === 'dark' ? 'bg-slate-900/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
          }\`}>
            <div className="flex items-center space-x-2 text-xs font-extrabold text-indigo-500">
              <Layers className="w-4 h-4" />
              <span>Filter Berdasarkan Jurusan (Disinkronkan dari Database):</span>`;
  
  if (content.includes(fallbackTarget)) {
       content = content.replace(fallbackTarget, insertUI + '\n          ' + fallbackTarget);
  } else {
       console.log("Could not find fallback target either");
  }
}

fs.writeFileSync('src/app/dashboard/persuratan/permohonan/page.tsx', content);

