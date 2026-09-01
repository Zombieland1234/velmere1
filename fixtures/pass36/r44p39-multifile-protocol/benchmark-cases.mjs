import { buildR44P38CaseSources } from "../r44p38-compiler-ast/benchmark-cases.mjs";

const DEFINITIONS = Object.freeze([
  ["R44P39-PROTO-01", "open_mint", "high"],
  ["R44P39-PROTO-02", "unguarded_initializer", "high"],
  ["R44P39-PROTO-03", "cross_chain_replay", "high"],
  ["R44P39-PROTO-04", "signature_replay", "high"],
  ["R44P39-PROTO-05", "spot_oracle", "high"],
  ["R44P39-PROTO-06", "low_quorum", "high"],
  ["R44P39-PROTO-07", "transfer_policy_bypass", "high"],
  ["R44P39-PROTO-08", "fee_token_mismatch", "medium"],
  ["R44P39-PROTO-09", "post_balance_share_accounting", "high"],
  ["R44P39-PROTO-10", "storage_layout_collision", "critical"],
  ["R44P39-PROTO-11", "unprotected_upgrade", "critical"],
  ["R44P39-PROTO-12", "reentrancy_state_after_call", "high"],
]);

export const R44P39_PROTOCOL_CASES = Object.freeze(DEFINITIONS.map(([caseId, family, expectedSeverity], index) => ({
  caseId,
  family,
  expectedSeverity,
  split: index < 8 ? "INTERNAL_MULTI_FILE_PROTOCOL_TUNING" : "INTERNAL_MULTI_FILE_HOLDOUT_NOT_INDEPENDENT",
  profile: index % 2,
})));

function inferTarget(sources) {
  for (const [sourcePath, content] of Object.entries(sources)) {
    const inherited = content.match(/\bcontract\s+([A-Za-z_][A-Za-z0-9_]*)\s+is\s+/u);
    if (inherited) return { sourcePath, contractName: inherited[1] };
  }
  for (const [sourcePath, content] of Object.entries(sources)) {
    const matches = [...content.matchAll(/\bcontract\s+([A-Za-z_][A-Za-z0-9_]*)/gu)];
    if (matches.length) return { sourcePath, contractName: matches.at(-1)[1] };
  }
  throw new Error("r44p39_target_contract_not_found");
}

function auxiliarySource(caseRow) {
  return `pragma solidity 0.8.24;\nlibrary ProtocolCaseMetadata {\n  function caseNumber() internal pure returns (uint256) { return ${Number(caseRow.caseId.slice(-2))}; }\n}\ninterface IProtocolCaseMarker { function protocolCaseMarker() external pure returns (bytes32); }\n`;
}

export function buildR44P39ProtocolCaseSources(caseRow, risk) {
  const base = buildR44P38CaseSources(caseRow, risk, "inheritance_split_file");
  const sources = { ...base.sources, "ProtocolCaseMetadata.sol": auxiliarySource(caseRow) };
  return {
    sources,
    sourceFiles: Object.entries(sources).map(([path, content]) => ({ path, content })),
    storagePairs: base.storagePairs,
    target: inferTarget(sources),
  };
}
