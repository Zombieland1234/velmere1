const fs = require('fs');
const files = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = dir + '/' + f;
    try {
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (f.toLowerCase().includes('pdf') || f.toLowerCase().includes('audit-report')) files.push(full);
    } catch {}
  }
}
walk('C:/Users/marci/Desktop/Nowy folder/app');
walk('C:/Users/marci/Desktop/Nowy folder/lib');
walk('C:/Users/marci/Desktop/Nowy folder/components');
console.log('PDF related files:', files);
