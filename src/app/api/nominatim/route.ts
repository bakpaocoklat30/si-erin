import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ success: false, message: 'Query is required' }, { status: 400 });
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}`;
    
    // Add custom User-Agent to comply with Nominatim Terms of Use
    const res = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'si-erin-app/1.0 (Contact: admin@si-erin.local)',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8'
      }
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, message: `Nominatim API responded with status: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Nominatim API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

