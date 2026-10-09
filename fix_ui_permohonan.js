const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/persuratan/permohonan/page.tsx', 'utf-8');

// 4. Update UI
const uiIndex = content.indexOf('{/* FILTER JURUSAN DINAMIS */}');

if (uiIndex !== -1 && !content.includes('FILTER PERIODE DINAMIS')) {
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

        `;

    content = content.slice(0, uiIndex) + insertUI + content.slice(uiIndex);
    fs.writeFileSync('src/app/dashboard/persuratan/permohonan/page.tsx', content);
}

