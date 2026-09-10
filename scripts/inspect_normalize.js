const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/market-integrity/pass4405-cross-asset-build-pressure-helpers.ts';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('normalizeQuoteResponse')) {
    console.log(lines.slice(i, i + 35).join('\n'));
  }
});
