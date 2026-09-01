import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { CommercialCohortExternalSigningResponse } from "@/lib/worldclass/commercial-cohort-external-key-custody";

import {
  buildPass4816ObservabilityReceipt,
  PASS4816_CHAIN_FILE,
  PASS4816_RECEIPT_FILE,
  readPass4816BuildConfig,
  verifyPass4816ObservabilityReceipt,
  type Pass4816BuildConfig,
  type Pass4816BuildOptions,
  type Pass4816SignerConfig,
  type Pass4816VerifyConfig,
} from "./tooling";
import {
  createFixtureWindows,
  createPass4816Fixture,
  createTestExternalSigningResponse,
  fixtureDigest,
  FIXTURE_AUDIENCE,
} from "./test-fixtures";

let assertions = 0;
function check(value: unknown, message: string): void {
  assert.ok(value, message);
  assertions += 1;
}

async function expectReject(action: () => Promise<unknown>, expected: string, message: string): Promise<void> {
  try {
    await action();
    assert.fail(message);
  } catch (error) {
    check(error instanceof Error && error.message.includes(expected), `${message}: ${error instanceof Error ? error.message : "non-error"}`);
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
}

async function removeFixtureRoot(root: string): Promise<void> {
  const [resolvedRoot, resolvedTemporary] = await Promise.all([realpath(root), realpath(tmpdir())]);
  if (path.dirname(resolvedRoot) !== resolvedTemporary || !path.basename(resolvedRoot).startsWith("velmere-pass4816-tooling-")) {
    throw new Error("pass4816_fixture_cleanup_identity_mismatch");
  }
  await rm(resolvedRoot, { recursive: true, force: true });
}

async function main(): Promise<void> {
const fixture = createPass4816Fixture();
const root = await mkdtemp(path.join(tmpdir(), "velmere-pass4816-tooling-"));

try {
  const deploymentPath = path.join(root, "deployment.json");
  const stagingPath = path.join(root, "staging.json");
  const chaosPath = path.join(root, "chaos.json");
  const trustPath = path.join(root, "trust-bundles.json");
  await Promise.all([
    writeJson(deploymentPath, fixture.deploymentReceipt),
    writeJson(stagingPath, fixture.stagingReceipt),
    writeJson(chaosPath, fixture.chaosReceipt),
    writeJson(trustPath, [fixture.trustBundle]),
  ]);

  const windows = createFixtureWindows({
    ...fixture,
    variant: "tooling-positive",
    startedAt: "2026-08-21T01:00:00.000Z",
    endedAt: "2026-08-21T07:00:00.000Z",
  });
  const windowPaths: string[] = [];
  for (const [index, window] of windows.entries()) {
    const windowPath = path.join(root, `window-${String(index + 1).padStart(2, "0")}.json`);
    await writeJson(windowPath, window);
    windowPaths.push(windowPath);
  }

  const signerCommands: Pass4816SignerConfig[] = fixture.keys.map((key, index) => ({
    keyId: key.keyId,
    provider: "test-only",
    approvalTicketDigest: fixtureDigest(`approval-ticket-${index}`),
    requestId: `request-pass4816-${index + 1}`,
    requestNonce: `request-pass4816-${index + 1}-nonce`,
    command: process.execPath,
    args: [],
    expectedExecutableSha256: fixtureDigest("test-command-not-executed"),
    expectedArgsSha256: fixtureDigest("test-args-not-executed"),
    executionProfile: { kind: "node-script", entrypointIndex: 0 },
    fileArgumentBindings: [],
  }));

  const outputDirectory = path.join(root, "positive-output");
  const buildConfig: Pass4816BuildConfig = {
    schemaVersion: "velmere.pass4816-observability-build-config.v1",
    promotionTarget: "staging",
    audience: FIXTURE_AUDIENCE,
    observabilitySequence: 1,
    minimumObservabilitySequence: 1,
    trustEpoch: 1,
    previousReceiptChainPath: null,
    deploymentReceiptPath: deploymentPath,
    stagingReceiptPath: stagingPath,
    chaosReceiptPath: chaosPath,
    trustBundlesPath: trustPath,
    windowPaths,
    issuedAt: "2026-08-21T07:30:00.000Z",
    expiresAt: "2026-08-21T13:30:00.000Z",
    runIdDigest: fixtureDigest("tooling-positive-run"),
    nonce: "observability-tooling-positive-nonce",
    signingRequestIssuedAt: "2026-08-21T07:31:00.000Z",
    signingRequestExpiresAt: "2026-08-21T07:36:00.000Z",
    signerCommands,
    outputDirectory,
  };

  const configPath = path.join(root, "build-config.json");
  await writeJson(configPath, buildConfig);
  const parsedConfig = await readPass4816BuildConfig(configPath);
  check(parsedConfig.outputDirectory === outputDirectory, "builder config is read from a bounded regular file");

  const invokeSigner = ({ request, signer }: Parameters<NonNullable<Pass4816BuildOptions["invokeSigner"]>>[0]): CommercialCohortExternalSigningResponse => {
    const key = fixture.keys.find((item) => item.keyId === signer.keyId);
    assert.ok(key, `fixture key exists for ${signer.keyId}`);
    return createTestExternalSigningResponse({
      request,
      key,
      signedAt: "2026-08-21T07:32:00.000Z",
    });
  };

  const result = await buildPass4816ObservabilityReceipt(parsedConfig, {
    now: new Date("2026-08-21T07:32:30.000Z"),
    allowTestOnlySigner: true,
    invokeSigner,
  });
  check(result.verification.verified, "builder verifies the completed chain before commit");
  check(result.receipt.signatures.length === 2, "builder requires two independently keyed signatures");
  const outputNames = (await readdir(outputDirectory)).sort();
  check(JSON.stringify(outputNames) === JSON.stringify([PASS4816_CHAIN_FILE, PASS4816_RECEIPT_FILE].sort()), "atomic bundle contains exactly receipt and chain");
  const storedReceipt = JSON.parse(await readFile(path.join(outputDirectory, PASS4816_RECEIPT_FILE), "utf8")) as { observabilityReceiptDigest: string };
  const storedChain = JSON.parse(await readFile(path.join(outputDirectory, PASS4816_CHAIN_FILE), "utf8")) as unknown[];
  check(storedReceipt.observabilityReceiptDigest === result.receipt.observabilityReceiptDigest, "stored receipt digest is exact");
  check(storedChain.length === 1, "stored chain has exact sequence length");

  const verifyConfig: Pass4816VerifyConfig = {
    schemaVersion: "velmere.pass4816-observability-verify-config.v1",
    receiptChainPath: path.join(outputDirectory, PASS4816_CHAIN_FILE),
    deploymentReceiptPath: deploymentPath,
    stagingReceiptPath: stagingPath,
    chaosReceiptPath: chaosPath,
    trustBundlesPath: trustPath,
    expectedAudience: FIXTURE_AUDIENCE,
    expectedPromotionTarget: "staging",
    minimumObservabilitySequence: 1,
    expectedCurrentReceiptDigest: result.receipt.observabilityReceiptDigest,
    verificationTime: "2026-08-21T07:33:00.000Z",
  };
  const independent = await verifyPass4816ObservabilityReceipt(verifyConfig);
  check(independent.verified && independent.blockers.length === 0, "independent verifier accepts the exact committed chain");

  await expectReject(
    () => verifyPass4816ObservabilityReceipt({ ...verifyConfig, expectedCurrentReceiptDigest: fixtureDigest("wrong-current-digest") }),
    "pass4816_verify_expected_digest_mismatch",
    "independent verifier rejects digest substitution",
  );

  const rejectedSignerOutput = path.join(root, "rejected-signer-output");
  await expectReject(
    () => buildPass4816ObservabilityReceipt({ ...buildConfig, outputDirectory: rejectedSignerOutput }, {
      now: new Date("2026-08-21T07:32:30.000Z"),
      allowTestOnlySigner: true,
      invokeSigner: (args) => {
        const response = invokeSigner(args);
        const replacement = response.signature.startsWith("A") ? "B" : "A";
        return { ...response, signature: `${replacement}${response.signature.slice(1)}` };
      },
    }),
    "pass4816_signer_response_rejected",
    "tampered detached signer response is rejected",
  );
  check(!(await readdir(root)).includes(path.basename(rejectedSignerOutput)), "rejected signer creates no output directory");

  const interruptedOutput = path.join(root, "interrupted-output");
  await expectReject(
    () => buildPass4816ObservabilityReceipt({ ...buildConfig, outputDirectory: interruptedOutput }, {
      now: new Date("2026-08-21T07:32:30.000Z"),
      allowTestOnlySigner: true,
      invokeSigner,
      beforeCommit: () => { throw new Error("controlled_before_commit_failure"); },
    }),
    "controlled_before_commit_failure",
    "controlled pre-commit failure aborts the transaction",
  );
  check(!(await readdir(root)).includes(path.basename(interruptedOutput)), "pre-commit failure exposes neither receipt nor chain");
  check(!(await readdir(root)).some((name) => name.startsWith(`.${path.basename(interruptedOutput)}.`)), "pre-commit failure removes staged directory");

  const existingOutput = path.join(root, "existing-output");
  await mkdir(existingOutput);
  await expectReject(
    () => buildPass4816ObservabilityReceipt({ ...buildConfig, outputDirectory: existingOutput }, {
      now: new Date("2026-08-21T07:32:30.000Z"),
      allowTestOnlySigner: true,
      invokeSigner,
    }),
    "pass4816_output_directory_exists",
    "builder never overwrites an existing evidence bundle",
  );
  check((await readdir(existingOutput)).length === 0, "existing output remains untouched");

  await expectReject(
    () => buildPass4816ObservabilityReceipt({ ...buildConfig, outputDirectory: path.join(root, "test-provider-forbidden") }, {
      now: new Date("2026-08-21T07:32:30.000Z"),
      invokeSigner,
    }),
    "pass4816_test_only_signer_forbidden",
    "CLI-equivalent builder rejects test-only signers",
  );

  process.stdout.write(`${JSON.stringify({
    status: "PASS",
    liveCredit: false,
    evidenceClass: "SYNTHETIC_TEST_ONLY",
    assertions,
    detachedSignerTamper: true,
    independentVerification: true,
    atomicOutput: true,
    overwriteProtection: true,
  })}\n`);
} finally {
  await removeFixtureRoot(root);
}
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : "pass4816_tooling_test_failed"}\n`);
  process.exitCode = 1;
});
