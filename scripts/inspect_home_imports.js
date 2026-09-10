const fs = require('fs');
const file1 = 'C:/Users/marci/Desktop/Nowy folder/app/[locale]/page.tsx';
console.log('page.tsx:');
console.log(fs.readFileSync(file1, 'utf8'));

const file2 = 'C:/Users/marci/Desktop/Nowy folder/components/home/HomePageClient.tsx';
const content2 = fs.readFileSync(file2, 'utf8');
console.log('HomePageClient imports:');
console.log(content2.slice(0, 1000));
