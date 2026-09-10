const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/reporting/exact-customer-pdf-delivery.ts';
const content = fs.readFileSync(file, 'utf8');
console.log('exact-customer-pdf-delivery length:', content.length);
console.log(content.slice(0, 1500));
