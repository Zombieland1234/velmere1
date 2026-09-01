export const R44P38_TRANSFORMS = Object.freeze([
  "baseline",
  "comment_and_string_decoys",
  "whitespace_reflow",
  "renamed_identifiers",
  "reversed_conditions",
  "internal_wrapper",
  "inheritance_split_file",
]);

const decoy = (transform) => transform === "comment_and_string_decoys"
  ? `\n// onlyOwner initializer deadline paused block.chainid require(allowed[target])\nstring private constant __decoy = "delegatecall ecrecover getReserves nonReentrant";\n`
  : "";

const condition = (transform, expression, message = "CHECK") => transform === "reversed_conditions"
  ? `if (!(${expression})) revert ${message}();`
  : `require(${expression}, "${message}");`;

const reflow = (transform, source) => transform === "whitespace_reflow"
  ? source.replace(/\{/gu, " {\n\t").replace(/;/gu, ";\n ").replace(/\}/gu, "\n}\n")
  : source;

function names(transform, base, alternate) {
  return transform === "renamed_identifiers" ? alternate : base;
}

function entryFunction({ transform, signature, body, helperSignature, helperCall, helperVisibility = "internal" }) {
  if (transform === "internal_wrapper") {
    return {
      baseExtra: "",
      derived: `${signature} { ${helperCall}; }\n${helperSignature} ${helperVisibility} { ${body} }`,
    };
  }
  if (transform === "inheritance_split_file") {
    return {
      baseExtra: `${helperSignature} ${helperVisibility} { ${body} }`,
      derived: `${signature} { ${helperCall}; }`,
    };
  }
  return { baseExtra: "", derived: `${signature} { ${body} }` };
}

function wrap({ transform, contractName, baseMembers, derivedMembers, interfaces = "", errors = "" }) {
  const pragma = "pragma solidity 0.8.24;";
  const baseName = `${contractName}Base`;
  const extra = decoy(transform);
  if (transform === "inheritance_split_file") {
    const base = `${pragma}\n${interfaces}\n${errors}\nabstract contract ${baseName} { ${extra}\n${baseMembers} }`;
    const derived = `${pragma}\nimport "./Base.sol";\ncontract ${contractName} is ${baseName} { ${derivedMembers} }`;
    return { "Base.sol": reflow(transform, base), "Case.sol": reflow(transform, derived) };
  }
  const source = `${pragma}\n${interfaces}\n${errors}\ncontract ${contractName} { ${extra}\n${baseMembers}\n${derivedMembers} }`;
  return { "Case.sol": reflow(transform, source) };
}

function makeOpenMint({ risk, transform, profile }) {
  const n = names(transform,
    { contract: profile ? "EmissionVault" : "MintVault", bal: profile ? "ledger" : "balances", supply: profile ? "issued" : "totalSupply", admin: profile ? "governor" : "owner", fn: profile ? "issue" : "mint", helper: profile ? "_issue" : "_mint" },
    { contract: profile ? "SupplyChamber" : "TokenChamber", bal: "credits", supply: "circulating", admin: "controller", fn: "allocate", helper: "_allocate" });
  const guard = `modifier authorized(){ ${condition(transform, `msg.sender == ${n.admin}`, "UNAUTHORIZED")} _; }`;
  const modifier = risk ? "" : " authorized";
  const body = `${n.bal}[to] += amount; ${n.supply} += amount; emit Transfer(address(0), to, amount);`;
  const entry = entryFunction({ transform, signature: `function ${n.fn}(address to,uint256 amount) external${modifier}`, body, helperSignature: `function ${n.helper}(address to,uint256 amount)`, helperCall: `${n.helper}(to,amount)` });
  return { sources: wrap({ transform, contractName: n.contract, errors: "error UNAUTHORIZED();", baseMembers: `address ${n.admin}; mapping(address=>uint256) ${n.bal}; uint256 ${n.supply}; event Transfer(address indexed from,address indexed to,uint256 value); ${guard} ${entry.baseExtra}`, derivedMembers: entry.derived }), storagePairs: [] };
}

