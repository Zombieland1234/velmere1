import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { buildSolidityCompilerInput } from "../../lib/security/solidity-compiler-ast-runtime.mjs";
import { analyzeSolidityCompilerAst as analyzeCompilerOutput } from "../../lib/security/solidity-compiler-ast-generalization.mjs";

const FIXED_TIME = "2026-08-10T12:00:00.000Z";
const REVISION = "VELMERE_PASS36_A102R44P45_ACTION_REQUIRED_CONTINUOUS_CURRENT_STATE_CONTEXT_QUALIFIED_INTERACTION_ORDERING_PUBLIC_CONTROL_DELTA_NO_LIVE_CREDIT";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
function parseArgs(argv) {
  const map = new Map();
  for (let index = 2; index < argv.length; index += 2) {
    const key = argv[index], value = argv[index + 1];
    if (!key?.startsWith("--") || !value) throw new Error(`invalid_argument:${key ?? "missing"}`);
    map.set(key.slice(2), value);
  }
  for (const key of ["solc-root", "output"]) if (!map.has(key)) throw new Error(`missing_argument:${key}`);
  return Object.fromEntries(map);
}
const args = parseArgs(process.argv);
const require = createRequire(import.meta.url);
const solc = require(path.join(path.resolve(args["solc-root"]), "package.json")) && require(path.join(path.resolve(args["solc-root"]), "node_modules", "solc"));
const sources = [{ path: "Stress.sol", content: `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\ncontract Stress { mapping(address=>uint256) public balance; function withdraw(address target) external { (bool ok,) = target.call(""); require(ok); balance[msg.sender] = 0; } }\n` }];
const { input } = buildSolidityCompilerInput(sources);
const compilerOutput = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (compilerOutput.errors ?? []).filter((row) => row.severity === "error");
if (errors.length) throw new Error(`compiler_errors:${errors.length}`);
const sourceMap = Object.fromEntries(sources.map((row) => [row.path, row.content]));
const expectedDigest = sha256(JSON.stringify(analyzeCompilerOutput({ compilerOutput, sources: sourceMap })));
const levels = [1, 10, 100, 1000];
const rows = [];
let globalPeakRss = process.memoryUsage().rss;
for (const tasks of levels) {
  const before = process.memoryUsage();
  const started = process.hrtime.bigint();
  const digests = new Set();
  let fakeResultCount = 0;
  let thrown = 0;
  let peakRss = before.rss;
  for (let index = 0; index < tasks; index += 1) {
    try {
      const result = analyzeCompilerOutput({ compilerOutput, sources: sourceMap });
      digests.add(sha256(JSON.stringify(result)));
      if (!Array.isArray(result.findings) || result.findings.length < 1) fakeResultCount += 1;
    } catch {
      thrown += 1;
    }
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
  }
  const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
  globalPeakRss = Math.max(globalPeakRss, peakRss);
  rows.push({
    tasks,
    executionModel: "LOCAL_SINGLE_PROCESS_SEQUENTIAL_ANALYZER_STRESS",
    durationMs: Number(durationMs.toFixed(3)),
    tasksPerSecond: Number((tasks / (durationMs / 1000)).toFixed(2)),
    rssBeforeBytes: before.rss,
    peakRssBytes: peakRss,
    rssDeltaBytes: peakRss - before.rss,
    uniqueResultDigests: digests.size,
    expectedDigestObserved: digests.has(expectedDigest),
    thrown,
    fakeResultCount,
    passed: thrown === 0 && fakeResultCount === 0 && digests.size === 1 && digests.has(expectedDigest),
  });
}
const malformed = { ...compilerOutput, sources: {} };
let malformedFailClosed = false;
try { analyzeCompilerOutput({ compilerOutput: malformed, sources: sourceMap }); } catch { malformedFailClosed = true; }
const result = {
  schemaVersion: "velmere.pass36.a102r44p45.analyzer-overload.v1",
  revisionId: REVISION,
  observedAt: FIXED_TIME,
  exactNode: process.version,
  exactSolc: solc.version(),
  rows,
  malformedFailClosed,
  globalPeakRssBytes: globalPeakRss,
  status: rows.every((row) => row.passed) && malformedFailClosed ? "PASS_R44P45_LOCAL_ANALYZER_STRESS_NO_PRODUCTION_LOAD_CREDIT" : "FAIL_R44P45_LOCAL_ANALYZER_STRESS",
  limitations: [
    "This is local single-process analyzer stress, not 1000 concurrent production users.",
    "It does not exercise HTTP admission, queues, databases, provider APIs, object storage or multi-tenant isolation.",
    "Production overload, distributed backpressure, retry storms and autoscaling remain NOT_PROVEN/BLOCKED_EXTERNAL."
  ],
  productionLoadCredit: false,
  stagingLoadCredit: false,
  customerCredit: false,
  saleCredit: false,
  liveCredit: false,
};
fs.mkdirSync(path.dirname(path.resolve(args.output)), { recursive: true });
fs.writeFileSync(path.resolve(args.output), `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: result.status, rows: rows.map(({ tasks, durationMs, tasksPerSecond, rssDeltaBytes, passed }) => ({ tasks, durationMs, tasksPerSecond, rssDeltaBytes, passed })), malformedFailClosed })}\n`);
if (!rows.every((row) => row.passed) || !malformedFailClosed) process.exit(1);
