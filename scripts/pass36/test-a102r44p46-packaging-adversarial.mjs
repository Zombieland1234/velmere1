#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { parseDeterministicZip, writeDeterministicZip } from "../pass4826/release-package-contract.mjs";
import {
  FINAL_CYCLE,
  LEDGER_FILE_NAME,
  LEDGER_HEADERS,
  LEDGER_SECTIONS,
  MATERIALS_FILE_NAME,
  MATERIALS_MANIFEST_PATH,
  PARENT_CHECKPOINT,
  REVISION_ID,
  SOURCE_FILE_NAME,
  assertDistinctInputRoots,
  buildSourceManifest,
  canonicalJson,
  collectTree,
  requireEmptyOutputDirectory,
  sha256,
} from "./r44p46-packaging-lib.mjs";
import { writeA102R44P46SourceManifest } from "./build-a102r44p46-source-manifest.mjs";
import { packageA102R44P46, verifyR44P46MaterialsArchive, verifyR44P46SourceArchive } from "./package-a102r44p46-deterministic.mjs";
import { cleanUnpackA102R44P46 } from "./verify-a102r44p46-clean-unpack.mjs";
import { verifyCleanSourceAuthorityA102R44P46 } from "./verify-a102r44p46-clean-source-authority.mjs";
import { verifyCanonicalTrioA102R44P46 } from "./verify-a102r44p46-canonical-trio.mjs";

const tests = [];
function check(id, operation) {
  try {
    const detail = operation();
    tests.push({ id, status: "PASS", detail: detail ?? null });
  } catch (error) {
    tests.push({ id, status: "FAIL", error: error instanceof Error ? error.message : String(error) });
  }
}

function rejects(id, operation, expectedFragment = null) {
  check(id, () => {
    let observed = null;
    try { operation(); }
    catch (error) { observed = error instanceof Error ? error.message : String(error); }
    if (observed === null) throw new Error("expected_rejection_not_observed");
    if (expectedFragment !== null && !observed.includes(expectedFragment)) throw new Error(`unexpected_rejection:${observed}`);
    return observed;
  });
}

function mkdir(root, name) {
  const output = path.join(root, name);
  fs.mkdirSync(output, { recursive: false });
  return output;
}

function copyTrio(sourceDirectory, destination) {
  fs.mkdirSync(destination);
  for (const name of [SOURCE_FILE_NAME, MATERIALS_FILE_NAME, LEDGER_FILE_NAME]) fs.copyFileSync(path.join(sourceDirectory, name), path.join(destination, name));
  return destination;
}

