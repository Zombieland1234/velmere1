const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/market-integrity/pass4414-cross-asset-quote-format-helpers.ts';
const content = fs.readFileSync(file, 'utf8');
const idx = content.indexOf('hasServerVerifiedQuoteLiveGate');
console.log(content.slice(idx, idx + 800));
