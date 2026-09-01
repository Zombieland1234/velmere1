import { analyzeSolidityStructuredSignals, ANALYZER_CLASS } from "../../lib/security/solidity-structured-signal.mjs";

const cases = [
  {
    id: "smartbugs-reentrancy-simple",
    signal: "reentrancy_order",
    risk: `pragma solidity ^0.4.15; contract Reentrance { mapping(address=>uint) userBalance; function withdrawBalance(){ if(!(msg.sender.call.value(userBalance[msg.sender])())){throw;} userBalance[msg.sender]=0; } }`,
    control: `pragma solidity ^0.8.24; contract Reentrance { mapping(address=>uint) userBalance; function withdrawBalance() external { uint amount=userBalance[msg.sender]; userBalance[msg.sender]=0; (bool ok,)=msg.sender.call{value:amount}(""); require(ok); } }`,
  },
  {
    id: "smartbugs-simple-dao",
    signal: "reentrancy_order",
    risk: `pragma solidity ^0.4.2; contract SimpleDAO { mapping(address=>uint) credit; function withdraw(uint amount){ if(credit[msg.sender]>=amount){ bool res=msg.sender.call.value(amount)(); credit[msg.sender]-=amount; } } }`,
    control: `pragma solidity ^0.8.24; contract SimpleDAO { mapping(address=>uint) credit; function withdraw(uint amount) external { require(credit[msg.sender]>=amount); credit[msg.sender]-=amount; (bool ok,)=msg.sender.call{value:amount}(""); require(ok); } }`,
  },
  {
    id: "smartbugs-etherstore",
    signal: "reentrancy_order",
    risk: `pragma solidity ^0.4.10; contract EtherStore { mapping(address=>uint) balances; mapping(address=>uint) lastWithdrawTime; function withdrawFunds(uint amount) public { require(balances[msg.sender]>=amount); require(msg.sender.call.value(amount)()); balances[msg.sender]-=amount; lastWithdrawTime[msg.sender]=now; } }`,
    control: `pragma solidity ^0.8.24; contract EtherStore { mapping(address=>uint) balances; mapping(address=>uint) lastWithdrawTime; function withdrawFunds(uint amount) external { require(balances[msg.sender]>=amount); balances[msg.sender]-=amount; lastWithdrawTime[msg.sender]=block.timestamp; (bool ok,)=msg.sender.call{value:amount}(""); require(ok); } }`,
  },
  {
    id: "smartbugs-reentrance",
    signal: "reentrancy_order",
    risk: `pragma solidity ^0.4.18; contract Reentrance { mapping(address=>uint) balances; function withdraw(uint amount) public { if(balances[msg.sender]>=amount){ if(msg.sender.call.value(amount)()){amount;} balances[msg.sender]-=amount; } } }`,
    control: `pragma solidity ^0.8.24; contract Reentrance { mapping(address=>uint) balances; function withdraw(uint amount) external { require(balances[msg.sender]>=amount); balances[msg.sender]-=amount; (bool ok,)=msg.sender.call{value:amount}(""); require(ok); } }`,
  },
  {
    id: "smartbugs-reentrancy-dao",
    signal: "reentrancy_order",
    risk: `pragma solidity ^0.4.19; contract ReentrancyDAO { mapping(address=>uint) credit; uint balance; function withdrawAll() public { uint oCredit=credit[msg.sender]; if(oCredit>0){ balance-=oCredit; bool callResult=msg.sender.call.value(oCredit)(); require(callResult); credit[msg.sender]=0; } } }`,
    control: `pragma solidity ^0.8.24; contract ReentrancyDAO { mapping(address=>uint) credit; uint balance; function withdrawAll() external { uint amount=credit[msg.sender]; require(amount>0); credit[msg.sender]=0; balance-=amount; (bool ok,)=msg.sender.call{value:amount}(""); require(ok); } }`,
  },
  {
    id: "smartbugs-modifier-reentrancy",
    signal: "reentrancy_modifier_callback",
    risk: `pragma solidity ^0.4.24; contract ModifierEntrancy { mapping(address=>uint) tokenBalance; function airDrop() hasNoBalance supportsToken public { tokenBalance[msg.sender]+=20; } modifier supportsToken(){ require(keccak256(abi.encodePacked("Nu Token"))==Bank(msg.sender).supportsToken()); _; } modifier hasNoBalance(){require(tokenBalance[msg.sender]==0);_;} } contract Bank { function supportsToken() external pure returns(bytes32){return keccak256(abi.encodePacked("Nu Token"));} }`,
    control: `pragma solidity ^0.8.24; contract ModifierEntrancy { mapping(address=>uint) tokenBalance; function airDrop() external supportsToken { require(tokenBalance[msg.sender]==0); tokenBalance[msg.sender]+=20; } modifier supportsToken(){ _; require(Bank(msg.sender).supportsToken()==keccak256(abi.encodePacked("Nu Token"))); } } interface Bank { function supportsToken() external view returns(bytes32); }`,
  },
  {
    id: "smartbugs-spank-timeout",
    signal: "reentrancy_order",
    risk: `pragma solidity ^0.4.23; contract LedgerChannel { struct Channel { address[2] partyAddresses; uint[4] ethBalances; } mapping(bytes32=>Channel) Channels; function LCOpenTimeout(bytes32 id) public { if(Channels[id].ethBalances[0]!=0){ Channels[id].partyAddresses[0].transfer(Channels[id].ethBalances[0]); } delete Channels[id]; } }`,
    control: `pragma solidity ^0.8.24; contract LedgerChannel { struct Channel { address payable party; uint amount; } mapping(bytes32=>Channel) Channels; function LCOpenTimeout(bytes32 id) external { address payable party=Channels[id].party; uint amount=Channels[id].amount; delete Channels[id]; party.transfer(amount); } }`,
  },
];

