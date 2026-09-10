const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/app/api/market-integrity/real-markets/route.ts';
if (fs.existsSync(file)) {
  const content = fs.readFileSync(file, 'utf8');
  console.log('API Route length:', content.length);
  console.log(content.slice(0, 1500));
} else {
  console.log('File not found:', file);
}
