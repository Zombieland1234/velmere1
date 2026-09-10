fetch('http://localhost:3000/api/market-integrity/markets')
  .then(res => res.json())
  .then(data => {
    console.log('Keys:', Object.keys(data));
    if (data.quotes) console.log('Quotes keys:', Object.keys(data.quotes).slice(0, 5));
    if (Array.isArray(data)) console.log('Is array, length:', data.length, data[0]);
  })
  .catch(err => console.error(err));
