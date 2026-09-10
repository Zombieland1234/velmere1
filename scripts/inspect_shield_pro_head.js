const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/ShieldProCleanTerminalClient.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);
lines.forEach((l, i) => {
  if (l.toLowerCase().includes('manipulac') || l.toLowerCase().includes('pokrycie') || l.toLowerCase().includes('pewno')) {
    console.log(`Line ${i+1}: ${l}`);
  }
});