function makeInitializer({ risk, transform, profile }) {
  const n = names(transform,
    { contract: profile ? "BootstrapRegistry" : "InitializableRegistry", admin: profile ? "guardian" : "owner", flag: profile ? "bootstrapped" : "initialized", fn: profile ? "bootstrap" : "initialize", helper: profile ? "_bootstrap" : "_initialize" },
    { contract: "GenesisRegistry", admin: "authority", flag: "configured", fn: "configure", helper: "_configure" });
  const guard = risk ? "" : `${condition(transform, `!${n.flag}`, "ALREADY_INITIALIZED")} ${n.flag}=true;`;
  const body = `${guard} ${n.admin}=next;`;
  const entry = entryFunction({ transform, signature: `function ${n.fn}(address next) external`, body, helperSignature: `function ${n.helper}(address next)`, helperCall: `${n.helper}(next)` });
  return { sources: wrap({ transform, contractName: n.contract, errors: "error ALREADY_INITIALIZED();", baseMembers: `address ${n.admin}; bool ${n.flag}; ${entry.baseExtra}`, derivedMembers: entry.derived }), storagePairs: [] };
}

function makePause({ risk, transform, profile }) {
  const n = names(transform,
    { contract: profile ? "CreditEngine" : "LendingEngine", pause: profile ? "stopped" : "paused", debt: profile ? "liabilities" : "debt", admin: profile ? "guardian" : "owner", fn: profile ? "draw" : "borrow", helper: profile ? "_draw" : "_borrow" },
    { contract: "DebtMachine", pause: "halted", debt: "obligations", admin: "controller", fn: "takeCredit", helper: "_takeCredit" });
  const auth = `modifier authorized(){ ${condition(transform, `msg.sender == ${n.admin}`, "UNAUTHORIZED")} _; }`;
  const pauseGuard = risk ? "" : condition(transform, `!${n.pause}`, "PAUSED");
  const body = `${pauseGuard} ${n.debt}[msg.sender] += amount;`;
  const entry = entryFunction({ transform, signature: `function ${n.fn}(uint256 amount) external`, body, helperSignature: `function ${n.helper}(uint256 amount)`, helperCall: `${n.helper}(amount)` });
  return { sources: wrap({ transform, contractName: n.contract, errors: "error UNAUTHORIZED(); error PAUSED();", baseMembers: `address ${n.admin}; bool ${n.pause}; mapping(address=>uint256) ${n.debt}; ${auth} function setPause(bool value) external authorized { ${n.pause}=value; } ${entry.baseExtra}`, derivedMembers: entry.derived }), storagePairs: [] };
}

function makeSolvency({ risk, transform, profile }) {
  const n = names(transform,
    { contract: profile ? "CollateralDesk" : "SolvencyVault", collateral: profile ? "margin" : "collateral", debt: profile ? "borrowed" : "debt", fn: profile ? "release" : "withdraw", helper: profile ? "_release" : "_withdraw" },
    { contract: "HealthVault", collateral: "backing", debt: "liability", fn: "redeemBacking", helper: "_redeemBacking" });
  const guard = risk ? "" : condition(transform, `(${n.collateral}[msg.sender]-amount)*2 >= ${n.debt}[msg.sender]`, "INSOLVENT");
  const body = `${guard} ${n.collateral}[msg.sender] -= amount; payable(msg.sender).transfer(amount);`;
  const entry = entryFunction({ transform, signature: `function ${n.fn}(uint256 amount) external`, body, helperSignature: `function ${n.helper}(uint256 amount)`, helperCall: `${n.helper}(amount)` });
  return { sources: wrap({ transform, contractName: n.contract, errors: "error INSOLVENT();", baseMembers: `mapping(address=>uint256) ${n.collateral}; mapping(address=>uint256) ${n.debt}; ${entry.baseExtra}`, derivedMembers: entry.derived }), storagePairs: [] };
}

