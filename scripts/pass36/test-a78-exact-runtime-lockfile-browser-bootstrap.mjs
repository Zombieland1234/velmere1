#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { A78_REVISION, buildIsolatedExecutionEnvironment, expectedLockRows, readJson, scanLockfileCasCoverage, sha256, snapshotTree, validateA78Policy } from "./a78-exact-runtime-bootstrap-lib.mjs";
import { createPortableRejectedSymlink } from "./portable-symlink-negative-fixture.mjs";
const root=process.cwd();
const policy=readJson(root,"config/pass36/a78-exact-runtime-lockfile-browser-bootstrap.json");
const lockBytes=fs.readFileSync(policy.packageLock.path);
const lock=JSON.parse(lockBytes);
let assertions=0;
const check=(condition,message)=>{assert.ok(condition,message);assertions++;};
const validation=validateA78Policy(policy,lockBytes,{root});
check(validation.passed,"policy must pass");
check(validation.checks.length>=16,"policy denominator");
check(expectedLockRows(lock).length===654,"lock denominator exact");
check(sha256(lockBytes)===policy.packageLock.sha256,"lock hash exact");
const cas=scanLockfileCasCoverage(root,lock,policy.localCasDirectories);
check(cas.exactCoveredLockPaths===48,"CAS exact coverage must remain measured");
check(cas.uncoveredLockPaths===606,"CAS missing denominator");
check(cas.coveragePercent===7.339,"CAS percentage exact");
check(cas.exactCoveredLockPaths+cas.uncoveredLockPaths===654,"CAS denominator cannot collapse");
check(cas.exactCoveredLockPaths<policy.packageLock.expectedRemotePackages,"partial CAS cannot promote");
const collapsedPolicy=structuredClone(policy);
collapsedPolicy.packageLock.expectedRemotePackages=653;
check(!validateA78Policy(collapsedPolicy,lockBytes,{root}).passed,"lock denominator collapse rejected");
const driftedLockPolicy=structuredClone(policy);
driftedLockPolicy.packageLock.sha256="0".repeat(64);
check(!validateA78Policy(driftedLockPolicy,lockBytes,{root}).passed,"lock hash drift rejected");
const driftedBrowserPolicy=structuredClone(policy);
driftedBrowserPolicy.browserBundle.browserRevision="1222";
check(!validateA78Policy(driftedBrowserPolicy,lockBytes,{root}).passed,"browser revision drift rejected");
const parentEnv={PATH:"/host/bin",STRIPE_SECRET_KEY:"sk_secret",NODE_OPTIONS:"--require evil",LD_PRELOAD:"/evil.so",SystemRoot:"C:\\Windows",ComSpec:"C:\\Windows\\cmd.exe",PATHEXT:".EXE"};
const isolated=buildIsolatedExecutionEnvironment({runtimeBin:"/exact/node/bin",runtimeRoot:"/exact/node",npmCliPath:"/exact/node/lib/node_modules/npm/bin/npm-cli.js",artifactRoot:"/artifacts/a78",browserExecutable:"/exact/browser/chrome",sourceManifestSha256:"a".repeat(64),platform:"linux",parentEnv});
check(isolated.PATH==="/exact/node/bin","system PATH must not be inherited"); for(const key of ["STRIPE_SECRET_KEY","NODE_OPTIONS","LD_PRELOAD"])check(!(key in isolated),`${key} excluded`); check(isolated.npm_config_offline==="true","npm offline"); check(isolated.npm_config_ignore_scripts==="true","scripts disabled"); check(isolated.VELMERE_PLAYWRIGHT_EXECUTABLE_PATH==="/exact/browser/chrome","browser exact");
const win=buildIsolatedExecutionEnvironment({runtimeBin:"C:\\node",runtimeRoot:"C:\\node",npmCliPath:"C:\\node\\node_modules\\npm\\bin\\npm-cli.js",artifactRoot:"C:\\a78",browserExecutable:"C:\\browser\\chrome.exe",sourceManifestSha256:"b".repeat(64),platform:"win32",parentEnv}); check(win.SystemRoot==="C:\\Windows"&&win.ComSpec.endsWith("cmd.exe"),"Windows minimum environment"); check(!("STRIPE_SECRET_KEY" in win),"Windows secret excluded");
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"a78-tree-"));
const linkPath=path.join(temp,"bin/npm");
fs.mkdirSync(path.join(temp,"bin"));
fs.writeFileSync(path.join(temp,"bin/node"),"node",{mode:0o755});
let portableLink=createPortableRejectedSymlink(linkPath,"node");
try {
  const before=snapshotTree(temp);
  const again=snapshotTree(temp);
  check(before.digest===again.digest,"tree deterministic");
  fs.appendFileSync(path.join(temp,"bin/node"),"x");
  const after=snapshotTree(temp);
  check(before.digest!==after.digest,"file mutation detected");
  portableLink.cleanup();
  portableLink=createPortableRejectedSymlink(linkPath,"other");
  check(after.digest!==snapshotTree(temp).digest,"symlink or reparse-point mutation detected");
} finally {
  portableLink.cleanup();
  fs.rmSync(temp,{recursive:true,force:true});
}
const runner=fs.readFileSync("scripts/a62-offline-exact-runtime-dependency-bootstrap.mjs","utf8"); check(runner.includes("buildIsolatedExecutionEnvironment"),"runner isolated environment"); check(runner.includes("snapshotTree(runtime.runtimeRoot)"),"runtime tree snapshot"); check(runner.includes("a62_runtime_tree_mutated_during_bootstrap"),"runtime mutation fail closed"); check(!runner.includes("env: { ...process.env, ...env }"),"parent environment not inherited"); check(!runner.includes("fs.writeFileSync(command, body"),"runtime npm wrapper not overwritten");
const guard=fs.readFileSync("lib/market-integrity/api-guardrails.ts","utf8"); check(guard.includes("if (!result.ok)"),"deny branch first"); check(guard.includes("response: result.response"),"original denial response bound"); for(const f of ["source-snapshots.ts","evidence-export.ts","investigator.ts","readiness.ts"]){const text=fs.readFileSync(`lib/server/market-integrity-route-modules/${f}`,"utf8");check(text.includes("return rateLimit.response;"),`${f} direct denial return`);}
const gate=fs.readFileSync("scripts/pass6/run-critical-offline-gate.mjs","utf8"); check(gate.includes("a78_current_root_descendant_integrity"),"gate uses descendant chain"); check(!gate.includes("a77_clean_root_genesis_integrity"),"gate does not compare descendants to frozen genesis");
const a77lib=fs.readFileSync("scripts/pass36/a77-clean-root-migration-lib.mjs","utf8"); check(a77lib.includes("verifyCurrentPayload !== false"),"historical genesis supports descendant verification");
const missing=readJson(root,"config/pass36/a78-local-artifact-availability-receipt.json");
check(missing.exactCredits.runtime===false&&missing.exactCredits.dependencies===false&&missing.exactCredits.browser===false,"historical availability has no false exact credit");
const migrationVerifier=fs.readFileSync("scripts/pass36/verify-a102r41-a78-lockfile-denominator-migration.mjs","utf8");
check(migrationVerifier.includes("all-frozen-test-paths-retained"),"formal denominator migration verifier present");
const receipt={schemaVersion:"velmere.pass36.a78.exact-runtime-lockfile-browser-bootstrap-test.v2",revisionId:A78_REVISION,status:"PASS_A78_STATIC_AND_ADVERSARIAL",generatedAt:policy.deterministicEpoch,assertions,policyChecks:validation.checks.length,lockPackages:expectedLockRows(lock).length,localCasCovered:cas.exactCoveredLockPaths,localCasMissing:cas.uncoveredLockPaths,isolatedEnvironment:true,runtimeMutationDetection:true,directDenialResponse:true,descendantLineage:true,denominatorMigrationVerifiedByDedicatedTest:true,physicalExactInputsSupplied:false,liveProven:false,saleEnabled:false,truthBoundary:policy.truthBoundary};
const receiptOutput=String(process.env.VELMERE_TEST_RECEIPT_OUTPUT??"").trim();
if(receiptOutput){
  const absoluteOutput=path.resolve(receiptOutput);
  const relative=path.relative(root,absoluteOutput);
  if(relative===""||(!relative.startsWith("..")&&!path.isAbsolute(relative)))throw new Error("a78_receipt_output_must_be_outside_source_root");
  fs.mkdirSync(path.dirname(absoluteOutput),{recursive:true});
  fs.writeFileSync(absoluteOutput,`${JSON.stringify(receipt,null,2)}\n`,{flag:"wx"});
}
console.log(JSON.stringify(receipt,null,2));
