import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const revision = "VELMERE_PASS36_A102R44P8_ACTION_REQUIRED_ACCURACY_CUSTOMER_TRUTH_PDF_CONFIDENCE_CONSENSUS_AND_SYNTHETIC_DATA_BOUNDARY_NO_LIVE_CREDIT";
const parentRevision = "VELMERE_PASS36_A102R44P7_ACTION_REQUIRED_ADVANCED_INCREMENTAL_EVIDENCE_REMEDIATION_DELTA_AND_ADJUDICATION_READINESS_NO_LIVE_CREDIT";
const manifestRel = "_velmere/PASS36_A102R44P8_SOURCE_MANIFEST.json";
const parentManifestRel = "_velmere/PASS36_A102R44P7_SOURCE_MANIFEST.json";
const excludedNames = new Set(["artifacts", ".velmere", "node_modules", ".cache", ".turbo", "coverage", "test-results", "playwright-report", "__pycache__"]);
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const rows = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    if (entry.isDirectory()) {
      if (excludedNames.has(entry.name) || entry.name.startsWith(".next")) continue;
      walk(absolute);
    } else if (entry.isFile() && relative !== manifestRel && !relative.endsWith(".pyc") && !relative.endsWith(".pyo")) {
      const bytes = fs.readFileSync(absolute);
      rows.push({ path: relative, byteLength: bytes.length, sha256: sha(bytes), mode: (fs.statSync(absolute).mode & 0o777) | 0o100000 });
    }
  }
}
walk(root);
rows.sort((a,b)=>a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
const parentBytes = fs.readFileSync(path.join(root,parentManifestRel));
const parent = JSON.parse(parentBytes.toString("utf8"));
const pm = new Map(parent.entries.map((x)=>[x.path,x]));
const cm = new Map(rows.map((x)=>[x.path,x]));
const added=[];const modified=[];const deleted=[];
for (const p of [...new Set([...pm.keys(),...cm.keys()])].sort()) {
  const before=pm.get(p), after=cm.get(p);
  if (!before && after) added.push(p);
  else if (before && !after) deleted.push(p);
  else if (before && after && (before.byteLength!==after.byteLength || before.sha256!==after.sha256 || before.mode!==after.mode)) modified.push(p);
}
const manifest = {
  schemaVersion: "velmere.pass36.a102r44p8.source-manifest.v1",
  revisionId: revision,
  parentRevisionId: parentRevision,
  generatedAt: "2026-08-03T01:00:00.000Z",
  parentSourceManifestPath: parentManifestRel,
  parentSourceManifestSha256: sha(parentBytes),
  parentSourceAggregateSha256: parent.aggregateSha256,
  manifestExcludedPath: manifestRel,
  exclusions: [...excludedNames].sort(),
  fileCount: rows.length,
  byteLength: rows.reduce((n,x)=>n+x.byteLength,0),
  pathSetSha256: sha(Buffer.from(rows.map((x)=>x.path).join("\n"))),
  aggregateSha256: sha(Buffer.from(rows.map((x)=>`${x.path}\0${x.byteLength}\0${x.sha256}\0${x.mode}\n`).join(""))),
  entries: rows,
  changeCounts: { added: added.length, modified: modified.length, deleted: deleted.length },
  changes: { added, modified, deleted },
  truthBoundary: "R44P8 closes customer-facing PDF coverage, confidence, consensus and automated-human-review contradictions and adds project-designed accuracy regression plus local deployment reproduction. It does not prove independent accuracy, external protocol coverage, real customer value, real provider coverage, LIVE or sale readiness.",
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false
};
fs.mkdirSync(path.dirname(path.join(root,manifestRel)),{recursive:true});
fs.writeFileSync(path.join(root,manifestRel),JSON.stringify(manifest,null,2)+"\n");
console.log(JSON.stringify({status:"BUILT_A102R44P8_SOURCE_MANIFEST",fileCount:manifest.fileCount,byteLength:manifest.byteLength,pathSetSha256:manifest.pathSetSha256,aggregateSha256:manifest.aggregateSha256,changeCounts:manifest.changeCounts},null,2));
