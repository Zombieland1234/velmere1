const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/app/api/market-integrity/[operation]/route.ts';
const content = fs.readFileSync(file, 'utf8');
console.log('Length:', content.length);
console.log(content.slice(0, 1000));
