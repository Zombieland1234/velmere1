import fs from "node:fs";
import path from "node:path";
import { buildPass5002Erc2771MulticallSourceDetectorReport } from "../p75-work/source/lib/security/erc2771-multicall-source-detector";
import type { Pass2572VerifiedStaticEvidence } from "../p75-work/source/lib/security/audit-provider-runtime-client";

const outDir = process.env.P78R6_RESULT_DIR ?? process.cwd();
const address = "0x1111111111111111111111111111111111111111";

// The real OpenZeppelin symbol is imported under a DIFFERENT local name and never inherited.
// A separate local class named ERC2771Context has plain msg.sender semantics.
const aliasDecoySource = `pragma solidity ^0.8.20;
import { ERC2771Context as OZERC2771Context } from "@openzeppelin/contracts/metatx/ERC2771Context.sol";
abstract contract ERC2771Context {
  function _msgSender() internal view virtual returns (address) { return msg.sender; }
}
contract AliasDecoyTarget is ERC2771Context {
  function multicall(bytes[] calldata payloads) external {
    for (uint256 i = 0; i < payloads.length; i++) { address(this).delegatecall(payloads[i]); }
  }
  function privileged() external { require(_msgSender() != address(0), "auth"); }
}`;

const evidence: Pass2572VerifiedStaticEvidence = {
  contractAddress: address,
  chain: "ethereum",
  provider: "Etherscan V2",
  observedAt: "2026-08-18T12:00:00.000Z",
  responseDigest: "f".repeat(64),
  contractName: "AliasDecoyTarget",
  sourceText: aliasDecoySource,
};

const result = buildPass5002Erc2771MulticallSourceDetectorReport({
  locale: "en",
  chain: "ethereum",
  contractAddress: address,
  verifiedStaticEvidence: evidence,
});

const falsePositiveObserved = result.state === "confirmed_source_pattern";
const receipt = {
  schemaVersion: "velmere.p78r6.oz-import-symbol-binding-diagnostic.v1",
  status: "MEASURED",
  case: "real_oz_erc2771_import_aliased_but_target_inherits_unrelated_local_erc2771context",
  expectedSafeInterpretation: "blocked_or_not_detected_because_the_imported_oz_symbol_is_not_the_inherited_ERC2771Context_symbol",
  observedState: result.state,
  falsePositiveObserved,
  contextAuthenticity: result.contextAuthenticity,
  correlation: result.correlation,
  signals: result.signals,
  sourceFacts: {
    realOzImportExists: true,
    importedLocalSymbolName: "OZERC2771Context",
    targetInheritedBaseName: "ERC2771Context",
    localErc2771MsgSenderIsPlainMsgSender: true,
  },
  truthBoundary: "Diagnostic only. A confirmed finding demonstrates that an authentic import path is insufficient unless the imported local symbol is the same symbol actually inherited by the target closure. No accuracy or exploitability credit is granted.",
  zeroFakeCredit: {
    formalDetectorAccuracy: "WITHHELD",
    runtimeExploitability: 0,
    deployedBytecodeEquivalence: 0,
    customerFinal: "0/20",
    auditFinalPdf: "0/3",
    rights: "2/203",
    paidValue: "0/10",
    saleEligible: "0/20",
    live: false,
  },
};
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "P78R6_IMPORT_SYMBOL_BINDING_DIAGNOSTIC.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
