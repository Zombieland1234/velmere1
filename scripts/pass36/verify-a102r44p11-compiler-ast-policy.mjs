import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const policyPath = path.join(root, "config/pass36/a102r44p11-compiler-ast-dynamic-policy.json");
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
const sha256Bytes = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sha256File = (file) => sha256Bytes(fs.readFileSync(file));
const checks = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });

check("schema", policy.schemaVersion === "velmere.pass36.a102r44p11.compiler-ast-dynamic-policy.v1");
check("revision", policy.revisionId?.includes("A102R44P11"));
check("parent", policy.parentRevisionId?.includes("A102R44P10"));
check("protocol-denominator", policy.ledger?.protocolPairs === 6 && policy.ledger?.protocolVariants === 12 && policy.ledger?.sourceFiles === 7);
check("compiler-metamorphic-denominator", policy.ledger?.metamorphicCompilerRuns === 4 && policy.ledger?.astAssertions === 64 && policy.ledger?.astPassed === 64 && policy.ledger?.astFailed === 0);
check("foundry-denominator", policy.ledger?.forgePassedTests === 16 && policy.ledger?.forgeFuzzTests === 3 && policy.ledger?.forgeInvariantCampaigns === 4);
check("exact-solc", policy.toolIdentities?.solc?.version === "0.8.24+commit.e11b9ed9" && policy.toolIdentities?.solc?.sha256 === "fb03a29a517452b9f12bcf459ef37d0a543765bb3bbc911e70a87d6a37c30d5f");
check("exact-forge", policy.toolIdentities?.forge?.version === "1.2.3" && /^[a-f0-9]{64}$/.test(policy.toolIdentities?.forge?.sha256 ?? ""));

const fixtureRows = [];
for (const expected of policy.fixtureFiles ?? []) {
  const file = path.join(root, expected.path);
  const exists = fs.existsSync(file) && fs.statSync(file).isFile();
  const actual = exists ? { byteLength: fs.statSync(file).size, sha256: sha256File(file) } : null;
  const ok = Boolean(actual && actual.byteLength === expected.byteLength && actual.sha256 === expected.sha256);
  fixtureRows.push({ path: expected.path, ok, expected, actual });
}
check("fixture-files-exact", fixtureRows.length === 9 && fixtureRows.every((row) => row.ok), { count: fixtureRows.length, failed: fixtureRows.filter((row) => !row.ok) });
check("credit-local-only", policy.creditBoundary?.localCompilerAstCredit === true && policy.creditBoundary?.localFoundryFuzzCredit === true && policy.creditBoundary?.localFoundryInvariantCredit === true && policy.creditBoundary?.realExternalProtocolAccuracyCredit === false);
check("no-customer-sale-live-credit", policy.creditBoundary?.customerCredit === false && policy.creditBoundary?.saleCredit === false && policy.creditBoundary?.liveCredit === false && policy.creditBoundary?.independentAdjudicationCredit === false);
check("global-fail-closed", policy.globalTruth?.decision === "NO_GO" && policy.globalTruth?.live === false && policy.globalTruth?.saleEnabled === false && policy.globalTruth?.productionApproved === false && policy.globalTruth?.worldClassProven === false);

const argumentValue = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
};
const evidenceRootArg = argumentValue("--evidence-root") ?? process.env.VELMERE_R44P11_EVIDENCE_ROOT ?? null;
let externalEvidence = { requested: Boolean(evidenceRootArg), verified: false, checks: [] };
if (evidenceRootArg) {
  const evidenceRoot = path.resolve(evidenceRootArg);
  const artifact = path.join(evidenceRoot, "r44p11-compiler-ast-dynamic-evidence.zip");
  const ledgerPath = path.join(evidenceRoot, "extracted/evidence/R44P11_COMPILER_AST_DYNAMIC_PROTOCOL_LEDGER.json");
  const ext = [];
  const extCheck = (id, ok, detail = null) => ext.push({ id, ok: Boolean(ok), detail });
  extCheck("artifact-exists", fs.existsSync(artifact));
  if (fs.existsSync(artifact)) extCheck("artifact-exact", fs.statSync(artifact).size === policy.evidenceArtifact.byteLength && sha256File(artifact) === policy.evidenceArtifact.sha256, { bytes: fs.statSync(artifact).size, sha256: sha256File(artifact) });
  extCheck("ledger-exists", fs.existsSync(ledgerPath));
  let ledger;
  if (fs.existsSync(ledgerPath)) {
    const raw = fs.readFileSync(ledgerPath);
    try { ledger = JSON.parse(raw); } catch { ledger = null; }
    extCheck("ledger-exact", raw.length === policy.ledger.byteLength && sha256Bytes(raw) === policy.ledger.sha256, { bytes: raw.length, sha256: sha256Bytes(raw) });
    extCheck("ledger-status", ledger?.status === policy.ledger.status);
    extCheck("ledger-denominators", ledger?.protocolPairs === 6 && ledger?.protocolVariants === 12 && ledger?.astAssertions === 64 && ledger?.astPassed === 64 && ledger?.astFailed === 0 && ledger?.forgePassedTests === 16 && ledger?.forgeFuzzTests === 3 && ledger?.forgeInvariantCampaigns === 4);
    extCheck("ledger-credit-boundary", ledger?.creditBoundary?.localCompilerAstCredit === true && ledger?.creditBoundary?.realExternalProtocolAccuracyCredit === false && ledger?.creditBoundary?.saleCredit === false && ledger?.creditBoundary?.liveCredit === false);
  }
  externalEvidence = { requested: true, verified: ext.length >= 7 && ext.every((row) => row.ok), checks: ext };
  check("external-evidence-complete", externalEvidence.verified, ext.filter((row) => !row.ok));
}

const failed = checks.filter((row) => !row.ok);
const result = {
  schemaVersion: "velmere.pass36.a102r44p11.compiler-ast-policy-verification.v1",
  status: failed.length ? "FAIL_R44P11_COMPILER_AST_POLICY" : externalEvidence.requested ? "PASS_R44P11_COMPILER_AST_EVIDENCE_BOUND" : "PASS_R44P11_COMPILER_AST_SOURCE_POLICY",
  revisionId: policy.revisionId,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  fixtureFiles: fixtureRows.length,
  externalEvidence,
  checksDetail: checks,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
