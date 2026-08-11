"use client";

import { useState } from "react";
import { Users, CheckCircle2, Clock, XCircle, AlertTriangle, Building2, FileText } from "lucide-react";

interface SiswaBimbingan {
  id: string;
  nama: string;
  nisn: string;
  kelas: string;
  industriTujuan: string | null;
  statusPengajuan: "BELUM_MENGAJUKAN" | "MENUNGGU_VERIFIKASI" | "DITERIMA" | "DITOLAK";
}

export default function GuruMonitoringPage() {
  const [siswaList, setSiswaList] = useState<SiswaBimbingan[]>([
    {
      id: "sis-1",
      nama: "Ahmad Fauzi",
      nisn: "0061234567",
      kelas: "XII RPL 1",
      industriTujuan: "PT Teknologi Nusantara",
      statusPengajuan: "DITERIMA",
    },
    {
      id: "sis-2",
      nama: "Siti Aminah",
      nisn: "0067654321",
      kelas: "XII RPL 1",
      industriTujuan: "CV Mandiri Sejahtera",
      statusPengajuan: "MENUNGGU_VERIFIKASI",
    },
    {
      id: "sis-3",
      nama: "Budi Santoso",
      nisn: "0069988776",
      kelas: "XII RPL 1",
      industriTujuan: null,
      statusPengajuan: "BELUM_MENGAJUKAN",
    },
  ]);

  // Statistik Ringkas
  const totalSiswa = siswaList.length;
  const diterima = siswaList.filter((s) => s.statusPengajuan === "DITERIMA").length;
  const proses = siswaList.filter((s) => s.statusPengajuan === "MENUNGGU_VERIFIKASI").length;
  const belum = siswaList.filter((s) => s.statusPengajuan === "BELUM_MENGAJUKAN").length;
  const persentaseDiterima = Math.round((diterima / (totalSiswa || 1)) * 100);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Halaman */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Monitoring Siswa Bimbingan</h1>
          <p className="text-sm text-slate-400 mt-1">
            Pantau status penempatan dan progres pengajuan Prakerin siswa di bawah bimbingan Anda (Read-Only).
          </p>
        </div>
        <div className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-4 py-2 rounded-xl text-sm font-semibold">
          Guru Pembimbing Portal
        </div>
      </div>

      {/* Statistik Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Bimbingan</p>
            <h3 className="text-2xl font-bold text-white mt-1">{totalSiswa} Siswa</h3>
          </div>
          <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sudah Diterima</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">{diterima} Siswa</h3>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Menunggu Proses</p>
            <h3 className="text-2xl font-bold text-amber-400 mt-1">{proses} Siswa</h3>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Belum Mengajukan</p>
            <h3 className="text-2xl font-bold text-red-400 mt-1">{belum} Siswa</h3>
          </div>
          <div className="p-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Progress Bar Keseluruhan */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-3">
        <div className="flex justify-between text-sm">
          <span className="font-semibold text-white">Persentase Penempatan Siswa</span>
          <span className="font-bold text-indigo-400">{persentaseDiterima}% Selesai</span>
        </div>
        <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden">
          <div
            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${persentaseDiterima}%` }}
          />
        </div>
      </div>

      {/* Tabel Monitoring Siswa */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white">Daftar Siswa Bimbingan</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Nama & NISN</th>
                <th className="p-4 font-semibold">Kelas</th>
                <th className="p-4 font-semibold">Industri Tujuan</th>
                <th className="p-4 font-semibold">Status Pengajuan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
              {siswaList.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-white">{item.nama}</div>
                    <div className="text-xs text-slate-500">NISN: {item.nisn}</div>
                  </td>
                  <td className="p-4">
                    <span className="text-slate-300">{item.kelas}</span>
                  </td>
                  <td className="p-4">
                    {item.industriTujuan ? (
                      <div className="flex items-center space-x-1.5 text-slate-200">
                        <Building2 className="w-4 h-4 text-indigo-400" />
                        <span>{item.industriTujuan}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">Belum memilih industri</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center space-x-1 ${
                        item.statusPengajuan === "DITERIMA"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : item.statusPengajuan === "MENUNGGU_VERIFIKASI"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : item.statusPengajuan === "BELUM_MENGAJUKAN"
                          ? "bg-red-500/10 text-red-400 border border-red-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {item.statusPengajuan.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}