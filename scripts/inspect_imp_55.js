const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/AssetDetailModal.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');
console.log(lines.slice(40, 75).join('\n'));
