const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/server/route-registries/market-integrity.ts';
const content = fs.readFileSync(file, 'utf8');
console.log('Registry file:');
console.log(content.slice(0, 1500));