function makeCrossChain({ risk, transform, profile }) {
  const n = names(transform,
    { contract: profile ? "MessagePortal" : "BridgeExecutor", executed: profile ? "consumed" : "executed", messenger: profile ? "relay" : "messenger", fn: profile ? "receiveMessage" : "execute", helper: profile ? "_receiveMessage" : "_execute" },
    { contract: "DomainGateway", executed: "processed", messenger: "authorizedRelay", fn: "processEnvelope", helper: "_processEnvelope" });
  const auth = `modifier onlyRelay(){ ${condition(transform, `msg.sender == ${n.messenger}`, "UNAUTHORIZED")} _; }`;
  const encoded = risk ? "abi.encode(sourceChain,message)" : "abi.encode(sourceChain,block.chainid,address(this),nonce,message)";
  const body = `bytes32 id=keccak256(${encoded}); ${condition(transform, `!${n.executed}[id]`, "REPLAY")} ${n.executed}[id]=true;`;
  const entry = entryFunction({ transform, signature: `function ${n.fn}(uint256 sourceChain,uint256 nonce,bytes calldata message) external onlyRelay`, body, helperSignature: `function ${n.helper}(uint256 sourceChain,uint256 nonce,bytes calldata message)`, helperCall: `${n.helper}(sourceChain,nonce,message)` });
  return { sources: wrap({ transform, contractName: n.contract, errors: "error UNAUTHORIZED(); error REPLAY();", baseMembers: `mapping(bytes32=>bool) ${n.executed}; address ${n.messenger}; ${auth} ${entry.baseExtra}`, derivedMembers: entry.derived }), storagePairs: [] };
}

function makePermit({ risk, transform, profile }) {
  const n = names(transform,
    { contract: profile ? "AuthorizationToken" : "PermitToken", allowance: profile ? "spending" : "allowance", nonces: profile ? "counters" : "nonces", fn: profile ? "authorizeSpend" : "permit", helper: profile ? "_authorizeSpend" : "_permit" },
    { contract: "SignedAllowance", allowance: "limits", nonces: "sequences", fn: "approveBySignature", helper: "_approveBySignature" });
  const deadline = risk ? "" : condition(transform, "block.timestamp <= expiry", "EXPIRED");
  const body = `${deadline} bytes32 h=keccak256(abi.encode(block.chainid,address(this),owner,spender,amount,${n.nonces}[owner]++)); ${condition(transform, "ecrecover(h,v,r,s)==owner", "BAD_SIGNATURE")} ${n.allowance}[owner][spender]=amount;`;
  const signature = `function ${n.fn}(address owner,address spender,uint256 amount,uint256 expiry,uint8 v,bytes32 r,bytes32 s) external`;
  const helperSignature = `function ${n.helper}(address owner,address spender,uint256 amount,uint256 expiry,uint8 v,bytes32 r,bytes32 s)`;
  const entry = entryFunction({ transform, signature, body, helperSignature, helperCall: `${n.helper}(owner,spender,amount,expiry,v,r,s)` });
  return { sources: wrap({ transform, contractName: n.contract, errors: "error EXPIRED(); error BAD_SIGNATURE();", baseMembers: `mapping(address=>mapping(address=>uint256)) ${n.allowance}; mapping(address=>uint256) ${n.nonces}; ${entry.baseExtra}`, derivedMembers: entry.derived }), storagePairs: [] };
}

