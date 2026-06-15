import { readFileSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) {
    console.error(`[PASS2031] ${message}`);
    process.exit(1);
  }
}

const shieldMap = readFileSync('components/market-integrity/ShieldMapClient.tsx', 'utf8');
const tokenModal = readFileSync('components/market-integrity/TokenRiskModal.tsx', 'utf8');
const dataBackbone = readFileSync('lib/market-integrity/data-backbone.ts', 'utf8');

assert(shieldMap.includes('type Pass1354Locale'), 'ShieldMapClient must import Pass1354Locale.');
assert(shieldMap.includes('const pass1354Locale: Pass1354Locale'), 'ShieldMapClient must normalize useLocale() to Pass1354Locale.');
assert(shieldMap.includes('locale: pass1354Locale'), 'Pass1354 builder must receive normalized locale.');
assert(shieldMap.includes('encodeURIComponent(handoffQuery ?? "")'), 'handoffQuery must be safe for encodeURIComponent.');
assert(shieldMap.includes('handoffPacket!.depth.toUpperCase()'), 'handoffPacket render must be null-safe for Vercel typecheck.');
assert(shieldMap.includes('investigatorSuggestFrame!.top'), 'suggestion frame portal style must be null-safe for Vercel typecheck.');
assert(shieldMap.includes('investigatorResult!.caseFrame.asset'), 'investigator result render must be null-safe for Vercel typecheck.');
assert(shieldMap.includes('evidenceReport!.sections.slice(0, 5)'), 'evidence report render must be null-safe for Vercel typecheck.');
assert(shieldMap.includes('sourceSnapshot!.snapshot.reportId'), 'source snapshot render must be null-safe for Vercel typecheck.');

assert(tokenModal.includes('const modalShellRef = useRef<HTMLDivElement | null>(null);'), 'TokenRiskModal modal shell ref must match div ref type.');
assert(dataBackbone.includes('image: z.string().url().optional().or(z.literal("")).transform((value) => value || undefined),'), 'data-backbone image transform must accept optional values.');
assert(dataBackbone.includes('url: z.string().url().optional().or(z.literal("")).transform((value) => value || undefined),'), 'data-backbone url transform must accept optional values.');

console.log('PASS2031 Vercel type hotfix checks passed');
