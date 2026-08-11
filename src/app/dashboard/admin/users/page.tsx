// 📋 CHANGELOG:
// ✅ Perubahan: Memperbaiki pemetaan payload pengiriman data pada fungsi `handleSubmit` di halaman Kelola Pengguna Admin agar pengiriman password opsional terstruktur dengan bersih.
// ✨ Fitur Baru: Clean Payload Mapping for User Edit & Update.
// 🎨 UI/UX Update: Transisi modal yang mulus, toast notification yang responsif, dan indikator loading button.
// 🔧 Bug Fix: Menghilangkan alert "Gagal memperbarui akun pengguna" yang muncul akibat ketidaksesuaian struktur payload password opsional.
// 🚀 Inovasi: Enterprise Admin User Management Interface with Bulletproof Payload Validation.

'client';
'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  X, 
  ShieldAlert,
  CheckCircle2,
  Database,
  UserCircle
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

export default function AdminManageUsersPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // States untuk Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [activeUser, setActiveUser] = useState<any>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    id: '', name: '', username: '', role: 'SISWA', phone: '', department: '', className: '', password: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const timestamp = new Date().getTime();
      const [resUsers, resDept] = await Promise.all([
        fetch(`/api/admin/users?t=${timestamp}`),
        fetch(`/api/admin/master?type=department&t=${timestamp}`)
      ]);

      const resultUsers = await resUsers.json();
      const resultDept = await resDept.json();

      if (resUsers.ok && resultUsers.success) {
        setUsers(resultUsers.data);
      } else {
        setErrorMsg(resultUsers.error || 'Gagal memuat data pengguna.');
      }

      if (resDept.ok && resultDept.success) {
        setDepartments(resultDept.data);
      }
    } catch (error) {
      console.error(error);
      setErrorMsg('Koneksi terputus ke server database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, fetchData]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tindakan ini tidak dapat dibatalkan. Yakin ingin menghapus pengguna "${name}"?`)) return;
    
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      
      if (res.ok && result.success) {
        setSuccessMsg(`Pengguna ${name} berhasil dihapus.`);
        fetchData();
      } else {
        alert(result.error || 'Gagal menghapus pengguna');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
    }
  };

  const handleSubmit = async (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const url = '/api/admin/users';
      const method = isEdit ? 'PUT' : 'POST';
      
      // Membentuk payload secara bersih sesuai kebutuhan backend
      const payload: any = {
        id: formData.id,
        name: formData.name,
        username: formData.username,
        role: formData.role,
        phone: formData.phone,
        className: formData.className || null,
        department: formData.role === 'POKJA' ? formData.department : (formData.department || null)
      };

      // Sertakan password hanya jika diisi
      if (formData.password && formData.password.trim() !== '') {
        payload.password = formData.password;
        payload.newPassword = formData.password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (res.ok && result.success) {
        setSuccessMsg(result.message || 'Data pengguna berhasil diperbarui!');
        setShowAddModal(false);
        setShowEditModal(false);
        fetchData();
      } else {
        alert(result.error || 'Terjadi kesalahan saat memproses data');
      }
    } catch (err) {
      alert('Koneksi ke server gagal.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (user: any) => {
    setFormData({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      phone: user.phone || '',
      department: user.department || '',
      className: user.className || '',
      password: '' // Reset field password setiap kali modal edit dibuka
    });
    setShowEditModal(true);
  };

  if (status === 'loading') return null;

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* HEADER SECTION */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
            <Users className="w-4 h-4" />
            <span>Manajemen Sistem</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Kelola Akun Pengguna</h1>
          <p className="text-sm text-slate-500">Atur hak akses, tentukan jurusan penugasan Pokja, dan kelola seluruh user sistem.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ id: '', name: '', username: '', role: 'SISWA', phone: '', department: '', className: '', password: '' });
            setShowAddModal(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>

      {/* MESSAGES */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center space-x-3 text-sm font-bold animate-in fade-in">
          <Database className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center space-x-3 text-sm font-bold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TOOLBAR */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-center gap-4 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className={`flex items-center px-4 py-2.5 rounded-xl border w-full sm:w-96 ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <Search className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
          <input 
            type="text" 
            placeholder="Cari nama atau username..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      {/* TABLE LIST USERS */}
      <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xl'}`}>
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-slate-500">Memuat data pengguna...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4 text-slate-500">
            <ShieldAlert className="w-12 h-12 opacity-50" />
            <p className="font-semibold">Belum ada data pengguna.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={`text-xs uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-950/50 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-500 border-b border-slate-200'}`}>
                <tr>
                  <th className="px-6 py-4 font-bold">No</th>
                  <th className="px-6 py-4 font-bold">Nama Lengkap</th>
                  <th className="px-6 py-4 font-bold">Username / Identitas</th>
                  <th className="px-6 py-4 font-bold">Role & Jurusan</th>
                  <th className="px-6 py-4 font-bold text-right">Aksi Pilihan</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800/50' : 'divide-slate-100'}`}>
                {users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase())).map((user, idx) => (
                  <tr key={user.id} className={`transition-all ${theme === 'dark' ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                    <td className="px-6 py-4 text-slate-500 font-medium">{idx + 1}</td>
                    <td className="px-6 py-4 font-bold flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                        <UserCircle className="w-5 h-5" />
                      </div>
                      <span>{user.name}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{user.username}</td>
                    <td className="px-6 py-4 space-y-1">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                        user.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' : 
                        user.role === 'POKJA' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                        user.role === 'GURU' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                        'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                      }`}>
                        {user.role}
                      </span>
                      {user.role === 'POKJA' && user.department && (
                        <p className="text-[10px] text-emerald-400 font-medium">Jurusan: {user.department}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => { setActiveUser(user); setShowDetailModal(true); }}
                        className="p-2 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all cursor-pointer shadow-sm inline-flex items-center"
                        title="Lihat Detail Profil"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all cursor-pointer shadow-sm inline-flex items-center"
                        title="Edit Data Pengguna"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id, user.name)}
                        className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer shadow-sm inline-flex items-center"
                        title="Hapus Pengguna"
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

      {/* MODAL 1: LIHAT DETAIL PENGGUNA */}
      {showDetailModal && activeUser && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex justify-between items-center border-b pb-4 border-inherit">
              <h3 className="text-lg font-bold flex items-center space-x-2">
                <UserCircle className="w-5 h-5 text-indigo-500" />
                <span>Detail Pengguna</span>
              </h3>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex flex-col space-y-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Nama Lengkap</span>
                <span className="font-bold text-base">{activeUser.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Username / ID</span>
                  <span className="font-mono font-bold text-indigo-500">{activeUser.username}</span>
                </div>
                <div className="flex flex-col space-y-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Role</span>
                  <span className="font-bold">{activeUser.role}</span>
                </div>
              </div>
              {activeUser.role === 'POKJA' && (
                <div className="flex flex-col space-y-1 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <span className="text-[10px] font-semibold uppercase">Jurusan Binaan Pokja</span>
                  <span className="font-bold">{activeUser.department || 'Belum ditentukan'}</span>
                </div>
              )}
              <div className="flex flex-col space-y-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Nomor Telepon</span>
                <span className="font-medium">{activeUser.phone || 'Belum diatur'}</span>
              </div>
            </div>
            <button onClick={() => setShowDetailModal(false)} className="w-full bg-slate-800 text-white hover:bg-slate-700 py-3 rounded-xl font-bold transition-all cursor-pointer">
              Tutup Jendela
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT DATA PENGGUNA */}
      {showEditModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex justify-between items-center border-b pb-4 border-inherit">
              <h3 className="text-lg font-bold flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-indigo-500" />
                <span>Edit Data Pengguna</span>
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nama Lengkap</label>
                <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className={`w-full p-3 rounded-xl border text-sm outline-none ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Username</label>
                  <input required type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className={`w-full p-3 rounded-xl border text-sm outline-none ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Role Akses</label>
                  <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className={`w-full p-3 rounded-xl border text-sm outline-none cursor-pointer ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                    <option value="SISWA">Siswa</option>
                    <option value="POKJA">Pokja Prakerin</option>
                    <option value="GURU">Guru</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>

              {/* CONDITIONAL DROPDOWN JURUSAN KHUSUS POKJA */}
              {formData.role === 'POKJA' && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1 animate-in fade-in">
                  <label className="block text-xs font-bold text-emerald-400 mb-1">Jurusan Binaan Pokja</label>
                  <select 
                    required 
                    value={formData.department} 
                    onChange={(e) => setFormData({...formData, department: e.target.value})} 
                    className={`w-full p-3 rounded-xl border text-sm outline-none cursor-pointer ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                  >
                    <option value="">-- Pilih Jurusan Binaan --</option>
                    {departments.map((dept: any) => (
                      <option key={dept.id} value={dept.name}>{dept.name} ({dept.code})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Pokja ini hanya akan memverifikasi pengajuan siswa dari jurusan yang dipilih.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nomor Telepon</label>
                <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className={`w-full p-3 rounded-xl border text-sm outline-none ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Ganti Password (Opsional)</label>
                <input type="password" placeholder="Kosongkan jika tidak ingin ganti" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className={`w-full p-3 rounded-xl border text-sm outline-none ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
              </div>
              <div className="pt-2">
                <button type="submit" disabled={submitting} className="w-full bg-indigo-600 text-white hover:bg-indigo-500 py-3 rounded-xl font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-600/30">
                  {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TAMBAH PENGGUNA BARU */}
      {showAddModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex justify-between items-center border-b pb-4 border-inherit">
              <h3 className="text-lg font-bold flex items-center space-x-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                <span>Tambah Pengguna Baru</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nama Lengkap</label>
                <input required type="text" placeholder="Cth: Budi Santoso" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className={`w-full p-3 rounded-xl border text-sm outline-none ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Username / NIS</label>
                  <input required type="text" placeholder="Cth: 2026001" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className={`w-full p-3 rounded-xl border text-sm outline-none ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Role Akses</label>
                  <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className={`w-full p-3 rounded-xl border text-sm outline-none cursor-pointer ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                    <option value="SISWA">Siswa</option>
                    <option value="POKJA">Pokja Prakerin</option>
                    <option value="GURU">Guru</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>

              {/* CONDITIONAL DROPDOWN JURUSAN KHUSUS POKJA */}
              {formData.role === 'POKJA' && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1 animate-in fade-in">
                  <label className="block text-xs font-bold text-emerald-400 mb-1">Jurusan Binaan Pokja</label>
                  <select 
                    required 
                    value={formData.department} 
                    onChange={(e) => setFormData({...formData, department: e.target.value})} 
                    className={`w-full p-3 rounded-xl border text-sm outline-none cursor-pointer ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                  >
                    <option value="">-- Pilih Jurusan Binaan --</option>
                    {departments.map((dept: any) => (
                      <option key={dept.id} value={dept.name}>{dept.name} ({dept.code})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Pokja ini hanya akan memverifikasi pengajuan siswa dari jurusan yang dipilih.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nomor Telepon</label>
                <input type="text" placeholder="Cth: 08123456789" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className={`w-full p-3 rounded-xl border text-sm outline-none ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Password</label>
                <input required type="password" placeholder="Masukkan password kuat" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className={`w-full p-3 rounded-xl border text-sm outline-none ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
              </div>
              <div className="pt-2">
                <button type="submit" disabled={submitting} className="w-full bg-indigo-600 text-white hover:bg-indigo-500 py-3 rounded-xl font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-600/30">
                  {submitting ? 'Menyimpan...' : 'Simpan Pengguna Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
}