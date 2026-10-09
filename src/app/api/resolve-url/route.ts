import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const urlParam = searchParams.get('url');

  if (!urlParam) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    // Perform a request to get the final redirected URL
    const response = await fetch(urlParam, {
      method: 'GET',
      redirect: 'follow', // Fetch will automatically follow redirects
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const finalUrl = response.url;

    return NextResponse.json({ success: true, finalUrl });
  } catch (error: any) {
    console.error('Error resolving URL:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

