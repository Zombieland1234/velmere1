import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('PASS2976-3000 prepared-only closure exists and blocks live claims', async () => {
  const root = process.cwd();
  const configPath = path.join(root, 'config/pass2976-3000-ultimate-zero-skip-pre-final-closure-batch.json');
  expect(fs.existsSync(configPath)).toBeTruthy();
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  expect(cfg.passes.length).toBe(25);
  expect(cfg.claim_state).toBe('BLOCKED_UNTIL_FINAL_RUNNER');
  for (const p of cfg.passes) expect(fs.existsSync(path.join(root, p.matrix_csv))).toBeTruthy();
});
