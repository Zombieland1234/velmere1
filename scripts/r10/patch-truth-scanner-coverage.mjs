#!/usr/bin/env node
import fs from "node:fs";

function replaceExact(file, from, to, label) {
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes(from)) throw new Error(`truth_scanner_anchor_missing:${label}`);
  src = src.replace(from, to);
  fs.writeFileSync(file, src);
}

replaceExact(
  "scripts/r10/release-truth-lib.mjs",
  `    ["PSEUDO_RFC3161_LOCAL_TSA", /"tsaName"\\s*:\\s*"Velm[èe]re\\s+RFC\\s*3161\\s+Trusted\\s+Authority"/i, "P0", "A locally synthesized JSON timestamp must not be represented as an RFC 3161 trusted TSA token."],`,
  `    ["PSEUDO_RFC3161_LOCAL_TSA", /"tsaName"\\s*:\\s*"Velm[èe]re\\s+RFC\\s*3161\\s+Trusted\\s+Authority"/i, "P0", "A locally synthesized JSON timestamp must not be represented as an RFC 3161 trusted TSA token."],\n    ["CLAIM_CUSTOMER_RFC3161_CERTIFICATION", /(?:Certyfikat|Certyfikacja|stemplem|dowodu\\s+kryptograficznego)[^\\n]{0,120}RFC\\s*3161|RFC\\s*3161[^\\n]{0,120}(?:Trusted\\s+Authority|certyf|certif|stempel)/i, "P0", "Customer-facing RFC 3161 certification/TSA wording requires an externally verified exact-scope TSA token; local SHA-256 integrity is not sufficient."],`,
  "customer_rfc3161_pattern",
);

replaceExact(
  "scripts/r10/release-truth-lib.mjs",
  `  const scanRoots = ["dowody9", "dowody4", "docs/audit", "reports", "app", "public", "scripts"];`,
  `  const scanRoots = ["dowody9", "dowody4", "docs/audit", "reports", "app", "components", "public", "scripts"];`,
  "components_scan_root",
);

replaceExact(
  "scripts/r10/test-release-truth-gate.mjs",
  `  fs.mkdirSync(path.join(tmp, "scripts"), { recursive: true });\n  fs.mkdirSync(path.join(tmp, "config", "pass24"), { recursive: true });`,
  `  fs.mkdirSync(path.join(tmp, "scripts"), { recursive: true });\n  fs.mkdirSync(path.join(tmp, "components", "market-integrity"), { recursive: true });\n  fs.mkdirSync(path.join(tmp, "config", "pass24"), { recursive: true });`,
  "components_fixture_directory",
);

replaceExact(
  "scripts/r10/test-release-truth-gate.mjs",
  `  fs.writeFileSync(\n    path.join(tmp, "dowody9", "123_real_markets_xau_advanced_pl.json"),`,
  `  fs.writeFileSync(\n    path.join(tmp, "components", "market-integrity", "CustomerPanel.tsx"),\n    '<div>Certyfikat Instytucjonalny RFC 3161 z unikalnym SHA-256 Hash</div>\\n'\n  );\n  fs.writeFileSync(\n    path.join(tmp, "dowody9", "123_real_markets_xau_advanced_pl.json"),`,
  "customer_component_fixture",
);

replaceExact(
  "scripts/r10/test-release-truth-gate.mjs",
  `  assert(ids.has("PSEUDO_RFC3161_LOCAL_TSA"));`,
  `  assert(ids.has("PSEUDO_RFC3161_LOCAL_TSA"));\n  assert(ids.has("CLAIM_CUSTOMER_RFC3161_CERTIFICATION"));`,
  "customer_component_assertion",
);

replaceExact(
  "scripts/r10/test-release-truth-gate.mjs",
  `  fs.writeFileSync(path.join(tmp, "docs", "audit", "active.md"), "AUDIT CONTENT: INSUFFICIENT EVIDENCE\\n");`,
  `  fs.writeFileSync(path.join(tmp, "docs", "audit", "active.md"), "AUDIT CONTENT: INSUFFICIENT EVIDENCE\\n");\n  fs.writeFileSync(path.join(tmp, "components", "market-integrity", "CustomerPanel.tsx"), '<div>Lokalna integralność pliku SHA-256 — zewnętrzny TSA niezweryfikowany</div>\\n');`,
  "clean_component_fixture",
);

console.log(JSON.stringify({
  status: "PATCHED",
  scanRootsAdded: ["components"],
  newP0Rule: "CLAIM_CUSTOMER_RFC3161_CERTIFICATION",
}, null, 2));
