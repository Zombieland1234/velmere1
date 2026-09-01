import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const policyPath = path.join(root, 'config/pass35/a33-visual-merge-policy.json');
const mergePath = path.join(root, 'config/pass35/a33-visual-merge.json');
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const merge = JSON.parse(fs.readFileSync(mergePath, 'utf8'));
let checks = 0;
const assert = (cond, msg) => { checks += 1; if (!cond) throw new Error(`A33_VISUAL_MERGE_FAIL: ${msg}`); };
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const allFiles = (dir) => {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...allFiles(p));
    else if (ent.isFile()) out.push(p);
  }
  return out;
};
const aggregate = (prefixes) => {
  const rels = [];
  for (const pref of prefixes) {
    const p = path.join(root, pref);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) rels.push(pref);
    else for (const f of allFiles(p)) rels.push(path.relative(root, f).replaceAll('\\', '/'));
  }
  rels.sort();
  const h = crypto.createHash('sha256');
  for (const rel of rels) h.update(`${rel}\0${sha(path.join(root, rel))}\n`);
  return { digest: h.digest('hex'), count: rels.length };
};

assert(policy.schemaVersion === 'velmere.pass35.a33.visual-merge-policy.v1', 'policy schema');
assert(policy.baseEngine.release === 'PASS35_A32', 'A32 must remain engine base');
assert(policy.truthBoundary.visualIntegrationOnly === true, 'visual-only truth boundary');
assert(policy.truthBoundary.canonicalPercentChanged === false, 'canonical percent must not change');
assert(policy.truthBoundary.productionReadyClaimAllowed === false, 'no production-ready claim');
assert(policy.truthBoundary.sellEnabled === false, 'stop-sell must remain active');
assert(policy.truthBoundary.globalDecision === 'NO_GO', 'global decision must remain NO_GO');

const protectedNow = aggregate(policy.protectedEngine.prefixes);
assert(protectedNow.count === policy.protectedEngine.fileCount, 'protected file denominator changed');
assert(protectedNow.digest === policy.protectedEngine.baseDigest, 'protected A32 engine changed');
assert(policy.protectedEngine.baseDigest === policy.protectedEngine.mergedDigest, 'recorded protected digests differ');
assert(policy.protectedEngine.byteIdentical === true, 'protected engine not byte-identical');

assert(sha(path.join(root, 'package.json')) === policy.packageIdentity.packageJsonBaseSha256, 'package.json changed');
assert(sha(path.join(root, 'package-lock.json')) === policy.packageIdentity.packageLockBaseSha256, 'package-lock.json changed');

for (const item of policy.requiredVisualFiles) {
  const p = path.join(root, item.path);
  assert(fs.existsSync(p), `missing visual file ${item.path}`);
  assert(fs.statSync(p).size === item.size, `size mismatch ${item.path}`);
  assert(sha(p) === item.sha256, `hash mismatch ${item.path}`);
}

for (const forbidden of policy.guardrails.forbiddenDirectoriesInSource) {
  assert(!fs.existsSync(path.join(root, forbidden)), `forbidden source directory ${forbidden}`);
}
const pdfs = allFiles(root).filter((p) => p.toLowerCase().endsWith('.pdf'));
assert(pdfs.length === policy.guardrails.sourcePdfCount, `SOURCE_ONLY PDF count ${pdfs.length}`);

const codePaths = [...new Set([...(merge.copiedFiles ?? []), ...(merge.patchedFiles ?? [])])]
  .filter((p) => /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(p));
for (const rel of codePaths) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) continue;
  const body = fs.readFileSync(p, 'utf8');
  for (const fragment of policy.guardrails.forbiddenLegacyImportFragments) {
    assert(!body.includes(fragment), `legacy import fragment ${fragment} in ${rel}`);
  }
}

const shieldPro = fs.readFileSync(path.join(root, 'components/market-integrity/ShieldProCleanTerminalClient.tsx'), 'utf8');
assert(shieldPro.includes(policy.guardrails.shieldProRequiredFragment), 'Shield Pro bounded JSON reader missing');
assert(!shieldPro.includes(policy.guardrails.shieldProForbiddenFragment), 'Shield Pro raw response.json() present');
const navbar = fs.readFileSync(path.join(root, 'components/Navbar.tsx'), 'utf8');
for (const route of policy.guardrails.requiredNavbarRoutes) assert(navbar.includes(`href: "${route}"`), `Navbar route missing ${route}`);
for (const locale of policy.guardrails.requiredLocales) {
  const messages = JSON.parse(fs.readFileSync(path.join(root, `messages/${locale}.json`), 'utf8'));
  assert(messages && typeof messages === 'object', `invalid ${locale} messages`);
}

const status = JSON.parse(fs.readFileSync(path.join(root, 'config/pass35/current-status-register.json'), 'utf8'));
assert(status.globalDecision === 'NO_GO', 'current status decision changed');
assert(status.sellEnabledCount === 0, 'current status sellEnabledCount changed');
assert(status.truthBoundary.includes('59.3% weighted / 39.5% strict'), 'A32 canonical metrics changed');
assert(status.zeroBudgetFunctionalTrack.currentWeightedPlanningPercent === 91.9, 'ZERO-BUDGET metric changed');
assert(status.sourceRevisionId === 'VELMERE_PASS35_A32_REPORT_DELIVERY_EVIDENCE_NON_VISUAL', 'A32 source revision was overwritten');

assert(sha(path.join(root, policy.css.path)) === policy.css.sha256, 'merged CSS hash mismatch');
assert(fs.statSync(path.join(root, policy.css.path)).size === policy.css.size, 'merged CSS size mismatch');
assert(policy.observedEnvironment.node === '22.16.0', 'observed Node record changed');
assert(policy.observedEnvironment.requiredNode === '24.18.0', 'required Node record changed');

console.log(JSON.stringify({
  status: 'PASS_A33_VISUAL_MERGE',
  checks,
  baseEngine: policy.baseEngine.release,
  protectedEngineFiles: protectedNow.count,
  protectedEngineDigest: protectedNow.digest,
  requiredVisualFiles: policy.requiredVisualFiles.length,
  addedVisualFiles: policy.mergeInventory.addedCount,
  changedVisualFiles: policy.mergeInventory.changedCount,
  canonicalWeightedPercent: 59.3,
  canonicalStrictPercent: 39.5,
  zeroBudgetWeightedPercent: 91.9,
  sellEnabled: false,
  globalDecision: 'NO_GO',
  exactRuntimeExecuted: false
}, null, 2));
