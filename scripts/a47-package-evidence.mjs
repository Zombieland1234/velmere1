#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
const root = process.cwd();
const source = path.join(root, "artifacts/pass35/a47");
const out = path.join(root, "artifacts/pass35/PASS35_A47_EVIDENCE_INTAKE_TRIAGE.zip");
fs.mkdirSync(source, { recursive: true });
const files = [];
function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const absolute = path.join(dir, entry.name); if (entry.isDirectory()) { if (entry.name !== "intake") walk(absolute); } else if (absolute !== out) files.push(absolute); } }
walk(source);
const manifest = files.sort().map((absolute) => ({ path: path.relative(source, absolute).replaceAll("\\", "/"), bytes: fs.statSync(absolute).size, sha256: crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex") }));
fs.writeFileSync(path.join(source, "PASS35_A47_EVIDENCE_MANIFEST.json"), `${JSON.stringify({ schemaVersion: "velmere.pass35.a47.evidence-manifest.v1", revisionId: "VELMERE_PASS35_A47_ACCEPTANCE_EVIDENCE_INTAKE_TRIAGE", generatedAt: new Date().toISOString(), files: manifest }, null, 2)}\n`, "utf8");
if (fs.existsSync(out)) fs.rmSync(out, { force: true });
const result = process.platform === "win32"
  ? spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", `Compress-Archive -Path '${source.replaceAll("'", "''")}\\*' -DestinationPath '${out.replaceAll("'", "''")}' -CompressionLevel Optimal -Force`], { cwd: root, encoding: "utf8" })
  : spawnSync("python3", ["-c", "import os,sys,zipfile; src,out=sys.argv[1:]; z=zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED); [z.write(os.path.join(r,f),os.path.relpath(os.path.join(r,f),src).replace(os.sep,'/')) for r,ds,fs in os.walk(src) if os.path.basename(r)!='intake' for f in fs if os.path.join(r,f)!=out]; z.close()", source, out], { cwd: root, encoding: "utf8" });
if (result.status !== 0) { console.error(result.stderr || result.stdout); process.exit(1); }
console.log(JSON.stringify({ output: path.relative(root, out).replaceAll("\\", "/"), bytes: fs.statSync(out).size, sha256: crypto.createHash("sha256").update(fs.readFileSync(out)).digest("hex") }, null, 2));
