import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, realpath, rename, rm } from "node:fs/promises";
import path from "node:path";

import { canonicalJson } from "@/lib/security/canonical-json";
import {
  invokeCommercialCohortExternalSigner,
  prepareCommercialCohortExternalSigningRequest,
  verifyCommercialCohortExternalSigningResponse,
  type CommercialCohortExternalSignerCommand,
  type CommercialCohortExternalSigningRequest,
  type CommercialCohortExternalSigningResponse,
} from "@/lib/worldclass/commercial-cohort-external-key-custody";
import type { CommercialCohortDeploymentReceipt } from "@/lib/worldclass/commercial-cohort-deployment-receipt";
import type { CommercialCohortStagingE2EReceipt } from "@/lib/worldclass/commercial-cohort-staging-e2e";
import type { CommercialCohortChaosReceipt } from "@/lib/worldclass/commercial-cohort-chaos-recovery";
import {
  finalizeCommercialCohortObservabilityReceipt,
  prepareCommercialCohortObservabilityReceipt,
  verifyCommercialCohortObservabilityReceiptChain,
  type CommercialCohortObservabilityReceipt,
  type CommercialCohortObservabilityVerification,
  type CommercialCohortSloWindow,
} from "@/lib/worldclass/commercial-cohort-observability-incident";
import type {
  CommercialCohortDetachedSignature,
  CommercialCohortTrustBundle,
} from "@/lib/worldclass/commercial-cohort-public-checkpoint";

const MAX_CONFIG_BYTES = 2 * 1024 * 1024;
const MAX_RECEIPT_BYTES = 16 * 1024 * 1024;
const MAX_WINDOW_BYTES = 2 * 1024 * 1024;
const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{5,191}$/u;
const REQUIRED_VERIFICATION_FLAGS = [
  "verified",
  "observabilityVerified",
  "telemetryBound",
  "sloVerified",
  "incidentResponseVerified",
  "safeDegradationVerified",
  "observabilityRollbackProtected",
] as const;

export const PASS4816_RECEIPT_FILE = "observability-incident-receipt.json" as const;
export const PASS4816_CHAIN_FILE = "observability-incident-receipt-chain.json" as const;

export type Pass4816SignerConfig = CommercialCohortExternalSignerCommand & {
  keyId: string;
  approvalTicketDigest: string;
  requestId: string;
  requestNonce: string;
};

export type Pass4816BuildConfig = {
  schemaVersion: "velmere.pass4816-observability-build-config.v1";
  promotionTarget: "staging" | "production";
  audience: string;
  observabilitySequence: number;
  minimumObservabilitySequence: number;
  trustEpoch: number;
  previousReceiptChainPath: string | null;
  deploymentReceiptPath: string;
  stagingReceiptPath: string;
  chaosReceiptPath: string;
  trustBundlesPath: string;
  windowPaths: string[];
  issuedAt: string;
  expiresAt: string;
  runIdDigest: string;
  nonce: string;
  signingRequestIssuedAt: string;
  signingRequestExpiresAt: string;
  signerCommands: Pass4816SignerConfig[];
  outputDirectory: string;
};

export type Pass4816VerifyConfig = {
  schemaVersion: "velmere.pass4816-observability-verify-config.v1";
  receiptChainPath: string;
  deploymentReceiptPath: string;
  stagingReceiptPath: string;
  chaosReceiptPath: string;
  trustBundlesPath: string;
  expectedAudience: string;
  expectedPromotionTarget: "staging" | "production";
  minimumObservabilitySequence: number;
  expectedCurrentReceiptDigest: string;
  verificationTime: string;
};

export type Pass4816BuildResult = {
  receipt: CommercialCohortObservabilityReceipt;
  chain: CommercialCohortObservabilityReceipt[];
  verification: CommercialCohortObservabilityVerification;
  outputDirectory: string;
};

export type Pass4816BuildOptions = {
  now?: Date;
  allowTestOnlySigner?: boolean;
  invokeSigner?: (args: {
    request: CommercialCohortExternalSigningRequest;
    signer: Pass4816SignerConfig;
    now: Date;
  }) => CommercialCohortExternalSigningResponse;
  beforeCommit?: () => void | Promise<void>;
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown, code: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  return value as JsonRecord;
}

