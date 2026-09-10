const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/market-integrity/real-markets-catalog.ts';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
console.log('real-markets-catalog.ts lines count:', lines.length);
lines.forEach((l, i) => {
  if (l.includes('AAPL') || l.includes('marketCap') || l.includes('pass371-aapl')) {
    console.log(`Line ${i+1}: ${l}`);
  }
});
