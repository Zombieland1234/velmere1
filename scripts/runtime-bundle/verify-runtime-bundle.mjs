#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { sha256 } from "../pass4826/release-package-contract.mjs";
import { RUNTIME_RECEIPT_SCHEMA, RUNTIME_VERIFICATION_SCHEMA, receiptSha256, verifyRuntimeArchive } from "./runtime-bundle-lib.mjs";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`argument_value_missing:${name}`);
  return value;
}

const root = process.cwd();
const archivePath = path.resolve(root, argument("--archive", "artifacts/runtime/VELMERE_RUNTIME_DEPLOYMENT.zip"));
const receiptPath = path.resolve(root, argument("--receipt", "artifacts/runtime/RUNTIME_PACKAGE_RECEIPT.json"));
const outputPath = path.resolve(root, argument("--output", "artifacts/runtime/RUNTIME_VERIFICATION_RECEIPT.json"));
const verified = verifyRuntimeArchive(archivePath, { policyRoot: root });
const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
if (receipt.schemaVersion !== RUNTIME_RECEIPT_SCHEMA || receipt.status !== "PASS") throw new Error("runtime_package_receipt_invalid");
const receiptCore = { ...receipt };
delete receiptCore.receiptSha256;
if (receipt.receiptSha256 !== receiptSha256(receiptCore)) throw new Error("runtime_package_receipt_digest_mismatch");
if (receipt.archive.sha256 !== verified.archiveSha256 || receipt.archive.byteLength !== verified.archiveByteLength) throw new Error("runtime_package_receipt_archive_mismatch");
if (receipt.manifestSha256 !== verified.manifestSha256) throw new Error("runtime_package_receipt_manifest_mismatch");
if (JSON.stringify(receipt.deploymentClosure) !== JSON.stringify(verified.deploymentClosure)) throw new Error("runtime_package_receipt_deployment_closure_mismatch");
if (JSON.stringify(receipt.currentSourceBinding) !== JSON.stringify(verified.currentSourceBinding)) throw new Error("runtime_package_receipt_current_source_binding_mismatch");
const core = {
  schemaVersion: RUNTIME_VERIFICATION_SCHEMA,
  status: "PASS",
  archive: receipt.archive,
  payload: receipt.payload,
  currentSourceBinding: verified.currentSourceBinding,
  manifestSha256: verified.manifestSha256,
  deploymentClosure: verified.deploymentClosure,
  packageReceipt: {
    path: path.relative(root, receiptPath).split(path.sep).join("/"),
    fileSha256: sha256(fs.readFileSync(receiptPath)),
    receiptSha256: receipt.receiptSha256,
  },
  policyDefinedProofPlanePhysicallyAbsent: verified.manifest.exclusionPolicy.policyDefinedProofPlanePhysicallyAbsent,
  proofPlaneClaimScope: verified.manifest.exclusionPolicy.proofPlaneClaimScope,
  deterministicZipStructureVerified: true,
};
const verification = { ...core, receiptSha256: receiptSha256(core) };
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(verification, null, 2)}\n`);
console.log(JSON.stringify({ status: verification.status, archive: verification.archive, payload: verification.payload, output: path.relative(root, outputPath).split(path.sep).join("/") }, null, 2));
