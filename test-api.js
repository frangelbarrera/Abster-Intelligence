import http from 'http';
http.get('http://localhost:3000/api/flights', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log(data.substring(0, 200)); });
}).on('error', (err) => { console.log("Error: " + err.message); });
