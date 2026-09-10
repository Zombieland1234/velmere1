const fs = require('fs');

const f1 = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/ShieldRealMarketsParityClient.tsx';
const f2 = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/ShieldProCleanTerminalClient.tsx';

console.log('ShieldRealMarketsParityClient exists:', fs.existsSync(f1));
console.log('ShieldProCleanTerminalClient exists:', fs.existsSync(f2));

if (fs.existsSync(f1)) {
  const c1 = fs.readFileSync(f1, 'utf8');
  console.log('f1 length:', c1.length);
}

if (fs.existsSync(f2)) {
  const c2 = fs.readFileSync(f2, 'utf8');
  console.log('f2 length:', c2.length);
}
