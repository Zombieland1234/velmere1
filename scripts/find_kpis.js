const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/CrossAssetCollapseRadarPanel.tsx';
let txt = fs.readFileSync(file, 'utf8');

const lines = txt.split('\n');
lines.forEach((line, i) => {
  if (line.includes('AKTYWNE INSTRUMENTY') || line.includes('KAPITALIZACJA RYNKU') || line.includes('RAPORT RYZYKA') || line.includes('dane niedost')) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
});
