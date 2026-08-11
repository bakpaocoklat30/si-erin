// 📋 CHANGELOG:
// ✅ Perubahan: Membangun Halaman "Lihat Teman Satu Kelompok" bagi Siswa untuk melihat anggota tim di DUDI yang sama dan mengunduh Surat Tugas Resmi dari Pokja.
// ✨ Fitur Baru: Student Peer Group Member Directory, Official Letter Lightbox Download, & Group Contact Card.
// 🎨 UI/UX Update: Micro-interactions, theme-adaptive dark/light mode, self-member highlighting, and document viewer modal.
// 🔧 Bug Fix: Menangani skenario siswa yang belum terverifikasi dengan pesan instruksional yang ramah.
// 🚀 Inovasi: Interactive Student Group Collaboration Hub.

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  FileText, 
  Download, 
  Phone, 
  Eye, 
  X, 
  ExternalLink, 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  FileCheck2,
  UserCheck
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import Link from 'next/link';

export default function StudentKelompokPage() {
  const { status } = useSession();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [groupInfo, setGroupInfo] = useState<any>(null);

  // Modal Preview Surat Tugas
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);

  const fetchStudentGroup = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/students/group');
      const json = await res.json();

      if (res.ok && json.success) {
        if (json.hasPlacement) {
          setGroupInfo(json.data);
        } else {
          setGroupInfo(null);
        }
      } else {
        setErrorMsg(json.error || 'Gagal memuat data teman kelompok.');
      }
    } catch (err: any) {
      console.error('Error fetching student group:', err);
      setErrorMsg('Terjadi kesalahan koneksi saat memuat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStudentGroup();
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-screen p-8 flex flex-col justify-center items-center space-y-4 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-400">Memuat Data Teman Satu Kelompok...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* BANNER HEADER */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center space-x-1.5 w-fit">
            <Users className="w-3.5 h-3.5" />
            <span>Portal Anggota Kelompok Prakerin</span>
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Teman Satu Kelompok 👥</h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Lihat daftar teman sekelompok di tempat PKL yang sama serta unduh Surat Tugas Resmi yang diterbitkan oleh Tim Pokja.
          </p>
        </div>

        <Link
          href="/dashboard/students"
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>

      {groupInfo ? (
        <div className="space-y-8">
          
          {/* INFORMASI DUDI & SURAT TUGAS KELOMPOK */}
          <div className={`p-8 rounded-3xl border shadow-xl space-y-6 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-inherit pb-6">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Perusahaan Penempatan</span>
                <h3 className="text-2xl font-black text-indigo-400 flex items-center space-x-2">
                  <Building2 className="w-6 h-6" />
                  <span>{groupInfo.industry?.name}</span>
                </h3>
                <p className="text-xs text-slate-400">{groupInfo.industry?.address}</p>
              </div>

              {/* UNDUH SURAT TUGAS */}
              {groupInfo.suratTugasUrl ? (
                <button
                  type="button"
                  onClick={() => setActivePreviewUrl(groupInfo.suratTugasUrl)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shadow-lg shadow-emerald-600/30 cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Surat Tugas Resmi</span>
                </button>
              ) : (
                <span className="px-4 py-2 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Surat Tugas Sedang Diproses Pokja
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Penanggung Jawab DUDI:</span>
                <span className="font-bold text-slate-200 block">{groupInfo.industry?.contactPerson || '-'}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Telepon Perusahaan:</span>
                <span className="font-bold text-slate-200 block">{groupInfo.industry?.phone || '-'}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Jumlah Anggota Kelompok:</span>
                <span className="font-bold text-indigo-400 block font-mono">{groupInfo.peers?.length || 0} Siswa</span>
              </div>
            </div>
          </div>

          {/* KARTU ANGGOTA TEMAN SEKELOMPOK */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-lg flex items-center space-x-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <span>Daftar Anggota Kelompok</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupInfo.peers?.map((peer: any) => (
                <div
                  key={peer.id}
                  className={`p-6 rounded-3xl border shadow-lg space-y-4 relative overflow-hidden transition-all ${
                    peer.isSelf
                      ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30'
                      : theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center text-lg border border-indigo-500/30">
                      {peer.name?.charAt(0).toUpperCase()}
                    </div>

                    {peer.isSelf && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-indigo-600 text-white shadow-md">
                        Saya
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-black text-base text-slate-100">{peer.name}</h4>
                    <p className="text-xs text-slate-400 font-mono">NIS: {peer.nis}</p>
                    <p className="text-xs font-semibold text-indigo-400">{peer.className} • {peer.department}</p>
                  </div>

                  {peer.phone && (
                    <div className="pt-3 border-t border-inherit flex items-center space-x-2 text-xs text-emerald-400 font-bold">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{peer.phone}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : (
        <div className="p-12 text-center text-slate-400 rounded-3xl border border-slate-800 bg-slate-900/40 space-y-3">
          <Users className="w-12 h-12 mx-auto text-slate-600" />
          <p className="text-sm font-bold text-slate-300">Anda belum terdaftar dalam kelompok prakerin terverifikasi.</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Silakan ajukan tempat PKL pada menu **Pengajuan Tempat PKL** dan tunggu proses verifikasi dari Tim Pokja.
          </p>
        </div>
      )}

      {/* MODAL LIVE PREVIEW DOKUMEN SURAT TUGAS */}
      {activePreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-5 border-b border-inherit flex justify-between items-center">
              <h3 className="font-bold text-sm text-indigo-400 flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Surat Tugas Resmi Permohonan PKL</span>
              </h3>
              <button
                type="button"
                onClick={() => setActivePreviewUrl(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-auto flex justify-center items-center bg-slate-950/60 min-h-[400px]">
              {activePreviewUrl.startsWith('data:application/pdf') || activePreviewUrl.endsWith('.pdf') ? (
                <iframe src={activePreviewUrl} className="w-full h-[550px] rounded-2xl border border-slate-800" title="PDF Preview" />
              ) : (
                <img src={activePreviewUrl} alt="Preview" className="max-w-full max-h-[550px] object-contain rounded-2xl border border-slate-800 shadow-lg" />
              )}
            </div>

            <div className="p-4 border-t border-inherit flex justify-end space-x-3">
              <a
                href={activePreviewUrl}
                download="surat_tugas_resmi_prakerin_sierin"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Unduh Berkas</span>
              </a>
              <button
                type="button"
                onClick={() => setActivePreviewUrl(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}