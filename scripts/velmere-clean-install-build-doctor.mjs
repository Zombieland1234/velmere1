import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const reportsDir = path.join(root, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });
function read(file){ try { return fs.readFileSync(path.join(root,file),'utf8'); } catch { return ''; } }
function writeJson(name, data){ fs.writeFileSync(path.join(reportsDir,name), JSON.stringify(data,null,2)+'\n'); }
function writeMd(name, body){ fs.writeFileSync(path.join(reportsDir,name), body.trim()+'\n'); }
function exists(file){ return fs.existsSync(path.join(root,file)); }
const pkg = JSON.parse(read('package.json') || '{}');
const lock = exists('package-lock.json');
const nvm = read('.nvmrc').trim();
const nodeVersionFile = read('.node-version').trim();
let npmVersion = 'unknown';
try { npmVersion = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(); } catch (ignoredError) { void ignoredError; }
const nodeVersion = process.versions.node;
const engines = pkg.engines || {};
const requiredNodeHint = engines.node || '>=24.18.0 <25';
const requiredNpmHint = engines.npm || '>=11.16.0 <12';
const nodeOk = nodeVersion.startsWith('24.');
const npmOk = npmVersion.startsWith('11.');
const cleanArtifacts = ['node_modules','.next','dist','build'].filter(exists);
const status = nodeOk && npmOk && lock && cleanArtifacts.length === 0 ? 'READY_FOR_NPM_CI' : 'BLOCKED_OR_NEEDS_OWNER_ACTION';
const report = {
  pass: 2125,
  name: 'Clean install/build doctor',
  status,
  runtime: { nodeVersion, npmVersion, requiredNodeHint, requiredNpmHint, nvm, nodeVersionFile },
  packageManager: pkg.packageManager || 'missing',
  lockfile: lock ? 'present' : 'missing',
  cleanArtifacts,
  nextOwnerCommands: [
    'node -v && npm -v',
    'rm -rf node_modules .next dist build',
    'npm ci --no-audit --no-fund --progress=false',
    'npm run typecheck',
    'npm run build'
  ],
  truthRule: 'Do not mark >90% until clean install, typecheck and build pass on Node 24/npm 11.'
};
writeJson('PASS2125_CLEAN_INSTALL_BUILD_DOCTOR.json', report);
writeMd('PASS2125_CLEAN_INSTALL_BUILD_DOCTOR.md', `# PASS2125 — Clean install/build doctor\n\nStatus: **${status}**\n\n| Gate | Result |\n|---|---|\n| Node | ${nodeVersion} / required ${requiredNodeHint} |\n| npm | ${npmVersion} / required ${requiredNpmHint} |\n| package-lock | ${lock ? 'present' : 'missing'} |\n| dirty artifacts | ${cleanArtifacts.length ? cleanArtifacts.join(', ') : 'none'} |\n\nOwner command sequence:\n\n\`\`\`bash\n${report.nextOwnerCommands.join('\n')}\n\`\`\`\n`);
console.log(`[PASS2125] ${status}`);
