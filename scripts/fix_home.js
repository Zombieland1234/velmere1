const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/home/HomePageClient.tsx';
let txt = fs.readFileSync(file, 'utf8');
if (txt.startsWith('C:\\Users\\marci')) {
  txt = txt.slice(txt.indexOf('"use client";'));
  fs.writeFileSync(file, txt, 'utf8');
  console.log('Fixed HomePageClient.tsx successfully!');
} else {
  console.log('First 50 chars:', txt.slice(0, 50));
}
