const fs = require('fs');
const path = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/ShieldMapCommandClient.tsx';
const content = fs.readFileSync(path, 'utf8');
console.log('Has PremiumAmbientGlobe:', content.includes('PremiumAmbientGlobe'));
const match = content.match(/<PremiumAmbientGlobe[^>]*\/>/g);
console.log('Matches:', match);