function exactKeys(value: JsonRecord, required: readonly string[], code: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...required].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(code);
}

function requiredText(value: unknown, code: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new Error(code);
  return text;
}

function requiredId(value: unknown, code: string): string {
  const text = requiredText(value, code);
  if (!SAFE_ID.test(text)) throw new Error(code);
  return text;
}

function requiredDigest(value: unknown, code: string): string {
  const text = requiredText(value, code).toLowerCase();
  if (!SHA256.test(text)) throw new Error(code);
  return text;
}

function positiveInteger(value: unknown, code: string): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error(code);
  return number;
}

function requiredDate(value: unknown, code: string): Date {
  const text = requiredText(value, code);
  const date = new Date(text);
  if (!Number.isFinite(date.getTime())) throw new Error(code);
  return date;
}

function requiredAbsolutePath(value: unknown, code: string): string {
  const text = requiredText(value, code);
  if (!path.isAbsolute(text)) throw new Error(`${code}_not_absolute`);
  return path.resolve(text);
}

function samePath(left: string, right: string): boolean {
  return process.platform === "win32"
    ? left.toLowerCase() === right.toLowerCase()
    : left === right;
}

async function readBoundJson<T>(inputPath: string, maxBytes: number, code: string): Promise<T> {
  const absolutePath = requiredAbsolutePath(inputPath, `${code}_path_invalid`);
  const entry = await lstat(absolutePath).catch(() => null);
  if (!entry || !entry.isFile() || entry.isSymbolicLink()) throw new Error(`${code}_regular_file_required`);
  if (entry.size < 2 || entry.size > maxBytes) throw new Error(`${code}_size_invalid`);
  const resolved = await realpath(absolutePath);
  if (!samePath(resolved, absolutePath)) throw new Error(`${code}_realpath_mismatch`);
  const handle = await open(resolved, constants.O_RDONLY);
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.dev !== entry.dev || before.ino !== entry.ino || before.size !== entry.size) {
      throw new Error(`${code}_identity_changed`);
    }
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (after.dev !== before.dev || after.ino !== before.ino || after.size !== before.size
        || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs || bytes.length !== before.size) {
      throw new Error(`${code}_changed_during_read`);
    }
    try {
      return JSON.parse(bytes.toString("utf8")) as T;
    } catch {
      throw new Error(`${code}_json_invalid`);
    }
  } finally {
    await handle.close();
  }
}

function validateSignerConfig(value: unknown, index: number): Pass4816SignerConfig {
  const signer = record(value, `pass4816_signer_invalid:${index}`) as unknown as Pass4816SignerConfig;
  requiredId(signer.keyId, `pass4816_signer_key_id_invalid:${index}`);
  requiredDigest(signer.approvalTicketDigest, `pass4816_signer_approval_digest_invalid:${index}`);
  requiredId(signer.requestId, `pass4816_signer_request_id_invalid:${index}`);
  requiredId(signer.requestNonce, `pass4816_signer_nonce_invalid:${index}`);
  if (!["aws-kms", "gcp-cloud-kms", "azure-key-vault", "vault-transit", "pkcs11-hsm", "test-only"].includes(String(signer.provider))) {
    throw new Error(`pass4816_signer_provider_invalid:${index}`);
  }
  return signer;
}

