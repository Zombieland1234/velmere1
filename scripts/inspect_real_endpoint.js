fetch('http://localhost:3000/api/market-integrity/real-markets?symbols=AAPL,NVDA&range=1h&detail=1')
  .then(res => res.json())
  .then(data => {
    console.log('Real markets keys:', Object.keys(data));
    console.log('Sample quote AAPL:', JSON.stringify(data.quotes ? data.quotes.AAPL : data.AAPL, null, 2));
  });
