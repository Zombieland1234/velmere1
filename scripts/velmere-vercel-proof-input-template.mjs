#!/usr/bin/env node
import fs from 'node:fs';

fs.mkdirSync('reports', { recursive: true });
fs.mkdirSync('docs/runtime', { recursive: true });

const template = {
  pass: 'PASS2142',
  name: 'Vercel proof input template',
  status: 'TEMPLATE_READY_OWNER_INPUT_REQUIRED',
  requiredInputs: [
    'deploymentUrl',
    'deploymentId',
    'commitSha',
    'nodeVersion',
    'npmVersion',
    'installCommand',
    'buildCommand',
    'installStatus',
    'typecheckStatus',
    'buildStatus',
    'releaseGateStatus',
    'timestampUtc'
  ],
  passCriteria: [
    'nodeVersion equals 24.18.0',
    'npmVersion starts with 11.16',
    'installStatus == pass',
    'typecheckStatus == pass',
    'buildStatus == pass',
    'releaseGateStatus == pass'
  ],
  sample: {
    deploymentUrl: 'https://<project>.vercel.app',
    deploymentId: 'dpl_<id>',
    commitSha: '<git sha>',
    nodeVersion: '24.18.0',
    npmVersion: '11.16.0',
    installCommand: 'npm ci --no-audit --no-fund --progress=false',
    buildCommand: 'npm run build',
    installStatus: 'pass|fail',
    typecheckStatus: 'pass|fail',
    buildStatus: 'pass|fail',
    releaseGateStatus: 'pass|fail',
    timestampUtc: new Date().toISOString()
  },
  generatedAt: new Date().toISOString()
};
fs.writeFileSync('reports/PASS2142_VERCEL_PROOF_INPUT_TEMPLATE.json', JSON.stringify(template, null, 2));
fs.writeFileSync('docs/runtime/VERCEL_PROOF_INPUT_TEMPLATE.md', `# PASS2142 Vercel Proof Input Template\n\nStatus: **${template.status}**\n\nFill this after a real Vercel/GitHub deployment. Do not promote above 90% until all pass criteria are true.\n\n## Required inputs\n\n${template.requiredInputs.map((item) => `- ${item}`).join('\n')}\n\n## Pass criteria\n\n${template.passCriteria.map((item) => `- ${item}`).join('\n')}\n\n## JSON sample\n\n\`\`\`json\n${JSON.stringify(template.sample, null, 2)}\n\`\`\`\n`);
console.log(JSON.stringify({ status: template.status, requiredInputs: template.requiredInputs.length }, null, 2));
