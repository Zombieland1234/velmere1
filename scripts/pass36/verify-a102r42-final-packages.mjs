import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { parseDeterministicZipBytes } from "../pass4826/release-package-contract.mjs";
import { readDescriptorBoundRegularFile } from "./descriptor-bound-regular-file.mjs";
import {
  MATERIALS_FILE_NAME,
  MATERIALS_MANIFEST_PATH,
  REVISION_ID,
  ROADMAP_FILE_NAME,
  SOURCE_FILE_NAME,
  SOURCE_MANIFEST_PATH,
  SOURCE_ROADMAP_PATH,
  validateA102R42ParsedArchive,
} from "./package-a102r42-deterministic.mjs";

const invariant = (condition, code) => { if (!condition) throw new Error(code); };

function parseArguments(argv) {
  const values = new Map();
  const allowed = new Set(["--source-zip", "--materials-zip", "--roadmap", "--output"]);
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    invariant(allowed.has(name), `a102r42_final_argument_unknown:${name}`);
    invariant(!values.has(name), `a102r42_final_argument_duplicate:${name}`);
    const value = argv[++index];
    invariant(typeof value === "string" && value.length > 0 && !value.startsWith("--"), `a102r42_final_argument_value:${name}`);
    values.set(name, value);
  }
  for (const name of ["--source-zip", "--materials-zip", "--roadmap"]) invariant(values.has(name), `a102r42_final_argument_required:${name}`);
  const sourceZip = path.resolve(values.get("--source-zip"));
  const materialsZip = path.resolve(values.get("--materials-zip"));
  const roadmap = path.resolve(values.get("--roadmap"));
  const output = values.has("--output") ? path.resolve(values.get("--output")) : null;
  invariant(sourceZip !== materialsZip, "a102r42_final_archive_collision");
  invariant(roadmap !== sourceZip && roadmap !== materialsZip, "a102r42_final_roadmap_collision");
  invariant(output === null || (output !== sourceZip && output !== materialsZip && output !== roadmap), "a102r42_final_output_collision");
  return { sourceZip, materialsZip, roadmap, output };
}

function regularIdentity(archivePath, expectedName, kind) {
  const observed = readDescriptorBoundRegularFile(archivePath, { errorPrefix: `a102r42_final_${kind}` });
  invariant(observed.binding.fileName === expectedName, `a102r42_final_${kind}_filename`);
  const parsed = parseDeterministicZipBytes(observed.bytes);
  invariant(parsed.byteLength === observed.binding.byteLength && parsed.archiveSha256 === observed.binding.sha256, `a102r42_final_${kind}_descriptor_parse_binding`);
  return { parsed, identity: observed.binding };
}

const PARENT_ROADMAP_BYTES = 1_867_987;
const PARENT_ROADMAP_SHA256 = "70365bcd82276db15d5893344edb7264b8735228339df6864d31c1e3f36095b1";
const PARENT_OPENING = Buffer.from("====================================================================================================\nPASS36 A102R41 — SECURITY EVIDENCE AUTHORITY + EXACT WINDOWS + FAIL-CLOSED RELEASE PACKAGING", "utf8");
const PRESERVATION_MARKER = Buffer.from("================================================================================\nPRESERVED PRIOR CANONICAL ROADMAP CONTENT FOLLOWS\n================================================================================\n\n", "utf8");

