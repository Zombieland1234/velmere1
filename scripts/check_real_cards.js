const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/CrossAssetCollapseRadarPanel.tsx';
let txt = fs.readFileSync(file, 'utf8');
console.log('CrossAssetCollapseRadarPanel length:', txt.length);
// Search for metrics or market cap
const matches = txt.match(/kapitalizacja|instrumenty|ryzyko/gi);
console.log('Matches:', matches ? matches.slice(0, 10) : 'none');
