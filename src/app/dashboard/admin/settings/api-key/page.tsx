'use client';

import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Copy, 
  Check, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Globe, 
  ExternalLink, 
  Code2, 
  Server, 
  BookOpen,
  AlertCircle,
  FileText,
  Users,
  Building2,
  Lock,
  FileDown
} from 'lucide-react';

export default function ApiKeySettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [source, setSource] = useState('');
  const [isFromEnv, setIsFromEnv] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'curl' | 'js' | 'python'>('curl');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await fetch('/api/admin/settings/api-key/download-pdf');
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Gagal mengunduh dokumen PDF');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Dokumentasi_API_SI-ERIN_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || 'Gagal mengunduh file PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const fetchApiKey = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/settings/api-key');
      const data = await res.json();
      if (res.ok && data.success) {
        setApiKey(data.apiKey);
        setSource(data.source);
        setIsFromEnv(data.isFromEnv);
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Gagal memuat API Key' });
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message || 'Gagal terhubung ke server' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKey();
  }, []);

  const handleCopy = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (!confirm('Apakah Anda yakin ingin men-generate ulang API Key? Kunci lama tidak akan bisa digunakan lagi oleh aplikasi eksternal.')) {
      return;
    }
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/settings/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setApiKey(data.apiKey);
        setStatusMsg({ type: 'success', text: 'API Key baru berhasil di-generate!' });
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Gagal men-generate API Key' });
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message || 'Gagal memperbarui API Key' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCustomKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customKeyInput.trim().length < 16) {
      alert('Kunci API kustom minimal harus 16 karakter.');
      return;
    }
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/settings/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'custom', customKey: customKeyInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setApiKey(data.apiKey);
        setShowCustomModal(false);
        setCustomKeyInput('');
        setStatusMsg({ type: 'success', text: 'API Key kustom berhasil disimpan!' });
      } else {
        alert(data.error || 'Gagal menyimpan kunci API');
      }
    } catch (e: any) {
      alert(e.message || 'Gagal menyimpan kunci API');
    } finally {
      setSaving(false);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sierin.sch.id';

  const codeSnippets = {
    curl: `# 1. Mengambil data seluruh industri mitra
curl -X GET "${origin}/api/external/industries" \\
  -H "x-api-key: ${apiKey || 'YOUR_API_KEY'}"

# 2. Mengambil siswa yang PKL di industri tertentu
curl -X GET "${origin}/api/external/industries/cmux.../students" \\
  -H "x-api-key: ${apiKey || 'YOUR_API_KEY'}"

# 3. Mengambil daftar dokumen persuratan
curl -X GET "${origin}/api/external/letters?type=permohonan" \\
  -H "x-api-key: ${apiKey || 'YOUR_API_KEY'}"`,

    js: `// Menggunakan Fetch API atau Axios di Node.js / Browser
const API_URL = '${origin}/api/external';
const API_KEY = '${apiKey || 'YOUR_API_KEY'}';

async function fetchIndustries() {
  const response = await fetch(\`\${API_URL}/industries\`, {
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    }
  });
  const data = await response.json();
  console.log(data);
}

fetchIndustries();`,

    python: `import requests

API_URL = "${origin}/api/external"
API_KEY = "${apiKey || 'YOUR_API_KEY'}"

headers = {
    "x-api-key": API_KEY
}

# Ambil daftar industri mitra
response = requests.get(f"{API_URL}/industries", headers=headers)
print(response.json())`
  };

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200 dark:border-indigo-800">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Integrasi API Eksternal
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Kelola API Key untuk aplikasi pihak ketiga yang membutuhkan data DUDI, siswa PKL, dan dokumen persuratan.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all"
            title="Unduh Dokumentasi Lengkap Endpoint API dalam Format PDF"
          >
            {downloadingPdf ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            <span>{downloadingPdf ? 'Mengunduh PDF...' : 'Unduh PDF Dokumentasi'}</span>
          </button>
          <a
            href="/api/external"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <span>Dokumentasi API</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </a>
          <button
            onClick={fetchApiKey}
            disabled={loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
            title="Refresh API Key"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-semibold ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' 
            : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800'
        }`}>
          {statusMsg.type === 'success' ? <ShieldCheck className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* API KEY CARD */}
      <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600" />
              <span>Kunci API Aktif (Secret Key)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kunci ini digunakan pada header HTTP: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">x-api-key</code> atau <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">Authorization: Bearer &lt;KEY&gt;</code>.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 self-start sm:self-center">
            <Server className="w-3.5 h-3.5" />
            <span>Sumber: {source || 'Database'}</span>
          </span>
        </div>

        {/* INPUT KEY CONTAINER */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              readOnly
              value={loading ? 'Memuat API Key...' : apiKey}
              className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-sm text-slate-900 dark:text-slate-100 pr-24 tracking-wider focus:outline-none"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 rounded-xl transition-all"
                title={showKey ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 rounded-xl transition-all"
                title="Salin Kunci"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Tersalin!' : 'Salin Kunci'}</span>
          </button>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={saving}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
            <span>Generate Kunci Acak Baru</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Ubah ke Kunci Kustom</span>
          </button>

          {isFromEnv && (
            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 ml-auto">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Kunci terkunci oleh variabel lingkungan EXTERNAL_API_KEY di .env</span>
            </span>
          )}
        </div>
      </div>

      {/* ENDPOINTS REFERENCE GRID */}
      <div className="space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-600" />
          <span>Daftar Endpoint API yang Siap Digunakan</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                GET
              </span>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
            <code className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 block truncate">
              /api/external/industries
            </code>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mengambil seluruh data mitra DUDI, profil alamat, kontak person, kuota total, dan sisa kuota.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                GET
              </span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <code className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 block truncate">
              /api/external/industries/:id/students
            </code>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mengambil data siswa yang melaksanakan PKL pada industri spesifik, termasuk pembimbing dan tanggal penempatan.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                GET
              </span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <code className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 block truncate">
              /api/external/students
            </code>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pencarian siswa secara global berdasarkan NIS, kelas, jurusan, serta industri penempatannya.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                GET
              </span>
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <code className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 block truncate">
              /api/external/letters
            </code>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mengambil dokumen persuratan (Surat Permohonan, Surat Tugas, Balasan DUDI, Penarikan, dan SPPD).
            </p>
          </div>
        </div>
      </div>

      {/* CODE EXAMPLE SECTION */}
      <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Code2 className="w-5 h-5 text-indigo-600" />
              <span>Contoh Integrasi untuk Pengembang Eksternal</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kirimkan contoh kode ini kepada developer aplikasi partner untuk integrasi instan.
            </p>
          </div>

          {/* TABS */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('curl')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'curl' 
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              cURL
            </button>
            <button
              onClick={() => setActiveTab('js')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'js' 
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              JavaScript
            </button>
            <button
              onClick={() => setActiveTab('python')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'python' 
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Python
            </button>
          </div>
        </div>

        <div className="relative">
          <pre className="p-4 rounded-2xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
            {codeSnippets[activeTab]}
          </pre>
        </div>
      </div>

      {/* MODAL SET CUSTOM KEY */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Set Kunci API Kustom
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Masukkan kunci API khusus yang Anda tentukan sendiri (minimal 16 karakter acak).
            </p>

            <form onSubmit={handleSaveCustomKey} className="space-y-4">
              <input
                type="text"
                required
                minLength={16}
                value={customKeyInput}
                onChange={(e) => setCustomKeyInput(e.target.value)}
                placeholder="Contoh: partner_secret_key_2026_xyz..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Kunci'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
