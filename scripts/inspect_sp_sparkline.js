const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/ShieldProCleanTerminalClient.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('sparkline7d') || l.includes('ShieldSparkline') || l.includes('td-sparkline') || l.includes('sparkline')) {
    console.log(`Line ${i+1}: ${l}`);
  }
});
