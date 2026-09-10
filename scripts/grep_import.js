const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/CrossAssetCollapseRadarPanel.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('quoteForAsset')) {
    console.log(`Line ${i+1}: ${l}`);
  }
});
