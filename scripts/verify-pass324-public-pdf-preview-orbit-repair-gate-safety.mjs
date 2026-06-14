import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const must = (condition, message) => {
  if (!condition) {
    console.error(`PASS324 guard failed: ${message}`);
    process.exit(1);
  }
};

const home = read('components/home/HomePageClient.tsx');
const lens = read('components/search/VelmereIntelligenceSearchClient.tsx');
const modal = read('components/market-integrity/TokenRiskModal.tsx');
const css = read('app/globals.css');
const gate = read('lib/market-integrity/public-pdf-preview-orbit-repair-gate.ts');

must(gate.includes('Ghost-Signed PDF Atelier Modal'), 'missing PASS324 gate innovation');
must(home.includes('removed the homepage customer-focus/proof stack'), 'home customer focus stack is not documented as removed');
for (const bad of ['Customer focus</p>', 'Quiet first purchase</p>', 'Atelier trust ribbon</p>', 'Concierge proof whisper</p>', 'Atelier product receipt</p>', 'Provenance concierge</p>']) {
  must(!home.includes(bad), `homepage still renders ${bad}`);
}
must(lens.includes('pdfPreviewResult'), 'Lens does not keep PDF preview modal state');
must(lens.includes('vlm-browser-pdf-modal-root'), 'Lens PDF modal root missing');
must(lens.includes('Pobierz podgląd'), 'Lens download/preview action missing');
must(!lens.includes('<span>{c.full}</span>'), 'Lens still makes full Shield the primary post-search action');
must(modal.includes('shield-vlm-detail-panel-pass324'), 'Orbit detail drawer lacks PASS324 repair class');
must(modal.includes('onWheel={(event) => event.stopPropagation()}'), 'Orbit detail drawer does not isolate wheel scroll');
must(css.includes('vlmDetailSlideFromRightPass324'), 'Orbit drawer slide animation CSS missing');
must(css.includes('overflow-y: auto !important'), 'Scroll override missing');
must(css.includes('[data-pass293-social-exchange-router="active"]'), 'public Social-Exchange wall hide guard missing');
must(css.includes('z-index: 2147481800'), 'Lens suggestion overlay z-index repair missing');
console.log('PASS324 Public PDF Preview + Orbit Scroll Repair Gate verified.');
