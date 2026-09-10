const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/market-integrity/kline-route-handler.ts';
const content = fs.readFileSync(file, 'utf8');
const idx = content.indexOf('function customerKlineResponse');
console.log(content.slice(idx, idx + 800));
