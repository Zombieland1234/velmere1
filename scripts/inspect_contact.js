const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/app/[locale]/contact/page.tsx';
console.log('contact/page.tsx length:', fs.readFileSync(file, 'utf8').length);
const routeFile = 'C:/Users/marci/Desktop/Nowy folder/app/api/contact/message/route.ts';
console.log('api/contact/message/route.ts length:', fs.readFileSync(routeFile, 'utf8').length);
