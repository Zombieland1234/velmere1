const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/market-integrity/klines?assetClass=crypto&marketId=zcash&symbol=ZEC&quote=USD&range=15m',
  method: 'GET',
  headers: {
    'Accept': 'application/json'
  }
}, (res) => {
  console.log('Headers:', res.headers);
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => console.log('Body:', body));
});

req.on('error', err => console.error(err));
req.end();