const transforms = [
  ["identity", (value) => value],
  ["comment-noise", (value) => `/* nonReentrant safe checks effects interactions */\n${value}`],
  ["string-noise", (value) => `${value}\ncontract Noise { string constant X = "nonReentrant balances[msg.sender]=0"; }`],
  ["whitespace", (value) => value.replace(/;/g, ";\n").replace(/\{/g, " { ").replace(/\}/g, " } ")],
  ["state-rename", (value) => value
    .replaceAll("userBalance", "ledger")
    .replaceAll("balances", "accounting")
    .replaceAll("credit", "entitlement")
    .replaceAll("lastWithdrawTime", "lastExit")
    .replaceAll("tokenBalance", "credits")
    .replaceAll("Channels", "sessions")],
  ["call-spacing", (value) => value
    .replaceAll(".call.value", ". call . value")
    .replaceAll(".call{", ". call {")
    .replaceAll(".transfer", ". transfer")
    .replaceAll(").supportsToken", ") . supportsToken")],
];

const rows = [];
for (const testCase of cases) {
  for (const [transformId, transform] of transforms) {
    const riskResult = analyzeSolidityStructuredSignals(transform(testCase.risk));
    const controlResult = analyzeSolidityStructuredSignals(transform(testCase.control));
    const riskDetected = riskResult.signals.includes(testCase.signal);
    const controlDetected = controlResult.signals.includes(testCase.signal);
    rows.push({
      caseId: testCase.id,
      signal: testCase.signal,
      transformId,
      riskDetected,
      controlDetected,
      riskSignals: riskResult.signals,
      controlSignals: controlResult.signals,
      ok: riskDetected && !controlDetected,
    });
  }
}

const guardControls = [
  `pragma solidity ^0.8.24; contract G { mapping(address=>uint) balances; bool locked; function withdraw(uint amount) external { require(!locked); locked=true; (bool ok,)=msg.sender.call{value:amount}(""); require(ok); balances[msg.sender]=0; locked=false; } }`,
  `pragma solidity ^0.8.24; contract G { mapping(address=>uint) balances; modifier nonReentrant(){_;} function withdraw(uint amount) external nonReentrant { (bool ok,)=msg.sender.call{value:amount}(""); require(ok); balances[msg.sender]=0; } }`,
  `pragma solidity ^0.8.24; contract G { mapping(address=>uint) refunds; function requestRefund(uint amount) external { refunds[msg.sender]+=amount; } function claimRefund() external { uint amount=refunds[msg.sender]; refunds[msg.sender]=0; (bool ok,)=msg.sender.call{value:amount}(""); require(ok); } }`,
  `pragma solidity ^0.8.24; contract G { mapping(bytes32=>uint) sessions; function close(bytes32 id,address payable recipient) external { uint amount=sessions[id]; delete sessions[id]; recipient.transfer(amount); } }`,
];
const guardRows = guardControls.map((source, index) => {
  const result = analyzeSolidityStructuredSignals(source);
  return { id: `guard-control-${index + 1}`, signals: result.signals, ok: !result.signals.includes("reentrancy_order") && !result.signals.includes("reentrancy_modifier_callback") };
});

const failed = [...rows.filter((row) => !row.ok), ...guardRows.filter((row) => !row.ok)];
const result = {
  schemaVersion: "velmere.pass36.a102r44p15.reentrancy-recall-control-suppression.v1",
  analyzerClass: ANALYZER_CLASS,
  externalRiskPatterns: cases.length,
  transformations: transforms.length,
  pairAssertions: rows.length,
  guardControls: guardRows.length,
  totalAssertions: rows.length + guardRows.length,
  passed: rows.length + guardRows.length - failed.length,
  failed: failed.length,
  rows,
  guardRows,
};
console.log(JSON.stringify(result, null, 2));
if (cases.length !== 7 || transforms.length !== 6 || rows.length !== 42 || guardRows.length !== 4 || failed.length !== 0) process.exit(1);
