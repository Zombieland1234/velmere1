import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('PASS2935 mega core execution batch remains fail-closed', async () => {
  const artifactPath = path.join(process.cwd(), '.codex-qa', 'PASS2935_MEGA_CORE_EXECUTION_BATCH.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8')) as {
    pass?: string;
    worldClassLiveClaim?: string;
    productionDecision?: string;
  };
  expect(artifact.pass).toBe('PASS2935');
  expect(artifact.worldClassLiveClaim).toBe('BLOCKED');
  expect(String(artifact.productionDecision)).toContain('NO_GO');
});
