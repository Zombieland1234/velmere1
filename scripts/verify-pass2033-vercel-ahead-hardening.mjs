import { readFileSync } from 'node:fs';

const shield = readFileSync('components/market-integrity/ShieldMapClient.tsx', 'utf8');
const tokenModal = readFileSync('components/market-integrity/TokenRiskModal.tsx', 'utf8');
const backbone = readFileSync('lib/market-integrity/data-backbone.ts', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

const fail = (message) => {
  console.error(`[PASS2033 FAIL] ${message}`);
  process.exit(1);
};

if (shield.split('\n').length > 4300) {
  fail('ShieldMapClient still contains the old duplicate return tree; expected the compact active version under 4300 lines.');
}
if (!shield.includes('locale: pass1354Locale')) {
  fail('ShieldMapClient still passes raw locale string into the evidence graph builder.');
}
if (shield.includes('locale,\n      sourceState,')) {
  fail('ShieldMapClient contains the old raw locale argument pattern.');
}
if (tokenModal.includes('useRef<HTMLElement | null>')) {
  fail('TokenRiskModal still has HTMLElement ref instead of HTMLDivElement ref.');
}
if (backbone.includes('transform((value: string | undefined)')) {
  fail('data-backbone still has narrow optional zod transform callbacks.');
}
if (backbone.includes('image: z.string().url().optional().or(z.literal("")).transform') || backbone.includes('url: z.string().url().optional().or(z.literal("")).transform')) {
  fail('data-backbone still has inline optional URL transforms.');
}
if (!backbone.includes('const optionalUrlString')) {
  fail('data-backbone optional URL helper is missing.');
}
if (!pkg.scripts?.['verify:pass2033-vercel-ahead-hardening']) {
  fail('package.json missing PASS2033 verifier script.');
}
console.log('[PASS2033 OK] Vercel ahead hardening markers are present.');
