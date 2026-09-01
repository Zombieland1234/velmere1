import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const projectRoot = process.cwd();
const printfulScripts = [
  "scripts/printful-debug-token.mjs",
  "scripts/printful-smoke-test.mjs",
  "scripts/printful-find-store-id.mjs",
];
const generatorPath = path.join(projectRoot, "scripts/generate-vlm-receipt-ed25519-keys.mjs");
const allowedPrintfulFields = ["correlationHash", "count", "error", "status"];
const fixtureToken = "fixture-token-that-must-not-be-logged";
const WINDOWS_LOCAL_SYSTEM_SID = "S-1-5-18";
const WINDOWS_FULL_CONTROL = 2_032_127;
const WINDOWS_SYMLINK_PRIVILEGE_ERRORS = new Set(["EACCES", "EPERM", "UNKNOWN"]);
const sensitiveMarkers = [
  fixtureToken,
  "RAW_RESPONSE_MARKER",
  "ITEM_NAME_MARKER",
  "EMAIL_MARKER",
  "ADDRESS_MARKER",
  "STORE_ID_MARKER",
];

function inspectWindowsAcl(filePath) {
  const powershell = path.join(
    process.env.SystemRoot ?? "",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
  const command = `
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$sidType = [System.Security.Principal.SecurityIdentifier]
$acl = [System.IO.File]::GetAccessControl($env:VELMERE_TEST_ACL_PATH)
$rules = @($acl.GetAccessRules($true, $true, $sidType) | ForEach-Object {
  [pscustomobject]@{
    sid = $_.IdentityReference.Value
    rights = [int64]$_.FileSystemRights
    type = $_.AccessControlType.ToString()
    inherited = $_.IsInherited
  }
})
[pscustomobject]@{
  protected = $acl.AreAccessRulesProtected
  ownerSid = $acl.GetOwner($sidType).Value
  currentSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  rules = $rules
} | ConvertTo-Json -Compress -Depth 4
`;
  const encoded = Buffer.from(command, "utf16le").toString("base64");
  const result = spawnSync(powershell, ["-NoLogo", "-NoProfile", "-NonInteractive", "-OutputFormat", "Text", "-EncodedCommand", encoded], {
    encoding: "utf8",
    env: { ...process.env, VELMERE_TEST_ACL_PATH: filePath },
    timeout: 30_000,
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  return JSON.parse(result.stdout.trim());
}

function assertPrivateSecretFilePermissions(filePath) {
  if (process.platform !== "win32") {
    assert.equal(fs.statSync(filePath).mode & 0o777, 0o600);
    return;
  }

  const acl = inspectWindowsAcl(filePath);
  const allowedSids = [...new Set([acl.currentSid, WINDOWS_LOCAL_SYSTEM_SID])].sort();
  assert.equal(acl.protected, true);
  assert.equal(acl.ownerSid, acl.currentSid);
  assert.deepEqual(acl.rules.map((rule) => rule.sid).sort(), allowedSids);
  for (const rule of acl.rules) {
    assert.equal(rule.type, "Allow");
    assert.equal(rule.inherited, false);
    assert.equal(rule.rights, WINDOWS_FULL_CONTROL);
  }
}

function createProjectDirectoryLink(linkPath) {
  try {
    fs.symlinkSync(projectRoot, linkPath, "dir");
    return "directory-symlink";
  } catch (error) {
    if (process.platform !== "win32" || !WINDOWS_SYMLINK_PRIVILEGE_ERRORS.has(error?.code)) throw error;
  }
  fs.symlinkSync(projectRoot, linkPath, "junction");
  return "directory-junction";
}

function removeDirectoryLinkOnly(linkPath) {
  try {
    fs.unlinkSync(linkPath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function runPrintfulHelper(script, ok) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-printful-output-test-"));
  try {
    fs.writeFileSync(path.join(temporary, ".env.local"), `PRINTFUL_API_TOKEN=${fixtureToken}\n`, { mode: 0o600 });
    const body = JSON.stringify({
      data: [
        {
          id: "STORE_ID_MARKER",
          name: "ITEM_NAME_MARKER",
          email: "EMAIL_MARKER",
          address: "ADDRESS_MARKER",
        },
        { id: "RAW_RESPONSE_MARKER" },
      ],
    });
    const runner = `
      globalThis.fetch = async () => ({
        ok: ${JSON.stringify(ok)},
        status: ${ok ? 200 : 403},
        text: async () => ${JSON.stringify(body)},
      });
      await import(${JSON.stringify(pathToFileURL(path.join(projectRoot, script)).href)});
    `;
    return spawnSync(process.execPath, ["--input-type=module", "--eval", runner], {
      cwd: temporary,
      encoding: "utf8",
      env: { ...process.env, PRINTFUL_API_TOKEN: fixtureToken },
      timeout: 30_000,
    });
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

function assertSafePrintfulOutput(result, expectedStatus, expectedCount, expectedError) {
  assert.equal(result.status, expectedError === null ? 0 : 1, result.stderr);
  assert.equal(result.stderr, "");
  const records = result.stdout.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  assert.ok(records.length > 0);

  for (const record of records) {
    assert.deepEqual(Object.keys(record).sort(), allowedPrintfulFields);
    assert.equal(record.status, expectedStatus);
    assert.equal(record.count, expectedCount);
    assert.equal(record.error, expectedError);
    assert.match(record.correlationHash, /^[a-f0-9]{64}$/);
  }

  const combinedOutput = `${result.stdout}\n${result.stderr}`;
  for (const marker of sensitiveMarkers) assert.equal(combinedOutput.includes(marker), false);
}

test("Printful helpers emit only bounded diagnostics for successful responses", () => {
  for (const script of printfulScripts) {
    assertSafePrintfulOutput(runPrintfulHelper(script, true), 200, 2, null);
  }
});

test("Printful helpers redact HTTP error bodies", () => {
  for (const script of printfulScripts) {
    assertSafePrintfulOutput(runPrintfulHelper(script, false), 403, 0, "http_error");
  }
});

test("key generator refuses missing, relative, and in-project output paths", () => {
  const noOutput = spawnSync(process.execPath, [generatorPath], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  assert.equal(noOutput.status, 1);
  assert.equal(noOutput.stdout, "");
  assert.deepEqual(JSON.parse(noOutput.stderr), {
    status: "refused",
    error: "absolute_output_path_required",
  });

  const relativeOutput = spawnSync(process.execPath, [generatorPath, "--output", "secret.json"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  assert.equal(relativeOutput.status, 1);
  assert.equal(relativeOutput.stdout, "");
  assert.equal(JSON.parse(relativeOutput.stderr).error, "absolute_output_path_required");

  const inProjectOutput = path.join(projectRoot, `.keygen-refusal-${randomUUID()}.json`);
  const inProject = spawnSync(process.execPath, [generatorPath, "--output", inProjectOutput], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  assert.equal(inProject.status, 1);
  assert.equal(inProject.stdout, "");
  assert.equal(JSON.parse(inProject.stderr).error, "output_must_be_outside_project");
  assert.equal(fs.existsSync(inProjectOutput), false);
});

test("key generator writes one new outside-repository file with platform-native private access and no private stdout", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-keygen-output-test-"));
  try {
    const outputPath = path.join(temporary, "receipt-key.json");
    const result = spawnSync(process.execPath, [generatorPath, "--output", outputPath], {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: 30_000,
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    assertPrivateSecretFilePermissions(outputPath);

    const publicOutput = JSON.parse(result.stdout);
    assert.deepEqual(Object.keys(publicOutput).sort(), [
      "algorithm",
      "keyId",
      "publicKeyFingerprint",
      "status",
    ]);
    assert.equal(publicOutput.status, "written");
    assert.match(publicOutput.publicKeyFingerprint, /^[a-f0-9]{64}$/);

    const secretFile = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    const privateValue = secretFile.environment.VELMERE_VLM_RECEIPT_ED25519_PRIVATE_KEY_B64;
    assert.ok(privateValue.length > 0);
    assert.equal(`${result.stdout}\n${result.stderr}`.includes(privateValue), false);

    const existing = spawnSync(process.execPath, [generatorPath, "--output", outputPath], {
      cwd: projectRoot,
      encoding: "utf8",
    });
    assert.equal(existing.status, 1);
    assert.equal(existing.stdout, "");
    assert.equal(JSON.parse(existing.stderr).error, "output_already_exists");
    assert.equal(JSON.parse(fs.readFileSync(outputPath, "utf8")).keyId, secretFile.keyId);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test("key generator fails closed before secret write when Windows ACL enforcement is unavailable", {
  skip: process.platform !== "win32",
}, () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-keygen-acl-failure-test-"));
  try {
    const fakeWindowsRoot = path.join(temporary, "fake-windows");
    fs.mkdirSync(path.join(fakeWindowsRoot, "System32"), { recursive: true });
    const outputPath = path.join(temporary, "receipt-key.json");
    const result = spawnSync(process.execPath, [generatorPath, "--output", outputPath], {
      cwd: projectRoot,
      encoding: "utf8",
      env: { ...process.env, windir: fakeWindowsRoot },
      timeout: 30_000,
    });

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(JSON.parse(result.stderr).error, "secret_file_write_failed");
    assert.equal(fs.existsSync(outputPath), false);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test("key generator rejects an outside path whose parent symlink resolves into the project", (context) => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-keygen-symlink-test-"));
  const linkedProject = path.join(temporary, "linked-project");
  context.after(() => {
    removeDirectoryLinkOnly(linkedProject);
    fs.rmSync(temporary, { recursive: true, force: true });
  });

  const linkKind = createProjectDirectoryLink(linkedProject);
  assert.ok(linkKind === "directory-symlink" || linkKind === "directory-junction");
  assert.equal(fs.lstatSync(linkedProject).isSymbolicLink(), true);
  assert.equal(path.relative(fs.realpathSync(projectRoot), fs.realpathSync(linkedProject)), "");
  const outputPath = path.join(linkedProject, `.keygen-refusal-${randomUUID()}.json`);
  const result = spawnSync(process.execPath, [generatorPath, "--output", outputPath], {
    cwd: projectRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(JSON.parse(result.stderr).error, "output_must_be_outside_project");
  assert.equal(fs.existsSync(outputPath), false);
});
