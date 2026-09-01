import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [pidRaw, deadlineRaw, receiptPathRaw, graceRaw = "30000"] = process.argv.slice(2);
const targetPid = Number(pidRaw);
const deadlineMs = Number(deadlineRaw);
const graceMs = Number(graceRaw);
const receiptPath = path.resolve(receiptPathRaw || "artifacts/pass4693/build-watchdog.json");

if (!Number.isInteger(targetPid) || targetPid <= 1) throw new Error("valid target pid required");
if (!Number.isFinite(deadlineMs) || deadlineMs < 100) throw new Error("valid deadline required");
if (!Number.isFinite(graceMs) || graceMs < 0) throw new Error("valid grace required");

function alive() {
  try {
    process.kill(targetPid, 0);
    return true;
  } catch {
    return false;
  }
}

function terminate(signal) {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(targetPid), "/T", signal === "SIGKILL" ? "/F" : ""].filter(Boolean), {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  try {
    process.kill(-targetPid, signal);
  } catch {
    try { process.kill(targetPid, signal); } catch (ignoredError) { void ignoredError; }
  }
}

function writeReceipt(payload) {
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  const temp = `${receiptPath}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temp, receiptPath);
}

const startedAt = Date.now();
await new Promise((resolve) => setTimeout(resolve, deadlineMs));
const wasAlive = alive();
let forced = false;
if (wasAlive) {
  terminate("SIGTERM");
  if (graceMs > 0) await new Promise((resolve) => setTimeout(resolve, graceMs));
  if (alive()) {
    forced = true;
    terminate("SIGKILL");
  }
}
writeReceipt({
  schemaVersion: "velmere.pass4693.build-watchdog.v1",
  targetPid,
  deadlineMs,
  graceMs,
  fired: wasAlive,
  forced,
  elapsedMs: Date.now() - startedAt,
  generatedAt: new Date().toISOString(),
});
