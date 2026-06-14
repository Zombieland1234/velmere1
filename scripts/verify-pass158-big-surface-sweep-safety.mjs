import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

const vlm = read('components/vlm/VlmAccessGatePage.tsx');
const square = read('components/square/VelmereSquareClient.tsx');
const research = read('app/[locale]/research-lab/page.tsx');
const checkout = read('app/[locale]/checkout/page.tsx');
const evidence = read('lib/market-integrity/evidence-report.ts');

if (!vlm.includes('vlmDetailCopy') || !vlm.includes('detailText.launchMatrix') || !vlm.includes('detailText.utilityCards.map')) {
  failures.push('VLM page must use localized PASS158 detail copy, launch matrix and utility cards.');
}
if (!vlm.includes('A private access layer, not a market promise') || !vlm.includes('Prywatna warstwa dostępu, nie obietnica rynkowa') || !vlm.includes('Eine private Access-Ebene, kein Marktversprechen')) {
  failures.push('VLM page must include localized EN/PL/DE safety positioning.');
}
if (!square.includes('squareLaunchCopy') || !square.includes('launchText.steps.map') || !square.includes('launchText.checklist.map')) {
  failures.push('Square must include launch routing steps and release checklist.');
}
if (!square.includes('modesKicker: "Square Betriebsmodi"') || !square.includes('trustKicker: "Vertrauen und Moderation"')) {
  failures.push('Square German locale must include the mode/trust keys used by the UI.');
}
if (!research.includes('researchValidationCopy') || !research.includes('validation.rows.map') || !research.includes('Validation Matrix')) {
  failures.push('Research Lab must include validation matrix and safe-disclosure framing.');
}
if (!checkout.includes('matrixKicker') || !checkout.includes('t.matrix.map') || !checkout.includes('Store launch is an operation')) {
  failures.push('Checkout must include the PASS158 commerce readiness matrix.');
}
if (!evidence.includes('export const buildEvidenceReportDraft = buildShieldEvidenceReportDraft')) {
  failures.push('Evidence report alias required by API routes is missing.');
}

if (failures.length) {
  console.error('PASS158 big surface sweep safety failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('PASS158 big surface sweep OK · VLM, Square, Research Lab, Checkout and evidence alias verified');
