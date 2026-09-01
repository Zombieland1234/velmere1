import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p11-pdf-customer-truth-policy.json"), "utf8"));
const checks = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
const sha256File = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
check("renderer-present", fs.existsSync(path.join(root, policy.rendererPath)));
check("verifier-present", fs.existsSync(path.join(root, policy.verifierPath)));
const renderer = fs.readFileSync(path.join(root, policy.rendererPath), "utf8");
check("localized-completion-copy", ["Analiza zakończona", "Analysis completed", "Analyse abgeschlossen"].every((value) => renderer.includes(value)));
check("neutral-source-copy", renderer.includes('(FIELD_LABELS[locale]["source"], "case.sol")'));
check("localized-coverage-copy", ["rzeczywiste wykonania związane hashem", "actual hash-bound executions", "tatsächliche hashgebundene Ausführungen"].every((value) => renderer.includes(value)));
check("r44p11-schema", renderer.includes("velmere.pass36.a102r44p11.audit-pdf-corpus-manifest.v1"));
check("denominators", policy.denominators?.documents === 150 && policy.denominators?.pages === 700 && policy.denominators?.basic === 50 && policy.denominators?.pro === 50 && policy.denominators?.advanced === 50);
check("no-customer-credit", policy.creditBoundary?.realCustomerPdfCredit === 0 && policy.creditBoundary?.paidReleaseCredit === false && policy.creditBoundary?.liveCredit === false);

const externalRootIndex = process.argv.indexOf("--materials-root");
const externalRootValue = externalRootIndex >= 0 ? process.argv[externalRootIndex + 1] : process.env.VELMERE_R44P11_MATERIALS_ROOT;
const external = { requested: Boolean(externalRootValue), verified: false, checks: [] };
if (externalRootValue) {
  const materialsRoot = path.resolve(externalRootValue);
  for (const [id, row] of Object.entries(policy.materials)) {
    if (!row || typeof row !== "object" || !row.path) continue;
    const file = path.join(materialsRoot, row.path);
    const exists = fs.existsSync(file);
    const ok = exists && fs.statSync(file).size === row.byteLength && sha256File(file) === row.sha256;
    external.checks.push({ id, ok, path: row.path, bytes: exists ? fs.statSync(file).size : null, sha256: exists ? sha256File(file) : null });
  }
  const manifestPath = path.join(materialsRoot, policy.materials.manifest.path);
  const verificationPath = path.join(materialsRoot, policy.materials.verification.path);
  if (fs.existsSync(manifestPath) && fs.existsSync(verificationPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const verification = JSON.parse(fs.readFileSync(verificationPath, "utf8"));
    external.checks.push({ id: "manifest-denominator", ok: manifest.documents === 150 && manifest.pages === 700 && manifest.byTier?.basic === 50 && manifest.byTier?.pro === 50 && manifest.byTier?.advanced === 50 });
    external.checks.push({ id: "verification-pass", ok: verification.failed === 0 && verification.documentsPassed === 150 && verification.pagesExecuted === 700 && verification.customerSemanticsDocuments === 150 && verification.neutralSourceDocuments === 150 });
  }
  external.verified = external.checks.length >= 5 && external.checks.every((row) => row.ok);
  check("external-pdf-evidence-bound", external.verified, external.checks.filter((row) => !row.ok));
}
const failed = checks.filter((row) => !row.ok);
const result = {
  schemaVersion: "velmere.pass36.a102r44p11.pdf-customer-truth-policy-verification.v1",
  status: failed.length ? "FAIL_R44P11_PDF_CUSTOMER_TRUTH_POLICY" : external.requested ? "PASS_R44P11_PDF_CUSTOMER_TRUTH_EVIDENCE_BOUND" : "PASS_R44P11_PDF_CUSTOMER_TRUTH_SOURCE_POLICY",
  revisionId: policy.revisionId,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  external,
  checksDetail: checks,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
