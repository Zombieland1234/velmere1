const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/search/VelmereIntelligenceSearchClient.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('Odkryj Bitcoin Cash') || l.includes('Wyprybuj BCH') || l.includes('WYPRÓBUJ BCH') || l.includes('WYPRÓBUJ ETH')) {
    console.log(`Line ${i+1}: ${l}`);
  }
});
