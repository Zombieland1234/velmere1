const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/AssetDetailModal.tsx';
const content = fs.readFileSync(file, 'utf8');
console.log('AssetDetailModal length:', content.length);
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('15m') || l.includes('4h') || l.includes('loading') || l.includes('setCandleInterval') || l.includes('fetchCandles')) {
    console.log(`Line ${i+1}: ${l.trim()}`);
  }
});
