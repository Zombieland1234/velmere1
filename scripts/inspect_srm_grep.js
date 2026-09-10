const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/ShieldRealMarketsParityClient.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
console.log('Total lines in ShieldRealMarketsParityClient:', lines.length);
lines.forEach((l, i) => {
  if (l.includes('setSelectedAsset') || l.includes('onSelectAsset') || l.includes('AssetDetailModal') || l.includes('sparkline')) {
    console.log(`Line ${i+1}: ${l}`);
  }
});
