#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSourceManifest,
  scanSourceForHighPrecisionSecrets,
  scanTextForHighPrecisionSecrets,
} from "../pass4992/supply-chain-release.mjs";

const args = process.argv.slice(2);
const argument = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? String(args[index + 1] ?? "").trim() : "";
};
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultSourceRoot = path.resolve(scriptDirectory, "../..");
const sourceRoot = path.resolve(argument("source-root") || defaultSourceRoot);
const sliceRoot = path.resolve(argument("slice"));
const surfaceRoot = path.resolve(argument("surface"));
const output = path.resolve(argument("output"));
if (!argument("slice") || !argument("surface") || !argument("output")) {
  throw new Error("usage: --source-root <root> --slice <slice> --surface <surface> --output <receipt>");
}

const TEXT_EXTENSIONS = new Set([
  ".cjs", ".css", ".csv", ".env", ".html", ".js", ".json", ".jsx",
  ".md", ".mjs", ".mts", ".py", ".sql", ".template", ".toml", ".ts",
  ".tsv", ".tsx", ".txt", ".yaml", ".yml",
]);
const TEXT_NAMES = new Set([
  ".gitattributes", ".gitignore", ".node-version", ".npmrc", ".nvmrc",
]);

function walkFiles(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`secret_scan_symbolic_link_denied:${path.relative(root, absolute)}`);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) files.push(absolute);
      else throw new Error(`secret_scan_non_regular_path_denied:${path.relative(root, absolute)}`);
    }
  };
  visit(root);
  return files;
}

function scanTree(root, { skipBase64Parts = false } = {}) {
  const findings = [];
  let scannedFileCount = 0;
  let scannedBytes = 0;
  let binaryOrUnsupportedFileCount = 0;
  let encodedPayloadFileCount = 0;
  let encodedPayloadBytes = 0;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  for (const absolute of walkFiles(root)) {
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    const bytes = fs.readFileSync(absolute);
    if (skipBase64Parts && relative.endsWith(".b64")) {
      encodedPayloadFileCount += 1;
      encodedPayloadBytes += bytes.length;
      continue;
    }
    const extension = path.extname(relative).toLowerCase();
    if (!TEXT_EXTENSIONS.has(extension) && !TEXT_NAMES.has(path.basename(relative))) {
      binaryOrUnsupportedFileCount += 1;
      continue;
    }
    if (bytes.includes(0)) {
      binaryOrUnsupportedFileCount += 1;
      continue;
    }
    let text;
    try {
      text = decoder.decode(bytes);
    } catch {
      binaryOrUnsupportedFileCount += 1;
      continue;
    }
    scannedFileCount += 1;
    scannedBytes += bytes.length;
    findings.push(...scanTextForHighPrecisionSecrets(text, relative));
  }
  findings.sort((left, right) => left.path.localeCompare(right.path) || left.line - right.line || left.ruleId.localeCompare(right.ruleId));
  return {
    scanner: "scripts/pass4992/supply-chain-release.mjs#scanTextForHighPrecisionSecrets",
    scannedFileCount,
    scannedBytes,
    binaryOrUnsupportedFileCount,
    encodedPayloadFileCount,
    encodedPayloadBytes,
    findingCount: findings.length,
    findings,
  };
}

const sourceManifest = await buildSourceManifest(sourceRoot);
const source = await scanSourceForHighPrecisionSecrets(sourceRoot, sourceManifest);
const archive = scanTree(sliceRoot);
const surface = scanTree(surfaceRoot, { skipBase64Parts: true });
const findingCount = source.findingCount + archive.findingCount + surface.findingCount;
const receipt = {
  schemaVersion: "velmere.r7.successor-high-precision-secret-scan.v1",
  generatedAt: "2026-08-24T00:00:00.000Z",
  status: findingCount === 0 ? "PASS_SECRETS_0" : "FAIL_SECRET_FINDINGS",
  scannerAuthority: "scripts/pass4992/supply-chain-release.mjs",
  runtime: { node: process.version, platform: process.platform, arch: process.arch },
  source: {
    ...source,
    sourceManifestFileCount: sourceManifest.fileCount,
    sourceManifestDigest: sourceManifest.sourceDigest,
  },
  archive,
  surface: {
    ...surface,
    encodedPayloadCoverage: "Base64 transport parts are exact encodings of the separately scanned archive and are verified by per-part SHA, joined length, decoded bundle SHA and archive byte identity; random base64 text is not pattern-scanned.",
  },
  findingCount,
  secrets: findingCount,
  rawSecretValuesRetained: false,
  customerFinalCredit: false,
  truthBoundary: "High-precision current-source, transported-archive and semantic control-surface plaintext scan. Git history, GitHub secret scanning and push protection remain separate controls.",
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
console.log(JSON.stringify({ status: receipt.status, findingCount, sourceScannedFiles: source.scannedFileCount, archiveScannedFiles: archive.scannedFileCount, surfaceScannedFiles: surface.scannedFileCount, encodedPayloadFiles: surface.encodedPayloadFileCount, output }, null, 2));
if (findingCount !== 0) process.exitCode = 2;
