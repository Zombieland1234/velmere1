import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { analyzeSolidityCompilerAst } from "../../lib/security/solidity-compiler-ast-runtime.mjs";

const require = createRequire(import.meta.url);
const REVISION = "VELMERE_PASS36_A102R44P45_ACTION_REQUIRED_CONTINUOUS_CURRENT_STATE_CONTEXT_QUALIFIED_INTERACTION_ORDERING_PUBLIC_CONTROL_DELTA_NO_LIVE_CREDIT";
const FIXED_TIME = "2026-08-10T12:00:00.000Z";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const stable = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
};
const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

function parseArgs(argv) {
  const map = new Map();
  for (let index = 2; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) throw new Error(`invalid_argument:${key ?? "missing"}`);
    map.set(key.slice(2), value);
  }
  for (const key of ["openzeppelin-root", "solc-root", "output"]) if (!map.has(key)) throw new Error(`missing_argument:${key}`);
  return Object.fromEntries(map);
}

function importPaths(source) {
  const rows = [];
  const pattern = /\bimport\s+(?:(?:[^;"']+?)\s+from\s+)?["']([^"']+)["']\s*;/gu;
  for (const match of source.matchAll(pattern)) rows.push(match[1]);
  return rows;
}

function collectDependencyClosure(packageRoot, rootPath) {
  const queue = [rootPath];
  const seen = new Set();
  const rows = [];
  while (queue.length) {
    const current = queue.shift();
    if (seen.has(current)) continue;
    seen.add(current);
    const absolute = path.resolve(packageRoot, current);
    if (!absolute.startsWith(`${path.resolve(packageRoot)}${path.sep}`) || !fs.statSync(absolute).isFile()) throw new Error(`source_invalid:${current}`);
    const content = fs.readFileSync(absolute, "utf8").replace(/\r\n?/gu, "\n");
    rows.push({ path: current, content });
    for (const imported of importPaths(content)) {
      if (!imported.startsWith(".")) throw new Error(`nonrelative_import:${current}:${imported}`);
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(current), imported));
      if (resolved.startsWith("../") || resolved === "..") throw new Error(`import_escape:${current}:${imported}`);
      queue.push(resolved);
    }
  }
  return rows.sort((left, right) => Buffer.from(left.path).compare(Buffer.from(right.path)));
}

function evidenceCore(result, rootPath) {
  const rootFindings = result.findings.filter((row) => row.sourcePath === rootPath);
  const suppressions = result.r44p38Generalization?.suppressedInteractionPatterns ?? [];
  const rootSuppressions = suppressions.filter((row) => row.sourcePath === rootPath);
  return {
    rootPath,
    compilerVersion: result.compiler.version,
    compilationStatus: result.compilation.status,
    sourceBundleSha256: result.inputIdentity.sourceBundleSha256,
    rootFindings,
    rootRuleIds: [...new Set(rootFindings.map((row) => row.ruleId))].sort(),
    rootSuppressions,
    suppressionPatternIds: [...new Set(rootSuppressions.map((row) => row.patternId))].sort(),
    creditBoundary: {
      publicControlCandidateCredit: false,
      formalFalsePositiveRateCredit: false,
      independentHumanAdjudicationCredit: false,
      customerCredit: false,
      saleCredit: false,
      liveCredit: false,
    },
  };
}

