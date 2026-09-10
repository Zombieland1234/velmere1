const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/home/HomePageClient.tsx';
const content = fs.readFileSync(file, 'utf8');
console.log('HomePageClient length:', content.length);
console.log('Is empty?', content.trim() === '');
console.log('First 500 chars:', JSON.stringify(content.slice(0, 500)));
