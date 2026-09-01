#!/usr/bin/env node
import { analyzeSolidityStructuredSignals, ANALYZER_CLASS } from "../../lib/security/solidity-structured-signal.mjs";

const REENTRANCY_IDS = new Set(["reentrancy_order", "reentrancy_modifier_callback", "hook_reentrancy"]);
const signalIds = (source) => new Set(analyzeSolidityStructuredSignals(source).signals);
const hasReentrancy = (source) => [...signalIds(source)].some((id) => REENTRANCY_IDS.has(id));

const labeledPatternCases = [
  ["etherstore", `pragma solidity ^0.4.10; contract EtherStore { uint256 public withdrawalLimit = 1 ether; mapping(address => uint256) public lastWithdrawTime; mapping(address => uint256) public balances; function depositFunds() public payable { balances[msg.sender] += msg.value; } function withdrawFunds (uint256 _weiToWithdraw) public { require(balances[msg.sender] >= _weiToWithdraw); require(_weiToWithdraw <= withdrawalLimit); require(now >= lastWithdrawTime[msg.sender] + 1 weeks); require(msg.sender.call.value(_weiToWithdraw)()); balances[msg.sender] -= _weiToWithdraw; lastWithdrawTime[msg.sender] = now; } }`],
  ["reentrancy-dao", `pragma solidity ^0.4.19; contract ReentrancyDAO { mapping(address => uint) credit; uint balance; function withdrawAll() public { uint oCredit = credit[msg.sender]; if (oCredit > 0) { balance -= oCredit; bool callResult = msg.sender.call.value(oCredit)(); require(callResult); credit[msg.sender] = 0; } } function deposit() public payable { credit[msg.sender] += msg.value; balance += msg.value; } }`],
  ["modifier-reentrancy", `pragma solidity ^0.4.24; contract ModifierEntrancy { mapping(address => uint) public tokenBalance; string constant name = "Nu Token"; function airDrop() hasNoBalance supportsToken public { tokenBalance[msg.sender] += 20; } modifier supportsToken() { require(keccak256(abi.encodePacked("Nu Token")) == Bank(msg.sender).supportsToken()); _; } modifier hasNoBalance { require(tokenBalance[msg.sender] == 0); _; } } contract Bank { function supportsToken() external pure returns(bytes32){ return keccak256(abi.encodePacked("Nu Token")); } }`],
  ["reentrance", `pragma solidity ^0.4.18; contract Reentrance { mapping(address => uint) public balances; function donate(address _to) public payable { balances[_to] += msg.value; } function withdraw(uint _amount) public { if(balances[msg.sender] >= _amount) { if(msg.sender.call.value(_amount)()) { _amount; } balances[msg.sender] -= _amount; } } function() public payable {} }`],
  ["reentrancy-simple", `pragma solidity ^0.4.15; contract Reentrance { mapping(address => uint) userBalance; function getBalance(address u) constant returns(uint){ return userBalance[u]; } function addToBalance() payable { userBalance[msg.sender] += msg.value; } function withdrawBalance(){ if( ! (msg.sender.call.value(userBalance[msg.sender])() ) ){ throw; } userBalance[msg.sender] = 0; } }`],
  ["simple-dao", `pragma solidity ^0.4.2; contract SimpleDAO { mapping(address => uint) public credit; function donate(address to) payable { credit[to] += msg.value; } function withdraw(uint amount) { if (credit[msg.sender]>= amount) { bool res = msg.sender.call.value(amount)(); credit[msg.sender]-=amount; } } function queryCredit(address to) returns (uint){ return credit[to]; } }`],
  ["spank-channel-timeout", `pragma solidity ^0.4.23; contract Token { function transfer(address,uint) public returns(bool); } contract C { struct Channel { address[2] partyAddresses; uint256[4] ethBalances; uint256[2] initialDeposit; Token token; uint256[4] erc20Balances; } mapping(bytes32=>Channel) public Channels; function LCOpenTimeout(bytes32 _lcID) public { require(msg.sender == Channels[_lcID].partyAddresses[0]); if(Channels[_lcID].initialDeposit[0] != 0) { Channels[_lcID].partyAddresses[0].transfer(Channels[_lcID].ethBalances[0]); } if(Channels[_lcID].initialDeposit[1] != 0) { require(Channels[_lcID].token.transfer(Channels[_lcID].partyAddresses[0], Channels[_lcID].erc20Balances[0])); } delete Channels[_lcID]; } }`],
];

