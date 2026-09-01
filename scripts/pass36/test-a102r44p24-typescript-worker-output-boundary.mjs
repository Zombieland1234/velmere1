#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-r44p24-stdout-"));
let assertions = 0;
const check = (condition, message) => { assert.ok(condition, message); assertions += 1; };
try {
  const child = path.join(root, "child.mjs");
  const helper = path.resolve("lib/build/complete-json-stdout.mjs");
  fs.writeFileSync(child, `import { writeJsonToStdoutFully } from ${JSON.stringify(helper)};\nconst rows=Array.from({length:20000},(_,i)=>({id:i,value:"x".repeat(48)}));\nawait writeJsonToStdoutFully({schemaVersion:"velmere.r44p24.stdout-test.v1",rows});\n`);
  const run = spawnSync(process.execPath, [child], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024, timeout: 30_000 });
  check(run.status === 0, "child exits zero");
  check(Buffer.byteLength(run.stdout) > 1024 * 1024, "output exceeds one MiB");
  const parsed = JSON.parse(run.stdout);
  check(parsed.rows.length === 20000, "all rows preserved");
  check(parsed.rows[19999].id === 19999, "last row preserved");
  check(run.stderr === "", "stderr empty");
  const runner = fs.readFileSync("scripts/pass13/run-partitioned-typescript.mjs", "utf8");
  check(runner.includes("writeJsonToStdoutFully"), "typecheck worker uses synchronous writer");
  check(!runner.includes("process.stdout.write(JSON.stringify({idx"), "legacy asynchronous worker write removed");
  console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p24.typescript-worker-output-test.v1",status:"PASS",assertions},null,2));
} finally { fs.rmSync(root,{recursive:true,force:true}); }
