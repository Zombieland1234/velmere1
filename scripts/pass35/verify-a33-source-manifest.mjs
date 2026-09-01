import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifestPath = path.join(root, 'artifacts/pass35/a33/PASS35_A33_SOURCE_MANIFEST.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
let checks=0;
for (const item of manifest.files) {
  checks++;
  const p=path.join(root,item.path);
  if (!fs.existsSync(p)) throw new Error(`A33_SOURCE_MANIFEST_MISSING: ${item.path}`);
  const st=fs.statSync(p);
  if (st.size!==item.size) throw new Error(`A33_SOURCE_MANIFEST_SIZE: ${item.path}`);
  if (sha(p)!==item.sha256) throw new Error(`A33_SOURCE_MANIFEST_HASH: ${item.path}`);
}
const canonical = manifest.files.map((x)=>`${x.path}\0${x.size}\0${x.sha256}\n`).join('');
const digest=crypto.createHash('sha256').update(canonical).digest('hex');
if (digest!==manifest.manifestDigest) throw new Error('A33_SOURCE_MANIFEST_DIGEST');
for (const forbidden of ['node_modules','.next','.git']) if (fs.existsSync(path.join(root,forbidden))) throw new Error(`A33_FORBIDDEN_DIR: ${forbidden}`);
console.log(JSON.stringify({status:'PASS_A33_SOURCE_MANIFEST',checks,manifestDigest:digest,files:manifest.files.length},null,2));
