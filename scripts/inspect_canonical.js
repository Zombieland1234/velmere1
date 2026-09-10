fetch('http://localhost:3000/api/market-integrity/real-markets?symbols=AAPL,NVDA&range=1h&detail=1')
  .then(res => res.json())
  .then(data => {
    console.log('canonicalQuotes keys:', Object.keys(data.canonicalQuotes || {}));
    console.log('quotes keys:', Object.keys(data.quotes || {}));
    const firstKey = Object.keys(data.canonicalQuotes || {})[0];
    if (firstKey) {
      console.log('Sample quote for ' + firstKey + ':', JSON.stringify(data.canonicalQuotes[firstKey], null, 2));
    }
  });
