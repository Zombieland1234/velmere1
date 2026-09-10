const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/server/lazy-route-modules/security--audit-watch--basic-pdf.ts';
if (fs.existsSync(file)) {
  const content = fs.readFileSync(file, 'utf8');
  console.log('basic-pdf.ts length:', content.length);
  console.log(content.slice(0, 1500));
}
