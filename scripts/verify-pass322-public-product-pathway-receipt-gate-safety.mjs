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

const gate = 'lib/market-integrity/public-product-pathway-receipt-gate.ts';
for (const marker of [
  'PASS322',
  'product_pathway_receipt',
  'MEXC-style live expiry internals',
  'reserve/provenance operator snapshots',
  'no countdown',
  'no fake stock panic',
  'no wallet pressure',
  'investment-style urgency',
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
  mustContain(file, 'buildPublicProductPathwayReceiptGate');
  mustContain(file, 'data-pass322-public-product-pathway-receipt');
  mustContain(file, 'Atelier product receipt');
  mustContain(file, 'productPathwayReceipt.receiptSteps');
  mustNotContain(file, 'flowScore}/100');
  mustNotContain(file, 'customerTrustScore}/100');
  mustNotContain(file, 'providerSnapshot.providerMode');
  mustNotContain(file, 'providerSnapshot.sourceMode');
}

mustContain('components/shop/ProductDetailClient.tsx', 'data-pass322-product-pathway-receipt');
mustContain('app/[locale]/cart/page.tsx', 'data-pass322-cart-product-pathway-receipt');
mustContain('app/[locale]/checkout/page.tsx', 'data-pass322-checkout-product-pathway-receipt');

const pkg = JSON.parse(read('package.json'));
if (pkg.scripts?.['verify:pass322-public-product-pathway-receipt-gate'] !== 'node scripts/verify-pass322-public-product-pathway-receipt-gate-safety.mjs') {
  throw new Error('package.json missing verify:pass322-public-product-pathway-receipt-gate');
}

console.log('PASS322 Public Product Pathway Receipt Gate verified.');