function validLedger(receipt) {
  const headerValues = {
    CHECKPOINT: "PASS36 A102R44P46",
    PARENT: PARENT_CHECKPOINT,
    PASS: REVISION_ID,
    CYCLE: FINAL_CYCLE,
    "SOURCE FINGERPRINT": receipt.source.sourceFingerprint,
    "GLOBAL DECISION": "NO_GO",
    LIVE: "false",
    saleEnabled: "false",
    productionApproved: "false",
    worldClassProven: "false",
    "INTERNAL CLOSURE previous → current": "7.7% → 11.5%",
    "EXTERNAL EVIDENCE CLOSURE previous → current": "0.0% → 0.0%",
    "PROOF-WEIGHTED previous → current": "UNREPRODUCIBLE → UNREPRODUCIBLE",
  };
  const lines = LEDGER_HEADERS.map((key) => `${key}: ${headerValues[key]}`);
  lines.push("");
  for (let index = 0; index < LEDGER_SECTIONS.length; index += 1) {
    lines.push(`## ${index + 1}. ${LEDGER_SECTIONS[index]}`);
    lines.push(`Evidence boundary retained for section ${index + 1}.`);
    if (index === 35) {
      lines.push(`SOURCE ZIP: ${SOURCE_FILE_NAME}`);
      lines.push(`SOURCE ZIP SHA-256: ${receipt.source.sha256}`);
      lines.push(`SOURCE ZIP BYTES: ${receipt.source.byteLength}`);
      lines.push(`MATERIALS ZIP: ${MATERIALS_FILE_NAME}`);
      lines.push(`MATERIALS ZIP SHA-256: ${receipt.materials.sha256}`);
      lines.push(`MATERIALS ZIP BYTES: ${receipt.materials.byteLength}`);
      lines.push(`SOURCE MANIFEST SHA-256: ${receipt.source.sourceManifestSha256}`);
      lines.push(`DETACHED LEDGER: ${LEDGER_FILE_NAME}`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function rewriteArchive(sourcePath, outputPath, mutate) {
  const parsed = parseDeterministicZip(sourcePath);
  const entries = parsed.entries.map((entry) => ({ path: entry.path, content: Buffer.from(entry.content), mode: entry.mode }));
  mutate(entries);
  writeDeterministicZip(outputPath, entries, { overwrite: false });
}

function mutateLedger(baseDirectory, name, mutation) {
  const directory = copyTrio(baseDirectory, path.join(path.dirname(baseDirectory), name));
  const ledgerPath = path.join(directory, LEDGER_FILE_NAME);
  const value = fs.readFileSync(ledgerPath, "utf8");
  fs.writeFileSync(ledgerPath, mutation(value));
  return directory;
}

export function runA102R44P46PackagingAdversarial({ evidenceDir = null } = {}) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-r44p46-packaging-"));
  try {
    const source = mkdir(temporaryRoot, "source");
    const materials = mkdir(temporaryRoot, "materials");
    const output = mkdir(temporaryRoot, "output");
    fs.writeFileSync(path.join(source, "app.txt"), "canonical source\n");
    fs.mkdirSync(path.join(source, ".git"));
    fs.writeFileSync(path.join(source, ".git", "ignored"), "must not package\n");
    fs.writeFileSync(path.join(materials, "evidence.json"), `${JSON.stringify({ evidence: "TESTED_SYNTHETIC" })}\n`);
    fs.writeFileSync(path.join(materials, "VELMERE_CURRENT_STATE_AND_PASS_LEDGER_PASS36_A102R44P45_ACTION_REQUIRED_CONTEXT_QUALIFIED_INTERACTION_ORDERING_PUBLIC_CONTROL_DELTA_NO_LIVE_CREDIT.txt"), "HISTORICAL_PARENT_EVIDENCE\n");

    let manifestReceipt;
    check("source_manifest_build_and_exact_verify", () => {
      manifestReceipt = writeA102R44P46SourceManifest(source);
      return manifestReceipt.sourceAggregateSha256;
    });
    check("dynamic_git_exclusion_is_physical", () => {
      const manifest = buildSourceManifest(source);
      if (manifest.files.some((row) => row.path.startsWith(".git/"))) throw new Error("git_path_in_manifest");
      return manifest.fileCount;
    });
    check("historical_r45_ledger_is_permitted", () => collectTree(materials, { kind: "materials" }).length);

    let packageReceipt;
    check("deterministic_two_run_source_and_materials_package", () => {
      packageReceipt = packageA102R44P46({ sourceRoot: source, materialsRoot: materials, outputDir: output });
      if (!packageReceipt.byteIdenticalSource || !packageReceipt.byteIdenticalMaterials || packageReceipt.deterministicRunsPerArchive !== 2) throw new Error("two_run_contract_missing");
      return { source: packageReceipt.source.sha256, materials: packageReceipt.materials.sha256 };
    });
    check("source_archive_exact_embedded_manifest_binding", () => verifyR44P46SourceArchive(path.join(output, SOURCE_FILE_NAME)).sourceFingerprint);
    check("materials_archive_exact_source_binding", () => verifyR44P46MaterialsArchive(path.join(output, MATERIALS_FILE_NAME), packageReceipt.materials.sourceArchiveBinding).archiveSha256);

    const cleanSource = mkdir(temporaryRoot, "clean-source");
    const cleanMaterials = mkdir(temporaryRoot, "clean-materials");
    check("clean_source_unpack", () => cleanUnpackA102R44P46({ kind: "source", archive: path.join(output, SOURCE_FILE_NAME), outputDir: cleanSource }).status);
    check("clean_materials_unpack_with_source_binding", () => cleanUnpackA102R44P46({ kind: "materials", archive: path.join(output, MATERIALS_FILE_NAME), outputDir: cleanMaterials, sourceArchive: path.join(output, SOURCE_FILE_NAME) }).status);
    check("clean_source_authority_archive_and_disk", () => verifyCleanSourceAuthorityA102R44P46({ sourceRoot: cleanSource, sourceArchive: path.join(output, SOURCE_FILE_NAME) }).status);

    fs.writeFileSync(path.join(output, LEDGER_FILE_NAME), validLedger(packageReceipt));
    check("canonical_trio_valid_exact_three", () => verifyCanonicalTrioA102R44P46(output).status);

    rejects("source_material_alias_rejected", () => assertDistinctInputRoots(source, source), "source_materials_alias");
    const nested = path.join(source, "nested-materials");
    fs.mkdirSync(nested);
    rejects("source_material_nested_rejected", () => assertDistinctInputRoots(source, nested), "source_materials_nested");
    fs.rmdirSync(nested);
    const symlinkOutput = path.join(temporaryRoot, "output-link");
    fs.symlinkSync(path.join(temporaryRoot, "output-target"), symlinkOutput, "dir");
    fs.mkdirSync(path.join(temporaryRoot, "output-target"));
    rejects("output_symlink_rejected", () => requireEmptyOutputDirectory(symlinkOutput), "not_real_directory");
    const sourceInnerOutput = path.join(source, "inner-output");
    fs.mkdirSync(sourceInnerOutput);
    rejects("output_containment_rejected", () => requireEmptyOutputDirectory(sourceInnerOutput, [source]), "output_inside_input");
    fs.rmdirSync(sourceInnerOutput);
    const nonemptyOutput = mkdir(temporaryRoot, "nonempty-output");
    fs.writeFileSync(path.join(nonemptyOutput, "unexpected"), "x");
    rejects("nonempty_output_rejected", () => requireEmptyOutputDirectory(nonemptyOutput), "output_not_empty");

    const currentLedgerSource = mkdir(temporaryRoot, "current-ledger-source");
    fs.writeFileSync(path.join(currentLedgerSource, "app.txt"), "x");
    fs.writeFileSync(path.join(currentLedgerSource, LEDGER_FILE_NAME), "must reject\n");
    rejects("current_r46_ledger_rejected_from_source", () => collectTree(currentLedgerSource, { kind: "source" }), "current_ledger_embedded");
    const currentLedgerMaterials = mkdir(temporaryRoot, "current-ledger-materials");
    fs.writeFileSync(path.join(currentLedgerMaterials, "evidence.txt"), "x");
    fs.writeFileSync(path.join(currentLedgerMaterials, LEDGER_FILE_NAME), "must reject\n");
    rejects("current_r46_ledger_rejected_from_materials", () => collectTree(currentLedgerMaterials, { kind: "materials" }), "current_ledger_embedded");
    const symlinkSource = mkdir(temporaryRoot, "symlink-source");
    fs.writeFileSync(path.join(symlinkSource, "real.txt"), "x");
    fs.symlinkSync("real.txt", path.join(symlinkSource, "alias.txt"));
    rejects("source_symlink_rejected", () => collectTree(symlinkSource, { kind: "source" }), "symlink_forbidden");
    const symlinkMaterials = mkdir(temporaryRoot, "symlink-materials");
    fs.writeFileSync(path.join(symlinkMaterials, "real.txt"), "x");
    fs.symlinkSync("real.txt", path.join(symlinkMaterials, "alias.txt"));
    rejects("materials_symlink_rejected", () => collectTree(symlinkMaterials, { kind: "materials" }), "symlink_forbidden");

    const writerTest = mkdir(temporaryRoot, "writer-tests");
    rejects("archive_traversal_rejected", () => writeDeterministicZip(path.join(writerTest, "traversal.zip"), [{ path: "../x.txt", content: Buffer.from("x"), mode: 0o100644 }]));
    rejects("archive_duplicate_path_rejected", () => writeDeterministicZip(path.join(writerTest, "duplicate.zip"), [{ path: "x.txt", content: Buffer.from("a"), mode: 0o100644 }, { path: "x.txt", content: Buffer.from("b"), mode: 0o100644 }]));

    const tamperedSourceDir = mkdir(temporaryRoot, "tampered-source");
    const tamperedSource = path.join(tamperedSourceDir, SOURCE_FILE_NAME);
    rewriteArchive(path.join(output, SOURCE_FILE_NAME), tamperedSource, (entries) => {
      const row = entries.find((entry) => entry.path === "app.txt");
      row.content = Buffer.from("tampered source\n");
    });
    rejects("source_payload_manifest_mismatch_rejected", () => verifyR44P46SourceArchive(tamperedSource), "source_archive_manifest_payload_mismatch");

    const tamperedMaterialsDir = mkdir(temporaryRoot, "tampered-materials");
    const tamperedMaterials = path.join(tamperedMaterialsDir, MATERIALS_FILE_NAME);
    rewriteArchive(path.join(output, MATERIALS_FILE_NAME), tamperedMaterials, (entries) => {
      const row = entries.find((entry) => entry.path === MATERIALS_MANIFEST_PATH);
      const manifest = JSON.parse(row.content.toString("utf8"));
      manifest.sourceArchiveBinding.sha256 = "0".repeat(64);
      delete manifest.manifestSha256;
      manifest.manifestSha256 = sha256(canonicalJson(manifest));
      row.content = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
    });
    rejects("materials_wrong_source_binding_rejected", () => verifyR44P46MaterialsArchive(tamperedMaterials, packageReceipt.materials.sourceArchiveBinding), "source_binding_mismatch");

    const wrongNameDir = mkdir(temporaryRoot, "wrong-name");
    const wrongName = path.join(wrongNameDir, "wrong.zip");
    fs.copyFileSync(path.join(output, SOURCE_FILE_NAME), wrongName);
    const wrongNameOutput = mkdir(temporaryRoot, "wrong-name-output");
    rejects("clean_unpack_wrong_canonical_name_rejected", () => cleanUnpackA102R44P46({ kind: "source", archive: wrongName, outputDir: wrongNameOutput }), "archive_filename");
    const materialsNoBindingOutput = mkdir(temporaryRoot, "materials-no-binding-output");
    rejects("clean_materials_without_source_rejected", () => cleanUnpackA102R44P46({ kind: "materials", archive: path.join(output, MATERIALS_FILE_NAME), outputDir: materialsNoBindingOutput }), "source_archive_required");

    const trioExtra = copyTrio(output, path.join(temporaryRoot, "trio-extra"));
    fs.writeFileSync(path.join(trioExtra, "extra.txt"), "x");
    rejects("trio_extra_file_rejected", () => verifyCanonicalTrioA102R44P46(trioExtra), "exact_count");
    const trioMissing = copyTrio(output, path.join(temporaryRoot, "trio-missing"));
    fs.unlinkSync(path.join(trioMissing, LEDGER_FILE_NAME));
    rejects("trio_missing_file_rejected", () => verifyCanonicalTrioA102R44P46(trioMissing), "exact_count");
    const duplicateHeader = mutateLedger(output, "trio-ledger-duplicate-header", (text) => `CHECKPOINT: PASS36 A102R44P46\n${text}`);
    rejects("ledger_duplicate_header_rejected", () => verifyCanonicalTrioA102R44P46(duplicateHeader), "header_count");
    const missingSection = mutateLedger(output, "trio-ledger-missing-section", (text) => text.replace(`## 38. ${LEDGER_SECTIONS[37]}\nEvidence boundary retained for section 38.\n`, ""));
    rejects("ledger_missing_section_rejected", () => verifyCanonicalTrioA102R44P46(missingSection), "section_count");
    const emptySection = mutateLedger(output, "trio-ledger-empty-section", (text) => text.replace("## 1. EXECUTIVE TRUTH\nEvidence boundary retained for section 1.\n", "## 1. EXECUTIVE TRUTH\n"));
    rejects("ledger_empty_section_rejected", () => verifyCanonicalTrioA102R44P46(emptySection), "section_empty:1");
    const trueFlag = mutateLedger(output, "trio-ledger-true-flag", (text) => text.replace("LIVE: false", "LIVE: true"));
    rejects("ledger_true_live_rejected", () => verifyCanonicalTrioA102R44P46(trueFlag), "forbidden_true_promotion");
    const badFingerprint = mutateLedger(output, "trio-ledger-fingerprint", (text) => text.replace(packageReceipt.source.sourceFingerprint, "f".repeat(64)));
    rejects("ledger_wrong_source_fingerprint_rejected", () => verifyCanonicalTrioA102R44P46(badFingerprint), "source_fingerprint");
    const badSourceBinding = mutateLedger(output, "trio-ledger-source-binding", (text) => text.replace(`SOURCE ZIP SHA-256: ${packageReceipt.source.sha256}`, `SOURCE ZIP SHA-256: ${"e".repeat(64)}`));
    rejects("ledger_wrong_archive_binding_rejected", () => verifyCanonicalTrioA102R44P46(badSourceBinding), "source_zip_binding");
    const placeholder = mutateLedger(output, "trio-ledger-placeholder", (text) => `${text}\n[PLACEHOLDER]\n`);
    rejects("ledger_placeholder_rejected", () => verifyCanonicalTrioA102R44P46(placeholder), "placeholder");
    const draft = mutateLedger(output, "trio-ledger-draft", (text) => `${text}\nDRAFT_PREPACKAGE_NOT_AUTHORITY\n`);
    rejects("ledger_draft_prepackage_rejected", () => verifyCanonicalTrioA102R44P46(draft), "draft_or_prepackage");
    const symlinkTrio = copyTrio(output, path.join(temporaryRoot, "trio-symlink"));
    const outsideLedger = path.join(temporaryRoot, "outside-ledger.txt");
    fs.copyFileSync(path.join(symlinkTrio, LEDGER_FILE_NAME), outsideLedger);
    fs.unlinkSync(path.join(symlinkTrio, LEDGER_FILE_NAME));
    fs.symlinkSync(outsideLedger, path.join(symlinkTrio, LEDGER_FILE_NAME));
    rejects("trio_symlink_artifact_rejected", () => verifyCanonicalTrioA102R44P46(symlinkTrio), "non_regular_entry");

    const passed = tests.filter((test) => test.status === "PASS").length;
    const failed = tests.length - passed;
    const receiptCore = {
      schemaVersion: "velmere.pass36.a102r44p46.packaging-adversarial-receipt.v1",
      revisionId: REVISION_ID,
      status: failed === 0 ? "PASS_R44P46_PACKAGING_ADVERSARIAL" : "FAIL_R44P46_PACKAGING_ADVERSARIAL",
      tests: tests.length,
      passed,
      failed,
      cases: tests,
      sourceAndMaterialsTwoRunByteIdentity: packageReceipt?.byteIdenticalSource === true && packageReceipt?.byteIdenticalMaterials === true,
      exactTrioPositiveControl: tests.some((test) => test.id === "canonical_trio_valid_exact_three" && test.status === "PASS"),
      globalDecision: "NO_GO",
      live: false,
      saleEnabled: false,
      productionApproved: false,
      worldClassProven: false,
    };
    const receipt = { ...receiptCore, receiptSha256: sha256(canonicalJson(receiptCore)) };
    if (evidenceDir !== null) {
      fs.mkdirSync(evidenceDir, { recursive: true });
      fs.writeFileSync(path.join(evidenceDir, "R44P46_PACKAGING_ADVERSARIAL_RECEIPT.json"), `${JSON.stringify(receipt, null, 2)}\n`);
    }
    return receipt;
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function parseArguments(argv) {
  if (argv.length === 0) return { evidenceDir: null };
  if (argv.length === 2 && argv[0] === "--evidence-dir" && argv[1].length > 0) return { evidenceDir: path.resolve(argv[1]) };
  throw new Error("r44p46_packaging_adversarial_arguments");
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invoked === import.meta.url) {
  try {
    const receipt = runA102R44P46PackagingAdversarial(parseArguments(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
    if (receipt.failed > 0) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ status: "FAIL_R44P46_PACKAGING_ADVERSARIAL_HARNESS", error: error instanceof Error ? error.message : String(error), globalDecision: "NO_GO" })}\n`);
    process.exitCode = 1;
  }
}
