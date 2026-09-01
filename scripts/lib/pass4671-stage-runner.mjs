import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { currentNpmVersion } from './velmere-runtime-contract.mjs';

export class StageFailure extends Error {
  constructor(receipt) {
    super(`Stage ${receipt.stage} failed: exit=${receipt.exitCode ?? 'null'} signal=${receipt.signal ?? 'none'} timeout=${receipt.timedOut}`);
    this.name = 'StageFailure';
    this.receipt = receipt;
  }
}

export function sha256File(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

export function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, file);
}

function safeName(value) {
  return String(value).replace(/[^a-zA-Z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '') || 'stage';
}

function cwdIdentity(cwd) {
  return crypto.createHash('sha256').update(path.resolve(cwd)).digest('hex');
}

function mirrorReceipt(receipt, logFile, destinations) {
  for (const directory of destinations.filter(Boolean)) {
    fs.mkdirSync(directory, { recursive: true });
    writeJsonAtomic(path.join(directory, `${safeName(receipt.stage)}.receipt.json`), receipt);
    if (fs.existsSync(logFile)) fs.copyFileSync(logFile, path.join(directory, `${safeName(receipt.stage)}.log`));
  }
}

export async function runStage({
  stage,
  command,
  args = [],
  cwd = process.cwd(),
  env = process.env,
  timeoutMs = 30 * 60_000,
  killGraceMs = 5_000,
  receiptDirectory,
  mirrorDirectory,
  runId,
  echo = true,
  heartbeatMs = 5_000,
}) {
  if (!stage || !command || !receiptDirectory || !runId) throw new Error('runStage requires stage, command, receiptDirectory and runId');
  const normalized = safeName(stage);
  fs.mkdirSync(receiptDirectory, { recursive: true });
  const logFile = path.join(receiptDirectory, `${normalized}.log`);
  const log = fs.createWriteStream(logFile, { flags: 'w' });
  const startedAt = new Date();
  let timedOut = false;
  let interruptedBy = null;
  let forcedKillTimer = null;
  let timeoutTimer = null;
  let heartbeatTimer = null;

  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    detached: process.platform !== 'win32',
  });

  const heartbeatFileName = `${normalized}.heartbeat.json`;
  const writeHeartbeat = (status = 'running') => {
    const heartbeat = {
      id: 'pass4671-stage-heartbeat-v1', runId, stage, status,
      node: process.version, startedAt: startedAt.toISOString(), lastHeartbeatAt: new Date().toISOString(),
      timeoutMs, cwdSha256: cwdIdentity(cwd), logBytes: fs.existsSync(logFile) ? fs.statSync(logFile).size : 0,
    };
    writeJsonAtomic(path.join(receiptDirectory, heartbeatFileName), heartbeat);
    if (mirrorDirectory) writeJsonAtomic(path.join(mirrorDirectory, heartbeatFileName), heartbeat);
  };
  writeHeartbeat();
  heartbeatTimer = setInterval(() => writeHeartbeat(), Math.max(50, heartbeatMs));
  heartbeatTimer.unref?.();

  const forward = (chunk, target) => {
    log.write(chunk);
    if (echo) target.write(chunk);
  };
  child.stdout.on('data', (chunk) => forward(chunk, process.stdout));
  child.stderr.on('data', (chunk) => forward(chunk, process.stderr));

  const signalTree = (signal) => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    if (process.platform === 'win32') {
      if (signal === 'SIGKILL') spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
      else child.kill(signal);
      return;
    }
    try { process.kill(-child.pid, signal); } catch { try { child.kill(signal); } catch (ignoredError) { void ignoredError; } }
  };

  const terminate = (reason) => {
    if (reason === 'timeout') timedOut = true;
    else interruptedBy = reason;
    signalTree('SIGTERM');
    forcedKillTimer = setTimeout(() => signalTree('SIGKILL'), killGraceMs);
    forcedKillTimer.unref?.();
  };

  const signalHandlers = new Map();
  for (const signal of ['SIGINT', 'SIGTERM']) {
    const handler = () => terminate(signal);
    signalHandlers.set(signal, handler);
    process.once(signal, handler);
  }
  timeoutTimer = setTimeout(() => terminate('timeout'), timeoutMs);
  timeoutTimer.unref?.();

  const outcome = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (exitCode, signal) => resolve({ exitCode, signal }));
  }).finally(() => {
    clearTimeout(timeoutTimer);
    clearTimeout(forcedKillTimer);
    clearInterval(heartbeatTimer);
    for (const [signal, handler] of signalHandlers) process.off(signal, handler);
  });

  await new Promise((resolve) => log.end(resolve));
  writeHeartbeat('finished');
  const finishedAt = new Date();
  const receipt = {
    id: 'pass4671-stage-receipt-v1',
    runId,
    stage,
    ok: outcome.exitCode === 0 && !outcome.signal && !timedOut && !interruptedBy,
    command: path.basename(command),
    argumentCount: args.length,
    cwdSha256: cwdIdentity(cwd),
    node: process.version,
    npm: currentNpmVersion(),
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    timeoutMs,
    timedOut,
    interruptedBy,
    exitCode: outcome.exitCode,
    signal: outcome.signal ?? null,
    logBytes: fs.statSync(logFile).size,
    logSha256: sha256File(logFile),
  };
  writeJsonAtomic(path.join(receiptDirectory, `${normalized}.receipt.json`), receipt);
  mirrorReceipt(receipt, logFile, [mirrorDirectory]);
  if (!receipt.ok) throw new StageFailure(receipt);
  return receipt;
}
