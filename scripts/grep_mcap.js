const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/market-integrity/import-pressure-map.ts';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
console.log('lines count:', lines.length);
lines.forEach((l, i) => {
  if (l.includes('marketCap') || l.includes('AAPL')) {
    console.log(`Line ${i+1}: ${l.slice(0, 100)}`);
  }
});
