const fs = require('fs');

const targetFile = 'src/app/dashboard/pokja/industries/page.tsx';
let content = fs.readFileSync(targetFile, 'utf-8');

const targetFunctionStart = `  const executeSearchMapLocation = useCallback(async (customQuery?: string) => {
    setIsMapSearching(true);
    setErrorMsg('');

    // Buat urutan variasi pencarian dari yang paling spesifik ke yang paling umum
    const searchQueries: string[] = [];`;

const replacement = `  const executeSearchMapLocation = useCallback(async (customQuery?: string) => {
    setIsMapSearching(true);
    setErrorMsg('');

    // --- GOOGLE MAPS LINK PARSER ---
    if (customQuery && (customQuery.includes('google.com/maps') || customQuery.includes('goo.gl') || customQuery.includes('maps.app.goo.gl'))) {
      try {
        let finalUrl = customQuery;
        
        // Resolve shortlinks (goo.gl / maps.app.goo.gl)
        if (customQuery.includes('goo.gl')) {
          const res = await fetch(\`/api/resolve-url?url=\${encodeURIComponent(customQuery)}\`);
          const data = await res.json();
          if (data.success && data.finalUrl) {
            finalUrl = data.finalUrl;
          }
        }

        // Regex to extract @lat,lng
        const coordRegex = /@(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)/;
        const match = finalUrl.match(coordRegex);
        
        if (match) {
          const lat = match[1];
          const lng = match[2];
          setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
          updateMapMarker(lat, lng);
          setSuccessMsg('✅ Koordinat sangat akurat (Level Google Maps) berhasil diekstrak dari link!');
          setIsMapSearching(false);
          return;
        } else {
          setErrorMsg('Gagal menemukan koordinat dari link Google Maps. Pastikan link berisi koordinat yang valid atau coba ulangi.');
          setIsMapSearching(false);
          return;
        }
      } catch (err) {
        console.error('Error parsing GMaps link:', err);
      }
    }
    // -------------------------------

    // Buat urutan variasi pencarian dari yang paling spesifik ke yang paling umum
    const searchQueries: string[] = [];`;

if (content.includes(targetFunctionStart)) {
  content = content.replace(targetFunctionStart, replacement);
  fs.writeFileSync(targetFile, content);
  console.log("Successfully patched executeSearchMapLocation");
} else {
  console.log("Target string not found in executeSearchMapLocation");
}

