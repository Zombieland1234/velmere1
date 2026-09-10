const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/server/market-integrity-route-modules/real-markets.ts';
const content = fs.readFileSync(file, 'utf8');
console.log('real-markets.ts length:', content.length);
console.log(content.slice(0, 1500));
