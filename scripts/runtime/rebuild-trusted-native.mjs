#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const ALLOWLIST = path.join(ROOT, 'config', 'p42', 'p42-lifecycle-execution-allowlist.json');
const stable = value => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
};
const fail = (reason, details = {}) => {
  const receipt = {
    schemaVersion: 'velmere.p42.trusted-native-rebuild-guard.v2',
    status: 'BLOCKED',
    classification: 'DEPENDENCY_LIFECYCLE_EXECUTION_WITHHELD_BY_CURRENT_ALLOWLIST',
    reason,
    runtime: { platform: process.platform, arch: process.arch, node: process.version },
    ...details,
    executedCommands: [],
    networkAccessAttempted: false,
    dependencyCodeExecuted: false,
  };
  process.stderr.write(`${JSON.stringify(receipt, null, 2)}\n`);
  process.exitCode = 78;
};

try {
  if (!fs.existsSync(ALLOWLIST)) {
    fail('CURRENT_ALLOWLIST_MISSING', { allowlistPath: path.relative(ROOT, ALLOWLIST) });
  } else {
    const allowlist = JSON.parse(fs.readFileSync(ALLOWLIST, 'utf8'));
    const copy = structuredClone(allowlist);
    const expectedIntegrity = copy.integritySha256;
    delete copy.integritySha256;
    const actualIntegrity = crypto.createHash('sha256').update(stable(copy)).digest('hex');
    // The canonical policy verifier is authoritative; this guard additionally fails closed on any malformed state.
    const rows = Array.isArray(allowlist.dependencyLifecycleRows) ? allowlist.dependencyLifecycleRows : [];
    const applicable = rows.filter(row => row?.applicableToAnyRequiredTarget === true);
    const approved = applicable.filter(row => row?.executionApproved === true);
    if (expectedIntegrity !== actualIntegrity) {
      fail('ALLOWLIST_INTEGRITY_UNVERIFIED_BY_RUNTIME_GUARD', { expectedIntegrity, actualIntegrity, applicable: applicable.length, approved: approved.length });
    } else if (approved.length !== applicable.length || applicable.length === 0) {
      fail('NO_COMPLETE_EXACT_TUPLE_APPROVAL', {
        allowlistIntegritySha256: expectedIntegrity,
        targetApplicableRows: applicable.length,
        approvedRows: approved.length,
        blockedTuples: applicable.filter(row => !row.executionApproved).map(row => `${row.name}@${row.version}`),
      });
    } else {
      fail('CONTROLLED_DEPENDENCY_LIFECYCLE_EXECUTOR_NOT_IMPLEMENTED', {
        allowlistIntegritySha256: expectedIntegrity,
        targetApplicableRows: applicable.length,
        approvedRows: approved.length,
      });
    }
  }
} catch (error) {
  fail('ALLOWLIST_PARSE_OR_GUARD_FAILURE', { error: String(error?.stack || error) });
}
