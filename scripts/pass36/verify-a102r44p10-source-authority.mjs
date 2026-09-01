import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = path.join(root, "_velmere/PASS36_A102R44P10_SOURCE_MANIFEST.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p10-targeted-closure-policy.json"), "utf8"));
const sha256 = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
function walk(dir) {
  const rows = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).split(path.sep).join("/");
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".turbo", ".cache"].includes(entry.name) || entry.name.startsWith(".next-")) { rows.push({ forbiddenDirectory: rel }); continue; }
      rows.push(...walk(full));
    } else if (entry.isFile()) rows.push({ path: rel, full });
  }
  return rows;
}
const inventory = walk(root);
const forbidden = inventory.filter((x) => x.forbiddenDirectory || /(^|\/)\.env(?:\.|$)/i.test(x.path || ""));
const files = inventory.filter((x) => x.path && x.path !== manifest.manifestPath);
const actual = files.map(({ path: rel, full }) => ({ path: rel, byteLength: fs.statSync(full).size, sha256: sha256(full), mode: fs.statSync(full).mode & 0o777 })).sort((a,b)=>a.path.localeCompare(b.path));
const expected = [...manifest.entries].sort((a,b)=>a.path.localeCompare(b.path));
const am = new Map(actual.map((x)=>[x.path,x]));
const em = new Map(expected.map((x)=>[x.path,x]));
const missing = expected.filter((x)=>!am.has(x.path)).map((x)=>x.path);
const extra = actual.filter((x)=>!em.has(x.path)).map((x)=>x.path);
const changed = actual.filter((x)=>{const e=em.get(x.path); return e && (e.byteLength!==x.byteLength || e.sha256!==x.sha256);}).map((x)=>x.path);
const aggregate = crypto.createHash("sha256").update(actual.map((x)=>`${x.path}\0${x.byteLength}\0${x.sha256}\0${x.mode}\n`).join("")).digest("hex");
const pathSet = crypto.createHash("sha256").update(actual.map((x)=>x.path).join("\n")+"\n").digest("hex");
const checks = [
 ["revision", manifest.revisionId===policy.revisionId],
 ["parent", manifest.parentRevisionId===policy.parentRevisionId],
 ["file-count", manifest.fileCount===expected.length && actual.length===expected.length],
 ["byte-length", manifest.byteLength===actual.reduce((s,x)=>s+x.byteLength,0)],
 ["path-set", manifest.pathSetSha256===pathSet],
 ["aggregate", manifest.aggregateSha256===aggregate],
 ["missing-zero", missing.length===0],
 ["extra-zero", extra.length===0],
 ["changed-zero", changed.length===0],
 ["forbidden-zero", forbidden.length===0],
 ["global-no-go", policy.globalTruth?.decision==="NO_GO"],
 ["live-false", policy.globalTruth?.live===false],
 ["sale-false", policy.globalTruth?.saleEnabled===false],
 ["world-class-false", policy.globalTruth?.worldClassProven===false],
];
const failed=checks.filter(([,ok])=>!ok);
const result={schemaVersion:"velmere.pass36.a102r44p10.source-authority-verification.v1",revisionId:manifest.revisionId,parentRevisionId:manifest.parentRevisionId,checks:checks.length,passed:checks.length-failed.length,failed:failed.length,sourceFiles:actual.length,missing,extra,changed,forbidden,aggregateSha256:aggregate,pathSetSha256:pathSet,checksDetail:checks.map(([id,ok])=>({id,ok})),globalDecision:"NO_GO",live:false,saleEnabled:false,productionApproved:false,worldClassProven:false};
console.log(JSON.stringify(result,null,2));
if(failed.length) process.exit(1);
