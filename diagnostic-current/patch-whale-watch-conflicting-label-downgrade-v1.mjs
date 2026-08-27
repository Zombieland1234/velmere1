import fs from 'node:fs';
import crypto from 'node:crypto';

const path = 'lib/market-integrity/whale-watch-engine.ts';
const expectedSha256 = 'dbaa32feb1134c6eb4c2fa7e6bd8e71d187f2366af1c5e2cba459ed4af672a99';
const bytes = fs.readFileSync(path);
const observed = crypto.createHash('sha256').update(bytes).digest('hex');
if (observed !== expectedSha256) throw new Error(`whale_engine_base_sha_mismatch:${observed}`);
let text = bytes.toString('utf8');
const oldBlock = `    if (identities.size > 1 || candidates.length > 1 && matching.length !== candidates.length) {\n      errors.add("wallet_label_registry_conflict");\n    }\n    const selected = matching.sort((left, right) =>\n`;
const newBlock = `    const identityConflict = identities.size > 1 || (candidates.length > 1 && matching.length !== candidates.length);\n    if (identityConflict) {\n      errors.add("wallet_label_registry_conflict");\n      return { ...holder, holderId, category: "unknown" as const, labelVerified: false, clusterId: undefined };\n    }\n    const selected = matching.sort((left, right) =>\n`;
if (!text.includes(oldBlock)) throw new Error('whale_engine_conflict_patch_anchor_missing');
text = text.replace(oldBlock, newBlock);
fs.writeFileSync(path, text, 'utf8');
const next = fs.readFileSync(path);
console.log(JSON.stringify({
  schemaVersion: 'velmere.r7.whale-watch-conflicting-label-downgrade-patch.v1',
  status: 'PASS_PATCH_APPLIED',
  path,
  baseSha256: observed,
  patchedSha256: crypto.createHash('sha256').update(next).digest('hex'),
  bytes: next.length,
  behavior: 'CONFLICTING_VERIFIED_LABEL_ARTIFACTS_DOWNGRADE_HOLDER_TO_UNCLASSIFIED',
  customerFinalCredit: false,
  paidValueCredit: false,
}, null, 2));
