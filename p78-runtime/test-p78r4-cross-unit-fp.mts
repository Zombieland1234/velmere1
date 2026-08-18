import fs from "node:fs";
import path from "node:path";
import { buildPass5002Erc2771MulticallSourceDetectorReport } from "../p75-work/source/lib/security/erc2771-multicall-source-detector";
import type { Pass2572VerifiedStaticEvidence } from "../p75-work/source/lib/security/audit-provider-runtime-client";

const outDir = process.env.P78R4_RESULT_DIR ?? process.cwd();
const address = "0x1111111111111111111111111111111111111111";

const metaOnly = `pragma solidity ^0.8.20;
abstract contract ERC2771Context {}
contract MetaOnly is ERC2771Context {
  function _msgSender() internal view returns(address){ return msg.sender; }
  function privileged() external { require(_msgSender() != address(0), "auth"); }
}`;

const batchOnly = `pragma solidity ^0.8.20;
contract BatchOnly {
  function multicall(bytes[] calldata payloads) external {
    for(uint256 i=0;i<payloads.length;i++) { address(this).delegatecall(payloads[i]); }
  }
}`;

const sourceText = JSON.stringify({
  language: "Solidity",
  sources: {
    "MetaOnly.sol": { content: metaOnly },
    "BatchOnly.sol": { content: batchOnly },
  },
  settings: {},
});

const verifiedStaticEvidence: Pass2572VerifiedStaticEvidence = {
  contractAddress: address,
  chain: "ethereum",
  provider: "Etherscan V2",
  observedAt: "2026-08-18T12:00:00.000Z",
  responseDigest: "b".repeat(64),
  sourceText,
};

const result = buildPass5002Erc2771MulticallSourceDetectorReport({
  locale: "en",
  chain: "ethereum",
  contractAddress: address,
  verifiedStaticEvidence,
});

const falsePositiveObserved = result.state === "confirmed_source_pattern";
const receipt = {
  schemaVersion: "velmere.p78r4.cross-unit-correlation-diagnostic.v1",
  status: "MEASURED",
  case: "two_unrelated_contracts_one_meta_context_one_multicall",
  expectedSafeInterpretation: "not_detected_because_no_single_contract_or_inheritance_component_combines_all_preconditions",
  observedState: result.state,
  falsePositiveObserved,
  signals: result.signals,
  sourceUnitCount: result.sourceUnitCount,
  truthBoundary: "Diagnostic only. A false positive here demonstrates missing contract/inheritance correlation; it grants no accuracy credit and does not change P78R3 product bytes.",
  zeroFakeCredit: {
    formalDetectorAccuracy: "WITHHELD",
    runtimeExploitability: 0,
    customerFinal: "0/20",
    auditFinalPdf: "0/3",
    rights: "2/203",
    paidValue: "0/10",
    saleEligible: "0/20",
    live: false,
  },
};
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "P78R4_CROSS_UNIT_CORRELATION_DIAGNOSTIC.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
