#!/usr/bin/env node
import fs from "node:fs";import path from "node:path";
import {REV,PARENT,MANIFEST,PARENT_MANIFEST,STATE,PROGRAM,RECEIPT,sha256,canonicalJson,readJson,collect,payload} from "./a102r19-source-boundary.mjs";
const root=process.cwd(),manifest=readJson(root,MANIFEST),parent=readJson(root,PARENT_MANIFEST),authority=readJson(root,"config/pass36/current-release-authority.json"),state=readJson(root,STATE),program=readJson(root,PROGRAM),receiptBytes=fs.readFileSync(path.join(root,RECEIPT)),inventory=collect(root);
const checks=[];const add=(id,passed,detail=null)=>checks.push({id,passed:Boolean(passed),detail});
add("revision",manifest.revisionId===REV);add("parent",manifest.parentRevisionId===PARENT&&manifest.parentDescendantManifestDigestSha256===parent.manifestDigestSha256);
const core={...manifest};delete core.manifestDigestSha256;add("self",manifest.manifestDigestSha256===sha256(canonicalJson(core)));
add("safe",inventory.rejected.length===0,inventory.rejected);add("payload",JSON.stringify(manifest.payload)===JSON.stringify(payload(inventory.rows)));
add("receipt",manifest.localRegressionReceiptSha256===sha256(receiptBytes));add("authority",authority.authorityRevisionId===REV&&authority.currentRootDescendantManifestPath===MANIFEST);
add("state",state.revisionId===REV&&state.parentRevisionId===PARENT&&state.passCredit?.A102===false);add("program",program.revisionId===REV&&program.parentRevisionId===PARENT&&program.formalRemainingEntries===31);
const c=manifest.claims??{};let passClaims=true;for(let i=90;i<=116;i++)passClaims=passClaims&&c[`a${i}PassCredit`]===false;
add("claims",passClaims&&c.exactA77R1ToA80R1Credit===false&&c.cssCustomerMinimalismChecks===33&&c.activeGlobalStylesheets===3&&c.activeGlobalKeyframeNames===361&&c.duplicateGlobalKeyframeNames===0&&c.removedDuplicateOrDeadKeyframeBlocks===7&&c.globalsCssBytesReduced===627&&c.customerSurfacesSimplified===3&&c.internalProofMarkersRetained===true&&c.realBrowserRows===0&&c.screenshotParityRows===0&&c.liveProven===false&&c.saleEnabled===false&&c.productionApproved===false&&c.worldClassProven===false,c);
const failed=checks.filter((x)=>!x.passed);
console.log(JSON.stringify({status:failed.length?"FAIL_A102R19_DESCENDANT":"PASS_A102R19_DESCENDANT_ACTION_REQUIRED_NO_PROMOTION",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,results:checks},null,2));process.exit(failed.length?1:0);
