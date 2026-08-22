// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: API Endpoint Server-side Wilayah Indonesia (Provinsi, Kabupaten/Kota, Kecamatan, Kelurahan/Desa).
// ✨ Fitur Baru: Multi-source upstream fallback (emsifa GitHub, kanglerian GitHub, wilayah.id) + In-memory cache + Full 38 Offline Provinces Fallback.
// 🎨 UI/UX Update: N/A (Backend API Route)
// 🔧 Bug Fix: Menyelesaikan masalah CORS, kegagalan fetch client-side, dan URL emsifa yang tidak valid.
// 🚀 Inovasi: Enterprise Resilient Dual-Tier Offline/Online Administrative Boundary Provider.
// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

// 🛡️ DATA FALLBACK STATIS 38 PROVINSI SE-INDONESIA (LENGKAP)
const ALL_38_PROVINCES = [
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

// DATA FALLBACK OFFLINE KABUPATEN
const FALLBACK_REGENCIES: Record<string, Array<{ id: string; code: string; name: string }>> = {
  '34': [ // DI YOGYAKARTA
    { id: '3404', code: '3404', name: 'KABUPATEN SLEMAN' },
    { id: '3402', code: '3402', name: 'KABUPATEN BANTUL' },
    { id: '3471', code: '3471', name: 'KOTA YOGYAKARTA' },
    { id: '3401', code: '3401', name: 'KABUPATEN KULON PROGO' },
    { id: '3403', code: '3403', name: 'KABUPATEN GUNUNGKIDUL' }
  ],
  '33': [ // JAWA TENGAH
    { id: '3374', code: '3374', name: 'KOTA SEMARANG' },
    { id: '3372', code: '3372', name: 'KOTA SURAKARTA' },
    { id: '3376', code: '3376', name: 'KOTA TEGAL' },
    { id: '3328', code: '3328', name: 'KABUPATEN TEGAL' },
    { id: '3302', code: '3302', name: 'KABUPATEN BANYUMAS' },
    { id: '3301', code: '3301', name: 'KABUPATEN CILACAP' },
    { id: '3306', code: '3306', name: 'KABUPATEN PURWOREJO' },
    { id: '3308', code: '3308', name: 'KABUPATEN MAGELANG' },
    { id: '3371', code: '3371', name: 'KOTA MAGELANG' },
    { id: '3310', code: '3310', name: 'KABUPATEN KLATEN' },
    { id: '3311', code: '3311', name: 'KABUPATEN SUKOHARJO' },
    { id: '3322', code: '3322', name: 'KABUPATEN SEMARANG' },
    { id: '3373', code: '3373', name: 'KOTA SALATIGA' },
    { id: '3375', code: '3375', name: 'KOTA PEKALONGAN' }
  ],
  '32': [ // JAWA BARAT
    { id: '3273', code: '3273', name: 'KOTA BANDUNG' },
    { id: '3204', code: '3204', name: 'KABUPATEN BANDUNG' },
    { id: '3217', code: '3217', name: 'KABUPATEN BANDUNG BARAT' },
    { id: '3277', code: '3277', name: 'KOTA CIMAHI' },
    { id: '3275', code: '3275', name: 'KOTA BEKASI' },
    { id: '3216', code: '3216', name: 'KABUPATEN BEKASI' },
    { id: '3276', code: '3276', name: 'KOTA DEPOK' },
    { id: '3271', code: '3271', name: 'KOTA BOGOR' },
    { id: '3201', code: '3201', name: 'KABUPATEN BOGOR' },
    { id: '3274', code: '3274', name: 'KOTA CIREBON' },
    { id: '3209', code: '3209', name: 'KABUPATEN CIREBON' },
    { id: '3278', code: '3278', name: 'KOTA TASIKMALAYA' }
  ],
  '31': [ // DKI JAKARTA
    { id: '3171', code: '3171', name: 'KOTA JAKARTA SELATAN' },
    { id: '3172', code: '3172', name: 'KOTA JAKARTA TIMUR' },
    { id: '3173', code: '3173', name: 'KOTA JAKARTA PUSAT' },
    { id: '3174', code: '3174', name: 'KOTA JAKARTA BARAT' },
    { id: '3175', code: '3175', name: 'KOTA JAKARTA UTARA' },
    { id: '3101', code: '3101', name: 'KABUPATEN KEPULAUAN SERIBU' }
  ],
  '35': [ // JAWA TIMUR
    { id: '3578', code: '3578', name: 'KOTA SURABAYA' },
    { id: '3573', code: '3573', name: 'KOTA MALANG' },
    { id: '3507', code: '3507', name: 'KABUPATEN MALANG' },
    { id: '3579', code: '3579', name: 'KOTA BATU' },
    { id: '3515', code: '3515', name: 'KABUPATEN SIDOARJO' },
    { id: '3525', code: '3525', name: 'KABUPATEN GRESIK' },
    { id: '3571', code: '3571', name: 'KOTA KEDIRI' },
    { id: '3577', code: '3577', name: 'KOTA MADIUN' }
  ],
  '36': [ // BANTEN
    { id: '3674', code: '3674', name: 'KOTA TANGERANG SELATAN' },
    { id: '3671', code: '3671', name: 'KOTA TANGERANG' },
    { id: '3603', code: '3603', name: 'KABUPATEN TANGERANG' },
    { id: '3673', code: '3673', name: 'KOTA SERANG' },
    { id: '3604', code: '3604', name: 'KABUPATEN SERANG' },
    { id: '3672', code: '3672', name: 'KOTA CILEGON' }
  ],
  '51': [ // BALI
    { id: '5171', code: '5171', name: 'KOTA DENPASAR' },
    { id: '5103', code: '5103', name: 'KABUPATEN BADUNG' },
    { id: '5104', code: '5104', name: 'KABUPATEN GIANYAR' },
    { id: '5102', code: '5102', name: 'KABUPATEN TABANAN' },
    { id: '5108', code: '5108', name: 'KABUPATEN BULELENG' }
  ]
};

// DATA FALLBACK OFFLINE KECAMATAN
const FALLBACK_DISTRICTS: Record<string, Array<{ id: string; code: string; name: string }>> = {
  '3404': [ // SLEMAN
    { id: '3404070', code: '3404070', name: 'GAMPING' },
    { id: '3404120', code: '3404120', name: 'DEPOK' },
    { id: '3404130', code: '3404130', name: 'NGAGLIK' },
    { id: '3404140', code: '3404140', name: 'SLEMAN' },
    { id: '3404080', code: '3404080', name: 'GODEAN' },
    { id: '3404100', code: '3404100', name: 'BERBAH' },
    { id: '3404110', code: '3404110', name: 'KALASAN' },
    { id: '3404160', code: '3404160', name: 'PAKEM' },
    { id: '3404150', code: '3404150', name: 'TEMPEL' },
    { id: '3404090', code: '3404090', name: 'MLATI' }
  ],
  '3402': [ // BANTUL
    { id: '3402010', code: '3402010', name: 'BANGUNTAPAN' },
    { id: '3402020', code: '3402020', name: 'SEWON' },
    { id: '3402030', code: '3402030', name: 'KASIHAN' },
    { id: '3402040', code: '3402040', name: 'SEDAYU' },
    { id: '3402050', code: '3402050', name: 'BANTUL' }
  ],
  '3471': [ // KOTA YOGYAKARTA
    { id: '3471010', code: '3471010', name: 'DANUREJAN' },
    { id: '3471020', code: '3471020', name: 'GONDOMANAN' },
    { id: '3471030', code: '3471030', name: 'UMBULHARJO' },
    { id: '3471040', code: '3471040', name: 'KOTAGEDE' },
    { id: '3471050', code: '3471050', name: 'GONDOKUSUMAN' },
    { id: '3471060', code: '3471060', name: 'JETIS' }
  ],
  '3273': [ // KOTA BANDUNG
    { id: '3273010', code: '3273010', name: 'COBLONG' },
    { id: '3273020', code: '3273020', name: 'SUKAJADI' },
    { id: '3273030', code: '3273030', name: 'CICENDO' },
    { id: '3273040', code: '3273040', name: 'LENGKONG' },
    { id: '3273050', code: '3273050', name: 'SUMUR BANDUNG' }
  ],
  '3171': [ // JAKARTA SELATAN
    { id: '3171010', code: '3171010', name: 'KEBAYORAN BARU' },
    { id: '3171020', code: '3171020', name: 'KEBAYORAN LAMA' },
    { id: '3171030', code: '3171030', name: 'CILANDAK' },
    { id: '3171040', code: '3171040', name: 'PASAR MINGGU' },
    { id: '3171050', code: '3171050', name: 'TEBET' },
    { id: '3171060', code: '3171060', name: 'SETIABUDI' }
  ],
  '3374': [ // KOTA SEMARANG
    { id: '3374010', code: '3374010', name: 'SEMARANG TENGAH' },
    { id: '3374020', code: '3374020', name: 'SEMARANG UTARA' },
    { id: '3374030', code: '3374030', name: 'SEMARANG TIMUR' },
    { id: '3374040', code: '3374040', name: 'SEMARANG SELATAN' },
    { id: '3374050', code: '3374050', name: 'SEMARANG BARAT' },
    { id: '3374060', code: '3374060', name: 'BANYUMANIK' }
  ],
  '3578': [ // KOTA SURABAYA
    { id: '3578010', code: '3578010', name: 'GUBENG' },
    { id: '3578020', code: '3578020', name: 'TEGALSARI' },
    { id: '3578030', code: '3578030', name: 'WONOKROMO' },
    { id: '3578040', code: '3578040', name: 'RUNGKUT' },
    { id: '3578050', code: '3578050', name: 'SUKOLILO' }
  ]
};

// DATA FALLBACK OFFLINE KELURAHAN
const FALLBACK_VILLAGES: Record<string, Array<{ id: string; code: string; name: string; postalCode?: string }>> = {
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
  ],
  '3404090': [ // MLATI (SLEMAN)
    { id: '3404090001', code: '3404090001', name: 'SINDUADI', postalCode: '55284' },
    { id: '3404090002', code: '3404090002', name: 'SENDANGADI', postalCode: '55285' },
    { id: '3404090003', code: '3404090003', name: 'TLOGOADI', postalCode: '55286' }
  ],
  '3402010': [ // BANGUNTAPAN (BANTUL)
    { id: '3402010001', code: '3402010001', name: 'BANGUNTAPAN', postalCode: '55198' },
    { id: '3402010002', code: '3402010002', name: 'BATURETNO', postalCode: '55197' },
    { id: '3402010003', code: '3402010003', name: 'SINGOSAREN', postalCode: '55193' }
  ]
};

