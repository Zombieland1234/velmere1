import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('PASS2961-2975 prepared matrices exist and claims remain blocked', async () => {
  const root = process.cwd();
  const configPath = path.join(root, 'config/pass2961-2975-mega-zero-skip-product-launch-closure-batch.json');
  expect(fs.existsSync(configPath)).toBeTruthy();
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  expect(config.passes.length).toBe(15);
  for (const pass of config.passes) {
    expect(fs.existsSync(path.join(root, pass.matrix_csv))).toBeTruthy();
    expect(pass.status).toBe('PREPARED_NOT_EXECUTED');
  }
});