const SYNTHETIC_CASES = Object.freeze([
  {
    caseId: "R44P45_SYNTH_UNSAFE_STATE_AFTER_CALL",
    expectedAlert: true,
    expectedSuppression: null,
    source: `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\ncontract UnsafeStateAfterCall {\n mapping(address => uint256) public balance;\n function withdraw() external { (bool ok,) = msg.sender.call{value: balance[msg.sender]}(""); require(ok); balance[msg.sender] = 0; }\n receive() external payable {}\n}`,
  },
  {
    caseId: "R44P45_SYNTH_SAFE_REENTRANCY_GUARD",
    expectedAlert: false,
    expectedSuppression: null,
    source: `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\ncontract SafeGuarded {\n mapping(address => uint256) public balance; bool private locked;\n modifier nonReentrant(){ require(!locked); locked = true; _; locked = false; }\n function withdraw() external nonReentrant { (bool ok,) = msg.sender.call{value: balance[msg.sender]}(""); require(ok); balance[msg.sender] = 0; }\n receive() external payable {}\n}`,
  },
  {
    caseId: "R44P45_SYNTH_SAFE_PRE_AND_POST_CALL_REVALIDATION",
    expectedAlert: false,
    expectedSuppression: "PRE_AND_POST_CALL_STATE_REVALIDATION_BEFORE_TERMINAL_WRITE",
    source: `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\ncontract SafePostCallRevalidation {\n mapping(bytes32 => uint256) private state;\n function ready(bytes32 id) public view returns (bool) { return state[id] == 1; }\n function execute(address target, bytes32 id) external { _before(id); _execute(target); _after(id); }\n function _before(bytes32 id) private view { require(ready(id)); }\n function _execute(address target) internal { (bool ok,) = target.call(""); require(ok); }\n function _after(bytes32 id) private { require(ready(id)); state[id] = 2; }\n}`,
  },
  {
    caseId: "R44P45_SYNTH_UNSAFE_UNRELATED_POST_CHECK",
    expectedAlert: true,
    expectedSuppression: null,
    source: `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\ncontract UnsafeUnrelatedPostCheck {\n mapping(address => uint256) public balance; bool public enabled = true;\n function withdraw(address target) external { (bool ok,) = target.call(""); require(ok); require(enabled); balance[msg.sender] = 0; }\n}`,
  },
  {
    caseId: "R44P45_SYNTH_SAFE_TEMPORARY_MINT_SETTLEMENT",
    expectedAlert: false,
    expectedSuppression: "CHECKED_TEMPORARY_MINT_ALLOWANCE_RECOVERY_AND_BURN",
    source: `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\ninterface Callback { function onFlashLoan() external returns (bytes32); }\ncontract SafeTemporaryMint {\n mapping(address => uint256) public balance; mapping(address => mapping(address => uint256)) public allowance; uint256 public totalSupply; bytes32 constant RETURN_VALUE = keccak256("ok");\n function _mint(address account, uint256 amount) internal { balance[account] += amount; totalSupply += amount; }\n function _spendAllowance(address account,address spender,uint256 amount) internal { allowance[account][spender] -= amount; }\n function _burn(address account, uint256 amount) internal { balance[account] -= amount; totalSupply -= amount; }\n function flashLoan(Callback receiver, uint256 amount) external returns (bool) { _mint(address(receiver), amount); if (receiver.onFlashLoan() != RETURN_VALUE) revert(); _spendAllowance(address(receiver), address(this), amount); _burn(address(receiver), amount); return true; }\n}`,
  },
  {
    caseId: "R44P45_SYNTH_SAFE_TEMPORARY_MINT_BRANCH_SETTLEMENT",
    expectedAlert: false,
    expectedSuppression: "CHECKED_TEMPORARY_MINT_ALLOWANCE_RECOVERY_AND_BURN",
    source: `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\ninterface Callback { function onFlashLoan() external returns (bytes32); }\ncontract SafeTemporaryMintBranch {\n mapping(address => uint256) public balance; mapping(address => mapping(address => uint256)) public allowance; uint256 public totalSupply; bytes32 constant RETURN_VALUE = keccak256("ok");\n function _mint(address account, uint256 amount) internal { balance[account] += amount; totalSupply += amount; }\n function _spendAllowance(address account,address spender,uint256 amount) internal { allowance[account][spender] -= amount; }\n function _burn(address account, uint256 amount) internal { balance[account] -= amount; totalSupply -= amount; }\n function _transfer(address from,address to,uint256 amount) internal { balance[from] -= amount; balance[to] += amount; }\n function _feeReceiver() internal pure returns(address){ return address(0xBEEF); }\n function flashLoan(Callback receiver, uint256 amount, uint256 fee) external returns (bool) { _mint(address(receiver), amount); if (receiver.onFlashLoan() != RETURN_VALUE) revert(); address feeReceiver = _feeReceiver(); _spendAllowance(address(receiver), address(this), amount + fee); if (fee == 0) { _burn(address(receiver), amount); } else { _burn(address(receiver), amount); _transfer(address(receiver), feeReceiver, fee); } return true; }\n}`,
  },
  {
    caseId: "R44P45_SYNTH_UNSAFE_TEMPORARY_MINT_NO_RECOVERY",
    expectedAlert: true,
    expectedSuppression: null,
    source: `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\ninterface Callback { function onFlashLoan() external returns(bytes32); }\ncontract UnsafeTemporaryMint { mapping(address=>uint256) public balance; uint256 public totalSupply; bytes32 constant RETURN_VALUE=keccak256("ok"); function _mint(address account,uint256 amount) internal { balance[account]+=amount; totalSupply+=amount; } function flashLoan(Callback receiver,uint256 amount) external returns(bool){ _mint(address(receiver),amount); if(receiver.onFlashLoan()!=RETURN_VALUE) revert(); balance[address(receiver)]=0; return true; } }`,
  },
  {
    caseId: "R44P45_SYNTH_UNSAFE_POST_ONLY_VALIDATION",
    expectedAlert: true,
    expectedSuppression: null,
    source: `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\ncontract UnsafePostOnly { mapping(bytes32=>uint256) private state; function execute(address target,bytes32 id) external { _execute(target); _after(id); } function _execute(address target) internal { (bool ok,)=target.call(""); require(ok); } function _after(bytes32 id) private { require(state[id]==1); state[id]=2; } }`,
  },
  {
    caseId: "R44P45_SYNTH_UNSAFE_POST_WRITE_BEFORE_CHECK",
    expectedAlert: true,
    expectedSuppression: null,
    source: `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\ncontract UnsafeWriteBeforeCheck { mapping(bytes32=>uint256) private state; function execute(address target,bytes32 id) external { _before(id); _execute(target); _after(id); } function _before(bytes32 id) private view { require(state[id]==1); } function _execute(address target) internal { (bool ok,)=target.call(""); require(ok); } function _after(bytes32 id) private { state[id]=2; require(state[id]==2); } }`,
  },
  {
    caseId: "R44P45_SYNTH_UNSAFE_SETTLEMENT_EXTRA_DIRECT_WRITE",
    expectedAlert: true,
    expectedSuppression: null,
    source: `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\ninterface Callback { function onFlashLoan() external returns(bytes32); }\ncontract UnsafeExtraWrite { mapping(address=>uint256) public balance; mapping(address=>mapping(address=>uint256)) public allowance; uint256 public totalSupply; address public owner; bytes32 constant RETURN_VALUE=keccak256("ok"); function _mint(address a,uint256 v) internal {balance[a]+=v;totalSupply+=v;} function _spendAllowance(address a,address s,uint256 v) internal {allowance[a][s]-=v;} function _burn(address a,uint256 v) internal {balance[a]-=v;totalSupply-=v;} function flashLoan(Callback r,uint256 v) external returns(bool){_mint(address(r),v);if(r.onFlashLoan()!=RETURN_VALUE)revert();_spendAllowance(address(r),address(this),v);_burn(address(r),v);owner=msg.sender;return true;} }`,
  },
  {
    caseId: "R44P45_SYNTH_UNSAFE_FAKE_BURN_HELPER",
    expectedAlert: true,
    expectedSuppression: null,
    source: `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\ninterface Callback { function onFlashLoan() external returns(bytes32); }\ncontract UnsafeFakeBurn { mapping(address=>uint256) public balance; mapping(address=>mapping(address=>uint256)) public allowance; uint256 public totalSupply; address public owner; bytes32 constant RETURN_VALUE=keccak256("ok"); function _mint(address a,uint256 v) internal {balance[a]+=v;totalSupply+=v;} function _spendAllowance(address a,address s,uint256 v) internal {allowance[a][s]-=v;} function _burn(address,uint256) internal {owner=msg.sender;} function flashLoan(Callback r,uint256 v) external returns(bool){_mint(address(r),v);if(r.onFlashLoan()!=RETURN_VALUE)revert();_spendAllowance(address(r),address(this),v);_burn(address(r),v);return true;} }`,
  },
  {
    caseId: "R44P45_SYNTH_UNSAFE_UNCHECKED_CALLBACK_SETTLEMENT",
    expectedAlert: true,
    expectedSuppression: null,
    source: `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\ninterface Callback { function onFlashLoan() external returns(bytes32); }\ncontract UnsafeUncheckedCallback { mapping(address=>uint256) public balance; mapping(address=>mapping(address=>uint256)) public allowance; uint256 public totalSupply; function _mint(address a,uint256 v) internal {balance[a]+=v;totalSupply+=v;} function _spendAllowance(address a,address s,uint256 v) internal {allowance[a][s]-=v;} function _burn(address a,uint256 v) internal {balance[a]-=v;totalSupply-=v;} function flashLoan(Callback r,uint256 v) external returns(bool){_mint(address(r),v);r.onFlashLoan();_spendAllowance(address(r),address(this),v);_burn(address(r),v);return true;} }`,
  },
  {
    caseId: "R44P45_SYNTH_UNSAFE_SECOND_EXTERNAL_CALL_AFTER_SETTLEMENT",
    expectedAlert: true,
    expectedSuppression: null,
    source: `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\ninterface Callback { function onFlashLoan() external returns(bytes32); function afterLoan() external; }\ncontract UnsafeSecondInteraction { mapping(address=>uint256) public balance; mapping(address=>mapping(address=>uint256)) public allowance; uint256 public totalSupply; bytes32 constant RETURN_VALUE=keccak256("ok"); function _mint(address a,uint256 v) internal {balance[a]+=v;totalSupply+=v;} function _spendAllowance(address a,address s,uint256 v) internal {allowance[a][s]-=v;} function _burn(address a,uint256 v) internal {balance[a]-=v;totalSupply-=v;} function flashLoan(Callback r,uint256 v) external returns(bool){_mint(address(r),v);if(r.onFlashLoan()!=RETURN_VALUE)revert();_spendAllowance(address(r),address(this),v);_burn(address(r),v);r.afterLoan();return true;} }`,
  },
]);