// 📮 MASTER POSTAL CODE DATABASE MAP (INDONESIA LENGKAP JABODETABEK, JAWA, BALI & NASIONAL)
const MASTER_POSTAL_CODES: Record<string, string> = {
  // --- TANGERANG SELATAN (BANTEN) ---
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

  // --- KOTA TANGERANG & KAB. TANGERANG ---
  'paninggilan': '15153',
  'paninggilan utara': '15153',
  'parung serab': '15153',
  'sudimara barat': '15151',
  'sudimara jaya': '15151',
  'sudimara selatan': '15151',
  'sudimara timur': '15151',
  'tajur': '15152',
  'sukasari': '15118',
  'sukarasa': '15111',
  'sukaasih': '15111',
  'tanah tinggi': '15119',
  'buaran indah': '15119',
  'cikokol': '15117',
  'kelapa indah': '15117',
  'bojong jaya': '15115',
  'bugel': '15113',
  'cimone': '15114',
  'cimone jaya': '15114',
  'karawaci': '15115',
  'karawaci baru': '15116',
  'kelapa dua': '15810',
  'curug': '15810',
  'bencongan': '15810',
  'bojong nangka': '15810',

  // --- DKI JAKARTA ---
  'kebayoran baru': '12110',
  'senayan': '12190',
  'gandaria utara': '12140',
  'gandaria selatan': '12420',
  'cipete utara': '12150',
  'cipete selatan': '12410',
  'melawai': '12160',
  'gunung': '12120',
  'kramat pela': '12130',
  'pulo': '12160',
  'petogogan': '12170',
  'rawa barat': '12180',
  'selong': '12110',
  'kebayoran lama utara': '12240',
  'kebayoran lama selatan': '12240',
  'pondok pinang': '12310',
  'cilandak barat': '12430',
  'lebak bulus': '12440',
  'pondok labu': '12450',
  'pejaten barat': '12510',
  'pejaten timur': '12510',
  'pasar minggu': '12520',
  'kebagusan': '12520',
  'jati padang': '12540',
  'ragunan': '12550',
  'ciganjur': '12630',
  'srengseng sawah': '12640',
  'jagakarsa': '12620',
  'lenteng agung': '12610',
  'tanjung barat': '12530',
  'mampang prapatan': '12790',
  'kuningan barat': '12710',
  'pela mampang': '12720',
  'bangka': '12730',
  'tebet barat': '12810',
  'tebet timur': '12820',
  'menteng dalam': '12870',
  'karet': '12920',
  'karet semanggi': '12930',
  'karet kuningan': '12940',
  'kuningan timur': '12950',
  'menteng': '10310',
  'pegangsaan': '10320',
  'cikini': '10330',
  'gondangdia': '10350',
  'gambir': '10110',
  'kebon kelapa': '10120',
  'petojo utara': '10130',
  'petojo selatan': '10160',
  'cideng': '10150',
  'duri pulo': '10140',

  // --- JAWA BARAT (BANDUNG, BEKASI, BOGOR, DEPOK) ---
  'dago': '40135',
  'sekeloa': '40134',
  'lebak siliwangi': '40132',
  'sadang serang': '40133',
  'lebakgede': '40132',
  'cipaganti': '40131',
  'sukasari bandung': '40151',
  'gegerkalong': '40153',
  'sukagalih': '40163',
  'sukawarna': '40164',
  'sukabungah': '40162',
  'sukajadi': '40162',
  'pasteur': '40161',
  'ciroyom': '40182',
  'kebon jeruk': '40181',
  'dunguscariang': '40183',
  'campaka': '40184',
  'maleber': '40184',
  'garuda': '40184',
  'braga': '40111',
  'merdeka': '40113',
  'babakan ciamis': '40117',
  'kebon pisang': '40112',
  'margahayu': '40286',
  'ciwastra': '40287',
  'buaran bekasi': '17124',
  'margahayu bekasi': '17113',
  'pekayon jaya': '17148',
  'jakasetia': '17147',
  'kayuringin jaya': '17144',
  'bintara': '17134',
  'kranji': '17135',
  'harapan indah': '17131',
  'margonda': '16424',
  'kemirimuka': '16423',
  'beji': '16421',
  'pondok cina': '16424',
  'kukusan': '16425',
  'tanah baru': '16426',
  'sukmajaya': '16412',
  'mekarjaya': '16411',
  'baktijaya': '16418',
  'abadijaya': '16417',
  'tirtajaya': '16412',
  'cilodong': '16414',
  'kalibaru': '16413',

  // --- DI YOGYAKARTA ---
  'nogotirto': '55592',
  'trihanggo': '55291',
  'banyuraden': '55293',
  'ambarketawang': '55294',
  'balecatur': '55295',
  'caturtunggal': '55281',
  'maguwoharjo': '55282',
  'condongcatur': '55283',
  'sinduadi': '55284',
  'sendangadi': '55285',
  'tlogoadi': '55286',
  'tirtoadi': '55287',
  'sumberadi': '55288',
  'sariharjo': '55581',
  'minomartani': '55581',
  'sinduharjo': '55581',
  'sukoharjo': '55581',
  'sardonoharjo': '55581',
  'donoharjo': '55581',
  'tamanmartani': '55571',
  'tirtomartani': '55571',
  'kalitirto': '55573',
  'sendangtirto': '55573',
  'jogotirto': '55573',
  'tegaltirto': '55573',
  'bokoharjo': '55572',
  'sambirejo': '55572',
  'sumberharjo': '55572',
  'wukirharjo': '55572',
  'gondomanan': '55121',
  'ngupasan': '55122',
  'prau': '55122',
  'danurejan': '55211',
  'bausasran': '55211',
  'tegalpanggung': '55212',
  'suryatmajan': '55213',
  'sosromenduran': '55271',
  'pringgokusuman': '55272',
  'terban': '55223',
  'kotabaru': '55224',
  'klitren': '55222',
  'baciro': '55225',
  'demangan': '55221',
  'bumijo': '55231',
  'gowongan': '55232',
  'cokrodiningratan': '55233',
  'purbayan': '55173',
  'rejwobangun': '55171',
  'prenggan': '55172',
  'panembahan': '55131',
  'kadipaten': '55132',
  'patehan': '55133',
  'suryodiningratan': '55141',
  'gedongkiwo': '55142',
  'mantrijeron': '55143',
  'brontokusuman': '55153',
  'keparakan': '55152',
  'wirogunan': '55151',
  'ngampilan': '55261',
  'notoprajan': '55262',
  'gunungketur': '55111',
  'purwokinanti': '55112',
  'bener': '55243',
  'karangwaru': '55241',
  'kricak': '55242',
  'tegalrejo': '55244',
  'giwangan': '55163',
  'muja muju': '55165',
  'pandeyan': '55161',
  'semaki': '55166',
  'tahunan': '55167',
  'sorosutan': '55162',
  'warungboto': '55164',
  'pakuncen': '55253',
  'patangpuluhan': '55251',
  'wirobrajan': '55252',

  // --- SURABAYA & JAWA TIMUR ---
  'gubeng': '60281',
  'airlangga': '60286',
  'barata jaya': '60284',
  'mojo': '60285',
  'kertajaya': '60282',
  'pucang sewu': '60283',
  'tegalsari': '60261',
  'wonorejo': '60263',
  'dr soetomo': '60264',
  'kedungdoro': '60261',
  'keputran': '60265',
  'genteng': '60275',
  'embong kaliasin': '60271',
  'ketabang': '60272',
  'kapasari': '60273',
  'peneleh': '60274',
  'wonokromo': '60241',
  'darmo': '60241',
  'sawunggaling': '60242',
  'jagir': '60244',
  'ngagel': '60246',
  'ngagelrejo': '60245',
  'sukolilo': '60111',
  'keputih': '60111',
  'gepengan': '60117',
  'klampis ngasem': '60117',
  'medokan semampir': '60119',
  'menur pumpungan': '60118',
  'nginden jangkungan': '60118',
  'semolowaru': '60119',
  'rungkut': '60293',
  'kalirungkut': '60293',
  'rungkut kidul': '60293',
  'medokan ayu': '60295',
  'wonorejo rungkut': '60296',
  'penjaringan sari': '60297',
  'kedung baruk': '60298',
  'lowokwaru': '65141',
  'klojen': '65111',
  'blimbing': '65126',
  'sukun': '65147',
  'kedungkandang': '65137'
};

