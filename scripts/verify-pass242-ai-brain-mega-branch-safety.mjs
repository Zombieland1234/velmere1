import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");
const errors=[];
const modal=read("components/market-integrity/TokenRiskModal.tsx");
const css=read("app/globals.css");
const pkg=read("package.json");
const preflight=read("scripts/vercel-preflight.mjs");
const contracts=[
  "vlm-brain-qa-trace-bundle.ts",
  "vlm-brain-adapter-orchestration-plan.ts",
  "vlm-brain-access-copy-firewall.ts",
  "vlm-brain-pdf-storage-redaction-bridge.ts",
  "vlm-brain-missing-data-escalation-queue.ts",
  "vlm-brain-renderer-comparison-plan.ts",
  "vlm-brain-governance-policy-memo.ts",
  "vlm-brain-audit-trail-index.ts",
  "vlm-brain-customer-readiness-preflight.ts",
  "vlm-brain-mega-branch-control-tower.ts",
];
for (const file of contracts) {
  const source=read(`lib/market-integrity/${file}`);
  if (!/Ready\s*:\s*false|Allowed\s*:\s*false|Required\s*:\s*true|missingDataIsNeutral\s*:\s*false/.test(source)) errors.push(`${file}: missing locked public/customer gate`);
}
const markers=["buildVlmBrainQaTraceBundle","buildVlmBrainAdapterOrchestrationPlan","buildVlmBrainAccessCopyFirewall","buildVlmBrainPdfStorageRedactionBridge","buildVlmBrainMissingDataEscalationQueue","buildVlmBrainRendererComparisonPlan","buildVlmBrainGovernancePolicyMemo","buildVlmBrainAuditTrailIndex","buildVlmBrainCustomerReadinessPreflight","buildVlmBrainMegaBranchControlTower",'data-vlm-mega-branch-control-tower="pass242"',"PASS242 marker"];
for (const marker of markers) if (!modal.includes(marker)) errors.push(`TokenRiskModal missing ${marker}`);
if (!css.includes("PASS233–PASS242 — AI Brain mega branch control tower")) errors.push("globals.css missing PASS233-242 CSS marker");
if (!pkg.includes("verify:pass242-ai-brain-mega-branch")) errors.push("package.json missing pass242 verify script");
if (!preflight.includes("PASS233-PASS242 AI Brain mega branch guard")) errors.push("vercel-preflight missing mega branch guard");
if (modal.includes("guaranteed profit") || modal.includes("safe investment") || modal.includes("enter seed phrase")) errors.push("Forbidden wording returned in modal");
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("PASS242 mega branch guard OK");
