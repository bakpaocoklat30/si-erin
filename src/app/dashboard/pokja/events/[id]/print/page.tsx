'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Printer, ArrowLeft, Settings } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function PrintPermitsPage() {
  const { id } = useParams();
  const [isPreview, setIsPreview] = useState(false);
  useEffect(() => { setIsPreview(window.location.search.includes('preview=true')); }, []);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Settings state
  const [nomorSurat, setNomorSurat] = useState('400.14.5.4/.../2026');
  const [hal, setHal] = useState('Permohonan Izin Kegiatan');
  const [tanggalNaskah, setTanggalNaskah] = useState('');
  const [jabatanPengirim, setJabatanPengirim] = useState('Kepala Sekolah');
  const [namaPengirim, setNamaPengirim] = useState('');
  const [nipPengirim, setNipPengirim] = useState('');
  const [golongan, setGolongan] = useState('Pembina Utama Muda. IV/c');
  const [showSettings, setShowSettings] = useState(false);
  const [suratIntro, setSuratIntro] = useState('Sebagai upaya peningkatan mutu lulusan Sekolah Menengah Kejuruan (SMK) yang relevan dengan kebutuhan industri, serta merujuk pada Kurikulum Merdeka yang mewajibkan siswa terjun langsung ke dunia kerja melalui Praktik Kerja Lapangan (PKL), maka dengan ini kami bermaksud mengajukan permohonan untuk menempatkan siswa/siswi kami guna melaksanakan PKL di perusahaan yang Bapak/Ibu pimpin.');
  const [useTte, setUseTte] = useState(false);

  useEffect(() => {
    fetch(`/api/pokja/events/${id}/letters`)
      .then(res => res.json())
      .then(d => {
        if (d.success) {
            setData(d);
            setTanggalNaskah(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }));
            if (d.school) {
               setNamaPengirim(d.school.headmasterName || 'Joko Pramono, S.Pd., M.Ds');
               setNipPengirim(d.school.headmasterNip || '19690316 199802 1 004');
            }
            if (d.event?.letterIntro) {
                setSuratIntro(d.event.letterIntro);
            }
        } else {
            setData({ error: d.error || 'Unknown error from API' });
        }
      })
      .catch(err => {
        setData({ error: err.message });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) return <div className="p-10 text-center">Menyiapkan Surat..</div>;
  if (!data || !data.event) return <div className="p-10 text-center">Data tidak ditemukan: {data?.error || "Empty"}</div>;

  const { event, school, letters } = data;

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white text-black">
      <div className={`print:hidden p-4 bg-white shadow-sm flex items-center justify-between sticky top-0 z-10`}>
        {isPreview ? (
          <div className="text-sm font-bold text-slate-600">Pratinjau Surat</div>
        ) : (
          <Link href="/dashboard/pokja/events" className="flex items-center text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Kegiatan
          </Link>
        )}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700 bg-white px-3 py-2 rounded-lg border cursor-pointer hover:bg-slate-50 font-medium">
            <input type="checkbox" checked={useTte} onChange={e => setUseTte(e.target.checked)} className="rounded" />
            Format TTE
          </label>
          <button onClick={() => setShowSettings(!showSettings)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2">
            <Settings className="w-4 h-4" /> Pengaturan Surat
          </button>
          <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2">
            <Printer className="w-4 h-4" /> Cetak Semua ({letters.length} Surat)
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="print:hidden bg-white p-6 m-4 rounded-xl shadow-sm border border-slate-200 space-y-4 max-w-4xl mx-auto">
          <h3 className="font-bold text-lg mb-2">Pengaturan Atribut Surat</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Nomor Surat</label><input type="text" value={nomorSurat} onChange={e => setNomorSurat(e.target.value)} className="w-full border p-2 rounded" /></div>
            <div><label className="block text-sm font-medium mb-1">Hal</label><input type="text" value={hal} onChange={e => setHal(e.target.value)} className="w-full border p-2 rounded" /></div>
            <div><label className="block text-sm font-medium mb-1">Tanggal Naskah</label><input type="text" value={tanggalNaskah} onChange={e => setTanggalNaskah(e.target.value)} className="w-full border p-2 rounded" /></div>
            <div><label className="block text-sm font-medium mb-1">Jabatan Pengirim</label><input type="text" value={jabatanPengirim} onChange={e => setJabatanPengirim(e.target.value)} className="w-full border p-2 rounded" /></div>
            <div><label className="block text-sm font-medium mb-1">Nama Pengirim</label><input type="text" value={namaPengirim} onChange={e => setNamaPengirim(e.target.value)} className="w-full border p-2 rounded" /></div>
            <div><label className="block text-sm font-medium mb-1">NIP Pengirim</label><input type="text" value={nipPengirim} onChange={e => setNipPengirim(e.target.value)} className="w-full border p-2 rounded" /></div>
            <div><label className="block text-sm font-medium mb-1">Golongan / Jabatan</label><input type="text" value={golongan} onChange={e => setGolongan(e.target.value)} className="w-full border p-2 rounded" /></div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Paragraf Pengantar</label>
            <textarea value={suratIntro} onChange={e => setSuratIntro(e.target.value)} className="w-full border p-2 rounded h-24" />
          </div>
        </div>
      )}

      <div className="py-8 print:py-0 print:p-0 mx-auto w-full max-w-4xl space-y-8 print:space-y-0">
        {letters.length === 0 && (
          <div className="bg-white p-10 text-center rounded-xl shadow">Belum ada siswa yang memiliki penempatan industri.</div>
        )}

        {letters.map((letter: any, idx: number) => (
          <div key={idx} className="bg-white p-10 sm:p-12 shadow-lg print:shadow-none print:w-full print:h-screen print:page-break-after-always rounded-xl text-black font-serif text-[12pt]">
            <div className="text-center mb-4">
              <img src="/images/kop-surat-tugas.png" alt="Kop Surat" className="w-full max-w-[720px] h-auto block mx-auto" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/kop-jateng-smkn1adw.png'; }} />
            </div>

            <div className="flex justify-between mb-8 leading-snug">
              <div>
                <table className="text-[12pt] font-serif">
                  <tbody>
                    <tr><td className="pr-4 align-top">Nomor</td><td className="align-top">: {useTte ? '${nomor_naskah}' : nomorSurat}</td></tr>
                    <tr><td className="pr-4 align-top">Lamp.</td><td className="align-top">: -</td></tr>
                    <tr><td className="pr-4 align-top">Hal</td><td className="align-top">: <strong><em>{hal}</em></strong></td></tr>
                  </tbody>
                </table>
              </div>
              <div className="text-[12pt] text-right">
                <p>{school?.city || 'Adiwerna'}, {useTte ? '${tanggal_naskah}' : tanggalNaskah}</p>
              </div>
            </div>

            <div className="mb-6 text-[12pt] leading-relaxed">
              <div className="font-bold">Kepada</div>
              <div className="font-bold">Yth.Pimpinan {letter.industry.name}</div>
              <div>{letter.industry.address}</div>
            </div>

            <div className="mb-4 text-justify leading-[1.38] text-[12pt]">
              <p className="mb-4">Dengan hormat,</p>
              <p className="mb-4 whitespace-pre-wrap">{suratIntro}</p>
              <p className="mb-4">Adapun identitas siswa yang bersangkutan adalah sebagai berikut:</p>
            </div>

            <table className="w-full border-collapse border border-black mb-6 text-[12pt] font-serif">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-black p-2 w-[5%] text-center font-bold">No.</th>
                  <th className="border border-black p-2 w-[25%] text-center font-bold">Nama Siswa</th>
                  <th className="border border-black p-2 w-[12%] text-center font-bold">NIS</th>
                  <th className="border border-black p-2 w-[12%] text-center font-bold">Kelas</th>
                  <th className="border border-black p-2 w-[31%] text-center font-bold">Waktu & Tempat Kegiatan</th>
                  <th className="border border-black p-2 w-[15%] text-center font-bold">No Hp</th>
                </tr>
              </thead>
              <tbody>
                {letter.students.map((s: any, i: number) => (
                  <tr key={s.id}>
                    <td className="border border-black px-[6px] py-1 text-center">{i + 1}.</td>
                    <td className="border border-black px-[8px] py-1">{s.name.toUpperCase()}</td>
                    <td className="border border-black px-[6px] py-1 text-center">{s.nis}</td>
                    <td className="border border-black px-[6px] py-1 text-center">{s.className}</td>
                    <td className="border border-black px-[6px] py-1 text-[11pt] text-center">
                      {s.participantStartDate || s.participantEndDate || s.participantLocation ? (
                        <>
                          {s.participantStartDate ? formatDate(s.participantStartDate) : formatDate(event.startDate)} s.d. {s.participantEndDate ? formatDate(s.participantEndDate) : formatDate(event.endDate)}
                          {s.participantLocation && <><br/>di {s.participantLocation}</>}
                        </>
                      ) : "Sesuai jadwal"}
                    </td>
                    <td className="border border-black px-[6px] py-1 text-center">{s.phone || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mb-8 leading-[1.35] text-justify text-[12pt]">
              <p>Demikian permohonan kami, atas perhatian dan kerjasamanya kami sampaikan terimakasih.</p>
            </div>

            <div className="flex justify-end text-[12pt]">
              {useTte ? (
                <div className="text-left w-[48%]">
                  <div className="mt-0">{`\${jabatan_pengirim}`}</div>
                  <div className="h-16"></div>
                  <div className="h-[60px] leading-[60px]">{`\${ttd_pengirim}`}</div>
                  <div className="h-10"></div>
                  <div className="font-bold mt-1">{`\${nama_pengirim}`}</div>
                  <div>Pembina Utama Muda. IV/c</div>
                  <div>{`NIP \${nip_pengirim}`}</div>
                </div>
              ) : (
                <div className="text-left w-[48%]">
                  <div>{jabatanPengirim}</div>
                  <div className="h-[65px]"></div>
                  <div className="font-bold mt-2">{namaPengirim}</div>
                  <div>{golongan}</div>
                  <div>NIP {nipPengirim}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @media print {
          body { 
            background-color: white !important; 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page { 
            size: 215.9mm 330.2mm;
            margin: 10mm 15mm 10mm 15mm; 
          }
        }
      `}</style>
    </div>
  );
}
