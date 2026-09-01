import { createHash, generateKeyPairSync, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const PROJECT_ROOT_REAL = fs.realpathSync(PROJECT_ROOT);
const WINDOWS_LOCAL_SYSTEM_SID = "S-1-5-18";
const WINDOWS_NATIVE_TOOL_TIMEOUT_MS = 10_000;

function refuse(error) {
  console.error(JSON.stringify({ status: "refused", error }));
  process.exitCode = 1;
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function windowsSystemDirectory() {
  const systemRoot = process.env.SystemRoot;
  const windowsDirectory = process.env.windir;
  if (!systemRoot || !windowsDirectory || !path.isAbsolute(systemRoot) || !path.isAbsolute(windowsDirectory)) return null;

  try {
    const rootReal = fs.realpathSync(systemRoot);
    const windowsReal = fs.realpathSync(windowsDirectory);
    if (path.relative(rootReal, windowsReal) !== "" || path.relative(windowsReal, rootReal) !== "") return null;
    const systemDirectory = fs.realpathSync(path.join(rootReal, "System32"));
    if (!fs.statSync(systemDirectory).isDirectory() || !isInside(rootReal, systemDirectory)) return null;
    return systemDirectory;
  } catch {
    return null;
  }
}

function windowsNativeTool(name) {
  const systemDirectory = windowsSystemDirectory();
  if (!systemDirectory) return null;
  const candidate = path.join(systemDirectory, name);
  try {
    const metadata = fs.lstatSync(candidate);
    if (!metadata.isFile() || metadata.isSymbolicLink()) return null;
    const real = fs.realpathSync(candidate);
    return isInside(systemDirectory, real) ? real : null;
  } catch {
    return null;
  }
}

function runWindowsNativeTool(executable, args) {
  const result = spawnSync(executable, args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: WINDOWS_NATIVE_TOOL_TIMEOUT_MS,
    maxBuffer: 16 * 1024,
  });
  return result.error === undefined && result.signal === null && result.status === 0
    ? result
    : null;
}

function secureWindowsSecretAcl(outputPath) {
  const whoami = windowsNativeTool("whoami.exe");
  const icacls = windowsNativeTool("icacls.exe");
  if (!whoami || !icacls) return false;

  const identity = runWindowsNativeTool(whoami, ["/user", "/fo", "csv", "/nh"]);
  const currentSid = identity?.stdout.match(/\bS-\d-\d+(?:-\d+)+\b/u)?.[0] ?? null;
  if (!currentSid) return false;

  const allowedSids = [...new Set([currentSid, WINDOWS_LOCAL_SYSTEM_SID])];
  const acl = runWindowsNativeTool(icacls, [
    outputPath,
    "/inheritance:r",
    "/grant:r",
    ...allowedSids.map((sid) => `*${sid}:(F)`),
  ]);
  return acl !== null;
}

function parseOutputPath(args) {
  if (args.length !== 2 || args[0] !== "--output" || !args[1]) return null;
  if (!path.isAbsolute(args[1])) return null;
  return path.resolve(args[1]);
}

function validateOutputPath(outputPath) {
  if (isInside(PROJECT_ROOT, outputPath) || isInside(PROJECT_ROOT_REAL, outputPath)) {
    return { ok: false, error: "output_must_be_outside_project" };
  }

  const parent = path.dirname(outputPath);
  let parentReal;
  try {
    if (!fs.statSync(parent).isDirectory()) return { ok: false, error: "output_parent_unavailable" };
    parentReal = fs.realpathSync(parent);
  } catch {
    return { ok: false, error: "output_parent_unavailable" };
  }

  const actualOutputPath = path.join(parentReal, path.basename(outputPath));
  if (isInside(PROJECT_ROOT_REAL, actualOutputPath)) {
    return { ok: false, error: "output_must_be_outside_project" };
  }
  try {
    fs.lstatSync(actualOutputPath);
    return { ok: false, error: "output_already_exists" };
  } catch (error) {
    if (error?.code !== "ENOENT") return { ok: false, error: "output_parent_unavailable" };
  }

  return { ok: true, outputPath: actualOutputPath };
}

function writeSecretFile(outputPath, content) {
  const flags = fs.constants.O_WRONLY
    | fs.constants.O_CREAT
    | fs.constants.O_EXCL
    | (fs.constants.O_NOFOLLOW ?? 0);
  let descriptor;
  let created = false;

  try {
    descriptor = fs.openSync(outputPath, flags, 0o600);
    created = true;
    const openedReal = fs.realpathSync(outputPath);
    if (isInside(PROJECT_ROOT_REAL, openedReal)) throw new Error("output_must_be_outside_project");
    if (process.platform === "win32") {
      if (!secureWindowsSecretAcl(outputPath)) throw new Error("windows_secret_acl_unavailable");
    } else {
      fs.fchmodSync(descriptor, 0o600);
    }
    fs.writeFileSync(descriptor, content, "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    if (process.platform !== "win32") fs.chmodSync(outputPath, 0o600);
    return true;
  } catch {
    if (descriptor !== undefined) {
      try {
        fs.closeSync(descriptor);
      } catch {
        // The fixed error below intentionally excludes filesystem details.
      }
    }
    if (created) {
      try {
        fs.unlinkSync(outputPath);
      } catch {
        // A partially written file remains protected by mode 0600 if removal fails.
      }
    }
    return false;
  }
}

const outputPath = parseOutputPath(process.argv.slice(2));
if (!outputPath) {
  refuse("absolute_output_path_required");
} else {
  let validation;
  try {
    validation = validateOutputPath(outputPath);
  } catch {
    validation = { ok: false, error: "output_validation_failed" };
  }

  if (!validation.ok) {
    refuse(validation.error);
  } else {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
    const publicDer = publicKey.export({ type: "spki", format: "der" });
    const fingerprint = createHash("sha256").update(publicDer).digest("hex");
    const keyId = `vlmed_${new Date().toISOString().slice(0, 10).replaceAll("-", "")}_${randomBytes(4).toString("hex")}`;
    const secretFile = `${JSON.stringify({
      keyId,
      algorithm: "Ed25519",
      publicKeyFingerprint: fingerprint,
      environment: {
        VELMERE_VLM_RECEIPT_ACTIVE_KEY_ID: keyId,
        VELMERE_VLM_RECEIPT_ED25519_PRIVATE_KEY_B64: Buffer.from(privatePem).toString("base64"),
        VELMERE_VLM_RECEIPT_ED25519_PUBLIC_KEY_B64: Buffer.from(publicPem).toString("base64"),
      },
      warning: "Store this file only in an approved secret manager, then delete the local copy.",
    }, null, 2)}\n`;

    if (!writeSecretFile(validation.outputPath, secretFile)) {
      refuse("secret_file_write_failed");
    } else {
      console.log(JSON.stringify({
        status: "written",
        keyId,
        algorithm: "Ed25519",
        publicKeyFingerprint: fingerprint,
      }));
    }
  }
}
