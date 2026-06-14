import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const files = globSync('lib/market-integrity/pass{387,388,389,390,391,392}-*.ts');
const invalidKey = /^\s*[A-Za-z_$][A-Za-z0-9_$]*(?:[./-][A-Za-z0-9_$]+)+(\s*:)/m;
const failures = [];

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  if (invalidKey.test(text)) {
    failures.push(`${file}: unquoted object key with slash/dot/dash remains`);
  }
}

const marketClient = readFileSync('components/market-integrity/MarketIntegrityClient.tsx', 'utf8');
if (marketClient.includes('"marketRows.length"')) {
  failures.push('components/market-integrity/MarketIntegrityClient.tsx: accidental stringified marketRows.length detected');
}

const pass392 = readFileSync('lib/market-integrity/pass392-public-fidelity-core.ts', 'utf8');
for (const key of ['"EUR/TRY"', '"USD/TRY"', '"USD/ZAR"', '"EUR/ZAR"', '"USD/MXN"', '"EUR/MXN"']) {
  if (!pass392.includes(key)) failures.push(`pass392 missing quoted key ${key}`);
}

if (failures.length) {
  console.error('PASS393 build key syntax hotfix failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS393 build key syntax hotfix passed (${files.length} market pass files scanned).`);
