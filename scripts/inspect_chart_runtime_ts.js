const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/asset-detail/chart-runtime.ts';
const content = fs.readFileSync(file, 'utf8');
console.log('chart-runtime.ts length:', content.length);
console.log(content.slice(0, 1500));