const pairs = [
  {
    id: "legacy-call-value",
    risk: `pragma solidity ^0.4.24; contract R { mapping(address=>uint) balances; function cashOut(uint amount) public { require(msg.sender.call.value(amount)()); balances[msg.sender] -= amount; } }`,
    control: `pragma solidity ^0.4.24; contract C { mapping(address=>uint) balances; function cashOut(uint amount) public { balances[msg.sender] -= amount; require(msg.sender.call.value(amount)()); } }`,
  },
  {
    id: "modern-call-value",
    risk: `pragma solidity ^0.8.24; contract R { mapping(address=>uint) credit; function pay(address payable recipient,uint amount) external { (bool ok,) = recipient.call{value:amount}(""); require(ok); credit[recipient] = 0; } }`,
    control: `pragma solidity ^0.8.24; contract C { mapping(address=>uint) credit; function pay(address payable recipient,uint amount) external { credit[recipient] = 0; (bool ok,) = recipient.call{value:amount}(""); require(ok); } }`,
  },
  {
    id: "modifier-callback",
    risk: `pragma solidity ^0.8.24; interface I { function check() external returns(bool); } contract R { mapping(address=>uint) credit; modifier callback(address target){ require(I(target).check()); _; } function grant(address target) external callback(target){ credit[msg.sender] += 1; } }`,
    control: `pragma solidity ^0.8.24; interface I { function check() external returns(bool); } contract C { mapping(address=>uint) credit; modifier callback(address target){ _; require(I(target).check()); } function grant(address target) external callback(target){ credit[msg.sender] += 1; } }`,
  },
  {
    id: "token-transfer-delete",
    risk: `pragma solidity ^0.8.24; interface T { function transfer(address,uint) external returns(bool); } contract R { struct Exit { address user; uint amount; } mapping(bytes32=>Exit) exits; T token; function settle(bytes32 id) external { require(token.transfer(exits[id].user,exits[id].amount)); delete exits[id]; } }`,
    control: `pragma solidity ^0.8.24; interface T { function transfer(address,uint) external returns(bool); } contract C { struct Exit { address user; uint amount; } mapping(bytes32=>Exit) exits; T token; function settle(bytes32 id) external { Exit memory item=exits[id]; delete exits[id]; require(token.transfer(item.user,item.amount)); } }`,
  },
  {
    id: "ether-transfer-member-write",
    risk: `pragma solidity ^0.8.24; contract R { struct Claim { address payable user; uint amount; bool done; } mapping(bytes32=>Claim) claims; function release(bytes32 id) external { claims[id].user.transfer(claims[id].amount); claims[id].done = true; } }`,
    control: `pragma solidity ^0.8.24; contract C { struct Claim { address payable user; uint amount; bool done; } mapping(bytes32=>Claim) claims; function release(bytes32 id) external { claims[id].done = true; claims[id].user.transfer(claims[id].amount); } }`,
  },
  {
    id: "non-reentrant-guard",
    risk: `pragma solidity ^0.8.24; contract R { mapping(address=>uint) credit; function release(address payable to) external { (bool ok,) = to.call{value:credit[to]}(""); require(ok); credit[to]=0; } }`,
    control: `pragma solidity ^0.8.24; contract C { mapping(address=>uint) credit; bool locked; modifier nonReentrant(){ require(!locked); locked=true; _; locked=false; } function release(address payable to) external nonReentrant { (bool ok,) = to.call{value:credit[to]}(""); require(ok); credit[to]=0; } }`,
  },
  {
    id: "local-assignment-not-state",
    risk: `pragma solidity ^0.8.24; contract R { mapping(address=>uint) credit; function close(address target) external { (bool ok,) = target.call(""); require(ok); credit[msg.sender] = 0; } }`,
    control: `pragma solidity ^0.8.24; contract C { function close(address target) external { (bool ok,) = target.call(""); uint localValue = ok ? 1 : 0; require(localValue <= 1); } }`,
  },
  {
    id: "memory-member-not-state",
    risk: `pragma solidity ^0.8.24; contract R { struct Row { uint value; } mapping(address=>Row) rows; function settle(address target) external { (bool ok,) = target.call(""); require(ok); rows[msg.sender].value = 0; } }`,
    control: `pragma solidity ^0.8.24; contract C { struct Row { uint value; } function settle(address target) external { Row memory row; (bool ok,) = target.call(""); require(ok); row.value = 0; require(row.value == 0); } }`,
  },
  {
    id: "checked-call-still-order-sensitive",
    risk: `pragma solidity ^0.8.24; contract R { uint public sequence; function finalize(address target) external { (bool ok,) = target.call(""); require(ok); sequence += 1; } }`,
    control: `pragma solidity ^0.8.24; contract C { uint public sequence; function finalize(address target) external { sequence += 1; (bool ok,) = target.call(""); require(ok); } }`,
  },
  {
    id: "push-after-callback",
    risk: `pragma solidity ^0.8.24; interface H { function hook() external; } contract R { address[] participants; function enroll(address hook) external { H(hook).hook(); participants.push(msg.sender); } }`,
    control: `pragma solidity ^0.8.24; interface H { function hook() external; } contract C { address[] participants; function enroll(address hook) external { participants.push(msg.sender); H(hook).hook(); } }`,
  },
];

