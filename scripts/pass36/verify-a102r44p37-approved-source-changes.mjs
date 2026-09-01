#!/usr/bin/env node
import fs from "node:fs";

const REV="VELMERE_PASS36_A102R44P37_ACTION_REQUIRED_AUTHORITY_RELEASE_TRUTH_TYPESCRIPT_AND_EVIDENCE_REPAIR_TEST_CYCLE_0_OF_3_NO_LIVE_CREDIT";
const PARENT="VELMERE_PASS36_A102R44P36_ACTION_REQUIRED_FULL_CURRENT_BYTE_RELEASE_PSYCHOLOGY30_DYNAMIC_REBASELINE_TEST_CYCLE_3_OF_3_NO_LIVE_CREDIT";
const parent=JSON.parse(fs.readFileSync("_velmere/PASS36_A102R44P36_SOURCE_ONLY_MANIFEST.json","utf8"));
const current=JSON.parse(fs.readFileSync("_velmere/PASS36_A102R44P37_SOURCE_ONLY_MANIFEST.json","utf8"));
const approved=JSON.parse(fs.readFileSync("config/pass36/r44p37-approved-source-changes.json","utf8"));
const p=new Map(parent.files.map((row)=>[row.path,row]));
const c=new Map(current.files.map((row)=>[row.path,row]));
const added=[...c.keys()].filter((path)=>!p.has(path)).sort();
const deleted=[...p.keys()].filter((path)=>!c.has(path)).sort();
const modified=[...c.keys()].filter((path)=>p.has(path)&&(p.get(path).sha256!==c.get(path).sha256||p.get(path).byteLength!==c.get(path).byteLength)).sort();
const rows=[];const check=(id,passed,detail=null)=>rows.push({id,passed:Boolean(passed),detail});
check("revision",approved.revisionId===REV&&current.revisionId===REV,approved.revisionId);
check("parent",approved.parentRevisionId===PARENT&&parent.revisionId===PARENT,approved.parentRevisionId);
check("added",JSON.stringify(added)===JSON.stringify([...approved.added].sort()),{actual:added,expected:approved.added});
check("modified",JSON.stringify(modified)===JSON.stringify([...approved.modified].sort()),{actual:modified,expected:approved.modified});
check("deleted",JSON.stringify(deleted)===JSON.stringify([...approved.deleted].sort()),{actual:deleted,expected:approved.deleted});
check("no-history-mutation",approved.historyMutations===0&&approved.removedTests===0&&approved.denominatorCollapse===false);
check("no-promotion",approved.liveCredit===false&&approved.saleCredit===false);
const failed=rows.filter((row)=>!row.passed);
console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p37.approved-source-changes-verification.v1",revisionId:REV,status:failed.length?"FAIL_R44P37_APPROVED_SOURCE_CHANGES":"PASS_R44P37_APPROVED_SOURCE_CHANGES",added:added.length,modified:modified.length,deleted:deleted.length,checks:rows.length,passed:rows.length-failed.length,failed:failed.length,rows},null,2));
if(failed.length)process.exit(1);
