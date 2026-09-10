fetch('http://localhost:3000/api/market-integrity/real-markets?symbols=AAPL&range=1h&detail=1')
  .then(res => res.json())
  .then(data => {
    const q = data.quotes[0];
    console.log('q.state:', q.state);
    console.log('q.truthState:', q.truthState);
    console.log('q.marketCap:', q.marketCap);
    console.log('q.sourceTimestamp:', q.sourceTimestamp);
    console.log('q.fundamentals:', q.fundamentals);
    console.log('all keys in q:', Object.keys(q));
  });