function validateBuildConfig(value: unknown): Pass4816BuildConfig {
  const config = record(value, "pass4816_build_config_invalid");
  exactKeys(config, [
    "schemaVersion", "promotionTarget", "audience", "observabilitySequence",
    "minimumObservabilitySequence", "trustEpoch", "previousReceiptChainPath",
    "deploymentReceiptPath", "stagingReceiptPath", "chaosReceiptPath", "trustBundlesPath",
    "windowPaths", "issuedAt", "expiresAt", "runIdDigest", "nonce",
    "signingRequestIssuedAt", "signingRequestExpiresAt", "signerCommands", "outputDirectory",
  ], "pass4816_build_config_keys_invalid");
  if (config.schemaVersion !== "velmere.pass4816-observability-build-config.v1") throw new Error("pass4816_build_config_schema_invalid");
  if (!(config.promotionTarget === "staging" || config.promotionTarget === "production")) throw new Error("pass4816_build_promotion_target_invalid");
  requiredId(config.audience, "pass4816_build_audience_invalid");
  positiveInteger(config.observabilitySequence, "pass4816_build_sequence_invalid");
  positiveInteger(config.minimumObservabilitySequence, "pass4816_build_minimum_sequence_invalid");
  positiveInteger(config.trustEpoch, "pass4816_build_trust_epoch_invalid");
  if (config.previousReceiptChainPath !== null) requiredAbsolutePath(config.previousReceiptChainPath, "pass4816_previous_chain_path_invalid");
  for (const [name, field] of Object.entries({
    deploymentReceiptPath: config.deploymentReceiptPath,
    stagingReceiptPath: config.stagingReceiptPath,
    chaosReceiptPath: config.chaosReceiptPath,
    trustBundlesPath: config.trustBundlesPath,
    outputDirectory: config.outputDirectory,
  })) requiredAbsolutePath(field, `pass4816_${name}_invalid`);
  if (!Array.isArray(config.windowPaths) || config.windowPaths.length !== 12) throw new Error("pass4816_window_paths_invalid");
  const windowPaths = config.windowPaths.map((item, index) => requiredAbsolutePath(item, `pass4816_window_path_invalid:${index}`));
  if (new Set(windowPaths.map((item) => process.platform === "win32" ? item.toLowerCase() : item)).size !== windowPaths.length) {
    throw new Error("pass4816_window_paths_duplicate");
  }
  const issuedAt = requiredDate(config.issuedAt, "pass4816_issued_at_invalid");
  const expiresAt = requiredDate(config.expiresAt, "pass4816_expires_at_invalid");
  if (expiresAt.getTime() <= issuedAt.getTime()) throw new Error("pass4816_receipt_time_order_invalid");
  requiredDigest(config.runIdDigest, "pass4816_run_id_digest_invalid");
  requiredId(config.nonce, "pass4816_nonce_invalid");
  const signingIssuedAt = requiredDate(config.signingRequestIssuedAt, "pass4816_signing_issued_at_invalid");
  const signingExpiresAt = requiredDate(config.signingRequestExpiresAt, "pass4816_signing_expires_at_invalid");
  if (signingExpiresAt.getTime() <= signingIssuedAt.getTime() || signingExpiresAt.getTime() - signingIssuedAt.getTime() > 10 * 60 * 1_000) {
    throw new Error("pass4816_signing_request_window_invalid");
  }
  if (!Array.isArray(config.signerCommands) || config.signerCommands.length < 2 || config.signerCommands.length > 32) {
    throw new Error("pass4816_signer_set_invalid");
  }
  const signers = config.signerCommands.map(validateSignerConfig);
  if (new Set(signers.map((item) => item.keyId)).size !== signers.length
      || new Set(signers.map((item) => item.requestId)).size !== signers.length
      || new Set(signers.map((item) => item.requestNonce)).size !== signers.length) {
    throw new Error("pass4816_signer_identity_reused");
  }
  return config as unknown as Pass4816BuildConfig;
}

function validateVerifyConfig(value: unknown): Pass4816VerifyConfig {
  const config = record(value, "pass4816_verify_config_invalid");
  exactKeys(config, [
    "schemaVersion", "receiptChainPath", "deploymentReceiptPath", "stagingReceiptPath",
    "chaosReceiptPath", "trustBundlesPath", "expectedAudience", "expectedPromotionTarget",
    "minimumObservabilitySequence", "expectedCurrentReceiptDigest", "verificationTime",
  ], "pass4816_verify_config_keys_invalid");
  if (config.schemaVersion !== "velmere.pass4816-observability-verify-config.v1") throw new Error("pass4816_verify_config_schema_invalid");
  for (const [name, field] of Object.entries({
    receiptChainPath: config.receiptChainPath,
    deploymentReceiptPath: config.deploymentReceiptPath,
    stagingReceiptPath: config.stagingReceiptPath,
    chaosReceiptPath: config.chaosReceiptPath,
    trustBundlesPath: config.trustBundlesPath,
  })) requiredAbsolutePath(field, `pass4816_verify_${name}_invalid`);
  requiredId(config.expectedAudience, "pass4816_verify_audience_invalid");
  if (!(config.expectedPromotionTarget === "staging" || config.expectedPromotionTarget === "production")) throw new Error("pass4816_verify_promotion_target_invalid");
  positiveInteger(config.minimumObservabilitySequence, "pass4816_verify_minimum_sequence_invalid");
  requiredDigest(config.expectedCurrentReceiptDigest, "pass4816_verify_expected_digest_invalid");
  requiredDate(config.verificationTime, "pass4816_verify_time_invalid");
  return config as unknown as Pass4816VerifyConfig;
}

