const https = require('https');

https.get('https://data-cloud.flightradar24.com/zones/fcgi/feed.js?bounds=80,-80,-180,180&faa=1&mlat=1&flarm=1&adsb=1&gnd=0&air=1&vehicles=0&estimated=1&maxage=14400&gliders=0&stats=0', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}, (res) => {
  let data = '';
  res.on('data', chunk => {
    data += chunk;
    if (data.length > 500) {
      console.log(data.substring(0, 500));
      process.exit(0);
    }
  });
}).on('error', err => console.error(err));
