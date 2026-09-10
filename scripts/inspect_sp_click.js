const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/ShieldProCleanTerminalClient.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('onClick=') || l.includes('setSelectedRow') || l.includes('setSelectedAsset')) {
    console.log(`Line ${i+1}: ${l}`);
  }
});