function makeSignature({ risk, transform, profile }) {
  const n = names(transform,
    { contract: profile ? "SignedCommand" : "SignatureExecutor", signer: profile ? "authority" : "signer", used: profile ? "consumed" : "used", fn: profile ? "runCommand" : "authorize", helper: profile ? "_runCommand" : "_authorize" },
    { contract: "SignedAction", signer: "approver", used: "seen", fn: "performSigned", helper: "_performSigned" });
  const hash = risk ? "keccak256(abi.encode(action))" : "keccak256(abi.encode(block.chainid,address(this),action,nonce))";
  const nonceGuard = risk ? "" : `${condition(transform, `!${n.used}[h]`, "REPLAY")} ${n.used}[h]=true;`;
  const body = `bytes32 h=${hash}; ${condition(transform, `ecrecover(h,v,r,s)==${n.signer}`, "BAD_SIGNATURE")} ${nonceGuard}`;
  const signature = `function ${n.fn}(bytes32 action,uint256 nonce,uint8 v,bytes32 r,bytes32 s) external`;
  const helperSignature = `function ${n.helper}(bytes32 action,uint256 nonce,uint8 v,bytes32 r,bytes32 s)`;
  const entry = entryFunction({ transform, signature, body, helperSignature, helperCall: `${n.helper}(action,nonce,v,r,s)` });
  return { sources: wrap({ transform, contractName: n.contract, errors: "error BAD_SIGNATURE(); error REPLAY();", baseMembers: `address ${n.signer}; mapping(bytes32=>bool) ${n.used}; ${entry.baseExtra}`, derivedMembers: entry.derived }), storagePairs: [] };
}

function makeSpotOracle({ risk, transform, profile }) {
  const n = names(transform,
    { contract: profile ? "PricingDesk" : "SpotPricer", pair: profile ? "pool" : "pair", oracle: profile ? "feed" : "oracle", fn: profile ? "value" : "quote", helper: profile ? "_value" : "_quote" },
    { contract: "ValuationDesk", pair: "liquidityPool", oracle: "timeOracle", fn: "estimate", helper: "_estimate" });
  const interfaces = `interface IPair { function getReserves() external view returns(uint112,uint112,uint32); } interface IOracle { function consult(address,uint256) external view returns(uint256); }`;
  const body = risk
    ? `(uint112 a,uint112 b,)= ${n.pair}.getReserves(); return amount*uint256(b)/uint256(a);`
    : `return ${n.oracle}.consult(address(${n.pair}),amount);`;
  const entry = entryFunction({ transform, signature: `function ${n.fn}(uint256 amount) external view returns(uint256)`, body, helperSignature: `function ${n.helper}(uint256 amount)`, helperVisibility: "internal view returns(uint256)", helperCall: `return ${n.helper}(amount)` });
  return { sources: wrap({ transform, contractName: n.contract, interfaces, baseMembers: `IPair ${n.pair}; IOracle ${n.oracle}; ${entry.baseExtra}`, derivedMembers: entry.derived }), storagePairs: [] };
}

function makeQuorum({ risk, transform, profile }) {
  const n = names(transform,
    { contract: profile ? "CouncilVote" : "GovernanceVote", votes: profile ? "support" : "votes", fn: profile ? "approved" : "passed", helper: profile ? "_approved" : "_passed" },
    { contract: "Ballot", votes: "yesVotes", fn: "succeeded", helper: "_succeeded" });
  const expression = risk
    ? (transform === "reversed_conditions" ? `1 <= ${n.votes}` : `${n.votes} >= 1`)
    : (transform === "reversed_conditions" ? `3 <= ${n.votes}` : `${n.votes} >= 3`);
  const body = `return ${expression};`;
  const entry = entryFunction({ transform, signature: `function ${n.fn}() external view returns(bool)`, body, helperSignature: `function ${n.helper}()`, helperVisibility: "internal view returns(bool)", helperCall: `return ${n.helper}()` });
  return { sources: wrap({ transform, contractName: n.contract, baseMembers: `uint256 ${n.votes}; ${entry.baseExtra}`, derivedMembers: entry.derived }), storagePairs: [] };
}