const args = parseArgs(process.argv);
const outputRoot = path.resolve(args.output);
fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(path.join(outputRoot, "controls"), { recursive: true });
fs.mkdirSync(path.join(outputRoot, "synthetic"), { recursive: true });
const solc = require(path.join(path.resolve(args["solc-root"]), "node_modules", "solc"));
if (!String(solc.version()).startsWith("0.8.24+commit.e11b9ed9")) throw new Error(`solc_version_invalid:${solc.version()}`);

const controlRoot = path.resolve(args["openzeppelin-root"]);
const manifest = JSON.parse(fs.readFileSync(path.join(controlRoot, "R44P43_OPENZEPPELIN_CONTROL_MANIFEST.json"), "utf8"));
const packageRoot = path.join(controlRoot, "package");
const controls = [];
for (const row of manifest.roots) {
  const sourceFiles = collectDependencyClosure(packageRoot, row.rootPath);
  const result = analyzeSolidityCompilerAst({ solc, sourceFiles, observedAt: FIXED_TIME, settings: { optimizerEnabled: false, optimizerRuns: 200, evmVersion: "paris", metadataBytecodeHash: "none" } });
  const core = {
    schemaVersion: "velmere.pass36.a102r44p45.control-context.v1",
    caseId: row.caseId,
    package: manifest.package,
    packageVersion: manifest.version,
    sourceRootSha256: row.sha256,
    selectionFrozenBeforeAnalyzerExecution: true,
    ...evidenceCore(result, row.rootPath),
  };
  const evidence = { ...core, evidenceSha256: sha256(stable(core)) };
  writeJson(path.join(outputRoot, "controls", `${row.caseId}.json`), evidence);
  controls.push(evidence);
}

