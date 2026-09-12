#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function replaceExactlyOnce(file, oldText, newText, id) {
  const source = fs.readFileSync(file, "utf8");
  const count = source.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${id}_match_count:${count}`);
  fs.writeFileSync(file, source.replace(oldText, newText));
}

function readWorkflowCorpus() {
  const chunks = [];
  const root = ".github/workflows";
  for (const name of fs.readdirSync(root)) {
    if (!/\.ya?ml$/i.test(name)) continue;
    chunks.push([name, fs.readFileSync(path.join(root, name), "utf8")]);
  }
  return chunks;
}

function assertNoActiveReference(targetPath, allowedWorkflowNames = []) {
  const base = path.basename(targetPath);
  const packageText = fs.readFileSync("package.json", "utf8");
  if (packageText.includes(base) || packageText.includes(targetPath)) {
    throw new Error(`active_package_reference:${targetPath}`);
  }
  for (const [name, text] of readWorkflowCorpus()) {
    if (allowedWorkflowNames.includes(name)) continue;
    if (text.includes(base) || text.includes(targetPath)) {
      throw new Error(`active_workflow_reference:${targetPath}:${name}`);
    }
  }
}

replaceExactlyOnce(
  "lib/market-integrity/report-evidence-capsule.ts",
  '        "fully audited",',
  '        "claim that audit coverage is complete without exact-scope evidence",',
  "report_capsule_forbidden_claim_wording",
);

replaceExactlyOnce(
  "lib/checkout/readiness.ts",
  '    reasons.push({ code: "fulfilment_ready", message: "Fulfilment workflow must be production-ready." });',
  '    reasons.push({ code: "fulfilment_ready", message: "Fulfilment workflow must pass the production-readiness gate." });',
  "checkout_readiness_internal_wording",
);

const retire = [
  "scripts/r10/patch-pdf-truth-layout.mjs",
  "scripts/r10/patch-final-rfc3161-truth.mjs",
  "scripts/r10/patch-analysiscards-truth.mjs",
  "scripts/r10/migrate-legacy-report-integrity.mjs",
  "scripts/generate-institutional-specs.mjs",
];
for (const file of retire) {
  if (!fs.existsSync(file)) throw new Error(`retire_target_missing:${file}`);
  // The cleanup workflow contains an exact write-scope list naming these files.
  // It self-deletes in the same local transaction, so it is the only allowed
  // reference during this one-shot retirement pass.
  assertNoActiveReference(file, ["r11-truth-cleanup-apply.yml"]);
  fs.unlinkSync(file);
}

const canonicalOneShot = [
  "scripts/r11/apply-canonical-report-truth-fix.mjs",
  ".github/workflows/r11-canonical-report-truth-apply.yml",
];
for (const file of canonicalOneShot) {
  if (!fs.existsSync(file)) throw new Error(`canonical_one_shot_missing:${file}`);
  fs.unlinkSync(file);
}

// This worker is intentionally one-shot. Delete the worker and its workflow from
// the candidate tree before the strict truth scan so remediation tooling cannot
// become part of the long-lived release surface.
for (const file of [
  "scripts/r11/apply-truth-cleanup-pass.mjs",
  ".github/workflows/r11-truth-cleanup-apply.yml",
]) {
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

console.log(JSON.stringify({
  status: "PATCHED_AND_RETIRED_ONE_SHOT_TOOLING",
  modified: [
    "lib/market-integrity/report-evidence-capsule.ts",
    "lib/checkout/readiness.ts",
  ],
  retired: [...retire, ...canonicalOneShot],
}, null, 2));
