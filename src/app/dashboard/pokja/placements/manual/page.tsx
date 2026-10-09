'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Users, Search, Building2, CheckCircle2, ChevronLeft, Save, Plus, Trash2, Calendar, FileText, X, CheckSquare } from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';

export default function ManualPlacementPage() {
  const { status } = useSession();
  const { theme } = useTheme();

  const [industries, setIndustries] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Create Group
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [formInd, setFormInd] = useState('');
  const [searchIndTerm, setSearchIndTerm] = useState('');
  const [showIndDropdown, setShowIndDropdown] = useState(false);
  const [formPeriod, setFormPeriod] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Selected Group State
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [groupStudents, setGroupStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Form Add Student to Group
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [addingStudents, setAddingStudents] = useState(false);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/pokja/placement-groups');
      const data = await res.json();
      if(data.success) setGroups(data.data);
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/pokja/industries').then(res => res.json()),
      fetch('/api/pokja/periods').then(res => res.json()),
      fetch('/api/pokja/students').then(res => res.json())
    ])
    .then(([indRes, perRes, stuRes]) => {
      if (indRes.success) setIndustries(indRes.data);
      if (perRes.success) setPeriods(perRes.data);
      if (stuRes.success) setAllStudents(stuRes.data);
      fetchGroups();
    })
    .catch(err => {
      console.error(err);
      setErrorMsg('Gagal memuat data awal.');
    })
    .finally(() => setLoading(false));
  }, []);

  const handlePeriodChange = (pid: string) => {
    setFormPeriod(pid);
    const p = periods.find(x => x.id === pid);
    if(p) {
      if(p.startDate) setFormStart(p.startDate.split('T')[0]);
      if(p.endDate) setFormEnd(p.endDate.split('T')[0]);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingGroup(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/pokja/placement-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industryId: formInd,
          periodId: formPeriod,
          startDate: formStart || null,
          endDate: formEnd || null,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
      
      setSuccessMsg('Kelompok berhasil dibuat!');
      setShowGroupForm(false);
      setFormInd(''); setFormPeriod(''); setFormStart(''); setFormEnd(''); setSearchIndTerm('');
      fetchGroups();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if(!confirm('Yakin hapus kelompok ini? Semua siswa di dalamnya akan di-reset penempatannya.')) return;
    try {
      await fetch(`/api/pokja/placement-groups/${id}`, { method: 'DELETE' });
      if(selectedGroup?.id === id) setSelectedGroup(null);
      fetchGroups();
    } catch(e) {
      console.error(e);
    }
  };

  const loadGroupStudents = async (g: any) => {
    setSelectedGroup(g);
    setLoadingStudents(true);
    setShowAddStudentForm(false);
    setSelectedStudentIds([]);
    try {
      const res = await fetch(`/api/pokja/placement-groups/${g.id}/students`);
      const data = await res.json();
      if(data.success) setGroupStudents(data.data);
    } catch(e) {
      console.error(e);
    } finally {
      setLoadingStudents(false);
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const handleAddStudents = async () => {
    if (selectedStudentIds.length === 0) return;
    setAddingStudents(true);
    try {
      const res = await fetch(`/api/pokja/placement-groups/${selectedGroup.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedStudentIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
      
      setSuccessMsg('Siswa berhasil ditambahkan ke kelompok.');
      setShowAddStudentForm(false);
      setSelectedStudentIds([]);
      loadGroupStudents(selectedGroup);
      fetchGroups(); // refresh counts
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setAddingStudents(false);
    }
  };

  const handleRemoveStudent = async (placementId: string) => {
    if(!confirm('Hapus siswa dari kelompok ini?')) return;
    try {
      await fetch(`/api/pokja/placement-groups/${selectedGroup.id}/students?placementId=${placementId}`, { method: 'DELETE' });
      loadGroupStudents(selectedGroup);
      fetchGroups();
    } catch(e) {
      console.error(e);
    }
  };

  const filteredAllStudents = allStudents.filter(s => 
    !groupStudents.find(gs => gs.id === s.id) &&
    (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.nis && s.nis.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-6 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/dashboard/pokja" className="inline-flex items-center text-sm text-indigo-500 hover:text-indigo-600 mb-2">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Kembali ke Dashboard
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-500" />
            Penempatan Manual PKL
          </h1>
          <p className={`mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Buat kelompok terlebih dahulu, lalu tambahkan siswa secara manual ke dalam kelompok.
          </p>
        </div>
        <button
          onClick={() => setShowGroupForm(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md shadow-indigo-200 dark:shadow-none"
        >
          <Plus className="w-5 h-5" />
          Buat Kelompok Baru
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-100 text-red-700 border border-red-200 rounded-xl flex items-center gap-3">
          <span className="font-semibold">Error:</span> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-semibold">Sukses:</span> {successMsg}
          <button onClick={() => setSuccessMsg('')} className="ml-auto"><X className="w-4 h-4"/></button>
        </div>
      )}

      {showGroupForm && (
        <div className={`p-6 rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2"><Building2 className="w-5 h-5 text-indigo-500"/> Form Buat Kelompok</h2>
            <button onClick={() => setShowGroupForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
          </div>
          <form onSubmit={handleCreateGroup} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium mb-1">Industri</label>
              <div 
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between cursor-text ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                onClick={() => setShowIndDropdown(true)}
              >
                <input 
                  type="text" 
                  required={!formInd}
                  placeholder={formInd ? industries.find(i => i.id === formInd)?.name : "-- Cari Industri --"} 
                  value={searchIndTerm}
                  onChange={(e) => {
                    setSearchIndTerm(e.target.value);
                    setShowIndDropdown(true);
                  }}
                  onFocus={() => setShowIndDropdown(true)}
                  className="bg-transparent outline-none w-full"
                />
                <ChevronLeft className={`w-4 h-4 transition-transform ${showIndDropdown ? '-rotate-90' : '-rotate-180'}`} />
              </div>
              
              {showIndDropdown && (
                <div className={`absolute z-20 mt-1 w-full max-h-48 overflow-y-auto border rounded-xl shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  {industries.filter(i => i.name.toLowerCase().includes(searchIndTerm.toLowerCase())).map(ind => (
                    <div 
                      key={ind.id} 
                      className={`px-4 py-2 cursor-pointer ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} ${formInd === ind.id ? 'font-bold text-indigo-500' : ''}`}
                      onClick={() => {
                        setFormInd(ind.id);
                        setSearchIndTerm(ind.name);
                        setShowIndDropdown(false);
                      }}
                    >
                      {ind.name}
                    </div>
                  ))}
                  {industries.filter(i => i.name.toLowerCase().includes(searchIndTerm.toLowerCase())).length === 0 && (
                    <div className="px-4 py-2 text-slate-500 text-sm">Tidak ditemukan</div>
                  )}
                </div>
              )}
              {/* Optional backdrop to close dropdown when clicking outside */}
              {showIndDropdown && (
                <div className="fixed inset-0 z-10" onClick={() => setShowIndDropdown(false)}></div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Periode</label>
              <select required value={formPeriod} onChange={e => handlePeriodChange(e.target.value)} className={`w-full p-2.5 rounded-xl border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}>
                <option value="">-- Pilih Periode --</option>
                {periods.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.department || 'Semua Jurusan'} | {p.activeIndustries?.length || 0} Industri)
                  </option>
                ))}
              </select>
              {formPeriod && (
                <p className="text-xs text-slate-500 mt-1">
                  Detail: {periods.find(p => p.id === formPeriod)?.department || 'Semua Jurusan'} | {periods.find(p => p.id === formPeriod)?.activeIndustries?.length || 0} Industri
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tgl Mulai</label>
              <input type="date" value={formStart} onChange={e => setFormStart(e.target.value)} className={`w-full p-2.5 rounded-xl border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tgl Selesai</label>
              <input type="date" value={formEnd} onChange={e => setFormEnd(e.target.value)} className={`w-full p-2.5 rounded-xl border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
            </div>
            <div className="lg:col-span-4 flex justify-end">
              <button type="submit" disabled={creatingGroup} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-medium disabled:opacity-70">
                {creatingGroup ? 'Menyimpan...' : 'Simpan Kelompok'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kiri: Daftar Kelompok */}
        <div className={`p-5 rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} lg:col-span-1`}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-500" /> Daftar Kelompok</h2>
          <div className="space-y-3">
            {groups.length === 0 ? (
              <p className="text-slate-500 text-center py-6">Belum ada kelompok. Buat baru di atas.</p>
            ) : groups.map(g => (
              <div key={g.id} onClick={() => loadGroupStudents(g)} className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedGroup?.id === g.id 
                  ? (theme === 'dark' ? 'border-indigo-500 bg-indigo-900/30' : 'border-indigo-500 bg-indigo-50') 
                  : (theme === 'dark' ? 'border-slate-800 hover:border-slate-700' : 'border-slate-200 hover:border-slate-300')
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-sm line-clamp-1">{g.industry?.name}</h3>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(g.id); }} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4"/></button>
                </div>
                <p className={`text-xs flex items-center gap-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}><Calendar className="w-3 h-3"/> {g.period?.name}</p>
                <div className="mt-3 flex justify-between items-center text-xs">
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{g.studentCount || 0} Siswa</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kanan: Detail Kelompok & Tambah Siswa */}
        <div className={`lg:col-span-2 p-5 rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          {!selectedGroup ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-20">
              <Users className="w-16 h-16 mb-4 opacity-20" />
              <p>Pilih kelompok di sebelah kiri untuk mengelola siswa</p>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-500" />
                    {selectedGroup.industry?.name}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Periode: {selectedGroup.period?.name} | {groupStudents.length} Siswa</p>
                </div>
                <button
                  onClick={() => setShowAddStudentForm(!showAddStudentForm)}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2"
                >
                  {showAddStudentForm ? <X className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                  {showAddStudentForm ? 'Tutup' : 'Tambah Siswa'}
                </button>
              </div>

              {showAddStudentForm && (
                <div className={`mb-6 p-4 rounded-xl border ${theme === 'dark' ? 'border-indigo-900/50 bg-indigo-900/10' : 'border-indigo-100 bg-indigo-50/50'}`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                    <h3 className="font-bold">Pilih Siswa ({selectedStudentIds.length} terpilih)</h3>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" placeholder="Cari nama/NIS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto border rounded-xl mb-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 shadow-sm">
                        <tr>
                          <th className="px-4 py-2 w-10 text-center"><CheckSquare className="w-4 h-4 mx-auto"/></th>
                          <th className="px-4 py-2">Nama</th>
                          <th className="px-4 py-2">Kelas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredAllStudents.map(s => (
                          <tr key={s.id} onClick={() => toggleStudent(s.id)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                            <td className="px-4 py-2 text-center">
                              <input type="checkbox" checked={selectedStudentIds.includes(s.id)} readOnly className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                            </td>
                            <td className="px-4 py-2 font-medium">{s.name} <br/><span className="text-xs text-slate-500">{s.nis}</span></td>
                            <td className="px-4 py-2">{s.className || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button onClick={handleAddStudents} disabled={addingStudents || selectedStudentIds.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl font-medium disabled:opacity-70">
                    {addingStudents ? 'Menyimpan...' : `Simpan ${selectedStudentIds.length} Siswa ke Kelompok`}
                  </button>
                </div>
              )}

              <div className="mt-4">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-3">Daftar Siswa di Kelompok Ini</h3>
                {loadingStudents ? (
                  <p className="text-slate-500">Memuat siswa...</p>
                ) : groupStudents.length === 0 ? (
                  <p className="text-slate-500 text-sm">Belum ada siswa di kelompok ini.</p>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                          <th className="px-4 py-3">Nama Siswa</th>
                          <th className="px-4 py-3">NIS</th>
                          <th className="px-4 py-3">Kelas</th>
                          <th className="px-4 py-3 w-20 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {groupStudents.map(s => (
                          <tr key={s.id}>
                            <td className="px-4 py-3 font-medium">{s.name}</td>
                            <td className="px-4 py-3 text-slate-500">{s.nis || '-'}</td>
                            <td className="px-4 py-3">
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {s.className || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={() => handleRemoveStudent(s.placementId)} className="text-red-500 hover:text-red-700 p-1 bg-red-50 dark:bg-red-900/20 rounded-lg" title="Hapus dari Kelompok">
                                <Trash2 className="w-4 h-4"/>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
