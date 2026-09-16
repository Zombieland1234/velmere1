import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { executeFullAuditV2 } from "../../lib/security/v2/master-audit-orchestrator";
function generateSimulatedBytecode(source: string): string {
  // Disassemblable bytecode payload embedding common opcode patterns
  let hex = "608060405234801561001057600080fd5b50"; // Standard Solidity 0.8 prologue

  if (source.includes("transferOwnership") && !source.includes("acceptOwnership")) {
    hex += "63f2fde38b1461004057"; // PUSH4 0xf2fde38b EQ JUMPI
  }
  if (source.includes("acceptOwnership")) {
    hex += "6379ba50971461005057"; // PUSH4 0x79ba5097 EQ JUMPI
  }
  if (source.includes("getReserves")) {
    hex += "630902f1ac1461006057"; // PUSH4 0x0902f1ac EQ JUMPI
  }
  if (source.includes("latestRoundData")) {
    hex += "63feaf968c1461007057"; // PUSH4 0xfeaf968c EQ JUMPI
  }
  if (source.includes("deposit") && source.includes("convertToShares")) {
    hex += "6301e5237f1463c6e6f59214636e553f6514"; // ERC-4626 selectors
  }
  if (source.includes("burn(address,uint256)")) {
    hex += "6340c10f1914"; // Public mint/burn dispatcher
  }
  if (source.includes("selfdestruct")) {
    hex += "5b600033ff"; // JUMPDEST PUSH1 0 CALLER SELFDESTRUCT
  }
  if (source.includes("tx.origin")) {
    hex += "5b3260005414"; // ORIGIN SLOAD EQ
  }

  // Mutex pattern vs Unprotected external call pattern based purely on code semantics:
  const isGuarded =
    source.includes("nonReentrant") ||
    source.includes("_status") ||
    source.includes("_ENTERED") ||
    source.includes("ReentrancyGuard");
  const hasExternalCall =
    source.includes(".call{value:") ||
    source.includes(".call.value(") ||
    source.includes("msg.sender.call");

  if (isGuarded) {
    hex += "5b600054600260005560006000600060006000336000f1506001600055"; // Guarded mutex lock pattern (SLOAD -> SSTORE 2 ... SSTORE 1)
  } else if (hasExternalCall) {
    hex += "5b60006000600060006000336000f1506001600055"; // Classic Reentrancy pattern: CALL followed by SSTORE without mutex
  }

  // Proxy implementation slot check based purely on code semantics:
  if (
    source.includes("_IMPLEMENTATION_SLOT") ||
    source.includes("360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc") ||
    source.includes("eip1967")
  ) {
    hex += "7f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc54"; // Implementation SLOAD
  }

  hex += "5b00"; // STOP
  return `0x${hex}`;
}

const corpus = JSON.parse(fs.readFileSync("scripts/r13g/synthetic-corpus.json", "utf8"));
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const rows = [];
for (const item of corpus.cases) {
  const sourceCode = fs.readFileSync(item.path, "utf8");
  const bytecode = generateSimulatedBytecode(sourceCode);
  for (const tier of ["BASIC", "PRO", "ADVANCED"] as const) {
    const result = executeFullAuditV2({ contractAddress: `0x${sha(item.name).slice(0,40)}`, chainId:"1", blockNumber:1, bytecode, sourceCode, contractName:item.name, tier });
    const detected = result.findings.map(f => f.findingId);
    const highCritical = result.findings.filter(f => f.severity === "high" || f.severity === "critical").map(f => f.findingId);
    const expectedFindingMatch = item.expectedFindingIds.every((id: string) => detected.includes(id));
    const accepted = expectedFindingMatch && (!item.expectNoHighCritical || highCritical.length === 0);
    rows.push({ case:item.name, sourcePath:item.path, sourceSha256:sha(sourceCode), simulatedBytecodeSha256:sha(bytecode), tier, accepted, expectedFindingIds:item.expectedFindingIds, detectedFindingIds:detected, highCriticalFindingIds:highCritical,
      unadjudicatedFindingIds:detected.filter(id => !item.expectedFindingIds.includes(id)),
      formalProofsClaimed:result.formalAssurance.filter(p => p.proven).length,
      verifiedPatchesClaimed:result.patchValidation.patchesPassingRegression,
      modelIterations:result.fuzzResults.iterationsExecuted, fullResult:result });
  }
}
const summary = Object.fromEntries(["BASIC", "PRO", "ADVANCED"].map(tier => {
  const subset = rows.filter(r => r.tier === tier);
  return [tier,{cases:subset.length,scenarioPass:subset.filter(r=>r.accepted).length,scenarioFail:subset.filter(r=>!r.accepted).length, formalProofsClaimed:subset.reduce((n,r)=>n+r.formalProofsClaimed,0),verifiedPatchesClaimed:subset.reduce((n,r)=>n+r.verifiedPatchesClaimed,0)}];
}));
const equalFindingSets = corpus.cases.filter((item: {name:string}) => new Set(rows.filter(r=>r.case===item.name).map(r=>JSON.stringify([...r.detectedFindingIds].sort()))).size===1).length;
const out = {schemaVersion:"velmere.r13g.tier-benchmark.v1",executedAt:new Date().toISOString(),nodeVersion:process.version,baselineCode:"671132a95a497e45c128a4dc364d6823edaf4168",cases:corpus.cases.length,executions:rows.length,summary,equalFindingSetsAcrossTiers:equalFindingSets,independentHoldout:false,compiledBytecode:false,onchainReplay:false,competitorExecuted:false,precision:null,recall:null,f1:null,limits:["Scenario detection on educational fixtures only; no full ground-truth adjudication of all findings.","Simulated opcodes are derived from source keywords, not compiled target bytecode.","The same corpus is public in this repo and is not a blind holdout.","V2 orchestrator is invoked directly; these are not paid Audit/Shield/Real Markets endpoints.","Fuzz iterations run a local balance model, not the target EVM."],rows};
const dest = process.env.R13G_EVIDENCE_DIR ?? "r13g-evidence";fs.mkdirSync(dest,{recursive:true});fs.writeFileSync(path.join(dest,"TIER_BENCHMARK.json"),JSON.stringify(out,null,2)+"\n");
console.log(JSON.stringify({summary,equalFindingSetsAcrossTiers:equalFindingSets,executions:rows.length,limits:out.limits},null,2));
if(rows.some(r=>!r.accepted||r.formalProofsClaimed||r.verifiedPatchesClaimed))process.exitCode=1;
