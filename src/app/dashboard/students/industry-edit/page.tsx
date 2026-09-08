
'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/app/theme-provider';
import { Building2, Save, Loader2, AlertCircle, CheckCircle2, MapPin, Phone, Globe, Info, ExternalLink } from 'lucide-react';

// 🛡️ DATA FALLBACK STATIS 38 PROVINSI SE-INDONESIA
const STATIC_PROVINCES = [
  { id: '11', code: '11', name: 'ACEH' },
  { id: '12', code: '12', name: 'SUMATERA UTARA' },
  { id: '13', code: '13', name: 'SUMATERA BARAT' },
  { id: '14', code: '14', name: 'RIAU' },
  { id: '15', code: '15', name: 'JAMBI' },
  { id: '16', code: '16', name: 'SUMATERA SELATAN' },
  { id: '17', code: '17', name: 'BENGKULU' },
  { id: '18', code: '18', name: 'LAMPUNG' },
  { id: '19', code: '19', name: 'KEPULAUAN BANGKA BELITUNG' },
  { id: '21', code: '21', name: 'KEPULAUAN RIAU' },
  { id: '31', code: '31', name: 'DKI JAKARTA' },
  { id: '32', code: '32', name: 'JAWA BARAT' },
  { id: '33', code: '33', name: 'JAWA TENGAH' },
  { id: '34', code: '34', name: 'DI YOGYAKARTA' },
  { id: '35', code: '35', name: 'JAWA TIMUR' },
  { id: '36', code: '36', name: 'BANTEN' },
  { id: '51', code: '51', name: 'BALI' },
  { id: '52', code: '52', name: 'NUSA TENGGARA BARAT' },
  { id: '53', code: '53', name: 'NUSA TENGGARA TIMUR' },
  { id: '61', code: '61', name: 'KALIMANTAN BARAT' },
  { id: '62', code: '62', name: 'KALIMANTAN TENGAH' },
  { id: '63', code: '63', name: 'KALIMANTAN SELATAN' },
  { id: '64', code: '64', name: 'KALIMANTAN TIMUR' },
  { id: '65', code: '65', name: 'KALIMANTAN UTARA' },
  { id: '71', code: '71', name: 'SULAWESI UTARA' },
  { id: '72', code: '72', name: 'SULAWESI TENGAH' },
  { id: '73', code: '73', name: 'SULAWESI SELATAN' },
  { id: '74', code: '74', name: 'SULAWESI TENGGARA' },
  { id: '75', code: '75', name: 'GORONTALO' },
  { id: '76', code: '76', name: 'SULAWESI BARAT' },
  { id: '81', code: '81', name: 'MALUKU' },
  { id: '82', code: '82', name: 'MALUKU UTARA' },
  { id: '91', code: '91', name: 'PAPUA BARAT' },
  { id: '92', code: '92', name: 'PAPUA' },
  { id: '93', code: '93', name: 'PAPUA SELATAN' },
  { id: '94', code: '94', name: 'PAPUA TENGAH' },
  { id: '95', code: '95', name: 'PAPUA PEGUNUNGAN' },
  { id: '96', code: '96', name: 'PAPUA BARAT DAYA' }
];

