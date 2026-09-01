import { analyzeSolidityStructuredSignals, ANALYZER_CLASS } from "../../lib/security/solidity-structured-signal.mjs";

const pairs = [
  ["constructor", "legacy_constructor_name_mismatch",
    "pragma solidity ^0.4.15; contract Rubixi { address creator; function DynamicPyramid(){creator=msg.sender;} }",
    "pragma solidity ^0.4.15; contract Rubixi { address creator; function Rubixi(){creator=msg.sender;} }"],
  ["privilege", "unprotected_privileged_write",
    "pragma solidity ^0.8.24; contract M { mapping(address=>address) owners; function newOwner(address x) external {owners[x]=msg.sender;} }",
    "pragma solidity ^0.8.24; contract M { address owner; mapping(address=>address) owners; modifier onlyOwner(){require(msg.sender==owner);_;} function newOwner(address x) external onlyOwner {owners[x]=msg.sender;} }"],
  ["refund-dos", "dos_failed_refund",
    "pragma solidity ^0.4.15; contract A {address current;uint bid;function offer() payable {require(msg.value>bid);if(current!=0){require(current.send(bid));}current=msg.sender;bid=msg.value;}}",
    "pragma solidity ^0.8.24; contract A {mapping(address=>uint) refund;function offer() external payable{refund[msg.sender]+=msg.value;}function claim() external{uint a=refund[msg.sender];refund[msg.sender]=0;(bool ok,)=msg.sender.call{value:a}(\"\");require(ok);}}"],
  ["array-reset", "dos_storage_array_reset",
    "pragma solidity ^0.4.24; contract A {address[] users;function reset() public{users=new address[](0);}}",
    "pragma solidity ^0.8.24; contract A {address[] users;uint epoch;function reset() external{epoch+=1;}}"],
  ["storage-growth", "dos_storage_growth_loop",
    "pragma solidity ^0.8.24; contract A {address[] users;function fill() external{for(uint i=0;i<350;i++){users.push(msg.sender);}}}",
    "pragma solidity ^0.8.24; contract A {address[] users;function add(address x) external{users.push(x);}}"],
  ["preimage", "front_run_preimage",
    "pragma solidity ^0.4.22; contract H {bytes32 public hash;function solve(string solution) public{require(hash==sha3(solution));msg.sender.transfer(1 ether);}}",
    "pragma solidity ^0.8.24; contract H {mapping(address=>bytes32) commit;function reveal(bytes32 v,bytes32 salt) external view returns(bool){return commit[msg.sender]==keccak256(abi.encode(v,salt));}}"],
  ["approval", "erc20_approval_race",
    "pragma solidity ^0.4.24; contract T {mapping(address=>mapping(address=>uint)) _allowed;function approve(address s,uint v) public{_allowed[msg.sender][s]=v;}}",
    "pragma solidity ^0.8.24; contract T {mapping(address=>mapping(address=>uint)) _allowed;function approve(address s,uint v) public{require(v==0||_allowed[msg.sender][s]==0);_allowed[msg.sender][s]=v;}}"],
  ["plaintext-game", "front_run_plaintext_game",
    "pragma solidity ^0.4.2; contract G {struct P{address addr;uint number;}P[2] players;uint8 tot;function play(uint number) payable{players[tot]=P(msg.sender,number);tot++;}}",
    "pragma solidity ^0.8.24; contract G {mapping(address=>bytes32) commit;function play(bytes32 c) external{commit[msg.sender]=c;}}"],
  ["short-address", "legacy_short_address_surface",
    "pragma solidity ^0.4.11; contract T {mapping(address=>uint) balances;function sendCoin(address to,uint amount) returns(bool){balances[msg.sender]-=amount;balances[to]+=amount;return true;}}",
    "pragma solidity ^0.8.24; contract T {mapping(address=>uint) balances;function sendCoin(address to,uint amount) external returns(bool){balances[msg.sender]-=amount;balances[to]+=amount;return true;}}"],
  ["checked-call", "unchecked_call",
    "pragma solidity ^0.8.24; contract C {function ping(address t,bytes calldata d) external{t.call(d);}}",
    "pragma solidity ^0.8.24; contract C {function ping(address t,bytes calldata d) external{(bool ok,)=t.call(d);require(ok);}}"],
];

const transforms = [
  ["identity", (value) => value],
  ["comments", (value) => `/* onlyOwner safe deadline */\n${value}`],
  ["strings", (value) => `${value}\ncontract Noise{string constant N="onlyOwner safe deadline";}`],
  ["whitespace", (value) => value.replace(/;/g, ";\n").replace(/\{/g, " { ").replace(/\}/g, " } ")],
];

const rows = [];
for (const [caseId, theme, risk, control] of pairs) {
  for (const [transformId, transform] of transforms) {
    const riskResult = analyzeSolidityStructuredSignals(transform(risk));
    const controlResult = analyzeSolidityStructuredSignals(transform(control));
    const riskDetected = riskResult.signals.includes(theme);
    const controlDetected = controlResult.signals.includes(theme);
    rows.push({caseId,theme,transformId,riskDetected,controlDetected,ok:riskDetected&&!controlDetected});
  }
}
const failed = rows.filter((row) => !row.ok);
const result = {
  schemaVersion:"velmere.pass36.a102r44p14.targeted-generalization.v1",
  analyzerClass:ANALYZER_CLASS,
  pairs:pairs.length,
  transformations:transforms.length,
  assertions:rows.length,
  passed:rows.length-failed.length,
  failed:failed.length,
  rows,
};
console.log(JSON.stringify(result,null,2));
if (pairs.length!==10 || transforms.length!==4 || rows.length!==40 || failed.length!==0) process.exit(1);
