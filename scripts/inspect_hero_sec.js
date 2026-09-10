const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/home/HomePageClient.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
console.log(lines.slice(465, 540).join('\n'));
