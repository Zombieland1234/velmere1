const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/CrossAssetCollapseRadarPanel.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
console.log(lines.slice(5190, 5240).join('\n'));
