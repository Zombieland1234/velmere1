const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/ShieldProCleanTerminalClient.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('stats.risk') || l.includes('stats.coverage') || l.includes('stats.integrity') || l.includes('stats.monitored')) {
    console.log(`Line ${i+1}: ${l}`);
  }
});
