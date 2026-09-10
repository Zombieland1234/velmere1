const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/market-integrity/market-row-delivery-gate.ts';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
console.log('market-row-delivery-gate length:', lines.length);
lines.forEach((l, i) => {
  if (l.includes('sparkline') || l.includes('sparkline7d')) {
    console.log(`Line ${i+1}: ${l}`);
  }
});