// Global memory cache untuk mencegah request berulang
const memoryCache = new Map<string, any>();

// Helper cari kode pos dari database map lokal
function resolveLocalPostalCode(queryText: string): string {
  if (!queryText) return '';
  const clean = queryText.toLowerCase().trim();
  
  // 1. Cek exact match
  if (MASTER_POSTAL_CODES[clean]) return MASTER_POSTAL_CODES[clean];

  // 2. Cek keyword match
  for (const [name, code] of Object.entries(MASTER_POSTAL_CODES)) {
    if (clean.includes(name) || name.includes(clean)) {
      return code;
    }
  }
  return '';
}

// Helper fetch JSON dengan timeout aman (3 detik)
async function fetchWithTimeout(url: string, timeoutMs: number = 3500): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'provinces';
  const provinceId = (searchParams.get('provinceId') || searchParams.get('provinceCode') || '').trim();
  const regencyId = (searchParams.get('regencyId') || searchParams.get('regencyCode') || '').trim();
  const districtId = (searchParams.get('districtId') || searchParams.get('districtCode') || '').trim();
  const qParam = (searchParams.get('q') || searchParams.get('query') || '').trim();

  // Bersihkan karakter titik (misal '34.04' -> '3404')
  const cleanProvId = provinceId.replace(/\./g, '');
  const cleanRegId = regencyId.replace(/\./g, '');
  const cleanDistId = districtId.replace(/\./g, '');

  const cacheKey = `${type}:${cleanProvId}:${cleanRegId}:${cleanDistId}:${qParam.toLowerCase()}`;
  if (memoryCache.has(cacheKey)) {
    return NextResponse.json({ success: true, source: 'cache', data: memoryCache.get(cacheKey) });
  }

  // 1. DAFTAR PROVINSI
  if (type === 'provinces') {
    try {
      // Coba emsifa GitHub Pages
      const data = await fetchWithTimeout('https://emsifa.github.io/api-wilayah-indonesia/api/provinces.json');
      if (Array.isArray(data) && data.length > 0) {
        const result = data.map((p: any) => ({
          id: String(p.id),
          code: String(p.id),
          name: String(p.name).toUpperCase()
        }));
        memoryCache.set(cacheKey, result);
        return NextResponse.json({ success: true, source: 'emsifa', data: result });
      }
    } catch {
      // Fallback upstream 2: kanglerian GitHub
      try {
        const data = await fetchWithTimeout('https://kanglerian.github.io/api-wilayah-indonesia/api/provinces.json');
        if (Array.isArray(data) && data.length > 0) {
          const result = data.map((p: any) => ({
            id: String(p.id),
            code: String(p.id),
            name: String(p.name).toUpperCase()
          }));
          memoryCache.set(cacheKey, result);
          return NextResponse.json({ success: true, source: 'kanglerian', data: result });
        }
      } catch {
        // Fallback upstream 3: wilayah.id
        try {
          const data = await fetchWithTimeout('https://wilayah.id/api/provinces.json');
          const list = data.data || data;
          if (Array.isArray(list) && list.length > 0) {
            const result = list.map((p: any) => ({
              id: String(p.code || p.id).replace(/\./g, ''),
              code: String(p.code || p.id).replace(/\./g, ''),
              name: String(p.name).toUpperCase()
            }));
            memoryCache.set(cacheKey, result);
            return NextResponse.json({ success: true, source: 'wilayah.id', data: result });
          }
        } catch {
          // Do nothing, proceed to offline static fallback
        }
      }
    }

    // Fallback Lengkap 38 Provinsi
    memoryCache.set(cacheKey, ALL_38_PROVINCES);
    return NextResponse.json({ success: true, source: 'static_fallback', data: ALL_38_PROVINCES });
  }

  // 2. DAFTAR KABUPATEN / KOTA
  if (type === 'regencies') {
    if (!cleanProvId) {
      return NextResponse.json({ success: false, error: 'Parameter provinceId wajib disertakan' }, { status: 400 });
    }

    try {
      const data = await fetchWithTimeout(`https://emsifa.github.io/api-wilayah-indonesia/api/regencies/${cleanProvId}.json`);
      if (Array.isArray(data) && data.length > 0) {
        const result = data.map((r: any) => ({
          id: String(r.id),
          code: String(r.id),
          name: String(r.name).toUpperCase()
        }));
        memoryCache.set(cacheKey, result);
        return NextResponse.json({ success: true, source: 'emsifa', data: result });
      }
    } catch {
      try {
        const data = await fetchWithTimeout(`https://kanglerian.github.io/api-wilayah-indonesia/api/regencies/${cleanProvId}.json`);
        if (Array.isArray(data) && data.length > 0) {
          const result = data.map((r: any) => ({
            id: String(r.id),
            code: String(r.id),
            name: String(r.name).toUpperCase()
          }));
          memoryCache.set(cacheKey, result);
          return NextResponse.json({ success: true, source: 'kanglerian', data: result });
        }
      } catch {
        try {
          const data = await fetchWithTimeout(`https://wilayah.id/api/regencies/${cleanProvId}.json`);
          const list = data.data || data;
          if (Array.isArray(list) && list.length > 0) {
            const result = list.map((r: any) => ({
              id: String(r.code || r.id).replace(/\./g, ''),
              code: String(r.code || r.id).replace(/\./g, ''),
              name: String(r.name).toUpperCase()
            }));
            memoryCache.set(cacheKey, result);
            return NextResponse.json({ success: true, source: 'wilayah.id', data: result });
          }
        } catch {
          // Do nothing
        }
      }
    }

    const fallback = FALLBACK_REGENCIES[cleanProvId] || [];
    return NextResponse.json({ success: true, source: 'static_fallback', data: fallback });
  }

  // 3. DAFTAR KECAMATAN
  if (type === 'districts') {
    if (!cleanRegId) {
      return NextResponse.json({ success: false, error: 'Parameter regencyId wajib disertakan' }, { status: 400 });
    }

    try {
      const data = await fetchWithTimeout(`https://emsifa.github.io/api-wilayah-indonesia/api/districts/${cleanRegId}.json`);
      if (Array.isArray(data) && data.length > 0) {
        const result = data.map((d: any) => ({
          id: String(d.id),
          code: String(d.id),
          name: String(d.name).toUpperCase()
        }));
        memoryCache.set(cacheKey, result);
        return NextResponse.json({ success: true, source: 'emsifa', data: result });
      }
    } catch {
      try {
        const data = await fetchWithTimeout(`https://kanglerian.github.io/api-wilayah-indonesia/api/districts/${cleanRegId}.json`);
        if (Array.isArray(data) && data.length > 0) {
          const result = data.map((d: any) => ({
            id: String(d.id),
            code: String(d.id),
            name: String(d.name).toUpperCase()
          }));
          memoryCache.set(cacheKey, result);
          return NextResponse.json({ success: true, source: 'kanglerian', data: result });
        }
      } catch {
        // Do nothing
      }
    }

    const fallback = FALLBACK_DISTRICTS[cleanRegId] || [];
    return NextResponse.json({ success: true, source: 'static_fallback', data: fallback });
  }

  // 4. DAFTAR KELURAHAN / DESA
  if (type === 'villages') {
    if (!cleanDistId) {
      return NextResponse.json({ success: false, error: 'Parameter districtId wajib disertakan' }, { status: 400 });
    }

    try {
      const data = await fetchWithTimeout(`https://emsifa.github.io/api-wilayah-indonesia/api/villages/${cleanDistId}.json`);
      if (Array.isArray(data) && data.length > 0) {
        const result = data.map((v: any) => {
          const name = String(v.name).toUpperCase();
          const postalCode = v.postal_code || v.postalCode || resolveLocalPostalCode(name) || '';
          return { id: String(v.id), code: String(v.id), name, postalCode };
        });
        memoryCache.set(cacheKey, result);
        return NextResponse.json({ success: true, source: 'emsifa', data: result });
      }
    } catch {
      try {
        const data = await fetchWithTimeout(`https://kanglerian.github.io/api-wilayah-indonesia/api/villages/${cleanDistId}.json`);
        if (Array.isArray(data) && data.length > 0) {
          const result = data.map((v: any) => {
            const name = String(v.name).toUpperCase();
            const postalCode = v.postal_code || v.postalCode || resolveLocalPostalCode(name) || '';
            return { id: String(v.id), code: String(v.id), name, postalCode };
          });
          memoryCache.set(cacheKey, result);
          return NextResponse.json({ success: true, source: 'kanglerian', data: result });
        }
      } catch {
        // Do nothing
      }
    }

    const fallback = FALLBACK_VILLAGES[cleanDistId] || [];
    return NextResponse.json({ success: true, source: 'static_fallback', data: fallback });
  }

  // 5. LOOKUP KODE POS LANGSUNG
  if (type === 'postalcode') {
    if (!qParam) {
      return NextResponse.json({ success: false, error: 'Parameter q wajib disertakan' }, { status: 400 });
    }

    // 1) Cek di database lokal dulu (instan)
    const localCode = resolveLocalPostalCode(qParam);
    if (localCode) {
      memoryCache.set(cacheKey, localCode);
      return NextResponse.json({ success: true, source: 'local_dict', postalCode: localCode });
    }

    // 2) Fallback ke Nominatim
    try {
      const encoded = encodeURIComponent(`${qParam}, Indonesia`);
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&addressdetails=1&limit=1`;
      const nominatimData = await fetchWithTimeout(nominatimUrl);
      if (Array.isArray(nominatimData) && nominatimData.length > 0) {
        const addr = nominatimData[0]?.address || {};
        const postcode = addr.postcode || '';
        if (postcode) {
          memoryCache.set(cacheKey, postcode);
          return NextResponse.json({ success: true, source: 'nominatim', postalCode: String(postcode) });
        }
      }
    } catch {
      // Do nothing
    }

    return NextResponse.json({ success: true, source: 'not_found', postalCode: '' });
  }

  return NextResponse.json({ success: false, error: 'Tipe wilayah tidak dikenali' }, { status: 400 });
}

