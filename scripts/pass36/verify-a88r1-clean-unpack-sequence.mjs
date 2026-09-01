#!/usr/bin/env node
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "verify-a88r1-clean-unpack-sequence.py");
const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;
const BRIDGE_TIMEOUT_MS = 35 * 60 * 1000;

function terminate(child) {
  if (!child.pid) return;
  try {
    if (process.platform !== "win32") process.kill(-child.pid, "SIGKILL");
    else child.kill("SIGKILL");
  } catch {
    try { child.kill("SIGKILL"); } catch { /* already exited */ }
  }
}

function runBounded(command, args, timeoutMs) {
  return new Promise((resolve) => {
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let overflow = null;
    let settled = false;
    const child = spawn(command, args, {
      cwd: root,
      shell: false,
      windowsHide: true,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdout?.removeAllListeners();
      child.stderr?.removeAllListeners();
      child.removeAllListeners();
      resolve(result);
    };
    const writeBounded = (target, chunk) => {
      const bytes = Buffer.byteLength(chunk);
      if (target === "stdout") stdoutBytes += bytes; else stderrBytes += bytes;
      if (stdoutBytes > MAX_OUTPUT_BYTES || stderrBytes > MAX_OUTPUT_BYTES) {
        overflow = target;
        terminate(child);
        return;
      }
      (target === "stdout" ? process.stdout : process.stderr).write(chunk);
    };
    child.stdout?.on("data", (chunk) => writeBounded("stdout", chunk));
    child.stderr?.on("data", (chunk) => writeBounded("stderr", chunk));
    child.once("error", (error) => finish({ code: null, signal: null, error, stdoutBytes, stderrBytes, overflow }));
    child.once("close", (code, signal) => finish({ code, signal, error: null, stdoutBytes, stderrBytes, overflow }));
    const timer = setTimeout(() => {
      terminate(child);
      finish({ code: null, signal: "TIMEOUT", error: new Error("clean_unpack_bridge_timeout"), stdoutBytes, stderrBytes, overflow });
    }, timeoutMs);
    timer.unref?.();
  });
}

async function main() {
  if (process.argv.includes("--bridge-smoke")) {
    const result = await runBounded(process.execPath, ["-e", "process.stdout.write(JSON.stringify({status:'PASS_A88R1_ASYNC_BRIDGE_SMOKE'}));"], 10_000);
    const ok = result.code === 0 && !result.error && !result.overflow;
    console.log(`\n${JSON.stringify({ status: ok ? "PASS_A88R1_ASYNC_BRIDGE_PROCESS_EXIT" : "FAIL_A88R1_ASYNC_BRIDGE_PROCESS_EXIT", ...result, error: result.error?.message ?? null }, null, 2)}`);
    return ok ? 0 : 1;
  }

  const candidates = [process.env.PYTHON, process.platform === "win32" ? "py" : "python3", "python"].filter(Boolean);
  let lastError = null;
  for (const candidate of candidates) {
    const args = candidate === "py" ? ["-3", scriptPath] : [scriptPath];
    const result = await runBounded(candidate, args, BRIDGE_TIMEOUT_MS);
    if (result.error?.code === "ENOENT") { lastError = result.error; continue; }
    if (result.error || result.overflow || result.signal || result.code !== 0) {
      console.error(JSON.stringify({
        status: "FAIL_A88R1_CLEAN_UNPACK_PYTHON_BRIDGE",
        command: candidate,
        code: result.code,
        signal: result.signal,
        overflow: result.overflow,
        stdoutBytes: result.stdoutBytes,
        stderrBytes: result.stderrBytes,
        error: result.error?.message ?? null,
      }, null, 2));
      return 1;
    }
    return 0;
  }
  console.error(JSON.stringify({ status: "FAIL_A88R1_CLEAN_UNPACK_PYTHON_BRIDGE", error: lastError?.message ?? "python_runtime_not_found" }, null, 2));
  return 1;
}

const exitCode = await main();
// Explicit bounded termination prevents inherited handles from keeping CI or operator shells alive.
process.exit(exitCode);
