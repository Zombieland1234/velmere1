fetch('http://localhost:3000/api/market-integrity/real-markets/catalog')
  .then(res => res.json())
  .then(data => {
    console.log('Catalog keys:', Object.keys(data));
    console.log('Catalog preview:', JSON.stringify(data).slice(0, 300));
  });
