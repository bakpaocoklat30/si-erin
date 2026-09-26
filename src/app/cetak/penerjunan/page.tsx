'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function CetakPenerjunanPage() {
  const searchParams = useSearchParams();
  const industryId = searchParams.get('industryId');
  const department = searchParams.get('department');
  const periodId = searchParams.get('periodId');

  const [school, setSchool] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const resSchool = await fetch('/api/settings/school');
        const jsonSchool = await resSchool.json();
        setSchool(jsonSchool.data || jsonSchool);

        const resGroups = await fetch(`/api/pokja/groups?department=${department || 'Semua Jurusan'}`);
        const jsonGroups = await resGroups.json();
        
        if (jsonGroups.success) {
          const found = jsonGroups.data.find((g: any) => 
            g.industryId === industryId && g.periodId === periodId
          );
          if (found) {
            // Keep only accepted students
            const acceptedStatuses = ['DITERIMA', 'DISETUJUI_INDUSTRI', 'DITERIMA_INDUSTRI', 'COMPLETED'];
            found.students = found.students.filter((s: any) => acceptedStatuses.includes(s.status));
            setGroup(found);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [industryId, department, periodId]);

  if (loading) {
    return <div className="p-10 text-center font-bold">Memuat dokumen surat...</div>;
  }

  if (!group || !school) {
    return <div className="p-10 text-center font-bold text-red-500">Gagal memuat data kelompok atau profil sekolah.</div>;
  }

  const currentDate = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="bg-white text-black min-h-screen">
      {/* 
        A4 Print Layout Setup 
        (Tailwind 'print:' utility ensures these styles apply when printing)
      */}
      <div className="max-w-[210mm] mx-auto p-10 bg-white print:p-0 print:m-0" style={{ minHeight: '297mm' }}>
        
        {/* KOP SURAT */}
        <div className="flex items-center justify-between border-b-4 border-black pb-4 mb-8">
          <div className="w-24 h-24 flex-shrink-0">
            <img src={school.logoUrl || '/images/logo-sekolah.png'} alt="Logo Sekolah" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 text-center px-4">
            <h2 className="text-xl font-bold uppercase tracking-wider">PEMERINTAH PROVINSI JAWA TENGAH</h2>
            <h2 className="text-xl font-bold uppercase tracking-wider">DINAS PENDIDIKAN DAN KEBUDAYAAN</h2>
            <h1 className="text-2xl font-black uppercase mt-1">{school.name}</h1>
            <p className="text-sm mt-1">{school.address}</p>
            <p className="text-sm">Telepon: {school.phone} | Email: {school.email}</p>
          </div>
        </div>

        {/* JUDUL SURAT */}
        <div className="text-center mb-8">
          <h3 className="text-xl font-bold underline">SURAT TUGAS PENERJUNAN PKL</h3>
          <p className="text-sm mt-1">Nomor: ................. / ................. / {new Date().getFullYear()}</p>
        </div>

        {/* ISI SURAT */}
        <div className="space-y-4 text-justify text-sm leading-relaxed">
          <p>
            Yang bertanda tangan di bawah ini, Kepala {school.name}, menugaskan kepada Guru Pembimbing dan Siswa yang namanya tercantum di bawah ini:
          </p>
          
          <div className="px-4">
            <table className="w-full mb-4">
              <tbody>
                <tr>
                  <td className="w-48 font-bold align-top">Tujuan / Industri</td>
                  <td className="w-4 align-top">:</td>
                  <td className="font-bold">{group.industryName}</td>
                </tr>
                <tr>
                  <td className="w-48 font-bold align-top">Alamat Industri</td>
                  <td className="w-4 align-top">:</td>
                  <td>{group.fullAddress || '-'}</td>
                </tr>
                <tr>
                  <td className="w-48 font-bold align-top">Waktu Pelaksanaan</td>
                  <td className="w-4 align-top">:</td>
                  <td>
                    {group.startDate ? new Date(group.startDate).toLocaleDateString('id-ID') : '-'} s.d.{' '}
                    {group.endDate ? new Date(group.endDate).toLocaleDateString('id-ID') : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            Untuk melaksanakan kegiatan Penerjunan Praktik Kerja Lapangan (PKL) pada perusahaan/industri tersebut. Adapun daftar siswa yang ditugaskan adalah sebagai berikut:
          </p>

          {/* TABEL SISWA */}
          <table className="w-full border-collapse border border-black mt-4 mb-4 text-sm text-center">
            <thead>
              <tr>
                <th className="border border-black py-2 px-2 w-10">No</th>
                <th className="border border-black py-2 px-4 text-left">Nama Siswa</th>
                <th className="border border-black py-2 px-4 w-32">NIS / NISN</th>
                <th className="border border-black py-2 px-4 w-48">Kelas / Jurusan</th>
              </tr>
            </thead>
            <tbody>
              {group.students.map((student: any, idx: number) => (
                <tr key={student.id}>
                  <td className="border border-black py-2 px-2">{idx + 1}</td>
                  <td className="border border-black py-2 px-4 text-left font-bold">{student.name}</td>
                  <td className="border border-black py-2 px-4">{student.nis || '-'}</td>
                  <td className="border border-black py-2 px-4">{student.className || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p>
            Demikian surat tugas ini dibuat agar dapat dilaksanakan dengan penuh tanggung jawab. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.
          </p>
        </div>

        {/* TANDA TANGAN */}
        <div className="flex justify-end mt-12 text-sm">
          <div className="text-center w-64">
            <p>Ditetapkan di: {school.address.split(',')[0] || 'Tegal'}</p>
            <p>Pada tanggal: {currentDate}</p>
            <p className="font-bold mt-2">Kepala Sekolah,</p>
            <div className="h-24"></div> {/* Spacing for signature and stamp */}
            <p className="font-bold underline uppercase">{school.headmaster}</p>
            <p>NIP. {school.headmasterNip}</p>
          </div>
        </div>

      </div>

      {/* FLOATING ACTION BUTTON (Only visible on screen, hidden on print) */}
      <div className="fixed bottom-10 right-10 print:hidden flex flex-col gap-3">
        <button 
          onClick={() => window.print()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-full shadow-2xl shadow-indigo-500/50 flex items-center gap-2 transition-all active:scale-95"
        >
          Cetak Dokumen (Print)
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 0; size: A4; }
          body { background: white; -webkit-print-color-adjust: exact; }
        }
      `}} />
    </div>
  );
}
