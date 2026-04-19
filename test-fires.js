const https = require('https');

https.get('https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&days=20', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}, (res) => {
  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log('Total fires:', json.events.length);
    const nonUS = json.events.filter(e => {
        const coords = e.geometry[0].coordinates;
        const lng = coords[0];
        const lat = coords[1];
        // Rough US bounds: lat 24 to 49, lng -125 to -66
        return !(lat > 24 && lat < 49 && lng > -125 && lng < -66);
    });
    console.log('Non-US fires:', nonUS.length);
  });
}).on('error', err => console.error(err));
