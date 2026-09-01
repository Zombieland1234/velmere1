import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outputPath = path.join(root, 'reports', 'PASS2123_HOSTED_SMOKE_PACK.json');
const baseUrl = process.env.VELMERE_SMOKE_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || '';
const normalizedBase = baseUrl ? (baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`) : '';
const routes = [
  '/',
  '/en',
  '/pl',
  '/de',
  '/en/shop',
  '/en/cart',
  '/en/checkout',
  '/en/market-integrity',
  '/en/real-markets',
  '/en/search',
  '/en/security',
  '/en/impressum',
  '/en/privacy',
  '/en/terms',
  '/en/returns',
  '/en/shipping',
];
const modals = ['cart', 'wallet', 'language', 'Shield asset modal', 'Real Markets asset modal', 'Lens PDF preview', 'VLM Brain panel'];
const status = normalizedBase ? 'READY_FOR_HOSTED_SMOKE' : 'STATIC_SMOKE_PACK_READY_BASE_URL_BLOCKED';
const report = {
  schemaVersion: 'velmere.pass2123.hosted-smoke-pack.v1',
  generatedAt: new Date().toISOString(),
  status,
  baseUrl: normalizedBase || null,
  routes: routes.map((route) => ({ route, url: normalizedBase ? `${normalizedBase}${route}` : null, expected: '2xx/3xx, no hydration crash, header/footer visible' })),
  interactionSmoke: modals.map((surface) => ({ surface, expected: 'opens above header, locks scroll, focus visible, ESC/outside close safe, no scroll jump' })),
  ownerCommand: normalizedBase ? `VELMERE_SMOKE_BASE_URL=${normalizedBase} npm run smoke:hosted-pack` : 'Set VELMERE_SMOKE_BASE_URL=https://<your-vercel-url> then run npm run smoke:hosted-pack',
};
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(`[pass2123] ${status}; routes=${routes.length}; interactions=${modals.length}`);
