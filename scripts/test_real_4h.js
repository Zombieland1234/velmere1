fetch('http://localhost:3000/api/market-integrity/real-markets?symbols=AAPL&range=4h&detail=1')
  .then(res => res.json())
  .then(data => {
    const quote = data.quotes?.[0] || data.canonicalQuotes?.[0];
    console.log('4h quote candles count:', quote?.candles?.length);
    console.log('Sample candle:', quote?.candles?.[0]);
  })
  .catch(err => console.error(err));
