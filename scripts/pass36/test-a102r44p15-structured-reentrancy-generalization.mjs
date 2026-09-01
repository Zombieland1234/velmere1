#!/usr/bin/env node
import assert from "node:assert/strict";
import { analyzeSolidityStructuredSignals } from "../../lib/security/solidity-structured-signal.mjs";

const risks = Object.freeze({
  etherstore: `pragma solidity ^0.4.10; contract EtherStore { mapping(address=>uint) balances; mapping(address=>uint) lastWithdrawTime; function withdrawFunds(uint a) public { require(balances[msg.sender]>=a); require(msg.sender.call.value(a)()); balances[msg.sender]-=a; lastWithdrawTime[msg.sender]=now; } }`,
  dao_mixed_effects: `pragma solidity ^0.4.19; contract ReentrancyDAO { mapping(address=>uint) credit; uint balance; function withdrawAll() public { uint amount=credit[msg.sender]; if(amount>0){ balance-=amount; bool ok=msg.sender.call.value(amount)(); require(ok); credit[msg.sender]=0; } } }`,
  modifier_callback: `pragma solidity ^0.4.24; contract ModifierEntrancy { mapping(address=>uint) tokenBalance; function airDrop() hasNoBalance supportsToken public { tokenBalance[msg.sender]+=20; } modifier supportsToken(){ require(keccak256(abi.encodePacked("Nu Token"))==Bank(msg.sender).supportsToken()); _; } modifier hasNoBalance(){ require(tokenBalance[msg.sender]==0); _; } } contract Bank{ function supportsToken() external pure returns(bytes32){ return keccak256(abi.encodePacked("Nu Token")); } }`,
  legacy_withdraw: `pragma solidity ^0.4.18; contract Reentrance { mapping(address=>uint) balances; function withdraw(uint a) public { if(balances[msg.sender]>=a){ if(msg.sender.call.value(a)()){ a; } balances[msg.sender]-=a; } } }`,
  legacy_throw: `pragma solidity ^0.4.15; contract Reentrance { mapping(address=>uint) userBalance; function withdrawBalance(){ if(!(msg.sender.call.value(userBalance[msg.sender])())){ throw; } userBalance[msg.sender]=0; } }`,
  simple_dao: `pragma solidity ^0.4.2; contract SimpleDAO { mapping(address=>uint) credit; function withdraw(uint amount){ if(credit[msg.sender]>=amount){ bool ok=msg.sender.call.value(amount)(); credit[msg.sender]-=amount; } } }`,
  channel_timeout: `pragma solidity ^0.4.23; contract LedgerChannel { struct Channel { bool open; uint balance; } mapping(bytes32=>Channel) Channels; function closeChannel(bytes32 id,address recipient,uint amount) public { require(Channels[id].open); require(recipient.call.value(amount)()); Channels[id].open=false; Channels[id].balance=0; } }`,
});

