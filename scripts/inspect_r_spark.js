fetch('http://localhost:3000/api/market-integrity/markets')
  .then(res => res.json())
  .then(data => {
    data.rows.slice(0, 5).forEach(r => {
      console.log(r.symbol, 'sparkline7d length:', r.sparkline7d?.length);
    });
  });