function inspectRoadmap(roadmapPath, internalRoadmap) {
  try {
    const observed = readDescriptorBoundRegularFile(roadmapPath, { maxBytes: 4 * 1024 * 1024, errorPrefix: "a102r42_final_roadmap" });
    invariant(observed.binding.fileName === ROADMAP_FILE_NAME, "a102r42_final_roadmap_filename");
    const boundary = observed.bytes.length - PARENT_ROADMAP_BYTES;
    invariant(boundary > PRESERVATION_MARKER.length && observed.bytes.subarray(boundary, boundary + PARENT_OPENING.length).equals(PARENT_OPENING), "a102r42_final_roadmap_parent_boundary");
    const prefix = observed.bytes.subarray(0, boundary);
    const suffix = observed.bytes.subarray(boundary);
    invariant(suffix.length === PARENT_ROADMAP_BYTES && cryptoSha256(suffix) === PARENT_ROADMAP_SHA256, "a102r42_final_roadmap_parent_suffix_binding");
    invariant(prefix.subarray(prefix.length - PRESERVATION_MARKER.length).equals(PRESERVATION_MARKER), "a102r42_final_roadmap_preservation_marker");
    const prefixText = prefix.toString("utf8");
    invariant(Buffer.from(prefixText, "utf8").equals(prefix), "a102r42_final_roadmap_prefix_utf8");
    invariant(prefixText.includes(`Revision ID: ${REVISION_ID}`) && prefixText.includes("Parent: VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT") && prefixText.includes("Klasa: ACTION_REQUIRED_NON_PASS") && prefixText.includes("GLOBAL DECISION: NO_GO") && prefixText.includes("LIVE=false") && prefixText.includes("saleEnabled=false") && prefixText.includes("productionApproved=false") && prefixText.includes("worldClassProven=false"), "a102r42_final_roadmap_r42_truth_prefix");
    invariant(internalRoadmap && internalRoadmap.byteLength === observed.binding.byteLength && internalRoadmap.sha256 === observed.binding.sha256 && Buffer.isBuffer(internalRoadmap.content) && internalRoadmap.content.equals(observed.bytes), "a102r42_final_roadmap_source_archive_binding");
    return { passed: true, ...observed.binding, sourceEntryPath: internalRoadmap.path, sourceEntryByteLength: internalRoadmap.byteLength, sourceEntrySha256: internalRoadmap.sha256, sourceByteIdentical: true, prefixByteLength: prefix.length, prefixSha256: cryptoSha256(prefix), sourceArchiveBindingPassed: true, lineagePassed: true, canonicalNameVerified: true, utf8Verified: true, r42PrefixVerified: true, parentSuffixVerified: true, parentSuffixByteLength: suffix.length, parentSuffixSha256: cryptoSha256(suffix), failure: null };
  } catch (error) {
    return { passed: false, fileName: path.basename(roadmapPath), byteLength: null, sha256: null, sourceEntryPath: SOURCE_ROADMAP_PATH, sourceEntryByteLength: internalRoadmap?.byteLength ?? null, sourceEntrySha256: internalRoadmap?.sha256 ?? null, sourceByteIdentical: false, prefixByteLength: null, prefixSha256: null, sourceArchiveBindingPassed: false, lineagePassed: false, canonicalNameVerified: false, utf8Verified: false, r42PrefixVerified: false, parentSuffixVerified: false, parentSuffixByteLength: null, parentSuffixSha256: null, failure: error instanceof Error ? error.message : String(error) };
  }
}

function cryptoSha256(bytes) { return crypto.createHash("sha256").update(bytes).digest("hex"); }

function inspect(archivePath, kind, expectedSource = null) {
  const expectedName = kind === "source" ? SOURCE_FILE_NAME : MATERIALS_FILE_NAME;
  const manifestPath = kind === "source" ? SOURCE_MANIFEST_PATH : MATERIALS_MANIFEST_PATH;
  try {
    const { parsed, identity } = regularIdentity(archivePath, expectedName, kind);
    const verified = validateA102R42ParsedArchive(parsed, kind, expectedSource);
    const sourceRoadmap = kind === "source" ? parsed.entries.find((entry) => entry.path === SOURCE_ROADMAP_PATH) : null;
    if (kind === "source") invariant(sourceRoadmap && sourceRoadmap.mode === 0o100644, "a102r42_final_source_roadmap_entry");
    const result = {
      kind, passed: true, ...identity, entries: parsed.entries.length,
      archiveFormat: "zip-store-v1", crcVerified: true,
      deterministicCentralAndLocalHeadersVerified: true,
      manifestPath, manifestSha256: verified.manifest.manifestSha256,
      manifestFileSha256: verified.manifestFileSha256,
      payloadFileCount: verified.payloadFileCount,
      payloadByteLength: verified.payloadByteLength,
      sourceArchiveBinding: kind === "materials" ? verified.manifest.sourceArchiveBinding : null,
      sourceRoadmap: kind === "source" ? { path: sourceRoadmap.path, byteLength: sourceRoadmap.byteLength, sha256: sourceRoadmap.sha256, mode: sourceRoadmap.mode } : null,
      failure: null,
    };
    if (sourceRoadmap) Object.defineProperty(result, "sourceRoadmapBytes", { value: sourceRoadmap.content, enumerable: false });
    return result;
  } catch (error) {
    return {
      kind, passed: false, fileName: path.basename(archivePath), byteLength: null, sha256: null,
      entries: null, archiveFormat: null, crcVerified: false,
      deterministicCentralAndLocalHeadersVerified: false, manifestPath,
      manifestSha256: null, manifestFileSha256: null, payloadFileCount: null,
      payloadByteLength: null, sourceArchiveBinding: null, sourceRoadmap: null,
      failure: error instanceof Error ? error.message : String(error),
    };
  }
}

