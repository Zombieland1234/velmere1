import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const evidenceDir = path.resolve("./evidence");
const dirs = fs.readdirSync(evidenceDir).filter(d => d.startsWith("AUD-CONTRACT-")).slice(0, 20);

dirs.forEach(d => {
  const dirPath = path.join(evidenceDir, d);
  const bytecodeDir = path.join(dirPath, "bytecode");
  const manifestDir = path.join(dirPath, "manifest");
  
  let bytecodeFile = null;
  let bytecodeSha = null;
  if (fs.existsSync(bytecodeDir)) {
    const files = fs.readdirSync(bytecodeDir);
    if (files.length > 0) {
      bytecodeFile = files[0];
      const raw = fs.readFileSync(path.join(bytecodeDir, bytecodeFile), "utf8").trim();
      bytecodeSha = "sha256:" + crypto.createHash("sha256").update(raw).digest("hex");
    }
  }

  let manifestData = null;
  if (fs.existsSync(manifestDir)) {
    const mFiles = fs.readdirSync(manifestDir);
    if (mFiles.length > 0) {
      try {
        manifestData = JSON.parse(fs.readFileSync(path.join(manifestDir, mFiles[0]), "utf8"));
      } catch (e) {}
    }
  }

  console.log(`${d.padEnd(23)} | bcFile: ${bytecodeFile} | sha: ${bytecodeSha?.slice(0, 20)}... | block: ${manifestData?.target?.blockNumber || manifestData?.blockNumber || manifestData?.snapshotBlockNumber}`);
});
