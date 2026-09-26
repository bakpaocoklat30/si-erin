'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/app/theme-provider';
import { Truck, Printer, Search, Loader2, Users, Building2, Calendar, FileText } from 'lucide-react';

export default function SuratPenerjunanPage() {
  const { data: session } = useSession();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAcceptedGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pokja/groups?department=Semua Jurusan');
      const json = await res.json();
      if (json.success) {
        // Filter out groups that do not have accepted students
        const acceptedStatuses = ['DITERIMA', 'DISETUJUI_INDUSTRI', 'DITERIMA_INDUSTRI', 'COMPLETED'];
        const acceptedGroups = json.data.filter((group: any) => 
          group.students.some((s: any) => acceptedStatuses.includes(s.status))
        ).map((group: any) => {
          // Keep only accepted students in that group
          return {
            ...group,
            students: group.students.filter((s: any) => acceptedStatuses.includes(s.status))
          };
        });
        setGroups(acceptedGroups);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcceptedGroups();
  }, []);

  const filteredGroups = groups.filter(g => 
    g.industryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.departmentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Surat Penerjunan</h1>
            <p className="text-sm font-medium text-slate-500">Cetak surat tugas penerjunan (pengantaran) siswa ke industri.</p>
          </div>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Cari industri / jurusan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2.5 rounded-xl border outline-none text-sm font-semibold w-full md:w-64 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-emerald-500 transition-colors"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-400 mt-4">Memuat data kelompok...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">Belum ada kelompok PKL yang disetujui industri.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGroups.map((group, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-500" />
                      {group.industryName}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-1">
                      <Users className="w-3 h-3" /> {group.departmentName}
                    </p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-xs font-black px-2.5 py-1 rounded-full">
                    {group.students.length} Siswa
                  </span>
                </div>

                <div className="mb-4 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> 
                    Jadwal: {group.startDate ? new Date(group.startDate).toLocaleDateString('id-ID') : '-'} s.d. {group.endDate ? new Date(group.endDate).toLocaleDateString('id-ID') : '-'}
                  </p>
                  <ul className="text-[11px] font-semibold text-slate-500 space-y-1 pl-5 list-disc">
                    {group.students.slice(0, 3).map((s: any) => (
                      <li key={s.id}>{s.name}</li>
                    ))}
                    {group.students.length > 3 && (
                      <li className="list-none text-emerald-500 mt-1">+ {group.students.length - 3} siswa lainnya</li>
                    )}
                  </ul>
                </div>

                <button
                  onClick={() => {
                    const printUrl = `/cetak/penerjunan?industryId=${group.industryId}&department=${encodeURIComponent(group.departmentName)}&periodId=${group.periodId}`;
                    window.open(printUrl, '_blank');
                  }}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm flex justify-center items-center gap-2 shadow-sm shadow-emerald-500/20 transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Surat Penerjunan
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