export function verifyA102R42FinalPackages({ sourceZip, materialsZip, roadmap }) {
  const source = inspect(sourceZip, "source");
  const expectedSource = source.passed ? { fileName: source.fileName, byteLength: source.byteLength, sha256: source.sha256 } : null;
  const materials = inspect(materialsZip, "materials", expectedSource);
  const roadmapResult = inspectRoadmap(roadmap, source.passed && source.sourceRoadmap ? { ...source.sourceRoadmap, content: source.sourceRoadmapBytes } : null);
  const bindingPassed = Boolean(
    expectedSource && materials.passed
      && materials.sourceArchiveBinding?.fileName === expectedSource.fileName
      && materials.sourceArchiveBinding?.byteLength === expectedSource.byteLength
      && materials.sourceArchiveBinding?.sha256 === expectedSource.sha256,
  );
  const failures = [];
  if (!source.passed) failures.push({ id: "source_package", detail: source.failure });
  if (!materials.passed) failures.push({ id: "materials_package", detail: materials.failure });
  if (!bindingPassed) failures.push({ id: "materials_source_archive_binding", detail: { declared: materials.sourceArchiveBinding, observed: expectedSource } });
  if (!roadmapResult.passed) failures.push({ id: "roadmap", detail: roadmapResult.failure });
  const packageIntegrityPassed = source.passed && materials.passed && bindingPassed;
  const canonicalArtifactSetPassed = packageIntegrityPassed && roadmapResult.passed && roadmapResult.sourceArchiveBindingPassed && roadmapResult.lineagePassed;
  return {
    schemaVersion: "velmere.pass36.a102r42.final-packages-verification.v1",
    revisionId: REVISION_ID,
    status: canonicalArtifactSetPassed ? "PASS_A102R42_FINAL_ACTION_REQUIRED_PACKAGES_NO_PROMOTION" : "FAIL_A102R42_FINAL_PACKAGES",
    source, materials, roadmap: roadmapResult, materialsSourceBindingPassed: bindingPassed,
    roadmapSourceBindingPassed: roadmapResult.sourceArchiveBindingPassed,
    roadmapLineagePassed: roadmapResult.lineagePassed,
    packageIntegrityPassed,
    canonicalArtifactSetPassed,
    a77r1ToA80r1Credit: false,
    failed: failures.length, failures,
    globalDecision: "NO_GO", live: false, saleEnabled: false,
    productionApproved: false, worldClassProven: false,
  };
}

function writeNoClobber(filePath, text) {
  invariant(!fs.existsSync(filePath), "a102r42_final_output_exists_no_overwrite");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, { encoding: "utf8", flag: "wx" });
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  const result = verifyA102R42FinalPackages(options);
  const output = `${JSON.stringify(result, null, 2)}\n`;
  if (options.output) writeNoClobber(options.output, output);
  process.stdout.write(output);
  if (!result.canonicalArtifactSetPassed) process.exitCode = 1;
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invoked === import.meta.url) {
  try { main(); }
  catch (error) {
    process.stderr.write(`${JSON.stringify({ schemaVersion: "velmere.pass36.a102r42.final-packages-verification.v1", revisionId: REVISION_ID, status: "FAIL_A102R42_FINAL_PACKAGES", error: error instanceof Error ? error.message : String(error), globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false })}\n`);
    process.exitCode = 1;
  }
}
