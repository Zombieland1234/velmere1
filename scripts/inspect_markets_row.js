fetch('http://localhost:3000/api/market-integrity/markets')
  .then(res => res.json())
  .then(data => {
    console.log('Total rows:', data.rows ? data.rows.length : 0);
    if (data.rows && data.rows.length > 0) {
      console.log('First row:', JSON.stringify(data.rows[0], null, 2));
    }
  });
