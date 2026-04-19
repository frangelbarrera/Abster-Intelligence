import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 25; // Default to 25%

    const response = await fetch('https://data-cloud.flightradar24.com/zones/fcgi/feed.js?bounds=80,-80,-180,180&faa=1&mlat=1&flarm=1&adsb=1&gnd=0&air=1&vehicles=0&estimated=1&maxage=14400&gliders=0&stats=0', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.flightradar24.com/'
      },
      next: { revalidate: 30 } // Cache for 30 seconds
    });

    if (!response.ok) {
      throw new Error(`Flightradar24 API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform FR24 data to our expected format
    const flights = [];
    for (const key in data) {
      if (key !== 'full_count' && key !== 'version' && Array.isArray(data[key])) {
        const f = data[key];
        flights.push({
          hex: f[0] || key,
          lat: f[1],
          lon: f[2],
          track: f[3],
          alt_baro: f[4],
          gs: f[5],
          flight: f[16] || f[13] || 'UNKNOWN' // callsign or flight number
        });
      }
    }

    // Shuffle the array to get a global distribution instead of regional clustering
    // FR24 often returns data clustered by region. Shuffling ensures the sample covers the whole world.
    for (let i = flights.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [flights[i], flights[j]] = [flights[j], flights[i]];
    }

    // Return a sample based on the requested percentage
    const sampleSize = Math.floor(flights.length * (limit / 100));
    return NextResponse.json({ ac: flights.slice(0, sampleSize) });
  } catch (error) {
    console.error('Error fetching flights:', error);
    return NextResponse.json({ ac: [] }, { status: 500 });
  }
}
