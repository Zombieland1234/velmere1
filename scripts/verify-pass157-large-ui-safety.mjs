import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

const modal = read('components/market-integrity/TokenRiskModal.tsx');
const css = read('app/globals.css');
const home = read('components/home/HomePageClient.tsx');
const evidence = read('lib/market-integrity/evidence-report.ts');

if (!modal.includes('useStaticEvidenceBoard') || !modal.includes('shield-vlm-static-evidence-board')) {
  failures.push('TokenRiskModal must keep clean static evidence board layout for Basic/Pro/static VLM readout.');
}
if (!modal.includes('shield-vlm-group-filter') || !modal.includes('setActiveTileGroup(group)')) {
  failures.push('VLM rail must expose category filter chips.');
}
if (!modal.includes('activeTileGroup === "all" ? visibleNodes : visibleNodes.filter')) {
  failures.push('VLM rail filter must actually filter visible nodes.');
}
if (!css.includes('PASS157 · large polish') || !css.includes('.shield-vlm-motion-stack') || !css.includes('display: none !important') || !css.includes('PASS168 · VLM brain static board')) {
  failures.push('PASS157/PASS168 CSS must hide debug/performance controls and apply static-board/orbit polish.');
}
if (home.includes('"{copy.') || home.includes('["{copy.')) {
  failures.push('HomePageClient must not ship literal {copy.*} placeholder strings.');
}
if (!home.includes('Shield Map", "91%"') && !home.includes('Mapa Shield", "91%"')) {
  failures.push('Home progress ledger should reflect current Shield progress instead of old placeholder percentages.');
}
if (!evidence.includes('export const buildEvidenceReportDraft = buildShieldEvidenceReportDraft')) {
  failures.push('Evidence report alias required by API routes is missing.');
}

if (failures.length) {
  console.error('PASS157 large UI safety failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('PASS157 large UI safety OK · side rail, filters, home placeholders and evidence alias verified');
