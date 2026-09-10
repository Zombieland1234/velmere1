const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/market-integrity/real-markets-quote-hydration.ts';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('marketCap') || l.includes('regularMarketPrice') || l.includes('meta.')) {
    console.log(`Line ${i+1}: ${l.trim()}`);
  }
});
