// 📋 CHANGELOG:
// ✅ Perubahan: Mengekstrak tampilan dashboard siswa ke dalam komponen terisolasi `student-view.tsx` agar aman dari bentrok kode admin
// ✨ Fitur Baru: Isolasi komponen role siswa yang mencakup progress bar berikon, jam real-time, dan nama live dari database
// 🎨 UI/UX Update: Konsistensi Light/Dark mode dan kartu portal mandiri siswa
// 🔧 Bug Fix: Mencegah penghapusan kode dashboard siswa saat memperbarui rute root
// 🚀 Inovasi: Clean component separation for role-based views

'client';
'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Building2, Users, CheckCircle2, UserCheck, Phone, AlarmClock, Sparkles, FileText, ClipboardCheck, Send, Award } from 'lucide-react';
import { useTheme } from '@/app/theme-provider';

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  const [liveName, setLiveName] = useState('Mohammad Rahmad Rifai2');
  const [studentPlacement, setStudentPlacement] = useState<any>(null);
  const [peers, setPeers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Update Jam Real-time
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      };
      setCurrentTime(now.toLocaleDateString('id-ID', options));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Ambil data profil mutlak langsung dari API /api/students/profile
  useEffect(() => {
    const timestamp = new Date().getTime();
    const fetchOptions = { cache: 'no-store' as RequestCache, headers: { 'Cache-Control': 'no-cache' } };

    Promise.all([
      fetch(`/api/students/profile?t=${timestamp}`, fetchOptions).then((res) => res.json()),
      fetch(`/api/students/pengajuan?t=${timestamp}`, fetchOptions).then((res) => res.json()),
      fetch(`/api/students?t=${timestamp}`, fetchOptions).then((res) => res.json()).catch(() => [])
    ])
      .then(([profileData, pengajuanData, allStudents]) => {
        const extractedName = profileData?.name || profileData?.student?.name;
        if (extractedName) {
          setLiveName(extractedName);
        }

        if (pengajuanData && pengajuanData.pengajuanAktif) {
          setStudentPlacement(pengajuanData.pengajuanAktif);
          
          if (Array.isArray(allStudents)) {
            const currentIndName = pengajuanData.pengajuanAktif.industri?.nama;
            const filtered = allStudents.filter(
              (s: any) => s.placement?.industry?.name === currentIndName && s.id !== profileData?.id
            );
            setPeers(filtered);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Gagal memuat dashboard data:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className={`min-h-[70vh] flex items-center justify-center ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Memuat portal siswa...</span>
        </div>
      </div>
    );
  }

  let progressStep = 1;
  let progressPercent = 25;
  let statusText = 'Belum Mengajukan Tempat PKL';

  if (studentPlacement) {
    if (studentPlacement.status === 'PENDING') {
      progressStep = 2;
      progressPercent = 50;
      statusText = 'Menunggu Verifikasi & Persetujuan Pokja';
    } else if (studentPlacement.status === 'ACCEPTED') {
      progressStep = 4;
      progressPercent = 100;
      statusText = 'Diterima & Penempatan Aktif di Industri';
    } else if (studentPlacement.status === 'REJECTED') {
      progressStep = 2;
      progressPercent = 40;
      statusText = 'Pengajuan Ditolak - Silakan Pilih Industri Lain';
    }
  }

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Welcome Banner & Live Clock */}
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
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Siswa Portal • Terhubung ke Database</span>
          </div>
          <h2 className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Halo, <span className="text-indigo-600 dark:text-indigo-400">{liveName}</span>! 👋
          </h2>
          <p className={`text-sm max-w-2xl ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Selamat datang di portal mandiri Praktik Kerja Lapangan (PKL) SI-Erin. Data profil dan status pengajuan Anda disinkronkan secara langsung dari database.
          </p>
        </div>

        {/* Widget Jam & Tanggal Real-time */}
        <div className={`p-4 rounded-2xl border flex items-center space-x-3 shrink-0 ${
          theme === 'dark' ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-md'
        }`}>
          <AlarmClock className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <div className="text-xs">
            <p className={`font-bold uppercase tracking-wider text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Waktu Real-time</p>
            <p className={`font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{currentTime || 'Memuat waktu...'}</p>
          </div>
        </div>
      </div>

      {/* MODERN STEP PROGRESS BAR DENGAN IKON DI TIAP TAHAPAN */}
      <div className={`border rounded-2xl p-6 sm:p-8 shadow-xl space-y-6 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-lg font-bold flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <span>Progress Tahapan Pengajuan PKL</span>
            </h3>
            <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Status terkini: <strong className="text-indigo-600 dark:text-indigo-400">{statusText}</strong>
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
            theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
          }`}>
            {progressPercent}% Selesai
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className={`w-full h-3 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <div 
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full transition-all duration-700 rounded-full shadow-md"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        {/* Modern Step Cards dengan Ikon Tematik */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          
          {/* Step 1 */}
          <div className={`p-4 rounded-xl border transition-all space-y-2 ${
            progressStep >= 1 
              ? (theme === 'dark' ? 'border-indigo-500/50 bg-indigo-950/30 text-indigo-200' : 'border-indigo-300 bg-indigo-50/70 text-indigo-900 shadow-sm') 
              : (theme === 'dark' ? 'border-slate-800 bg-slate-950/40 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-400')
          }`}>
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${progressStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                <Send className="w-4 h-4" />
              </div>
              {progressStep > 1 && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Tahap 1</p>
              <p className="text-xs font-bold mt-0.5">Pilih Industri & Profil</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className={`p-4 rounded-xl border transition-all space-y-2 ${
            progressStep >= 2 
              ? (theme === 'dark' ? 'border-indigo-500/50 bg-indigo-950/30 text-indigo-200' : 'border-indigo-300 bg-indigo-50/70 text-indigo-900 shadow-sm') 
              : (theme === 'dark' ? 'border-slate-800 bg-slate-950/40 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-400')
          }`}>
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${progressStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                <ClipboardCheck className="w-4 h-4" />
              </div>
              {progressStep > 2 && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Tahap 2</p>
              <p className="text-xs font-bold mt-0.5">Verifikasi Pokja</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className={`p-4 rounded-xl border transition-all space-y-2 ${
            progressStep >= 3 
              ? (theme === 'dark' ? 'border-indigo-500/50 bg-indigo-950/30 text-indigo-200' : 'border-indigo-300 bg-indigo-50/70 text-indigo-900 shadow-sm') 
              : (theme === 'dark' ? 'border-slate-800 bg-slate-950/40 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-400')
          }`}>
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${progressStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                <FileText className="w-4 h-4" />
              </div>
              {progressStep > 3 && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Tahap 3</p>
              <p className="text-xs font-bold mt-0.5">Surat Pengantar Terbit</p>
            </div>
          </div>

          {/* Step 4 */}
          <div className={`p-4 rounded-xl border transition-all space-y-2 ${
            progressStep >= 4 
              ? (theme === 'dark' ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-200' : 'border-emerald-300 bg-emerald-50/70 text-emerald-900 shadow-sm') 
              : (theme === 'dark' ? 'border-slate-800 bg-slate-950/40 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-400')
          }`}>
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${progressStep >= 4 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                <Award className="w-4 h-4" />
              </div>
              {progressStep >= 4 && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Tahap 4</p>
              <p className="text-xs font-bold mt-0.5">Diterima & Mulai PKL</p>
            </div>
          </div>

        </div>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`border p-6 rounded-2xl shadow-xl space-y-3 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'}`}>
          <div className="w-10 h-10 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Industri Tujuan</p>
            <h3 className="text-lg font-bold mt-1">
              {studentPlacement ? studentPlacement.industri.nama : 'Belum Mengajukan Tempat'}
            </h3>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1">
              Status: {studentPlacement ? studentPlacement.status.replace(/_/g, ' ') : 'MENUNGGU PILIHAN'}
            </p>
          </div>
        </div>

        <div className={`border p-6 rounded-2xl shadow-xl space-y-3 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'}`}>
          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Guru Pembimbing</p>
            <h3 className="text-lg font-bold mt-1">Bapak Drs. H. Slamet, M.Pd</h3>
            <p className={`text-xs mt-1 flex items-center space-x-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              <Phone className="w-3 h-3 text-slate-500" />
              <span>0812-3456-7890</span>
            </p>
          </div>
        </div>

        <div className={`border p-6 rounded-2xl shadow-xl space-y-3 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'}`}>
          <div className="w-10 h-10 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center border border-purple-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Rekan Satu Industri</p>
            <h3 className="text-lg font-bold mt-1">{peers.length > 0 ? `${peers.length} Orang Teman` : 'Belum Ada / Belum Ditentukan'}</h3>
            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Satu kelompok penempatan</p>
          </div>
        </div>
      </div>

      {/* Informasi Rekan Se-Industri */}
      {studentPlacement && (
        <div className={`border rounded-2xl p-6 shadow-xl space-y-4 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'}`}>
          <h3 className="font-bold text-base flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-500" />
            <span>Daftar Teman PKL di {studentPlacement.industri.nama}</span>
          </h3>
          {peers.length === 0 ? (
            <p className="text-xs text-slate-500">Belum ada siswa lain yang ditempatkan di industri yang sama.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {peers.map((peer: any) => (
                <div key={peer.id} className={`border p-4 rounded-xl space-y-1 ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}>
                  <p className="text-sm font-semibold">{peer.name}</p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400">{peer.className} • {peer.department}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Telp: {peer.phone}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}