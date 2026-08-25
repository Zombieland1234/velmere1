#!/usr/bin/env node
import { assertCurrentRuntime } from './lib/velmere-runtime-contract.mjs';

try {
  const runtime = assertCurrentRuntime({ label: 'Velmere exact runtime' });
  process.stdout.write(`Velmere runtime OK: ${runtime.node} / npm ${runtime.npm}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
