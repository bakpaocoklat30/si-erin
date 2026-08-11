// 📋 CHANGELOG:
// ✅ Perubahan: Menambahkan tombol Edit pada setiap baris tabel master data dan fungsionalitas modal edit dinamis
// ✨ Fitur Baru: Mode Edit (PUT request) terintegrasi untuk Tahun Pelajaran, Jurusan, dan Kelas
// 🎨 UI/UX Update: Tombol aksi Edit dengan ikon pensil dan indikator judul modal dinamis (Tambah vs Edit)
// 🔧 Bug Fix: Menyediakan state `selectedId` dan handler `handleOpenEditModal` untuk pengeditan data yang presisi
// 🚀 Inovasi: Enterprise dual-mode modal (Create & Update) for Master Data management

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { 
  Database, Calendar, BookOpen, Layers, Plus, 
  CheckCircle2, ShieldCheck, ArrowLeft, Trash2, Edit3, AlertCircle, X
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

type TabType = 'academic_year' | 'department' | 'class';

export default function AdminMasterPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('academic_year');
  const [dataList, setDataList] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State (Dual Mode: Create / Edit)
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    code: '', 
    departmentId: '', 
    isActive: false 
  });

  const loadData = useCallback(() => {
    setLoading(true);
    setErrorMsg('');
    const timestamp = new Date().getTime();
    
    fetch(`/api/admin/master?type=${activeTab}&t=${timestamp}`)
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setDataList(res.data);
        } else {
          setErrorMsg(res.error || 'Gagal memuat data dari server');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setErrorMsg('Koneksi ke database terputus');
        setLoading(false);
      });

    if (activeTab === 'class') {
      fetch(`/api/admin/master?type=department&t=${timestamp}`)
        .then(res => res.json())
        .then(res => {
          if (res.success) setDepartments(res.data);
        });
    }
  }, [activeTab]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadData();
    }
  }, [status, loadData]);

  // Handler Buka Modal Tambah
  const handleOpenAddModal = () => {
    setIsEditing(false);
    setSelectedId('');
    setFormData({ name: '', code: '', departmentId: '', isActive: false });
    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  // Handler Buka Modal Edit
  const handleOpenEditModal = (item: any) => {
    setIsEditing(true);
    setSelectedId(item.id);
    setErrorMsg('');
    setSuccessMsg('');

    if (activeTab === 'academic_year') {
      setFormData({ name: item.year || '', code: '', departmentId: '', isActive: Boolean(item.isActive) });
    } else if (activeTab === 'department') {
      setFormData({ name: item.name || '', code: item.code || '', departmentId: '', isActive: false });
    } else if (activeTab === 'class') {
      setFormData({ name: item.name || '', code: '', departmentId: item.departmentId || '', isActive: false });
    }

    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const endpoint = '/api/admin/master';
      const method = isEditing ? 'PUT' : 'POST';
      const payload = {
        id: isEditing ? selectedId : undefined,
        type: activeTab,
        name: formData.name,
        code: formData.code,
        departmentId: formData.departmentId,
        isActive: Boolean(formData.isActive)
      };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      
      if (result.success) {
        setSuccessMsg(result.message);
        setShowModal(false);
        loadData();
      } else {
        setErrorMsg(result.error || 'Terjadi kesalahan saat menyimpan data');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal menghubungkan ke API server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, nameDisplay: string) => {
    if (!confirm(`Hapus permanen data "${nameDisplay}"? Data yang sudah dihapus tidak dapat dikembalikan.`)) return;
    
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      const res = await fetch(`/api/admin/master?type=${activeTab}&id=${id}`, { 
        method: 'DELETE' 
      });
      const result = await res.json();
      
      if (result.success) {
        setSuccessMsg(result.message);
        loadData();
      } else {
        setErrorMsg(result.error || 'Gagal menghapus data');
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan koneksi jaringan saat menghapus data');
    }
  };

  if (status === 'loading') {
    return (
      <div className={`min-h-[70vh] flex items-center justify-center ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold">Memverifikasi otoritas Master Data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Header Banner */}
      <div className={`border rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' 
          ? 'bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border-indigo-500/30 text-white' 
          : 'bg-gradient-to-r from-indigo-50 via-white to-white border-indigo-200 text-slate-900 shadow-xl'
      }`}>
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-2 relative z-10">
          <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold border ${
            theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-indigo-100 border-indigo-200 text-indigo-700'
          }`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Master Data Management</span>
          </div>
          <h2 className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Kelola <span className="text-indigo-600 dark:text-indigo-400">Master Data</span> 📚
          </h2>
          <p className={`text-sm max-w-2xl ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Pusat kendali parameter sistem. Atur tahun pelajaran aktif, program keahlian (jurusan), dan pembagian kelas peserta didik.
          </p>
        </div>

        <a
          href="/dashboard"
          className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-all ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-800 shadow-sm hover:bg-slate-50'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard</span>
        </a>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-sm font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      
      {errorMsg && !showModal && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm font-semibold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TABS NAVIGATION & ACTION BUTTON */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className={`flex p-1.5 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <button
            type="button"
            onClick={() => setActiveTab('academic_year')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'academic_year' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Tahun Pelajaran</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('department')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'department' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Jurusan / Program</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('class')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'class' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Kelas / Rombel</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Data {activeTab === 'academic_year' ? 'Tahun' : activeTab === 'department' ? 'Jurusan' : 'Kelas'}</span>
        </button>
      </div>

      {/* DATA TABLE SECTION */}
      <div className={`border rounded-2xl p-6 sm:p-8 shadow-xl ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'}`}>
        {loading ? (
          <div className="space-y-4 animate-pulse">
             <div className={`h-8 w-1/4 rounded ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
             {[1, 2, 3].map(i => (
               <div key={i} className={`h-12 w-full rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100'}`}></div>
             ))}
          </div>
        ) : dataList.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Database className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
            <p className="text-sm font-semibold text-slate-400">Belum ada data {activeTab === 'academic_year' ? 'tahun pelajaran' : activeTab === 'department' ? 'jurusan' : 'kelas'} yang tersimpan.</p>
            <button 
              onClick={handleOpenAddModal}
              className="text-indigo-500 hover:text-indigo-400 text-xs font-bold underline underline-offset-4"
            >
              Buat data pertama sekarang
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={`border-b text-xs uppercase tracking-wider ${theme === 'dark' ? 'border-slate-800 text-slate-400 bg-slate-950/50' : 'border-slate-200 text-slate-500 bg-slate-50'}`}>
                <tr>
                  <th className="p-4 w-16">No</th>
                  <th className="p-4">{activeTab === 'academic_year' ? 'Tahun Pelajaran' : activeTab === 'department' ? 'Nama Jurusan' : 'Nama Kelas'}</th>
                  {activeTab === 'department' && <th className="p-4">Kode Singkat</th>}
                  {activeTab === 'class' && <th className="p-4">Program Keahlian</th>}
                  {activeTab === 'academic_year' && <th className="p-4">Status Aktif</th>}
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {dataList.map((item, index) => {
                  const displayStr = item.year || item.name;
                  return (
                    <tr key={item.id} className={`transition-colors group ${theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                      <td className="p-4 font-medium text-slate-400">{index + 1}</td>
                      <td className="p-4 font-bold">{displayStr}</td>
                      
                      {activeTab === 'department' && <td className="p-4 font-semibold text-indigo-400">{item.code}</td>}
                      
                      {activeTab === 'class' && <td className="p-4 text-slate-400">{item.department?.name || '-'}</td>}
                      
                      {activeTab === 'academic_year' && (
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.isActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {item.isActive ? 'Sedang Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                      )}

                      <td className="p-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                          title="Ubah / Edit Data"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, displayStr)}
                          className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                          title="Hapus Data"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL TAMBAH / EDIT MASTER DATA */}
      {showModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            
            <div className="flex justify-between items-center border-b pb-4 border-inherit">
              <h3 className="text-lg font-bold flex items-center space-x-2">
                <Database className="w-5 h-5 text-indigo-500" />
                <span>{isEditing ? 'Ubah' : 'Tambah'} {activeTab === 'academic_year' ? 'Tahun Pelajaran' : activeTab === 'department' ? 'Jurusan' : 'Kelas'}</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  {activeTab === 'academic_year' ? 'Format Tahun (Contoh: 2025/2026)' : activeTab === 'department' ? 'Nama Jurusan Lengkap' : 'Nama Kelas (Contoh: XII TKJ 1)'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={activeTab === 'academic_year' ? '2025/2026' : activeTab === 'department' ? 'Teknik Komputer dan Jaringan' : 'XII TKJ 1'}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                  }`}
                />
              </div>

              {activeTab === 'department' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Kode Singkat (Opsional)</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Contoh: TKJ, RPL, DKV"
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                    }`}
                  />
                </div>
              )}

              {activeTab === 'class' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Hubungkan ke Jurusan</label>
                  <select
                    required
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                    }`}
                  >
                    <option value="">-- Pilih Jurusan / Program Keahlian --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'academic_year' && (
                <label className={`flex items-center space-x-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                  theme === 'dark' ? 'border-slate-800 bg-slate-950/50 hover:bg-slate-900' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                  />
                  <div>
                    <p className="text-sm font-bold">Jadikan Tahun Aktif Saat Ini</p>
                    <p className="text-[10px] text-slate-400">Tahun pelajaran yang sedang berjalan di sistem.</p>
                  </div>
                </label>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-inherit">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    theme === 'dark' ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Batalkan
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>{isEditing ? 'Perbarui Data' : 'Simpan Data'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}