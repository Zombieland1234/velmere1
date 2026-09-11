#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const loader = pathToFileURL(path.join(root, "scripts/pass11/register-offline-ts-loader.mjs")).href;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-r10-loader-builtins-"));
const script = path.join(tmp, "builtins.ts");
const moduleDir = path.join(tmp, "module-dir");

try {
  fs.mkdirSync(moduleDir, { recursive: true });
  fs.writeFileSync(path.join(moduleDir, "index.ts"), 'export const directoryMarker: string = "INDEX_TS_PASS";\n', "utf8");
  fs.writeFileSync(script, [
    'import crypto from "crypto";',
    'import fs from "fs";',
    'import path from "path";',
    'import { directoryMarker } from "./module-dir";',
    'const digest: string = crypto.createHash("sha256").update("velmere").digest("hex");',
    'if (typeof fs.readFileSync !== "function") throw new Error("fs_builtin_missing");',
    'if (path.basename("/a/b") !== "b") throw new Error("path_builtin_missing");',
    'if (directoryMarker !== "INDEX_TS_PASS") throw new Error("directory_index_resolution_failed");',
    'console.log(`R10_BUILTINS_PASS:${digest.length}:${directoryMarker}`);',
  ].join("\n") + "\n", "utf8");

  const result = spawnSync(process.execPath, ["--import", loader, script], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, VELMERE_OFFLINE_TS_FORCE_BUILTIN: "1" },
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /R10_BUILTINS_PASS:64:INDEX_TS_PASS/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /ENOENT.*\/(?:crypto|fs|path)\b/i);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /EISDIR/i);
  console.log("R10 offline TS loader bare Node builtins + directory index regression: PASS");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
