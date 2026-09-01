#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import {
  buildA60ChildEnvironment,
  isExpectedNextRscAbort,
  normalizeLoopbackBaseUrl,
  validateA79Environment,
} from '../scripts/pass36/a79-exact-build-browser-lib.mjs';

const root = path.resolve(process.argv[2] ?? '.');
const outDir = path.resolve(process.argv[3] ?? 'p47-out');
fs.mkdirSync(outDir, { recursive: true });
const manifestPath = path.join(root, 'p47', 'P47_A79_CONTROL_PLANE_MANIFEST.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const checks = [];
const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
const expectThrow = (id, fn, marker) => {
  try { fn(); check(id, false, 'did_not_throw'); }
  catch (error) { const message = error instanceof Error ? error.message : String(error); check(id, message.includes(marker), message); }
};

for (const row of manifest.files) {
  const absolute = path.join(root, ...row.path.split('/'));
  const bytes = fs.readFileSync(absolute);
  check(`exact-source:${row.path}`, bytes.length === row.byteLength && sha256(bytes) === row.sha256, {
    byteLength: bytes.length,
    sha256: sha256(bytes),
  });
}

for (const row of manifest.syntaxFiles) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, ...row.split('/'))], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
  });
  check(`node-check:${row}`, result.status === 0, { status: result.status, stdout: result.stdout, stderr: result.stderr });
}

check('native-windows-runner', process.platform === 'win32', { platform: process.platform, os: os.release(), arch: process.arch });
check('exact-node-24.18.0', process.version === 'v24.18.0', process.version);
const npmVersion = spawnSync(process.execPath, [manifest.npmCliPath, '--version'], { encoding: 'utf8', shell: false, windowsHide: true });
check('exact-npm-11.16.0', npmVersion.status === 0 && npmVersion.stdout.trim() === '11.16.0', { status: npmVersion.status, stdout: npmVersion.stdout.trim(), stderr: npmVersion.stderr.trim() });

const runtimeRoot = path.dirname(process.execPath);
const npmCliPath = String(process.env.P47_NPM_CLI_PATH ?? '').trim();
check('npm-cli-path-bound-by-workflow', path.isAbsolute(npmCliPath) && fs.existsSync(npmCliPath), npmCliPath);
const browserExecutable = path.join(root, 'fixture', 'chrome.exe');
fs.mkdirSync(path.dirname(browserExecutable), { recursive: true });
fs.writeFileSync(browserExecutable, Buffer.from('P47_WINDOWS_CONTROL_PLANE_BROWSER_FIXTURE_NOT_EXECUTED\n'));
const validEnv = {
  VELMERE_A79_ISOLATED_ENVIRONMENT: '1',
  VELMERE_A79_RUNTIME_ROOT: runtimeRoot,
  VELMERE_A79_NPM_CLI_PATH: npmCliPath,
  VELMERE_PLAYWRIGHT_EXECUTABLE_PATH: browserExecutable,
  Path: runtimeRoot,
  SystemRoot: process.env.SystemRoot ?? process.env.WINDIR ?? 'C:\\Windows',
  WINDIR: process.env.WINDIR ?? process.env.SystemRoot ?? 'C:\\Windows',
  ComSpec: process.env.ComSpec ?? 'C:\\Windows\\System32\\cmd.exe',
  USERPROFILE: process.env.USERPROFILE ?? root,
  TEMP: process.env.TEMP ?? outDir,
  TMP: process.env.TMP ?? outDir,
  CI: '1',
  NEXT_TELEMETRY_DISABLED: '1',
  npm_config_offline: 'true',
  npm_config_ignore_scripts: 'true',
  npm_config_audit: 'false',
  npm_config_fund: 'false',
};
const options = { runtimeRoot, npmCliPath, browserExecutable, npmScriptShell: null };
const valid = validateA79Environment(validEnv, options);
check('windows-native-comspec-environment-valid', valid.passed, valid.checks.filter((row) => !row.passed));
const customShell = validateA79Environment({ ...validEnv, npm_config_script_shell: 'C:\\malicious\\shell.exe' }, options);
check('windows-custom-npm-script-shell-rejected', !customShell.passed && customShell.checks.some((row) => row.id === 'npm-script-shell-bound' && !row.passed), customShell.checks.filter((row) => !row.passed));
const falsePosixExpectation = validateA79Environment(validEnv, { ...options, npmScriptShell: 'C:\\fake\\bash.exe' });
check('windows-posix-shell-expectation-rejected', !falsePosixExpectation.passed, falsePosixExpectation.checks.filter((row) => !row.passed));
const secret = validateA79Environment({ ...validEnv, API_KEY: 'must-not-pass' }, options);
check('unapproved-secret-name-rejected', !secret.passed, secret.checks.filter((row) => !row.passed));
const nodeOptions = validateA79Environment({ ...validEnv, NODE_OPTIONS: '--require=attack.js' }, options);
check('node-options-rejected', !nodeOptions.passed, nodeOptions.checks.filter((row) => !row.passed));
const collision = validateA79Environment({ ...validEnv, PATH: runtimeRoot }, options);
check('windows-casefold-collision-rejected', !collision.passed, collision.checks.filter((row) => !row.passed));

