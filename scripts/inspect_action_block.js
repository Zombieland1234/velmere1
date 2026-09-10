const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/search/VelmereIntelligenceSearchClient.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
console.log(lines.slice(1625, 1715).join('\n'));
