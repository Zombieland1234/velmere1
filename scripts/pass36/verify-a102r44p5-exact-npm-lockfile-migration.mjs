#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const EXPECTED_REVISION="VELMERE_PASS36_A102R44P5_ACTION_REQUIRED_EXACT_NPM_11_16_LOCKFILE_MIGRATION_LINUX_BUILD_BROWSER_AND_DEPENDENCY_GRAPH_CLOSURE_NO_LIVE_CREDIT";
const EXPECTED_PARENT="VELMERE_PASS36_A102R44P4_ACTION_REQUIRED_OFFICIAL_TOOLCHAIN_200_EXECUTIONS_SEMGREP_MIGRATION_AND_AUTOMATED_AUDIT_EVIDENCE_BINDING_NO_LIVE_CREDIT";
const OLD_LOCK="6269b250e484780187c9378b52c69898fa533cf1c39cc21122ce8ef053387a6b";
const NEW_LOCK="abd75eb78ca1570c0b8c13717d128ae439c0ddd4c02c196e3ec03a877258258f";
export function verifyA102R44P5(root=process.cwd()){
 const rows=[];const check=(id,passed,detail)=>rows.push({id,passed:Boolean(passed),detail});
 const readJson=rel=>JSON.parse(fs.readFileSync(path.join(root,rel),"utf8"));
 let migration,lock,pkg,parent,product="";
 try{migration=readJson("config/pass36/a102r44p5-exact-npm-lockfile-migration.json");}catch(e){migration={};check("migration-readable",false,e.message)}
 try{lock=readJson("package-lock.json");}catch(e){lock={packages:{}};check("lock-readable",false,e.message)}
 try{pkg=readJson("package.json");}catch(e){pkg={};check("package-readable",false,e.message)}
 try{parent=readJson("_velmere/PASS36_A102R44P4_SOURCE_MANIFEST.json");}catch(e){parent={};check("parent-readable",false,e.message)}
 try{product=fs.readFileSync(path.join(root,"lib/security/vlm-audit-product.ts"),"utf8");}catch(e){check("product-readable",false,e.message)}
 const lockBytes=fs.existsSync(path.join(root,"package-lock.json"))?fs.readFileSync(path.join(root,"package-lock.json")):Buffer.alloc(0);
 const parentBytes=fs.existsSync(path.join(root,"_velmere/PASS36_A102R44P4_SOURCE_MANIFEST.json"))?fs.readFileSync(path.join(root,"_velmere/PASS36_A102R44P4_SOURCE_MANIFEST.json")):Buffer.alloc(0);
 check("schema",migration.schemaVersion==="velmere.pass36.a102r44p5.exact-npm-lockfile-migration.v1",migration.schemaVersion);
 check("revision",migration.revisionId===EXPECTED_REVISION,migration.revisionId);
 check("parent-revision",migration.parentRevisionId===EXPECTED_PARENT,migration.parentRevisionId);
 check("parent-manifest-revision",parent.revisionId===EXPECTED_PARENT,parent.revisionId);
 check("parent-manifest-sha",migration.parent?.manifestSha256===sha(parentBytes),{expected:migration.parent?.manifestSha256,actual:sha(parentBytes)});
 check("old-lock-sha",migration.parent?.lockSha256===OLD_LOCK,migration.parent?.lockSha256);
 check("new-lock-sha-policy",migration.current?.lockSha256===NEW_LOCK,migration.current?.lockSha256);
 check("new-lock-sha-bytes",sha(lockBytes)===NEW_LOCK,{actual:sha(lockBytes),expected:NEW_LOCK});
 const entries=Object.keys(lock.packages||{});
 check("package-count",entries.length===662,entries.length);
 check("package-count-policy",migration.current?.lockPackageEntries===662,migration.current?.lockPackageEntries);
 check("old-count-policy",migration.parent?.lockPackageEntries===655,migration.parent?.lockPackageEntries);
 check("added-count",migration.diff?.addedCount===22,migration.diff?.addedCount);
 check("removed-count",migration.diff?.removedCount===15,migration.diff?.removedCount);
 check("semantic-count",migration.diff?.semanticChangedCount===77,migration.diff?.semanticChangedCount);
 check("changed-count",migration.diff?.changedCount===111,migration.diff?.changedCount);
 check("top-level-diff-empty",migration.diff?.topLevelDiffs&&typeof migration.diff.topLevelDiffs==="object"&&Object.keys(migration.diff.topLevelDiffs).length===0,migration.diff?.topLevelDiffs);
 check("top-level-dependencies",JSON.stringify(lock.packages?.[""]?.dependencies)===JSON.stringify(pkg.dependencies),"dependencies");
 check("top-level-devDependencies",JSON.stringify(lock.packages?.[""]?.devDependencies)===JSON.stringify(pkg.devDependencies),"devDependencies");
 const internal=JSON.stringify(lock).match(/packages\.applied-caas-gateway|artifactory\/api\/npm\/npm-public/gu)||[];
 check("no-internal-registry",internal.length===0,internal.slice(0,5));
 const missingIntegrity=entries.filter(p=>p&&lock.packages[p]?.resolved&&!lock.packages[p]?.link&&!lock.packages[p]?.integrity);
 check("integrity-complete",missingIntegrity.length===0,missingIntegrity.slice(0,20));
 check("node-version",migration.runtime?.node==="24.18.0",migration.runtime?.node);
 check("npm-version",migration.runtime?.npm==="11.16.0",migration.runtime?.npm);
 check("playwright-version",migration.runtime?.playwright==="1.60.0",migration.runtime?.playwright);
 check("chromium-version",migration.runtime?.chromium==="148.0.7778.96",migration.runtime?.chromium);
 check("basic-commercial-mode",(product.match(/^ {6}commercialMode: "free_automated_informational_prescreen",$/gm)||[]).length===3,(product.match(/^ {6}commercialMode: "free_automated_informational_prescreen",$/gm)||[]).length);
 check("paid-commercial-mode",(product.match(/^ {6}commercialMode: "paid_automated_informational_analysis",$/gm)||[]).length===6,(product.match(/^ {6}commercialMode: "paid_automated_informational_analysis",$/gm)||[]).length);
 check("free-sale-decision",(product.match(/^ {6}saleDecision: "GO_FREE_INFORMATIONAL",$/gm)||[]).length===3,(product.match(/^ {6}saleDecision: "GO_FREE_INFORMATIONAL",$/gm)||[]).length);
 check("paid-sale-decision",(product.match(/^ {6}saleDecision: "PILOT_ONLY_PAID_INFORMATIONAL",$/gm)||[]).length===6,(product.match(/^ {6}saleDecision: "PILOT_ONLY_PAID_INFORMATIONAL",$/gm)||[]).length);
 check("issuer-count",(product.match(/^ {6}issuedBy: "Velmère Security",$/gm)||[]).length===9,(product.match(/^ {6}issuedBy: "Velmère Security",$/gm)||[]).length);
 check("generator-count",(product.match(/^ {6}generatedBy: "Velmère Security Engine",$/gm)||[]).length===9,(product.match(/^ {6}generatedBy: "Velmère Security Engine",$/gm)||[]).length);
 check("human-review-false",(product.match(/^ {6}humanReviewClaimAllowed: false,$/gm)||[]).length===9,(product.match(/^ {6}humanReviewClaimAllowed: false,$/gm)||[]).length);
 check("global-no-go",migration.truthBoundary?.liveCredit===false&&migration.truthBoundary?.saleCredit===false,migration.truthBoundary);
 const failures=rows.filter(x=>!x.passed);return{schemaVersion:"velmere.pass36.a102r44p5.exact-npm-lockfile-migration-verification.v1",status:failures.length?"FAIL_A102R44P5_EXACT_NPM_LOCKFILE_MIGRATION":"PASS_A102R44P5_EXACT_NPM_11_16_LOCKFILE_MIGRATION",checks:rows.length,passed:rows.length-failures.length,failed:failures.length,failures:failures.map(x=>x.id),rows,globalDecision:"NO_GO",live:false,saleEnabled:false};
}
if(path.resolve(process.argv[1]||"")===fileURLToPath(import.meta.url)){const out=verifyA102R44P5(process.cwd());console.log(JSON.stringify(out,null,2));if(out.failed)process.exit(1)}
