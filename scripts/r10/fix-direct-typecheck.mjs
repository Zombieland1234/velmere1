import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const changed = [];

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
function write(rel, next) {
  const abs = path.join(ROOT, rel);
  const prev = fs.readFileSync(abs, "utf8");
  if (prev === next) return;
  fs.writeFileSync(abs, next);
  changed.push(rel);
}
function replaceExact(rel, before, after) {
  const src = read(rel);
  if (!src.includes(before)) throw new Error(`expected_pattern_missing:${rel}`);
  write(rel, src.replace(before, after));
}

// TS5097: source deliberately uses explicit .ts imports under bundler resolution.
const tsconfigPath = "tsconfig.json";
const tsconfig = JSON.parse(read(tsconfigPath));
tsconfig.compilerOptions ??= {};
tsconfig.compilerOptions.allowImportingTsExtensions = true;
write(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`);

// TS1355: const assertion must apply to each literal branch, not the conditional expression.
replaceExact(
  "lib/market-integrity/pass35-a16-canonical-channel-parity.ts",
  'kind:(i?"FINDING":"FACT") as const',
  'kind:i?("FINDING" as const):("FACT" as const)',
);

// TS2345: finding id/title are optional; do not insert undefined into Set<string>.
replaceExact(
  "lib/security/replay/evidence-replay-engine.ts",
  `    for (const sec of reportA.sections || []) {\n      for (const f of sec.data?.findings || []) {\n        findingsA.add(f.id || f.title);\n      }\n    }\n    for (const sec of reportB.sections || []) {\n      for (const f of sec.data?.findings || []) {\n        findingsB.add(f.id || f.title);\n      }\n    }`,
  `    for (const sec of reportA.sections || []) {\n      for (const f of sec.data?.findings || []) {\n        const findingId = f.id ?? f.title;\n        if (findingId) findingsA.add(findingId);\n      }\n    }\n    for (const sec of reportB.sections || []) {\n      for (const f of sec.data?.findings || []) {\n        const findingId = f.id ?? f.title;\n        if (findingId) findingsB.add(findingId);\n      }\n    }`,
);

// TS2367: canonical section union is narrower than legacy disallowed ids. Compare via string set.
replaceExact(
  "lib/security/report-semantic-linter.ts",
  `  const isEvm = assetClass === "evm_contract";\n  for (const section of report.sections) {\n    if (!isEvm) {\n      if (\n        section.id === "advanced_bytecode_diff" ||\n        section.id === "contract_identity" ||\n        section.id === "advanced_formal_verification" ||\n        section.id === "advanced_contract_graph" ||\n        section.id === "advanced_evm_execution"\n      ) {`,
  `  const isEvm = assetClass === "evm_contract";\n  const evmOnlySectionIds = new Set<string>([\n    "advanced_bytecode_diff",\n    "contract_identity",\n    "advanced_formal_verification",\n    "advanced_contract_graph",\n    "advanced_evm_execution",\n  ]);\n  for (const section of report.sections) {\n    if (!isEvm) {\n      if (evmOnlySectionIds.has(String(section.id))) {`,
);

const receipt = {
  schemaVersion: "velmere.r10.direct-typecheck-remediation.v1",
  changedFiles: changed,
  expectedChangeCount: 4,
  passedShapeGuard: changed.length === 4,
  truthBoundary: "This codemod changes only known direct-TypeScript blockers and grants no build or release credit until exact typecheck/build execution passes.",
};
fs.mkdirSync(path.join(ROOT, "artifacts/r10"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "artifacts/r10/R10_DIRECT_TYPECHECK_REMEDIATION.json"), `${JSON.stringify(receipt, null, 2)}\n`);
if (!receipt.passedShapeGuard) throw new Error(`unexpected_changed_file_count:${changed.length}`);
console.log(JSON.stringify(receipt, null, 2));
