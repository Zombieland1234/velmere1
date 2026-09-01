#!/usr/bin/env node
import { assertCurrentRuntime, assertDeploymentRuntime } from './lib/velmere-runtime-contract.mjs';

const deployment = process.argv.slice(2).includes('--deployment');

try {
  const runtime = deployment
    ? assertDeploymentRuntime({ label: 'Velmere deployment runtime' })
    : assertCurrentRuntime({ label: 'Velmere exact Windows runtime' });
  process.stdout.write(`Velmere ${deployment ? runtime.runtimeClass : 'EXACT_WINDOWS'} runtime OK: ${runtime.node} / npm ${runtime.npm}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