function makePolicyBypass({ risk, transform, profile }) {
  const n = names(transform,
    { contract: profile ? "RestrictedLedger" : "PolicyToken", bal: profile ? "credits" : "balances", blocked: profile ? "restricted" : "blocked", admin: profile ? "guardian" : "owner", fn: profile ? "forceMove" : "adminMove", helper: profile ? "_forceMove" : "_adminMove" },
    { contract: "ControlledLedger", bal: "holdings", blocked: "denied", admin: "controller", fn: "operatorMove", helper: "_operatorMove" });
  const auth = `modifier authorized(){ ${condition(transform, `msg.sender == ${n.admin}`, "UNAUTHORIZED")} _; }`;
  const policy = risk ? "" : condition(transform, `!${n.blocked}[from] && !${n.blocked}[to]`, "BLOCKED");
  const body = `${policy} ${n.bal}[from]-=amount; ${n.bal}[to]+=amount;`;
  const entry = entryFunction({ transform, signature: `function ${n.fn}(address from,address to,uint256 amount) external authorized`, body, helperSignature: `function ${n.helper}(address from,address to,uint256 amount)`, helperCall: `${n.helper}(from,to,amount)` });
  return { sources: wrap({ transform, contractName: n.contract, errors: "error UNAUTHORIZED(); error BLOCKED();", baseMembers: `address ${n.admin}; mapping(address=>uint256) ${n.bal}; mapping(address=>bool) ${n.blocked}; ${auth} ${entry.baseExtra}`, derivedMembers: entry.derived }), storagePairs: [] };
}

function makeFeeToken({ risk, transform, profile }) {
  const n = names(transform,
    { contract: profile ? "DepositBook" : "TokenVault", token: profile ? "asset" : "token", credit: profile ? "shares" : "credit", fn: profile ? "supply" : "deposit", helper: profile ? "_supply" : "_deposit" },
    { contract: "AssetBook", token: "underlying", credit: "units", fn: "fund", helper: "_fund" });
  const interfaces = `interface IToken { function transferFrom(address,address,uint256) external returns(bool); function balanceOf(address) external view returns(uint256); }`;
  const body = risk
    ? `${n.token}.transferFrom(msg.sender,address(this),amount); ${n.credit}[msg.sender]+=amount;`
    : `uint256 beforeBalance=${n.token}.balanceOf(address(this)); ${n.token}.transferFrom(msg.sender,address(this),amount); uint256 received=${n.token}.balanceOf(address(this))-beforeBalance; ${n.credit}[msg.sender]+=received;`;
  const entry = entryFunction({ transform, signature: `function ${n.fn}(uint256 amount) external nonReentrant`, body, helperSignature: `function ${n.helper}(uint256 amount)`, helperCall: `${n.helper}(amount)` });
  const lockGuard = `bool private entered; modifier nonReentrant(){ ${condition(transform, "!entered", "REENTRANT")} entered=true; _; entered=false; }`;
  return { sources: wrap({ transform, contractName: n.contract, interfaces, errors: "error REENTRANT();", baseMembers: `IToken ${n.token}; mapping(address=>uint256) ${n.credit}; ${lockGuard} ${entry.baseExtra}`, derivedMembers: entry.derived }), storagePairs: [] };
}

function makePostBalance({ risk, transform, profile }) {
  const n = names(transform,
    { contract: profile ? "SharePool" : "ShareVault", shares: profile ? "units" : "shares", total: profile ? "issuedUnits" : "totalShares", fn: profile ? "join" : "deposit", helper: profile ? "_join" : "_deposit" },
    { contract: "EquityPool", shares: "ownership", total: "supply", fn: "contribute", helper: "_contribute" });
  const denominator = risk ? "address(this).balance" : "(address(this).balance-msg.value)";
  const body = `uint256 minted=${n.total}==0 ? msg.value : msg.value*${n.total}/${denominator}; ${n.shares}[msg.sender]+=minted; ${n.total}+=minted;`;
  const entry = entryFunction({ transform, signature: `function ${n.fn}() external payable`, body, helperSignature: `function ${n.helper}()`, helperCall: `${n.helper}()` });
  return { sources: wrap({ transform, contractName: n.contract, baseMembers: `mapping(address=>uint256) ${n.shares}; uint256 ${n.total}; ${entry.baseExtra}`, derivedMembers: entry.derived }), storagePairs: [] };
}

