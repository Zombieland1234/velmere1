fetch('http://localhost:3000/api/market-integrity/markets')
  .then(res => res.json())
  .then(data => {
    const row = data.rows[0];
    for (const key of Object.keys(row)) {
      if (key.includes('spark') || Array.isArray(row[key])) {
        console.log('Key:', key, 'is array:', Array.isArray(row[key]), 'length:', row[key]?.length);
      }
    }
  });
