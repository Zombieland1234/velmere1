#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const sourceAudit = path.resolve("scripts/a44-source-integrity-audit.mjs");
const projectTypeScriptDirectory = path.resolve("node_modules/typescript");
let assertions = 0;
const check = (condition, message) => { assertions += 1; assert.ok(condition, message); };

function fixture(files, { includeProjectTypeScript = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a102r38-source-audit-"));
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.copyFileSync(sourceAudit, path.join(root, "scripts/a44-source-integrity-audit.mjs"));
  if (includeProjectTypeScript) {
    const fixtureTypeScriptDirectory = path.join(root, "node_modules/typescript");
    fs.mkdirSync(path.dirname(fixtureTypeScriptDirectory), { recursive: true });
    fs.symlinkSync(
      projectTypeScriptDirectory,
      fixtureTypeScriptDirectory,
      process.platform === "win32" ? "junction" : "dir",
    );
  }
  for (const [relative, contents] of Object.entries(files)) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents, "utf8");
  }
  return root;
}
function run(root) {
  return spawnSync(process.execPath, ["scripts/a44-source-integrity-audit.mjs"], {
    cwd: root,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024,
    shell: false,
    windowsHide: true,
  });
}
function receipt(root) {
  return JSON.parse(fs.readFileSync(path.join(root, "artifacts/pass35/a44/PASS35_A44_SOURCE_INTEGRITY_AUDIT.json"), "utf8"));
}

const validRoot = fixture({
  "next-env.d.ts": "/// <reference types=\"next\" />\nimport \"./.next-pass25-webpack/types/routes.d.ts\";\n",
  "app/example.ts": "export const example = 1;\n",
});
const valid = run(validRoot);
check(valid.status === 0, "segmented .next-* generated route types reference must not be a missing source import");
const validReceipt = receipt(validRoot);
check(validReceipt.summary.missingLocalImports === 0, "valid generated route-types reference must preserve zero missing imports");
check(validReceipt.summary.syntaxErrors === 0, "valid fixture must remain syntax-clean");
check(validReceipt.missingImports.length === 0, "valid fixture must not create hidden missing rows");

const standardRoot = fixture({
  "next-env.d.ts": "/// <reference types=\"next\" />\nimport \"./.next/types/routes.d.ts\";\n",
});
const standard = run(standardRoot);
check(standard.status === 0, "standard .next route-types reference must remain accepted");
check(receipt(standardRoot).summary.missingLocalImports === 0, "standard route-types reference must remain zero-missing");

const missingRoot = fixture({
  "next-env.d.ts": "import \"./missing/types/routes.d.ts\";\n",
});
const missing = run(missingRoot);
check(missing.status === 1, "ordinary missing local import must still fail closed");
const missingReceipt = receipt(missingRoot);
check(missingReceipt.summary.missingLocalImports === 1, "ordinary missing import denominator must remain exact");
check(missingReceipt.missingImports[0]?.specifier === "./missing/types/routes.d.ts", "receipt must identify the exact missing specifier");

const traversalRoot = fixture({
  "next-env.d.ts": "import \"./.next-pass25-webpack/../../lib/missing.ts\";\n",
});
const traversal = run(traversalRoot);
check(traversal.status === 1, "lookalike .next path with traversal must fail closed");
check(receipt(traversalRoot).summary.missingLocalImports === 1, "traversal lookalike must remain in the missing denominator");

const missingProjectTypeScriptRoot = fixture({
  "app/example.ts": "export const example = 1;\n",
}, { includeProjectTypeScript: false });
const missingProjectTypeScript = run(missingProjectTypeScriptRoot);
check(missingProjectTypeScript.status !== 0, "missing project TypeScript dependency must fail closed");
check(
  `${missingProjectTypeScript.stderr}\n${missingProjectTypeScript.stdout}`.includes("Project TypeScript dependency unavailable"),
  "project-only TypeScript failure must be explicit",
);

for (const root of [validRoot, standardRoot, missingRoot, traversalRoot, missingProjectTypeScriptRoot]) fs.rmSync(root, { recursive: true, force: true });
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r38.source-audit-generated-next-types-test.v1",
  status: "PASS_A102R38_SOURCE_AUDIT_GENERATED_NEXT_TYPES_BOUNDARY",
  assertions,
  positiveProfiles: 2,
  negativeProfiles: 3,
}, null, 2));
