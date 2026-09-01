#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
export const REV="VELMERE_PASS36_A102R44P44_ACTION_REQUIRED_BRUTAL_PRODUCT_REALITY_50_CONTRACT_ANGEL120_PERSONA100_FULL_QA_TEST_CYCLE_3_OF_3_NO_LIVE_CREDIT";
export const PARENT="VELMERE_PASS36_A102R44P43_ACTION_REQUIRED_PUBLIC_BALANCED_HOLDOUT_LEGACY_COMPILER_AST_AND_CONTROL_ALERT_RATE_TEST_CYCLE_2_OF_3_NO_LIVE_CREDIT";
export const MANIFEST="_velmere/PASS36_A102R44P44_SOURCE_ONLY_MANIFEST.json";
export const LEDGER="config/pass36/r44p44-approved-source-changes.json";
export const compareUtf8=(a,b)=>Buffer.compare(Buffer.from(a,"utf8"),Buffer.from(b,"utf8"));
export const sha256=(bytes)=>crypto.createHash("sha256").update(bytes).digest("hex");
export const excludedParts=new Set(["node_modules",".git",".next",".velmere",".turbo",".cache","coverage","test-results","playwright-report","__pycache__",".pytest_cache","tmp","temp","out","cache","failures","artifacts",".velmere"]);
export const excluded=(relativePath)=>relativePath.split("/").some((part)=>excludedParts.has(part)||part.startsWith(".next-")) || /(?:^|\/)tsconfig\.tmp.*\.json$/u.test(relativePath) || /(?:^|\/).*\.tsbuildinfo$/u.test(relativePath);
export function walk(root, excludePaths=new Set()) {
  const rows=[];
  function visit(directory,base="") {
    for(const entry of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>compareUtf8(a.name,b.name))) {
      const relative=base?`${base}/${entry.name}`:entry.name;
      if(excluded(relative)||excludePaths.has(relative)) continue;
      const absolute=path.join(directory,entry.name);
      const stat=fs.lstatSync(absolute);
      if(stat.isSymbolicLink()) throw new Error(`symlink_forbidden:${relative}`);
      if(entry.isDirectory()) visit(absolute,relative);
      else if(entry.isFile()) { const bytes=fs.readFileSync(absolute); rows.push({path:relative,byteLength:bytes.length,sha256:sha256(bytes)}); }
    }
  }
  visit(root); return rows.sort((a,b)=>compareUtf8(a.path,b.path));
}
export function aggregate(rows){const h=crypto.createHash("sha256");for(const row of rows)h.update(`${row.path}\0${row.byteLength}\0${row.sha256}\n`);return h.digest("hex");}
export function pathSet(rows){return sha256(Buffer.from(`${rows.map(r=>r.path).join("\n")}\n`,"utf8"));}
