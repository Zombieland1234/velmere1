#!/usr/bin/env node
import fs from 'node:fs';

const workflows = [
  '.github/workflows/velmere-production-gates.yml',
  '.github/workflows/velmere-hard-production-gate.yml',
  '.github/workflows/velmere-owner-production-release.yml'
].filter((file) => fs.existsSync(file));
const checks = workflows.map((file) => {
  const text = fs.readFileSync(file, 'utf8');
  return {
    file,
    hasUploadArtifact: text.includes('actions/upload-artifact@v4'),
    uploadsReports: text.includes('reports/**'),
    uploadsRuntimeDocs: text.includes('docs/runtime/**'),
  };
});
const result = {
  pass: 'PASS2143',
  name: 'GitHub artifact upload wiring',
  status: checks.every((item) => item.hasUploadArtifact && item.uploadsReports) ? 'PASS' : 'PARTIAL_WORKFLOW_UPLOAD_WIRING_REQUIRED',
  workflows: checks,
  generatedAt: new Date().toISOString()
};
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/PASS2143_GITHUB_ARTIFACT_UPLOAD_WIRING.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify({ status: result.status, workflows: workflows.length }, null, 2));
if (result.status !== 'PASS') process.exitCode = 1;