function makeStorageLayout({ risk, transform, profile }) {
  const contractA = profile ? "LedgerV1" : "VaultV1";
  const contractB = profile ? "LedgerV2" : "VaultV2";
  const owner = transform === "renamed_identifiers" ? "authority" : "owner";
  const amount = transform === "renamed_identifiers" ? "value" : "amount";
  const first = `pragma solidity 0.8.24; contract ${contractA} { address ${owner}; uint256 ${amount}; }`;
  const secondMembers = risk ? `uint256 ${amount}; address ${owner};` : `address ${owner}; uint256 ${amount}; bool enabled;`;
  const second = `pragma solidity 0.8.24; contract ${contractB} { ${decoy(transform)} ${secondMembers} }`;
  const sources = transform === "inheritance_split_file"
    ? { "V1.sol": reflow(transform, first), "V2.sol": reflow(transform, second) }
    : { "Case.sol": reflow(transform, `${first}\n${second}`) };
  return { sources, storagePairs: [{ baselineContract: contractA, candidateContract: contractB }] };
}

function makeUpgrade({ risk, transform, profile }) {
  const n = names(transform,
    { contract: profile ? "LogicProxy" : "UpgradeableProxy", impl: profile ? "logic" : "implementation", admin: profile ? "governor" : "owner", fn: profile ? "setLogic" : "upgradeTo", helper: profile ? "_setLogic" : "_upgradeTo" },
    { contract: "ExecutionProxy", impl: "targetImplementation", admin: "controller", fn: "changeTarget", helper: "_changeTarget" });
  const auth = `modifier authorized(){ ${condition(transform, `msg.sender == ${n.admin}`, "UNAUTHORIZED")} _; }`;
  const modifier = risk ? "" : " authorized";
  const body = `${n.impl}=next;`;
  const entry = entryFunction({ transform, signature: `function ${n.fn}(address next) external${modifier}`, body, helperSignature: `function ${n.helper}(address next)`, helperCall: `${n.helper}(next)` });
  const fallback = `fallback() external payable { (bool ok,)= ${n.impl}.delegatecall(msg.data); ${condition(transform, "ok", "DELEGATE_FAILED")} }`;
  return { sources: wrap({ transform, contractName: n.contract, errors: "error UNAUTHORIZED(); error DELEGATE_FAILED();", baseMembers: `address ${n.impl}; address ${n.admin}; ${auth} ${entry.baseExtra}`, derivedMembers: `${entry.derived} ${fallback}` }), storagePairs: [] };
}

function makeUncheckedCall({ risk, transform, profile }) {
  const n = names(transform,
    { contract: profile ? "CallRouter" : "ExternalCaller", fn: profile ? "route" : "ping", helper: profile ? "_route" : "_ping" },
    { contract: "DispatchRouter", fn: "dispatch", helper: "_dispatch" });
  const body = risk
    ? `target.call(data);`
    : `(bool ok,)=target.call(data); ${condition(transform, "ok", "CALL_FAILED")}`;
  const entry = entryFunction({ transform, signature: `function ${n.fn}(address target,bytes calldata data) external`, body, helperSignature: `function ${n.helper}(address target,bytes calldata data)`, helperCall: `${n.helper}(target,data)` });
  return { sources: wrap({ transform, contractName: n.contract, errors: "error CALL_FAILED();", baseMembers: entry.baseExtra, derivedMembers: entry.derived }), storagePairs: [] };
}

