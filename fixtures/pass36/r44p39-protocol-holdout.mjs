export const R44P39_PROTOCOL_HOLDOUT = Object.freeze({
  classification: "LOCAL_HISTORICAL_MULTI_FILE_PROTOCOL_HOLDOUT_NOT_INDEPENDENT",
  sourceRoot: "fixtures/pass36/r44p11-compiler-ast/src",
  expectedRiskSignals: Object.freeze([
    { contractName: "BridgeRisk", signalId: "cross_chain_replay" },
    { contractName: "GovernanceRisk", signalId: "low_quorum" },
    { contractName: "SolvencyRisk", signalId: "insolvent_withdraw" },
    { contractName: "InitRisk", signalId: "unguarded_initializer" },
    { contractName: "LayoutV2Risk", signalId: "storage_layout_collision" },
    { contractName: "ShareRisk", signalId: "post_balance_share_accounting" },
  ]),
  expectedControlAbsence: Object.freeze([
    { contractName: "BridgeControl", signalId: "cross_chain_replay" },
    { contractName: "GovernanceControl", signalId: "low_quorum" },
    { contractName: "SolvencyControl", signalId: "insolvent_withdraw" },
    { contractName: "InitControl", signalId: "unguarded_initializer" },
    { contractName: "ShareControl", signalId: "post_balance_share_accounting" },
  ]),
  storageComparisonPairs: Object.freeze([{ baselineContract: "LayoutV1", candidateContract: "LayoutV2Risk" }]),
  truthBoundary: "This is a historical local developer fixture with multi-file imports and inheritance/storage behavior. It is not independent ground truth or a real deployed protocol corpus.",
});
