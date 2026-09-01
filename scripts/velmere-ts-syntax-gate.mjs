#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let ts;
try {
  const { loadTypeScript } = require('./lib/load-typescript.cjs');
  ts = loadTypeScript();
} catch {
  ts = null;
}

const blockers = [];
if (!ts) blockers.push('typescript module unavailable; run npm ci before syntax gate in production CI');

const ignoredDirs = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'coverage']);
const roots = ['app', 'components', 'lib', 'store', 'tests', 'scripts'];
const files = [];
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(entry.name)) files.push(full);
  }
}
for (const root of roots) walk(root);

const errors = [];
if (ts) {
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const scriptKind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind);
    const parseDiagnostics = sourceFile.parseDiagnostics ?? [];
    if (parseDiagnostics.length) {
      errors.push({
        file,
        diagnostics: parseDiagnostics.slice(0, 8).map((diag) => {
          const pos = sourceFile.getLineAndCharacterOfPosition(diag.start ?? 0);
          return {
            code: diag.code,
            line: pos.line + 1,
            column: pos.character + 1,
            message: ts.flattenDiagnosticMessageText(diag.messageText, ' '),
          };
        }),
      });
    }
  }
}
if (errors.length) blockers.push(`TypeScript syntax parse failed in ${errors.length} files`);

const payload = {
  schemaVersion: 'velmere.pass2107.ts-syntax-gate.v1',
  generatedAt: new Date().toISOString(),
  status: blockers.length ? 'FAIL' : 'PASS',
  filesScanned: files.length,
  typeScriptAvailable: Boolean(ts),
  errors,
  blockers,
};
mkdirSync('reports', { recursive: true });
writeFileSync('reports/PASS2107_TS_SYNTAX_GATE.json', JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload, null, 2));
process.exit(blockers.length ? 1 : 0);
