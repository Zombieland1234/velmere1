const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/CrossAssetCollapseRadarPanel.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

console.log(lines.slice(5250, 5360).join('\n'));
