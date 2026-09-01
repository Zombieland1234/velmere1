#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { readJson, REVISION } from "./a77-clean-root-migration-lib.mjs";
const root=process.cwd();
const policy=readJson(root,"config/pass36/a77-clean-root-migration-policy.json");
const checks=[];const add=(id,passed,detail=null)=>checks.push({id,passed:Boolean(passed),detail});
for(const artifact of policy.legacyLineage.artifacts){
  add(`legacy-absent:${artifact.id}`,!fs.existsSync(path.join(root,artifact.targetPath)),artifact.targetPath);
}
const productionRoots=["app","components","lib"];
for(const artifact of policy.legacyLineage.artifacts){
  const hits=[];
  const walk=(dir)=>{if(!fs.existsSync(dir))return;for(const item of fs.readdirSync(dir,{withFileTypes:true})){const abs=path.join(dir,item.name);if(item.isDirectory())walk(abs);else if(item.isFile()){const text=fs.readFileSync(abs,"utf8");if(text.includes(artifact.targetPath))hits.push(path.relative(root,abs).split(path.sep).join("/"));}}};
  for(const prefix of productionRoots) walk(path.join(root,prefix));
  add(`production-no-legacy-dependency:${artifact.id}`,hits.length===0,hits);
}
const runtime=readJson(root,"config/runtime-bundle-policy.json");
const excluded=new Set(runtime.excludedExactPaths ?? []);
for(const artifact of policy.legacyLineage.artifacts)add(`runtime-excludes-legacy:${artifact.id}`,excluded.has(artifact.targetPath),artifact.targetPath);
const packager=fs.readFileSync(path.join(root,"scripts/release/package-full-source.mjs"),"utf8");
add("packager:clean-root-alternative",packager.includes("A77_CLEAN_ROOT")&&packager.includes("a77-clean-root-genesis.json"),null);
const critical=fs.readFileSync(path.join(root,"scripts/pass6/run-critical-offline-gate.mjs"),"utf8");
add("critical:lineage-mode",critical.includes("--lineage-mode")&&critical.includes("a78_current_root_descendant_integrity")&&critical.includes("a77_legacy_lineage_isolation"),null);
const a63=readJson(root,"config/pass36/a63-staging-program-orchestrator.json");
add("a63:alternative-lineage",a63.requiredPreconditions?.lineage?.rule==="EXACT_A61_OR_SIGNED_A77_CLEAN_ROOT",a63.requiredPreconditions?.lineage);
const authority=readJson(root,"config/pass36/current-release-authority.json");
add("authority:no-legacy-promotion",
  authority.planes?.historicalArtifactRecovery?.complete===false &&
  authority.planes?.historicalArtifactRecovery?.verifiedExact===0 &&
  authority.planes?.cleanRootMigration?.revisionId===REVISION &&
  authority.planes?.cleanRootMigration?.governanceApproved===false &&
  authority.planes?.cleanRootMigration?.legacyRecoveryComplete===false,
  { authorityRevisionId: authority.authorityRevisionId, cleanRootRevisionId: authority.planes?.cleanRootMigration?.revisionId }
);
const failed=checks.filter((row)=>!row.passed);
console.log(JSON.stringify({schemaVersion:"velmere.pass36.a77.legacy-lineage-isolation-verification.v1",revisionId:REVISION,status:failed.length?"FAIL":"PASS",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,failures:failed},null,2));
if(failed.length)process.exit(1);