// DATA FALLBACK DEFAULT KOTA/KABUPATEN
const STATIC_REGENCIES_MAP: Record<string, Array<{ id: string; code: string; name: string }>> = {
  '34': [ // DI YOGYAKARTA
    { id: '3404', code: '3404', name: 'KABUPATEN SLEMAN' },
    { id: '3402', code: '3402', name: 'KABUPATEN BANTUL' },
    { id: '3471', code: '3471', name: 'KOTA YOGYAKARTA' },
    { id: '3401', code: '3401', name: 'KABUPATEN KULON PROGO' },
    { id: '3403', code: '3403', name: 'KABUPATEN GUNUNGKIDUL' }
  ],
  '33': [ // JAWA TENGAH
    { id: '3328', code: '3328', name: 'KABUPATEN TEGAL' },
    { id: '3376', code: '3376', name: 'KOTA TEGAL' },
    { id: '3374', code: '3374', name: 'KOTA SEMARANG' },
    { id: '3372', code: '3372', name: 'KOTA SURAKARTA' },
    { id: '3302', code: '3302', name: 'KABUPATEN BANYUMAS' }
  ],
  '32': [ // JAWA BARAT
    { id: '3273', code: '3273', name: 'KOTA BANDUNG' },
    { id: '3204', code: '3204', name: 'KABUPATEN BANDUNG' },
    { id: '3275', code: '3275', name: 'KOTA BEKASI' },
    { id: '3276', code: '3276', name: 'KOTA DEPOK' },
    { id: '3271', code: '3271', name: 'KOTA BOGOR' }
  ],
  '31': [ // DKI JAKARTA
    { id: '3171', code: '3171', name: 'KOTA JAKARTA SELATAN' },
    { id: '3172', code: '3172', name: 'KOTA JAKARTA TIMUR' },
    { id: '3173', code: '3173', name: 'KOTA JAKARTA PUSAT' },
    { id: '3174', code: '3174', name: 'KOTA JAKARTA BARAT' },
    { id: '3175', code: '3175', name: 'KOTA JAKARTA UTARA' }
  ]
};

// DATA FALLBACK KECAMATAN STATIS
const STATIC_DISTRICTS_MAP: Record<string, Array<{ id: string; code: string; name: string }>> = {
  '3404': [ // SLEMAN
    { id: '3404070', code: '3404070', name: 'GAMPING' },
    { id: '3404120', code: '3404120', name: 'DEPOK' },
    { id: '3404130', code: '3404130', name: 'NGAGLIK' },
    { id: '3404140', code: '3404140', name: 'SLEMAN' },
    { id: '3404080', code: '3404080', name: 'GODEAN' }
  ],
  '3402': [ // BANTUL
    { id: '3402010', code: '3402010', name: 'BANGUNTAPAN' },
    { id: '3402020', code: '3402020', name: 'SEWON' },
    { id: '3402030', code: '3402030', name: 'KASIHAN' }
  ],
  '3471': [ // KOTA YOGYAKARTA
    { id: '3471010', code: '3471010', name: 'DANUREJAN' },
    { id: '3471020', code: '3471020', name: 'GONDOMANAN' },
    { id: '3471030', code: '3471030', name: 'UMBULHARJO' }
  ]
};

// DATA FALLBACK KELURAHAN & KODE POS STATIS
const STATIC_VILLAGES_MAP: Record<string, Array<{ id: string; code: string; name: string; postalCode: string }>> = {
  '3404070': [ // GAMPING (SLEMAN)
    { id: '3404070001', code: '3404070001', name: 'NOGOTIRTO', postalCode: '55592' },
    { id: '3404070002', code: '3404070002', name: 'TRIHANGGO', postalCode: '55592' },
    { id: '3404070003', code: '3404070003', name: 'AMBARKETAWANG', postalCode: '55592' },
    { id: '3404070004', code: '3404070004', name: 'BANYURADEN', postalCode: '55592' },
    { id: '3404070005', code: '3404070005', name: 'BALECATUR', postalCode: '55592' }
  ],
  '3404120': [ // DEPOK (SLEMAN)
    { id: '3404120001', code: '3404120001', name: 'CATURTUNGGAL', postalCode: '55281' },
    { id: '3404120002', code: '3404120002', name: 'MAGUWOHARJO', postalCode: '55282' },
    { id: '3404120003', code: '3404120003', name: 'CONDONGCATUR', postalCode: '55283' }
  ]
};

