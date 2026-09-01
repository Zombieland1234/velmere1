#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const POLICY_PATH = path.join(ROOT, 'config', 'p42', 'p42-exact-windows-semantic-dual-build-policy.json');
const args = process.argv.slice(2);
const arg = (name, fallback = null) => { const i = args.indexOf(name); if (i >= 0) return args[i + 1]; const inline = args.find(value => value.startsWith(`${name}=`)); return inline ? inline.slice(name.length + 1) : fallback; };
const selfTest = args.includes('--self-test');
const simulateFailure = arg('--simulate-failure');
const output = path.resolve(arg('--output', path.join(ROOT, 'p42-out', 'P42_EXACT_WINDOWS_SEMANTIC_DUAL_BUILD_RECEIPT.json')));
const logDirectory = path.join(path.dirname(output), 'logs');
fs.mkdirSync(logDirectory, { recursive: true });

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const fileSha256 = file => sha256(fs.readFileSync(file));
const stable = value => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
};
const writeJson = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };
const loadPolicy = () => JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
const policy = loadPolicy();
const receipt = {
  schemaVersion: 'velmere.p42.exact-windows-semantic-dual-build-receipt.v2',
  revision: policy.revision,
  startedAt: new Date().toISOString(), endedAt: null, status: 'IN_PROGRESS',
  classification: selfTest ? 'PORTABLE_FAIL_CLOSED_BRIDGE_SELF_TEST' : 'EXACT_WINDOWS_CURRENT_ROOT_SEMANTIC_DUAL_BUILD_EXECUTION',
  runtime: { platform: process.platform, arch: process.arch, node: process.version, npm: null, runnerName: process.env.RUNNER_NAME || null, runnerOs: process.env.RUNNER_OS || null, imageOs: process.env.ImageOS || null, githubRunId: process.env.GITHUB_RUN_ID || null, githubSha: process.env.GITHUB_SHA || null },
  bindings: {}, stages: [], firstFailure: null,
  credit: { exactWindowsCurrentRoot: false, lifecycleQuarantine: false, npmCiIgnoreScripts: false, npmLs: false, nativePlatformAvailability: false, typecheck: false, lint: false, webpack: false, turbopack: false, browser: false, pdf: false, rights: false, sale: false, goInternal: false, goPaid: false },
  limitations: [
    'No dependency lifecycle script is executed by this runner.',
    'Portable self-test grants bridge-contract credit only.',
    'A normal PASS grants exact Windows semantic/dual-build evidence only; Browser, PDF, rights, value, sale, LIVE and WORLD_CLASS remain separate.',
  ],
};
const checkpoint = () => { receipt.endedAt = new Date().toISOString(); const copy = structuredClone(receipt); delete copy.integritySha256; receipt.integritySha256 = sha256(stable(copy)); writeJson(output, receipt); };
const fail = (stage, error) => { if (!receipt.firstFailure) receipt.firstFailure = { stage, error: String(error?.stack || error) }; receipt.status = 'FAIL'; receipt.classification = selfTest ? 'PORTABLE_FAIL_CLOSED_BRIDGE_SELF_TEST_FAIL' : 'EXACT_WINDOWS_CURRENT_ROOT_SEMANTIC_DUAL_BUILD_FAIL'; checkpoint(); };
function run(command, commandArgs, stage) {
  const executable = process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command;
  const startedAt = new Date().toISOString();
  const result = spawnSync(executable, commandArgs, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, env: { ...process.env, CI: '1', NEXT_TELEMETRY_DISABLED: '1', npm_config_audit: 'false', npm_config_fund: 'false' } });
  const stdout = result.stdout || '', stderr = result.stderr || '';
  const index = receipt.stages.length + 1;
  const log = path.join(logDirectory, `${String(index).padStart(2, '0')}-${stage}.json`);
  const row = { stage, command: [executable, ...commandArgs], status: result.status, signal: result.signal, startedAt, endedAt: new Date().toISOString(), stdoutSha256: sha256(Buffer.from(stdout)), stderrSha256: sha256(Buffer.from(stderr)), stdoutTail: stdout.slice(-16000), stderrTail: stderr.slice(-16000), log: path.relative(ROOT, log).replaceAll('\\', '/') };
  writeJson(log, { ...row, stdout, stderr }); receipt.stages.push(row); checkpoint();
  if (result.status !== 0) throw new Error(`${stage}_exit_${result.status}:${(stderr || stdout).slice(-8000)}`);
  return result;
}
function assertBindings() {
  const copy = structuredClone(policy); const expectedIntegrity = copy.integritySha256; delete copy.integritySha256;
  const actualIntegrity = sha256(stable(copy)); if (actualIntegrity !== expectedIntegrity) throw new Error(`policy_integrity_mismatch:${expectedIntegrity}:${actualIntegrity}`);
  const expected = policy.currentRootBindings;
  for (const [name, row] of Object.entries(expected)) {
    const file = path.join(ROOT, row.path); if (!fs.existsSync(file)) throw new Error(`binding_missing:${name}:${row.path}`);
    if (fileSha256(file) !== row.sha256 || fs.statSync(file).size !== row.byteLength) throw new Error(`binding_drift:${name}:${row.path}`);
  }
  receipt.bindings = Object.fromEntries(Object.entries(expected).map(([name, row]) => [name, { path: row.path, sha256: row.sha256, byteLength: row.byteLength }]));
}
let stage = 'INIT';
try {
  assertBindings();
  const commands = Object.values(policy.commands);
  const flattened = JSON.stringify(commands);
  if (flattened.includes('install:trusted-native') || flattened.includes('npm rebuild')) throw new Error('forbidden_dependency_lifecycle_command_in_policy');
  if (!policy.commands.npmCi.includes('--ignore-scripts')) throw new Error('npm_ci_ignore_scripts_missing');
  receipt.portableSelfTest = { pass: true, exactTargetPresent: Boolean(policy.exactTarget), bindingsPresent: Object.keys(policy.currentRootBindings).length, commandsPresent: commands.length, dependencyLifecycleExecutionPresent: false, failureReceiptWriterPresent: true };
  checkpoint();
  if (simulateFailure) { stage = `SIMULATED_${simulateFailure}`; throw new Error(`simulated_failure:${simulateFailure}`); }
  if (selfTest) {
    receipt.status = 'PASS'; receipt.classification = 'PORTABLE_FAIL_CLOSED_BRIDGE_SELF_TEST_ONLY'; checkpoint(); console.log(JSON.stringify(receipt, null, 2));
  } else {
    stage = 'EXACT_RUNTIME';
    const npmVersion = run('npm', ['--version'], 'npm-version'); receipt.runtime.npm = (npmVersion.stdout || '').trim();
    if (process.platform !== policy.exactTarget.platform || process.arch !== policy.exactTarget.arch) throw new Error(`exact_target_mismatch:${process.platform}/${process.arch}`);
    if (process.version !== policy.exactTarget.node || receipt.runtime.npm !== policy.exactTarget.npm) throw new Error(`exact_toolchain_mismatch:${process.version}/${receipt.runtime.npm}`);
    receipt.credit.exactWindowsCurrentRoot = true; checkpoint();
    const ordered = [
      ['lifecycleQuarantine', 'lifecycle-quarantine', 'lifecycleQuarantine'],
      ['npmCi', 'npm-ci-ignore-scripts', 'npmCiIgnoreScripts'],
      ['npmLs', 'npm-ls', 'npmLs'],
      ['nativeProbe', 'native-platform-probe', 'nativePlatformAvailability'],
      ['typecheck', 'semantic-typescript', 'typecheck'],
      ['lint', 'eslint', 'lint'],
      ['webpack', 'webpack-production-build', 'webpack'],
      ['turbopack', 'turbopack-production-build', 'turbopack'],
    ];
    for (const [commandKey, label, creditKey] of ordered) {
      stage = label;
      if (commandKey === 'webpack' || commandKey === 'turbopack') fs.rmSync(path.join(ROOT, '.next'), { recursive: true, force: true });
      const command = policy.commands[commandKey]; run(command[0], command.slice(1), label); receipt.credit[creditKey] = true; checkpoint();
    }
    receipt.status = 'PASS'; receipt.classification = 'EXACT_WINDOWS_CURRENT_ROOT_SEMANTIC_DUAL_BUILD_PASS'; checkpoint(); console.log(JSON.stringify(receipt, null, 2));
  }
} catch (error) {
  console.error(String(error?.stack || error)); fail(stage, error); process.exitCode = 1;
} finally { checkpoint(); }
