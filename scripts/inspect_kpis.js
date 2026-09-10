const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/CrossAssetCollapseRadarPanel.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

console.log('--- AROUND LINE 2115 ---');
console.log(lines.slice(2095, 2135).join('\n'));

console.log('--- AROUND LINE 5252 ---');
console.log(lines.slice(5235, 5275).join('\n'));
