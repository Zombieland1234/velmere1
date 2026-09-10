const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/ui/VelmereLuxuryShield.tsx';
const buf = fs.readFileSync(file);
console.log(buf.toString('utf8'));
