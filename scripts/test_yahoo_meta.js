fetch('https://query1.finance.yahoo.com/v8/finance/chart/AAPL?range=1d&interval=15m', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
})
  .then(res => res.json())
  .then(data => {
    const meta = data?.chart?.result?.[0]?.meta;
    console.log('Yahoo meta keys:', Object.keys(meta || {}));
    console.log('meta sample:', {
      regularMarketPrice: meta?.regularMarketPrice,
      chartPreviousClose: meta?.chartPreviousClose,
      previousClose: meta?.previousClose,
      regularMarketVolume: meta?.regularMarketVolume,
      hasPrePostMarketData: meta?.hasPrePostMarketData,
      marketCap: meta?.marketCap,
      sharesOutstanding: meta?.sharesOutstanding
    });
  })
  .catch(err => console.error(err));
