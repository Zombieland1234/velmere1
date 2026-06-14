import fs from 'node:fs';

const envPath = '.env.local';
console.log('CWD:', process.cwd());
console.log('.env.local exists:', fs.existsSync(envPath));

if (!fs.existsSync(envPath)) {
  console.log('ERROR: Brak pliku .env.local w tym folderze. Utworz go w glownym folderze projektu.');
  process.exit(1);
}

const env = fs.readFileSync(envPath, 'utf8');
const lines = env.split(/\r?\n/);
const tokenLine = lines.find((line) => line.trim().startsWith('PRINTFUL_API_TOKEN='));

if (!tokenLine) {
  console.log('ERROR: Nie znaleziono PRINTFUL_API_TOKEN= w .env.local');
  process.exit(1);
}

let token = tokenLine.split('=').slice(1).join('=').trim();
if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
  token = token.slice(1, -1).trim();
}

console.log('Token length:', token.length);
console.log('Token prefix:', token.slice(0, 6));
console.log('Token suffix:', token.slice(-4));
console.log('Starts with Bearer:', token.toLowerCase().startsWith('bearer '));
console.log('Contains spaces:', /\s/.test(token));
console.log('Looks like placeholder:', /TU_|TOKEN|Wklej|wklej|your/i.test(token));

if (token.toLowerCase().startsWith('bearer ')) {
  token = token.slice(7).trim();
  console.log('Stripped Bearer. New length:', token.length);
}

async function test(url) {
  console.log('\nTesting:', url);
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const text = await res.text();
    console.log('Status:', res.status, res.statusText);
    console.log('Body first 1200 chars:');
    console.log(text.slice(0, 1200));
  } catch (error) {
    console.log('Fetch error:', error?.message || error);
  }
}

await test('https://api.printful.com/stores');
await test('https://api.printful.com/v2/stores');
