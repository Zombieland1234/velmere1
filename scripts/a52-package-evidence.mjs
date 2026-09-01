#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
const root = process.cwd();
const source = path.join(root, "artifacts/pass35/a52");
const out = path.join(root, "artifacts/pass35/PASS35_A52_KILL_SWITCH_INCIDENT_CUSTOMER_COMMUNICATION_ACCEPTANCE_EVIDENCE.zip");
fs.mkdirSync(source, { recursive: true });
const files = [];
function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const absolute = path.join(dir, entry.name); if (entry.isDirectory()) walk(absolute); else if (absolute !== out) files.push(absolute); } }
walk(source);
const manifest = files.sort().map((absolute) => ({ path: path.relative(source, absolute).replaceAll("\\", "/"), bytes: fs.statSync(absolute).size, sha256: crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex") }));
fs.writeFileSync(path.join(source, "PASS35_A52_EVIDENCE_MANIFEST.json"), `${JSON.stringify({ schemaVersion: "velmere.pass35.a52.evidence-manifest.v1", revisionId: "VELMERE_PASS35_A52_KILL_SWITCH_INCIDENT_CUSTOMER_COMMUNICATION_ACCEPTANCE", generatedAt: new Date().toISOString(), files: manifest }, null, 2)}\n`);
if (fs.existsSync(out)) fs.rmSync(out, { force: true });
let result;
if (process.platform === "win32") {
  const ps = `Compress-Archive -Path '${source.replaceAll("'", "''")}\\*' -DestinationPath '${out.replaceAll("'", "''")}' -CompressionLevel Optimal -Force`;
  result = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps], { cwd: root, encoding: "utf8" });
} else {
  result = spawnSync("python3", ["-c", "import os,sys,zipfile; s,o=sys.argv[1:]; z=zipfile.ZipFile(o,'w',zipfile.ZIP_DEFLATED); [z.write(os.path.join(r,f),os.path.relpath(os.path.join(r,f),s).replace(os.sep,'/')) for r,_,fs in os.walk(s) for f in fs if os.path.join(r,f)!=o]; z.close()", source, out], { cwd: root, encoding: "utf8" });
}
if (result.status !== 0) { console.error(result.stderr || result.stdout); process.exit(1); }
console.log(JSON.stringify({ output: path.relative(root, out).replaceAll("\\", "/"), bytes: fs.statSync(out).size, sha256: crypto.createHash("sha256").update(fs.readFileSync(out)).digest("hex") }, null, 2));
