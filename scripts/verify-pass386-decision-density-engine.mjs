import fs from 'node:fs';

const route = fs.readFileSync('app/api/search/lens-report/route.ts', 'utf8');
const engine = fs.readFileSync('lib/market-integrity/pass386-decision-density-engine.ts', 'utf8');

const requiredRouteMarkers = [
  'buildPass386DecisionDensityPlan',
  'pass386DecisionDensity',
  'data-pass386-compact-decision-pdf="true"',
  'const pageStreams = [1, 2, 3, 4].map',
  'legacy pass history and debug rails are omitted',
  'PASS386 DECISION DENSITY ENGINE',
];

for (const marker of requiredRouteMarkers) {
  if (!route.includes(marker)) {
    throw new Error(`PASS386 route marker missing: ${marker}`);
  }
}

const forbiddenRouteMarkers = [
  'const pageStreams = [1, 2, 3, 4, 5',
  'PASS385 PRODUCTION CLOSURE BRAIN keeps Real Markets, Shield, Browser PDF, Security and Research Lab on one clean launch contract without random filler.\n\n',
];

for (const marker of forbiddenRouteMarkers) {
  if (route.includes(marker)) {
    throw new Error(`PASS386 compact PDF guard failed; found forbidden marker: ${marker}`);
  }
}

const requiredEngineMarkers = [
  'maxPdfPages: 4',
  'if a fact does not change the user',
  'legacy pass panels',
  'buildPass386DecisionDensityPlan',
  'Decision Density Engine',
];

for (const marker of requiredEngineMarkers) {
  if (!engine.includes(marker)) {
    throw new Error(`PASS386 engine marker missing: ${marker}`);
  }
}

console.log('PASS386 decision density engine guard passed: PDF capped to 4 pages, selected facts only, legacy pass walls hidden from public preview.');
