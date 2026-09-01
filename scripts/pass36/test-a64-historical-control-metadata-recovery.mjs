#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {validateA64State,canonicalJson,sha256} from "./a64-historical-control-metadata-recovery-lib.mjs";
const root=process.cwd();const base=validateA64State(root);let assertions=0;
function ok(id,fn,pattern){assertions+=1;let error=null;try{fn();}catch(e){error=e;}assert.ok(error,`${id}: expected rejection`);if(pattern)assert.match(error.message,pattern,id);}
function pass(id,condition){assertions+=1;assert.ok(condition,id);}
pass("valid:count",base.restoredCount===103);
pass("valid:control",base.controlPlaneRestoredCount===96);
const clone=(value)=>JSON.parse(JSON.stringify(value));
function rehash(receipt){const core={...receipt};delete core.receiptSha256;receipt.receiptSha256=sha256(canonicalJson(core));return receipt;}
let v=clone(base.receipt);v.sourceArchive.sha256="0".repeat(64);rehash(v);ok("archive-hash",()=>validateA64State(root,{receiptOverride:v}),/a64_archive_hash/u);
v=clone(base.receipt);v.rows.pop();v.restoredCount=v.rows.length;rehash(v);ok("row-count",()=>validateA64State(root,{receiptOverride:v}),/a64_row_count/u);
v=clone(base.receipt);v.rows[1].path=v.rows[0].path;rehash(v);ok("duplicate",()=>validateA64State(root,{receiptOverride:v}),/a64_duplicate_rows/u);
v=clone(base.receipt);v.rows[0].controlPlaneRequired=!v.rows[0].controlPlaneRequired;rehash(v);ok("control-count",()=>validateA64State(root,{receiptOverride:v}),/a64_control_flag_count/u);
v=clone(base.receipt);v.rows[0].sha256="f".repeat(64);rehash(v);ok("anchor-binding",()=>validateA64State(root,{receiptOverride:v}),/a64_anchor_binding/u);
v=clone(base.receipt);v.receiptSha256="f".repeat(64);ok("receipt-hash",()=>validateA64State(root,{receiptOverride:v}),/a64_receipt_hash/u);
let a=clone(base.anchor);a.entries.find((row)=>row.path===base.receipt.rows[0].path).role="HISTORY";ok("anchor-role",()=>validateA64State(root,{anchorOverride:a}),/a64_anchor_manifest_hash|a64_anchor_role/u);
a=clone(base.anchor);a.manifestSha256="f".repeat(64);ok("anchor-hash",()=>validateA64State(root,{anchorOverride:a}),/a64_anchor_manifest_hash/u);
const target=base.receipt.rows[0].path;
ok("missing-file",()=>validateA64State(root,{existsOverride:(p)=>p===target?false:fs.existsSync(path.join(root,p))}),/a64_file_missing/u);
ok("changed-file",()=>validateA64State(root,{readFileOverride:(p)=>p===target?Buffer.from("tampered"):fs.readFileSync(path.join(root,p))}),/a64_file_mismatch/u);
const expected=new Set(base.receipt.rows.map((row)=>row.path));pass("all-restored-unique",expected.size===103);
pass("receipt-source-anchor",base.receipt.sourceArchive.sha256==="31d36618b4182fa317b20887db25a102da63858ff60ec84f6bd0103ea30d2f1b");
pass("anchor-revision",base.anchor.revisionId==="VELMERE_PASS35_A44_VISUAL_MASTER_ENGINE_BINDING");
console.log(JSON.stringify({status:"PASS_A64_HISTORICAL_CONTROL_METADATA_RECOVERY_TEST",assertions},null,2));
