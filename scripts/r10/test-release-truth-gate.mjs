#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runReleaseTruthScan, scanTextForReleaseTruth } from "./release-truth-lib.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-r10-truth-"));
try {
  fs.mkdirSync(path.join(tmp, "docs", "audit"), { recursive: true });
  fs.mkdirSync(path.join(tmp, "dowody9"), { recursive: true });
  fs.mkdirSync(path.join(tmp, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(tmp, "config", "pass24"), { recursive: true });

  fs.writeFileSync(path.join(tmp, ".nvmrc"), "24.18.0\n");
  fs.writeFileSync(path.join(tmp, ".node-version"), "24.18.0\n");
  fs.writeFileSync(
    path.join(tmp, "config", "pass24", "runtime-policy.json"),
    JSON.stringify({ node: { version: "24.18.0", bundledNpmVersion: "11.16.0" } }, null, 2)
  );
  fs.writeFileSync(path.join(tmp, "next.config.mjs"), "export default { typescript: { ignoreBuildErrors: true } };\n");
  fs.writeFileSync(
    path.join(tmp, "docs", "audit", "active.md"),
    "Full SMT Z3 Solver Verification\n72 Automated Static Detectors\nOfficially certified for production\nZAUTOMATYZOWANA WERYFIKACJA STATYCZNA & FORMALNA\n"
  );
  fs.writeFileSync(
    path.join(tmp, "dowody9", "123_real_markets_xau_advanced_pl.json"),
    JSON.stringify({
      target: "XAU Physical Gold Bullion Standard",
      identifier: "cme:gc-front",
      regulatoryJurisdiction: "SEC / FINRA / CFTC",
      marketSpec: { assetClass: "Smart Contract Application" },
    }, null, 2)
  );

  const findings = runReleaseTruthScan(tmp);
  const ids = new Set(findings.map((f) => f.id));
  assert(ids.has("BUILD_IGNORE_TYPESCRIPT_ERRORS"));
  assert(ids.has("CLAIM_FORMAL_FULL_SMT"));
  assert(ids.has("CLAIM_FORMAL_STATIC_AND_FORMAL_PL"));
  assert(ids.has("HARDCODED_DETECTOR_72"));
  assert(ids.has("CLAIM_PRODUCTION_READY"));
  assert(ids.has("REAL_MARKETS_SMART_CONTRACT_ASSET_CLASS"));
  assert(ids.has("REAL_MARKETS_GENERIC_REGULATOR_TRIAD"));
  assert(ids.has("REAL_MARKETS_XAU_PHYSICAL_VS_GC_FUTURE"));

  fs.writeFileSync(path.join(tmp, "next.config.mjs"), "export default { reactStrictMode: true };\n");
  fs.writeFileSync(path.join(tmp, "docs", "audit", "active.md"), "AUDIT CONTENT: INSUFFICIENT EVIDENCE\n");
  fs.writeFileSync(
    path.join(tmp, "dowody9", "123_real_markets_xau_advanced_pl.json"),
    JSON.stringify({
      target: "XAU CME Gold Future",
      identifier: "cme:gc-front",
      regulatoryJurisdiction: "CFTC / CME",
      marketSpec: { assetClass: "commodity", instrumentType: "future" },
    }, null, 2)
  );
  const clean = runReleaseTruthScan(tmp);
  assert.equal(clean.filter((f) => f.severity === "P0").length, 0, JSON.stringify(clean, null, 2));

  const direct = scanTextForReleaseTruth("customer.md", "AUTOMATED STATIC & FORMAL ANALYSIS");
  assert.equal(direct[0]?.id, "CLAIM_FORMAL_STATIC_AND_FORMAL");

  console.log("R10 release truth gate regression: PASS");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
