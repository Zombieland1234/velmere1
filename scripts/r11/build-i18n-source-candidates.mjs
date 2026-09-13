#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";

const outputRoot = path.resolve(process.argv[2] || "/tmp/r11b/i18n-candidates");
const plans = [
  {
    path: "components/market-integrity/AnalysisCardsSection.tsx",
    replacements: [
      [" (w tym wskaźniki techniczne i on-chain)", " (w tym wskaźniki techniczne i zweryfikowane przepływy sieciowe)"],
    ],
  },
  {
    path: "components/market-integrity/AssetIntelligenceTabs.tsx",
    replacements: [
      ["ON-CHAIN WHALE FLOW RADAR", "NETWORK WHALE FLOW RADAR"],
      ["Weryfikacja skupień portfeli wielorybniczych i przepływów giełdowych w oparciu o kworum węzłów on-chain.", "Weryfikacja skupień portfeli wielorybniczych i przepływów giełdowych w oparciu o kworum zweryfikowanych węzłów sieci."],
    ],
  },
  {
    path: "components/risk-management/RiskManagementPage.tsx",
    replacements: [
      ["On-Chain Code Mutation Response", "Deployed Bytecode Mutation Response"],
      ["Reakcja na zmianę kodu on-chain", "Reakcja na zmianę wdrożonego kodu bajtowego"],
    ],
  },
  {
    path: "components/verified-audits/VerifiedAuditsPage.tsx",
    replacements: [
      ["DYNAMIC IMMUTABILITY ENGINE — ON-CHAIN VERIFICATION REGISTRY", "DYNAMIC IMMUTABILITY ENGINE — NETWORK VERIFICATION REGISTRY"],
      ["mutates on-chain bytecode", "mutates deployed bytecode"],
      ["unauthorized on-chain mutation", "unauthorized deployed-bytecode mutation"],
      ["unauthorized on-chain mutation.", "unauthorized deployed-bytecode mutation."],
      ["modyfikacji on-chain", "modyfikacji wdrożonego kodu"],
      ["live on-chain change", "live deployed-bytecode change"],
      ["upon on-chain mutation", "upon deployed-bytecode mutation"],
    ],
  },
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const report = {
  schemaVersion: "velmere.r11b.i18n-source-candidate.v1",
  sourceSha: process.env.GITHUB_SHA || null,
  outputRoot,
  files: [],
};

for (const plan of plans) {
  const original = fs.readFileSync(plan.path, "utf8");
  let next = original;
  const replacements = [];
  for (const [from, to] of plan.replacements) {
    const parts = next.split(from);
    const count = parts.length - 1;
    if (count > 0) next = parts.join(to);
    replacements.push({ from, to, count });
  }
  if (replacements.every((row) => row.count === 0)) {
    throw new Error(`candidate_no_replacement_applied:${plan.path}`);
  }
  const destination = path.join(outputRoot, plan.path);
  fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
  fs.writeFileSync(destination, next, { encoding: "utf8", mode: 0o600 });
  report.files.push({
    path: plan.path,
    beforeSha256: sha256(original),
    afterSha256: sha256(next),
    byteDelta: Buffer.byteLength(next) - Buffer.byteLength(original),
    replacements,
  });
}

fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
fs.writeFileSync(path.join(outputRoot, "REPORT.json"), `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
console.log(JSON.stringify(report, null, 2));
