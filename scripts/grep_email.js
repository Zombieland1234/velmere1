const fs = require('fs');
const c1 = fs.readFileSync('C:/Users/marci/Desktop/Nowy folder/app/[locale]/contact/page.tsx', 'utf8');
console.log('contact page has velmere141@gmail.com:', c1.includes('velmere141@gmail.com'));
const c2 = fs.readFileSync('C:/Users/marci/Desktop/Nowy folder/app/api/contact/message/route.ts', 'utf8');
console.log('contact route has velmere141@gmail.com:', c2.includes('velmere141@gmail.com'));