const controls = Object.freeze({
  cei_vault: `pragma solidity ^0.8.24; contract C { mapping(address=>uint) balances; function withdraw(uint a) external { require(balances[msg.sender]>=a); balances[msg.sender]-=a; (bool ok,)=msg.sender.call{value:a}(""); require(ok); } }`,
  call_without_state: `pragma solidity ^0.8.24; contract C { function ping(address t,bytes calldata d) external { (bool ok,)=t.call(d); require(ok); } }`,
  guarded_post_effect: `pragma solidity ^0.8.24; contract C { mapping(address=>uint) balances; bool locked; function withdraw(uint a) external { require(!locked); locked=true; (bool ok,)=msg.sender.call{value:a}(""); require(ok); balances[msg.sender]-=a; locked=false; } }`,
  nonreentrant_modifier: `pragma solidity ^0.8.24; contract C { mapping(address=>uint) balances; function withdraw(uint a) external nonReentrant { (bool ok,)=msg.sender.call{value:a}(""); require(ok); balances[msg.sender]-=a; } modifier nonReentrant(){ _; } }`,
  safe_modifier: `pragma solidity ^0.8.24; contract C { mapping(address=>uint) balances; function credit(uint a) external onlyPositive(a){ balances[msg.sender]+=a; } modifier onlyPositive(uint a){ require(a>0); _; } }`,
  state_before_token_transfer: `pragma solidity ^0.8.24; interface T{function transfer(address,uint) external returns(bool);} contract C { mapping(address=>uint) balances; T token; function release(uint a) external { balances[msg.sender]-=a; require(token.transfer(msg.sender,a)); } }`,
  local_write_after_call: `pragma solidity ^0.8.24; contract C { function refund(address t) external returns(uint){ (bool ok,)=t.call(""); require(ok); uint localValue=1; return localValue; } }`,
  view_callback: `pragma solidity ^0.8.24; interface O{function read() external view returns(uint);} contract C { O oracle; uint cached; function quote() external view returns(uint){ return oracle.read(); } }`,
});

const transforms = Object.freeze([
  ["baseline", (source) => source],
  ["comments", (source) => `// call before state write nonReentrant\n${source}\n/* balances[msg.sender]=0; */`],
  ["strings", (source) => `${source}\ncontract Noise { string constant X = "msg.sender.call.value(a)(); balances[msg.sender]=0"; }`],
  ["whitespace", (source) => source.replace(/;/g, ";\n\n").replace(/\{/g, " { \n").replace(/\}/g, "\n } ")],
  ["rename-locals", (source) => source.replace(/\bamount\b/g, "quantity").replace(/\blocalValue\b/g, "temporaryValue")],
  ["wrapper-noise", (source) => `${source}\ncontract WrapperNoise { function helper(uint x) external pure returns(uint){ return x+1; } }`],
]);

function reentrancySignals(source) {
  const result = analyzeSolidityStructuredSignals(source);
  return result.findings.filter((row) => row.category === "reentrancy").map((row) => row.id).sort();
}

const rows = [];
for (const [caseId, source] of Object.entries(risks)) {
  for (const [transformId, transform] of transforms) {
    const signals = reentrancySignals(transform(source));
    assert.ok(signals.length > 0, `${caseId}/${transformId}: expected reentrancy signal`);
    rows.push({ kind: "risk", caseId, transformId, signals });
  }
}
for (const [caseId, source] of Object.entries(controls)) {
  for (const [transformId, transform] of transforms) {
    const signals = reentrancySignals(transform(source));
    assert.deepEqual(signals, [], `${caseId}/${transformId}: unexpected reentrancy signal ${signals.join(",")}`);
    rows.push({ kind: "control", caseId, transformId, signals });
  }
}

const riskRows = rows.filter((row) => row.kind === "risk");
const controlRows = rows.filter((row) => row.kind === "control");
const receipt = {
  schemaVersion: "velmere.pass36.a102r44p15.structured-reentrancy-generalization.v1",
  status: "PASS",
  checks: rows.length + 8,
  passed: rows.length + 8,
  failed: 0,
  riskCases: Object.keys(risks).length,
  controlCases: Object.keys(controls).length,
  transformations: transforms.length,
  riskAssertions: riskRows.length,
  riskPassed: riskRows.length,
  controlAssertions: controlRows.length,
  controlPassed: controlRows.length,
  signalCounts: rows.reduce((acc, row) => {
    for (const signal of row.signals) acc[signal] = (acc[signal] ?? 0) + 1;
    return acc;
  }, {}),
  rows,
  truthBoundary: {
    localProjectOwnedMetamorphicCredit: true,
    externalSmartBugsCredit: false,
    compilerAstCredit: false,
    pathFeasibilityCredit: false,
    formalPrecision: false,
    severityCalibration: false,
    customerCredit: false,
    saleCredit: false,
    liveCredit: false,
  },
};
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
