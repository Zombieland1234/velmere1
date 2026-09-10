const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/home/HomePageClient.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('emblem') || l.includes('hero') || l.includes('crest') || l.includes('shield') || l.includes('polygon') || l.includes('path d=')) {
    console.log(`Line ${i+1}: ${l.slice(0, 100)}`);
  }
});
