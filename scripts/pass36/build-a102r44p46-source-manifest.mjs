#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  SOURCE_MANIFEST_PATH,
  buildSourceManifest,
  canonicalJson,
  invariant,
  sha256,
  verifySourceRoot,
} from "./r44p46-packaging-lib.mjs";

export function writeA102R44P46SourceManifest(rootPath) {
  const root = path.resolve(rootPath);
  const output = path.join(root, ...SOURCE_MANIFEST_PATH.split("/"));
  const manifest = buildSourceManifest(root);
  const bytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const temporary = `${output}.tmp-r44p46`;
  invariant(!fs.existsSync(temporary), "r44p46_source_manifest_temporary_exists");
  fs.writeFileSync(temporary, bytes, { flag: "wx", mode: 0o600 });
  fs.renameSync(temporary, output);
  const verified = verifySourceRoot(root);
  invariant(verified.manifestFileSha256 === sha256(bytes), "r44p46_source_manifest_post_write_digest");
  invariant(canonicalJson(verified.manifest) === canonicalJson(manifest), "r44p46_source_manifest_post_write_content");
  return {
    status: "BUILT_R44P46_SOURCE_MANIFEST",
    manifestPath: SOURCE_MANIFEST_PATH,
    manifestFileSha256: verified.manifestFileSha256,
    manifestSha256: manifest.manifestSha256,
    fileCount: manifest.fileCount,
    payloadBytes: manifest.payloadBytes,
    sourceAggregateSha256: manifest.sourceAggregateSha256,
    pathSetSha256: manifest.pathSetSha256,
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invoked === import.meta.url) {
  try {
    const args = process.argv.slice(2);
    invariant(args.length <= 1, "r44p46_source_manifest_argument_count");
    process.stdout.write(`${JSON.stringify(writeA102R44P46SourceManifest(args[0] ?? process.cwd()), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ status: "FAIL_R44P46_SOURCE_MANIFEST_BUILD", error: error instanceof Error ? error.message : String(error), globalDecision: "NO_GO" })}\n`);
    process.exitCode = 1;
  }
}
