// 📋 CHANGELOG:
// ✅ Perubahan: Menambahkan input "Bidang Usaha" (Sector) pada form modal serta pagination dengan pilihan baris 5/10/25/50/100.
// ✨ Fitur Baru: Industry Sector Input & Enterprise Pagination Footer (5/10/25/50/100).
// 🎨 UI/UX Update: Badge sektor industri yang kontras, penomoran baris tabel interaktif, dan navigasi halaman mulus.
// 🔧 Bug Fix: Memastikan pengelolaan kategori bidang usaha industri berjalan lancar.
// 🚀 Inovasi: Enterprise Partner Industry & Sector Management Dashboard.

'client';
'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  MapPin, 
  Briefcase, 
  X, 
  CheckCircle2, 
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

export default function PokjaIndustriesPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  const [industries, setIndustries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    sector: '',
    address: '',
    contactPerson: '',
    phone: ''
  });

  const fetchIndustries = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/pokja/industries?t=${timestamp}`);
      const result = await res.json();

      if (res.ok && result.success) {
        setIndustries(result.data || []);
      } else {
        setErrorMsg(result.error || 'Gagal memuat data industri mitra.');
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
      fetchIndustries();
    }
  }, [status, fetchIndustries]);

  const handleAddIndustry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/pokja/industries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await res.json();

      if (res.ok && result.success) {
        setSuccessMsg(result.message);
        setShowAddModal(false);
        setFormData({ id: '', name: '', sector: '', address: '', contactPerson: '', phone: '' });
        fetchIndustries();
      } else {
        alert(result.error || 'Gagal menambahkan industri');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateIndustry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/pokja/industries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await res.json();

      if (res.ok && result.success) {
        setSuccessMsg(result.message);
        setShowEditModal(false);
        fetchIndustries();
      } else {
        alert(result.error || 'Gagal memperbarui industri');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIndustry = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus industri mitra "${name}"?`)) return;

    try {
      const res = await fetch(`/api/pokja/industries?id=${id}`, { method: 'DELETE' });
      const result = await res.json();

      if (res.ok && result.success) {
        setSuccessMsg(result.message);
        fetchIndustries();
      } else {
        alert(result.error || 'Gagal menghapus industri');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
    }
  };

  const openEditModal = (ind: any) => {
    setFormData({
      id: ind.id,
      name: ind.name,
      sector: ind.sector === 'Umum' ? '' : ind.sector,
      address: ind.address === '-' ? '' : ind.address,
      contactPerson: ind.contactPerson === '-' ? '' : ind.contactPerson,
      phone: ind.phone === '-' ? '' : ind.phone
    });
    setShowEditModal(true);
  };

  const filteredIndustries = industries.filter((i: any) => 
    i.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.sector?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination Calculations
  const totalPages = Math.ceil(filteredIndustries.length / rowsPerPage) || 1;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredIndustries.slice(indexOfFirstRow, indexOfLastRow);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, rowsPerPage]);

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
              Kemitraan Industri
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Kelola Industri Mitra</h1>
          <p className="text-sm text-slate-400">Tambah dan kelola daftar perusahaan/instansi mitra tempat penempatan Prakerin peserta didik.</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormData({ id: '', name: '', sector: '', address: '', contactPerson: '', phone: '' });
            setShowAddModal(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Industri Mitra</span>
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-indigo-500" />
              <span>Daftar Perusahaan Mitra ({filteredIndustries.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Pantau daftar instansi perusahaan mitra kerja sama.</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, bidang usaha, atau alamat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs outline-none ${
                theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400">Memuat data industri mitra...</div>
        ) : filteredIndustries.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">Belum ada data industri mitra terdaftar. Silakan tambahkan baru.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className={`text-xs uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-950/50 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-500 border-b border-slate-200'}`}>
                  <tr>
                    <th className="p-4">Nama Perusahaan / Instansi</th>
                    <th className="p-4">Bidang Usaha</th>
                    <th className="p-4">Alamat</th>
                    <th className="p-4 text-center">Siswa Ditempatkan</th>
                    <th className="p-4">Kontak PIC (Opsional)</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30 text-xs">
                  {currentRows.map((ind: any) => (
                    <tr key={ind.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                      <td className="p-4 font-bold text-sm">{ind.name}</td>
                      <td className="p-4">
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 inline-flex items-center space-x-1">
                          <Briefcase className="w-3 h-3 mr-1" />
                          <span>{ind.sector}</span>
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 max-w-xs truncate">
                        <span className="inline-flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 mr-1" />
                          <span>{ind.address}</span>
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {ind.filledCount} Siswa
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">
                        <p className="font-bold text-slate-300">{ind.contactPerson !== '-' ? ind.contactPerson : 'Tidak ada PIC'}</p>
                        <p className="font-mono text-[11px]">{ind.phone !== '-' ? ind.phone : '-'}</p>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(ind)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-400 font-bold transition-all inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteIndustry(ind.id, ind.name)}
                          className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 font-bold transition-all inline-flex items-center space-x-1 cursor-pointer"
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

            {/* PAGINATION & ROWS PER PAGE FOOTER (5/10/25/50/100) */}
            <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-slate-800/40 gap-4 text-xs">
              <div className="flex items-center space-x-2 text-slate-400">
                <span>Tampilkan</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>data per halaman (Menampilkan {filteredIndustries.length > 0 ? indexOfFirstRow + 1 : 0} - {Math.min(indexOfLastRow, filteredIndustries.length)} dari {filteredIndustries.length} data)</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-xl border flex items-center space-x-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    theme === 'dark' ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Sebelumnya</span>
                </button>

                <span className="px-3 py-1.5 font-bold font-mono bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-xl border flex items-center space-x-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    theme === 'dark' ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL TAMBAH INDUSTRI */}
      {showAddModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-lg border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center border-b pb-4 border-inherit">
              <h3 className="text-base font-bold flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-indigo-500" />
                <span>Tambah Industri Mitra Baru</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-red-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddIndustry} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Nama Perusahaan / Instansi</label>
                  <input
                    type="text"
                    required
                    placeholder="Cth: PT Telkom Indonesia Tbk"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Bidang Usaha (Sektor)</label>
                  <input
                    type="text"
                    placeholder="Cth: Telekomunikasi / IT"
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Alamat Lengkap</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Cth: Jl. Japati No. 1, Bandung"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Nama Kontak PIC (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Cth: Bpk. Andi"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Nomor Telepon PIC (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Cth: 08123456789"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
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
                  {submitting ? 'Menyimpan...' : 'Simpan Industri'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT INDUSTRI */}
      {showEditModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-lg border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center border-b pb-4 border-inherit">
              <h3 className="text-base font-bold flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-indigo-500" />
                <span>Edit Data Industri Mitra</span>
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-red-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateIndustry} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Nama Perusahaan / Instansi</label>
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
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Bidang Usaha (Sektor)</label>
                  <input
                    type="text"
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Alamat Lengkap</label>
                <textarea
                  required
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Nama Kontak PIC (Opsional)</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Nomor Telepon PIC (Opsional)</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
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