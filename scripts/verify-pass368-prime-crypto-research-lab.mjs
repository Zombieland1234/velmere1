import { readFileSync } from 'node:fs';

const files = {
  research: readFileSync('app/[locale]/research-lab/page.tsx', 'utf8'),
  security: readFileSync('components/security/SecurityTrustPage.tsx', 'utf8'),
  realMarkets: readFileSync('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'utf8'),
  tokenModal: readFileSync('components/market-integrity/TokenRiskModal.tsx', 'utf8'),
  css: readFileSync('app/globals.css', 'utf8'),
};

const checks = [
  ['Research Lab has prime/crypto lab marker', files.research.includes('data-pass368-prime-crypto-lab="true"')],
  ['Research Lab explains cryptography, primes, ECC/BTC and real RNG safely', files.research.includes('Kryptografia') && files.research.includes('Liczby pierwsze') && files.research.includes('BTC / krzywa eliptyczna') && files.research.includes('Real RNG')],
  ['Research Lab claim boundary avoids theorem/wallet overclaim', files.research.includes('data-pass368-bajak-claim-boundary="true"') && files.research.includes('bez udawania dowodu') && files.research.includes('bez instrukcji atakowania portfeli')],
  ['Security page has crypto primer stack', files.security.includes('data-pass368-security-crypto-primer="true"') && files.security.includes('Private key stays private') && files.security.includes('Real RNG / entropy quality')],
  ['Real Markets exposes universe stats and categories', files.realMarkets.includes('data-pass368-real-market-universe="true"') && files.realMarkets.includes('universeStats.stocks') && files.realMarkets.includes('universeStats.fx')],
  ['Orbit brain has build timer/morph marker', files.tokenModal.includes('data-pass368-neural-audit-morph="true"') && files.tokenModal.includes('data-pass368-brain-build-timer="true"') && files.tokenModal.includes('estimatedReadSeconds')],
  ['CSS includes Prime Lab animation and brain timeline', files.css.includes('velmere-prime-lab-canvas') && files.css.includes('shield-vlm-pass368-brain-timeline')],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('PASS368 verification failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}
console.log('PASS368 prime/crypto research lab guard OK');