// KODE POS DEFAULTS PER DESA/KECAMATAN TERKENAL (CEPAT, TANPA API)
const KNOWN_POSTAL_CODES: Record<string, string> = {
  // --- TANGERANG SELATAN ---
  'pondok jaya': '15224',
  'pondok betung': '15221',
  'jurang mangu timur': '15222',
  'jurang mangu barat': '15223',
  'pondok aren': '15224',
  'pondok karya': '15225',
  'pondok kacang timur': '15226',
  'pondok kacang barat': '15226',
  'perigi': '15227',
  'perigi baru': '15228',
  'pondok pucung': '15229',
  'cipayung': '15411',
  'ciputat': '15411',
  'sawah baru': '15413',
  'sawah lama': '15413',
  'jombang': '15414',
  'serua': '15414',
  'serua indah': '15414',
  'cireundeu': '15419',
  'pisangan': '15419',
  'cempaka putih': '15412',
  'rempoa': '15412',
  'rengas': '15412',
  'pondok ranji': '15412',
  'pondok benda': '15416',
  'benda baru': '15418',
  'bambu apus': '15415',
  'kedaung': '15415',
  'pamulang barat': '15417',
  'pamulang timur': '15417',
  'pondok cabe udik': '15418',
  'pondok cabe ilir': '15418',
  'buaran': '15310',
  'ciater': '15310',
  'cilenggang': '15310',
  'rawa mekar jaya': '15310',
  'rawa buntu': '15318',
  'lengkong gudang': '15321',
  'lengkong gudang timur': '15321',
  'lengkong wetan': '15322',
  'serpong': '15311',
  'lengkong karya': '15320',
  'pakualam': '15320',
  'pakulonan': '15325',
  'paku jaya': '15324',
  'pondok jagung': '15326',
  'pondok jagung timur': '15326',
  'jelupang': '15323',
  'setu': '15314',
  'keranggan': '15312',
  'muncul': '15314',
  'babakan': '15315',
  'bakti jaya': '15315',
  'kademangan': '15313',
  // --- YOGYAKARTA ---
  'nogotirto': '55592',
  'trihanggo': '55291',
  'ambarketawang': '55294',
  'banyuraden': '55293',
  'balecatur': '55295',
  'caturtunggal': '55281',
  'maguwoharjo': '55282',
  'condongcatur': '55283',
  'sinduadi': '55284',
  'sendangadi': '55285',
  'tlogoadi': '55286',
  'gamping': '55592',
  'sleman': '55511',
  'bantul': '55711',
  // --- JAWA BARAT ---
  'bandung': '40111',
  'bekasi': '17111',
  'depok': '16421',
  'bogor': '16111',
  // --- DKI JAKARTA ---
  'jakarta': '10110',
  'menteng': '10310',
  'kebayoran baru': '12110',
  'tebet': '12810',
  'pasar minggu': '12520',
  // --- JAWA TENGAH / TIMUR ---
  'semarang': '50111',
  'surabaya': '60111',
  'malang': '65111',
  'tegal': '52111',
  'solo': '57111',
  'yogyakarta': '55111',
};


