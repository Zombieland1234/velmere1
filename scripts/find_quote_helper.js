const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/CrossAssetCollapseRadarPanel.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

lines.forEach((l, i) => {
  if (l.includes('function quoteForAsset') || l.includes('const quoteForAsset')) {
    console.log(lines.slice(i, i + 25).join('\n'));
  }
});
