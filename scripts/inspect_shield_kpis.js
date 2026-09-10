const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/ShieldProCleanTerminalClient.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('MONITOROWANE RYNKI') || l.includes('INTEGRALNOŚĆ') || l.includes('KAPITALIZACJA') || l.includes('RYZYKO MANIPULACJI') || l.includes('POKRYCIE DOWODAMI') || l.includes('PEWNOŚĆ')) {
    console.log(`Line ${i+1}: ${l}`);
  }
});
