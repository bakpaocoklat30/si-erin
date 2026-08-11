// 📋 CHANGELOG:
// ✅ Perubahan: Memperbaiki logika reaktivitas state `handleToggleIndustry` dan inisialisasi `activeIndustries` agar centang industri langsung merespons dan berhasil disimpan.
// ✨ Fitur Baru: Robust Periodic Industry Toggle & Quota State Manager.
// 🎨 UI/UX Update: Area klik checklist industri diperluas ke seluruh box agar lebih mudah dicentang.
// 🔧 Bug Fix: Mengatasi kendala state industri aktif yang gagal dicentang/disimpan pada modal "Kelola Industri & Kuota".
// 🚀 Inovasi: Enterprise Resilient State Management Pipeline.

'client';
'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Calendar, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Building2,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

// Komponen Pop-up Kalender Interaktif Kustom
function CustomDatePicker({ value, onChange, placeholder }: { value: string; onChange: (dateStr: string) => void; placeholder: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }
    return new Date();
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const formatted = `${year}-${m}-${d}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const displayValue = value ? (() => {
    const p = value.split('-');
    if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
    return value;
  })() : '';

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-xl border text-sm outline-none cursor-pointer flex items-center justify-between bg-inherit border-inherit text-inherit font-mono"
      >
        <span>{displayValue || placeholder}</span>
        <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute z-[999999] mt-2 p-4 w-72 rounded-2xl shadow-2xl border bg-slate-900 border-slate-700 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              {monthNames[month]} {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-2">
            <span>Min</span>
            <span>Sen</span>
            <span>Sel</span>
            <span>Rabu</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: firstDayIndex }).map((_, index) => (
              <div key={`empty-${index}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const mStr = String(month + 1).padStart(2, '0');
              const dStr = String(day).padStart(2, '0');
              const fullDateStr = `${year}-${mStr}-${dStr}`;
              const isSelected = value === fullDateStr;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`py-2 rounded-xl font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PokjaPeriodsPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  const [periods, setPeriods] = useState<any[]>([]);
  const [industries, setIndustries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showManageIndustryModal, setShowManageIndustryModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    startDate: '',
    endDate: '',
    isActive: true,
    activeIndustries: [] as { industryId: string; quota: number; isUnlimited: boolean }[]
  });

  const [activePeriodForIndustry, setActivePeriodForIndustry] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/pokja/periods?t=${timestamp}`);
      const result = await res.json();

      if (res.ok && result.success) {
        setPeriods(result.data || []);
        setIndustries(result.industries || []);
      } else {
        setErrorMsg(result.error || 'Gagal memuat data periode.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, fetchData]);

  const handleToggleStatus = async (period: any) => {
    const nextStatus = !period.isActive;
    const confirmMsg = nextStatus 
      ? `Aktifkan periode "${period.name}"? Siswa akan dapat memilih industri pada periode ini.`
      : `Non-aktifkan periode "${period.name}"? Siswa tidak akan dapat melakukan pengajuan pada periode ini.`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/pokja/periods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: period.id,
          name: period.name,
          startDate: period.startDate ? period.startDate.split('T')[0] : '',
          endDate: period.endDate ? period.endDate.split('T')[0] : '',
          isActive: nextStatus,
          activeIndustries: period.activeIndustries || []
        })
      });
      const result = await res.json();

      if (res.ok && result.success) {
        setSuccessMsg(`Status periode "${period.name}" berhasil diubah!`);
        fetchData();
      } else {
        alert(result.error || 'Gagal mengubah status periode');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
    }
  };

  const handleToggleIndustry = (industryId: string) => {
    setActivePeriodForIndustry((prev: any) => {
      const currentActive = Array.isArray(prev.activeIndustries) ? [...prev.activeIndustries] : [];
      const existingIndex = currentActive.findIndex((item: any) => item.industryId === industryId);
      
      let updated;
      if (existingIndex >= 0) {
        updated = currentActive.filter((item: any) => item.industryId !== industryId);
      } else {
        updated = [...currentActive, { industryId, quota: 5, isUnlimited: false }];
      }
      return { ...prev, activeIndustries: updated };
    });
  };

  const handleQuotaChange = (industryId: string, quotaValue: number) => {
    setActivePeriodForIndustry((prev: any) => ({
      ...prev,
      activeIndustries: (prev.activeIndustries || []).map((item: any) => 
        item.industryId === industryId ? { ...item, quota: Math.max(1, quotaValue) } : item
      )
    }));
  };

  const handleUnlimitedToggle = (industryId: string) => {
    setActivePeriodForIndustry((prev: any) => ({
      ...prev,
      activeIndustries: (prev.activeIndustries || []).map((item: any) => 
        item.industryId === industryId ? { ...item, isUnlimited: !item.isUnlimited } : item
      )
    }));
  };

  const handleSavePeriodIndustries = async () => {
    setSubmitting(true);
    try {
      const payload = {
        id: activePeriodForIndustry.id,
        name: activePeriodForIndustry.name,
        startDate: activePeriodForIndustry.startDate ? activePeriodForIndustry.startDate.split('T')[0] : '',
        endDate: activePeriodForIndustry.endDate ? activePeriodForIndustry.endDate.split('T')[0] : '',
        isActive: activePeriodForIndustry.isActive,
        activeIndustries: activePeriodForIndustry.activeIndustries || []
      };

      const res = await fetch('/api/pokja/periods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (res.ok && result.success) {
        setSuccessMsg('Pengaturan industri & kuota berhasil disimpan permanen!');
        setShowManageIndustryModal(false);
        fetchData();
      } else {
        alert(result.error || 'Gagal menyimpan konfigurasi industri');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/pokja/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await res.json();

      if (res.ok && result.success) {
        setSuccessMsg(result.message);
        setShowAddModal(false);
        setFormData({ id: '', name: '', startDate: '', endDate: '', isActive: true, activeIndustries: [] });
        fetchData();
      } else {
        alert(result.error || 'Gagal menambah periode');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/pokja/periods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await res.json();

      if (res.ok && result.success) {
        setSuccessMsg(result.message);
        setShowEditModal(false);
        fetchData();
      } else {
        alert(result.error || 'Gagal memperbarui periode');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePeriod = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus periode "${name}"?`)) return;

    try {
      const res = await fetch(`/api/pokja/periods?id=${id}`, { method: 'DELETE' });
      const result = await res.json();

      if (res.ok && result.success) {
        setSuccessMsg(result.message);
        fetchData();
      } else {
        alert(result.error || 'Gagal menghapus periode');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
    }
  };

  const openEditModal = (p: any) => {
    setFormData({
      id: p.id,
      name: p.name,
      startDate: p.startDate ? p.startDate.split('T')[0] : '',
      endDate: p.endDate ? p.endDate.split('T')[0] : '',
      isActive: p.isActive,
      activeIndustries: p.activeIndustries || []
    });
    setShowEditModal(true);
  };

  const openManageIndustryModal = (p: any) => {
    setActivePeriodForIndustry({
      ...p,
      activeIndustries: Array.isArray(p.activeIndustries) ? [...p.activeIndustries] : []
    });
    setShowManageIndustryModal(true);
  };

  if (status === 'loading') return null;

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* HEADER BANNER */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Pengaturan Akademik
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Pengaturan Periode & Kuota Industri</h1>
          <p className="text-sm text-slate-400">Atur jadwal pelaksanaan Prakerin serta tentukan kuota penempatan per industri untuk setiap periode.</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormData({ id: '', name: '', startDate: '', endDate: '', isActive: true, activeIndustries: [] });
            setShowAddModal(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Periode Baru</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TABLE SECTION */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div>
          <h3 className="text-lg font-bold flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <span>Daftar Periode Prakerin ({periods.length})</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Gunakan toggle switch pada kolom status untuk mengaktifkan atau menonaktifkan periode secara instan.</p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400">Memuat data periode...</div>
        ) : periods.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">Belum ada periode PKL terdaftar. Silakan tambahkan baru.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={`text-xs uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-950/50 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-500 border-b border-slate-200'}`}>
                <tr>
                  <th className="p-4">Nama Periode</th>
                  <th className="p-4">Tanggal Mulai</th>
                  <th className="p-4">Tanggal Selesai</th>
                  <th className="p-4 text-center">Industri Aktif & Kuota</th>
                  <th className="p-4 text-center">Status (Toggle On/Off)</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30 text-xs">
                {periods.map((p: any) => (
                  <tr key={p.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                    <td className="p-4 font-bold text-sm">{p.name}</td>
                    <td className="p-4 font-mono text-slate-300">{p.startDate ? p.startDate.split('T')[0] : '-'}</td>
                    <td className="p-4 font-mono text-slate-300">{p.endDate ? p.endDate.split('T')[0] : '-'}</td>
                    <td className="p-4 text-center">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {p.activeIndustries?.length || 0} Industri Terkonfigurasi
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {/* TOGGLE SWITCH ON/OFF */}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(p)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          p.isActive ? 'bg-emerald-600' : 'bg-slate-700'
                        }`}
                        title="Klik untuk mengubah status aktif / non-aktif"
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            p.isActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <div className="mt-1">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                          p.isActive ? 'text-emerald-500' : 'text-slate-400'
                        }`}>
                          {p.isActive ? 'Aktif' : 'Non-Aktif'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-400 font-bold transition-all inline-flex items-center space-x-1 cursor-pointer"
                        title="Edit Nama & Tanggal Periode"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openManageIndustryModal(p)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-400 font-bold transition-all inline-flex items-center space-x-1 cursor-pointer"
                        title="Atur Industri Aktif & Kuota"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Kelola Industri</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePeriod(p.id, p.name)}
                        className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 font-bold transition-all inline-flex items-center space-x-1 cursor-pointer"
                        title="Hapus Periode"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL KELOLA INDUSTRI & KUOTA (DEDICATED) */}
      {showManageIndustryModal && activePeriodForIndustry && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center border-b pb-4 border-inherit">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Konfigurasi Penempatan</span>
                <h3 className="text-base font-extrabold">Kelola Industri & Kuota — {activePeriodForIndustry.name}</h3>
              </div>
              <button onClick={() => setShowManageIndustryModal(false)} className="text-slate-400 hover:text-red-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-400">Klik pada kotak industri untuk mengaktifkannya pada periode ini, tentukan kapasitas kuotanya, atau centang pilihan tanpa kuota (bebas).</p>
              
              <div className={`p-4 rounded-2xl border max-h-72 overflow-y-auto space-y-3 ${
                theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                {industries.length === 0 ? (
                  <p className="text-slate-400 italic">Belum ada industri mitra terdaftar. Silakan tambahkan di menu Kelola Industri Mitra.</p>
                ) : (
                  industries.map((ind: any) => {
                    const activeItem = (activePeriodForIndustry.activeIndustries || []).find((item: any) => item.industryId === ind.id);
                    const isSelected = !!activeItem;

                    return (
                      <div 
                        key={ind.id} 
                        onClick={() => handleToggleIndustry(ind.id)}
                        className={`p-3 rounded-2xl border transition-all space-y-2 cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-600/10 border-indigo-500/40 text-white shadow-md' 
                            : 'border-slate-800/40 opacity-70 hover:opacity-100 hover:bg-slate-800/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center space-x-2 font-bold text-sm">
                            <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span>{ind.name}</span>
                          </span>
                          {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-500" /> : <Square className="w-4 h-4 text-slate-500" />}
                        </div>

                        {isSelected && (
                          <div 
                            className="flex items-center justify-between pt-2 border-t border-indigo-500/20 text-[11px] gap-4"
                            onClick={(e) => e.stopPropagation()} // Mencegah toggle utama ter-trigger saat klik input kuota
                          >
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-slate-400">Kapasitas Kuota:</span>
                              <input
                                type="number"
                                min={1}
                                disabled={activeItem.isUnlimited}
                                value={activeItem.quota}
                                onChange={(e) => handleQuotaChange(ind.id, Number(e.target.value))}
                                className={`w-20 px-3 py-1 rounded-xl border text-xs font-bold outline-none ${
                                  activeItem.isUnlimited ? 'opacity-40 cursor-not-allowed bg-slate-800' : ''
                                } ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                              />
                            </div>

                            <div className="flex items-center space-x-1.5 cursor-pointer" onClick={() => handleUnlimitedToggle(ind.id)}>
                              <input
                                type="checkbox"
                                checked={activeItem.isUnlimited}
                                onChange={() => {}}
                                className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                              />
                              <span className="font-semibold text-slate-300">Tanpa Kuota / Bebas</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-inherit flex space-x-3">
              <button
                type="button"
                onClick={() => setShowManageIndustryModal(false)}
                className={`flex-1 py-3 rounded-xl font-bold border cursor-pointer ${
                  theme === 'dark' ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePeriodIndustries}
                disabled={submitting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Pengaturan Industri'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PERIODE */}
      {showAddModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-lg border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center border-b pb-4 border-inherit">
              <h3 className="text-base font-bold flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                <span>Tambah Periode PKL Baru</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-red-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPeriod} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Nama Periode</label>
                <input
                  type="text"
                  required
                  placeholder="Cth: Periode Genap 2026/2027"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Tanggal Mulai (Pop-up)</label>
                  <CustomDatePicker
                    value={formData.startDate}
                    onChange={(dateStr) => setFormData({ ...formData, startDate: dateStr })}
                    placeholder="Pilih Tanggal Mulai"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Tanggal Selesai (Pop-up)</label>
                  <CustomDatePicker
                    value={formData.endDate}
                    onChange={(dateStr) => setFormData({ ...formData, endDate: dateStr })}
                    placeholder="Pilih Tanggal Selesai"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveAdd"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="isActiveAdd" className="font-semibold text-slate-300 cursor-pointer">Set sebagai Periode Aktif</label>
              </div>

              <div className="pt-4 border-t border-inherit flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`flex-1 py-3 rounded-xl font-bold border cursor-pointer ${
                    theme === 'dark' ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Periode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT PERIODE (NAMA & TANGGAL) */}
      {showEditModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-lg border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center border-b pb-4 border-inherit">
              <h3 className="text-base font-bold flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-indigo-500" />
                <span>Edit Periode Prakerin</span>
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-red-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePeriod} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Nama Periode</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Tanggal Mulai (Pop-up)</label>
                  <CustomDatePicker
                    value={formData.startDate}
                    onChange={(dateStr) => setFormData({ ...formData, startDate: dateStr })}
                    placeholder="Pilih Tanggal Mulai"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Tanggal Selesai (Pop-up)</label>
                  <CustomDatePicker
                    value={formData.endDate}
                    onChange={(dateStr) => setFormData({ ...formData, endDate: dateStr })}
                    placeholder="Pilih Tanggal Selesai"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveEdit"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="isActiveEdit" className="font-semibold text-slate-300 cursor-pointer">Set sebagai Periode Aktif</label>
              </div>

              <div className="pt-4 border-t border-inherit flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className={`flex-1 py-3 rounded-xl font-bold border cursor-pointer ${
                    theme === 'dark' ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}