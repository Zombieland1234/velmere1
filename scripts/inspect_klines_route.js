const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/market-integrity/kline-route-handler.ts';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
console.log('kline-route-handler lines:', lines.length);
lines.forEach((l, i) => {
  if (l.includes('503') || l.includes('status: 503') || l.includes('unavailable')) {
    console.log(`Line ${i+1}: ${l}`);
  }
});
