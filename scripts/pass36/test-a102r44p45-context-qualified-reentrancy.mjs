import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { analyzeSolidityCompilerAst } from "../../lib/security/solidity-compiler-ast-runtime.mjs";

const require = createRequire(import.meta.url);
const stable = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
};
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function args(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 2) out[argv[i].replace(/^--/u, "")] = argv[i + 1];
  if (!out["solc-root"] || !out.output) throw new Error("required: --solc-root --output");
  return out;
}

const CASES = [
  {
    id: "VULNERABLE_EXTERNAL_CALL_THEN_BALANCE_WRITE",
    expectedFinding: true,
    expectedPattern: null,
    source: `// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
contract VulnerableVault {
  mapping(address => uint256) public credit;
  function deposit() external payable { credit[msg.sender] += msg.value; }
  function withdraw(uint256 amount) external {
    require(credit[msg.sender] >= amount, "credit");
    (bool ok,) = msg.sender.call{value: amount}("");
    require(ok, "call");
    credit[msg.sender] -= amount;
  }
}`,
  },
  {
    id: "SAFE_POST_CALL_REVALIDATED_TERMINAL_WRITE",
    expectedFinding: false,
    expectedPattern: "PRE_AND_POST_CALL_STATE_REVALIDATION_BEFORE_TERMINAL_WRITE",
    source: `// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
contract RevalidatedExecutor {
  mapping(bytes32 => uint256) private ready;
  function isReady(bytes32 id) public view returns (bool) { return ready[id] == 1; }
  function schedule(bytes32 id) external { ready[id] = 1; }
  function execute(bytes32 id, address target, bytes calldata payload) external {
    _before(id);
    _execute(target, payload);
    _after(id);
  }
  function _before(bytes32 id) private view { require(isReady(id), "not ready"); }
  function _execute(address target, bytes calldata payload) internal {
    (bool ok, bytes memory data) = target.call(payload);
    if (!ok) { assembly { revert(add(data, 32), mload(data)) } }
  }
  function _after(bytes32 id) private {
    if (!isReady(id)) revert("state changed");
    ready[id] = 2;
  }
}`,
  },
  {
    id: "SAFE_CHECKED_TEMPORARY_MINT_SETTLEMENT",
    expectedFinding: false,
    expectedPattern: "CHECKED_TEMPORARY_MINT_ALLOWANCE_RECOVERY_AND_BURN",
    source: `// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
interface IReceiver { function onFlashLoan(address,uint256) external returns (bytes32); }
contract CheckedFlashMint {
  bytes32 private constant OK = keccak256("OK");
  mapping(address => uint256) public balanceOf;
  mapping(address => mapping(address => uint256)) public allowance;
  uint256 public totalSupply;
  function flashLoan(IReceiver receiver, uint256 value) external returns (bool) {
    _mint(address(receiver), value);
    if (receiver.onFlashLoan(msg.sender, value) != OK) revert("invalid receiver");
    _spendAllowance(address(receiver), address(this), value);
    _burn(address(receiver), value);
    return true;
  }
  function _mint(address account, uint256 value) internal { balanceOf[account] += value; totalSupply += value; }
  function _spendAllowance(address owner, address spender, uint256 value) internal { allowance[owner][spender] -= value; }
  function _burn(address account, uint256 value) internal { balanceOf[account] -= value; totalSupply -= value; }
}`,
  },
  {
    id: "HARD_NEGATIVE_UNRELATED_POST_CALL_CHECK",
    expectedFinding: true,
    expectedPattern: null,
    source: `// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
contract UnrelatedCheckVault {
  mapping(address => uint256) public credit;
  bool public enabled = true;
  function deposit() external payable { credit[msg.sender] += msg.value; }
  function withdraw(uint256 amount) external {
    require(credit[msg.sender] >= amount, "credit");
    (bool ok,) = msg.sender.call{value: amount}("");
    require(ok, "call");
    require(enabled, "unrelated");
    credit[msg.sender] -= amount;
  }
}`,
  },
];

const options = args(process.argv);
const solc = require(path.join(path.resolve(options["solc-root"]), "node_modules", "solc"));
if (!String(solc.version()).startsWith("0.8.24+commit.e11b9ed9")) throw new Error(`unexpected_solc:${solc.version()}`);
const rows = [];
for (const item of CASES) {
  const evidence = analyzeSolidityCompilerAst({
    solc,
    sourceFiles: [{ path: `${item.id}.sol`, content: item.source }],
    observedAt: "2026-08-10T00:00:00.000Z",
    settings: { optimizerEnabled: false, optimizerRuns: 200, evmVersion: "paris", metadataBytecodeHash: "none" },
  });
  const reentrancyFindings = evidence.findings.filter((row) => row.ruleId === "AST_EXTERNAL_INTERACTION_BEFORE_STATE_EFFECT");
  const patterns = evidence.r44p38Generalization?.suppressedInteractionPatterns ?? [];
  const findingOk = item.expectedFinding ? reentrancyFindings.length > 0 : reentrancyFindings.length === 0;
  const patternOk = item.expectedPattern ? patterns.some((row) => row.patternId === item.expectedPattern) : true;
  rows.push({
    caseId: item.id,
    expectedFinding: item.expectedFinding,
    actualFindingCount: reentrancyFindings.length,
    expectedPattern: item.expectedPattern,
    observedPatterns: patterns.map((row) => row.patternId).sort(),
    findingOk,
    patternOk,
    sourceSha256: sha256(item.source),
    evidenceSha256: evidence.evidenceSha256,
  });
}
const core = {
  schemaVersion: "velmere.pass36.a102r44p45.context-qualified-reentrancy.v1",
  analyzerRevision: "R44P45_CONTEXT_QUALIFIED_INTERACTION_ORDERING_V3",
  compilerVersion: String(solc.version()),
  cases: rows.length,
  passed: rows.filter((row) => row.findingOk && row.patternOk).length,
  failed: rows.filter((row) => !(row.findingOk && row.patternOk)).length,
  rows,
  customerCredit: false,
  independentGroundTruthCredit: false,
  formalFalsePositiveRateCredit: false,
  saleCredit: false,
  liveCredit: false,
};
const result = { ...core, evidenceSha256: sha256(stable(core)) };
fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
fs.writeFileSync(path.resolve(options.output), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.failed === 0 ? "PASS" : "FAIL", cases: result.cases, passed: result.passed, failed: result.failed, evidenceSha256: result.evidenceSha256 }));
if (result.failed) process.exitCode = 1;