const synthetic = [];
for (const row of SYNTHETIC_CASES) {
  const sourcePath = `${row.caseId}.sol`;
  const result = analyzeSolidityCompilerAst({ solc, sourceFiles: [{ path: sourcePath, content: row.source }], observedAt: FIXED_TIME });
  const core = {
    schemaVersion: "velmere.pass36.a102r44p45.synthetic-context.v1",
    caseId: row.caseId,
    expectedAlert: row.expectedAlert,
    expectedSuppression: row.expectedSuppression,
    ...evidenceCore(result, sourcePath),
  };
  core.observedAlert = core.rootRuleIds.includes("AST_EXTERNAL_INTERACTION_BEFORE_STATE_EFFECT");
  core.observedSuppression = row.expectedSuppression ? core.suppressionPatternIds.includes(row.expectedSuppression) : core.suppressionPatternIds.length > 0;
  core.pass = core.observedAlert === row.expectedAlert
    && (row.expectedSuppression ? core.observedSuppression === true : core.suppressionPatternIds.length === 0);
  const evidence = { ...core, evidenceSha256: sha256(stable(core)) };
  writeJson(path.join(outputRoot, "synthetic", `${row.caseId}.json`), evidence);
  synthetic.push(evidence);
}

const controlsWithAlerts = controls.filter((row) => row.rootRuleIds.length > 0);
const controlsWithSuppressions = controls.filter((row) => row.rootSuppressions.length > 0);
const summaryCore = {
  schemaVersion: "velmere.pass36.a102r44p45.interaction-context-summary.v1",
  revisionId: REVISION,
  observedAt: FIXED_TIME,
  analyzerRevision: "R44P45_CONTEXT_QUALIFIED_INTERACTION_ORDERING_V3",
  publicControlCandidates: controls.length,
  publicControlCandidatesWithAlerts: controlsWithAlerts.length,
  candidateAlertRate: controls.length ? Number((controlsWithAlerts.length / controls.length).toFixed(6)) : null,
  publicControlCandidatesWithBoundedContextReviews: controlsWithSuppressions.length,
  boundedContextReviewRows: controls.reduce((total, row) => total + row.rootSuppressions.length, 0),
  boundedContextPatterns: [...new Set(controls.flatMap((row) => row.suppressionPatternIds))].sort(),
  syntheticCases: synthetic.length,
  syntheticPass: synthetic.filter((row) => row.pass).length,
  syntheticFail: synthetic.filter((row) => !row.pass).length,
  formalFalsePositiveRateCredit: false,
  formalPrecisionCredit: false,
  independentHumanAdjudicationCredit: false,
  customerCredit: false,
  saleCredit: false,
  liveCredit: false,
  limitations: [
    "A zero alert rate on public control candidates is diagnostic, not a formal false-positive rate.",
    "Suppressed interaction-ordering patterns remain bounded context-review notes and require independent business-logic review.",
    "The synthetic cases were authored by the Velmere development process and do not provide independent ground truth.",
  ],
};
const summary = { ...summaryCore, evidenceSha256: sha256(stable(summaryCore)) };
writeJson(path.join(outputRoot, "R44P45_INTERACTION_CONTEXT_SUMMARY.json"), summary);
const receipt = {
  schemaVersion: "velmere.pass36.a102r44p45.interaction-context-run.v1",
  revisionId: REVISION,
  status: synthetic.every((row) => row.pass) && controlsWithAlerts.length === 0
    ? "PASS_R44P45_CONTEXT_QUALIFIED_INTERACTION_ORDERING_NO_FORMAL_FPR_CREDIT"
    : "FAIL_R44P45_CONTEXT_QUALIFIED_INTERACTION_ORDERING",
  controlCandidates: controls.length,
  controlAlerts: controlsWithAlerts.length,
  boundedContextReviews: summary.boundedContextReviewRows,
  syntheticPass: summary.syntheticPass,
  syntheticTotal: summary.syntheticCases,
  summarySha256: summary.evidenceSha256,
  observedAt: FIXED_TIME,
  saleCredit: false,
  liveCredit: false,
};
writeJson(path.join(outputRoot, "R44P45_RUN_RECEIPT.json"), receipt);
console.log(JSON.stringify(receipt));
if (!synthetic.every((row) => row.pass) || controlsWithAlerts.length !== 0) process.exitCode = 1;
