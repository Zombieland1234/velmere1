#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
const cfg=JSON.parse(fs.readFileSync("config/pass36/a102r44p29-r44p27-fork-reconciliation.json","utf8"));
const sha=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const rows=[]; const check=(id,ok)=>{assert.ok(ok,id);rows.push({id,ok:true});};
check("revision",cfg.revisionId==="VELMERE_PASS36_A102R44P29_ACTION_REQUIRED_R44P27_AUTHORITY_FORK_RECONCILIATION_DUAL_CONTROL_TRUST_QUARANTINE_72H_WATCHDOG_AND_CREDENTIAL_HYGIENE_NO_LIVE_CREDIT"&&cfg.parentRevisionId==="VELMERE_PASS36_A102R44P28_ACTION_REQUIRED_EXTERNAL_CI_POSTGRES_RLS19_SIGSTORE_OIDC_ATTESTATION_AND_PARENT_SOURCE_BINDING_NO_LIVE_CREDIT");
check("selected-durable",cfg.selectedLineage.r44p27RevisionId==="VELMERE_PASS36_A102R44P27_ACTION_REQUIRED_DURABLE_EXTERNAL_EVIDENCE_REPLAY_JOURNAL_ATOMIC_ADMISSION_AND_ENVELOPE_TIME_HARDENING_NO_LIVE_CREDIT"&&cfg.selectedLineage.continuedByR44P28===true);
check("sibling-not-parent",cfg.siblingLineage.r44p27RevisionId==="VELMERE_PASS36_A102R44P27_ACTION_REQUIRED_DUAL_CONTROL_TRUST_ANCHOR_EVIDENCE_QUARANTINE_AND_REAL_TIME_72H_WATCHDOG_NO_LIVE_CREDIT"&&cfg.siblingLineage.mayBecomeParent===false&&cfg.siblingLineage.silentMergeForbidden===true);
check("parent-manifest",cfg.parentR44P28.manifestSha256===sha("_velmere/PASS36_A102R44P28_SOURCE_ONLY_MANIFEST.json"));
check("durable-manifest",cfg.selectedLineage.manifestSha256===sha("_velmere/PASS36_A102R44P27_SOURCE_ONLY_MANIFEST.json"));
check("imported-count",cfg.mergeDecisions.importedAsR44P29Paths.length===10);
check("imports-exist",cfg.mergeDecisions.importedAsR44P29Paths.every(p=>fs.existsSync(p)));
check("durable-replay-preserved",cfg.mergeDecisions.durableReplayFilesPreserved.every(p=>fs.existsSync(p)));
check("package-not-imported",cfg.mergeDecisions.explicitlyNotImported.includes("package.json"));
check("redactions",!fs.readFileSync("components/launch/AdminAuditWriteApiPanel.tsx","utf8").includes("Bearer preview-secret")&&!fs.readFileSync("components/launch/AdminMutationAuditPanel.tsx","utf8").includes("whsec_previewsecret"));
check("truth-boundary",cfg.truthBoundary.forkResolved===true&&cfg.truthBoundary.siblingEvidencePromoted===false&&cfg.truthBoundary.stagingCredit===false&&cfg.truthBoundary.saleCredit===false&&cfg.truthBoundary.liveCredit===false);
console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p29.fork-reconciliation-test.v1",status:"PASS",checks:rows.length,passed:rows.length,failed:0,rows},null,2));
