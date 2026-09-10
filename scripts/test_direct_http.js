const http = require('http');

http.get('http://localhost:3000/api/market-integrity/klines?assetClass=crypto&marketId=zcash&symbol=ZEC&quote=USD&range=15m', (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Data preview:', data.slice(0, 300)));
}).on('error', err => console.error('Error:', err.message));
