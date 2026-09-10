fetch('http://localhost:3000/api/market-integrity/real-markets/catalog')
  .then(res => res.json())
  .then(data => {
    const assets = data.assets || data;
    console.log('Catalog assets length:', assets.length);
    console.log('Sample asset:', assets[0]);
  });
