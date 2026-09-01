#!/usr/bin/env node
import fs from "node:fs";import path from "node:path";import {evaluateAdmission,assertNoSecretLeak,sha256} from "./a95-staging-subject-lib.mjs";
const root=process.cwd();const read=(p)=>{try{return JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));}catch{return null;}};
const policy=read("config/pass36/a95-staging-subject-admission-policy.json");
const exactReceipts=Object.fromEntries(policy.exactReleasePrerequisites.map((row)=>[row.id,read(row.path)]));
const context={authority:read(policy.subject.authorityPath),descendant:read(policy.subject.descendantManifestPath),sourcePackageManifest:read(policy.subject.sourcePackageManifestPath),exactReceipts,currentRootReceipt:read(policy.currentRootReceipt.path),environment:process.env,sourceRoot:root,executeRequested:false,fixtureMode:false};
const before=fs.existsSync(policy.subject.descendantManifestPath)?sha256(fs.readFileSync(policy.subject.descendantManifestPath)):null;
const report=evaluateAdmission(context,policy);report.executedStages=0;report.mutationStarted=false;report.sourceFingerprintBefore=before;report.sourceFingerprintAfter=before;report.sourceUnchanged=true;report.decision=report.preflightPassed?policy.decisions.ready:policy.decisions.blocked;
assertNoSecretLeak(report,process.env,policy);
if(process.env.VELMERE_A95_NO_WRITE!=="1"){const out=path.join(root,"artifacts/pass36/a95");fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,"PASS36_A95_STAGING_SUBJECT_ADMISSION.json"),JSON.stringify(report,null,2)+"\n");}
console.log(JSON.stringify({decision:report.decision,preflightPassed:report.preflightPassed,executedStages:0,mutationStarted:false,failedChecks:report.summary.failed},null,2));
process.exit(report.preflightPassed?0:2);
