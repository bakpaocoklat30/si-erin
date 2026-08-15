// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Pengimplementasian Defensive Safe Object Parser (`formatSafeString`) di seluruh elemen JSX (Tabel, Option Select, Modal Form, dan Sub-components).
// ✨ Fitur Baru: Safe Primitive Converter Engine untuk Relasi Prisma Object `AcademicYear`, `Period`, & `Department`.
// 🎨 UI/UX Update: Glassmorphic Admin Master Layout, Live Calculator, & Toast Notifications.
// 🔧 Bug Fix: 100% Membasmi runtime error "Objects are not valid as a React child (found: object with keys {id, year, isActive, createdAt, updatedAt})".
// 🚀 Inovasi: Zero-Crash Defensive Child Parser for Next.js App Router.
// ----------------------------------------------------------------------

'use client';

import { useState, useEffect } from 'react';
import { 
  Calculator, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  ArrowLeft,
  X,
  Loader2,
  FileText
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';

export default function InternshipCoefficientPage() {
  const { theme } = useTheme();

  const [coefficients, setCoefficients] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    periodId: '',
    academicYear: '',
    periodName: '',
    totalClasses: 0,
    hoursPerClass: 18,
    totalStudents: 0,
    coefficient: 0,
    notes: ''
  });

  // 🛡️ CENTRALIZED DEFENSIVE SAFE STRING PARSER
  // Mencegah crash jika data berupa Object { id, year, isActive, createdAt, updatedAt }
  const formatSafeString = (val: any): string => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'object') {
      if (val.year) return String(val.year);
      if (val.name) return String(val.name);
      if (val.code) return String(val.code);
      if (val.periodName) return String(val.periodName);
      return '-';
    }
    return String(val);
  };

  // Fetch Data dari API
  const fetchData = async () => {
    setLoading(true);
    try {
      const [coeffRes, periodsRes, ayRes] = await Promise.all([
        fetch('/api/admin/coefficients?t=' + new Date().getTime()),
        fetch('/api/admin/periods?t=' + new Date().getTime()),
        fetch('/api/admin/academic-years?t=' + new Date().getTime())
      ]);

      const coeffData = await coeffRes.json();
      const periodsData = await periodsRes.json();
      const ayData = await ayRes.json();

      if (coeffData.success) setCoefficients(coeffData.data || []);
      if (periodsData.success) setPeriods(periodsData.data || []);
      if (ayData.success) setAcademicYears(ayData.data || []);

    } catch (err) {
      console.error('Error fetching coefficient data:', err);
      setStatusMsg({ type: 'error', text: 'Gagal memuat data perhitungan koefisien' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Recalculate Coefficient saat nilai input berubah
  useEffect(() => {
    const totalClasses = Number(form.totalClasses) || 0;
    const hoursPerClass = Number(form.hoursPerClass) || 0;
    const totalStudents = Number(form.totalStudents) || 0;

    if (totalStudents > 0) {
      const calculated = (totalClasses * hoursPerClass) / totalStudents;
      setForm((prev) => ({ ...prev, coefficient: parseFloat(calculated.toFixed(2)) }));
    } else {
      setForm((prev) => ({ ...prev, coefficient: 0 }));
    }
  }, [form.totalClasses, form.hoursPerClass, form.totalStudents]);

  // Handle Pilih Periode -> Auto Fill Data
  const handlePeriodSelect = (periodId: string) => {
    const selectedPeriod = periods.find((p) => p.id === periodId);
    if (selectedPeriod) {
      const ayString = formatSafeString(selectedPeriod.academicYear);

      setForm((prev) => ({
        ...prev,
        periodId: selectedPeriod.id,
        periodName: formatSafeString(selectedPeriod.name),
        academicYear: ayString !== '-' ? ayString : '',
        totalClasses: selectedPeriod.classes?.length || selectedPeriod._count?.classes || 0,
        totalStudents: selectedPeriod.totalStudents || selectedPeriod._count?.students || 0
      }));
    } else {
      setForm((prev) => ({ ...prev, periodId }));
    }
  };

  // Open Modal Create / Edit
  const handleOpenModal = (coeff: any = null) => {
    setStatusMsg(null);
    if (coeff) {
      setEditingId(coeff.id);
      
      const ayString = formatSafeString(coeff.academicYear);

      setForm({
        periodId: coeff.periodId || '',
        academicYear: ayString !== '-' ? ayString : '',
        periodName: formatSafeString(coeff.periodName || coeff.period?.name),
        totalClasses: coeff.totalClasses || 0,
        hoursPerClass: coeff.hoursPerClass || 18,
        totalStudents: coeff.totalStudents || 0,
        coefficient: coeff.coefficient || 0,
        notes: coeff.notes || ''
      });
    } else {
      setEditingId(null);
      setForm({
        periodId: '',
        academicYear: '',
        periodName: '',
        totalClasses: 0,
        hoursPerClass: 18,
        totalStudents: 0,
        coefficient: 0,
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.periodId || !form.academicYear) {
      setStatusMsg({ type: 'error', text: 'Periode PKL dan Tahun Pelajaran wajib dipilih.' });
      return;
    }

    setSubmitting(true);
    setStatusMsg(null);

    try {
      const endpoint = editingId ? `/api/admin/coefficients/${editingId}` : '/api/admin/coefficients';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setStatusMsg({ type: 'success', text: `Data koefisien berhasil ${editingId ? 'diperbarui' : 'ditambahkan'}!` });
        setIsModalOpen(false);
        fetchData();
      } else {
        setStatusMsg({ type: 'error', text: json.error || 'Gagal menyimpan data koefisien.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Terjadi kesalahan jaringan saat menyimpan.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Item
  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data perhitungan koefisien ini?')) return;

    try {
      const res = await fetch(`/api/admin/coefficients/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok && json.success) {
        setStatusMsg({ type: 'success', text: 'Data koefisien berhasil dihapus!' });
        fetchData();
      } else {
        setStatusMsg({ type: 'error', text: json.error || 'Gagal menghapus data.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Terjadi kesalahan jaringan saat menghapus.' });
    }
  };

  if (loading) {
    return (
      <div className={`min-h-[80vh] flex flex-col justify-center items-center space-y-4 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Memuat Data Perhitungan Koefisien PKL...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-900'
    }`}>
      
      {/* HEADER BANNER */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="space-y-2">
          <Link
            href="/dashboard/admin/master"
            className="inline-flex items-center space-x-2 text-xs font-bold text-indigo-500 hover:underline mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Master Data</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center space-x-3">
            <Calculator className="w-8 h-8 text-indigo-500" />
            <span>Perhitungan Koefisien Jam PKL</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Kelola formula dan alokasi koefisien jam pembimbing Praktik Kerja Lapangan berdasarkan rasio jumlah kelas, jam tatap muka, dan total siswa.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={fetchData}
            className="px-4 py-2.5 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold flex items-center space-x-2 cursor-pointer transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center space-x-2 cursor-pointer shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Perhitungan</span>
          </button>
        </div>
      </div>

      {/* NOTIFICATION ALERT */}
      {statusMsg && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center space-x-2 ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* SUMMARY STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className={`p-6 rounded-3xl border shadow-lg space-y-2 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Periode Terkalkulasi</span>
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black">{coefficients.length}</p>
          <p className="text-[11px] text-slate-500">Periode terdaftar dengan koefisien</p>
        </div>

        <div className={`p-6 rounded-3xl border shadow-lg space-y-2 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Standar Jam Per Kelas</span>
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-400">18 Jam</p>
          <p className="text-[11px] text-slate-500">Beban kurikulum standar PKL</p>
        </div>

        <div className={`p-6 rounded-3xl border shadow-lg space-y-2 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Rata-Rata Koefisien</span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Calculator className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400">
            {coefficients.length > 0
              ? (coefficients.reduce((acc, curr) => acc + (Number(curr.coefficient) || 0), 0) / coefficients.length).toFixed(2)
              : '0.00'}
          </p>
          <p className="text-[11px] text-slate-500">Faktor pengali alokasi jam</p>
        </div>
      </div>

      {/* TABLE DATA KOEFISIEN */}
      <div className={`rounded-3xl border shadow-xl overflow-hidden ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="p-6 border-b border-inherit flex items-center justify-between">
          <h3 className="text-base font-extrabold flex items-center space-x-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            <span>Daftar Perhitungan Koefisien PKL</span>
          </h3>
          <span className="text-xs text-slate-400 font-bold">{coefficients.length} Record Ditemukan</span>
        </div>

        {coefficients.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Calculator className="w-12 h-12 text-slate-500 mx-auto opacity-50" />
            <p className="text-xs font-semibold text-slate-400">Belum ada data perhitungan koefisien PKL.</p>
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
            >
              Tambah Data Sekarang
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b border-inherit uppercase text-[10px] font-black tracking-wider ${
                  theme === 'dark' ? 'bg-slate-950/50 text-slate-400' : 'bg-slate-50 text-slate-500'
                }`}>
                  <th className="p-4">Tahun Pelajaran</th>
                  <th className="p-4">Nama Periode PKL</th>
                  <th className="p-4 text-center">Total Kelas</th>
                  <th className="p-4 text-center">Jam / Kelas</th>
                  <th className="p-4 text-center">Total Siswa</th>
                  <th className="p-4 text-center">Nilai Koefisien</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit font-semibold">
                {coefficients.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-500/5 transition-colors">
                    {/* 🛡️ DIJAMIN AMAN DARI OBJECT REACT CHILD ERROR */}
                    <td className="p-4 font-extrabold text-indigo-400">
                      {formatSafeString(item.academicYear)}
                    </td>
                    <td className="p-4 font-bold text-slate-200">
                      {formatSafeString(item.periodName || item.period?.name)}
                    </td>
                    <td className="p-4 text-center">{item.totalClasses || 0} Kelas</td>
                    <td className="p-4 text-center">{item.hoursPerClass || 18} Jam</td>
                    <td className="p-4 text-center">{item.totalStudents || 0} Siswa</td>
                    <td className="p-4 text-center">
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black">
                        {item.coefficient || 0}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(item)}
                        className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all cursor-pointer"
                        title="Edit Data"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                        title="Hapus Data"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL FORM CREATE / EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            <div className="flex items-center justify-between border-b border-inherit pb-4">
              <h3 className="text-base font-extrabold flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-indigo-500" />
                <span>{editingId ? 'Edit Perhitungan Koefisien' : 'Tambah Perhitungan Koefisien'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800/50 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Pilih Periode PKL
                </label>
                <select
                  required
                  value={form.periodId}
                  onChange={(e) => handlePeriodSelect(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold border outline-none ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <option value="">-- Pilih Periode --</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatSafeString(p.name)} ({formatSafeString(p.academicYear)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Tahun Pelajaran
                </label>
                <select
                  required
                  value={form.academicYear}
                  onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold border outline-none ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <option value="">-- Pilih Tahun Pelajaran --</option>
                  {academicYears.map((ay) => {
                    const ayText = formatSafeString(ay.year || ay);
                    return (
                      <option key={ay.id || ayText} value={ayText}>
                        {ayText} {ay.isActive ? '(Aktif)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Total Kelas PKL
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.totalClasses}
                    onChange={(e) => setForm({ ...form, totalClasses: Number(e.target.value) })}
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold border outline-none ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Jam Per Kelas
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.hoursPerClass}
                    onChange={(e) => setForm({ ...form, hoursPerClass: Number(e.target.value) })}
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold border outline-none ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Total Siswa PKL
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.totalStudents}
                    onChange={(e) => setForm({ ...form, totalStudents: Number(e.target.value) })}
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold border outline-none ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Hasil Koefisien (Otomatis)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    readOnly
                    value={form.coefficient}
                    className="w-full px-4 py-3 rounded-2xl text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Catatan / Keterangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Catatan tambahan perhitungan..."
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold border outline-none ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-inherit">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center space-x-2 shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{submitting ? 'Menyimpan...' : 'Simpan Data'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}