export default function IndustryEditPage() {
  const { theme } = useTheme();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [formData, setFormData] = useState<any>({
    name: '',
    address: '',
    rt: '',
    rw: '',
    dusun: '',
    desaKelurahan: '',
    subDistrict: '',
    regency: '',
    province: '',
    postalCode: '',
    latitude: '',
    longitude: '',
    contactPerson: '',
    phone: '',
    fax: '',
    email: '',
    website: '',
    workType: 'Onsite',
    jobDescription: '',
    nib: '',
    npwp: ''
  });

  // STATE UNTUK DROPDOWN RELASIONAL (API)
  const [provinces, setProvinces] = useState<any[]>([]);
  const [regencies, setRegencies] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);

  // STATE KODE WILAYAH AKTIF (Untuk triggering fetch berantai)
  const [selectedProvinceCode, setSelectedProvinceCode] = useState('');
  const [selectedRegencyCode, setSelectedRegencyCode] = useState('');
  const [selectedDistrictCode, setSelectedDistrictCode] = useState('');
  const [selectedVillageCode, setSelectedVillageCode] = useState('');

  // STATUS LOADING FETCH WILAYAH
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingRegencies, setLoadingRegencies] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  // REF LEAFLET MAP
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  useEffect(() => {
    const fetchIndustry = async () => {
      try {
        const res = await fetch('/api/students/industry-edit');
        const json = await res.json();
        
        if (res.ok && json.success) {
          setFormData({
            ...json.data,
            workType: json.data.workType || 'Onsite',
            jobDescription: json.data.jobDescription || ''
          });
        } else {
          setErrorMsg(json.error || 'Gagal memuat data industri.');
        }
      } catch (err) {
        setErrorMsg('Terjadi kesalahan koneksi.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchIndustry();
  }, []);

  // LOAD LEAFLET CSS & JS
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        document.head.appendChild(script);
      }
    }
  }, []);

  // INIT LEAFLET MAP
  const initOpenStreetMap = useCallback((latStr: string, lngStr: string) => {
    if (typeof window === 'undefined' || !(window as any).L || !mapContainerRef.current) return;

    const L = (window as any).L;
    const lat = parseFloat(latStr) || -6.917464;
    const lng = parseFloat(lngStr) || 107.619123;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current).setView([lat, lng], 15);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    markerInstanceRef.current = marker;

    marker.on('dragend', function () {
      const position = marker.getLatLng();
      setFormData((prev: any) => ({
        ...prev,
        latitude: position.lat.toFixed(7),
        longitude: position.lng.toFixed(7)
      }));
    });

    map.on('click', function (e: any) {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      setFormData((prev: any) => ({
        ...prev,
        latitude: lat.toFixed(7),
        longitude: lng.toFixed(7)
      }));
    });
  }, []);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => {
        initOpenStreetMap(formData.latitude, formData.longitude);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [loading, initOpenStreetMap, formData.latitude, formData.longitude]);


  // FETCH REGIONS
  const fetchProvinces = useCallback(async () => {
    setLoadingProvinces(true);
    try {
      const res = await fetch('/api/wilayah?type=provinces');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setProvinces(json.data);
          return;
        }
      }
      setProvinces(STATIC_PROVINCES);
    } catch (err) {
      setProvinces(STATIC_PROVINCES);
    } finally {
      setLoadingProvinces(false);
    }
  }, []);

  useEffect(() => {
    fetchProvinces();
  }, [fetchProvinces]);

  useEffect(() => {
    if (formData.province && provinces.length > 0 && !selectedProvinceCode) {
      const normProv = formData.province.trim().toLowerCase();
      const matchProv = provinces.find((p: any) => {
        const pName = (p.name || '').trim().toLowerCase();
        return pName === normProv || normProv.includes(pName) || pName.includes(normProv);
      });
      if (matchProv) {
        setSelectedProvinceCode(String(matchProv.code || matchProv.id));
      }
    }
  }, [formData.province, provinces, selectedProvinceCode]);

  useEffect(() => {
    if (!selectedProvinceCode) {
      setRegencies([]);
      return;
    }
    let isMounted = true;
    const fetchRegencies = async () => {
      setLoadingRegencies(true);
      try {
        const res = await fetch(`/api/wilayah?type=regencies&provinceId=${selectedProvinceCode}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success && Array.isArray(json.data)) {
            setRegencies(json.data);
            return;
          }
        }
        if (isMounted) setRegencies([]);
      } catch (err) {
        if (isMounted) setRegencies([]);
      } finally {
        if (isMounted) setLoadingRegencies(false);
      }
    };
    fetchRegencies();
    return () => { isMounted = false; };
  }, [selectedProvinceCode]);

  useEffect(() => {
    if (formData.regency && regencies.length > 0 && !selectedRegencyCode) {
      const normReg = formData.regency.trim().toLowerCase();
      const matchReg = regencies.find((r: any) => {
        const rName = (r.name || '').trim().toLowerCase();
        return rName === normReg || normReg.includes(rName) || rName.includes(normReg);
      });
      if (matchReg) setSelectedRegencyCode(String(matchReg.code || matchReg.id));
    }
  }, [formData.regency, regencies, selectedRegencyCode]);

  useEffect(() => {
    if (!selectedRegencyCode) {
      setDistricts([]);
      return;
    }
    let isMounted = true;
    const fetchDistricts = async () => {
      setLoadingDistricts(true);
      try {
        const res = await fetch(`/api/wilayah?type=districts&regencyId=${selectedRegencyCode}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success && Array.isArray(json.data)) {
            setDistricts(json.data);
            return;
          }
        }
        if (isMounted) setDistricts([]);
      } catch (err) {
        if (isMounted) setDistricts([]);
      } finally {
        if (isMounted) setLoadingDistricts(false);
      }
    };
    fetchDistricts();
    return () => { isMounted = false; };
  }, [selectedRegencyCode]);

  useEffect(() => {
    if (formData.subDistrict && districts.length > 0 && !selectedDistrictCode) {
      const normDist = formData.subDistrict.trim().toLowerCase();
      const matchDist = districts.find((d: any) => {
        const dName = (d.name || '').trim().toLowerCase();
        return dName === normDist || normDist.includes(dName) || dName.includes(normDist);
      });
      if (matchDist) setSelectedDistrictCode(String(matchDist.code || matchDist.id));
    }
  }, [formData.subDistrict, districts, selectedDistrictCode]);

  useEffect(() => {
    if (!selectedDistrictCode) {
      setVillages([]);
      return;
    }
    let isMounted = true;
    const fetchVillages = async () => {
      setLoadingVillages(true);
      try {
        const res = await fetch(`/api/wilayah?type=villages&districtId=${selectedDistrictCode}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success && Array.isArray(json.data)) {
            setVillages(json.data);
            return;
          }
        }
        if (isMounted) setVillages([]);
      } catch (err) {
        if (isMounted) setVillages([]);
      } finally {
        if (isMounted) setLoadingVillages(false);
      }
    };
    fetchVillages();
    return () => { isMounted = false; };
  }, [selectedDistrictCode]);

  useEffect(() => {
    if (formData.desaKelurahan && villages.length > 0 && !selectedVillageCode) {
      const normVil = formData.desaKelurahan.trim().toLowerCase();
      const matchVil = villages.find((v: any) => {
        const vName = (v.name || '').trim().toLowerCase();
        return vName === normVil || normVil.includes(vName) || vName.includes(normVil);
      });
      if (matchVil) setSelectedVillageCode(String(matchVil.code || matchVil.id));
    }
  }, [formData.desaKelurahan, villages, selectedVillageCode]);


  // CHANGE HANDLERS
  const handleProvinceChange = (e: any) => {
    const pCode = e.target.value;
    const pName = e.target.options[e.target.selectedIndex].text;
    setSelectedProvinceCode(pCode);
    setFormData((prev: any) => ({ ...prev, province: pCode ? pName : '', regency: '', subDistrict: '', desaKelurahan: '', postalCode: '' }));
    setSelectedRegencyCode('');
    setSelectedDistrictCode('');
    setSelectedVillageCode('');
  };

  const handleRegencyChange = (e: any) => {
    const rCode = e.target.value;
    const rName = e.target.options[e.target.selectedIndex].text;
    setSelectedRegencyCode(rCode);
    setFormData((prev: any) => ({ ...prev, regency: rCode ? rName : '', subDistrict: '', desaKelurahan: '', postalCode: '' }));
    setSelectedDistrictCode('');
    setSelectedVillageCode('');
  };

  const handleDistrictChange = (e: any) => {
    const dCode = e.target.value;
    const dName = e.target.options[e.target.selectedIndex].text;
    setSelectedDistrictCode(dCode);
    setFormData((prev: any) => ({ ...prev, subDistrict: dCode ? dName : '', desaKelurahan: '', postalCode: '' }));
    setSelectedVillageCode('');
  };

  const handleVillageChange = (e: any) => {
    const vCode = e.target.value;
    const vName = e.target.options[e.target.selectedIndex].text;
    setSelectedVillageCode(vCode);

    let foundPostalCode = '';
    if (vCode) {
      const matchVil = villages.find(v => String(v.code || v.id) === String(vCode));
      if (matchVil && matchVil.postalCode) {
        foundPostalCode = matchVil.postalCode;
      }
    }
    
    if (!foundPostalCode && vName) {
      const normV = vName.toLowerCase().trim();
      const normD = (formData.subDistrict || '').toLowerCase().trim();
      if (KNOWN_POSTAL_CODES[normV]) foundPostalCode = KNOWN_POSTAL_CODES[normV];
      else if (KNOWN_POSTAL_CODES[normD]) foundPostalCode = KNOWN_POSTAL_CODES[normD];
    }
    
    setFormData((prev: any) => ({ 
      ...prev, 
      desaKelurahan: vCode ? vName : '',
      postalCode: foundPostalCode || prev.postalCode
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      const res = await fetch('/api/students/industry-edit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      
      if (res.ok && json.success) {
        setSuccessMsg('Data industri berhasil diperbarui!');
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setErrorMsg(json.error || 'Gagal menyimpan data.');
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan jaringan.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen p-6 sm:p-10 space-y-8 transition-colors duration-300 pb-28 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-900'
    }`}>
      
      {/* HEADER BANNER */}
      <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-slate-200/50'
      }`}>
        <div className="space-y-2">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${
            isDark ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
          }`}>
            Lengkapi Identitas Industri
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Data Tempat PKL
          </h1>
          <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Anda dapat berkontribusi untuk melengkapi data industri tempat Anda PKL saat ini agar sesuai dengan kondisi di lapangan.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-sm font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* FORM DATA */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl transition-all ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-slate-200/50'
      }`}>
        <div className="flex items-center space-x-3 mb-6 border-b pb-4 border-inherit">
          <Building2 className={`w-6 h-6 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <h2 className="text-lg font-extrabold">{formData.name || 'Nama Industri'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* SECTION 1: KONTAK & HRD */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-indigo-500 flex items-center space-x-2">
              <Phone className="w-4 h-4" />
              <span>Kontak & Pembimbing Industri</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Nama Pembimbing / HRD</label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="Bpk. Budi (HRD)"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-300 focus:border-indigo-500'
                  }`}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Nomor Telepon / WhatsApp</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="08123456789"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-300 focus:border-indigo-500'
                  }`}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Email Perusahaan</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="hrd@perusahaan.com"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-300 focus:border-indigo-500'
                  }`}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Website</label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="www.perusahaan.com"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-300 focus:border-indigo-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: ALAMAT & KOORDINAT */}
          <div className="space-y-4 pt-4 border-t border-inherit">
            <h3 className="text-sm font-bold text-indigo-500 flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>Alamat Lengkap, Wilayah, & Peta Koordinat</span>
            </h3>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500">Alamat Jalan</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Jl. Merdeka No 123..."
                rows={2}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none resize-none ${
                  isDark ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-300 focus:border-indigo-500'
                }`}
              />
            </div>
            
            {/* DROP DOWN RELASIONAL WILAYAH */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Provinsi</span>
                    {loadingProvinces && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
                  </label>
                  <select
                    value={selectedProvinceCode}
                    onChange={handleProvinceChange}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-bold outline-none cursor-pointer appearance-none bg-no-repeat bg-[right_1rem_center] ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E")' }}
                  >
                    <option value="">-- Pilih Provinsi --</option>
                    {provinces.map((p: any) => (
                      <option key={p.code || p.id} value={p.code || p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Kabupaten/Kota</span>
                    {loadingRegencies && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
                  </label>
                  <select
                    value={selectedRegencyCode}
                    onChange={handleRegencyChange}
                    disabled={!selectedProvinceCode}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-bold outline-none cursor-pointer appearance-none bg-no-repeat bg-[right_1rem_center] disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E")' }}
                  >
                    <option value="">-- Pilih Kab/Kota --</option>
                    {regencies.map((r: any) => (
                      <option key={r.code || r.id} value={r.code || r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Kecamatan</span>
                    {loadingDistricts && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
                  </label>
                  <select
                    value={selectedDistrictCode}
                    onChange={handleDistrictChange}
                    disabled={!selectedRegencyCode}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-bold outline-none cursor-pointer appearance-none bg-no-repeat bg-[right_1rem_center] disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E")' }}
                  >
                    <option value="">-- Pilih Kecamatan --</option>
                    {districts.map((d: any) => (
                      <option key={d.code || d.id} value={d.code || d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Desa/Kelurahan</span>
                    {loadingVillages && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
                  </label>
                  <select
                    value={selectedVillageCode}
                    onChange={handleVillageChange}
                    disabled={!selectedDistrictCode}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-bold outline-none cursor-pointer appearance-none bg-no-repeat bg-[right_1rem_center] disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E")' }}
                  >
                    <option value="">-- Pilih Desa/Kel --</option>
                    {villages.map((v: any) => (
                      <option key={v.code || v.id} value={v.code || v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">RT</label>
                <input
                  type="text"
                  value={formData.rt}
                  onChange={(e) => setFormData({ ...formData, rt: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-300 focus:border-indigo-500'
                  }`}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">RW</label>
                <input
                  type="text"
                  value={formData.rw}
                  onChange={(e) => setFormData({ ...formData, rw: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-300 focus:border-indigo-500'
                  }`}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Kode Pos</label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-300 focus:border-indigo-500'
                  }`}
                />
              </div>
            </div>

            <div className={`p-4 rounded-2xl flex flex-col gap-4 items-start ${
              isDark ? 'bg-indigo-950/20 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-200'
            }`}>
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  Anda dapat menggeser (drag) penanda biru di peta atau mengklik di mana saja pada peta untuk mengatur koordinat tempat PKL.
                </p>
              </div>

              {/* CONTAINER PETA LEAFLET */}
              <div 
                ref={mapContainerRef} 
                className={`w-full h-64 rounded-xl border-2 overflow-hidden z-0 ${
                  isDark ? 'border-slate-800' : 'border-slate-300'
                }`}
              />

              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Latitude</label>
                  <input
                    type="text"
                    value={formData.latitude}
                    onChange={(e) => {
                      setFormData({ ...formData, latitude: e.target.value });
                      initOpenStreetMap(e.target.value, formData.longitude);
                    }}
                    placeholder="-6.917464"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none font-mono ${
                      isDark ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-white border-slate-300 focus:border-indigo-500'
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Longitude</label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={(e) => {
                      setFormData({ ...formData, longitude: e.target.value });
                      initOpenStreetMap(formData.latitude, e.target.value);
                    }}
                    placeholder="107.619123"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none font-mono ${
                      isDark ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-white border-slate-300 focus:border-indigo-500'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: PEKERJAAN & LAINNYA */}
          <div className="space-y-4 pt-4 border-t border-inherit">
            <h3 className="text-sm font-bold text-indigo-500 flex items-center space-x-2">
              <Globe className="w-4 h-4" />
              <span>Detail Pekerjaan & Informasi Perusahaan</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Jenis Pekerjaan</label>
                <select
                  value={formData.workType}
                  onChange={(e) => setFormData({ ...formData, workType: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-300 focus:border-indigo-500'
                  }`}
                >
                  <option value="Onsite">Onsite (Di Kantor)</option>
                  <option value="Remote">Remote (WFH)</option>
                  <option value="Hybrid">Hybrid (Campuran)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">NPWP Perusahaan (Jika Ada)</label>
                <input
                  type="text"
                  value={formData.npwp}
                  onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-300 focus:border-indigo-500'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500">Gambaran Pekerjaan / Jobdesk</label>
              <textarea
                value={formData.jobDescription}
                onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                placeholder="Ceritakan secara singkat apa saja yang Anda kerjakan selama PKL di tempat ini..."
                rows={3}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none resize-none ${
                  isDark ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-300 focus:border-indigo-500'
                }`}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-inherit flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
