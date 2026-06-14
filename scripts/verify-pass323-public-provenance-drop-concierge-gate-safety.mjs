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

const gate = 'lib/market-integrity/public-provenance-drop-concierge-gate.ts';
for (const marker of [
  'PASS323',
  'provenance_drop_concierge',
  'MEXC-style source freshness expiry',
  'Proof-of-Reserves snapshot internals',
  'LVMH/Aura-style DPP traceability scoring',
  'no countdowns',
  'fake scarcity',
  'wallet pressure',
  'ROI language',
  'safety guarantees',
]) {
  mustContain(gate, marker);
}

const publicFiles = [
  'components/home/HomePageClient.tsx',
  'components/shop/ShopPageClient.tsx',
  'components/shop/ProductDetailClient.tsx',
  'app/[locale]/cart/page.tsx',
  'app/[locale]/checkout/page.tsx',
];

for (const file of publicFiles) {
  mustContain(file, 'buildPublicProvenanceDropConciergeGate');
  mustContain(file, 'data-pass323-public-provenance-drop-concierge');
  mustContain(file, 'Provenance concierge');
  mustContain(file, 'provenanceDropConcierge.conciergeSteps');
  mustNotContain(file, 'provenanceDropConcierge.provenanceScore');
  mustNotContain(file, 'provenanceDropConcierge.passId');
  mustNotContain(file, 'MEXC-style source freshness expiry');
  mustNotContain(file, 'Proof-of-Reserves snapshot internals');
  mustNotContain(file, 'LVMH/Aura-style DPP traceability scoring');
}

mustContain('components/home/HomePageClient.tsx', 'data-pass323-home-provenance-drop-concierge');
mustContain('components/shop/ShopPageClient.tsx', 'data-pass323-shop-provenance-drop-concierge');
mustContain('components/shop/ProductDetailClient.tsx', 'data-pass323-product-provenance-drop-concierge');
mustContain('app/[locale]/cart/page.tsx', 'data-pass323-cart-provenance-drop-concierge');
mustContain('app/[locale]/checkout/page.tsx', 'data-pass323-checkout-provenance-drop-concierge');

const pkg = JSON.parse(read('package.json'));
if (pkg.scripts?.['verify:pass323-public-provenance-drop-concierge-gate'] !== 'node scripts/verify-pass323-public-provenance-drop-concierge-gate-safety.mjs') {
  throw new Error('package.json missing verify:pass323-public-provenance-drop-concierge-gate');
}

console.log('PASS323 Public Provenance Drop Concierge Gate verified.');
