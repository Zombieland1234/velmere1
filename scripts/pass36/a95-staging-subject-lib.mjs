#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawnSync } from "node:child_process";

export const DIGEST=/^[a-f0-9]{64}$/u;
export const PROGRAM_ID=/^[A-Za-z0-9][A-Za-z0-9._-]{15,95}$/u;
export const ENVIRONMENT_ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/u;
export const sha256=(value)=>crypto.createHash("sha256").update(value).digest("hex");
export function canonicalJson(value){
  if(Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if(value&&typeof value==="object") return `{${Object.keys(value).sort().map((key)=>`${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
export function decisionOf(value){
  if(typeof value?.decision==="string") return value.decision;
  if(typeof value?.decision?.state==="string") return value.decision.state;
  if(typeof value?.status==="string") return value.status;
  return null;
}
export function sourceBindingOf(value){
  const candidates=[value?.subject?.sourcePackageManifestSha256,value?.subject?.sourceManifestSha256,value?.sourcePackageManifestSha256,value?.sourceManifestSha256,value?.source?.manifestSha256,value?.bindings?.sourceManifestSha256];
  return candidates.find((candidate)=>DIGEST.test(String(candidate??"")))??null;
}
function add(checks,id,passed,detail=null){checks.push({id,passed:Boolean(passed),detail});}
function isFixture(value){return value?.fixture===true||value?.fixtureMode===true||String(decisionOf(value)??"").startsWith("FIXTURE_");}
function isPrivateIpv4(host){
  const p=host.split(".").map(Number); if(p.length!==4||p.some((x)=>!Number.isInteger(x)||x<0||x>255)) return false;
  return p[0]===10||p[0]===127||p[0]===0||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168)||(p[0]>=224);
}
function unsafeHost(host){
  const lower=host.toLowerCase().replace(/\.$/u,"");
  if(lower==="localhost"||lower.endsWith(".localhost")||lower==="localhost.localdomain") return "localhost";
  const family=net.isIP(lower);
  if(family===4) return isPrivateIpv4(lower)?"private_ipv4":"ip_literal";
  if(family===6) return "ip_literal";
  if(lower==="0"||lower.endsWith(".local")||lower.endsWith(".internal")||lower.endsWith(".home")||lower.endsWith(".lan")) return "local_name";
  return null;
}
export function selectRelevantEnvironment(environment,policy){
  const allowed=new Set(policy.environment.allowedNames);
  const osAllowed=new Set(policy.environment.allowedOperatingSystemNames??[]);
  const relevantPrefixes=policy.environment.relevantNamePrefixes??[];
  const selected={}; const unknownRelevant=[]; const ignored=[];
  for(const [name,raw] of Object.entries(environment??{})){
    if(raw===undefined||raw===null||String(raw).length===0) continue;
    if(allowed.has(name)||osAllowed.has(name)) selected[name]=String(raw);
    else if(relevantPrefixes.some((prefix)=>name.startsWith(prefix))) unknownRelevant.push(name);
    else ignored.push(name);
  }
  return {selected,unknownRelevant:unknownRelevant.sort(),ignoredCount:ignored.length};
}
export function sanitizedEnvironment(environment,policy){
  const {selected,unknownRelevant}=selectRelevantEnvironment(environment,policy);
  const result={};
  for(const name of policy.environment.allowedOperatingSystemNames??[]) if(selected[name]!==undefined) result[name]=selected[name];
  for(const name of policy.environment.allowedNames) if(selected[name]!==undefined) result[name]=selected[name];
  return {environment:result,unknownRelevant};
}
function validateFileReference(name,value,sourceRoot,checks,allowMissing=false){
  if(!value){add(checks,`file:${name}:configured`,allowMissing,false);return null;}
  const absolute=path.resolve(value); add(checks,`file:${name}:absolute`,path.isAbsolute(value),null);
  const rel=path.relative(path.resolve(sourceRoot),absolute); add(checks,`file:${name}:outside-source`,rel===".."||rel.startsWith(`..${path.sep}`)||path.isAbsolute(rel),null);
  try{
    const st=fs.lstatSync(absolute); add(checks,`file:${name}:regular`,st.isFile()&&!st.isSymbolicLink(),{isFile:st.isFile(),isSymlink:st.isSymbolicLink()}); return {absolute,byteLength:st.size,sha256:sha256(fs.readFileSync(absolute))};
  }catch(error){add(checks,`file:${name}:exists`,false,error?.code??"unavailable");return null;}
}
function environmentDigest(selected,policy){
  const secretSet=new Set(policy.environment.secretNames??[]);
  const rows=Object.keys(selected).sort().map((name)=>({name,valueSha256:sha256(selected[name]),secret:secretSet.has(name)}));
  return sha256(canonicalJson(rows));
}
function verifySourceArchive(archive,selected,policy,sourceRoot,checks){
  const verifier=path.join(path.resolve(sourceRoot),"scripts/pass36/verify-staging-source-archive.py");
  add(checks,"archive:verifier-present",fs.existsSync(verifier),null);
  if(!fs.existsSync(verifier)) return null;
  const expectedBytes=Number(selected.VELMERE_A95_EXPECTED_SOURCE_ARCHIVE_BYTES);
  const result=spawnSync("python3",[
    verifier,
    "--archive",archive.absolute,
    "--expected-archive-sha256",String(selected.VELMERE_A95_EXPECTED_SOURCE_ARCHIVE_SHA256??""),
    "--expected-archive-bytes",String(expectedBytes),
    "--expected-manifest-sha256",String(selected.VELMERE_A95_EXPECTED_SOURCE_MANIFEST_SHA256??""),
    "--expected-revision",policy.revisionId,
  ],{cwd:path.resolve(sourceRoot),encoding:"utf8",shell:false,timeout:120_000,maxBuffer:4*1024*1024,env:{PATH:process.env.PATH??""}});
  let report=null;
  try{report=JSON.parse(String(result.stdout??"").trim());}catch{
    // The explicit verifier-output check below records a parse failure without exposing stderr.
  }
  add(checks,"archive:structural-verifier-exit",result.status===0,{status:result.status,signal:result.signal});
  add(checks,"archive:structural-verifier-report",report?.status==="PASS_STAGING_SOURCE_ARCHIVE_STRUCTURAL_BINDING"&&report?.failed===0,report?{status:report.status,checks:report.checks,failed:report.failed}:null);
  add(checks,"archive:embedded-manifest-binding",report?.manifestSha256===selected.VELMERE_A95_EXPECTED_SOURCE_MANIFEST_SHA256,report?.manifestSha256??null);
  return report;
}
export function validateEnvironment(environment,policy,sourceRoot="."){
  const checks=[]; const selection=selectRelevantEnvironment(environment,policy); const selected=selection.selected;
  add(checks,"environment:unknown-relevant-zero",selection.unknownRelevant.length===0,selection.unknownRelevant);
  for(const name of policy.environment.commonRequiredNames) add(checks,`environment:${name}`,typeof selected[name]==="string"&&selected[name].length>0,Boolean(selected[name]));
  add(checks,"environment:program-id",PROGRAM_ID.test(String(selected.VELMERE_A95_PROGRAM_ID??"")),selected.VELMERE_A95_PROGRAM_ID??null);
  add(checks,"environment:staging-id",ENVIRONMENT_ID.test(String(selected.VELMERE_A95_STAGING_ENVIRONMENT_ID??"")),selected.VELMERE_A95_STAGING_ENVIRONMENT_ID??null);
  add(checks,"environment:project-class",selected.VELMERE_A95_PROJECT_CLASS===policy.environment.projectClass,selected.VELMERE_A95_PROJECT_CLASS??null);
  add(checks,"environment:confirmation",selected.VELMERE_A95_CONFIRM===policy.environment.confirmationToken,Boolean(selected.VELMERE_A95_CONFIRM));
  const urls=[];
  for(const name of policy.environment.urlNames??[]){
    const raw=selected[name]; if(!raw) continue; let parsed=null; try{parsed=new URL(raw);}catch{
      // The explicit invalid-URL check below records this parse failure.
    }
    add(checks,`url:${name}:valid`,Boolean(parsed),null); if(!parsed) continue;
    add(checks,`url:${name}:https`,parsed.protocol==="https:",parsed.protocol);
    add(checks,`url:${name}:credentials`,!parsed.username&&!parsed.password,Boolean(parsed.username||parsed.password));
    add(checks,`url:${name}:query`,parsed.search==="",parsed.search?true:false);
    add(checks,`url:${name}:fragment`,parsed.hash==="",parsed.hash?true:false);
    const hostReason=unsafeHost(parsed.hostname); add(checks,`url:${name}:public-host`,hostReason===null,hostReason);
    const labels=parsed.hostname.toLowerCase().split(/[.-]/u); const rejected=(policy.urlSafety.rejectHostnameTokens??[]).filter((token)=>labels.includes(token));
    add(checks,`url:${name}:not-production`,rejected.length===0,rejected);
    const hasHint=(policy.urlSafety.requireHostnameHints??[]).some((token)=>parsed.hostname.toLowerCase().includes(token)); add(checks,`url:${name}:staging-hint`,hasHint,parsed.hostname);
    urls.push({name,origin:parsed.origin,hostname:parsed.hostname.toLowerCase()});
  }
  const origins=[...new Set(urls.map((row)=>row.origin))]; add(checks,"url:origin-diversity",origins.length>=policy.environment.minimumDistinctOrigins,origins.length);
  const secrets=[];
  for(const name of policy.environment.secretNames??[]){
    const value=selected[name]; if(!value) continue; secrets.push({name,value});
    add(checks,`secret:${name}:length`,value.length>=policy.environment.minimumSecretLength,value.length);
    const livePrefix=(policy.urlSafety.rejectLivePaymentPrefixes??[]).find((prefix)=>value.startsWith(prefix)); add(checks,`secret:${name}:not-live`,!livePrefix,livePrefix??null);
  }
  const secretDigests=secrets.map((row)=>sha256(row.value)); add(checks,"secret:distinct",new Set(secretDigests).size===secretDigests.length,secrets.length);
  const emailValues=[];
  for(const name of policy.environment.emailNames??[]){const value=selected[name];if(value) emailValues.push({name,value:value.trim().toLowerCase()});}
  const tenantEmails=emailValues.filter((row)=>/(?:TENANT_[AB]|TEST_ACCOUNT)_EMAIL$/u.test(row.name)); add(checks,"email:tenant-distinct",new Set(tenantEmails.map((row)=>row.value)).size===tenantEmails.length,tenantEmails.length);
  const archive=validateFileReference("VELMERE_A95_SOURCE_ARCHIVE_PATH",selected.VELMERE_A95_SOURCE_ARCHIVE_PATH,sourceRoot,checks);
  if(archive){
    add(checks,"archive:sha-format",DIGEST.test(String(selected.VELMERE_A95_EXPECTED_SOURCE_ARCHIVE_SHA256??"")),null);
    add(checks,"archive:sha-match",archive.sha256===selected.VELMERE_A95_EXPECTED_SOURCE_ARCHIVE_SHA256,{observed:archive.sha256});
    const expectedBytes=Number(selected.VELMERE_A95_EXPECTED_SOURCE_ARCHIVE_BYTES); add(checks,"archive:bytes-integer",Number.isSafeInteger(expectedBytes)&&expectedBytes>0,selected.VELMERE_A95_EXPECTED_SOURCE_ARCHIVE_BYTES??null);
    add(checks,"archive:bytes-match",archive.byteLength===expectedBytes,{observed:archive.byteLength,expected:expectedBytes});
    archive.verification=verifySourceArchive(archive,selected,policy,sourceRoot,checks);
  }
  add(checks,"source-manifest:sha-format",DIGEST.test(String(selected.VELMERE_A95_EXPECTED_SOURCE_MANIFEST_SHA256??"")),selected.VELMERE_A95_EXPECTED_SOURCE_MANIFEST_SHA256??null);
  return {checks,passed:checks.every((row)=>row.passed),selectedNames:Object.keys(selected).sort(),unknownRelevant:selection.unknownRelevant,ignoredCount:selection.ignoredCount,originCount:origins.length,secretCount:secrets.length,aggregateSha256:environmentDigest(selected,policy),archive};
}
function validateReceipt(row,context,checks){
  const receipt=context.exactReceipts?.[row.id]??null; add(checks,`exact:${row.id}:present`,Boolean(receipt),Boolean(receipt)); if(!receipt)return;
  add(checks,`exact:${row.id}:revision`,receipt.revisionId===row.revisionId,receipt.revisionId??null);
  add(checks,`exact:${row.id}:decision`,decisionOf(receipt)===row.decision,decisionOf(receipt));
  add(checks,`exact:${row.id}:non-fixture`,!isFixture(receipt),isFixture(receipt));
  add(checks,`exact:${row.id}:source-binding-exact`,sourceBindingOf(receipt)===context.sourcePackageManifestSha256,sourceBindingOf(receipt));
  add(checks,`exact:${row.id}:no-promotion`,receipt.liveProven!==true&&receipt.saleEnabled!==true&&receipt.productionApproved!==true,{live:receipt.liveProven,sale:receipt.saleEnabled,production:receipt.productionApproved});
}
export function evaluateAdmission(context,policy){
  const checks=[];
  const authority=context.authority??{}; const descendant=context.descendant??{}; const packageManifest=context.sourcePackageManifest??{};
  add(checks,"subject:authority-revision",authority.authorityRevisionId===policy.revisionId&&authority.currentSource?.revisionId===policy.revisionId,authority.authorityRevisionId??null);
  add(checks,"subject:authority-parent",authority.parentRevisionId===policy.parentRevisionId&&authority.currentSource?.parentRevisionId===policy.parentRevisionId,authority.parentRevisionId??null);
  add(checks,"subject:authority-no-promotion",authority.claims?.liveProven===false&&authority.claims?.saleEnabled===false&&authority.claims?.productionApproved===false&&authority.claims?.worldClassProven===false,authority.claims??null);
  add(checks,"subject:descendant-revision",descendant.revisionId===policy.revisionId&&descendant.parentRevisionId===policy.parentRevisionId,{revision:descendant.revisionId,parent:descendant.parentRevisionId});
  add(checks,"subject:descendant-manifest-digest",DIGEST.test(String(descendant.manifestDigestSha256??"")),descendant.manifestDigestSha256??null);
  add(checks,"subject:descendant-checkpoint",descendant.checkpointClass===policy.subject.requiredCheckpointClass&&descendant.completedThrough===policy.subject.completedThrough,{class:descendant.checkpointClass,completed:descendant.completedThrough});
  add(checks,"subject:descendant-no-promotion",descendant.claims?.stagingExecuted===false&&descendant.claims?.liveProven===false&&descendant.claims?.saleEnabled===false&&descendant.claims?.productionApproved===false&&descendant.claims?.worldClassProven===false,descendant.claims??null);
  add(checks,"subject:package-manifest-present",Boolean(packageManifest),Boolean(packageManifest));
  add(checks,"subject:package-manifest-revision",packageManifest.revisionId===policy.revisionId,packageManifest.revisionId??null);
  add(checks,"subject:package-manifest-digest",DIGEST.test(String(packageManifest.manifestSha256??"")),packageManifest.manifestSha256??null);
  add(checks,"subject:package-no-promotion",packageManifest.exactReleaseCredit===false&&packageManifest.live===false&&packageManifest.saleEnabled===false&&packageManifest.productionApproved===false&&packageManifest.worldClassProven===false,packageManifest);
  context.sourcePackageManifestSha256=packageManifest.manifestSha256??null;
  for(const row of policy.exactReleasePrerequisites) validateReceipt(row,context,checks);
  const critical=context.currentRootReceipt??{}; const summary=critical.summary??critical;
  add(checks,"current-root:suites",Number(summary.suites??summary.suiteCount)===policy.currentRootReceipt.requiredSuites,summary.suites??summary.suiteCount??null);
  add(checks,"current-root:passed",Number(summary.passed??summary.passedSuiteCount)===policy.currentRootReceipt.requiredPassed,summary.passed??summary.passedSuiteCount??null);
  const blocked=Number(summary.blocked??summary.exactByteBlocked??0)+Number(summary.runtimeDependencyBlocked??0); add(checks,"current-root:blocked-zero",blocked===policy.currentRootReceipt.requiredBlocked,blocked);
  add(checks,"current-root:semantic-zero",Number(summary.semanticFailures??summary.semanticOrUnknownFailed??0)===policy.currentRootReceipt.requiredSemanticFailures,summary.semanticFailures??summary.semanticOrUnknownFailed??null);
  add(checks,"current-root:exact-credit",critical.exactRuntimeProven===true&&critical.criticalGate30Of30Credit===true,{exactRuntimeProven:critical.exactRuntimeProven,credit:critical.criticalGate30Of30Credit});
  const environment=validateEnvironment(context.environment??{},policy,context.sourceRoot??process.cwd()); checks.push(...environment.checks);
  const passed=checks.every((row)=>row.passed);
  return {schemaVersion:"velmere.pass36.a95.staging-subject-admission-evaluation.v1",revisionId:policy.revisionId,parentRevisionId:policy.parentRevisionId,decision:passed?policy.decisions.ready:policy.decisions.blocked,preflightPassed:passed,mutationAllowed:passed&&context.executeRequested===true,stageCallsAllowed:passed&&context.executeRequested===true?policy.stages.length:0,checks,summary:{total:checks.length,passed:checks.filter((row)=>row.passed).length,failed:checks.filter((row)=>!row.passed).length,exactPrerequisitesVerified:policy.exactReleasePrerequisites.filter((row)=>Boolean(context.exactReceipts?.[row.id])).length,environmentPassed:environment.passed},environment:{selectedNames:environment.selectedNames,unknownRelevant:environment.unknownRelevant,ignoredCount:environment.ignoredCount,originCount:environment.originCount,secretCount:environment.secretCount,aggregateSha256:environment.aggregateSha256,archive:environment.archive?{byteLength:environment.archive.byteLength,sha256:environment.archive.sha256,structuralStatus:environment.archive.verification?.status??"NOT_VERIFIED",entryCount:environment.archive.verification?.entryCount??0,manifestSha256:environment.archive.verification?.manifestSha256??null}:null},subject:{sourcePackageManifestSha256:context.sourcePackageManifestSha256,descendantManifestSha256:descendant.manifestDigestSha256??null},fixtureMode:Boolean(context.fixtureMode),stagingCredit:false,liveProven:false,saleEnabled:false,productionApproved:false,worldClassProven:false,truthBoundary:policy.truthBoundary};
}
export function assertNoSecretLeak(report,environment,policy){
  const text=JSON.stringify(report); for(const name of policy.environment.secretNames??[]){const value=environment?.[name];if(typeof value==="string"&&value&&text.includes(value)) throw new Error(`a95_secret_leak:${name}`);} return true;
}