const transforms = [
  ["identity", (value) => value],
  ["comments", (value) => `/* call.value balances[msg.sender] = 0 nonReentrant */\n${value}\n// token.transfer delete rows`],
  ["strings", (value) => value.replace(/contract\s+([A-Za-z_]\w*)\s*\{/u, 'contract $1 { string constant NOISE = "call.value balances delete nonReentrant";')],
  ["whitespace", (value) => value.replace(/;/gu, ";\n\n").replace(/\{/gu, "{\n").replace(/\}/gu, "\n}\n")],
  ["rename-locals", (value) => value.replaceAll("ok", "successFlag").replaceAll("localValue", "temporaryValue")],
];

const assertions = [];
for (const [id, source] of labeledPatternCases) {
  const result = analyzeSolidityStructuredSignals(source);
  const detected = result.signals.some((signal) => REENTRANCY_IDS.has(signal));
  assertions.push({ id: `external:${id}`, expected: true, actual: detected, signals: result.signals, ok: detected });
}
for (const pair of pairs) {
  for (const [transformId, transform] of transforms) {
    const risk = hasReentrancy(transform(pair.risk));
    const control = hasReentrancy(transform(pair.control));
    assertions.push({ id: `${pair.id}:${transformId}:risk`, expected: true, actual: risk, ok: risk });
    assertions.push({ id: `${pair.id}:${transformId}:control`, expected: false, actual: control, ok: !control });
  }
}

const failed = assertions.filter((row) => !row.ok);
const result = {
  schemaVersion: "velmere.pass36.a102r44p15.reentrancy-source-parity-and-control-suppression.v1",
  analyzerClass: ANALYZER_CLASS,
  labeledPatternCases: labeledPatternCases.length,
  sourceByteExactExternalCases: 0,
  riskControlPairs: pairs.length,
  transformations: transforms.length,
  assertions: assertions.length,
  passed: assertions.length - failed.length,
  failed: failed.length,
  status: failed.length === 0 ? "PASS" : "FAIL",
  failedRows: failed,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