const child = buildA60ChildEnvironment({ ...validEnv, API_KEY: 'drop-me', NODE_OPTIONS: '--require=drop-me.js' });
check('child-environment-drops-unapproved-secret', child.API_KEY === undefined && child.NODE_OPTIONS === undefined, Object.keys(child).sort());
check('child-environment-keeps-native-no-script-shell', child.npm_config_script_shell === undefined, child.npm_config_script_shell ?? null);
expectThrow('child-environment-forbids-unapproved-stage-addition', () => buildA60ChildEnvironment(validEnv, { ATTACK: '1' }), 'addition_forbidden');

check('loopback-http', normalizeLoopbackBaseUrl('http://127.0.0.1:4176') === 'http://127.0.0.1:4176');
check('loopback-https', normalizeLoopbackBaseUrl('https://127.0.0.1:4176') === 'https://127.0.0.1:4176');
expectThrow('loopback-external-rejected', () => normalizeLoopbackBaseUrl('https://example.com:4176'), 'exact_loopback');
check('expected-next-rsc-abort-only', isExpectedNextRscAbort({
  url: 'https://127.0.0.1:4176/pl?_rsc=abc', error: 'net::ERR_ABORTED', method: 'GET', resourceType: 'fetch', isNavigationRequest: false,
}, 'https://127.0.0.1:4176') && !isExpectedNextRscAbort({
  url: 'https://attacker.invalid/pl?_rsc=abc', error: 'net::ERR_ABORTED', method: 'GET', resourceType: 'fetch', isNavigationRequest: false,
}, 'https://127.0.0.1:4176'));

const runner = fs.readFileSync(path.join(root, 'scripts', 'a60-exact-final-byte-build-browser-acceptance.mjs'), 'utf8');
for (const marker of [
  'const npmScriptShell',
  'a79_windows_custom_npm_script_shell_forbidden',
  'a79_npm_script_shell_not_executable',
  'PINNED_EXTERNAL_POSIX_SCRIPT_SHELL',
  'npmScriptShell: npmScriptShell || null',
]) check(`runner-marker:${marker}`, runner.includes(marker));
check('runner-no-windows-shell-spawn', !runner.includes('shell: process.platform'));
const library = fs.readFileSync(path.join(root, 'scripts', 'pass36', 'a79-exact-build-browser-lib.mjs'), 'utf8');
for (const marker of ['npm_config_script_shell', 'WINDOWS_NATIVE_COMSPEC', 'POSIX_EXPLICIT_PINNED_SHELL']) check(`library-marker:${marker}`, library.includes(marker));
const canonicalTest = fs.readFileSync(path.join(root, 'scripts', 'pass36', 'test-a79-exact-final-byte-build-browser-evidence-binding.mjs'), 'utf8');
for (const marker of ['expectedNpmScriptShell', 'npm_config_script_shell: "relative-shell"']) check(`canonical-test-marker:${marker}`, canonicalTest.includes(marker));

const failures = checks.filter((row) => !row.passed);
const receipt = {
  schemaVersion: 'velmere.p47.native-windows-p46-a79-control-plane.v1',
  status: failures.length ? 'FAIL' : 'PASS',
  decision: failures.length ? 'FAIL_CLOSED_NATIVE_WINDOWS_P46_A79_CONTROL_PLANE' : 'PASS_NATIVE_WINDOWS_P46_A79_SCRIPT_SHELL_CONTROL_PLANE',
  runtime: { platform: process.platform, arch: process.arch, node: process.version, npm: npmVersion.stdout.trim(), osRelease: os.release() },
  sourceBinding: manifest.fullP46SourceBinding,
  summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length },
  failures,
  checks,
  credit: {
    exactP46A79ChangedCodeOnNativeWindows: failures.length ? 'WITHHELD' : 'PASS',
    exactWindowsFull6666SourceSemanticDualBuild: 'WITHHELD_NOT_EXECUTED',
    browserDistinctSkus: '0/3',
    pdfIndependentReplay: '0/1',
    physicalCustomerOutputs: '0/17',
    fieldRights: '0/176',
    materialRequiredDeltas: '0/6',
    saleEligible: '0/17',
  },
  truthBoundary: 'PASS proves only the exact P46 A79 script-shell/control-plane changed code on native Windows with exact Node/npm. It does not prove the full 6666-file Windows source, dependency closure, TypeScript, lint, production builds, Browser SKUs, PDF, customer value, rights, sale eligibility or release readiness.',
};
receipt.integritySha256 = sha256(Buffer.from(JSON.stringify(receipt)));
const receiptPath = path.join(outDir, 'P47_NATIVE_WINDOWS_P46_A79_CONTROL_PLANE_RECEIPT.json');
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
if (failures.length) process.exit(1);
