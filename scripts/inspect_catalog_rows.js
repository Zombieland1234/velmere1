fetch('http://localhost:3000/api/market-integrity/real-markets/catalog')
  .then(res => res.json())
  .then(data => {
    console.log('Total rows:', data.rows ? data.rows.length : 0);
    console.log('Row 0:', data.rows[0]);
  });
