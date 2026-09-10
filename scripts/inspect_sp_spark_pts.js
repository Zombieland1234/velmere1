fetch('http://localhost:3000/api/market-integrity/markets')
  .then(res => res.json())
  .then(data => {
    const row0 = data.rows[0];
    console.log('row0 sparkline length:', row0.sparkline?.length);
    console.log('row0 sparkline first 10:', row0.sparkline?.slice(0, 10));
    console.log('row0 sparkline_7d in delivery:', data.rows[0].delivery?.fields?.['market.sparkline_7d']?.valueAvailable);
  });
