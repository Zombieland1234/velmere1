#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const outputIndex = process.argv.indexOf("--output");
const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : ".velmere/pass23-diagnostics/clean-source-audit.json";
const rawPath = ".velmere/pass23-diagnostics/clean-source-audit-v3-raw.json";

const child = spawnSync(process.execPath, ["scripts/pass23/audit-clean-source-v3.mjs", "--output", rawPath], {
  cwd: root,
  stdio: "inherit",
  windowsHide: true,
});

const raw = JSON.parse(fs.readFileSync(path.join(root, rawPath), "utf8"));
const exactFrameworkMarkers = new Map([
  ["lib/security/audit-basic-customer-bridge-client.ts\0server-only", {
    path: "lib/security/audit-basic-customer-bridge-client.ts",
    specifier: "server-only",
    package: "server-only",
    reason: "NEXT_SERVER_COMPONENT_SERVER_ONLY_MARKER",
  }],
]);

const frameworkMarkerImports = [];
const remainingUndeclared = [];
for (const row of raw.undeclaredPackageImports ?? []) {
  const key = `${row.path}\0${row.specifier}`;
  const approved = exactFrameworkMarkers.get(key);
  if (approved && row.package === approved.package) frameworkMarkerImports.push(approved);
  else remainingUndeclared.push(row);
}

const requiredMarkerKeys = new Set(exactFrameworkMarkers.keys());
for (const row of frameworkMarkerImports) requiredMarkerKeys.delete(`${row.path}\0${row.specifier}`);

const blocking = {
  symlinks: raw.symlinks ?? [],
  jsonErrors: raw.jsonErrors ?? [],
  unresolvedLocalImports: raw.unresolvedLocalImports ?? [],
  undeclaredPackageImports: remainingUndeclared,
  secretCandidates: raw.secretCandidates ?? [],
  missingRequiredFrameworkMarkers: [...requiredMarkerKeys],
};
const ok = Object.values(blocking).every((rows) => rows.length === 0);

const result = {
  ...raw,
  schemaVersion: "velmere.pass23.clean-source-audit.v4",
  generatedAt: new Date().toISOString(),
  summary: {
    ...raw.summary,
    rawUndeclaredPackageImports: raw.undeclaredPackageImports?.length ?? 0,
    undeclaredPackageImports: remainingUndeclared.length,
    frameworkMarkerImports: frameworkMarkerImports.length,
    missingRequiredFrameworkMarkers: requiredMarkerKeys.size,
  },
  undeclaredPackageImports: remainingUndeclared,
  frameworkMarkerImports,
  blocking,
  ok,
  upstreamV3ExitCode: child.status ?? 1,
  truthBoundary: "V4 preserves the full V3 byte/JSON/AST/secret audit and narrows exactly one known framework marker: the literal server-only import in lib/security/audit-basic-customer-bridge-client.ts. No package-name wildcard or directory allowlist exists. Any other undeclared bare import remains blocking. The marker is accepted only as a Next.js Server Component boundary marker; build/typecheck evidence is still required separately and this audit does not itself prove browser, staging or LIVE behavior.",
};

const absoluteOutput = path.resolve(root, outputPath);
fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
fs.writeFileSync(absoluteOutput, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok, ...result.summary, upstreamV3ExitCode: result.upstreamV3ExitCode }, null, 2));
if (!ok) process.exit(1);
