import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
export const root = process.cwd();
export const releaseDir = path.join(root, "artifacts/release");
export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export function readJson(relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8")); }
export function writeJsonAtomic(relative, value) {
 const target=path.join(root,relative); fs.mkdirSync(path.dirname(target),{recursive:true}); const temp=`${target}.${process.pid}.tmp`; fs.writeFileSync(temp,`${JSON.stringify(value,null,2)}\n`,{mode:0o600}); fs.renameSync(temp,target);
}
export function canonical(value) { if(Array.isArray(value)) return `[${value.map(canonical).join(",")}]`; if(value&&typeof value==="object") return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`; return JSON.stringify(value); }
