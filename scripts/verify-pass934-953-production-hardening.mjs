import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
function check(name, condition, hint) {
  checks.push({ name, ok: Boolean(condition), hint });
}

const vlmWorkspace = read('components/market-integrity/VlmBrainWorkspace.tsx');
const factPacket = read('lib/ai/vlm-fact-packet.ts');
const vlmBrain = read('lib/ai/vlm-brain.ts');
const navbar = read('components/Navbar.tsx');
const pkg = JSON.parse(read('package.json'));
const npmrc = read('.npmrc');

check(
  'VlmBrainWorkspace has no duplicate data-provider-mode attribute',
  (vlmWorkspace.match(/data-provider-mode=/g) ?? []).length === 1,
  'Remove duplicate JSX attributes that block TS/Next builds.',
);
check(
  'fact packet has packet confidence governor',
  factPacket.includes('function applyPacketConfidenceGovernor') && factPacket.includes('confidence cannot exceed fallback band'),
  'Central fact packet must cap fallback/missing-data confidence before provider output.',
);
check(
  'fact packet caps missing data below 40',
  factPacket.includes('input.missingDataCount > 0') && factPacket.includes('Math.min(governed, 39)'),
  'Missing data must force confidence below 40%.',
);
check(
  'fact packet caps partial/demo source quality',
  factPacket.includes('input.dataQuality !== "live"') && factPacket.includes('input.dataQuality === "partial" ? 39 : 28'),
  'Partial/demo data must not look live.',
);
check(
  'vlm brain applies final output confidence governor',
  vlmBrain.includes('function applyOutputConfidenceGovernor') && vlmBrain.includes('Math.min(packet.confidenceCap, 39)'),
  'Provider output must be capped again after schema/firewall.',
);
check(
  'vlm brain does not report gemini mode when packet cap is fallback band',
  vlmBrain.includes('packet.confidenceCap >= 40') && vlmBrain.includes('!providerError'),
  'Envelope mode must not say gemini/live if evidence is fallback-grade.',
);
check(
  'Navbar mobile wallet safety copy is localized',
  navbar.includes('walletSafetyTitle') && navbar.includes('{t.walletSafetyBody}') && !navbar.includes('Wallet safety</p>'),
  'Mobile menu cannot hardcode English wallet safety copy.',
);
check(
  'Navbar mobile legal/language labels are localized',
  navbar.includes('legalTitle') && navbar.includes('languageTitle') && navbar.includes('{t.legalTitle}') && navbar.includes('{t.languageTitle}'),
  'Mobile menu must not hardcode Legal/Language labels.',
);
check(
  'npm 11 peer matrix remains pinned',
  pkg.packageManager === 'npm@11.16.0' && pkg.overrides?.wagmi && pkg.overrides?.viem && npmrc.includes('strict-peer-deps=false'),
  'npm 11 / Web3 peer dependency guard is required.',
);
check(
  'Node 24 dry-run script is available',
  pkg.scripts?.['ci:node24-npm11-dry-run']?.includes('node@24.16.0') && pkg.scripts?.['ci:node24-npm11-dry-run']?.includes('npm@11.16.0'),
  'CI preflight must have a reproducible Node 24/npm 11 dry-run lane.',
);

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`PASS934-953 verifier failed (${failed.length}/${checks.length})`);
  for (const item of failed) console.error(`- ${item.name}: ${item.hint}`);
  process.exit(1);
}
console.log(`PASS934-953 verifier passed (${checks.length}/${checks.length})`);
