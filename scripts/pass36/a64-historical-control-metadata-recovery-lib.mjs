import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PASS35_SOURCE_PACKAGE_CONTROL_METADATA_PATHS } from "../pass35/source-inventory.mjs";

export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key)=>`${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
const DIGEST=/^[a-f0-9]{64}$/u;
function invariant(value, code){if(!value)throw new Error(code);}
export function validateAnchor(anchor, policy){
  invariant(anchor?.schemaVersion==="velmere.pass35.a44.source-only-manifest.v1","a64_anchor_schema");
  invariant(anchor?.revisionId===policy.historicalAnchor.revisionId,"a64_anchor_revision");
  invariant(Array.isArray(anchor.entries)&&anchor.entries.length===anchor.fileCount,"a64_anchor_entries");
  invariant(new Set(anchor.entries.map((row)=>row.path)).size===anchor.entries.length,"a64_anchor_duplicate_path");
  invariant(anchor.byteLength===anchor.entries.reduce((sum,row)=>sum+row.bytes,0),"a64_anchor_byte_length");
  invariant(anchor.pathSetSha256===sha256(anchor.entries.map((row)=>row.path).join("\n")),"a64_anchor_path_set");
  const core={...anchor};delete core.manifestSha256;
  invariant(DIGEST.test(anchor.manifestSha256)&&anchor.manifestSha256===sha256(canonicalJson(core)),"a64_anchor_manifest_hash");
  invariant(anchor.manifestSha256===policy.historicalAnchor.declaredManifestSha256,"a64_anchor_declared_hash");
  return new Map(anchor.entries.map((row)=>[row.path,row]));
}
export function validateA64State(rootPath,{receiptOverride=null,anchorOverride=null,readFileOverride=null,existsOverride=null}={}){
  const root=path.resolve(rootPath);
  const policy=JSON.parse(fs.readFileSync(path.join(root,"config/pass36/a64-historical-control-metadata-recovery.json"),"utf8"));
  const receipt=receiptOverride??JSON.parse(fs.readFileSync(path.join(root,policy.receiptPath),"utf8"));
  const anchorBytes=anchorOverride===null?fs.readFileSync(path.join(root,policy.historicalAnchor.localPath)):Buffer.from(`${JSON.stringify(anchorOverride)}\n`);
  const anchor=anchorOverride??JSON.parse(anchorBytes.toString("utf8"));
  invariant(sha256(anchorBytes)===policy.historicalAnchor.sha256 || anchorOverride!==null,"a64_anchor_file_hash");
  const anchorMap=validateAnchor(anchor,policy);
  invariant(receipt?.schemaVersion==="velmere.pass36.a64.historical-control-metadata-recovery.v1","a64_receipt_schema");
  invariant(receipt.revisionId===policy.revisionId&&receipt.parentRevisionId===policy.parentRevisionId,"a64_receipt_revision");
  invariant(receipt.sourceArchive?.fileName===policy.sourceArchive.fileName,"a64_archive_name");
  invariant(receipt.sourceArchive?.sha256===policy.sourceArchive.sha256,"a64_archive_hash");
  invariant(receipt.historicalAnchor?.sha256===policy.historicalAnchor.sha256,"a64_receipt_anchor_hash");
  invariant(receipt.historicalAnchor?.declaredManifestSha256===policy.historicalAnchor.declaredManifestSha256,"a64_receipt_anchor_declared_hash");
  const receiptCore={...receipt};delete receiptCore.receiptSha256;
  invariant(DIGEST.test(receipt.receiptSha256)&&receipt.receiptSha256===sha256(canonicalJson(receiptCore)),"a64_receipt_hash");
  invariant(Array.isArray(receipt.rows)&&receipt.rows.length===policy.expectedRestoredMetadata,"a64_row_count");
  invariant(receipt.restoredCount===receipt.rows.length,"a64_restored_count");
  invariant(receipt.controlPlaneRestoredCount===policy.expectedControlPlaneRestored,"a64_control_count");
  invariant(receipt.supplementalOnlyRestoredCount===policy.expectedRestoredMetadata-policy.expectedControlPlaneRestored,"a64_supplemental_count");
  const paths=receipt.rows.map((row)=>row.path);
  invariant(new Set(paths).size===paths.length,"a64_duplicate_rows");
  invariant(paths.join("\n")===[...paths].sort().join("\n"),"a64_rows_not_sorted");
  const expectedSet=new Set(PASS35_SOURCE_PACKAGE_CONTROL_METADATA_PATHS);
  invariant(expectedSet.size===policy.expectedSupplementalMetadata,"a64_denominator");
  const readFile=readFileOverride??((filePath)=>fs.readFileSync(path.join(root,filePath)));
  const exists=existsOverride??((filePath)=>fs.existsSync(path.join(root,filePath)));
  let controlCount=0;
  for(const row of receipt.rows){
    invariant(expectedSet.has(row.path),`a64_row_not_expected:${row.path}`);
    invariant(row.a44Role==="CURRENT_CONTROL_METADATA",`a64_row_role:${row.path}`);
    invariant(Number.isSafeInteger(row.bytes)&&row.bytes>0&&DIGEST.test(row.sha256),`a64_row_shape:${row.path}`);
    const anchored=anchorMap.get(row.path);
    invariant(anchored?.role==="CURRENT_CONTROL_METADATA",`a64_anchor_role:${row.path}`);
    invariant(anchored.bytes===row.bytes&&anchored.sha256===row.sha256,`a64_anchor_binding:${row.path}`);
    invariant(exists(row.path),`a64_file_missing:${row.path}`);
    const bytes=readFile(row.path);
    invariant(bytes.length===row.bytes&&sha256(bytes)===row.sha256,`a64_file_mismatch:${row.path}`);
    if(row.controlPlaneRequired===true)controlCount+=1;
    else invariant(row.controlPlaneRequired===false,`a64_control_flag_type:${row.path}`);
  }
  invariant(controlCount===policy.expectedControlPlaneRestored,"a64_control_flag_count");
  const allMissing=PASS35_SOURCE_PACKAGE_CONTROL_METADATA_PATHS.filter((filePath)=>!exists(filePath));
  invariant(allMissing.length===0,`a64_supplemental_still_missing:${allMissing.join(",")}`);
  return {policy,receipt,anchor,restoredCount:receipt.rows.length,controlPlaneRestoredCount:controlCount,supplementalMetadataComplete:true};
}
