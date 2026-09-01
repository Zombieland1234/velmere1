#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = process.cwd();
const policyPath = path.join(root, "config", "pass23", "gate-policy.json");
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));

function parseArgs(argv) {
  const out = { level: "quick", domain: null, allowHeavy: false, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--level") out.level = argv[++index] ?? out.level;
    else if (arg === "--domain") out.domain = argv[++index] ?? null;
    else if (arg === "--allow-heavy") out.allowHeavy = true;
    else if (arg === "--dry-run") out.dryRun = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
function sourceTreeDigest() {
  const rows = [];
  const excludedDirectories = new Set([".git", ".next", ".velmere", "node_modules", "artifacts", "coverage", "out", "build"]);
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relativeParent = path.relative(root, directory).replaceAll(path.sep, "/");
      if (entry.isDirectory() && (relativeParent === "" || relativeParent === ".")
        && (excludedDirectories.has(entry.name) || entry.name.startsWith(".next-pass25-"))) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && !entry.name.endsWith(".tsbuildinfo")) {
        const relative = path.relative(root, absolute).replaceAll(path.sep, "/");
        if (relative === "CLEAN_SAFE_VERIFICATION.json") continue;
        const bytes = fs.readFileSync(absolute);
        rows.push(`${relative}\0${bytes.length}\0${sha256(bytes)}`);
      }
    }
  };
  visit(root);
  rows.sort();
  return { sha256: sha256(rows.join("\n")), files: rows.length };
}

function commandList(args) {
  const level = policy.levels[args.level];
  if (!level) throw new Error(`Unknown gate level: ${args.level}`);
  if (args.level === "domain") {
    if (!args.domain || !level.domains?.[args.domain]) {
      throw new Error(`Domain gate requires one of: ${Object.keys(level.domains ?? {}).join(", ")}`);
    }
    return level.domains[args.domain];
  }
  return level.commands ?? [];
}

function splitCommand(command) {
  const tokens = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  return tokens.map((token) => token.replace(/^(["'])|(["'])$/g, ""));
}

const args = parseArgs(process.argv.slice(2));
const levelPolicy = policy.levels[args.level];
const commands = commandList(args);
const heavy = Boolean(levelPolicy.requiresAllowHeavy);

if (heavy && !args.allowHeavy) {
  console.error(`PASS23 ${args.level} gate is intentionally blocked without --allow-heavy.`);
  console.error("This prevents repeated TypeScript/lint/test/build runs during implementation waves.");
  console.error(`Planned commands:\n- ${commands.join("\n- ")}`);
  process.exit(2);
}

const receiptDirectory = path.join(root, ".velmere", "pass23-gates");
fs.mkdirSync(receiptDirectory, { recursive: true });
const startedAt = new Date().toISOString();
const sourceBefore = sourceTreeDigest();
const results = [];
let failed = false;

console.log(`PASS23 gate level=${args.level}${args.domain ? ` domain=${args.domain}` : ""}`);
for (const command of commands) {
  console.log(`${args.dryRun ? "[PLAN]" : "[RUN]"} ${command}`);
  if (args.dryRun) {
    results.push({ command, status: "PLANNED", exitCode: null, durationMs: 0 });
    continue;
  }
  const [program, ...commandArgs] = splitCommand(command);
  const started = Date.now();
  const result = spawnSync(program, commandArgs, {
    cwd: root,
    env: { ...process.env, VELMERE_GATE_LEVEL: args.level },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: Math.max(30_000, Number(levelPolicy.maxExpectedSeconds ?? 300) * 1000),
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  const timedOut = result.error?.code === "ETIMEDOUT";
  const exitCode = result.status ?? (timedOut ? 124 : 1);
  const ok = exitCode === 0 && !timedOut;
  results.push({
    command,
    status: ok ? "PASS" : timedOut ? "FAIL_TIMEOUT" : "FAIL",
    exitCode,
    signal: result.signal ?? null,
    durationMs: Date.now() - started,
    stdoutSha256: sha256(stdout),
    stderrSha256: sha256(stderr),
    outputTail: ok ? null : `${stdout}\n${stderr}`.trim().split(/\r?\n/u).slice(-80)
  });
  if (!ok) {
    failed = true;
    break;
  }
}

const sourceAfter = sourceTreeDigest();
const sourceImmutable = sourceBefore.sha256 === sourceAfter.sha256;
if (!sourceImmutable) failed = true;
const receipt = {
  schemaVersion: "velmere.pass23.gate-execution.v1",
  generatedAt: new Date().toISOString(),
  startedAt,
  level: args.level,
  domain: args.domain,
  allowHeavy: args.allowHeavy,
  dryRun: args.dryRun,
  ok: !failed,
  status: failed ? "FAIL" : args.dryRun ? "PLANNED" : "PASS",
  sourceBefore,
  sourceAfter,
  sourceImmutable,
  commands: results,
  truthBoundary: policy.truthBoundary
};
const stamp = receipt.generatedAt.replaceAll(":", "-");
const receiptPath = path.join(receiptDirectory, `${stamp}-${args.level}${args.domain ? `-${args.domain}` : ""}.json`);
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(`PASS23 gate sourceImmutable=${sourceImmutable}`);
console.log(`PASS23 gate receipt: ${path.relative(root, receiptPath)}`);
if (failed) process.exit(1);
