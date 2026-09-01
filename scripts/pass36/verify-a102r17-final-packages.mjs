#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  parseDeterministicZip,
  sha256,
} from "../pass4826/release-package-contract.mjs";
import {
  MATERIALS_MANIFEST_PATH,
  REVISION_ID,
  SOURCE_MANIFEST_PATH,
  validateA102R17ParsedArchive,
  validatePortableArchivePath,
} from "./package-a102r17-deterministic.mjs";

function invariant(condition, code) {
  if (!condition) throw new Error(code);
}

function parseArguments(argv) {
  const values = new Map();
  const allowed = new Set([
    "--source-zip",
    "--materials-zip",
    "--output",
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    invariant(allowed.has(token), `a102r17_verify_argument_unknown:${token}`);
    invariant(
      !values.has(token),
      `a102r17_verify_argument_duplicate:${token}`,
    );
    const value = argv[index + 1];
    invariant(
      typeof value === "string" && value.length > 0 && !value.startsWith("--"),
      `a102r17_verify_argument_value_missing:${token}`,
    );
    values.set(token, value);
    index += 1;
  }
  for (const required of ["--source-zip", "--materials-zip"]) {
    invariant(
      values.has(required),
      `a102r17_verify_argument_required:${required}`,
    );
  }
  const sourceZip = path.resolve(values.get("--source-zip"));
  const materialsZip = path.resolve(values.get("--materials-zip"));
  const output = values.has("--output")
    ? path.resolve(values.get("--output"))
    : null;
  invariant(
    sourceZip !== materialsZip,
    "a102r17_verify_archive_paths_must_differ",
  );
  if (output !== null) {
    invariant(
      output !== sourceZip && output !== materialsZip,
      "a102r17_verify_output_archive_collision",
    );
  }
  return { sourceZip, materialsZip, output };
}

function assertRegularArchive(archivePath, kind) {
  const metadata = fs.lstatSync(archivePath);
  invariant(
    metadata.isFile() && !metadata.isSymbolicLink(),
    `a102r17_verify_${kind}_archive_not_regular:${archivePath}`,
  );
}

function rawArchiveIdentity(archivePath) {
  const bytes = fs.readFileSync(archivePath);
  const fileName = path.basename(archivePath);
  validatePortableArchivePath(fileName);
  invariant(
    !fileName.includes("/"),
    "a102r17_verify_source_filename_invalid",
  );
  return {
    fileName,
    byteLength: bytes.length,
    sha256: sha256(bytes),
  };
}

function inspectArchive(archivePath, kind, expectedSourceArchive = null) {
  const manifestPath =
    kind === "source" ? SOURCE_MANIFEST_PATH : MATERIALS_MANIFEST_PATH;
  try {
    assertRegularArchive(archivePath, kind);
    const parsed = parseDeterministicZip(archivePath);
    const validation = validateA102R17ParsedArchive(
      parsed,
      kind,
      expectedSourceArchive,
    );
    return {
      kind,
      passed: true,
      fileName: path.basename(archivePath),
      byteLength: parsed.byteLength,
      sha256: parsed.archiveSha256,
      entries: parsed.entries.length,
      archiveFormat: "zip-store-v1",
      deterministicCentralAndLocalHeadersVerified: true,
      crcVerified: true,
      compressionMethod: "STORE",
      manifestPath,
      manifestSha256: validation.manifest.manifestSha256,
      manifestFileSha256: validation.manifestFileSha256,
      payloadFileCount: validation.payloadFileCount,
      payloadByteLength: validation.payloadByteLength,
      sourceArchiveBinding:
        kind === "materials"
          ? validation.manifest.sourceArchiveBinding
          : null,
      failure: null,
    };
  } catch (error) {
    let identity = {
      fileName: path.basename(archivePath),
      byteLength: null,
      sha256: null,
    };
    try {
      identity = rawArchiveIdentity(archivePath);
    } catch {
      // The primary failure remains authoritative.
    }
    return {
      kind,
      passed: false,
      ...identity,
      entries: null,
      archiveFormat: null,
      deterministicCentralAndLocalHeadersVerified: false,
      crcVerified: false,
      compressionMethod: null,
      manifestPath,
      manifestSha256: null,
      manifestFileSha256: null,
      payloadFileCount: null,
      payloadByteLength: null,
      sourceArchiveBinding: null,
      failure: error instanceof Error ? error.message : String(error),
    };
  }
}

export function verifyA102R17FinalPackages({
  sourceZip,
  materialsZip,
}) {
  let sourceIdentity = null;
  try {
    assertRegularArchive(sourceZip, "source");
    sourceIdentity = rawArchiveIdentity(sourceZip);
  } catch {
    // inspectArchive below reports the exact source failure.
  }
  const source = inspectArchive(sourceZip, "source");
  const materials = inspectArchive(
    materialsZip,
    "materials",
    sourceIdentity,
  );
  const binding = materials.sourceArchiveBinding;
  const materialsSourceBindingPassed = Boolean(
    sourceIdentity
    && materials.passed
    && binding
    && binding.fileName === sourceIdentity.fileName
    && binding.byteLength === sourceIdentity.byteLength
    && binding.sha256 === sourceIdentity.sha256,
  );
  const failures = [];
  if (!source.passed) {
    failures.push({ id: "source_package", detail: source.failure });
  }
  if (!materials.passed) {
    failures.push({ id: "materials_package", detail: materials.failure });
  }
  if (!materialsSourceBindingPassed) {
    failures.push({
      id: "materials_source_archive_binding",
      detail: {
        declared: binding ?? null,
        observed: sourceIdentity,
      },
    });
  }
  return {
    schemaVersion: "velmere.pass36.a102r17.final-packages-verification.v1",
    revisionId: REVISION_ID,
    status:
      failures.length === 0
        ? "PASS_A102R17_FINAL_PACKAGES_ACTION_REQUIRED_NO_PROMOTION"
        : "FAIL_A102R17_FINAL_PACKAGES",
    source,
    materials,
    materialsSourceBindingPassed,
    failed: failures.length,
    failures,
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  const result = verifyA102R17FinalPackages(options);
  const output = `${JSON.stringify(result, null, 2)}\n`;
  if (options.output !== null) {
    fs.mkdirSync(path.dirname(options.output), { recursive: true });
    fs.writeFileSync(options.output, output, "utf8");
  }
  process.stdout.write(output);
  if (result.failed > 0) process.exitCode = 1;
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  try {
    main();
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({
        schemaVersion:
          "velmere.pass36.a102r17.final-packages-verification.v1",
        revisionId: REVISION_ID,
        status: "FAIL_A102R17_FINAL_PACKAGES",
        failed: 1,
        failures: [
          {
            id: "verifier",
            detail: error instanceof Error ? error.message : String(error),
          },
        ],
        globalDecision: "NO_GO",
        live: false,
        saleEnabled: false,
        productionApproved: false,
        worldClassProven: false,
      })}\n`,
    );
    process.exitCode = 1;
  }
}
