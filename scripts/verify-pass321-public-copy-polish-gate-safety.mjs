import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const mustContain = (path, value) => {
  const text = read(path);
  if (!text.includes(value)) throw new Error(`${path} is missing ${value}`);
};
const mustNotContain = (path, value) => {
  const text = read(path);
  if (text.includes(value)) throw new Error(`${path} still exposes ${value}`);
};

const gate = 'lib/market-integrity/public-copy-polish-gate.ts';
mustContain(gate, 'PASS321');
mustContain(gate, 'concierge_proof_whisper');
mustContain(gate, 'no countdown');
mustContain(gate, 'no fake stock panic');
mustContain(gate, 'no wallet pressure');
mustContain(gate, 'PASS ledger labels');
mustContain(gate, 'raw /100 operator scores');

const publicFiles = [
  'components/home/HomePageClient.tsx',
  'components/shop/ShopPageClient.tsx',
  'components/shop/ProductDetailClient.tsx',
  'app/[locale]/cart/page.tsx',
  'app/[locale]/checkout/page.tsx',
];

for (const file of publicFiles) {
  mustContain(file, 'buildPublicCopyPolishGate');
  mustContain(file, 'data-pass321-public-copy-polish');
  mustNotContain(file, 'PASS319 ·');
  mustNotContain(file, 'PASS320 ·');
  mustNotContain(file, 'flowScore}/100');
  mustNotContain(file, 'customerTrustScore}/100');
  mustNotContain(file, 'providerSnapshot.score}/100');
}

const pkg = JSON.parse(read('package.json'));
if (pkg.scripts?.['verify:pass321-public-copy-polish-gate'] !== 'node scripts/verify-pass321-public-copy-polish-gate-safety.mjs') {
  throw new Error('package.json missing verify:pass321-public-copy-polish-gate');
}

console.log('PASS321 Public Copy Polish Gate verified.');
