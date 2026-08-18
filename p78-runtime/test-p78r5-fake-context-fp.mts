import fs from "node:fs";
import path from "node:path";
import { buildPass5002Erc2771MulticallSourceDetectorReport } from "../p75-work/source/lib/security/erc2771-multicall-source-detector";
import type { Pass2572VerifiedStaticEvidence } from "../p75-work/source/lib/security/audit-provider-runtime-client";

const outDir = process.env.P78R5_RESULT_DIR ?? process.cwd();
const address = "0x1111111111111111111111111111111111111111";

const fakeContextSource = `pragma solidity ^0.8.20;
abstract contract ERC2771Context {
  function _msgSender() internal view virtual returns (address) { return msg.sender; }
}
contract HarmlessNamedContext is ERC2771Context {
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
  responseDigest: "d".repeat(64),
  contractName: "HarmlessNamedContext",
  sourceText: fakeContextSource,
};

const result = buildPass5002Erc2771MulticallSourceDetectorReport({
  locale: "en",
  chain: "ethereum",
  contractAddress: address,
  verifiedStaticEvidence: evidence,
});

const trustedForwarderSignals = {
  containsIsTrustedForwarder: /\bisTrustedForwarder\s*\(/.test(fakeContextSource),
  containsForwarderImport: /@openzeppelin\/contracts\/metatx\/ERC2771Context\.sol/.test(fakeContextSource),
  containsCalldataSenderSuffixDecode: /msg\.data/.test(fakeContextSource) && /calldataload|shr\s*\(/.test(fakeContextSource),
};
const falsePositiveObserved = result.state === "confirmed_source_pattern";
const receipt = {
  schemaVersion: "velmere.p78r5.context-authenticity-diagnostic.v1",
  status: "MEASURED",
  case: "custom_contract_named_ERC2771Context_without_trusted_forwarder_semantics",
  expectedSafeInterpretation: "not_detected_or_blocked_because_logical_sender_is_plain_msg_sender_and_no_erc2771_forwarder_semantics_exist",
  observedState: result.state,
  falsePositiveObserved,
  correlation: result.correlation,
  signals: result.signals,
  trustedForwarderSignals,
  truthBoundary: "Diagnostic only. A confirmed source pattern here would demonstrate that class-name matching alone is insufficient to establish ERC-2771 semantics. No formal accuracy or exploitability credit is granted.",
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
fs.writeFileSync(path.join(outDir, "P78R5_CONTEXT_AUTHENTICITY_DIAGNOSTIC.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
