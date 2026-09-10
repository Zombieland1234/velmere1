fetch('http://localhost:3000/api/market-integrity/markets')
  .then(res => res.json())
  .then(data => {
    console.log('sparkline7d sample:', data.rows[0].sparkline7d);
  });
