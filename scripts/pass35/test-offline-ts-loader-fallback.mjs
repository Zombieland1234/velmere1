#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const loader = pathToFileURL(path.join(root, "scripts/pass11/register-offline-ts-loader.mjs")).href;
const env = { ...process.env, VELMERE_OFFLINE_TS_FORCE_BUILTIN: "1", TZ: "UTC" };
let assertions = 0;

function run(name, script) {
  const result = spawnSync(process.execPath, ["--import", loader, script], {
    cwd: root,
    encoding: "utf8",
    env,
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(result.status, 0, `${name} failed\n${result.stdout}\n${result.stderr}`); assertions += 1;
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /Cannot find package ['"]typescript['"]/u); assertions += 1;
  return result.stdout;
}

const product = run("product-cell", "scripts/pass35/test-product-cell-readiness.mjs");
assert.match(product, /no Stripe client and no charge/u); assertions += 1;
const paidUi = run("paid-ui-stop-sell", "scripts/pass35/test-paid-ui-stop-sell.mjs");
assert.match(paidUi, /checkout request/u); assertions += 1;
const pdfCorpus = run("pdf-corpus", "scripts/pass35/test-local-pdf-corpus.mjs");
assert.match(pdfCorpus, /"pdfCount": 150/u); assertions += 1;

console.log(JSON.stringify({
  schemaVersion: "velmere.pass35.offline-ts-loader-fallback-test.v1",
  status: "PASS",
  assertions,
  forcedBuiltinTransformer: true,
  typescriptPackageRequired: false,
  tsxPolicy: "FAIL_CLOSED_WITHOUT_TYPESCRIPT",
}, null, 2));
