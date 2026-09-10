const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/market-integrity/pass4413-cross-asset-runtime-normalizers.ts';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('export function normalizeQuoteResponse')) {
    console.log(lines.slice(i, i + 50).join('\n'));
  }
});
