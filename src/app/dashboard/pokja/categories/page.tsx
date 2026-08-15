// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Menghubungkan Frontend ke Endpoint Persistent Batch API & Memperbaiki Parser CSV.
// ✨ Fitur Baru:
//    - Robust CSV Parser (Mendukung nama kategori berspasi, berkutip, dan koma/titik-koma).
//    - Resilient Single-Request Batch Persistent Importer.
//    - Checklist Multi-Pilih & Select All Header Checkbox.
//    - Floating Bulk Action Bar untuk Hapus Massal (Bulk Remove).
//    - Pagination & Limit Control Dropdown (5, 10, 25, 50, 100).
// 🎨 UI/UX Update: Indikator progress & high-contrast floating action bar.
// 🔧 Bug Fix: Menyelesaikan masalah koneksi API backend saat import 87 data.
// 🚀 Inovasi: One-Click Persistent Batch Category Importer for Pokja SI-ERIN.
// ----------------------------------------------------------------------

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Briefcase, 
  Search, 
  Plus, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle,
  FileUp,
  Download,
  Upload,
  Loader2,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

interface CategoryItem {
  id?: string;
  name: string;
  description?: string;
}

export default function PokjaCategoriesPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // State Modal Tambah Kategori Manual
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  // State Paginasi & Limit (5, 10, 25, 50, 100)
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // State Bulk Selection & Actions
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // State Fitur Import CSV Persistent
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewData, setCsvPreviewData] = useState<CategoryItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string>('');
  const [csvErrorMsg, setCsvErrorMsg] = useState('');

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/pokja/industry-categories');
      const result = await res.json();
      if (res.ok && result.success) {
        setCategories(result.data || []);
      } else {
        setErrorMsg(result.error || 'Gagal memuat kategori.');
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
      fetchCategories();
    }
  }, [status, fetchCategories]);

  // Filter Data Berdasarkan Pencarian
  const filteredCategories = useMemo(() => {
    return categories.filter((c: any) =>
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categories, searchQuery]);

  // Hitung Data Terpaginasi
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage) || 1;
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCategories.slice(start, start + itemsPerPage);
  }, [filteredCategories, currentPage, itemsPerPage]);

  // Reset ke halaman 1 saat pencarian atau limit berubah
  useEffect(() => {
    setCurrentPage(1);
    setSelectedCategoryIds([]);
  }, [searchQuery, itemsPerPage]);

  // 🌟 LOGIKA CHECKLIST SELECTION (SINGLE & SELECT ALL)
  const isAllPaginatedSelected = useMemo(() => {
    if (paginatedCategories.length === 0) return false;
    return paginatedCategories.every(c => selectedCategoryIds.includes(c.id));
  }, [paginatedCategories, selectedCategoryIds]);

  const handleSelectAllToggle = () => {
    if (isAllPaginatedSelected) {
      const paginatedIds = paginatedCategories.map(c => c.id);
      setSelectedCategoryIds(prev => prev.filter(id => !paginatedIds.includes(id)));
    } else {
      const paginatedIds = paginatedCategories.map(c => c.id);
      setSelectedCategoryIds(prev => Array.from(new Set([...prev, ...paginatedIds])));
    }
  };

  const handleRowSelectToggle = (id: string) => {
    if (selectedCategoryIds.includes(id)) {
      setSelectedCategoryIds(prev => prev.filter(item => item !== id));
    } else {
      setSelectedCategoryIds(prev => [...prev, id]);
    }
  };

  // 🌟 BULK ACTION: HAPUS MASSAL (BULK REMOVE)
  const handleBulkDelete = async () => {
    if (selectedCategoryIds.length === 0) return;

    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedCategoryIds.length} kategori industri terpilih?`)) {
      return;
    }

    setIsBulkDeleting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let successCount = 0;
      for (const id of selectedCategoryIds) {
        const res = await fetch(`/api/pokja/industry-categories?id=${id}`, { method: 'DELETE' });
        if (res.ok) successCount++;
      }

      setSuccessMsg(`Berhasil menghapus ${successCount} kategori industri.`);
      setSelectedCategoryIds([]);
      fetchCategories();
    } catch (err) {
      console.error('Error executing bulk delete:', err);
      setErrorMsg('Terjadi kesalahan saat menghapus data massal.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/pokja/industry-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await res.json();

      if (res.ok && result.success) {
        setSuccessMsg(result.message || 'Kategori berhasil ditambahkan.');
        setShowAddModal(false);
        setFormData({ name: '', description: '' });
        fetchCategories();
      } else {
        alert(result.error || 'Gagal menambah kategori');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus kategori "${name}"?`)) return;

    try {
      const res = await fetch(`/api/pokja/industry-categories?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (res.ok && result.success) {
        setSuccessMsg(result.message || 'Kategori berhasil dihapus.');
        fetchCategories();
      } else {
        alert(result.error || 'Gagal menghapus kategori');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
    }
  };

  // Unduh Template CSV Standar
  const handleDownloadTemplate = () => {
    const csvContent = 'name,description\r\n' +
      '"Rekayasa Perangkat Lunak","Perusahaan pengembangan software & AI"\r\n' +
      '"Teknik Jaringan Komputer","Perusahaan penyedia infrastruktur jaringan & server"\r\n' +
      '"Ind. Kayu, dan Gabus","Industri pengolahan kayu dan produk turunan"';

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Template_Import_Kategori_Industri.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 🌟 ROBUST CSV PARSER
  const parseCSVLine = (text: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (inQuotes && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((c === ',' || c === ';') && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setCsvErrorMsg('');
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.includes('.csv')) {
      setCsvErrorMsg('File harus berformat .csv!');
      return;
    }

    setCsvFile(file);
    const reader = new FileReader();

    reader.onload = (event) => {
      let text = (event.target?.result as string) || '';
      if (!text) return;

      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
      }

      const lines = text.split(/\r\n|\n/);
      const parsedData: CategoryItem[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = parseCSVLine(line);

        if (columns && columns.length > 0) {
          const rawName = columns[0]?.replace(/^"|"$/g, '').trim();
          const rawDesc = columns[1] ? columns[1].replace(/^"|"$/g, '').trim() : '';

          if (rawName && rawName.toLowerCase() !== 'name') {
            parsedData.push({
              name: rawName,
              description: rawDesc
            });
          }
        }
      }

      if (parsedData.length === 0) {
        setCsvErrorMsg('File CSV tidak memuat baris data kategori yang valid.');
      }

      setCsvPreviewData(parsedData);
    };

    reader.readAsText(file);
  };

  // 🌟 BATCH PERSISTENT IMPORTER LOGIC
  const handleProcessImport = async () => {
    if (csvPreviewData.length === 0) {
      setCsvErrorMsg('Tidak ada data kategori yang siap di-import.');
      return;
    }

    setIsImporting(true);
    setCsvErrorMsg('');
    setImportProgress(`Mengirim ${csvPreviewData.length} data kategori ke database...`);

    try {
      const res = await fetch('/api/pokja/industry-categories/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: csvPreviewData })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setSuccessMsg(result.message || `Berhasil menyimpan ${csvPreviewData.length} kategori industri ke database!`);
        setShowImportModal(false);
        setCsvFile(null);
        setCsvPreviewData([]);
        fetchCategories();
      } else {
        setCsvErrorMsg(result.error || 'Gagal menyimpan data ke database.');
      }
    } catch (err: any) {
      console.error('Error importing CSV persistent:', err);
      setCsvErrorMsg('Gagal terhubung ke API backend. Pastikan server Next.js Anda berjalan.');
    } finally {
      setIsImporting(false);
      setImportProgress('');
    }
  };

  if (status === 'loading') return null;

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-32 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* HEADER BANNER */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Master Data Kemitraan Pokja
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Kelola Kategori Industri</h1>
          <p className="text-sm text-slate-400">Atur, tambah, atau <strong>Import CSV Massal</strong> daftar bidang usaha / sektor industri mitra yang tersimpan di database.</p>
        </div>

        {/* GROUP BUTTONS */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setShowImportModal(true);
              setCsvFile(null);
              setCsvPreviewData([]);
              setCsvErrorMsg('');
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition-all cursor-pointer border border-emerald-500/30"
            title="Import Kategori Massal Menggunakan CSV"
          >
            <FileUp className="w-4 h-4" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kategori Baru</span>
          </button>
        </div>
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

      {/* TABLE SECTION WITH LIMIT CONTROLLER & CHECKBOX */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold flex items-center space-x-2">
              <Briefcase className="w-5 h-5 text-indigo-500" />
              <span>Daftar Kategori Bidang Usaha ({filteredCategories.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Kategori ini akan muncul sebagai opsi pilihan saat menambahkan industri mitra.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* SEARCH BAR */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama kategori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs outline-none ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            {/* LIMIT DATA DROPDOWN */}
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-xs font-bold text-slate-400">Tampilkan:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-indigo-400' : 'bg-slate-50 border-slate-200 text-indigo-600'
                }`}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 flex flex-col justify-center items-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <span>Memuat data kategori...</span>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">Belum ada kategori industri terdaftar di database. Gunakan tombol Tambah atau Import CSV.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={`text-xs uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-950/50 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-500 border-b border-slate-200'}`}>
                <tr>
                  <th className="p-4 w-12 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAllToggle}
                      className="cursor-pointer text-indigo-400 hover:text-indigo-300"
                      title={isAllPaginatedSelected ? 'Batal Pilih Semua' : 'Pilih Semua di Halaman Ini'}
                    >
                      {isAllPaginatedSelected ? (
                        <CheckSquare className="w-5 h-5 text-indigo-500" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-500" />
                      )}
                    </button>
                  </th>
                  <th className="p-4">Nama Bidang Usaha / Kategori</th>
                  <th className="p-4">Deskripsi Singkat</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30 text-xs">
                {paginatedCategories.map((cat: any) => {
                  const isSelected = selectedCategoryIds.includes(cat.id);

                  return (
                    <tr 
                      key={cat.id} 
                      className={`transition-colors ${
                        isSelected 
                          ? theme === 'dark' ? 'bg-indigo-950/30' : 'bg-indigo-50' 
                          : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleRowSelectToggle(cat.id)}
                          className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                        />
                      </td>
                      <td className="p-4 font-bold text-sm text-indigo-400">{cat.name}</td>
                      <td className="p-4 text-slate-400">{cat.description || '-'}</td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 font-bold transition-all inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* FOOTER NAVIGASI PAGINASI */}
        <div className={`pt-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-xs ${
          theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="text-slate-400">
            Menampilkan <strong className="text-indigo-400">{paginatedCategories.length}</strong> dari total <strong className="text-indigo-400">{filteredCategories.length}</strong> kategori
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className="p-2 rounded-xl border bg-slate-800 border-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-bold">
              Halaman {currentPage} dari {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              className="p-2 rounded-xl border bg-slate-800 border-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* FLOATING BULK ACTION BAR */}
      {selectedCategoryIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-indigo-500/40 backdrop-blur-md px-6 py-4 rounded-3xl shadow-2xl flex items-center space-x-4 text-xs animate-in slide-in-from-bottom-6 duration-300">
          <div className="flex items-center space-x-2 pr-4 border-r border-slate-700">
            <span className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white font-black">
              {selectedCategoryIds.length}
            </span>
            <span className="font-extrabold text-slate-200">Kategori Terpilih</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={isBulkDeleting}
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>Hapus {selectedCategoryIds.length} Kategori</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategoryIds([])}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Batalkan Pilihan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH KATEGORI MANUAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center border-b pb-4 border-inherit">
              <h3 className="text-base font-bold flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-indigo-500" />
                <span>Tambah Kategori Industri Baru</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-red-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Nama Bidang Usaha / Kategori</label>
                <input
                  type="text"
                  required
                  placeholder="Cth: Rekayasa Perangkat Lunak / AI"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Deskripsi Kategori (Opsional)</label>
                <textarea
                  rows={3}
                  placeholder="Cth: Perusahaan yang bergerak di bidang pembuatan aplikasi dan kecerdasan buatan"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
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
                  {submitting ? 'Menyimpan...' : 'Simpan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPORT CSV PERSISTENT KATEGORI INDUSTRI */}
      {showImportModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-xl border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center border-b pb-4 border-inherit">
              <div className="flex items-center space-x-2">
                <FileUp className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-bold">Import CSV Kategori Industri</h3>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-red-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* TOMBOL UNDUH TEMPLATE */}
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex justify-between items-center">
                <div className="space-y-0.5">
                  <p className="font-bold text-indigo-400">Belum punya format CSV?</p>
                  <p className="text-[11px] text-slate-400">Unduh berkas contoh template standar CSV untuk diisi.</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Template</span>
                </button>
              </div>

              {/* UPLOAD FILE ZONE */}
              <div className="space-y-1.5">
                <label className="block font-semibold uppercase tracking-wider text-slate-400">Pilih File CSV Data Kategori</label>
                <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  csvFile ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-700 hover:border-emerald-500/50'
                }`}>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="csv-file-input"
                  />
                  <label htmlFor="csv-file-input" className="cursor-pointer space-y-2 block">
                    <Upload className="w-8 h-8 mx-auto text-emerald-500" />
                    <p className="font-bold text-sm text-slate-200">
                      {csvFile ? csvFile.name : 'Klik untuk memilih atau drop file CSV di sini'}
                    </p>
                    <p className="text-[10px] text-slate-400">Pastikan file bertipe .csv dengan baris header: name, description</p>
                  </label>
                </div>
              </div>

              {csvErrorMsg && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{csvErrorMsg}</span>
                </div>
              )}

              {/* PRATINJAU DATA CSV TERPARSING */}
              {csvPreviewData.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold uppercase text-emerald-400 text-[11px]">Pratinjau CSV Data ({csvPreviewData.length} Kategori Ditemukan)</span>
                  </div>

                  <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2">
                    {csvPreviewData.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                        <span className="font-bold text-indigo-400">{item.name}</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[220px]">{item.description || '(Tanpa deskripsi)'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importProgress && (
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>{importProgress}</span>
                </div>
              )}

              <div className="pt-4 border-t border-inherit flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className={`flex-1 py-3 rounded-xl font-bold border cursor-pointer ${
                    theme === 'dark' ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isImporting || csvPreviewData.length === 0}
                  onClick={handleProcessImport}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Meng-import ke DB...</span>
                    </>
                  ) : (
                    <>
                      <FileUp className="w-4 h-4" />
                      <span>Simpan {csvPreviewData.length} Kategori ke DB</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}