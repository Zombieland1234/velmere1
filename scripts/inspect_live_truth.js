const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/live-truth.ts';
const content = fs.readFileSync(file, 'utf8');
console.log(content);
