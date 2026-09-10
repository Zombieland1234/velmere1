const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/market-integrity/asset-detail-client-helpers.ts';
const content = fs.readFileSync(file, 'utf8');
const idx = content.indexOf('buildPass4408AssetDetailChartFetchUrl');
console.log(content.slice(idx, idx + 1000));
