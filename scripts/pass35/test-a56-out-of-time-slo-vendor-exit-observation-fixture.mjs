#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { crc32 } from "../lib/a47-safe-zip.mjs";

const root = process.cwd();
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a56-out-of-time-slo-vendor-exit-observation-acceptance.json"), "utf8"));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a56-fixture-"));
const checks = []; let scenarioCount = 0;
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const shaText = (value) => sha256(Buffer.from(String(value), "utf8"));
const json = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
const canonicalize = (value) => Array.isArray(value) ? `[${value.map(canonicalize).join(",")}]` : value && typeof value === "object" ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}` : JSON.stringify(value);
function zipStore(output, entries) {
  const locals = []; const centrals = []; let offset = 0;
  for (const [name, dataRaw] of entries) {
    const data = Buffer.isBuffer(dataRaw) ? dataRaw : Buffer.from(dataRaw); const nameBytes = Buffer.from(name); const crc = crc32(data);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50,0); local.writeUInt16LE(20,4); local.writeUInt16LE(0x0800,6); local.writeUInt16LE(0,8); local.writeUInt32LE(crc,14); local.writeUInt32LE(data.length,18); local.writeUInt32LE(data.length,22); local.writeUInt16LE(nameBytes.length,26);
    locals.push(local,nameBytes,data);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50,0); central.writeUInt16LE(20,4); central.writeUInt16LE(20,6); central.writeUInt16LE(0x0800,8); central.writeUInt16LE(0,10); central.writeUInt32LE(crc,16); central.writeUInt32LE(data.length,20); central.writeUInt32LE(data.length,24); central.writeUInt16LE(nameBytes.length,28); central.writeUInt32LE(offset,42);
    centrals.push(central,nameBytes); offset += local.length + nameBytes.length + data.length;
  }
  const centralBytes = Buffer.concat(centrals); const localBytes = Buffer.concat(locals); const eocd = Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50,0); eocd.writeUInt16LE(entries.length,8); eocd.writeUInt16LE(entries.length,10); eocd.writeUInt32LE(centralBytes.length,12); eocd.writeUInt32LE(localBytes.length,16);
  fs.writeFileSync(output, Buffer.concat([localBytes,centralBytes,eocd]));
}
const subjectOrg = sha256("velmere-subject-org");
function makeKey(keyId, organizationIdHash, affiliation, roles) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  return { keyId, organizationIdHash, affiliation, roles, conflictOfInterest: false, algorithm: "ED25519", publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(), privateKey };
}
const keys = {
  owner: makeKey("owner-key", subjectOrg, "SUBJECT", [contract.roles.operationsOwner]),
  chair: makeKey("chair-key", sha256("chair-org"), "INDEPENDENT", [contract.roles.assuranceChair]),
  observer1: makeKey("observer-1-key", sha256("observer-org-1"), "INDEPENDENT", [contract.roles.runObserver]),
  observer2: makeKey("observer-2-key", sha256("observer-org-2"), "INDEPENDENT", [contract.roles.runObserver])
};
function trustRows(overrides = {}) {
  return Object.values(keys).map((key) => ({ keyId: key.keyId, algorithm: key.algorithm, publicKeyPem: key.publicKeyPem, organizationIdHash: key.organizationIdHash, affiliation: key.affiliation, roles: key.roles, conflictOfInterest: false, ...(overrides[key.keyId] ?? {}) }));
}
function writeTrust(file, overrides = {}) {
  const now = Date.now(); const data = json({ schemaVersion: "velmere.pass35.a56.trust-roots.v1", subjectOrganizationIdHash: subjectOrg, issuedAt: new Date(now - 3600_000).toISOString(), expiresAt: new Date(now + 30*86400_000).toISOString(), keys: trustRows(overrides) });
  fs.writeFileSync(file,data); return sha256(data);
}
function signObject(base, signers, corruptRole = null) {
  const payload = Buffer.from(canonicalize(base), "utf8");
  const signatures = signers.map(({ key, role }) => ({ keyId: key.keyId, role, signatureBase64: crypto.sign(null,payload,key.privateKey).toString("base64") }));
  if (corruptRole) { const row = signatures.find((s)=>s.role===corruptRole); row.signatureBase64 = Buffer.from("corrupt").toString("base64"); }
  return { ...base, signatures };
}
function manifest(schemaVersion, revisionId, entries) { return json({ schemaVersion, revisionId, generatedAt: new Date().toISOString(), files: entries.map(([name,data])=>({path:name,bytes:data.length,sha256:sha256(data)})).sort((a,b)=>a.path.localeCompare(b.path)) }); }
function makeA55Evidence(output, options = {}) {
  const sourceManifestSha = options.sourceManifestSha ?? sha256("a54-frozen-source-manifest");
  const receipt = json({ schemaVersion: "velmere.pass35.a55.independent-retest-legal-customer-release-acceptance-receipt.v1", revisionId: contract.requiredA55RevisionId, parentRevisionId: contract.requiredA54RevisionId, generatedAt: new Date().toISOString(), fixtureMode: options.fixtureMode ?? false, decision: options.decision ?? contract.requiredA55Decision, independentAssuranceProven: options.independentAssuranceProven ?? true, controlledCanaryPreparationApproved: true, productionApproved: false, liveProven: false, saleEnabled: false, summary: { checks: 20, passed: options.failed ? 19 : 20, failed: options.failed ? 1 : 0 }, a54: { sourceManifestSha256: sourceManifestSha, manifestSha256: sha256("a54-manifest") } });
  const entries = [["PASS35_A55_INDEPENDENT_RETEST_LEGAL_CUSTOMER_RELEASE_ACCEPTANCE.json",receipt],["PASS35_A55_INDEPENDENT_RETEST_LEGAL_CUSTOMER_RELEASE_ACCEPTANCE.md",Buffer.from("A55 fixture evidence")],["PASS35_A55_RUNTIME_DIAGNOSTICS.json",json({ok:true})]];
  zipStore(output,[...entries,["PASS35_A55_EVIDENCE_MANIFEST.json",manifest("velmere.pass35.a55.evidence-manifest.v1",contract.requiredA55RevisionId,entries)]]);
  return { zipSha: sha256(fs.readFileSync(output)), sourceManifestSha };
}
const requiredChecks = contract.requiredA54Checks.map((id)=>({id,ok:true,status:"PASS",detail:null}));
function provider(prefix) { return { providerIdDigest: sha256(`${prefix}-provider`), vendorFamilyDigest: sha256(`${prefix}-vendor`), accountDigestDigest: sha256(`${prefix}-account`), regionDigest: sha256(`${prefix}-region`), failureDomainDigestDigest: sha256(`${prefix}-failure`), controlPlaneDigestDigest: sha256(`${prefix}-control`) }; }
function makeA54Evidence(output, index, startMs, options = {}) {
  const runId = options.runId ?? `a54-run-${index}`; const sourceManifestSha = options.sourceManifestSha ?? sha256("a54-frozen-source-manifest");
  const start = startMs; const end = start + 10*60_000;
  const journalRows = [
    {sequence:1,at:new Date(start).toISOString(),stepId:"run",status:"STARTED",detail:{fixtureMode:false}},
    {sequence:2,at:new Date(start+60_000).toISOString(),stepId:"preflight",status:"PASSED",detail:{}},
    {sequence:3,at:new Date(start+300_000).toISOString(),stepId:"vendor-exit",status:"SUCCEEDED",detail:{}},
    {sequence:4,at:new Date(start+480_000).toISOString(),stepId:"restore-primary",status:options.noRestore?"FAILED_ATTEMPT":"SUCCEEDED",detail:{}},
    {sequence:5,at:new Date(end).toISOString(),stepId:"run",status:"COMPLETED",detail:{decision:contract.requiredA54Decision}}
  ];
  if (options.journalOutOfOrder) journalRows[2].at = new Date(start-60_000).toISOString();
  const journal = { schemaVersion:"velmere.pass35.a54.journal.v1",revisionId:contract.requiredA54RevisionId,runId,rows:journalRows };
  const metrics = { windowSeconds:900,windowAgeSeconds:30,sampleCount:100,availabilityPct:options.lowAvailability?98.5:99.8,p50Ms:100,p95Ms:options.highP95?1800:500,p99Ms:900,errorBudgetConsumedPct:10,deliverySeconds:10,acknowledgementSeconds:60,exitSeconds:40,probeCount:10,serviceAvailabilityPct:100,serviceP95Ms:700,freshnessMaximumSeconds:20 };
  const checks = requiredChecks.map((row)=>({...row})); if(options.failedCheck) checks.find((row)=>row.id==="slo-availability-target").ok=false;
  const receiptBase = { schemaVersion:"velmere.pass35.a54.strict-slo-alert-ack-vendor-exit-recovery-receipt.v1",revisionId:contract.requiredA54RevisionId,parentRevisionId:"VELMERE_PASS35_A53_MEASURED_SLO_ALERT_ACK_VENDOR_EXIT_ACCEPTANCE",runId,generatedAt:new Date(end-1_000).toISOString(),fixtureMode:options.fixtureMode??false,decision:options.decision??contract.requiredA54Decision,status:options.decision??contract.requiredA54Decision,stage:"postcondition",fatalError:null,recovery:{mutationStarted:options.mutationStarted??true,restorationAttempted:true,restorationSucceeded:options.restoreFailed?false:true,recoveryError:null},productionSloProven:false,contractualSlaProven:false,productionVendorExitProven:false,continuousMonitoringProven:false,independentAssuranceProven:false,liveProven:false,saleEnabled:false,sourceFingerprint:{before:sourceManifestSha,after:sourceManifestSha,rows:4000,manifestSha256:sourceManifestSha},providerIdentity:{primary:options.primary??provider("primary"),alternate:options.alternate??provider(index===2?"alternate-b":"alternate-a")},summary:{checks:checks.length,passed:checks.filter((r)=>r.ok).length,failed:checks.filter((r)=>!r.ok).length,journalRows:journalRows.length-1},failures:checks.filter((r)=>!r.ok),checks,journalDigest:options.badJournalDigest?sha256("bad"):shaText(JSON.stringify(journalRows.slice(0,-1))),boundedMetrics:metrics };
  const receipt = json(receiptBase); const journalBytes=json(journal);
  const entries=[["PASS35_A54_STRICT_SLO_ALERT_ACK_VENDOR_EXIT_RECOVERY_ACCEPTANCE.json",receipt],["PASS35_A54_STRICT_SLO_ALERT_ACK_VENDOR_EXIT_RECOVERY_ACCEPTANCE.md",Buffer.from("A54 evidence")],["PASS35_A54_RUNTIME_DIAGNOSTICS.json",json({ok:true})],["PASS35_A54_CONTRACT_TEST.json",json({ok:true})],["run/receipt.json",receipt],["run/journal.json",journalBytes]];
  const evidenceManifest = json({ schemaVersion:"velmere.pass35.a54.evidence-manifest.v1", revisionId:contract.requiredA54RevisionId, runId, decision:receiptBase.decision, generatedAt:new Date(end).toISOString(), sourceManifestSha256:sourceManifestSha, files:entries.map(([name,data])=>({path:name,bytes:data.length,sha256:sha256(data)})).sort((a,b)=>a.path.localeCompare(b.path)) });
  zipStore(output,[...entries,["PASS35_A54_EVIDENCE_MANIFEST.json",evidenceManifest]]);
  return { runId,start,end,sourceManifestSha,zipSha:sha256(fs.readFileSync(output)),manifestSha:sha256(evidenceManifest),receiptSha:sha256(receipt),journalSha:sha256(journalBytes),primary:receiptBase.providerIdentity.primary,alternate:receiptBase.providerIdentity.alternate };
}
function makeBundle(output, a55, options = {}) {
  const now=Date.now(); const baseStart=now-6*86400_000;
  let starts=[baseStart,baseStart+2*86400_000,baseStart+4*86400_000];
  if(options.shortSpan) starts=[baseStart,baseStart+12*3600_000,baseStart+24*3600_000];
  if(options.shortGap) starts=[baseStart,baseStart+12*3600_000,baseStart+4*86400_000];
  const count=options.insufficientRuns?2:3; const entries=[]; const runRows=[]; const runEvidenceDigests={}; const runAttestationDigests={};
  for(let i=0;i<count;i++){
    const runPath=`runs/run-${i+1}.zip`; const tmp=path.join(temp,`nested-${crypto.randomBytes(6).toString("hex")}.zip`);
    const runOptions={sourceManifestSha:options.sourceDriftIndex===i?sha256("drift"):a55.sourceManifestSha,decision:options.a54DecisionIndex===i?"ACTION_REQUIRED":undefined,fixtureMode:options.a54FixtureIndex===i,restoreFailed:options.restoreFailedIndex===i,mutationStarted:options.noMutationIndex===i?false:undefined,failedCheck:options.failedCheckIndex===i,lowAvailability:options.lowAvailabilityIndex===i,highP95:options.highP95Index===i,noRestore:options.noRestoreIndex===i,journalOutOfOrder:options.journalOutOfOrderIndex===i,badJournalDigest:options.badJournalDigestIndex===i,runId:options.duplicateRunId&&i===2?"a54-run-1":undefined,primary:options.primaryDriftIndex===i?provider("different-primary"):undefined,alternate:options.noAltDiversity?provider("alternate-a"):undefined};
    const run=makeA54Evidence(tmp,i+1,starts[i],runOptions); const zipBytes=fs.readFileSync(tmp); fs.rmSync(tmp); entries.push([runPath,zipBytes]);
    const observerKey=options.sameObserverOrg?keys.observer1:(i===1?keys.observer2:keys.observer1);
    const attestationBase={schemaVersion:"velmere.pass35.a56.run-observer-attestation.v1",subjectRevisionId:contract.requiredA54RevisionId,runId:options.runMismatchIndex===i?"wrong-run":run.runId,evidenceZipSha256:run.zipSha,evidenceManifestSha256:run.manifestSha,receiptSha256:run.receiptSha,journalSha256:run.journalSha,sourceManifestSha256:run.sourceManifestSha,observedStartAt:new Date(run.start).toISOString(),observedEndAt:new Date(run.end).toISOString(),issuedAt:new Date(run.end+60_000).toISOString(),expiresAt:options.expiredAttestationIndex===i?new Date(now-3600_000).toISOString():new Date(now+30*86400_000).toISOString(),assertions:Object.fromEntries(contract.requiredRunAssertions.map((key)=>[key,true])),...(options.unknownAttestationIndex===i?{extraApproval:true}:{})};
    const attestation=signObject(attestationBase,[{key:observerKey,role:contract.roles.runObserver}],options.badObserverSignatureIndex===i?contract.roles.runObserver:null);
    const attPath=`attestations/run-${i+1}.json`; const attBytes=json(attestation); entries.push([attPath,attBytes]); runRows.push({evidencePath:runPath,evidenceSha256:run.zipSha,observerAttestationPath:attPath}); runEvidenceDigests[run.runId]=run.zipSha; runAttestationDigests[run.runId]=sha256(attBytes);
  }
  const bundle={schemaVersion:"velmere.pass35.a56.observation-bundle.v1",subjectRevisionId:contract.requiredA54RevisionId,subjectOrganizationIdHash:subjectOrg,a55EvidenceManifestSha256:a55.manifestSha,a54SourceManifestSha256:a55.sourceManifestSha,generatedAt:new Date().toISOString(),runs:runRows,aggregateAttestationPath:"aggregate-attestation.json",...(options.unknownBundleField?{hiddenApproval:true}:{})}; entries.push(["bundle.json",json(bundle)]);
  const aggregateBase={schemaVersion:"velmere.pass35.a56.aggregate-attestation.v1",decision:"APPROVE_CONTROLLED_CANARY_ENTRY_AFTER_OUT_OF_TIME_OBSERVATION",subjectRevisionId:contract.revisionId,a55EvidenceManifestSha256:a55.manifestSha,a54SourceManifestSha256:a55.sourceManifestSha,issuedAt:new Date(now-60_000).toISOString(),expiresAt:new Date(now+30*86400_000).toISOString(),runEvidenceDigests:options.aggregateDigestMismatch?{...runEvidenceDigests,"a54-run-1":sha256("wrong")}:runEvidenceDigests,runAttestationDigests,conditions:{saleEnabled:options.saleEnabled??false,liveProven:false,productionApproved:false,controlledCanaryOnly:true,killSwitchRequired:true,stopRulesRequired:true,supportTelemetryRequired:true,refundTelemetryRequired:true,outcomeTelemetryRequired:true,unresolvedCriticalHigh:0}};
  const aggregate=signObject(aggregateBase,[{key:keys.owner,role:contract.roles.operationsOwner},{key:keys.chair,role:contract.roles.assuranceChair}],options.badAggregateSignature?contract.roles.assuranceChair:null); entries.push(["aggregate-attestation.json",json(aggregate)]);
  const manifestBytes=manifest("velmere.pass35.a56.observation-bundle-manifest.v1",contract.revisionId,entries);
  if(options.tamperAfterManifest){const row=entries.find(([name])=>name==="bundle.json");row[1]=Buffer.concat([row[1],Buffer.from("tamper")]);}
  if(options.extraUnlistedFile) entries.push(["hidden/unlisted.json",json({approved:true})]);
  if(options.traversal) return zipStore(output,[["../evil.txt",Buffer.from("evil")]]);
  zipStore(output,[...entries,["PASS35_A56_OBSERVATION_BUNDLE_MANIFEST.json",manifestBytes]]);
}
function runCase(name, options={}){
  const caseDir=path.join(temp,name);fs.mkdirSync(caseDir,{recursive:true});
  const a55Zip=path.join(caseDir,"a55.zip");const a55Raw=makeA55Evidence(a55Zip,options.a55??{});
  const a55Temp=fs.mkdtempSync(path.join(temp,"a55-manifest-"));
  // The fixture manifest SHA is deterministic from the embedded manifest bytes; recover it directly from a parallel minimal archive build metadata.
  // Use the harness itself to read it through the bundle binding by constructing the known manifest again.
  // Extract actual A55 manifest SHA using a tiny Node helper from the ZIP central parser would be unnecessary; parse by safe extraction through Python zipfile for fixture construction only.
  const py=spawnSync("python3",["-c","import zipfile,sys,hashlib; z=zipfile.ZipFile(sys.argv[1]); b=z.read('PASS35_A55_EVIDENCE_MANIFEST.json'); print(hashlib.sha256(b).hexdigest())",a55Zip],{encoding:"utf8"});
  const a55={...a55Raw,manifestSha:py.stdout.trim()};
  const bundleZip=path.join(caseDir,"bundle.zip");makeBundle(bundleZip,a55,options.bundle??{});
  const trustFile=path.join(caseDir,"trust.json");const trustSha=writeTrust(trustFile,options.trustOverrides??{});
  const sourceManifestSha=sha256(fs.readFileSync(path.join(root,"config/pass35/a56-source-manifest.json")));
  const result=spawnSync(process.execPath,["scripts/a56-out-of-time-slo-vendor-exit-observation-acceptance.mjs","--fixture","--bundle",bundleZip,"--trust-roots",trustFile,"--trust-roots-sha",trustSha,"--a55-evidence",a55Zip,"--a55-evidence-sha",a55.zipSha,"--source-manifest-sha",sourceManifestSha,"--subject-org",subjectOrg,"--confirm",contract.confirmationToken],{cwd:root,encoding:"utf8",maxBuffer:128*1024*1024});
  const report=JSON.parse(fs.readFileSync(path.join(root,"artifacts/pass35/a56/PASS35_A56_OUT_OF_TIME_SLO_VENDOR_EXIT_OBSERVATION_ACCEPTANCE.json"),"utf8"));
  fs.rmSync(a55Temp,{recursive:true,force:true});return{result,report};
}
try{
  const scenarios=[
    ["valid",{},true],["insufficient-runs",{bundle:{insufficientRuns:true}},false],["short-span",{bundle:{shortSpan:true}},false],["short-gap",{bundle:{shortGap:true}},false],
    ["duplicate-run-id",{bundle:{duplicateRunId:true}},false],["source-drift",{bundle:{sourceDriftIndex:1}},false],["a54-action-required",{bundle:{a54DecisionIndex:1}},false],["a54-fixture",{bundle:{a54FixtureIndex:1}},false],
    ["restore-failed",{bundle:{restoreFailedIndex:1}},false],["mutation-not-started",{bundle:{noMutationIndex:1}},false],["required-check-failed",{bundle:{failedCheckIndex:1}},false],["low-availability",{bundle:{lowAvailabilityIndex:1}},false],
    ["high-p95",{bundle:{highP95Index:1}},false],["journal-no-restore",{bundle:{noRestoreIndex:1}},false],["journal-order-invalid",{bundle:{journalOutOfOrderIndex:1}},false],["journal-digest-invalid",{bundle:{badJournalDigestIndex:1}},false],
    ["observer-bad-signature",{bundle:{badObserverSignatureIndex:1}},false],["observer-run-mismatch",{bundle:{runMismatchIndex:1}},false],["observer-expired",{bundle:{expiredAttestationIndex:1}},false],["observer-org-diversity-missing",{bundle:{sameObserverOrg:true}},false],
    ["alternate-diversity-missing",{bundle:{noAltDiversity:true}},false],["primary-drift",{bundle:{primaryDriftIndex:1}},false],["aggregate-bad-signature",{bundle:{badAggregateSignature:true}},false],["aggregate-digest-mismatch",{bundle:{aggregateDigestMismatch:true}},false],
    ["aggregate-sale-enabled",{bundle:{saleEnabled:true}},false],["unknown-bundle-field",{bundle:{unknownBundleField:true}},false],["unknown-attestation-field",{bundle:{unknownAttestationIndex:1}},false],["extra-unlisted-file",{bundle:{extraUnlistedFile:true}},false],
    ["manifest-tamper",{bundle:{tamperAfterManifest:true}},false],["zip-traversal",{bundle:{traversal:true}},false],["a55-not-verified",{a55:{decision:"ACTION_REQUIRED"}},false],["a55-fixture",{a55:{fixtureMode:true}},false]
  ];
  for(const [name,options,expectedPass] of scenarios){scenarioCount++;const{result,report}=runCase(name,options);check(`${name}:decision`,report.decision===(expectedPass?"FIXTURE_PASS":"FIXTURE_FAIL"),{decision:report.decision,failures:report.failures});check(`${name}:exit`,expectedPass?result.status===0:result.status!==0,{status:result.status,stdout:result.stdout,stderr:result.stderr});check(`${name}:truth-boundary`,report.saleEnabled===false&&report.liveProven===false&&report.productionApproved===false&&report.continuousMonitoringProven===false,{sale:report.saleEnabled,live:report.liveProven,production:report.productionApproved,continuous:report.continuousMonitoringProven});}
  const finalClean=runCase("__final-clean__",{});if(finalClean.result.status!==0||finalClean.report.decision!=="FIXTURE_PASS")throw new Error(`final_clean_fixture_failed:${finalClean.report.decision}`);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
const failures=checks.filter((row)=>!row.ok);const report={schemaVersion:"velmere.pass35.a56.strict-adversarial-fixture.v1",revisionId:contract.revisionId,generatedAt:new Date().toISOString(),scenarios:scenarioCount,assertions:checks.length,passed:checks.length-failures.length,failed:failures.length,failures};fs.mkdirSync(path.join(root,"artifacts/pass35/a56"),{recursive:true});fs.writeFileSync(path.join(root,"artifacts/pass35/a56/PASS35_A56_STRICT_ADVERSARIAL_FIXTURE.json"),`${JSON.stringify(report,null,2)}\n`);console.log(JSON.stringify({scenarios:report.scenarios,assertions:report.assertions,passed:report.passed,failed:report.failed},null,2));if(failures.length){console.error(JSON.stringify(failures.slice(0,50),null,2));process.exit(1);}
