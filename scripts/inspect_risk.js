const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/CrossAssetCollapseRadarPanel.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

lines.forEach((l, i) => {
  if (l.includes('dynamicRisk') || l.includes('totalMarketCap =')) {
    console.log(`Line ${i+1}: ${l.trim()}`);
  }
});