function makeReentrancy({ risk, transform, profile }) {
  const n = names(transform,
    { contract: profile ? "PayoutVault" : "WithdrawalVault", bal: profile ? "credits" : "balances", fn: profile ? "claim" : "withdraw", helper: profile ? "_claim" : "_withdraw" },
    { contract: "RefundVault", bal: "entitlements", fn: "redeem", helper: "_redeem" });
  const before = `${n.bal}[msg.sender]-=amount;`;
  const call = `(bool ok,)=payable(msg.sender).call{value:amount}(""); ${condition(transform, "ok", "PAYMENT_FAILED")}`;
  const body = risk ? `${call} ${before}` : `${before} ${call}`;
  const entry = entryFunction({ transform, signature: `function ${n.fn}(uint256 amount) external`, body, helperSignature: `function ${n.helper}(uint256 amount)`, helperCall: `${n.helper}(amount)` });
  return { sources: wrap({ transform, contractName: n.contract, errors: "error PAYMENT_FAILED();", baseMembers: `mapping(address=>uint256) ${n.bal}; ${entry.baseExtra}`, derivedMembers: entry.derived }), storagePairs: [] };
}

const FAMILY_BUILDERS = {
  open_mint: makeOpenMint,
  unguarded_initializer: makeInitializer,
  missing_pause_guard: makePause,
  insolvent_withdraw: makeSolvency,
  cross_chain_replay: makeCrossChain,
  permit_no_deadline: makePermit,
  signature_replay: makeSignature,
  spot_oracle: makeSpotOracle,
  low_quorum: makeQuorum,
  transfer_policy_bypass: makePolicyBypass,
  fee_token_mismatch: makeFeeToken,
  post_balance_share_accounting: makePostBalance,
  storage_layout_collision: makeStorageLayout,
  unprotected_upgrade: makeUpgrade,
  unchecked_low_level_call: makeUncheckedCall,
  reentrancy_state_after_call: makeReentrancy,
};

const BASE_FAMILIES = Object.keys(FAMILY_BUILDERS);
const HOLDOUT_FAMILIES = [
  "open_mint",
  "unguarded_initializer",
  "cross_chain_replay",
  "signature_replay",
  "spot_oracle",
  "storage_layout_collision",
  "unprotected_upgrade",
  "reentrancy_state_after_call",
];

export const R44P38_BENCHMARK_CASES = Object.freeze([
  ...BASE_FAMILIES.map((family, index) => ({
    caseId: `R44P38-TUNE-${String(index + 1).padStart(2, "0")}`,
    family,
    split: "DISCLOSED_LOCAL_TUNING",
    expectedSeverity: ({
      storage_layout_collision: "critical",
      unprotected_upgrade: "critical",
      open_mint: "high",
      unguarded_initializer: "high",
      missing_pause_guard: "medium",
      insolvent_withdraw: "high",
      cross_chain_replay: "high",
      permit_no_deadline: "medium",
      signature_replay: "high",
      spot_oracle: "high",
      low_quorum: "high",
      transfer_policy_bypass: "high",
      fee_token_mismatch: "medium",
      post_balance_share_accounting: "high",
      unchecked_low_level_call: "medium",
      reentrancy_state_after_call: "high",
    })[family],
    profile: 0,
  })),
  ...HOLDOUT_FAMILIES.map((family, index) => ({
    caseId: `R44P38-HOLDOUT-${String(index + 1).padStart(2, "0")}`,
    family,
    split: "LOCAL_DEVELOPER_HOLDOUT_NOT_INDEPENDENT",
    expectedSeverity: ({ storage_layout_collision: "critical", unprotected_upgrade: "critical", unguarded_initializer: "high", open_mint: "high", cross_chain_replay: "high", signature_replay: "high", spot_oracle: "high", reentrancy_state_after_call: "high" })[family],
    profile: 1,
  })),
]);

export function buildR44P38CaseSources(caseRow, risk, transform) {
  if (!R44P38_TRANSFORMS.includes(transform)) throw new Error(`unknown_transform:${transform}`);
  const builder = FAMILY_BUILDERS[caseRow.family];
  if (!builder) throw new Error(`unknown_family:${caseRow.family}`);
  return builder({ risk, transform, profile: caseRow.profile });
}
