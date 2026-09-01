#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { evaluateA62Inputs } from "./a62-offline-runtime-dependency-lib.mjs";
import { A78_REVISION, expectedLockRows, readJson, runtimeCandidate, scanLockfileCasCoverage, sha256, validateA78Policy } from "./a78-exact-runtime-bootstrap-lib.mjs";
const root=process.cwd();
const policy=readJson(root,"config/pass36/a78-exact-runtime-lockfile-browser-bootstrap.json");
const a62=readJson(root,"config/pass36/a62-offline-exact-runtime-dependency-bootstrap.json");
const lockBytes=fs.readFileSync(policy.packageLock.path); const lock=JSON.parse(lockBytes);
const policyValidation=validateA78Policy(policy,lockBytes,{root});
const cas=scanLockfileCasCoverage(root,lock,policy.localCasDirectories);
const candidates=[];
const requested=(process.env.VELMERE_A78_RUNTIME_CANDIDATES??"").split(path.delimiter).filter(Boolean);
for(const candidate of [process.execPath,"/opt/pyvenv/lib/python3.13/site-packages/playwright/driver/node",...requested]){
  if(candidates.some((row)=>row.path===candidate))continue;
  const row=runtimeCandidate(candidate,candidate===process.execPath?path.join(path.dirname(process.execPath),"../lib/node_modules/npm/bin/npm-cli.js"):null); if(row)candidates.push(row);
}
let systemBrowser=null;
for(const candidate of [process.env.VELMERE_A78_SYSTEM_BROWSER,"/usr/bin/chromium","/usr/bin/google-chrome"].filter(Boolean)){
  if(!fs.existsSync(candidate))continue; const run=spawnSync(candidate,["--version"],{encoding:"utf8",env:{PATH:path.dirname(candidate),HOME:"/nonexistent",TMPDIR:"/tmp"}}); systemBrowser={path:candidate,version:run.status===0?run.stdout.trim():null,acceptedAsExactBundle:false}; break;
}
const supplied={nodeArchive:process.env.VELMERE_A78_NODE_ARCHIVE??null,dependencyBundle:process.env.VELMERE_A78_DEPENDENCY_BUNDLE??null,browserBundle:process.env.VELMERE_A78_BROWSER_BUNDLE??null,browserSha256:process.env.VELMERE_A78_EXPECTED_BROWSER_BUNDLE_SHA256??null};
const intake=evaluateA62Inputs({root,policy:a62,nodeArchivePath:supplied.nodeArchive,dependencyBundlePath:supplied.dependencyBundle,browserBundlePath:supplied.browserBundle,expectedBrowserBundleSha256:supplied.browserSha256,extractRuntime:false});
const allExact=intake.decision===a62.decisions.verifiedInputs&&cas.exactCoveredLockPaths===policy.packageLock.expectedRemotePackages;
const receipt={schemaVersion:"velmere.pass36.a78.local-artifact-availability-receipt.v1",revisionId:A78_REVISION,generatedAt:policy.deterministicEpoch,decision:allExact?policy.decisions.verified:policy.decisions.blocked,policyChecks:policyValidation.checks.length,policyPassed:policyValidation.passed,packageLock:{sha256:sha256(lockBytes),remotePackages:expectedLockRows(lock).length},localCas:{expectedLockPaths:cas.expectedLockPaths,exactCoveredLockPaths:cas.exactCoveredLockPaths,uncoveredLockPaths:cas.uncoveredLockPaths,uniqueCasTarballs:cas.uniqueCasTarballs,coveragePercent:cas.coveragePercent,coveredPathSetSha256:cas.coveredPathSetSha256,uncoveredPathSetSha256:cas.uncoveredPathSetSha256},runtimeCandidates:candidates,systemBrowser,inputIntake:{decision:intake.decision,summary:intake.summary,errors:intake.errors},exactCredits:{runtime:false,dependencies:false,browser:false,currentRootGate:false,a60:false},claims:{stagingProven:false,liveProven:false,saleEnabled:false},truthBoundary:policy.truthBoundary};
fs.writeFileSync("config/pass36/a78-local-artifact-availability-receipt.json",`${JSON.stringify(receipt,null,2)}\n`);
console.log(JSON.stringify(receipt,null,2));
