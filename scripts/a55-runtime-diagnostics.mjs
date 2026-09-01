#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { currentNpmVersion } from "./lib/velmere-runtime-contract.mjs";
const root = process.cwd(); const write = process.argv.includes("--write"); const staticOnly = process.argv.includes("--static");
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a55-independent-retest-legal-customer-release-acceptance.json"), "utf8"));
const checks = []; const check = (id, ok, detail=null, skipped=false)=>checks.push({id,ok:Boolean(ok),detail,skipped:Boolean(skipped)});
const required = ["config/pass35/a55-independent-retest-legal-customer-release-acceptance.json","config/pass35/a55-source-manifest.json","scripts/a55-independent-retest-legal-customer-release-acceptance.mjs","scripts/a55-package-evidence.mjs","scripts/a55-runtime-diagnostics.mjs","scripts/pass35/test-a55-independent-retest-legal-customer-release-acceptance.mjs","scripts/pass35/test-a55-independent-retest-legal-customer-release-fixture.mjs","scripts/pass35/verify-a55-source-manifest.mjs","VELMERE_RUN_A55_INDEPENDENT_RETEST_LEGAL_CUSTOMER_RELEASE_ACCEPTANCE.cmd","VELMERE_A55_PATCH.txt"];
for (const file of required) check(`file:${file}`, fs.existsSync(path.join(root,file)), file);
check("contract:revision", contract.revisionId === "VELMERE_PASS35_A55_INDEPENDENT_RETEST_LEGAL_CUSTOMER_RELEASE_ACCEPTANCE", contract.revisionId);
check("contract:reports", contract.reportTypes?.length === 5, contract.reportTypes);
check("contract:env", contract.requiredEnvironment?.length === 8, contract.requiredEnvironment);
const regression = spawnSync(process.execPath,["scripts/pass35/test-a55-independent-retest-legal-customer-release-acceptance.mjs"],{cwd:root,encoding:"utf8",maxBuffer:128*1024*1024});
check("regression:a55_contract", regression.status===0,{status:regression.status,stdout:regression.stdout?.trim(),stderr:regression.stderr?.trim()});
if (staticOnly) { check("runtime:node_exact",true,{observed:process.versions.node,expected:contract.runtime.node},true); check("runtime:npm_exact",true,{observed:currentNpmVersion(),expected:contract.runtime.npm},true); }
else { check("runtime:node_exact",process.versions.node===contract.runtime.node,{observed:process.versions.node,expected:contract.runtime.node}); check("runtime:npm_exact",currentNpmVersion()===contract.runtime.npm,{observed:currentNpmVersion(),expected:contract.runtime.npm}); }
for (const name of contract.requiredEnvironment) check(`env:${name}`, staticOnly || Boolean(process.env[name]), {present:Boolean(process.env[name])}, staticOnly);
const failures=checks.filter((r)=>!r.ok); const report={schemaVersion:"velmere.pass35.a55.runtime-diagnostics.v1",revisionId:contract.revisionId,generatedAt:new Date().toISOString(),truthBoundary:staticOnly?"Static A55 diagnostics; no external assurance, canary, LIVE or sale credit.":"Exact A55 preflight; file paths and hashes only, no private key material.",runtime:{node:process.versions.node,npm:currentNpmVersion(),expectedNode:contract.runtime.node,expectedNpm:contract.runtime.npm},summary:{checks:checks.length,passed:checks.length-failures.length,failed:failures.length,skipped:checks.filter((r)=>r.skipped).length},failures,checks};
if(write){const target=path.join(root,"artifacts/pass35/a55/PASS35_A55_RUNTIME_DIAGNOSTICS.json");fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,`${JSON.stringify(report,null,2)}\n`);} console.log(JSON.stringify(report.summary,null,2)); if(failures.length)process.exit(1);
