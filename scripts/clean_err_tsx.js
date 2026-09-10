const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/app/[locale]/error.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('console.error("[DEV_LOCALE_ERROR_ACTUAL]:", error?.message, error?.stack);\n', '');
fs.writeFileSync(file, content, 'utf8');
console.log('Cleaned error.tsx dev logging');
