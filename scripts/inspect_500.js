fetch('http://localhost:3000/api/market-integrity/klines?assetClass=crypto&marketId=zcash&symbol=ZEC&quote=USD&range=15m')
  .then(res => res.text())
  .then(text => console.log('500 text:', text.slice(0, 1000)));
