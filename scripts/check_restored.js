const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/home/HomePageClient.tsx';
console.log('Restored HomePageClient length:', fs.readFileSync(file, 'utf8').length);
