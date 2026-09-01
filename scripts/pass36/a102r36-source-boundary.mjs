#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
export const REV = "VELMERE_PASS36_A102R36_ACTION_REQUIRED_WINDOWS_ESLINT_RUNNER_PROCESS_EXEC_PATH_PORTABILITY_AND_EXACT_LINT_CLOSURE_NO_REAL_CREDIT";
export const PARENT = "VELMERE_PASS36_A102R35_ACTION_REQUIRED_MODAL_SCROLL_LOCK_PENDING_RESTORE_RAPID_REOPEN_AND_NESTED_OWNER_RACE_RECOVERY_NO_REAL_CREDIT";
export const MANIFEST = "config/pass36/a102r36-current-root-descendant-manifest.json";
export const PARENT_MANIFEST = "config/pass36/a102r35-current-root-descendant-manifest.json";
export const STATE = "config/pass36/a102r36-action-required-current-state.json";
export const PROGRAM = "config/pass36/a102r36-world-class-completion-program.json";
export const RECEIPT = "config/pass36/a102r36-local-regression-receipt.json";
const IMMUTABLE_LOG = "fixtures/pass35/a42/windows-global-json-crash.log";
export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key)=>`${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
export const readJson=(root,relativePath)=>JSON.parse(fs.readFileSync(path.join(root,relativePath),"utf8"));
function excluded(relativePath) {
 const top=relativePath.split("/",1)[0];
 if ([".git",".velmere",".next",".turbo","_velmere","artifacts","coverage","node_modules","dist","out",".cache","cache"].includes(top)||top.startsWith(".next-")) return true;
 const parts=relativePath.split("/"); const base=parts.at(-1);
 if(parts.includes("__pycache__")||base.endsWith(".pyc")) return true;
 if(base===".env"||base.startsWith(".env.")||base===".eslintcache"||base.endsWith(".tsbuildinfo")) return true;
 if(base.endsWith(".log")&&relativePath!==IMMUTABLE_LOG) return true;
 if(/\.(?:db|sqlite|sqlite3)$/iu.test(base)) return true;
 return relativePath===MANIFEST;
}
export function collect(root) {
 const rows=[],rejected=[];
 function walk(abs,rel="") {
  for(const entry of fs.readdirSync(abs,{withFileTypes:true}).sort((a,b)=>Buffer.from(a.name).compare(Buffer.from(b.name)))) {
   const rp=rel?`${rel}/${entry.name}`:entry.name, ap=path.join(abs,entry.name), st=fs.lstatSync(ap);
   if(st.isSymbolicLink()){rejected.push({path:rp,reason:"symlink"});continue;}
   if(entry.isDirectory()){if(!excluded(`${rp}/x`))walk(ap,rp);continue;}
   if(!entry.isFile()){rejected.push({path:rp,reason:"special"});continue;}
   if(excluded(rp))continue;
   const bytes=fs.readFileSync(ap); rows.push({path:rp,byteLength:bytes.length,sha256:sha256(bytes),mode:(st.mode&0o111)?0o100755:0o100644});
  }
 }
 walk(path.resolve(root)); rows.sort((a,b)=>Buffer.from(a.path).compare(Buffer.from(b.path))); return {rows,rejected};
}
export function payload(rows) {return {fileCount:rows.length,byteLength:rows.reduce((s,r)=>s+r.byteLength,0),pathSetSha256:sha256(rows.map(r=>r.path).join("\n")),aggregateSha256:sha256(rows.map(r=>`${r.path}\0${r.byteLength}\0${r.sha256}\0${r.mode}`).join("\n"))};}
