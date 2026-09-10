fetch('http://localhost:3000/api/market-integrity/markets?symbols=AAPL,NVDA,MSFT')
  .then(res => res.json())
  .then(data => {
    const quotes = data.quotes || data;
    console.log('Sample quote AAPL:', JSON.stringify(quotes.AAPL || quotes[0], null, 2));
  })
  .catch(err => console.error(err));
