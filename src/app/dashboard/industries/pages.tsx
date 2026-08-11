// 📋 CHANGELOG:
// ✅ Perubahan: Pembuatan halaman antarmuka manajemen industri dan kuota PKL
// ✨ Fitur Baru: Tabel interaktif daftar industri mitra, sisa kuota real-time, dan form modal tambah industri
// 🎨 UI/UX Update: Desain kartu statistik dan tabel modern bernuansa gelap (Slate & Indigo)
// 🔧 Bug Fix: Kalkulasi sisa kuota otomatis (total kuota dikurangi jumlah siswa yang ditempatkan)
// 🚀 Inovasi: Client Component dengan state management interaktif

'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, Users, MapPin, Phone, UserCheck, Loader2 } from 'lucide-react';

interface Industry {
  id: string;
  name: string;
  address: string;
  contactPerson: string;
  phone: string;
  totalQuota: number;
  _count: {
    placements: number;
  };
}

export default function IndustriesPage() {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contactPerson: '',
    phone: '',
    totalQuota: 5,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchIndustries = async () => {
    try {
      const res = await fetch('/api/industries');
      const data = await res.json();
      setIndustries(data);
    } catch (error) {
      console.error('Gagal mengambil data industri', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIndustries();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/industries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        setFormData({ name: '', address: '', contactPerson: '', phone: '', totalQuota: 5 });
        fetchIndustries();
      } else {
        alert('Gagal menambah industri.');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-10 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Manajemen Industri & Kuota PKL</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Kelola data perusahaan mitra dan pantau sisa kuota penempatan siswa secara real-time.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-600/30 inline-flex items-center justify-center space-x-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Industri Mitra</span>
        </button>
      </div>

      {/* Content Table / Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {industries.map((ind) => {
            const filled = ind._count.placements;
            const remaining = ind.totalQuota - filled;
            return (
              <div key={ind.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 hover:border-indigo-500/50 transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 bg-indigo-600/10 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${remaining > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                      {remaining > 0 ? `Sisa Kuota: ${remaining}` : 'Kuota Penuh'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-lg">{ind.name}</h3>
                    <p className="text-xs text-slate-400 flex items-center space-x-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{ind.address}</span>
                    </p>
                  </div>

                  <div className="border-t border-slate-800 pt-3 space-y-1.5 text-xs text-slate-400">
                    <p className="flex items-center justify-between">
                      <span className="text-slate-500">Contact Person:</span>
                      <span className="font-medium text-slate-200">{ind.contactPerson}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="text-slate-500">Telepon:</span>
                      <span className="font-medium text-slate-200">{ind.phone}</span>
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-400">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>Terisi: <strong className="text-white">{filled}</strong> / {ind.totalQuota} Siswa</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tambah Industri */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-white">Tambah Industri Mitra Baru</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nama Perusahaan / Industri</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: PT Telkom Indonesia Tbk"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Alamat Lengkap</label>
                <textarea
                  required
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Jl. Contoh No. 123, Kota"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Nama Kontak (CP)</label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Bapak Budi"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">No. Telepon / WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="08123456789"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Total Kuota Siswa PKL</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.totalQuota}
                  onChange={(e) => setFormData({ ...formData, totalQuota: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-semibold transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Simpan Industri</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}