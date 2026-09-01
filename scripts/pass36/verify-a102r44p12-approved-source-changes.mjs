import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ledgerRel = "config/pass36/a102r44p12-approved-source-changes.json";
const parentManifestRel = "_velmere/PASS36_A102R44P11_SOURCE_MANIFEST.json";
const currentManifestRel = "_velmere/PASS36_A102R44P12_SOURCE_MANIFEST.json";
const ledger = JSON.parse(fs.readFileSync(path.join(root, ledgerRel), "utf8"));
const parent = JSON.parse(fs.readFileSync(path.join(root, parentManifestRel), "utf8"));
const sha256Bytes = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sha256File = (file) => sha256Bytes(fs.readFileSync(file));
const forbiddenNames = new Set(["node_modules", ".next", ".turbo", ".cache", "coverage", "test-results", "playwright-report", "__pycache__", ".pytest_cache"]);
function walk(dir) {
  const rows=[];
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const full=path.join(dir,entry.name); const rel=path.relative(root,full).split(path.sep).join("/"); const stat=fs.lstatSync(full);
    if (stat.isSymbolicLink()) throw new Error(`symlink forbidden: ${rel}`);
    if (entry.isDirectory()) { if(forbiddenNames.has(entry.name)||entry.name.startsWith(".next-")) throw new Error(`generated directory forbidden: ${rel}`); rows.push(...walk(full)); }
    else if (entry.isFile()) { if([ledgerRel,currentManifestRel,parentManifestRel].includes(rel)) continue; if(/(^|\/)\.env(?:\.|$)/i.test(rel)) throw new Error(`environment file forbidden: ${rel}`); rows.push({path:rel,byteLength:stat.size,sha256:sha256File(full),mode:stat.mode&0o777}); }
    else throw new Error(`non-regular entry forbidden: ${rel}`);
  }
  return rows;
}
const parentMap=new Map(parent.entries.filter((row)=>row.path!==parentManifestRel).map((row)=>[row.path,row]));
const current=walk(root).sort((a,b)=>a.path.localeCompare(b.path)); const currentMap=new Map(current.map((row)=>[row.path,row]));
const changes=[];
for(const rel of [...new Set([...parentMap.keys(),...currentMap.keys()])].sort()) { const before=parentMap.get(rel),after=currentMap.get(rel); if(!before&&after)changes.push({status:"ADDED",path:rel,after}); else if(before&&!after)changes.push({status:"DELETED",path:rel,before}); else if(before&&after&&(before.byteLength!==after.byteLength||before.sha256!==after.sha256||before.mode!==after.mode))changes.push({status:"MODIFIED",path:rel,before,after}); }
const digest=sha256Bytes(changes.map((row)=>JSON.stringify(row)).join("\n")+"\n");
const checks=[
 ["schema",ledger.schemaVersion==="velmere.pass36.a102r44p12.approved-source-changes.v1"],
 ["parent-manifest-bytes",fs.statSync(path.join(root,parentManifestRel)).size===ledger.parentManifest.byteLength],
 ["parent-manifest-sha",sha256File(path.join(root,parentManifestRel))===ledger.parentManifest.sha256],
 ["revision",ledger.revisionId==="VELMERE_PASS36_A102R44P12_ACTION_REQUIRED_REAL_PUBLIC_PROVIDER_DIAGNOSTIC_15_ASSET_TWO_PROVIDER_IDENTITY_FRESHNESS_CONFLICT_AND_RIGHTS_BOUNDARY_NO_LIVE_CREDIT"],
 ["parent",ledger.parentRevisionId===parent.revisionId],
 ["no-deletions",changes.every((row)=>row.status!=="DELETED")&&ledger.counts.deleted===0],
 ["added-count",changes.filter((row)=>row.status==="ADDED").length===ledger.counts.added],
 ["modified-count",changes.filter((row)=>row.status==="MODIFIED").length===ledger.counts.modified],
 ["total-count",changes.length===ledger.counts.total],
 ["exact-change-set",JSON.stringify(changes)===JSON.stringify(ledger.changes)],
 ["change-digest",digest===ledger.changeSetSha256],
 ["added-allowlist",JSON.stringify(changes.filter((row)=>row.status==="ADDED").map((row)=>row.path).sort())===JSON.stringify([...ledger.expectedAdded].sort())],
 ["modified-allowlist",JSON.stringify(changes.filter((row)=>row.status==="MODIFIED").map((row)=>row.path).sort())===JSON.stringify([...ledger.expectedModified].sort())],
 ["policy-no-deletions",ledger.approvalPolicy.deletionsAllowed===false],
 ["policy-no-generated",ledger.approvalPolicy.generatedPathsAllowed===false],
 ["policy-history-immutable",ledger.approvalPolicy.historicalRevisionFilesMutable===false],
 ["global-no-go",ledger.globalDecision==="NO_GO"],
 ["flags-false",ledger.live===false&&ledger.saleEnabled===false&&ledger.productionApproved===false&&ledger.worldClassProven===false],
];
const failed=checks.filter(([,ok])=>!ok);
const result={schemaVersion:"velmere.pass36.a102r44p12.approved-source-changes-verification.v1",status:failed.length?"FAIL_R44P12_APPROVED_SOURCE_CHANGES":"PASS_R44P12_APPROVED_SOURCE_CHANGES",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,counts:ledger.counts,changeSetSha256:digest,checksDetail:checks.map(([id,ok])=>({id,ok:Boolean(ok)}))};
console.log(JSON.stringify(result,null,2)); if(failed.length)process.exit(1);
