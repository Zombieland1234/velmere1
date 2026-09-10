const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/AssetDetailModal.tsx';
const content = fs.readFileSync(file, 'utf8');
const idx = content.indexOf('function ChartLoadingSurface');
console.log(content.slice(idx, idx + 1200));
