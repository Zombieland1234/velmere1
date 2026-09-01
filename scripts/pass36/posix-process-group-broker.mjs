#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const BROKER_ID = "velmere.pass36.posix-process-group-broker.v1";
const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/u;
const MAX_PLAN_BYTES = 512 * 1024;
const MAX_ARGS = 64;
const MAX_ARG_BYTES = 4096;
const MAX_ENV_VALUE_BYTES = 16_384;
const TERMINATION_GRACE_MS = 250;

function fail(code, exitCode = 125) {
  try {
    process.stderr.write(`${code}\n`);
  } catch { /* stderr may be unavailable during fatal shutdown. */ }
  process.exit(exitCode);
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function exactKeys(value, expected) {
  return value && typeof value === "object" && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function within(root, candidate) {
  const prefix = `${root}${path.sep}`;
  return candidate === root || candidate.startsWith(prefix);
}

function readRegularFile(filePath, maxBytes, code) {
  if (!path.isAbsolute(filePath)) fail(`${code}_path_not_absolute`);
  let descriptor = null;
  try {
    const entry = lstatSync(filePath);
    if (entry.isSymbolicLink() || !entry.isFile()) fail(`${code}_not_regular_file`);
    const resolved = realpathSync(filePath);
    if (resolved !== path.resolve(filePath)) fail(`${code}_realpath_mismatch`);
    descriptor = openSync(resolved, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = fstatSync(descriptor);
    if (before.size <= 0 || before.size > maxBytes) fail(`${code}_size_invalid`);
    if ((before.mode & 0o022) !== 0) fail(`${code}_writable_by_group_or_world`);
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor);
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
        || before.mode !== after.mode || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs
        || bytes.length !== before.size) {
      fail(`${code}_changed_during_read`);
    }
    return { path: resolved, bytes, metadata: before, sha256: sha256(bytes) };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) fail(`${code}_unavailable`);
    throw error;
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
}

function verifyPlanFile(row, root, index) {
  if (!exactKeys(row, ["path", "sha256", "executable"])) fail(`broker_plan_file_${index}_schema_invalid`);
  const filePath = typeof row.path === "string" ? path.resolve(row.path) : "";
  if (!filePath || !within(root, filePath)) fail(`broker_plan_file_${index}_outside_root`);
  if (typeof row.sha256 !== "string" || !SHA256.test(row.sha256)) fail(`broker_plan_file_${index}_digest_invalid`);
  if (typeof row.executable !== "boolean") fail(`broker_plan_file_${index}_mode_invalid`);
  const file = readRegularFile(filePath, 256 * 1024 * 1024, `broker_plan_file_${index}`);
  if (file.sha256 !== row.sha256) fail(`broker_plan_file_${index}_digest_mismatch`);
  const isExecutable = (file.metadata.mode & 0o111) !== 0;
  if (isExecutable !== row.executable) fail(`broker_plan_file_${index}_executable_mismatch`);
  return file;
}

function validateEnvironment(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("broker_environment_invalid");
  const output = {};
  for (const [name, rawValue] of Object.entries(value)) {
    if (!ENV_NAME.test(name) || typeof rawValue !== "string" || rawValue.includes("\0")
        || Buffer.byteLength(rawValue, "utf8") > MAX_ENV_VALUE_BYTES) {
      fail("broker_environment_invalid");
    }
    output[name] = rawValue;
  }
  return output;
}

function processGroupExists(pgid) {
  // On Linux, a killed descendant can briefly remain as a zombie. Zombies are
  // already dead and cannot execute any further code, so they do not count as
  // live orphan processes for containment purposes.
  try {
    const entries = readdirSync("/proc", { withFileTypes: true });
    let observedMember = false;
    for (const entry of entries) {
      if (!entry.isDirectory() || !/^\d+$/u.test(entry.name)) continue;
      try {
        const stat = readFileSync(`/proc/${entry.name}/stat`, "utf8");
        const close = stat.lastIndexOf(")");
        if (close < 0) continue;
        const fields = stat.slice(close + 2).trim().split(/\s+/u);
        const state = fields[0];
        const processGroup = Number(fields[2]);
        if (processGroup !== pgid) continue;
        observedMember = true;
        if (state !== "Z" && state !== "X") return true;
      } catch { /* A /proc entry can disappear while it is inspected. */ }
    }
    if (observedMember) return false;
  } catch { /* /proc may be unavailable; fall back to signal probing. */ }
  try {
    process.kill(-pgid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    return true;
  }
}

function signalGroup(pgid, signal) {
  try {
    process.kill(-pgid, signal);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    return false;
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function terminateGroup(pgid) {
  signalGroup(pgid, "SIGTERM");
  const deadline = Date.now() + TERMINATION_GRACE_MS;
  while (Date.now() < deadline) {
    if (!processGroupExists(pgid)) return true;
    await delay(20);
  }
  signalGroup(pgid, "SIGKILL");
  const killDeadline = Date.now() + TERMINATION_GRACE_MS;
  while (Date.now() < killDeadline) {
    if (!processGroupExists(pgid)) return true;
    await delay(20);
  }
  return !processGroupExists(pgid);
}

function writeResult(resultPath, root, value) {
  const resolved = path.resolve(resultPath);
  if (!within(root, resolved)) fail("broker_result_outside_root");
  const temporary = `${resolved}.tmp`;
  const bytes = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
  let descriptor = null;
  try {
    descriptor = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
  renameSync(temporary, resolved);
}

async function main() {
  if (process.platform === "win32") fail("broker_posix_only");
  if (process.argv.length !== 3) fail("broker_arguments_invalid");
  const planFile = readRegularFile(process.argv[2], MAX_PLAN_BYTES, "broker_plan");
  let plan;
  try {
    plan = JSON.parse(planFile.bytes.toString("utf8"));
  } catch {
    fail("broker_plan_json_invalid");
  }
  const expectedKeys = [
    "schemaVersion", "brokerId", "root", "command", "args", "cwd", "environment",
    "timeoutMs", "maxInputBytes", "maxOutputBytes", "resultPath", "pidPath", "files",
  ];
  if (!exactKeys(plan, expectedKeys)
      || plan.schemaVersion !== "velmere.pass36.posix-process-group-plan.v1"
      || plan.brokerId !== BROKER_ID) {
    fail("broker_plan_schema_invalid");
  }
  const root = realpathSync(String(plan.root ?? ""));
  if (!path.isAbsolute(root) || !path.basename(root).startsWith("velmere-external-command-")) fail("broker_root_invalid");
  const command = path.resolve(String(plan.command ?? ""));
  const cwd = path.resolve(String(plan.cwd ?? ""));
  const resultPath = path.resolve(String(plan.resultPath ?? ""));
  const pidPath = path.resolve(String(plan.pidPath ?? ""));
  if (!within(root, command) || !within(root, cwd) || !within(root, resultPath) || !within(root, pidPath)) fail("broker_path_outside_root");
  const workEntry = lstatSync(cwd);
  if (!workEntry.isDirectory() || workEntry.isSymbolicLink() || (workEntry.mode & 0o077) !== 0) fail("broker_cwd_invalid");
  if (!Array.isArray(plan.args) || plan.args.length > MAX_ARGS
      || plan.args.some((entry) => typeof entry !== "string" || entry.includes("\0") || /[\r\n]/u.test(entry)
        || Buffer.byteLength(entry, "utf8") > MAX_ARG_BYTES)) {
    fail("broker_args_invalid");
  }
  const timeoutMs = Number(plan.timeoutMs);
  const maxInputBytes = Number(plan.maxInputBytes);
  const maxOutputBytes = Number(plan.maxOutputBytes);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000
      || !Number.isInteger(maxInputBytes) || maxInputBytes < 1_024 || maxInputBytes > 8 * 1024 * 1024
      || !Number.isInteger(maxOutputBytes) || maxOutputBytes < 1_024 || maxOutputBytes > 4 * 1024 * 1024) {
    fail("broker_budget_invalid");
  }
  if (!Array.isArray(plan.files) || plan.files.length < 1 || plan.files.length > MAX_ARGS + 4) fail("broker_files_invalid");
  const verifiedFiles = plan.files.map((row, index) => verifyPlanFile(row, root, index));
  const commandRowIndex = plan.files.findIndex((row) => path.resolve(row.path) === command);
  if (commandRowIndex < 0 || !plan.files[commandRowIndex].executable) fail("broker_command_unbound");
  for (const argument of plan.args) {
    if (path.isAbsolute(argument) && !plan.files.some((row) => path.resolve(row.path) === path.resolve(argument))) {
      fail("broker_absolute_argument_unbound");
    }
  }
  // Recheck all source-bound image files immediately before spawning.
  for (let index = 0; index < verifiedFiles.length; index += 1) verifyPlanFile(plan.files[index], root, index);

  const chunks = [];
  let inputBytes = 0;
  for await (const chunk of process.stdin) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    inputBytes += bytes.length;
    if (inputBytes > maxInputBytes) fail("broker_input_limit_exceeded");
    chunks.push(bytes);
  }
  const input = Buffer.concat(chunks);
  const environment = validateEnvironment(plan.environment);

  let child;
  try {
    child = spawn(command, plan.args, {
      cwd,
      env: environment,
      shell: false,
      windowsHide: true,
      detached: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    writeResult(resultPath, root, {
      schemaVersion: "velmere.pass36.posix-process-group-result.v1",
      brokerId: BROKER_ID,
      reason: "SPAWN_FAILED",
      status: null,
      signal: null,
      stdoutBytes: 0,
      stderrBytes: 0,
      processGroupClean: true,
    });
    fail("broker_spawn_failed");
  }

  writeResult(pidPath, root, { schemaVersion: "velmere.pass36.posix-process-group-pid.v1", brokerId: BROKER_ID, pid: child.pid });

  const stdout = [];
  const stderr = [];
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let containmentReason = null;
  let settled = false;

  const collect = (bucket, kind) => (chunk) => {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    if (kind === "stdout") stdoutBytes += bytes.length;
    else stderrBytes += bytes.length;
    if (stdoutBytes > maxOutputBytes || stderrBytes > maxOutputBytes) {
      containmentReason = "OUTPUT_LIMIT_EXCEEDED";
      if (Number.isInteger(child.pid) && child.pid > 1) void terminateGroup(child.pid);
      return;
    }
    bucket.push(bytes);
  };
  child.stdout.on("data", collect(stdout, "stdout"));
  child.stderr.on("data", collect(stderr, "stderr"));
  child.stdin.on("error", () => {
    // A fast command (for example `--version`) can close stdin before the
    // broker sends an intentionally empty payload. That zero-byte EPIPE is not
    // evidence loss. Any non-empty payload still fails closed.
    if (input.length === 0) return;
    containmentReason = containmentReason ?? "STDIN_FAILED";
    if (Number.isInteger(child.pid) && child.pid > 1) void terminateGroup(child.pid);
  });
  child.on("error", () => {
    containmentReason = containmentReason ?? "SPAWN_FAILED";
  });

  const timeout = setTimeout(() => {
    containmentReason = "TIMEOUT";
    if (Number.isInteger(child.pid) && child.pid > 1) void terminateGroup(child.pid);
  }, timeoutMs);
  timeout.unref();

  const closeResult = await new Promise((resolve) => {
    child.once("close", (status, signal) => {
      if (settled) return;
      settled = true;
      resolve({ status, signal });
    });
    try {
      child.stdin.end(input);
    } catch {
      if (input.length > 0) {
        containmentReason = containmentReason ?? "STDIN_FAILED";
        if (Number.isInteger(child.pid) && child.pid > 1) void terminateGroup(child.pid);
      }
    }
  });
  clearTimeout(timeout);

  await delay(25);
  let processGroupClean = !processGroupExists(child.pid);
  if (!processGroupClean) {
    containmentReason = containmentReason ?? "ORPHAN_DESCENDANT";
    processGroupClean = await terminateGroup(child.pid);
  }
  if (!processGroupClean) containmentReason = "PROCESS_GROUP_NOT_CLEAN";

  const reason = containmentReason ?? "COMPLETED";
  const status = Number.isInteger(closeResult.status) ? closeResult.status : null;
  const signal = typeof closeResult.signal === "string" ? closeResult.signal : null;
  writeResult(resultPath, root, {
    schemaVersion: "velmere.pass36.posix-process-group-result.v1",
    brokerId: BROKER_ID,
    reason,
    status,
    signal,
    stdoutBytes,
    stderrBytes,
    processGroupClean,
  });

  if (reason === "COMPLETED") {
    process.stdout.write(Buffer.concat(stdout));
    process.stderr.write(Buffer.concat(stderr));
    process.exit(status === null ? 125 : Math.max(0, Math.min(status, 125)));
  }
  // Containment failures never replay child output.
  process.stderr.write(`broker_${reason.toLowerCase()}\n`);
  process.exit(reason === "TIMEOUT" ? 124 : 125);
}

main().catch(() => fail("broker_internal_failure"));
