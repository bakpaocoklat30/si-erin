"use client";

import { useState } from "react";
import { FileText, CheckCircle2, XCircle, Upload, Download, Eye, AlertCircle } from "lucide-react";

interface PengajuanItem {
  id: string;
  namaSiswa: string;
  nisn: string;
  kelas: string;
  industriTujuan: string;
  status: "MENUNGGU_PERSETUJUAN_POKJA" | "SURAT_TERBIT" | "DITOLAK_POKJA" | "DITERIMA_INDUSTRI";
  cvUrl: string;
  suratPengantarUrl: string | null;
}

export default function PokjaPengajuanPage() {
  const [pengajuanList, setPengajuanList] = useState<PengajuanItem[]>([
    {
      id: "peng-1",
      namaSiswa: "Ahmad Fauzi",
      nisn: "0061234567",
      kelas: "XII RPL 1",
      industriTujuan: "PT Teknologi Nusantara",
      status: "MENUNGGU_PERSETUJUAN_POKJA",
      cvUrl: "/uploads/cv/ahmad-fauzi.pdf",
      suratPengantarUrl: null,
    },
    {
      id: "peng-2",
      namaSiswa: "Siti Aminah",
      nisn: "0067654321",
      kelas: "XII TKJ 2",
      industriTujuan: "CV Mandiri Sejahtera",
      status: "SURAT_TERBIT",
      cvUrl: "/uploads/cv/siti-aminah.pdf",
      suratPengantarUrl: "/uploads/surat/surat-pengantar-siti.pdf",
    },
  ]);

  const [selectedPengajuan, setSelectedPengajuan] = useState<PengajuanItem | null>(null);
  const [showModalUpload, setShowModalUpload] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleApproveDanTerbitSurat = (id: string) => {
    setPengajuanList(
      pengajuanList.map((item) =>
        item.id === id ? { ...item, status: "SURAT_TERBIT", suratPengantarUrl: "/uploads/surat/sample.pdf" } : item
      )
    );
    setSuccessMsg("Pengajuan berhasil disetujui dan surat pengantar diterbitkan!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleTolak = (id: string) => {
    setPengajuanList(
      pengajuanList.map((item) => (item.id === id ? { ...item, status: "DITOLAK_POKJA" } : item))
    );
    setSuccessMsg("Pengajuan siswa telah ditolak.");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Halaman */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Validasi & Approval Pengajuan Prakerin</h1>
          <p className="text-sm text-slate-400 mt-1">
            Verifikasi CV siswa, setujui penempatan industri, dan unggah surat pengantar resmi.
          </p>
        </div>
        <div className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-4 py-2 rounded-xl text-sm font-semibold">
          Pokja Portal
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{successMsg}</span>
        </div>
      )}

      {/* Tabel Pengajuan */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Siswa & Kelas</th>
                <th className="p-4 font-semibold">Industri Tujuan</th>
                <th className="p-4 font-semibold">Dokumen CV</th>
                <th className="p-4 font-semibold">Status Pengajuan</th>
                <th className="p-4 font-semibold text-center">Aksi & Validasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
              {pengajuanList.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-white">{item.namaSiswa}</div>
                    <div className="text-xs text-slate-500">NISN: {item.nisn} | {item.kelas}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-slate-200">{item.industriTujuan}</div>
                  </td>
                  <td className="p-4">
                    <a
                      href={item.cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 text-xs font-semibold transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Lihat CV</span>
                    </a>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center space-x-1 ${
                        item.status === "MENUNGGU_PERSETUJUAN_POKJA"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : item.status === "SURAT_TERBIT"
                          ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
                          : item.status === "DITERIMA_INDUSTRI"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-red-500/10 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {item.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      {item.status === "MENUNGGU_PERSETUJUAN_POKJA" ? (
                        <>
                          <button
                            onClick={() => handleApproveDanTerbitSurat(item.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Setujui</span>
                          </button>
                          <button
                            onClick={() => handleTolak(item.id)}
                            className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Telah diproses</span>
                      )}
                    </div>
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