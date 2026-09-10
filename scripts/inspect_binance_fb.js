const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/market-integrity/binance-market-fallback.ts';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('sparkline') || l.includes('sparkline7d')) {
    console.log(`Line ${i+1}: ${l}`);
  }
});