export async function readPass4816BuildConfig(configPath: string): Promise<Pass4816BuildConfig> {
  return validateBuildConfig(await readBoundJson<unknown>(configPath, MAX_CONFIG_BYTES, "pass4816_build_config"));
}

export async function readPass4816VerifyConfig(configPath: string): Promise<Pass4816VerifyConfig> {
  return validateVerifyConfig(await readBoundJson<unknown>(configPath, MAX_CONFIG_BYTES, "pass4816_verify_config"));
}

function assertVerified(verification: CommercialCohortObservabilityVerification): void {
  const failed = REQUIRED_VERIFICATION_FLAGS.filter((name) => verification[name] !== true);
  if (failed.length || verification.blockers.length) {
    throw new Error(`pass4816_observability_verification_failed:${[...failed, ...verification.blockers].join("|")}`);
  }
}

async function ensureSafeParent(targetDirectory: string): Promise<{ parent: string; target: string }> {
  const target = requiredAbsolutePath(targetDirectory, "pass4816_output_directory_invalid");
  const parent = path.dirname(target);
  if (target === parent || path.basename(target) === "." || path.basename(target) === "..") throw new Error("pass4816_output_directory_too_broad");
  const parentEntry = await lstat(parent).catch(() => null);
  if (!parentEntry || !parentEntry.isDirectory() || parentEntry.isSymbolicLink()) throw new Error("pass4816_output_parent_directory_invalid");
  const resolvedParent = await realpath(parent);
  if (!samePath(resolvedParent, parent)) throw new Error("pass4816_output_parent_realpath_mismatch");
  const existingTarget = await lstat(target).catch(() => null);
  if (existingTarget) throw new Error("pass4816_output_directory_exists");
  return { parent, target };
}

