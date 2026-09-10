const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/market-integrity/shield-basic-delivery-policy.ts';
const content = fs.readFileSync(file, 'utf8');
const idx = content.indexOf('function buildUnsignedPreflight');
console.log(content.slice(idx, idx + 1000));
