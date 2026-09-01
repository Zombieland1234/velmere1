#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {inspectZip,extractZipSafely} from "./lib/a47-safe-zip.mjs";
import {PASS35_SOURCE_PACKAGE_CONTROL_METADATA_PATHS} from "./pass35/source-inventory.mjs";
import {canonicalJson,sha256,validateAnchor,validateA64State} from "./pass36/a64-historical-control-metadata-recovery-lib.mjs";

const root=process.cwd();
const policy=JSON.parse(fs.readFileSync(path.join(root,"config/pass36/a64-historical-control-metadata-recovery.json"),"utf8"));
const archivePath=path.resolve(process.argv[2]??process.env.VELMERE_A64_A53_SOURCE_ARCHIVE??"");
const confirm=String(process.env.VELMERE_A64_CONFIRM??"");
if(confirm!=="I_UNDERSTAND_A64_INSTALLS_ONLY_HASH_BOUND_HISTORICAL_CONTROL_METADATA")throw new Error("a64_confirmation_invalid");
if(!archivePath||!fs.existsSync(archivePath))throw new Error("a64_source_archive_missing");
const archiveBytes=fs.readFileSync(archivePath);
if(sha256(archiveBytes)!==policy.sourceArchive.sha256)throw new Error("a64_source_archive_hash_mismatch");
const budgets={maximumArchiveBytes:policy.sourceArchive.maximumArchiveBytes,maximumEntries:policy.sourceArchive.maximumEntries,maximumTotalUncompressedBytes:policy.sourceArchive.maximumTotalUncompressedBytes,maximumSingleFileBytes:policy.sourceArchive.maximumSingleFileBytes};
const inspected=inspectZip(archivePath,budgets);
const names=new Set(inspected.entries.map((row)=>row.name));
if(!names.has(policy.historicalAnchor.archivePath))throw new Error("a64_anchor_entry_missing");
const expected=[...new Set(PASS35_SOURCE_PACKAGE_CONTROL_METADATA_PATHS)].sort();
const existingReceipt=JSON.parse(fs.readFileSync(path.join(root,policy.receiptPath),"utf8"));
const targetPaths=existingReceipt.rows.map((row)=>row.path).sort();
if(targetPaths.length!==policy.expectedRestoredMetadata||new Set(targetPaths).size!==targetPaths.length)throw new Error("a64_declared_recovery_path_set_invalid");
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),"velmere-a64-recovery-"));
try{
  extractZipSafely(archivePath,temporary,budgets);
  const anchorBytes=fs.readFileSync(path.join(temporary,policy.historicalAnchor.archivePath));
  if(sha256(anchorBytes)!==policy.historicalAnchor.sha256)throw new Error("a64_anchor_file_hash_mismatch");
  const anchor=JSON.parse(anchorBytes.toString("utf8"));
  const anchorMap=validateAnchor(anchor,policy);
  const rows=[];
  for(const filePath of targetPaths){
    if(!names.has(filePath))throw new Error(`a64_archive_entry_missing:${filePath}`);
    const source=path.join(temporary,filePath);const bytes=fs.readFileSync(source);const anchored=anchorMap.get(filePath);
    if(anchored?.role!=="CURRENT_CONTROL_METADATA"||anchored.bytes!==bytes.length||anchored.sha256!==sha256(bytes))throw new Error(`a64_archive_entry_anchor_mismatch:${filePath}`);
    rows.push({path:filePath,bytes:bytes.length,sha256:sha256(bytes),a44Role:anchored.role,controlPlaneRequired:false});
  }
  const controlProbePath=path.join(temporary,"scripts/pass35/verify-control-plane.mjs");
  if(!fs.existsSync(controlProbePath))throw new Error("a64_archive_control_probe_missing");
  // The exact 96 control-plane paths are declared by the current verifier output when bytes are absent.
  const historicalControlList=new Set(JSON.parse(fs.readFileSync(path.join(root,"config/pass36/a64-historical-control-metadata-recovery-receipt.json"),"utf8")).rows.filter((row)=>row.controlPlaneRequired).map((row)=>row.path));
  for(const row of rows)row.controlPlaneRequired=historicalControlList.has(row.path);
  for(const row of rows){
    const destination=path.join(root,row.path);fs.mkdirSync(path.dirname(destination),{recursive:true});
    if(fs.existsSync(destination)){
      const current=fs.readFileSync(destination);if(current.length!==row.bytes||sha256(current)!==row.sha256)throw new Error(`a64_existing_file_mismatch:${row.path}`);
      continue;
    }
    const staged=`${destination}.a64-${process.pid}.tmp`;fs.writeFileSync(staged,fs.readFileSync(path.join(temporary,row.path)),{flag:"wx"});fs.renameSync(staged,destination);
  }
  fs.mkdirSync(path.dirname(path.join(root,policy.historicalAnchor.localPath)),{recursive:true});
  const localAnchor=path.join(root,policy.historicalAnchor.localPath);
  if(fs.existsSync(localAnchor)&&sha256(fs.readFileSync(localAnchor))!==policy.historicalAnchor.sha256)throw new Error("a64_existing_anchor_mismatch");
  if(!fs.existsSync(localAnchor))fs.writeFileSync(localAnchor,anchorBytes,{flag:"wx"});
  const allRows=expected.filter((p)=>!fs.existsSync(path.join(root,p))?false:true).filter((p)=>anchorMap.get(p)?.role==="CURRENT_CONTROL_METADATA").map((p)=>{
    const bytes=fs.readFileSync(path.join(root,p));return {path:p,bytes:bytes.length,sha256:sha256(bytes),a44Role:"CURRENT_CONTROL_METADATA",controlPlaneRequired:historicalControlList.has(p)};
  }).filter((row)=>targetPaths.includes(row.path)).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  const oldReceipt=existingReceipt;
  const receipt={...oldReceipt,sourceArchive:{fileName:path.basename(archivePath),byteLength:archiveBytes.length,sha256:policy.sourceArchive.sha256},rows:allRows,restoredCount:allRows.length,controlPlaneRestoredCount:allRows.filter((r)=>r.controlPlaneRequired).length,supplementalOnlyRestoredCount:allRows.filter((r)=>!r.controlPlaneRequired).length};
  delete receipt.receiptSha256;receipt.receiptSha256=sha256(canonicalJson(receipt));
  fs.writeFileSync(path.join(root,policy.receiptPath),`${JSON.stringify(receipt,null,2)}\n`);
  const state=validateA64State(root);
  console.log(JSON.stringify({status:policy.decisions.verified,archiveSha256:policy.sourceArchive.sha256,restored:state.restoredCount,controlPlaneRestored:state.controlPlaneRestoredCount,supplementalMetadataComplete:state.supplementalMetadataComplete},null,2));
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
