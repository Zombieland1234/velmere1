const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/market-integrity/real-markets-quote-hydration.ts';
const content = fs.readFileSync(file, 'utf8');
console.log('Hydration file length:', content.length);
console.log(content.slice(0, 1500));
