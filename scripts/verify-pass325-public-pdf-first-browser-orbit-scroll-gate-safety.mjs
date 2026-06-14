import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const must = (condition, message) => {
  if (!condition) {
    console.error(`PASS325 guard failed: ${message}`);
    process.exit(1);
  }
};

const gate = read('lib/market-integrity/public-pdf-first-browser-orbit-scroll-gate.ts');
const lens = read('components/search/VelmereIntelligenceSearchClient.tsx');
const shield = read('components/market-integrity/MarketIntegrityClient.tsx');
const modal = read('components/market-integrity/TokenRiskModal.tsx');
const css = read('app/globals.css');
const home = read('components/home/HomePageClient.tsx');

must(gate.includes('Signed PDF Glass Preview'), 'missing PASS325 UI innovation gate');
must(lens.includes('data-pass325-pdf-first-browser="true"'), 'VLM Browser lacks PASS325 pdf-first marker');
must(lens.includes('Otwórz podgląd PDF'), 'VLM Browser does not make PDF preview the primary action');
must(lens.includes('pass325-lens-detail-hidden'), 'VLM Browser still exposes detailed analysis blocks publicly');
must(!lens.includes('category: "velmere",\n    category: "velmere"'), 'duplicate VLM suggestion category returned');
must(shield.includes('data-pass325-public-operator-wall-hidden="true"'), 'Shield terminal lacks public operator wall hide marker');
must(css.includes('data-pass325-public-operator-wall-hidden'), 'CSS hide rule for PASS294-PASS313 operator wall missing');
must(css.includes('data-pass313-atelier-access-runway'), 'PASS313 sync rail is not hidden by PASS325 CSS');
must(modal.includes('shield-vlm-detail-panel-pass325'), 'Orbit detail drawer lacks PASS325 hard-scroll class');
must(modal.includes('onWheelCapture={(event) => {'), 'Orbit drawer lacks wheel capture scroll repair');
must(css.includes('vlmDetailSlideFromRightPass325'), 'PASS325 right-edge animation CSS missing');
must(css.includes('overflow-y: scroll !important'), 'PASS325 forced drawer scroll missing');
for (const bad of ['Customer focus</p>', 'Quiet first purchase</p>', 'Atelier trust ribbon</p>', 'Provenance concierge</p>']) {
  must(!home.includes(bad), `home still renders ${bad}`);
}
console.log('PASS325 Public PDF-first Browser + Orbit Scroll Gate verified.');