async function writeNewFile(filePath: string, value: unknown): Promise<void> {
  const handle = await open(filePath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
  try {
    await handle.writeFile(`${canonicalJson(value)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function removeStagedDirectory(temporary: string, parent: string, targetBaseName: string): Promise<void> {
  const resolved = await realpath(temporary).catch(() => null);
  if (!resolved) return;
  const expectedPrefix = `.${targetBaseName}.`;
  if (!samePath(path.dirname(resolved), parent) || !path.basename(resolved).startsWith(expectedPrefix) || !path.basename(resolved).endsWith(".tmp")) {
    throw new Error("pass4816_staged_cleanup_identity_mismatch");
  }
  await rm(resolved, { recursive: true, force: true });
}

export async function writePass4816BundleAtomically(args: {
  outputDirectory: string;
  receipt: CommercialCohortObservabilityReceipt;
  chain: CommercialCohortObservabilityReceipt[];
  beforeCommit?: () => void | Promise<void>;
}): Promise<void> {
  const { parent, target } = await ensureSafeParent(args.outputDirectory);
  const temporary = path.join(parent, `.${path.basename(target)}.${randomUUID()}.tmp`);
  let committed = false;
  await mkdir(temporary, { mode: 0o700 });
  try {
    await writeNewFile(path.join(temporary, PASS4816_RECEIPT_FILE), args.receipt);
    await writeNewFile(path.join(temporary, PASS4816_CHAIN_FILE), args.chain);
    if (args.beforeCommit) await args.beforeCommit();
    if (await lstat(target).catch(() => null)) throw new Error("pass4816_output_directory_race");
    await rename(temporary, target);
    committed = true;
  } finally {
    if (!committed) await removeStagedDirectory(temporary, parent, path.basename(target));
  }
}

export async function buildPass4816ObservabilityReceipt(
  rawConfig: Pass4816BuildConfig,
  options: Pass4816BuildOptions = {},
): Promise<Pass4816BuildResult> {
  const config = validateBuildConfig(rawConfig);
  const now = options.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("pass4816_build_now_invalid");
  const [deploymentReceipt, stagingReceipt, chaosReceipt, trustBundles, windows] = await Promise.all([
    readBoundJson<CommercialCohortDeploymentReceipt>(config.deploymentReceiptPath, MAX_RECEIPT_BYTES, "pass4816_deployment_receipt"),
    readBoundJson<CommercialCohortStagingE2EReceipt>(config.stagingReceiptPath, MAX_RECEIPT_BYTES, "pass4816_staging_receipt"),
    readBoundJson<CommercialCohortChaosReceipt>(config.chaosReceiptPath, MAX_RECEIPT_BYTES, "pass4816_chaos_receipt"),
    readBoundJson<CommercialCohortTrustBundle[]>(config.trustBundlesPath, MAX_RECEIPT_BYTES, "pass4816_trust_bundles"),
    Promise.all(config.windowPaths.map((windowPath, index) => readBoundJson<CommercialCohortSloWindow>(windowPath, MAX_WINDOW_BYTES, `pass4816_window_${index}`))),
  ]);
  if (!Array.isArray(trustBundles) || !trustBundles.length || trustBundles.length > 1024) throw new Error("pass4816_trust_bundle_chain_invalid");
  const previousChain = config.previousReceiptChainPath
    ? await readBoundJson<CommercialCohortObservabilityReceipt[]>(config.previousReceiptChainPath, MAX_RECEIPT_BYTES, "pass4816_previous_chain")
    : [];
  if (!Array.isArray(previousChain) || previousChain.length !== config.observabilitySequence - 1) {
    throw new Error(`pass4816_previous_chain_length_invalid:${previousChain.length}/${config.observabilitySequence - 1}`);
  }
  const previousReceipt = previousChain.at(-1) ?? null;
  const matchingTrustBundles = trustBundles.filter((item) => item.epoch === config.trustEpoch);
  const trustBundle = matchingTrustBundles.length === 1 ? matchingTrustBundles[0]! : null;
  if (!trustBundle || trustBundle.releaseSignatureThreshold < 2) throw new Error("pass4816_current_trust_bundle_invalid");
  if (new Set(trustBundle.keys.map((item) => item.keyId)).size !== trustBundle.keys.length) throw new Error("pass4816_trust_key_identity_duplicate");
  if (config.signerCommands.length < trustBundle.releaseSignatureThreshold) throw new Error("pass4816_signer_threshold_unmet");

  const preparation = prepareCommercialCohortObservabilityReceipt({
    promotionTarget: config.promotionTarget,
    audience: config.audience,
    observabilitySequence: config.observabilitySequence,
    previousReceipt,
    testedDeployment: deploymentReceipt,
    stagingReceipt,
    chaosReceipt,
    trustBundle,
    windows,
    issuedAt: new Date(config.issuedAt),
    expiresAt: new Date(config.expiresAt),
    runIdDigest: config.runIdDigest,
    nonce: config.nonce,
  });

  const signingIssuedAt = new Date(config.signingRequestIssuedAt);
  const signingExpiresAt = new Date(config.signingRequestExpiresAt);
  const detachedSignatures: CommercialCohortDetachedSignature[] = [];
  for (const signer of config.signerCommands) {
    if (signer.provider === "test-only" && !options.allowTestOnlySigner) throw new Error("pass4816_test_only_signer_forbidden");
    const trustKey = trustBundle.keys.find((item) => item.keyId === signer.keyId) ?? null;
    if (!trustKey || trustKey.purpose !== "release" || trustKey.status === "revoked") throw new Error(`pass4816_signer_not_trusted:${signer.keyId}`);
    const request = prepareCommercialCohortExternalSigningRequest({
      environment: config.promotionTarget,
      audience: config.audience,
      purpose: "observability-incident",
      keyId: signer.keyId,
      expectedPublicKeyFingerprint: trustKey.publicKeyFingerprint,
      payload: preparation.signaturePayload,
      approvalTicketDigest: signer.approvalTicketDigest,
      issuedAt: signingIssuedAt,
      expiresAt: signingExpiresAt,
      nonce: signer.requestNonce,
      requestId: signer.requestId,
    });
    const response = options.invokeSigner
      ? options.invokeSigner({ request, signer, now })
      : invokeCommercialCohortExternalSigner({ request, signer, now });
    const responseVerification = verifyCommercialCohortExternalSigningResponse({
      request,
      response,
      expectedProvider: signer.provider,
      now,
    });
    if (!responseVerification.verified || !responseVerification.keyId || !responseVerification.signature) {
      throw new Error(`pass4816_signer_response_rejected:${responseVerification.blockers.join("|")}`);
    }
    detachedSignatures.push({ keyId: responseVerification.keyId, signature: responseVerification.signature });
  }

  const receipt = finalizeCommercialCohortObservabilityReceipt({ preparation, signatures: detachedSignatures });
  const chain = [...previousChain, receipt];
  const verification = verifyCommercialCohortObservabilityReceiptChain({
    receipts: chain,
    trustBundles,
    expectedAudience: config.audience,
    expectedPromotionTarget: config.promotionTarget,
    currentDeploymentReceipt: deploymentReceipt,
    currentStagingReceipt: stagingReceipt,
    currentChaosReceipt: chaosReceipt,
    minimumObservabilitySequence: config.minimumObservabilitySequence,
    now,
  });
  assertVerified(verification);
  if (verification.observabilityReceiptDigest !== receipt.observabilityReceiptDigest) throw new Error("pass4816_current_receipt_digest_mismatch");
  await writePass4816BundleAtomically({
    outputDirectory: config.outputDirectory,
    receipt,
    chain,
    beforeCommit: options.beforeCommit,
  });
  return { receipt, chain, verification, outputDirectory: path.resolve(config.outputDirectory) };
}

export async function verifyPass4816ObservabilityReceipt(rawConfig: Pass4816VerifyConfig): Promise<CommercialCohortObservabilityVerification> {
  const config = validateVerifyConfig(rawConfig);
  const [receipts, trustBundles, deploymentReceipt, stagingReceipt, chaosReceipt] = await Promise.all([
    readBoundJson<CommercialCohortObservabilityReceipt[]>(config.receiptChainPath, MAX_RECEIPT_BYTES, "pass4816_verify_receipt_chain"),
    readBoundJson<CommercialCohortTrustBundle[]>(config.trustBundlesPath, MAX_RECEIPT_BYTES, "pass4816_verify_trust_bundles"),
    readBoundJson<CommercialCohortDeploymentReceipt>(config.deploymentReceiptPath, MAX_RECEIPT_BYTES, "pass4816_verify_deployment_receipt"),
    readBoundJson<CommercialCohortStagingE2EReceipt>(config.stagingReceiptPath, MAX_RECEIPT_BYTES, "pass4816_verify_staging_receipt"),
    readBoundJson<CommercialCohortChaosReceipt>(config.chaosReceiptPath, MAX_RECEIPT_BYTES, "pass4816_verify_chaos_receipt"),
  ]);
  if (!Array.isArray(receipts) || !receipts.length || !Array.isArray(trustBundles) || !trustBundles.length) throw new Error("pass4816_verify_chain_input_invalid");
  const verification = verifyCommercialCohortObservabilityReceiptChain({
    receipts,
    trustBundles,
    expectedAudience: config.expectedAudience,
    expectedPromotionTarget: config.expectedPromotionTarget,
    currentDeploymentReceipt: deploymentReceipt,
    currentStagingReceipt: stagingReceipt,
    currentChaosReceipt: chaosReceipt,
    minimumObservabilitySequence: config.minimumObservabilitySequence,
    now: new Date(config.verificationTime),
  });
  assertVerified(verification);
  if (verification.observabilityReceiptDigest !== config.expectedCurrentReceiptDigest) throw new Error("pass4816_verify_expected_digest_mismatch");
  return verification;
}

export function parseConfigArgument(argv: readonly string[]): string {
  if (argv.length !== 2 || argv[0] !== "--config") throw new Error("pass4816_cli_requires_exact_config_argument");
  return requiredAbsolutePath(argv[1], "pass4816_cli_config_path_invalid");
}

export function assertPass4816ExactToolchain(): void {
  if (process.versions.node !== "24.18.0") throw new Error(`pass4816_node_version_mismatch:${process.versions.node}`);
  const userAgent = process.env.npm_config_user_agent?.trim() ?? "";
  if (!/^npm\/11\.16\.0(?:\s|$)/u.test(userAgent)) throw new Error("pass4816_npm_11_16_0_invocation_required");
}
