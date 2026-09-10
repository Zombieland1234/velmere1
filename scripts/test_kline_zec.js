fetch('http://localhost:3000/api/market-integrity/klines?assetClass=crypto&marketId=zcash&symbol=ZEC&quote=USD&range=15m')
  .then(res => {
    console.log('Status:', res.status);
    return res.json();
  })
  .then(data => console.log('Data:', data))
  .catch(err => console.error(err));
